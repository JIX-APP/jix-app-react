import React, { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';

export type LevelKind = 'supporter' | 'receiver';

interface LevelTier {
  level: number;
  minXp: number;
  name: string;
  frameColors: [string, string]; // تدرج لوني للإطار
  glow: boolean; // توهج إضافي للمستويات العالية جدًا
}

// نفس فلسفة بيقو لايف: كل ما زاد إجمالي الكوينز (مرسلة أو مستقبلة)، ارتفع اللفل
// المدرّجات هنا للداعمين (Supporter) - المستقبل يستخدم نفس الجدول بس على receiver_xp
const TIERS: LevelTier[] = [
  { level: 1, minXp: 1, name: 'مبتدئ 1', frameColors: ['#6B6B76', '#4A4A52'], glow: false },
  { level: 2, minXp: 50, name: 'مبتدئ 2', frameColors: ['#6B6B76', '#4A4A52'], glow: false },
  { level: 3, minXp: 150, name: 'مبتدئ 3', frameColors: ['#6B6B76', '#4A4A52'], glow: false },
  { level: 4, minXp: 350, name: 'مبتدئ 4', frameColors: ['#6B6B76', '#4A4A52'], glow: false },
  { level: 5, minXp: 650, name: 'مبتدئ 5', frameColors: ['#6B6B76', '#4A4A52'], glow: false },
  { level: 6, minXp: 1000, name: 'برونزي 1', frameColors: ['#C98B4E', '#8B5A2B'], glow: false },
  { level: 7, minXp: 1400, name: 'برونزي 2', frameColors: ['#C98B4E', '#8B5A2B'], glow: false },
  { level: 8, minXp: 1900, name: 'برونزي 3', frameColors: ['#C98B4E', '#8B5A2B'], glow: false },
  { level: 9, minXp: 2600, name: 'برونزي 4', frameColors: ['#C98B4E', '#8B5A2B'], glow: false },
  { level: 10, minXp: 3600, name: 'برونزي 5', frameColors: ['#C98B4E', '#8B5A2B'], glow: false },
  { level: 11, minXp: 5000, name: 'فضي 1', frameColors: ['#D3D1C7', '#888780'], glow: false },
  { level: 12, minXp: 6600, name: 'فضي 2', frameColors: ['#D3D1C7', '#888780'], glow: false },
  { level: 13, minXp: 8700, name: 'فضي 3', frameColors: ['#D3D1C7', '#888780'], glow: false },
  { level: 14, minXp: 11000, name: 'فضي 4', frameColors: ['#D3D1C7', '#888780'], glow: false },
  { level: 15, minXp: 15000, name: 'فضي 5', frameColors: ['#D3D1C7', '#888780'], glow: false },
  { level: 16, minXp: 20000, name: 'ذهبي 1', frameColors: ['#FAC775', '#D4901A'], glow: false },
  { level: 17, minXp: 26000, name: 'ذهبي 2', frameColors: ['#FAC775', '#D4901A'], glow: false },
  { level: 18, minXp: 34000, name: 'ذهبي 3', frameColors: ['#FAC775', '#D4901A'], glow: false },
  { level: 19, minXp: 44000, name: 'ذهبي 4', frameColors: ['#FAC775', '#D4901A'], glow: false },
  { level: 20, minXp: 58000, name: 'ذهبي 5', frameColors: ['#FAC775', '#D4901A'], glow: false },
  { level: 21, minXp: 75000, name: 'بلاتيني 1', frameColors: ['#8FD8F0', '#3A9BC0'], glow: false },
  { level: 22, minXp: 95000, name: 'بلاتيني 2', frameColors: ['#8FD8F0', '#3A9BC0'], glow: false },
  { level: 23, minXp: 120000, name: 'بلاتيني 3', frameColors: ['#8FD8F0', '#3A9BC0'], glow: false },
  { level: 24, minXp: 155000, name: 'بلاتيني 4', frameColors: ['#8FD8F0', '#3A9BC0'], glow: false },
  { level: 25, minXp: 195000, name: 'بلاتيني 5', frameColors: ['#8FD8F0', '#3A9BC0'], glow: false },
  { level: 26, minXp: 250000, name: 'ماسي 1', frameColors: ['#85B7EB', '#378ADD'], glow: true },
  { level: 27, minXp: 310000, name: 'ماسي 2', frameColors: ['#85B7EB', '#378ADD'], glow: true },
  { level: 28, minXp: 390000, name: 'ماسي 3', frameColors: ['#85B7EB', '#378ADD'], glow: true },
  { level: 29, minXp: 485000, name: 'ماسي 4', frameColors: ['#85B7EB', '#378ADD'], glow: true },
  { level: 30, minXp: 600000, name: 'ماسي 5', frameColors: ['#85B7EB', '#378ADD'], glow: true },
  { level: 31, minXp: 750000, name: 'أسطوري 1', frameColors: ['#FF7A1A', '#8B5CF6'], glow: true },
  { level: 32, minXp: 955000, name: 'أسطوري 2', frameColors: ['#FF7A1A', '#8B5CF6'], glow: true },
  { level: 33, minXp: 1200000, name: 'أسطوري 3', frameColors: ['#FF7A1A', '#8B5CF6'], glow: true },
  { level: 34, minXp: 1500000, name: 'أسطوري 4', frameColors: ['#FF7A1A', '#8B5CF6'], glow: true },
  { level: 35, minXp: 2000000, name: 'أسطوري 5', frameColors: ['#FF7A1A', '#8B5CF6'], glow: true },
  { level: 36, minXp: 2500000, name: 'ملكي 1', frameColors: ['#D4537E', '#8B5CF6'], glow: true },
  { level: 37, minXp: 3300000, name: 'ملكي 2', frameColors: ['#D4537E', '#8B5CF6'], glow: true },
  { level: 38, minXp: 4400000, name: 'ملكي 3', frameColors: ['#D4537E', '#8B5CF6'], glow: true },
  { level: 39, minXp: 5700000, name: 'ملكي 4', frameColors: ['#D4537E', '#8B5CF6'], glow: true },
  { level: 40, minXp: 7600000, name: 'ملكي 5', frameColors: ['#D4537E', '#8B5CF6'], glow: true },
  { level: 41, minXp: 10000000, name: 'إمبراطوري 1', frameColors: ['#FAC775', '#FF7A1A'], glow: true },
  { level: 42, minXp: 12500000, name: 'إمبراطوري 2', frameColors: ['#FAC775', '#FF7A1A'], glow: true },
  { level: 43, minXp: 15500000, name: 'إمبراطوري 3', frameColors: ['#FAC775', '#FF7A1A'], glow: true },
  { level: 44, minXp: 19300000, name: 'إمبراطوري 4', frameColors: ['#FAC775', '#FF7A1A'], glow: true },
  { level: 45, minXp: 24100000, name: 'إمبراطوري 5', frameColors: ['#FAC775', '#FF7A1A'], glow: true },
  { level: 46, minXp: 30000000, name: 'خرافي 1', frameColors: ['#8B5CF6', '#D4537E'], glow: true },
  { level: 47, minXp: 38200000, name: 'خرافي 2', frameColors: ['#8B5CF6', '#D4537E'], glow: true },
  { level: 48, minXp: 48600000, name: 'خرافي 3', frameColors: ['#8B5CF6', '#D4537E'], glow: true },
  { level: 49, minXp: 61800000, name: 'خرافي 4', frameColors: ['#8B5CF6', '#D4537E'], glow: true },
  { level: 50, minXp: 100000000, name: 'خرافي 5', frameColors: ['#8B5CF6', '#D4537E'], glow: true },];

export const getTier = (xp: number): LevelTier => {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (xp >= tier.minXp) current = tier;
    else break;
  }
  return current;
};

