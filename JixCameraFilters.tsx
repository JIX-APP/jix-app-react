import React, { useEffect, useRef, useState } from 'react';

// ============================================================
// فلاتر الألوان (Look Filters) - نفس تصنيفات وأسماء فلاتر تيك توك
// الأقسام: بورتريه / لاندسكيب / أكل / فايب (Vibe) - كل قسم فيه فلاتر باسمها الحقيقي
// تُطبّق عبر canvas 2D context.filter (نفس صيغة CSS filter)
// ============================================================

export type ColorFilterCategory = 'portrait' | 'landscape' | 'food' | 'vibe';

export interface ColorFilterDef {
  id: string;
  name: string;
  category: ColorFilterCategory;
  cssFilter: string;
}

export const COLOR_FILTER_CATEGORIES: { id: ColorFilterCategory; name: string }[] = [
  { id: 'portrait', name: 'بورتريه' },
  { id: 'landscape', name: 'لاندسكيب' },
  { id: 'food', name: 'أكل' },
  { id: 'vibe', name: 'فايب' },
];

export const COLOR_FILTERS: ColorFilterDef[] = [
  // بدون فلتر - يظهر دايمًا أول شي بكل الأقسام
  { id: 'normal', name: 'طبيعي', category: 'portrait', cssFilter: 'none' },

  // بورتريه - تنعيم وإضاءة تناسب الوجه
  { id: 'clear', name: 'Clear', category: 'portrait', cssFilter: 'brightness(1.09) contrast(1.03) saturate(1.05)' },
  { id: 'rosy', name: 'Rosy', category: 'portrait', cssFilter: 'saturate(1.18) hue-rotate(-4deg) brightness(1.06) contrast(1.02)' },
  { id: 'soft_glow', name: 'Soft Glow', category: 'portrait', cssFilter: 'brightness(1.12) contrast(0.94) saturate(1.08)' },
  { id: 'bw_portrait', name: 'B&W', category: 'portrait', cssFilter: 'grayscale(1) contrast(1.15) brightness(1.04)' },

  // لاندسكيب - ألوان أقوى ووضوح أعلى للمناظر
  { id: 'crisp', name: 'Crisp', category: 'landscape', cssFilter: 'contrast(1.18) saturate(1.22) brightness(1.02)' },
  { id: 'fresh', name: 'Fresh', category: 'landscape', cssFilter: 'saturate(1.3) brightness(1.05) contrast(1.05) hue-rotate(3deg)' },
  { id: 'blue_sky', name: 'Blue Sky', category: 'landscape', cssFilter: 'saturate(1.2) hue-rotate(-10deg) contrast(1.1) brightness(1.03)' },

  // أكل - دفء وتشبّع لوني قوي زي فلاتر الأكل المشهورة بتيك توك
  { id: 'g6', name: 'G6', category: 'food', cssFilter: 'saturate(1.45) sepia(0.28) contrast(1.1) brightness(1.08) hue-rotate(-6deg)' },
  { id: 'yummy', name: 'Yummy', category: 'food', cssFilter: 'saturate(1.35) contrast(1.1) brightness(1.08) sepia(0.08)' },

  // فايب - درجات سينمائية وألوان مزاجية
  { id: 'v11', name: 'V11', category: 'vibe', cssFilter: 'saturate(1.55) contrast(1.12) brightness(1.03) hue-rotate(-3deg)' },
  { id: 'old_money', name: 'Old Money', category: 'vibe', cssFilter: 'sepia(0.35) saturate(0.82) contrast(1.12) brightness(0.97)' },
  { id: 'golden_hour', name: 'Golden Hour', category: 'vibe', cssFilter: 'sepia(0.22) saturate(1.4) brightness(1.1) contrast(1.05) hue-rotate(-8deg)' },
  { id: 'moody', name: 'Moody', category: 'vibe', cssFilter: 'contrast(1.28) saturate(0.78) brightness(0.9)' },
  { id: 'cool_tone', name: 'Cool Tone', category: 'vibe', cssFilter: 'saturate(1.12) hue-rotate(-12deg) contrast(1.08) brightness(1.02)' },
];

// ============================================================
// فلاتر الوجه (AR) - تتبع دقيق بـ MediaPipe Face Landmarker (468 نقطة)
// + رسمة فنية حقيقية (SVG بتدرجات وظل) بدل أشكال هندسية مرسومة يدويًا
// نفس فكرة سناب/تيك توك: شبكة وجه دقيقة + أصل فني يتوضع ويدور معاها
// ============================================================

export type ArFilterId = 'none' | 'smooth' | 'cat_ears' | 'sparkle_cheeks';

export const AR_FILTERS: { id: ArFilterId; name: string }[] = [
  { id: 'none', name: 'بدون' },
  { id: 'smooth', name: 'تنعيم البشرة' },
  { id: 'cat_ears', name: 'أذني قطة' },
  { id: 'sparkle_cheeks', name: 'بريق الخدود' },
];

