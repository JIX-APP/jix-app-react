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

// أسباب البلاغ كرموز ثابتة (تنحفظ بقاعدة البيانات كذا)، والنص المعروض يجي من الترجمة:
// t(`report_reason_${reason}`)
export const REPORT_REASONS = [
  'spam',
  'harassment',
  'hate',
  'violence',
  'nudity',
  'child_safety',
  'self_harm',
  'scam',
  'impersonation',
  'other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportError = 'already_reported' | 'daily_limit' | 'not_authenticated' | 'failed';

export const submitReport = async (
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  details?: string
): Promise<{ success: boolean; error?: ReportError }> => {
  const { error } = await supabase.rpc('submit_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details?.trim() || null,
  });

  if (!error) return { success: true };
  if (error.message.includes('already_reported')) return { success: false, error: 'already_reported' };
  if (error.message.includes('daily_limit')) return { success: false, error: 'daily_limit' };
  if (error.message.includes('not_authenticated')) return { success: false, error: 'not_authenticated' };
  return { success: false, error: 'failed' };
};
