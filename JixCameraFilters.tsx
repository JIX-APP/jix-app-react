import React, { useEffect, useRef, useState } from 'react';

// ============================================================
// فلاتر الألوان (Look Filters) - نفس فكرة إنستغرام/تيك توك
// تُطبّق عبر canvas 2D context.filter (نفس صيغة CSS filter)
// ============================================================

export interface ColorFilterDef {
  id: string;
  name: string;
  cssFilter: string;
}

export const COLOR_FILTERS: ColorFilterDef[] = [
  { id: 'normal', name: 'طبيعي', cssFilter: 'none' },
  { id: 'warm', name: 'دافئ', cssFilter: 'saturate(1.3) sepia(0.15) contrast(1.05) brightness(1.05)' },
  { id: 'cool', name: 'بارد', cssFilter: 'saturate(1.1) hue-rotate(-8deg) contrast(1.05) brightness(1.05)' },
  { id: 'vivid', name: 'حاد', cssFilter: 'saturate(1.6) contrast(1.15)' },
  { id: 'bw', name: 'أبيض وأسود', cssFilter: 'grayscale(1) contrast(1.1)' },
  { id: 'vintage', name: 'عتيق', cssFilter: 'sepia(0.4) saturate(1.2) contrast(0.95) brightness(1.05)' },
  { id: 'soft', name: 'ناعم', cssFilter: 'brightness(1.08) contrast(0.95) saturate(1.05)' },
  { id: 'night', name: 'ليلي', cssFilter: 'brightness(1.2) contrast(1.1) saturate(0.85)' },
];

// ============================================================
// فلاتر الوجه (AR) - مرسومة بالكود مباشرة (بدون صور خارجية)
// تعتمد على نقاط ملامح الوجه (landmarks) من face-api.js
// ============================================================

export type ArFilterId = 'none' | 'smooth' | 'cat_ears' | 'sparkle_cheeks';

export const AR_FILTERS: { id: ArFilterId; name: string }[] = [
  { id: 'none', name: 'بدون' },
  { id: 'smooth', name: 'تنعيم البشرة' },
  { id: 'cat_ears', name: 'أذني قطة' },
  { id: 'sparkle_cheeks', name: 'بريق الخدود' },
];

// نوع مبسّط لنقاط الوجه اللي نحتاجها بس (نتجنب استيراد كل أنواع face-api.js بالأعلى)
interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface FacePoint {
  x: number;
  y: number;
}
interface FaceResult {
  box: FaceBox;
  leftEye: FacePoint[];
  rightEye: FacePoint[];
  nose: FacePoint[];
  jaw: FacePoint[];
}

let faceApiLoadPromise: Promise<any> | null = null;
const FACE_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// تحميل مكتبة كشف الوجه + نماذجها مرة وحدة بس (كسول - أول ما يحتاج له فلتر AR فعلاً)
async function loadFaceApi(): Promise<any> {
  if (faceApiLoadPromise) return faceApiLoadPromise;

  faceApiLoadPromise = (async () => {
    const faceapi = await import('face-api.js');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODEL_URL),
    ]);
    return faceapi;
  })();

  return faceApiLoadPromise;
}

// رسم أذني قطة فوق الرأس حسب موقع العينين
function drawCatEars(ctx: CanvasRenderingContext2D, face: FaceResult) {
  const { x, y, width } = face.box;
  const earSize = width * 0.42;
  const centerX = x + width / 2;
  const topY = y - earSize * 0.55;

  const drawEar = (cx: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - earSize * 0.28, topY + earSize * 0.55);
    ctx.lineTo(cx, topY - earSize * 0.15);
    ctx.lineTo(cx + earSize * 0.28, topY + earSize * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#3a2a1f';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - earSize * 0.14, topY + earSize * 0.42);
    ctx.lineTo(cx, topY + earSize * 0.02);
    ctx.lineTo(cx + earSize * 0.14, topY + earSize * 0.42);
    ctx.closePath();
    ctx.fillStyle = '#f4a6c1';
    ctx.fill();
  };

  drawEar(centerX - width * 0.3);
  drawEar(centerX + width * 0.3);
}

