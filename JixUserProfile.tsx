import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  UserPlus,
  UserCheck,
  Loader2,
  Play,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Users,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { LevelBadge, AvatarFrame, useLevelXp } from './JixLevelSystem';
import { JixComments } from './JixComments';
import { JixStoryRing } from './JixStoryRing';
import { JixProfileStats } from './JixProfileStats';

interface JixUserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUserId: string | null;
  // فتح محادثة مع هذا المستخدم (للأصدقاء فقط)، ولو فيه callType يبدأ مكالمة مباشرة
  onOpenChat?: (otherUserId: string, otherUserName: string, callType?: 'voice' | 'video') => void;
  // فتح بروفايل مستخدم ثاني من قائمة المتابعين
  onOpenProfile?: (userId: string) => void;
}

// حساب العمر بدقة من تاريخ الميلاد
const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

interface ProfileData {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  region: string | null;
  gender: 'male' | 'female' | null;
  date_of_birth: string | null;
}

interface PostRow {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
}

export const JixUserProfile: React.FC<JixUserProfileProps> = ({ isOpen, onClose, userId, currentUserId, onOpenChat, onOpenProfile }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);
  // هل هو يتابعني بالمقابل؟ لو الاثنين يتابعون بعض = أصدقاء
  const [isFollowedBack, setIsFollowedBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const supporterXp = useLevelXp(userId, 'supporter');
  const receiverXp = useLevelXp(userId, 'receiver');

  const isImagePost = (post: PostRow) => !!post.thumbnail_url && post.thumbnail_url === post.video_url;

  const fetchAll = async () => {
    setIsLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, handle, avatar_url, region, gender, date_of_birth')
      .eq('id', userId)
      .maybeSingle();
    setProfile(profileData);

    const { data: postsData } = await supabase
      .from('videos')
      .select('id, video_url, thumbnail_url, caption, likes_count, comments_count, shares_count')
      .eq('user_id', userId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });
    setPosts(postsData || []);

    if (currentUserId) {
      const ids = (postsData || []).map((p) => p.id);
      if (ids.length > 0) {
        const { data: myLikes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', ids);
        setLikedIds(new Set((myLikes || []).map((l) => l.post_id)));
      }

      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!followData);

      const { data: followBackData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('following_id', currentUserId)
        .maybeSingle();
      setIsFollowedBack(!!followBackData);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!isOpen || !userId) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === userId) return;

    setIsFollowBusy(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    const { error } = await supabase.rpc('toggle_follow', { p_following_id: userId });
    if (error) setIsFollowing(wasFollowing);
    setIsFollowBusy(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    const isLiked = likedIds.has(postId);

    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p))
    );

    const { error } = await supabase.rpc('toggle_like', { p_post_id: postId });
    if (error) fetchAll();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0E12] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0E0E12]/90 backdrop-blur border-b border-white/5">
        <h2 className="font-black text-sm text-white">الملف الشخصي</h2>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
        </div>
      ) : !profile ? (
        <p className="text-center text-xs text-gray-500 py-24">تعذر إيجاد هذا المستخدم</p>
      ) : (
        <div className="px-4 pt-6 pb-10">
          <div className="flex flex-col items-center text-center mb-5">
            <AvatarFrame
              xp={Math.max(supporterXp, receiverXp)}
              kind={supporterXp >= receiverXp ? 'supporter' : 'receiver'}
              size={90}
            >
              <JixStoryRing
                userId={userId}
                currentUserId={currentUserId}
                size={90}
                userName={profile.full_name || profile.handle || 'مستخدم JIX'}
                avatarUrl={profile.avatar_url}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-2xl font-black overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    (profile.full_name || profile.handle || 'م')[0]
                  )}
                </div>
              </JixStoryRing>
            </AvatarFrame>

            <p className="font-black text-lg text-white mt-3">
              {profile.full_name || profile.handle || 'مستخدم JIX'}
            </p>

            {profile.region && (
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <MapPin className="w-3 h-3" /> {profile.region}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2.5">
              <LevelBadge xp={supporterXp} kind="supporter" size="md" />
              <LevelBadge xp={receiverXp} kind="receiver" size="md" />
              {profile.gender && profile.date_of_birth && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full font-black px-2.5 py-1 text-xs text-white"
                  style={{ background: 'linear-gradient(135deg, #FF7A1A, #8B5CF6)' }}
                >
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>
                    {profile.gender === 'male' ? '♂' : '♀'}
                  </span>
                  <span className="w-px h-2.5 bg-white/40" />
                  {calculateAge(profile.date_of_birth)}
                </span>
              )}
            </div>

            <JixProfileStats
              userId={userId}
              refreshKey={isFollowing ? 1 : 0}
              onOpenProfile={onOpenProfile}
            />

            {currentUserId && currentUserId !== userId && (
              <button
                onClick={handleFollow}
                disabled={isFollowBusy}
                className={`mt-4 px-6 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 disabled:opacity-50 ${
                  isFollowing ? 'bg-white/5 text-white' : 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white'
                }`}
              >
                {isFollowing && isFollowedBack ? (
                  <Users className="w-4 h-4" />
                ) : isFollowing ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isFollowing && isFollowedBack
                  ? 'أصدقاء'
                  : isFollowing
                  ? 'متابَع'
                  : isFollowedBack
                  ? 'رد المتابعة'
                  : 'متابعة'}
              </button>
            )}

            {/* زر رسالة - يظهر بس للأصدقاء، وأزرار الاتصال موجودة داخل المحادثة نفسها */}
            {currentUserId && currentUserId !== userId && isFollowing && isFollowedBack && (
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={() => onOpenChat?.(userId, profile.full_name || profile.handle || 'مستخدم JIX')}
                  className="px-5 py-2 rounded-2xl bg-white/5 text-white text-xs font-black flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" /> رسالة
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-bold text-gray-400 mb-3">المنشورات ({posts.length})</p>

            {posts.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-10">لا توجد منشورات بعد</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post, index) => (
                  <button
                    key={post.id}
                    onClick={() => setViewingIndex(index)}
                    className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden"
                  >
                    {isImagePost(post) ? (
                      <img src={post.video_url} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <video src={post.video_url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </>
                    )}
                    <span className="absolute bottom-1 right-1.5 flex items-center gap-0.5 text-[9px] font-bold text-white drop-shadow">
                      <Heart className="w-2.5 h-2.5" /> {post.likes_count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* عارض المنشور الكامل - يفتح فوق كل شي، بنفس تجربة الصفحة الرئيسية */}
      {viewingIndex !== null && posts[viewingIndex] && (
        <div className="fixed inset-0 z-[60] bg-black">
          <div className="absolute inset-0 flex items-center justify-center">
            {(() => {
              const post = posts[viewingIndex];
              return isImagePost(post) ? (
                <img src={post.video_url} className="w-full h-full object-cover" />
              ) : (
                <video
                  src={post.video_url}
                  loop
                  autoPlay
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                  onClick={() => setIsMuted((m) => !m)}
                />
              );
            })()}
          </div>

          <button
            onClick={() => setViewingIndex(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {!isImagePost(posts[viewingIndex]) && (
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          )}

          <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 z-10">
            <button onClick={() => handleLike(posts[viewingIndex].id)} className="flex flex-col items-center gap-1">
              <Heart
                className={`w-7 h-7 ${
                  likedIds.has(posts[viewingIndex].id) ? 'fill-[#FF3B5C] text-[#FF3B5C]' : 'text-white'
                }`}
              />
              <span className="text-[10px] font-bold text-white">{posts[viewingIndex].likes_count}</span>
            </button>

            <button
              onClick={() => setActiveCommentsPostId(posts[viewingIndex].id)}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-[10px] font-bold text-white">{posts[viewingIndex].comments_count}</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
              <span className="text-[10px] font-bold text-white">{posts[viewingIndex].shares_count}</span>
            </button>
          </div>

          {posts[viewingIndex].caption && (
            <div className="absolute bottom-6 left-4 right-16 z-10">
              <p className="text-xs text-gray-200">{posts[viewingIndex].caption}</p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>
      )}

      {activeCommentsPostId && (
        <JixComments
          isOpen={!!activeCommentsPostId}
          onClose={() => {
            setActiveCommentsPostId(null);
            fetchAll();
          }}
          postId={activeCommentsPostId}
        />
      )}
    </div>
  );
};
