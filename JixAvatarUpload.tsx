import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const MODERATE_IMAGE_URL = 'https://wfvhzlpvtgnydhmsxcqr.supabase.co/functions/v1/moderate-image';

interface JixAvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fallbackLetter: string;
  onUpdated: (newUrl: string) => void;
  // معرّف حقل اختيار الصورة - عشان زر خارجي (label) يقدر يفتحه
  inputId?: string;
  // نخفي زر الكاميرا الداخلي لما يكون فيه زر خارجي (الداخلي ينقص بإطار المستوى)
  hideCameraButton?: boolean;
}

export const JixAvatarUpload: React.FC<JixAvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  fallbackLetter,
  onUpdated,
  inputId = 'jix-avatar-upload-input',
  hideCameraButton = false,
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
      const publicUrl = publicUrlData.publicUrl;

      // فحص الصورة الشخصية تلقائيًا قبل اعتمادها - صور البروفايل حساسة بشكل خاص
      try {
        const modResponse = await fetch(MODERATE_IMAGE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl }),
        });
        const modResult = await modResponse.json();
        if (modResult.isFlagged) {
          await supabase.storage.from('videos').remove([filePath]);
          const msg = `تعذر اعتماد الصورة: ${modResult.reason || 'تخالف معايير المجتمع'}`;
          setError(msg);
          if (hideCameraButton) alert(msg);
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      } catch (modErr) {
        console.error('[JIX] فشل فحص الصورة الشخصية، سيتم الاعتماد بدون فحص آلي:', modErr);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onUpdated(publicUrl);
    } catch (err) {
      const msg = (err as Error).message || 'فشل تحديث الصورة';
      setError(msg);
      if (hideCameraButton) alert(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-20 h-20 mx-auto mb-3">
      {/* الضغط على الصورة نفسها يفتح اختيار صورة (كاميرا أو معرض) - label أضمن من click() بسفاري */}
      <label
        htmlFor={inputId}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-2xl overflow-hidden cursor-pointer relative"
      >
        {currentAvatarUrl ? (
          <img src={currentAvatarUrl} className="w-full h-full object-cover" />
        ) : (
          fallbackLetter
        )}
        {isUploading && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </span>
        )}
      </label>

      {!hideCameraButton && (
        <label
          htmlFor={inputId}
          className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[#171923] border-2 border-[#0E0E12] flex items-center justify-center cursor-pointer"
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        </label>
      )}

      {/* accept صورة بس هنا - الجوال يعرض تلقائيًا كاميرا أو معرض */}
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      {error && (
        <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
