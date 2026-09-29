import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ============================================================
// الحظر من جهة التطبيق:
// نحمّل مرة وحدة كل الحسابات اللي بيني وبينها حظر (من أي طرف)
// ونخفي محتواهم (منشورات، تعليقات، تعليقات البث). الحماية الحقيقية بالسيرفر.
// ============================================================

let relationIds = new Set<string>();
let loadedFor: string | null = null;
const listeners = new Set<(ids: Set<string>) => void>();

const emit = () => listeners.forEach((fn) => fn(relationIds));

export const loadBlockRelations = async (userId: string | null) => {
  if (!userId) {
    relationIds = new Set();
    loadedFor = null;
    emit();
    return;
  }
  const { data } = await supabase.rpc('get_my_block_relations');
  relationIds = new Set(((data as { user_id: string }[]) ?? []).map((r) => r.user_id));
  loadedFor = userId;
  emit();
};

export const isBlockedRelation = (userId: string | null | undefined) => !!userId && relationIds.has(userId);

export const useBlockRelations = (currentUserId: string | null | undefined) => {
  const [ids, setIds] = useState<Set<string>>(relationIds);
  useEffect(() => {
    const fn = (next: Set<string>) => setIds(new Set(next));
    listeners.add(fn);
    if (currentUserId && loadedFor !== currentUserId) loadBlockRelations(currentUserId);
    return () => {
      listeners.delete(fn);
    };
  }, [currentUserId]);
  return ids;
};

// يرجع true لو صار محظور، false لو انفك الحظر
export const toggleBlock = async (userId: string): Promise<boolean | null> => {
  const { data, error } = await supabase.rpc('toggle_block', { p_user_id: userId });
  if (error) return null;
  const blocked = data === true;
  if (blocked) relationIds.add(userId);
  else relationIds.delete(userId);
  relationIds = new Set(relationIds);
  emit();
  return blocked;
};

export const getBlockStatus = async (userId: string) => {
  const { data } = await supabase.rpc('get_block_status', { p_user_id: userId });
  const row = Array.isArray(data) ? data[0] : data;
  return { iBlocked: !!row?.i_blocked, blockedMe: !!row?.blocked_me };
};
