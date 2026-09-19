import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, UserPlus, UserCheck, Volume2, VolumeX } from 'lucide-react';
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
  profiles: { handle: string | null; full_name: string | null; avatar_url: string | null } | null;
}

interface JixVideoFeedProps {
  currentUserId: string | null;
  refreshKey: number;
}

export const JixVideoFeed: React.FC<JixVideoFeedProps> = ({ currentUserId, refreshKey }) => {
  const [posts, setPosts] = useState<VideoRow[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    fetchPosts();
  }, [refreshKey]);

  // منشور صورة = خزّنا نفس الرابط بعمودي video_url و thumbnail_url وقت الرفع
  const isImagePost = (post: VideoRow) => !!post.thumbnail_url && post.thumbnail_url === post.video_url;

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('videos')
      .select('id, user_id, video_url, thumbnail_url, caption, likes_count, comments_count, shares_count, profiles(handle, full_name, avatar_url)')
      .order('created_at', { ascending: false });

    setPosts((data as unknown as VideoRow[]) || []);

    if (currentUserId && data) {
      const ids = data.map((v: any) => v.id);
      const { data: myLikes } = await supabase.from('likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids);
      setLikedIds(new Set((myLikes || []).map((l) => l.post_id)));

      const userIds = [...new Set(data.map((v: any) => v.user_id))];
      const { data: myFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', userIds);
      setFollowedIds(new Set((myFollows || []).map((f) => f.following_id)));
    }
  };

  // تشغيل الفيديو الظاهر بالشاشة فقط وإيقاف الباقي
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

  if (posts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
        <p className="text-sm text-[#9A9A9E]">لسه مفيش منشورات</p>
        <p className="text-xs text-[#6B6B76] mt-1">أول منشور هيظهر هنا لما حد ينشر</p>
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

          {/* شريط أيقونات التفاعل - يمين */}
          <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 z-10">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black">
                {(post.profiles?.full_name || post.profiles?.handle || 'م')[0]}
              </div>
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

            <JixReportButton targetType="post" targetId={post.id} />
          </div>

          {/* الوصف - أسفل */}
          <div className="absolute bottom-6 left-4 right-16 z-10">
            <p className="font-black text-sm mb-1">
              {post.profiles?.full_name || post.profiles?.handle || 'مستخدم JIX'}
            </p>
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
        />
      )}
    </div>
  );
};
