// ============================================================
// ضغط الصور والفيديوهات قبل الرفع - يوفر مساحة التخزين 5 إلى 10 أضعاف
// الصور: أكبر ضلع 1080 بكسل، JPEG بجودة 80%
// الفيديو: أكبر ضلع 1280 بكسل (720p)، حوالي 10 ميجا للدقيقة
// لو الضغط فشل لأي سبب، نرفع الأصلي (لو حجمه معقول) بدل ما يفشل الرفع
// ============================================================

export const MAX_VIDEO_SECONDS = 60;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // حد أمان للملف الأصلي لو الضغط ما اشتغل

const IMAGE_MAX_SIDE = 1080;
const IMAGE_QUALITY = 0.8;
const VIDEO_MAX_SIDE = 1280;
const VIDEO_BITRATE = 1_200_000;
const AUDIO_BITRATE = 96_000;
const SMALL_VIDEO_BYTES = 8 * 1024 * 1024; // فيديو أصغر من كذا ما يحتاج ضغط

// أفضل صيغة تسجيل يدعمها الجوال - MP4 أول لأنها تشتغل على الآيفون والأندرويد
export const pickRecorderMimeType = (): { mimeType: string; ext: string } => {
  const options = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ];
  for (const o of options) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(o.mimeType)) return o;
  }
  return { mimeType: '', ext: 'mp4' }; // الجوال يختار الصيغة بنفسه
};

export const RECORDER_BITRATES = { videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: AUDIO_BITRATE };

const fitSize = (w: number, h: number, maxSide: number) => {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  // مقاسات زوجية - بعض مشفرات الفيديو ترفض الأرقام الفردية
  return { width: Math.round((w * scale) / 2) * 2, height: Math.round((h * scale) / 2) * 2 };
};

// ---------- الصور ----------
export async function compressImage(file: File): Promise<File> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, IMAGE_MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY));
    if (!blob || blob.size >= file.size) return file; // لو الضغط ما صغّره، نخلي الأصلي
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// مدة الفيديو بالثواني (نستخدمها نرفض الطويل قبل ما نضيع وقت المستخدم)
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration || 0);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

// ---------- الفيديو ----------
// لازم ينادى من داخل ضغطة زر (مثل زر "نشر") - الآيفون ما يسمح بتشغيل الصوت بدونها
export async function compressVideo(file: File, onProgress?: (percent: number) => void): Promise<File> {
  if (file.size <= SMALL_VIDEO_BYTES) return file;

  const { mimeType, ext } = pickRecorderMimeType();
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx || typeof MediaRecorder === 'undefined') return fallback(file);

  // مهم: الصوت والفيديو يبدون قبل أي انتظار، عشان الآيفون يعتبرهم من ضغطة المستخدم
  const audioCtx = new AudioCtx();
  audioCtx.resume?.();
  const video = document.createElement('video');
  video.playsInline = true;
  video.src = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('load'));
    });

    const { width, height } = fitSize(video.videoWidth, video.videoHeight, VIDEO_MAX_SIDE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback(file);

    // الصوت يروح للتسجيل بس، مو للسماعة
    const source = audioCtx.createMediaElementSource(video);
    const audioDest = audioCtx.createMediaStreamDestination();
    source.connect(audioDest);

    const stream = new MediaStream([
      ...(canvas as any).captureStream(30).getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), ...RECORDER_BITRATES });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/mp4' }));
    });

    let raf = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, width, height);
      if (video.duration) onProgress?.(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
      if (!video.ended) raf = requestAnimationFrame(draw);
    };

    recorder.start(1000);
    await video.play();
    draw();

    // أمان: لو علّق لأي سبب، نوقف بعد مدة الفيديو + 15 ثانية
    const timeout = setTimeout(() => video.pause(), (video.duration + 15) * 1000);
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
      video.onpause = () => resolve();
    });
    clearTimeout(timeout);
    cancelAnimationFrame(raf);
    recorder.stop();

    const blob = await done;
    onProgress?.(100);
    if (!blob.size || blob.size >= file.size) return fallback(file);
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.' + ext, { type: blob.type });
  } catch (err) {
    console.error('[JIX] فشل ضغط الفيديو، بنرفع الأصلي:', err);
    return fallback(file);
  } finally {
    URL.revokeObjectURL(video.src);
    audioCtx.close?.();
  }
}

// لو الضغط ما نفع: الأصلي لو حجمه معقول، وإلا خطأ واضح
function fallback(file: File): File {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('VIDEO_TOO_LARGE');
  return file;
}
