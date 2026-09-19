import React, { useRef, useState } from 'react';
import { X, Upload, Loader2, Camera } from 'lucide-react';
import { supabase } from './supabaseClient';

interface JixUploadVideoProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

const CATEGORIES = ['ترفيه', 'رياضة', 'طبخ', 'موسيقى', 'كوميديا', 'أخرى'];

export const JixUploadVideo: React.FC<JixUploadVideoProps> = ({ isOpen, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // input type="file" مع accept لصورة وفيديو مع بعض يخلي الجوال يعرض تلقائيًا:
  // "التقاط صورة/فيديو" (كاميرا) أو "اختيار من المعرض" - بدون أي كود إضافي
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsImage(selected.type.startsWith('image/'));
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[\u0600-\u06FFa-zA-Z0-9_]+/g);
    return matches ? matches.map((tag) => tag.slice(1)) : [];
  };

  const handleUpload = async () => {
    if (!file) {
      setError('اختر صورة أو فيديو أولاً');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('يجب تسجيل الدخول لرفع منشور');

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('videos').insert({
        user_id: userId,
        video_url: publicUrlData.publicUrl,
        thumbnail_url: isImage ? publicUrlData.publicUrl : null,
        caption,
        hashtags: extractHashtags(caption),
        category,
        allow_comments: true,
        allow_share: true,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
      });

      if (insertError) throw insertError;

      onUploaded();
      resetAndClose();
    } catch (err) {
      setError((err as Error).message || 'فشل رفع المنشور');
    } finally {
      setIsUploading(false);
    }
  };

  const resetAndClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsImage(false);
    setCaption('');
    setCategory(CATEGORIES[0]);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f1118] border border-[#8B5CF6]/30 rounded-3xl p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={resetAndClose} className="absolute top-5 left-5 text-gray-400 hover:text-white p-2 rounded-full bg-white/5">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black text-center mb-5 mt-2">منشور جديد</h2>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {!previewUrl ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[9/12] rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 hover:border-[#8B5CF6] transition mb-4"
          >
            <Camera className="w-10 h-10 text-gray-500" />
            <span className="text-sm text-gray-400">التقط صورة/فيديو أو اختر من المعرض</span>
          </button>
        ) : isImage ? (
          <img src={previewUrl} className="w-full aspect-[9/12] object-cover rounded-2xl mb-4 bg-black" />
        ) : (
          <video src={previewUrl} controls className="w-full aspect-[9/12] object-cover rounded-2xl mb-4 bg-black" />
        )}

        {/* accept يشمل صور وفيديو مع بعض - الجوال يعرض تلقائيًا خيار الكاميرا أو المعرض */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {previewUrl && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-4 py-2 text-xs font-bold text-[#8B5CF6] bg-white/5 rounded-xl"
          >
            تغيير الصورة/الفيديو
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="اكتب وصف... استخدم # للهاشتاقات"
          rows={3}
          className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-[#8B5CF6] outline-none mb-4 resize-none"
        />

        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                category === cat ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-white/5 text-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className="w-full py-3.5 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isUploading ? 'جاري النشر...' : 'نشر'}
        </button>
      </div>
    </div>
  );
};
