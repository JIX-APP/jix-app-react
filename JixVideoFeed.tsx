import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  UserCheck,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  X,
  MoreVertical,
  EyeOff,
  Eye,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { JixComments } from './JixComments';
import { JixReportButton } from './JixReportButton';

interface VideoRow {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_hidden: boolean;
  created_at: string;
  profiles: { handle: string | null; full_name: string | null; avatar_url: string | null } | null;
}

export type JixFeedMode = 'latest' | 'popular' | 'following';

interface JixVideoFeedProps {
  currentUserId: string | null;
  refreshKey: number;
  feedMode: JixFeedMode;
  onOpenProfile?: (userId: string) => void;
}

export const JixVideoFeed: React.FC<JixVideoFeedProps> = ({ currentUserId, refreshKey, feedMode, onOpenProfile }) => {
  const [posts, setPosts] = useState<VideoRow[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    fetchPosts();
  }, [refreshKey, feedMode]);

  const isImagePost = (post: VideoRow) => !!post.thumbnail_url && post.thumbnail_url === post.video_url;

  const fetchPosts = async () => {
    // وضع "متابعة" - نجيب أول شي قائمة اللي تتابعهم، ونعرض بس منشوراتهم
    // (نفس منطق تيك توك: متابعة أحادية الاتجاه، مو صداقة متبادلة)
    let followingUserIds: string[] | null = null;
    if (feedMode === 'following') {
      if (!currentUserId) {
        setPosts([]);
        return;
      }
      const { data: followingRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);
      followingUserIds = (followingRows || []).map((f) => f.following_id);
      if (followingUserIds.length === 0) {
        setPosts([]);
        return;
      }
    }

    let query = supabase
      .from('videos')
      .select('id, user_id, video_url, thumbnail_url, caption, likes_count, comments_count, shares_count, is_hidden, created_at, profiles(handle, full_name, avatar_url)');

    if (feedMode === 'popular') {
      // "الأكثر رواجًا" - نقتصر على آخر 7 أيام عشان ما يكون نفس المنشورات القديمة دايمًا فوق
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', sevenDaysAgo).order('likes_count', { ascending: false });
    } else if (feedMode === 'following' && followingUserIds) {
      query = query.in('user_id', followingUserIds).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data } = await query;

    const allPosts = (data as unknown as VideoRow[]) || [];
    const visiblePosts = allPosts.filter((p) => !p.is_hidden || p.user_id === currentUserId);
    setPosts(visiblePosts);

    if (currentUserId && data) {
      const ids = allPosts.map((v) => v.id);
      const { data: myLikes } = await supabase.from('likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids);
      setLikedIds(new Set((myLikes || []).map((l) => l.post_id)));

      const userIds = [...new Set(allPosts.map((v) => v.user_id))];
      const { data: myFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', userIds);
      setFollowedIds(new Set((myFollows || []).map((f) => f.following_id)));
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    Object.values(videoRefs.current).forEach((v) => v && observer.observe(v));
    return () => observer.disconnect();
  }, [posts]);

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;

    const isLiked = likedIds.has(postId);

    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((v) => (v.id === postId ? { ...v, likes_count: v.likes_count + (isLiked ? -1 : 1) } : v))
    );

    const { error } = await supabase.rpc('toggle_like', { p_post_id: postId });
    if (error) fetchPosts();
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;
    const isFollowing = followedIds.has(targetUserId);

    setFollowedIds((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(targetUserId) : next.add(targetUserId);
      return next;
    });

    const { error } = await supabase.rpc('toggle_follow', { p_following_id: targetUserId });
    if (error) fetchPosts();
  };

  const handleDelete = async (postId: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.rpc('delete_video', { p_video_id: postId });
      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError((err as Error).message || 'تعذر حذف المنشور');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleVisibility = async (postId: string) => {
    setIsTogglingVisibility(true);
    try {
      const { data, error } = await supabase.rpc('toggle_video_visibility', { p_video_id: postId });
      if (error) throw error;

      const nowHidden = (data as any)?.is_hidden ?? false;

      if (nowHidden && currentUserId) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_hidden: true } : p)));
      } else {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_hidden: false } : p)));
      }
      setOpenMenuId(null);
    } catch (err) {
      console.error('[JIX] فشل تغيير حالة الإخفاء:', err);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
        {feedMode === 'popular' && (
          <p className="text-sm text-[#9A9A9E]">ما فيه منشورات رائجة خلال آخر أسبوع</p>
        )}
        {feedMode === 'following' && (
          <p className="text-sm text-[#9A9A9E]">لسه ما تتابع أي حد، تابع مستخدمين عشان تشوف منشوراتهم هنا</p>
        )}
        {feedMode === 'latest' && (
          <p className="text-xs text-[#6B6B76]">أول منشور هيظهر هنا لما حد ينشر</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-scroll snap-y snap-mandatory">
      {posts.map((post) => (
        <div key={post.id} className="relative h-full w-full snap-start flex items-center justify-center bg-black">
          {isImagePost(post) ? (
            <img src={post.video_url} className="w-full h-full object-cover" />
          ) : (
            <video
              ref={(el) => (videoRefs.current[post.id] = el)}
              src={post.video_url}
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
              onClick={() => setIsMuted((m) => !m)}
            />
          )}

          {!isImagePost(post) && (
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {post.is_hidden && currentUserId === post.user_id && (
            <span className="absolute top-4 left-4 flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-300 z-10">
              <EyeOff className="w-3 h-3" /> مخفي
            </span>
          )}

          {/* شريط أيقونات التفاعل - يمين */}
          <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 z-10">
            <div className="relative">
              <button
                onClick={() => onOpenProfile?.(post.user_id)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black overflow-hidden"
              >
                {post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  (post.profiles?.full_name || post.profiles?.handle || 'م')[0]
                )}
              </button>
              {currentUserId && post.user_id !== currentUserId && (
                <button
                  onClick={() => handleFollow(post.user_id)}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center border-2 border-black"
                >
                  {followedIds.has(post.user_id) ? (
                    <UserCheck className="w-2.5 h-2.5" />
                  ) : (
                    <UserPlus className="w-2.5 h-2.5" />
                  )}
                </button>
              )}
            </div>

            <button onClick={() => handleLike(post.id)} className="flex flex-col items-center gap-1">
              <Heart
                className={`w-7 h-7 ${likedIds.has(post.id) ? 'fill-[#FF3B5C] text-[#FF3B5C]' : 'text-white'}`}
              />
              <span className="text-[10px] font-bold">{post.likes_count}</span>
            </button>

            <button onClick={() => setActiveCommentsPostId(post.id)} className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-[10px] font-bold">{post.comments_count}</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-[10px] font-bold">{post.shares_count}</span>
            </button>

            {currentUserId === post.user_id ? (
              <button onClick={() => setOpenMenuId(post.id)} className="flex flex-col items-center gap-1">
                <MoreVertical className="w-6 h-6 text-white" />
              </button>
            ) : (
              <JixReportButton targetType="post" targetId={post.id} />
            )}
          </div>

          {/* الوصف - أسفل */}
          <div className="absolute bottom-6 left-4 right-16 z-10">
            <button onClick={() => onOpenProfile?.(post.user_id)} className="font-black text-sm mb-1 text-white">
              {post.profiles?.full_name || post.profiles?.handle || 'مستخدم JIX'}
            </button>
            {post.caption && <p className="text-xs text-gray-200">{post.caption}</p>}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>
      ))}

      {activeCommentsPostId && (
        <JixComments
          isOpen={!!activeCommentsPostId}
          onClose={() => {
            setActiveCommentsPostId(null);
            fetchPosts();
          }}
          postId={activeCommentsPostId}
          onOpenProfile={onOpenProfile}
        />
      )}

      {/* قائمة خيارات المنشور (النقط الثلاث) */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
          onClick={() => setOpenMenuId(null)}
        >
          <div
            className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-gray-800 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />

            <button
              onClick={() => handleToggleVisibility(openMenuId)}
              disabled={isTogglingVisibility}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/5 rounded-2xl mb-2.5 disabled:opacity-50"
            >
              {posts.find((p) => p.id === openMenuId)?.is_hidden ? (
                <Eye className="w-5 h-5 text-gray-300" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-300" />
              )}
              <span className="text-sm font-bold text-white">
                {posts.find((p) => p.id === openMenuId)?.is_hidden ? 'إظهار المنشور' : 'إخفاء المنشور (خاص)'}
              </span>
              {isTogglingVisibility && <Loader2 className="w-4 h-4 animate-spin text-white mr-auto" />}
            </button>

            <button
              onClick={() => {
                setConfirmDeleteId(openMenuId);
                setOpenMenuId(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-600/10 rounded-2xl"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
              <span className="text-sm font-bold text-red-400">حذف المنشور</span>
            </button>

            <button
              onClick={() => setOpenMenuId(null)}
              className="w-full py-3.5 mt-3 text-sm font-bold text-gray-400"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm bg-[#0f1118] border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm text-white">حذف المنشور</h3>
              <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-5">
              هل أنت متأكد إنك تبي تحذف هذا المنشور؟ ما يقدر يترجع بعد الحذف.
            </p>

            {deleteError && (
              <p className="text-[10px] text-red-400 text-center mb-3">{deleteError}</p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-white/5 text-white font-bold text-sm rounded-2xl disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white font-black text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
