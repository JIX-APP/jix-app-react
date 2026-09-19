import React from 'react';

// ============================================================
// نظام أيقونات الهدايا - 30 هدية مبنية على أرشيتايبات SVG مشتركة
// كل أرشيتايب يتلون ويتحجم بشكل مختلف = تنوع بصري حقيقي بدون رسم يدوي لكل هدية
// ============================================================

export type GiftRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface GiftDef {
  id: string;
  name: string;
  cost: number;
  rarity: GiftRarity;
  archetype: 'gem' | 'heart' | 'ring' | 'crown' | 'rocket' | 'car' | 'bird' | 'horse' | 'building' | 'star';
  primary: string;
  secondary: string;
  accent: string;
}

export const RARITY_LABEL: Record<GiftRarity, string> = {
  common: 'عادية',
  rare: 'نادرة',
  epic: 'ملحمية',
  legendary: 'أسطورية',
  mythic: 'خرافية',
};

export const RARITY_ORDER: GiftRarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

// ============================================================
// كتالوج الـ30 هدية
// ============================================================
export const GIFTS_CATALOG: GiftDef[] = [
  // عادية (6) - رخيصة، حركة بسيطة
  { id: 'rose', name: 'وردة', cost: 10, rarity: 'common', archetype: 'heart', primary: '#E24B4A', secondary: '#993030', accent: '#4A1515' },
  { id: 'balloon', name: 'بالون', cost: 15, rarity: 'common', archetype: 'gem', primary: '#D4537E', secondary: '#993556', accent: '#4B1528' },
  { id: 'coffee', name: 'قهوة', cost: 20, rarity: 'common', archetype: 'gem', primary: '#BA7517', secondary: '#854F0B', accent: '#412402' },
  { id: 'icecream', name: 'آيسكريم', cost: 25, rarity: 'common', archetype: 'gem', primary: '#F0997B', secondary: '#D85A30', accent: '#712B13' },
  { id: 'candle', name: 'شمعة', cost: 30, rarity: 'common', archetype: 'gem', primary: '#EF9F27', secondary: '#BA7517', accent: '#633806' },
  { id: 'clap', name: 'تصفيق', cost: 35, rarity: 'common', archetype: 'star', primary: '#FAC775', secondary: '#EF9F27', accent: '#854F0B' },

  // نادرة (6) - سعر متوسط، دوران أوضح
  { id: 'perfume', name: 'عطر', cost: 100, rarity: 'rare', archetype: 'gem', primary: '#7F77DD', secondary: '#534AB7', accent: '#26215C' },
  { id: 'ring_silver', name: 'خاتم فضي', cost: 150, rarity: 'rare', archetype: 'ring', primary: '#B4B2A9', secondary: '#5F5E5A', accent: '#2C2C2A' },
  { id: 'butterfly', name: 'فراشة', cost: 180, rarity: 'rare', archetype: 'bird', primary: '#ED93B1', secondary: '#D4537E', accent: '#72243E' },
  { id: 'headphones', name: 'سماعة', cost: 200, rarity: 'rare', archetype: 'ring', primary: '#5DCAA5', secondary: '#0F6E56', accent: '#04342C' },
  { id: 'camera', name: 'كاميرا', cost: 220, rarity: 'rare', archetype: 'gem', primary: '#85B7EB', secondary: '#185FA5', accent: '#042C53' },
  { id: 'falcon', name: 'صقر', cost: 250, rarity: 'rare', archetype: 'bird', primary: '#F5B93E', secondary: '#8B5A0A', accent: '#2B1D0C' },

  // ملحمية (6) - سعر أعلى، ظهور مصحوب بهزة خفيفة
  { id: 'motorcycle', name: 'موتوسيكل', cost: 500, rarity: 'epic', archetype: 'car', primary: '#639922', secondary: '#3B6D11', accent: '#173404' },
  { id: 'ring_gold', name: 'خاتم ذهبي', cost: 600, rarity: 'epic', archetype: 'ring', primary: '#EF9F27', secondary: '#BA7517', accent: '#412402' },
  { id: 'yacht', name: 'يخت', cost: 750, rarity: 'epic', archetype: 'car', primary: '#378ADD', secondary: '#185FA5', accent: '#042C53' },
  { id: 'horse', name: 'خيل', cost: 800, rarity: 'epic', archetype: 'horse', primary: '#C98B4E', secondary: '#8B5A2B', accent: '#4A2E14' },
  { id: 'crown_silver', name: 'تاج فضي', cost: 850, rarity: 'epic', archetype: 'crown', primary: '#D3D1C7', secondary: '#888780', accent: '#2C2C2A' },
  { id: 'diamond_ring', name: 'خاتم ماسي', cost: 900, rarity: 'epic', archetype: 'ring', primary: '#85B7EB', secondary: '#378ADD', accent: '#042C53' },

  // أسطورية (6) - غالية، ظهور بشاشة كاملة مصغّرة
  { id: 'supercar', name: 'سوبركار', cost: 1500, rarity: 'legendary', archetype: 'car', primary: '#FF7A1A', secondary: '#D8460F', accent: '#8B2A08' },
  { id: 'crown_gold', name: 'تاج ذهبي', cost: 1800, rarity: 'legendary', archetype: 'crown', primary: '#FAC775', secondary: '#EF9F27', accent: '#633806' },
  { id: 'lion', name: 'أسد', cost: 2000, rarity: 'legendary', archetype: 'horse', primary: '#D4901A', secondary: '#8B5A0A', accent: '#412402' },
  { id: 'jet', name: 'طائرة خاصة', cost: 2200, rarity: 'legendary', archetype: 'rocket', primary: '#B4B2A9', secondary: '#5F5E5A', accent: '#2C2C2A' },
  { id: 'castle', name: 'قلعة', cost: 2500, rarity: 'legendary', archetype: 'building', primary: '#7F77DD', secondary: '#534AB7', accent: '#26215C' },
  { id: 'phoenix', name: 'العنقاء', cost: 2800, rarity: 'legendary', archetype: 'bird', primary: '#E24B4A', secondary: '#FF7A1A', accent: '#4A1513' },

  // خرافية (6) - أغلى، أضخم ظهور ممكن (شاشة كاملة + اهتزاز + صوت فخم)
  { id: 'dragon', name: 'التنين', cost: 5000, rarity: 'mythic', archetype: 'horse', primary: '#D4537E', secondary: '#993556', accent: '#4B1528' },
  { id: 'rocket_gold', name: 'صاروخ ذهبي', cost: 6000, rarity: 'mythic', archetype: 'rocket', primary: '#EF9F27', secondary: '#BA7517', accent: '#412402' },
  { id: 'kingdom', name: 'المملكة', cost: 7500, rarity: 'mythic', archetype: 'building', primary: '#FAC775', secondary: '#D4901A', accent: '#633806' },
  { id: 'galaxy', name: 'المجرة', cost: 8500, rarity: 'mythic', archetype: 'star', primary: '#7F77DD', secondary: '#3C3489', accent: '#26215C' },
  { id: 'unicorn', name: 'يونيكورن', cost: 9000, rarity: 'mythic', archetype: 'horse', primary: '#ED93B1', secondary: '#D4537E', accent: '#4B1528' },
  { id: 'universe', name: 'الكون', cost: 10000, rarity: 'mythic', archetype: 'star', primary: '#FF7A1A', secondary: '#8B5CF6', accent: '#26215C' },
];