interface FacePoint {
  x: number;
  y: number;
}

// نتيجة محسوبة مسبقًا من نقاط MediaPipe الـ 468 - أدق بكثير من صندوق الوجه القديم
// وفيها زاوية ميلان الرأس (rollRad) عشان الفلتر يدور مع حركة الرأس مو بس يوقف مكانه
interface FaceResult {
  leftEyeCenter: FacePoint;
  rightEyeCenter: FacePoint;
  faceLeft: FacePoint;
  faceRight: FacePoint;
  foreheadTop: FacePoint;
  chinBottom: FacePoint;
  faceWidth: number;
  faceHeight: number;
  rollRad: number;
}

// فهارس نقاط الوجه اللي نحتاجها من موديل MediaPipe (468 نقطة - ثابتة بكل النماذج)
const LM_LEFT_EYE_OUTER = 33;
const LM_LEFT_EYE_INNER = 133;
const LM_RIGHT_EYE_INNER = 362;
const LM_RIGHT_EYE_OUTER = 263;
const LM_FACE_LEFT = 234;
const LM_FACE_RIGHT = 454;
const LM_FOREHEAD_TOP = 10;
const LM_CHIN_BOTTOM = 152;

function buildFaceResult(
  landmarks: { x: number; y: number }[],
  videoWidth: number,
  videoHeight: number
): FaceResult {
  const toPx = (i: number): FacePoint => ({ x: landmarks[i].x * videoWidth, y: landmarks[i].y * videoHeight });

  const leftEyeOuter = toPx(LM_LEFT_EYE_OUTER);
  const leftEyeInner = toPx(LM_LEFT_EYE_INNER);
  const rightEyeInner = toPx(LM_RIGHT_EYE_INNER);
  const rightEyeOuter = toPx(LM_RIGHT_EYE_OUTER);
  const faceLeft = toPx(LM_FACE_LEFT);
  const faceRight = toPx(LM_FACE_RIGHT);
  const foreheadTop = toPx(LM_FOREHEAD_TOP);
  const chinBottom = toPx(LM_CHIN_BOTTOM);

  const leftEyeCenter = { x: (leftEyeOuter.x + leftEyeInner.x) / 2, y: (leftEyeOuter.y + leftEyeInner.y) / 2 };
  const rightEyeCenter = { x: (rightEyeOuter.x + rightEyeInner.x) / 2, y: (rightEyeOuter.y + rightEyeInner.y) / 2 };

  return {
    leftEyeCenter,
    rightEyeCenter,
    faceLeft,
    faceRight,
    foreheadTop,
    chinBottom,
    faceWidth: Math.hypot(faceRight.x - faceLeft.x, faceRight.y - faceLeft.y),
    faceHeight: Math.hypot(chinBottom.x - foreheadTop.x, chinBottom.y - foreheadTop.y),
    rollRad: Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x),
  };
}

let landmarkerLoadPromise: Promise<any> | null = null;

// تحميل موديل تتبع الوجه من MediaPipe مرة وحدة بس (كسول - أول ما يحتاج له فلتر AR فعلاً)
async function loadFaceLandmarker(): Promise<any> {
  if (landmarkerLoadPromise) return landmarkerLoadPromise;

  landmarkerLoadPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    const baseModelConfig = {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    };

    try {
      return await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseModelConfig, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch {
      // بعض أجهزة آيفون القديمة ما تدعم تسريع GPU داخل المتصفح - نرجع لـ CPU
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { ...baseModelConfig, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }
  })();

  return landmarkerLoadPromise;
}

// ============================================================
// رسمة أذني القطة - SVG فني حقيقي (تدرجات لونية + ظل ناعم)
// بدل المثلثات المرسومة بالكود سابقًا
// ============================================================

const CAT_EARS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160">
  <defs>
    <linearGradient id="fur" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#2b1a14"/>
      <stop offset="100%" stop-color="#5c3a28"/>
    </linearGradient>
    <linearGradient id="inner" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#e88aa8"/>
      <stop offset="100%" stop-color="#f7c6d9"/>
    </linearGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g filter="url(#softShadow)">
    <path d="M35 160 C30 95, 55 35, 95 10 C110 45, 108 100, 100 160 Z" fill="url(#fur)"/>
    <path d="M55 150 C53 105, 70 65, 92 42 C100 68, 98 108, 92 150 Z" fill="url(#inner)"/>
    <path d="M265 160 C270 95, 245 35, 205 10 C190 45, 192 100, 200 160 Z" fill="url(#fur)"/>
    <path d="M245 150 C247 105, 230 65, 208 42 C200 68, 202 108, 208 150 Z" fill="url(#inner)"/>
  </g>
</svg>`.trim();

let catEarsImagePromise: Promise<HTMLImageElement> | null = null;

function loadCatEarsImage(): Promise<HTMLImageElement> {
  if (catEarsImagePromise) return catEarsImagePromise;
  catEarsImagePromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(CAT_EARS_SVG)}`;
  });
  return catEarsImagePromise;
}

