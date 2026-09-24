import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { JixStoryRing } from './JixStoryRing';
import { useI18n } from './JixLanguage';

// ============================================================
// إحصائيات البروفايل بنفس ترتيب تيك توك:
// [ متابَع ]  [ متابعون ]  [ إعجابات ]
// متابَع ومتابعون أزرار تفتح القائمة
// ============================================================

interface JixProfileStatsProps {
  userId: string;
  refreshKey?: number;
  onOpenProfile?: (userId: string) => void;
}

type ListKind = 'following' | 'followers';

interface ListUser {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

// 1200 → 1.2K ، 1500000 → 1.5M (نفس اختصار تيك توك)
const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};

export const JixProfileStats: React.FC<JixProfileStatsProps> = ({ userId, refreshKey = 0, onOpenProfile }) => {
  const { t } = useI18n();
  const [following, setFollowing] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [openList, setOpenList] = useState<ListKind | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [followingRes, followersRes, videosRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('videos').select('likes_count').eq('user_id', userId),
      ]);
      setFollowing(followingRes.count ?? 0);
      setFollowers(followersRes.count ?? 0);
      setLikes((videosRes.data || []).reduce((sum, v) => sum + (v.likes_count || 0), 0));
    })();
  }, [userId, refreshKey]);

  const Stat = ({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center min-w-[72px] disabled:cursor-default"
    >
      <span className="text-base font-black text-white">{formatCount(value)}</span>
      <span className="text-[11px] text-gray-400 mt-0.5">{label}</span>
    </button>
  );

  return (
    <>
      <div className="flex items-center justify-center gap-2 mt-3">
        <Stat value={following} label={t('stat_following')} onClick={() => setOpenList('following')} />
        <span className="w-px h-4 bg-white/10" />
        <Stat value={followers} label={t('stat_followers')} onClick={() => setOpenList('followers')} />
        <span className="w-px h-4 bg-white/10" />
        <Stat value={likes} label={t('stat_likes')} />
      </div>

      {openList && (
        <FollowListSheet
          userId={userId}
          kind={openList}
          onClose={() => setOpenList(null)}
          onOpenProfile={(id) => {
            setOpenList(null);
            onOpenProfile?.(id);
          }}
        />
      )}
    </>
  );
};

const FollowListSheet: React.FC<{
  userId: string;
  kind: ListKind;
  onClose: () => void;
  onOpenProfile: (id: string) => void;
}> = ({ userId, kind, onClose, onOpenProfile }) => {
  const { t } = useI18n();
  const [users, setUsers] = useState<ListUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      if (kind === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('profiles!follows_follower_id_fkey(id, full_name, handle, avatar_url)')
          .eq('following_id', userId);
        setUsers(((data || []) as any[]).map((r) => r.profiles).filter(Boolean));
      } else {
        const { data } = await supabase
          .from('follows')
          .select('profiles!follows_following_id_fkey(id, full_name, handle, avatar_url)')
          .eq('follower_id', userId);
        setUsers(((data || []) as any[]).map((r) => r.profiles).filter(Boolean));
      }
      setIsLoading(false);
    })();
  }, [userId, kind]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-[430px] bg-[#12141f] border-t border-gray-800 rounded-t-3xl max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-black text-sm text-white">{kind === 'followers' ? t('list_followers') : t('list_following')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10">
              {kind === 'followers' ? t('no_followers_list') : t('no_following_list')}
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                onClick={() => onOpenProfile(u.id)}
                className="w-full flex items-center gap-3 bg-white/5 rounded-2xl p-2.5 text-right cursor-pointer"
              >
                {/* الضغط على الصورة: يدخل البث/الستوري لو فيه، والضغط على باقي الصف يفتح البروفايل */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <JixStoryRing
                    userId={u.id}
                    currentUserId={null}
                    size={40}
                    userName={u.full_name || u.handle || t('user_default')}
                    avatarUrl={u.avatar_url}
                  >
                    <div
                      onClick={() => onOpenProfile(u.id)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white overflow-hidden"
                    >
                      {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : (u.full_name || u.handle || '?')[0]}
                    </div>
                  </JixStoryRing>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.full_name || u.handle}</p>
                  {u.handle && <p className="text-[10px] text-gray-500 truncate">@{u.handle}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