export const getNextTier = (xp: number): LevelTier | null => {
  const current = getTier(xp);
  return TIERS.find((t) => t.level === current.level + 1) || null;
};

// خطّاف بسيط لجلب XP مستخدم معيّن (داعم أو مستقبل) مع تحديث فوري
export const useLevelXp = (userId: string | null, kind: LevelKind) => {
  const [xp, setXp] = useState(0);
  // معرّف فريد لكل مكوّن يستخدم هذا الخطّاف - يمنع تعارض أسماء القنوات
  // لما أكثر من مكوّن يراقب نفس المستخدم بنفس الوقت (زي فتح البث والملف الشخصي مع بعض)
  const instanceId = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!userId) return;
    const column = kind === 'supporter' ? 'supporter_xp' : 'receiver_xp';

    supabase
      .from('profiles')
      .select(column)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setXp((data as any)?.[column] ?? 0));

    const channel = supabase
      .channel(`level_${kind}_${userId}_${instanceId.current}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          setXp((payload.new as any)[column] ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, kind]);

  return xp;
};

// شارة تاج ذهبية لامعة (مستقبل) بتصميم واقعي: ظل مموّه خلفها، ظل أرضي تحتها، بريق نجمي حولها
const CrownGold3D: React.FC<{ size: number }> = ({ size }) => {
  const uid = useRef(`c${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg width={size} height={size} viewBox="0 0 130 130">
      <defs>
        <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id={`${uid}-ground`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-main`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="18%" stopColor="#FFEFC0" />
          <stop offset="45%" stopColor="#FAC775" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3D0" />
          <stop offset="40%" stopColor="#FAC775" />
          <stop offset="100%" stopColor="#8B5A0B" />
        </linearGradient>
      </defs>
      <g transform="translate(20,20)">
        <ellipse cx="50" cy="92" rx="30" ry="6" fill={`url(#${uid}-ground)`} />
        <g transform="translate(3,4)" filter={`url(#${uid}-blur)`} opacity="0.35">
          <path d="M10 80 L10 44 L26 58 L37 30 L50 46 L63 30 L74 58 L90 44 L90 80 Z" fill="#000000" />
          <rect x="7" y="79" width="86" height="8" fill="#000000" />
        </g>
        <path
          d="M10 80 L10 44 L26 58 L37 30 L50 46 L63 30 L74 58 L90 44 L90 80 Z"
          fill={`url(#${uid}-main)`}
          stroke="#8B5A0B"
          strokeWidth="2"
        />
        <path d="M10 80 L50 80 L50 46 L26 58 Z" fill="#ffffff" opacity="0.35" />
        <path d="M50 80 L90 80 L90 44 L63 30 L50 46 Z" fill="#8B5A0B" opacity="0.2" />
        <rect x="7" y="79" width="86" height="8" rx="2" fill={`url(#${uid}-band)`} stroke="#8B5A0B" strokeWidth="1.6" />
        <circle cx="10" cy="44" r="6" fill="#ffffff" stroke="#8B5A0B" strokeWidth="1.6" />
        <circle cx="50" cy="46" r="7" fill="#E24B4A" stroke="#791F1F" strokeWidth="1.6" />
        <circle cx="90" cy="44" r="6" fill="#ffffff" stroke="#8B5A0B" strokeWidth="1.6" />
      </g>
      <path d="M14 22 L15.8 26.5 L20.3 28.5 L15.8 30.5 L14 35 L12.2 30.5 L7.7 28.5 L12.2 26.5 Z" fill="#ffffff" opacity="0.95" />
      <path d="M118 58 L119.5 61.5 L123 63 L119.5 64.5 L118 68 L116.5 64.5 L113 63 L116.5 61.5 Z" fill="#ffffff" opacity="0.85" />
    </svg>
  );
};

// شارة ماسة واقعية (داعم) بقطع Round Brilliant: ظل مموّه خلفها، ظل أرضي تحتها، ٤ نقاط بريق حولها
const DiamondReal3D: React.FC<{ size: number }> = ({ size }) => {
  const uid = useRef(`d${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg width={size} height={size} viewBox="0 0 130 128">
      <defs>
        <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <radialGradient id={`${uid}-ground`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(25,14)">
        <ellipse cx="50" cy="98" rx="26" ry="6" fill={`url(#${uid}-ground)`} />
        <g transform="translate(6,7)" filter={`url(#${uid}-blur)`} opacity="0.5">
          <polygon points="42,22 58,22 66,30 34,30" fill="#000000" />
          <polygon points="18,30 34,30 42,22" fill="#000000" />
          <polygon points="58,22 66,30 82,30" fill="#000000" />
          <polygon points="18,30 26,40 20,58" fill="#000000" />
          <polygon points="82,30 74,40 80,58" fill="#000000" />
          <polygon points="20,58 50,42 50,88" fill="#000000" />
          <polygon points="80,58 50,42 50,88" fill="#000000" />
        </g>
        <polygon points="42,22 58,22 66,30 34,30" fill="#F5FAFF" />
        <polygon points="18,30 34,30 42,22" fill="#EEF7FC" />
        <polygon points="58,22 66,30 82,30" fill="#EEF7FC" />
        <polygon points="18,30 34,30 26,40" fill="#F0F8FC" />
        <polygon points="66,30 82,30 74,40" fill="#EEF7FC" />
        <polygon points="34,30 42,22 50,38" fill="#ffffff" opacity="0.9" />
        <polygon points="58,22 66,30 50,38" fill="#F5FAFF" opacity="0.9" />
        <polygon points="34,30 50,38 26,40" fill="#F5FAFF" />
        <polygon points="66,30 50,38 74,40" fill="#EEF7FC" />
        <polygon points="26,40 50,38 74,40" fill="#F0F8FC" opacity="0.85" />
        <polygon points="18,30 26,40 20,58" fill="#EEF7FC" />
        <polygon points="82,30 74,40 80,58" fill="#E8F4FA" />
        <polygon points="26,40 20,58 50,42" fill="#F0F8FC" />
        <polygon points="74,40 80,58 50,42" fill="#EEF7FC" />
        <polygon points="20,58 50,42 50,88" fill="#E8F4FA" />
        <polygon points="80,58 50,42 50,88" fill="#E0F0FA" />
        <polygon points="20,58 50,88 35,63" fill="#EEF7FC" opacity="0.9" />
        <polygon points="80,58 50,88 65,63" fill="#E8F4FA" opacity="0.9" />
        <line x1="18" y1="30" x2="82" y2="30" stroke="#ffffff" strokeWidth="0.7" opacity="0.6" />
        <line x1="20" y1="58" x2="80" y2="58" stroke="#ffffff" strokeWidth="0.6" opacity="0.45" />
        <line x1="50" y1="38" x2="50" y2="88" stroke="#ffffff" strokeWidth="0.5" opacity="0.35" />
        <line x1="26" y1="40" x2="74" y2="40" stroke="#ffffff" strokeWidth="0.5" opacity="0.35" />
        <path d="M36 19 L38.8 25.2 L45 28 L38.8 30.8 L36 37 L33.2 30.8 L27 28 L33.2 25.2 Z" fill="#ffffff" />
      </g>
      <path d="M10 24 L12.5 30 L18.5 32.5 L12.5 35 L10 41 L7.5 35 L1.5 32.5 L7.5 30 Z" fill="#ffffff" opacity="0.95" />
      <path d="M116 55 L117.8 59 L121.8 60.8 L117.8 62.6 L116 66.6 L114.2 62.6 L110.2 60.8 L114.2 59 Z" fill="#ffffff" opacity="0.85" />
    </svg>
  );
};

// شارة صغيرة تعرض رقم اللفل + الاسم (داعم/مستقبل)
export const LevelBadge: React.FC<{ xp: number; kind: LevelKind; size?: 'sm' | 'md' }> = ({
  xp,
  kind,
  size = 'sm',
}) => {
  const tier = getTier(xp);
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 18 : 24;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black ${
        isSmall ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        background: `linear-gradient(90deg, ${tier.frameColors[0]}, ${tier.frameColors[1]})`,
        color: '#fff',
      }}
    >
      {kind === 'supporter' ? <DiamondReal3D size={iconSize} /> : <CrownGold3D size={iconSize} />}
      Lv.{tier.level}
    </span>
  );
};

// إطار فخم حول أي صورة شخصية، يتغيّر لونه وسمكه وتوهجه حسب اللفل
export const AvatarFrame: React.FC<{ xp: number; kind: LevelKind; size: number; children: React.ReactNode }> = ({
  xp,
  kind,
  size,
  children,
}) => {
  const tier = getTier(xp);
  // كل مستوى رئيسي (١-١٠) فيه ٥ درجات فرعية - نحسب سمك الإطار على أساس
  // المستوى الرئيسي حتى يتدرج بالسمك تدريجياً عبر كل الخمسين مستوى وليس بأول خمسة فقط
  const mainTierIndex = Math.ceil(tier.level / 5);
  const ringWidth = 3 + Math.min(mainTierIndex, 5);

  return (
    <div
      className="relative rounded-full p-[3px] flex items-center justify-center"
      style={{
        width: size + ringWidth * 2,
        height: size + ringWidth * 2,
        background: `linear-gradient(135deg, ${tier.frameColors[0]}, ${tier.frameColors[1]})`,
        boxShadow: tier.glow ? `0 0 16px 2px ${tier.frameColors[0]}99` : 'none',
      }}
    >
      <div
        className="rounded-full overflow-hidden bg-[#0E0E12] flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {children}
      </div>
    </div>
  );
};