// رسم أذني القطة فوق الرأس: محاذاة حسب عرض الوجه الفعلي، مثبتة عند خط الجبهة،
// وتدور تلقائيًا مع ميلان الرأس (rollRad) عشان تبقى متناسقة بأي زاوية
function drawCatEars(ctx: CanvasRenderingContext2D, face: FaceResult, earsImage: HTMLImageElement | null) {
  if (!earsImage || !earsImage.complete) return;

  const earsWidth = face.faceWidth * 1.55;
  const aspect = earsImage.naturalHeight / earsImage.naturalWidth;
  const earsHeight = earsWidth * aspect;

  ctx.save();
  ctx.translate(face.foreheadTop.x, face.foreheadTop.y);
  ctx.rotate(face.rollRad);
  ctx.drawImage(earsImage, -earsWidth / 2, -earsHeight * 0.88, earsWidth, earsHeight);
  ctx.restore();
}

// بريق نجمي صغير عند الخدين (تحت العينين مباشرة) - يدور هو كمان مع ميلان الرأس
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

  const eyeDist = Math.hypot(
    face.rightEyeCenter.x - face.leftEyeCenter.x,
    face.rightEyeCenter.y - face.leftEyeCenter.y
  );
  const size = eyeDist * 0.16;

  drawStar(face.leftEyeCenter.x - eyeDist * 0.25, face.leftEyeCenter.y + eyeDist * 0.7, size, 0.3 + face.rollRad);
  drawStar(
    face.rightEyeCenter.x + eyeDist * 0.25,
    face.rightEyeCenter.y + eyeDist * 0.7,
    size * 0.8,
    -0.4 + face.rollRad
  );
}

// تنعيم البشرة: نرسم نسخة مموّهة (blur) من منطقة الوجه فوق الأصل بشفافية جزئية
function drawSmoothSkin(ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, face: FaceResult) {
  const centerX = (face.faceLeft.x + face.faceRight.x) / 2;
  const centerY = (face.foreheadTop.y + face.chinBottom.y) / 2;
  const radiusX = face.faceWidth / 2 + face.faceWidth * 0.12;
  const radiusY = face.faceHeight / 2 + face.faceHeight * 0.1;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, face.rollRad, 0, Math.PI * 2);
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
  const landmarkerRef = useRef<any>(null);
  const catEarsImageRef = useRef<HTMLImageElement | null>(null);
  const [isLandmarkerReady, setIsLandmarkerReady] = useState(false);

  // تحميل موديل تتبع الوجه + رسمة الأذنين بس لو فعلاً محتاجينها (فلتر AR غير "بدون")
  useEffect(() => {
    if (arFilterId === 'none') return;
    let cancelled = false;

    loadFaceLandmarker().then((landmarker) => {
      if (!cancelled) {
        landmarkerRef.current = landmarker;
        setIsLandmarkerReady(true);
      }
    });

    if (arFilterId === 'cat_ears' && !catEarsImageRef.current) {
      loadCatEarsImage().then((img) => {
        if (!cancelled) catEarsImageRef.current = img;
      });
    }

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

    const detectFaceIfNeeded = () => {
      if (arFilterId === 'none' || !landmarkerRef.current || !isLandmarkerReady) return;
      // نكشف الوجه كل فريمين بس (MediaPipe سريع، لكن نوفر أداء على أجهزة آيفون الأقدم)
      if (frameCountRef.current % 2 !== 0) return;

      try {
        const result = landmarkerRef.current.detectForVideo(video, performance.now());
        const landmarks = result?.faceLandmarks?.[0];
        if (landmarks && landmarks.length) {
          lastFaceRef.current = buildFaceResult(landmarks, video.videoWidth, video.videoHeight);
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

        detectFaceIfNeeded();

        const face = lastFaceRef.current;
        if (face && arFilterId !== 'none') {
          if (arFilterId === 'smooth') drawSmoothSkin(ctx, canvas, face);
          else if (arFilterId === 'cat_ears') drawCatEars(ctx, face, catEarsImageRef.current);
          else if (arFilterId === 'sparkle_cheeks') drawSparkleCheeks(ctx, face);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sourceVideoRef, colorFilterId, arFilterId, isLandmarkerReady]);

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
  const [colorCategory, setColorCategory] = useState<ColorFilterCategory>('portrait');

  // "طبيعي" يظهر دايمًا أول خيار بأي قسم تفتحه، وبعده فلاتر القسم المختار بس
  const normalFilter = COLOR_FILTERS.find((f) => f.id === 'normal')!;
  const visibleColorFilters = [
    normalFilter,
    ...COLOR_FILTERS.filter((f) => f.category === colorCategory && f.id !== 'normal'),
  ];

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

      {tab === 'color' && (
        <div className="flex justify-center gap-1.5 mb-2">
          {COLOR_FILTER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setColorCategory(c.id)}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition ${
                colorCategory === c.id ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
        {tab === 'color'
          ? visibleColorFilters.map((f) => (
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
