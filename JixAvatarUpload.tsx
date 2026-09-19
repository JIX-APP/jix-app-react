import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

interface JixAvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fallbackLetter: string;
  onUpdated: (newUrl: string) => void;
}

export const JixAvatarUpload: React.FC<JixAvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  fallbackLetter,
  onUpdated,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${userId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onUpdated(publicUrlData.publicUrl);
    } catch (err) {
      setError((err as Error).message || 'فشل تحديث الصورة');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-20 h-20 mx-auto mb-3">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-2xl overflow-hidden">
        {currentAvatarUrl ? (
          <img src={currentAvatarUrl} className="w-full h-full object-cover" />
        ) : (
          fallbackLetter
        )}
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[#171923] border-2 border-[#0E0E12] flex items-center justify-center"
      >
        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
      </button>

      {/* accept صورة بس هنا - الجوال يعرض تلقائيًا كاميرا أو معرض */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {error && (
        <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
