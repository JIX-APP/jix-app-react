import { supabase } from './supabaseClient';

// قائمة أساسية بكلمات ممنوعة (عربي وإنجليزي) - وسّعها لاحقًا حسب الحاجة
// الفكرة: حجب فوري بالواجهة + تنضاف كلمات جديدة بسهولة بدون تعديل باقي الكود
const BANNED_WORDS = [
  // إباحي/جنسي
  'sex', 'porn', 'nude', 'xxx', 'onlyfans',
  // عنف/كراهية صريحة
  'kill you', 'terrorist',
  // شتائم شائعة (أمثلة - وسّعها حسب اللهجة)
  'كلب', 'حيوان', 'غبي جدا',
];

export interface ModerationResult {
  isClean: boolean;
  matchedWord?: string;
}

// فحص نص قبل الإرسال (تعليق، اسم، وصف منشور)
export const checkText = (text: string): ModerationResult => {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { isClean: false, matchedWord: word };
    }
  }
  return { isClean: true };
};

export type ReportTargetType = 'post' | 'user' | 'live_stream' | 'comment';

export const REPORT_REASONS = [
  'محتوى جنسي أو إباحي',
  'عنف أو محتوى مزعج',
  'خطاب كراهية أو تنمر',
  'انتحال شخصية',
  'احتيال أو نصب',
  'سبام أو إعلان مزعج',
  'سبب آخر',
];

export const submitReport = async (
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.rpc('submit_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
};
