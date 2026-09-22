import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Send } from 'lucide-react';
import { supabase } from './supabaseClient';

// ============================================================
// الستوري بطريقة تيك توك: ما فيه شريط بالصفحة الرئيسية،
// بدلها حلقة ملونة حول صورة البروفايل لما يكون عند الشخص ستوري،
// تضغط على الصورة تنفتح الستوري.
// ============================================================

interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
}

interface JixStoryRingProps {
  userId: string;
  currentUserId: string | null;
  size: number; // قطر الصورة نفسها بالبكسل
  userName: string;
  avatarUrl: string | null;
  // لو موجود: يظهر زر + صغير لإضافة ستوري (بروفايلك أنت بس)
  onAddStory?: () => void;
  refreshKey?: number;
  children: React.ReactNode;
}

const STORY_DURATION_MS = 5000;
const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const JixStoryRing: React.FC<JixStoryRingProps> = ({
  userId,
  currentUserId,
  size,
  userName,
  avatarUrl,
  onAddStory,
  refreshKey = 0,
  children,
}) => {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const since = new Date(Date.now() - STORY_LIFETIME_MS).toISOString();
    supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .then(({ data }) => setStories((data as StoryRow[]) || []));
  }, [userId, refreshKey]);

  const hasStories = stories.length > 0;
  const ringGap = 5;

  return (
    <>
      <div className="relative" style={{ width: size, height: size }}>
        {/* الحلقة الملونة - بس لو فيه ستوري */}
        {hasStories && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -ringGap,
              padding: 3,
              background: 'linear-gradient(135deg, #FF7A1A, #8B5CF6)',
              WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        )}

        {children}

        {/* منطقة الضغط لفتح الستوري - تغطي وسط الصورة بس، عشان زر الكاميرا بالزاوية يظل شغال */}
        {hasStories && (
          <button
            onClick={() => setIsViewerOpen(true)}
            className="absolute rounded-full"
            style={{ inset: '15%' }}
            aria-label="عرض الستوري"
          />
        )}

        {onAddStory && (
          <button
            onClick={onAddStory}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] border-2 border-[#0E0E12] flex items-center justify-center z-10"
            aria-label="إضافة ستوري"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {isViewerOpen && hasStories && (
        <StoryViewer
          stories={stories}
          ownerId={userId}
          ownerName={userName}
          ownerAvatar={avatarUrl}
          currentUserId={currentUserId}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
};

interface StoryViewerProps {
  stories: StoryRow[];
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  currentUserId: string | null;
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  ownerId,
  ownerName,
  ownerAvatar,
  currentUserId,
  onClose,
}) => {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const story = stories[index];

  useEffect(() => {
    if (story) supabase.rpc('view_story', { p_story_id: story.id });
  }, [story?.id]);

  const goNext = () => {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    startRef.current = Date.now();
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - startRef.current) / STORY_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) goNext();
      else timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentUserId) return;
    const { data: conversationId, error } = await supabase.rpc('get_or_create_dm_conversation', {
      p_other_user_id: ownerId,
    });
    if (error || !conversationId) {
      // نظام الأصدقاء: الرد على الستوري = رسالة، فيحتاج متابعة متبادلة
      setReplyStatus(error?.message || 'تعذر إرسال الرد');
      return;
    }
    await supabase.rpc('send_dm_message', {
      p_conversation_id: conversationId,
      p_message_text: `رد على قصتك: ${replyText.trim()}`,
    });
    setReplyText('');
    setReplyStatus('تم الإرسال ✓');
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <div className="absolute top-3 inset-x-3 z-10 flex gap-1" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        {stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-7 inset-x-3 z-10 flex items-center gap-2" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black text-white">
          {ownerAvatar ? <img src={ownerAvatar} className="w-full h-full object-cover" /> : ownerName[0]}
        </div>
        <span className="text-xs font-bold text-white">{ownerName}</span>
        <button onClick={onClose} className="mr-auto p-1.5 rounded-full bg-black/40">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {story.media_type === 'video' ? (
          <video key={story.id} src={story.media_url} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <img key={story.id} src={story.media_url} className="w-full h-full object-cover" />
        )}
      </div>

      <button onClick={goPrev} className="absolute top-0 right-0 w-1/3 h-full" />
      <button onClick={goNext} className="absolute top-0 left-0 w-1/3 h-full" />

      {ownerId !== currentUserId && currentUserId && (
        <div className="absolute bottom-6 inset-x-3 z-10" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {replyStatus && <p className="text-[10px] text-white/80 text-center mb-1.5">{replyStatus}</p>}
          <div className="flex items-center gap-2">
            <input
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                setReplyStatus(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              placeholder="رد على القصة..."
              className="flex-1 px-4 py-2.5 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full text-white text-xs outline-none focus:border-[#8B5CF6]"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
