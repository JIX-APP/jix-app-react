import { supabase } from './supabaseClient';

export type PKBattleStatus = 'pending' | 'active' | 'finished' | 'declined' | 'cancelled';

export interface PKBattle {
  id: string;
  host_a_id: string;
  host_b_id: string | null;
  live_id_a: string;
  live_id_b: string | null;
  status: PKBattleStatus;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  score_a: number;
  score_b: number;
  winner_id: string | null;
  created_at: string;
}

// إرسال تحدي لمذيع معين (بالـ user_id تبعه)
export const requestPKChallenge = async (
  targetUserId: string
): Promise<{ battleId: string | null; error?: string }> => {
  const { data, error } = await supabase.rpc('request_pk_challenge', {
    p_target_user_id: targetUserId,
  });
  if (error) return { battleId: null, error: error.message };
  return { battleId: data as string };
};

// الرد على تحدي (قبول أو رفض)
export const respondPKChallenge = async (
  battleId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.rpc('respond_pk_challenge', {
    p_battle_id: battleId,
    p_accept: accept,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// الانضمام لطابور المطابقة العشوائية - يرجع battleId فورًا لو صار تطابق
export const joinPKRandomQueue = async (): Promise<{ battleId: string | null; error?: string }> => {
  const { data, error } = await supabase.rpc('join_pk_random_queue');
  if (error) return { battleId: null, error: error.message };
  return { battleId: (data as string) ?? null };
};

// الخروج من طابور المطابقة العشوائية (لو المذيع غيّر رأيه وهو منتظر)
export const leavePKRandomQueue = async (): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.rpc('leave_pk_random_queue');
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// إنهاء المعركة (تُستدعى تلقائيًا من الواجهة لما ينتهي العداد)
export const finishPKBattle = async (battleId: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase.rpc('finish_pk_battle', { p_battle_id: battleId });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// جلب حالة معركة معينة بلحظتها
export const getPKBattle = async (battleId: string): Promise<PKBattle | null> => {
  const { data } = await supabase.from('pk_battles').select('*').eq('id', battleId).maybeSingle();
  return data as PKBattle | null;
};
