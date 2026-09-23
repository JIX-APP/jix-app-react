import React, { useEffect, useState } from 'react';
import { X, Check, Loader2, Share2, Link2 } from 'lucide-react';
import { supabase } from './supabaseClient';

// ============================================================
// مشاركة البث المباشر
// بالآيفون يفتح قائمة المشاركة الأصلية (واتساب، سناب، انستقرام، رسائل...)
// ولو الجهاز ما يدعمها، ينسخ الرابط تلقائيًا.
// الرابط يحتوي رقم المذيع (مو رقم البث) عشان يظل شغال حتى لو المذيع
// قفل البث وفتحه من جديد.
// ============================================================

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export const buildLiveLink = (hostId: string): string =>
  `${window.location.origin}/?live=${encodeURIComponent(hostId)}`;

export async function shareLive(hostId: string, hostName: string): Promise<ShareResult> {
  const url = buildLiveLink(hostId);
  const text = `🔴 ${hostName} في بث مباشر الآن على JIX، تعال شوف!`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'JIX Live', text, url });
      return 'shared';
    } catch (err) {
      // المستخدم سكّر قائمة المشاركة بنفسه - مو خطأ
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// رابط منشور (فيديو أو صورة)
export const buildPostLink = (postId: string): string =>
  `${window.location.origin}/?post=${encodeURIComponent(postId)}`;

export async function sharePost(postId: string, authorName: string): Promise<ShareResult> {
  const url = buildPostLink(postId);
  const text = `شوف هالمنشور من ${authorName} على JIX 🔥`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'JIX', text, url });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// يقرا رابط مشاركة لو التطبيق انفتح منه (?live=... أو ?post=...)، ويمسحه من الرابط بعدها
export function consumeSharedParam(name: 'live' | 'post'): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (!value) return null;
    params.delete(name);
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
    return value;
  } catch {
    return null;
  }
}

export const consumeSharedLiveParam = () => consumeSharedParam('live');

// ============================================================
// ملف المشاركة الكامل: الدوال المساعدة فوق + قائمة المشاركة تحت
// قائمة المشاركة (مثل تيك توك):
// 1) صف "أرسل لأصدقائك" - أصدقاؤك بـ JIX (متابعة متبادلة)، تضغط على أي
//    واحد ويوصله الرابط برسالة خاصة داخل التطبيق
// 2) مشاركة خارجية (واتساب، سناب...) ونسخ الرابط
// ============================================================

interface Friend {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

interface JixShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  kind: 'post' | 'live';
  targetId: string; // رقم المنشور، أو رقم المذيع للبث
  authorName: string;
  // يُستدعى بعد أي مشاركة ناجحة (داخلية أو خارجية) - مثلاً لزيادة عداد المشاركات
  onShared?: () => void;
}

export const JixShareSheet: React.FC<JixShareSheetProps> = ({
  isOpen,
  onClose,
  currentUserId,
  kind,
  targetId,
  authorName,
  onShared,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  // الأصدقاء = اللي أتابعهم ويتابعوني
  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    setSentTo(new Set());
    setStatus(null);
    (async () => {
      setIsLoading(true);
      const { data: iFollow } = await supabase.from('follows').select('following_id').eq('follower_id', currentUserId);
      const followingIds = (iFollow || []).map((r: { following_id: string }) => r.following_id);
      if (followingIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }
      const { data: followBack } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUserId)
        .in('follower_id', followingIds);
      const friendIds = (followBack || []).map((r: { follower_id: string }) => r.follower_id);
      if (friendIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, handle, avatar_url')
        .in('id', friendIds);
      setFriends((profiles as Friend[]) || []);
      setIsLoading(false);
    })();
  }, [isOpen, currentUserId]);

  const link = kind === 'post' ? buildPostLink(targetId) : buildLiveLink(targetId);
  const messageText =
    kind === 'post'
      ? `🔗 شاركك منشور من ${authorName}:\n${link}`
      : `🔴 ${authorName} في بث مباشر الآن، تعال شوف:\n${link}`;

  const sendToFriend = async (friend: Friend) => {
    if (sendingTo || sentTo.has(friend.id)) return;
    setSendingTo(friend.id);
    try {
      const { data: conversationId, error: convError } = await supabase.rpc('get_or_create_dm_conversation', {
        p_other_user_id: friend.id,
      });
      if (convError || !conversationId) throw convError;
      const { error: sendError } = await supabase.rpc('send_dm_message', {
        p_conversation_id: conversationId,
        p_message_text: messageText,
      });
      if (sendError) throw sendError;
      setSentTo((prev) => new Set(prev).add(friend.id));
      onShared?.();
    } catch {
      setStatus('تعذر الإرسال، حاول مرة ثانية');
    } finally {
      setSendingTo(null);
    }
  };

  const handleExternal = async () => {
    const result: ShareResult =
      kind === 'post' ? await sharePost(targetId, authorName) : await shareLive(targetId, authorName);
    if (result === 'shared' || result === 'copied') onShared?.();
    if (result === 'copied') setStatus('تم نسخ الرابط ✓');
    if (result === 'failed') setStatus('تعذر المشاركة');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setStatus('تم نسخ الرابط ✓');
      onShared?.();
    } catch {
      setStatus('تعذر نسخ الرابط');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[430px] bg-[#12141f] border-t border-gray-800 rounded-t-3xl"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4">
          <h3 className="font-black text-sm text-white">مشاركة</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* أرسل لأصدقائك داخل JIX */}
        {currentUserId && (
          <div className="px-4">
            <p className="text-xs font-bold text-gray-400 mb-3">أرسل لأصدقائك</p>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-[11px] text-gray-500 pb-3">
                ما عندك أصدقاء بعد. تابعوا بعض عشان تقدرون تتشاركون المنشورات والبثوث
              </p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
                {friends.map((f) => {
                  const name = f.full_name || f.handle || 'JIX';
                  const isSent = sentTo.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => sendToFriend(f)}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-14"
                    >
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white overflow-hidden">
                        {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" /> : name[0]}
                        {(isSent || sendingTo === f.id) && (
                          <span className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            {isSent ? (
                              <Check className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            )}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-white truncate w-full text-center">
                        {isSent ? 'تم الإرسال' : name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* مشاركة خارج التطبيق */}
        <div className="px-4 pt-2 flex gap-4 border-t border-white/5 mt-1">
          <button onClick={handleExternal} className="flex flex-col items-center gap-1.5 pt-3 w-16">
            <span className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-emerald-400" />
            </span>
            <span className="text-[10px] text-white text-center">مشاركة خارجية</span>
          </button>
          <button onClick={handleCopy} className="flex flex-col items-center gap-1.5 pt-3 w-16">
            <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </span>
            <span className="text-[10px] text-white text-center">نسخ الرابط</span>
          </button>
        </div>

        {status && <p className="text-center text-xs text-gray-300 font-bold pt-3">{status}</p>}
      </div>
    </div>
  );
};