// بريق نجمي صغير عند الخدين (تقريبياً تحت العينين)
function drawSparkleCheeks(ctx: CanvasRenderingContext2D, face: FaceResult) {
  const drawStar = (cx: number, cy: number, size: number, rotation: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#FFF9C4';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  };

  const leftEyeCenter = averagePoint(face.leftEye);
  const rightEyeCenter = averagePoint(face.rightEye);
  const eyeDist = Math.hypot(rightEyeCenter.x - leftEyeCenter.x, rightEyeCenter.y - leftEyeCenter.y);
  const size = eyeDist * 0.09;

  drawStar(leftEyeCenter.x - eyeDist * 0.15, leftEyeCenter.y + eyeDist * 0.55, size, 0.3);
  drawStar(rightEyeCenter.x + eyeDist * 0.15, rightEyeCenter.y + eyeDist * 0.55, size * 0.75, -0.4);
}

function averagePoint(points: FacePoint[]): FacePoint {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

// تنعيم البشرة: نرسم نسخة مموّهة (blur) من منطقة الوجه فوق الأصل بشفافية جزئية
function drawSmoothSkin(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  face: FaceResult
) {
  const { x, y, width, height } = face.box;
  const padX = width * 0.15;
  const padY = height * 0.15;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2 + padX, height / 2 + padY, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.filter = 'blur(4px)';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();
}

// ============================================================
// الخطّاف الأساسي: يرسم فيديو المصدر على canvas مع الفلاتر المختارة
// ويرجّع رابط الـ canvas + دالة لأخذ MediaStream منه (لبث Agora أو تسجيل)
// ============================================================

export function useFilteredCanvas(
  sourceVideoRef: React.RefObject<HTMLVideoElement>,
  colorFilterId: string,
  arFilterId: ArFilterId
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFaceRef = useRef<FaceResult | null>(null);
  const frameCountRef = useRef(0);
  const faceApiRef = useRef<any>(null);
  const [isFaceApiReady, setIsFaceApiReady] = useState(false);

  // تحميل مكتبة الوجه بس لو فعلاً محتاجينها (فلتر AR غير "بدون")
  useEffect(() => {
    if (arFilterId === 'none') return;
    let cancelled = false;
    loadFaceApi().then((faceapi) => {
      if (!cancelled) {
        faceApiRef.current = faceapi;
        setIsFaceApiReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [arFilterId]);

  useEffect(() => {
    const video = sourceVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isActive = true;

    const detectFaceIfNeeded = async () => {
      if (arFilterId === 'none' || !faceApiRef.current || !isFaceApiReady) return;
      // نكشف الوجه كل 4 فريمات بس (توفير أداء) - وناخذ آخر نتيجة بالفريمات الوسط
      if (frameCountRef.current % 4 !== 0) return;

      try {
        const faceapi = faceApiRef.current;
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);

        if (detection) {
          const box = detection.detection.box;
          const landmarks = detection.landmarks;
          lastFaceRef.current = {
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            leftEye: landmarks.getLeftEye(),
            rightEye: landmarks.getRightEye(),
            nose: landmarks.getNose(),
            jaw: landmarks.getJawOutline(),
          };
        } else {
          lastFaceRef.current = null;
        }
      } catch {
        // تجاهل أخطاء الكشف الفردية - نكمل بآخر نتيجة معروفة
      }
    };

    const draw = () => {
      if (!isActive) return;
      frameCountRef.current += 1;

      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const filterDef = COLOR_FILTERS.find((f) => f.id === colorFilterId);
        ctx.filter = filterDef && filterDef.cssFilter !== 'none' ? filterDef.cssFilter : 'none';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        const face = lastFaceRef.current;
        if (face && arFilterId !== 'none') {
          if (arFilterId === 'smooth') drawSmoothSkin(ctx, canvas, face);
          else if (arFilterId === 'cat_ears') drawCatEars(ctx, face);
          else if (arFilterId === 'sparkle_cheeks') drawSparkleCheeks(ctx, face);
        }

        detectFaceIfNeeded();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sourceVideoRef, colorFilterId, arFilterId, isFaceApiReady]);

  const getStream = (fps = 30): MediaStream | null => {
    if (!canvasRef.current) return null;
    return (canvasRef.current as any).captureStream(fps);
  };

  return { canvasRef, getStream };
}

// ============================================================
// شريط اختيار الفلاتر - يعرض فلاتر الألوان وفلاتر AR مع بعض
// ============================================================

interface JixFilterPickerProps {
  colorFilterId: string;
  arFilterId: ArFilterId;
  onColorChange: (id: string) => void;
  onArChange: (id: ArFilterId) => void;
}

export const JixFilterPicker: React.FC<JixFilterPickerProps> = ({
  colorFilterId,
  arFilterId,
  onColorChange,
  onArChange,
}) => {
  const [tab, setTab] = useState<'color' | 'ar'>('color');

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2 mb-2">
        <button
          onClick={() => setTab('color')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            tab === 'color' ? 'bg-white text-black' : 'bg-white/10 text-white'
          }`}
        >
          فلاتر الألوان
        </button>
        <button
          onClick={() => setTab('ar')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            tab === 'ar' ? 'bg-white text-black' : 'bg-white/10 text-white'
          }`}
        >
          فلاتر الوجه
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
        {tab === 'color'
          ? COLOR_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => onColorChange(f.id)}
                className={`shrink-0 flex flex-col items-center gap-1 ${
                  colorFilterId === f.id ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] border-2 ${
                    colorFilterId === f.id ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ filter: f.cssFilter !== 'none' ? f.cssFilter : undefined }}
                />
                <span className="text-[9px] text-white font-bold">{f.name}</span>
              </button>
            ))
          : AR_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => onArChange(f.id)}
                className={`shrink-0 flex flex-col items-center gap-1 ${
                  arFilterId === f.id ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full bg-white/10 border-2 flex items-center justify-center text-lg ${
                    arFilterId === f.id ? 'border-white' : 'border-transparent'
                  }`}
                >
                  {f.id === 'smooth' ? '✨' : f.id === 'cat_ears' ? '🐱' : f.id === 'sparkle_cheeks' ? '💫' : '🚫'}
                </div>
                <span className="text-[9px] text-white font-bold">{f.name}</span>
              </button>
            ))}
      </div>
    </div>
  );
};
