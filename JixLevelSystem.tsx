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
  { level: 1, minXp: 0, name: 'مبتدئ', frameColors: ['#6B6B76', '#4A4A52'], glow: false },
  { level: 2, minXp: 500, name: 'برونزي', frameColors: ['#C98B4E', '#8B5A2B'], glow: false },
  { level: 3, minXp: 2000, name: 'فضي', frameColors: ['#D3D1C7', '#888780'], glow: false },
  { level: 4, minXp: 5000, name: 'ذهبي', frameColors: ['#FAC775', '#D4901A'], glow: false },
  { level: 5, minXp: 12000, name: 'بلاتيني', frameColors: ['#8FD8F0', '#3A9BC0'], glow: false },
  { level: 6, minXp: 25000, name: 'ماسي', frameColors: ['#85B7EB', '#378ADD'], glow: true },
  { level: 7, minXp: 50000, name: 'أسطوري', frameColors: ['#FF7A1A', '#8B5CF6'], glow: true },
  { level: 8, minXp: 100000, name: 'ملكي', frameColors: ['#D4537E', '#8B5CF6'], glow: true },
  { level: 9, minXp: 250000, name: 'إمبراطوري', frameColors: ['#FAC775', '#FF7A1A'], glow: true },
  { level: 10, minXp: 500000, name: 'خرافي', frameColors: ['#8B5CF6', '#D4537E'], glow: true },
];

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

// شارة صغيرة تعرض رقم اللفل + الاسم (داعم/مستقبل)
export const LevelBadge: React.FC<{ xp: number; kind: LevelKind; size?: 'sm' | 'md' }> = ({
  xp,
  kind,
  size = 'sm',
}) => {
  const tier = getTier(xp);
  const isSmall = size === 'sm';

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
      {kind === 'supporter' ? '💎' : '👑'} Lv.{tier.level}
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
  const ringWidth = 3 + Math.min(tier.level, 5); // كل ما زاد اللفل زاد سمك الإطار

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
