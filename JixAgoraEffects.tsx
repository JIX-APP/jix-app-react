import React from 'react';
import AgoraRTC, { ICameraVideoTrack } from 'agora-rtc-sdk-ng';
// الإضافتين ما يجي معهم تعريفات TypeScript، فنقول للفحص يتجاهل السطرين (بدونها النشر يفشل)
// @ts-ignore
import BeautyExtension from 'agora-extension-beauty-effect';
// @ts-ignore
import VirtualBackgroundExtension from 'agora-extension-virtual-background';

// ============================================================
// فلاتر Agora الرسمية (مجانية) للبث المباشر
// 1) التجميل: نعومة البشرة، تفتيح، احمرار طبيعي، حدّة
// 2) الخلفية: تغبيش الخلفية
// تنطبق مباشرة على مسار كاميرا Agora (مو canvas)، فالمشاهد يشوفها كذا
// ============================================================

export type BeautyLevel = 'off' | 'natural' | 'strong';
export type BackgroundMode = 'off' | 'blur';

const BEAUTY_PRESETS: Record<Exclude<BeautyLevel, 'off'>, Record<string, number>> = {
  natural: { lighteningContrastLevel: 1, lighteningLevel: 0.5, smoothnessLevel: 0.5, sharpnessLevel: 0.3, rednessLevel: 0.1 },
  strong: { lighteningContrastLevel: 2, lighteningLevel: 0.8, smoothnessLevel: 0.9, sharpnessLevel: 0.5, rednessLevel: 0.2 },
};

// الإضافات تنسجل مرة وحدة بس للتطبيق كله
let beautyExt: any = null;
let bgExt: any = null;
let registered = false;

const ensureRegistered = () => {
  if (registered) return;
  beautyExt = new BeautyExtension();
  bgExt = new VirtualBackgroundExtension();
  AgoraRTC.registerExtensions([beautyExt, bgExt]);
  registered = true;
};

// هل الجهاز يدعم فلاتر Agora؟ (سفاري الآيفون دعمه محدود)
export const agoraEffectsSupport = (): { beauty: boolean; background: boolean } => {
  try {
    ensureRegistered();
    const beauty = typeof beautyExt.checkCompatibility === 'function' ? !!beautyExt.checkCompatibility() : true;
    const background = typeof bgExt.checkCompatibility === 'function' ? !!bgExt.checkCompatibility() : false;
    return { beauty, background };
  } catch {
    return { beauty: false, background: false };
  }
};

// يربط الفلاتر بمسار كاميرا ويعطيك تحكم فيها
export class JixAgoraEffects {
  private beauty: any = null;
  private background: any = null;
  private track: ICameraVideoTrack | null = null;

  async attach(track: ICameraVideoTrack) {
    this.detach();
    ensureRegistered();
    this.track = track;
    const support = agoraEffectsSupport();

    let chain: any = track;
    if (support.beauty) {
      this.beauty = beautyExt.createProcessor();
      chain = chain.pipe(this.beauty);
    }
    if (support.background) {
      this.background = bgExt.createProcessor();
      await this.background.init();
      chain = chain.pipe(this.background);
    }
    if (chain !== track) chain.pipe(track.processorDestination);
  }

  async setBeauty(level: BeautyLevel) {
    if (!this.beauty) return;
    if (level === 'off') {
      await this.beauty.disable();
      return;
    }
    await this.beauty.enable();
    this.beauty.setOptions(BEAUTY_PRESETS[level]);
  }

  async setBackground(mode: BackgroundMode) {
    if (!this.background) return;
    if (mode === 'off') {
      await this.background.disable();
      return;
    }
    this.background.setOptions({ type: 'blur', blurDegree: 2 });
    await this.background.enable();
  }

  detach() {
    try {
      this.track?.unpipe();
      this.beauty?.unpipe();
      this.background?.unpipe();
    } catch {
      // المسار ممكن يكون مسكّر أصلاً
    }
    this.beauty = null;
    this.background = null;
    this.track = null;
  }
}

// ============================================================
// أزرار فلاتر Agora (تطلع فوق فلاتر الألوان بشريط الفلاتر)
// ============================================================
export const JixAgoraEffectsPicker: React.FC<{
  beautyLevel: BeautyLevel;
  backgroundMode: BackgroundMode;
  onBeautyChange: (level: BeautyLevel) => void;
  onBackgroundChange: (mode: BackgroundMode) => void;
  labels: { beauty: string; background: string; off: string; natural: string; strong: string; blur: string; unsupported: string };
}> = ({ beautyLevel, backgroundMode, onBeautyChange, onBackgroundChange, labels }) => {
  const support = agoraEffectsSupport();

  const Chip = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ${
        active ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-black/60 text-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (!support.beauty && !support.background) {
    return <p className="text-[11px] text-white/70 text-center px-4 pb-2">{labels.unsupported}</p>;
  }

  return (
    <div className="px-4 pb-2 space-y-2">
      {support.beauty && (
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[11px] font-black text-white shrink-0">✨ {labels.beauty}</span>
          <Chip active={beautyLevel === 'off'} label={labels.off} onClick={() => onBeautyChange('off')} />
          <Chip active={beautyLevel === 'natural'} label={labels.natural} onClick={() => onBeautyChange('natural')} />
          <Chip active={beautyLevel === 'strong'} label={labels.strong} onClick={() => onBeautyChange('strong')} />
        </div>
      )}
      {support.background && (
        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[11px] font-black text-white shrink-0">🖼️ {labels.background}</span>
          <Chip active={backgroundMode === 'off'} label={labels.off} onClick={() => onBackgroundChange('off')} />
          <Chip active={backgroundMode === 'blur'} label={labels.blur} onClick={() => onBackgroundChange('blur')} />
        </div>
      )}
    </div>
  );
};