// ============================================================
// حقن الـ keyframes مرة وحدة بس بالصفحة
// ============================================================
let keyframesInjected = false;
const ensureKeyframes = () => {
  if (keyframesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes jix-gift-spin {
      0% { transform: perspective(300px) rotateY(0deg) scale(1); }
      50% { transform: perspective(300px) rotateY(180deg) scale(1.15); }
      100% { transform: perspective(300px) rotateY(360deg) scale(1); }
    }
    @keyframes jix-gift-shake-spin {
      0% { transform: perspective(300px) rotateY(0deg) rotate(0deg) scale(1); }
      20% { transform: perspective(300px) rotateY(70deg) rotate(-4deg) scale(1.08); }
      40% { transform: perspective(300px) rotateY(150deg) rotate(4deg) scale(1.15); }
      60% { transform: perspective(300px) rotateY(230deg) rotate(-4deg) scale(1.2); }
      80% { transform: perspective(300px) rotateY(300deg) rotate(4deg) scale(1.1); }
      100% { transform: perspective(300px) rotateY(360deg) rotate(0deg) scale(1); }
    }
    @keyframes jix-gift-pop {
      0% { transform: scale(0) rotate(-15deg); opacity: 0; }
      55% { transform: scale(1.3) rotate(10deg); opacity: 1; }
      75% { transform: scale(0.92) rotate(-4deg); }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes jix-gift-legendary-enter {
      0% { transform: scale(0) rotate(-30deg) translateY(40px); opacity: 0; }
      50% { transform: scale(1.4) rotate(15deg) translateY(-10px); opacity: 1; }
      70% { transform: scale(0.9) rotate(-6deg) translateY(0); }
      100% { transform: scale(1.15) rotate(0deg) translateY(0); opacity: 1; }
    }
    @keyframes jix-screen-flash {
      0% { opacity: 0; }
      15% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes jix-ray-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  keyframesInjected = true;
};

interface RenderProps {
  size: number;
  primary: string;
  secondary: string;
  accent: string;
}

// ============================================================
// الأرشيتايبات - أشكال SVG أساسية يعاد استخدامها بألوان مختلفة
// ============================================================
const ArchetypeGem: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`g-${primary}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="60%" stopColor={secondary} />
        <stop offset="100%" stopColor={accent} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="82" rx="24" ry="6" fill="black" opacity="0.15" />
    <polygon points="50,15 75,38 65,75 35,75 25,38" fill={`url(#g-${primary})`} />
    <polygon points="50,15 65,38 50,45 35,38" fill={primary} opacity="0.7" />
  </svg>
);

const ArchetypeHeart: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`h-${primary}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={accent} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="85" rx="24" ry="6" fill="black" opacity="0.15" />
    <path
      d="M50 80 C20 58 12 38 24 26 C34 16 48 22 50 34 C52 22 66 16 76 26 C88 38 80 58 50 80 Z"
      fill={`url(#h-${primary})`}
    />
    <path d="M50 34 C48 22 34 16 24 26 C18 32 18 40 22 46 C30 40 42 36 50 34 Z" fill={secondary} opacity="0.5" />
  </svg>
);

const ArchetypeRing: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`r-${primary}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="85" rx="24" ry="6" fill="black" opacity="0.15" />
    <circle cx="50" cy="62" r="22" fill="none" stroke={`url(#r-${primary})`} strokeWidth="9" />
    <polygon points="50,18 62,35 55,48 45,48 38,35" fill={accent} />
    <polygon points="50,18 58,32 50,38 42,32" fill={primary} opacity="0.8" />
  </svg>
);

const ArchetypeCrown: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`c-${primary}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="82" rx="28" ry="6" fill="black" opacity="0.15" />
    <path d="M20 70 L20 45 L35 58 L50 32 L65 58 L80 45 L80 70 Z" fill={`url(#c-${primary})`} />
    <rect x="18" y="68" width="64" height="10" rx="2" fill={accent} />
    <circle cx="20" cy="42" r="5" fill={accent} />
    <circle cx="50" cy="28" r="6" fill={accent} />
    <circle cx="80" cy="42" r="5" fill={accent} />
  </svg>
);

const ArchetypeRocket: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`k-${primary}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="90" rx="18" ry="5" fill="black" opacity="0.15" />
    <path d="M50 10 C62 25 65 50 60 68 L40 68 C35 50 38 25 50 10 Z" fill={`url(#k-${primary})`} />
    <circle cx="50" cy="38" r="8" fill={accent} opacity="0.8" />
    <path d="M40 60 L25 78 L38 70 Z" fill={accent} />
    <path d="M60 60 L75 78 L62 70 Z" fill={accent} />
    <path d="M44 68 L50 88 L56 68 Z" fill="#FF9A3C" opacity="0.9" />
  </svg>
);

const ArchetypeCar: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`v-${primary}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={accent} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="78" rx="38" ry="7" fill="black" opacity="0.18" />
    <path d="M15 62 L20 45 C22 40 28 36 35 36 L65 36 C72 36 78 40 80 45 L85 62 L78 66 L22 66 Z" fill={`url(#v-${primary})`} />
    <path d="M32 38 L40 24 L60 24 L68 38 Z" fill={secondary} opacity="0.8" />
    <circle cx="30" cy="66" r="9" fill="#1A1A1A" />
    <circle cx="70" cy="66" r="9" fill="#1A1A1A" />
    <rect x="18" y="48" width="6" height="4" rx="1" fill="#FFE9A8" />
    <rect x="76" y="48" width="6" height="4" rx="1" fill="#FFE9A8" />
  </svg>
);

const ArchetypeBird: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`b-${primary}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="58" rx="30" ry="8" fill="black" opacity="0.15" />
    <path d="M50 20 L65 45 L82 55 L60 58 L55 78 L50 65 L45 78 L40 58 L18 55 L35 45 Z" fill={accent} />
    <path d="M50 25 C60 30 66 42 62 55 C58 68 50 72 50 72 C50 72 42 68 38 55 C34 42 40 30 50 25 Z" fill={`url(#b-${primary})`} />
    <circle cx="46" cy="35" r="2.5" fill="#1A1A1A" />
    <circle cx="54" cy="35" r="2.5" fill="#1A1A1A" />
  </svg>
);

const ArchetypeHorse: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`o-${primary}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="82" rx="32" ry="7" fill="black" opacity="0.15" />
    <path d="M35 78 L38 55 L30 40 L38 20 L48 18 L52 30 L62 32 L70 45 L65 60 L68 78 L58 78 L55 62 L48 78 Z" fill={`url(#o-${primary})`} />
    <path d="M38 20 C34 15 36 8 44 8 C50 8 52 16 48 18 Z" fill={accent} />
    <path d="M30 40 C24 36 22 28 28 26 C34 24 38 32 38 32" fill={accent} />
    <circle cx="42" cy="17" r="1.8" fill="#1A1A1A" />
  </svg>
);

const ArchetypeBuilding: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`u-${primary}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="88" rx="34" ry="6" fill="black" opacity="0.15" />
    <rect x="20" y="45" width="16" height="38" fill={`url(#u-${primary})`} />
    <rect x="42" y="30" width="16" height="53" fill={`url(#u-${primary})`} />
    <rect x="64" y="45" width="16" height="38" fill={`url(#u-${primary})`} />
    <polygon points="20,45 28,32 36,45" fill={accent} />
    <polygon points="42,30 50,15 58,30" fill={accent} />
    <polygon points="64,45 72,32 80,45" fill={accent} />
    <rect x="46" y="45" width="8" height="12" fill={accent} opacity="0.7" />
  </svg>
);

const ArchetypeStar: React.FC<RenderProps> = ({ size, primary, secondary, accent }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <radialGradient id={`s-${primary}`}>
        <stop offset="0%" stopColor={primary} />
        <stop offset="100%" stopColor={secondary} />
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="88" rx="20" ry="5" fill="black" opacity="0.12" />
    {[0, 45, 90, 135].map((deg) => (
      <line
        key={deg}
        x1="50"
        y1="50"
        x2={50 + 42 * Math.cos((deg * Math.PI) / 180)}
        y2={50 + 42 * Math.sin((deg * Math.PI) / 180)}
        stroke={accent}
        strokeWidth="3"
        opacity="0.5"
      />
    ))}
    <polygon
      points="50,10 61,38 90,40 66,58 75,86 50,70 25,86 34,58 10,40 39,38"
      fill={`url(#s-${primary})`}
    />
  </svg>
);

const ARCHETYPES: Record<GiftDef['archetype'], React.FC<RenderProps>> = {
  gem: ArchetypeGem,
  heart: ArchetypeHeart,
  ring: ArchetypeRing,
  crown: ArchetypeCrown,
  rocket: ArchetypeRocket,
  car: ArchetypeCar,
  bird: ArchetypeBird,
  horse: ArchetypeHorse,
  building: ArchetypeBuilding,
  star: ArchetypeStar,
};

interface GiftIconProps {
  gift: GiftDef;
  size?: number;
  spinning?: boolean;
}

export const GiftIcon: React.FC<GiftIconProps> = ({ gift, size = 48, spinning }) => {
  ensureKeyframes();
  const Shape = ARCHETYPES[gift.archetype];
  const anim = gift.rarity === 'legendary' || gift.rarity === 'mythic' ? 'jix-gift-shake-spin' : 'jix-gift-spin';

  return (
    <div
      style={
        spinning
          ? { animation: `${anim} 1.6s ease-in-out infinite`, transformStyle: 'preserve-3d', display: 'inline-block' }
          : { display: 'inline-block' }
      }
    >
      <Shape size={size} primary={gift.primary} secondary={gift.secondary} accent={gift.accent} />
    </div>
  );
};

export const giftPopStyle: React.CSSProperties = {
  animation: 'jix-gift-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
  display: 'inline-block',
};

export const giftLegendaryEnterStyle: React.CSSProperties = {
  animation: 'jix-gift-legendary-enter 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
  display: 'inline-block',
};
