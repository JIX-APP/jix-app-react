import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Send, Loader2, Camera, ArrowRight, Phone, Video, PhoneOff } from 'lucide-react';
import { supabase } from './supabaseClient';
import { compressImage, compressVideo, getVideoDuration, MAX_VIDEO_SECONDS } from './JixMedia';
import { checkText } from './JixModeration';

// ============================================================
// 1) القصص (Stories) - شريط أعلى الصفحة الرئيسية + عارض ملء الشاشة
// ============================================================

interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  profiles: { handle: string | null; full_name: string | null; avatar_url: string | null } | null;
}

interface UserStoryGroup {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stories: StoryRow[];
}

interface JixStoriesProps {
  currentUserId: string | null;
  onOpenUpload: () => void;
}

const STORY_DURATION_MS = 5000;

export const JixStories: React.FC<JixStoriesProps> = ({ currentUserId, onOpenUpload }) => {
  const [groups, setGroups] = useState<UserStoryGroup[]>([]);
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, created_at, profiles(handle, full_name, avatar_url)')
      .order('created_at', { ascending: true });

    const rows = (data as unknown as StoryRow[]) || [];
    const byUser = new Map<string, UserStoryGroup>();

    for (const row of rows) {
      const existing = byUser.get(row.user_id);
      const name = row.profiles?.full_name || row.profiles?.handle || 'مستخدم JIX';
      if (existing) {
        existing.stories.push(row);
      } else {
        byUser.set(row.user_id, {
          userId: row.user_id,
          name,
          avatarUrl: row.profiles?.avatar_url ?? null,
          stories: [row],
        });
      }
    }

    const list = Array.from(byUser.values());
    list.sort((a, b) => (a.userId === currentUserId ? -1 : b.userId === currentUserId ? 1 : 0));
    setGroups(list);
  };

  useEffect(() => {
    fetchStories();
  }, [currentUserId]);

  const openGroup = (index: number) => {
    setOpenGroupIndex(index);
    setStoryIndex(0);
  };

  const closeViewer = () => {
    setOpenGroupIndex(null);
    setStoryIndex(0);
    setProgress(0);
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
  };

  const activeGroup = openGroupIndex !== null ? groups[openGroupIndex] : null;
  const activeStory = activeGroup ? activeGroup.stories[storyIndex] : null;

  useEffect(() => {
    if (!activeStory) return;
    supabase.rpc('view_story', { p_story_id: activeStory.id });
  }, [activeStory?.id]);

  const goNext = () => {
    if (!activeGroup) return;
    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (openGroupIndex !== null && openGroupIndex < groups.length - 1) {
      openGroup(openGroupIndex + 1);
    } else {
      closeViewer();
    }
  };

  const goPrev = () => {
    if (!activeGroup) return;
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (openGroupIndex !== null && openGroupIndex > 0) {
      const prevGroupIndex = openGroupIndex - 1;
      setOpenGroupIndex(prevGroupIndex);
      setStoryIndex(groups[prevGroupIndex].stories.length - 1);
    }
  };

  useEffect(() => {
    if (!activeStory) return;
    setProgress(0);
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStory?.id]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeGroup || !currentUserId) return;
    const { data: conversationId } = await supabase.rpc('get_or_create_dm_conversation', {
      p_other_user_id: activeGroup.userId,
    });
    if (conversationId) {
      await supabase.rpc('send_dm_message', {
        p_conversation_id: conversationId,
        p_message_text: `رد على قصتك: ${replyText.trim()}`,
      });
    }
    setReplyText('');
  };

  return (
    <>
      <div className="flex gap-3 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {currentUserId && (
          <button onClick={onOpenUpload} className="flex flex-col items-center gap-1 shrink-0 w-16">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400 truncate w-full text-center">قصتك</span>
          </button>
        )}

        {groups.map((group, index) => (
          <button
            key={group.userId}
            onClick={() => openGroup(index)}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
          >
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#171923] flex items-center justify-center text-sm font-black text-white border-2 border-[#0E0E12]">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  group.name[0]
                )}
              </div>
            </div>
            <span className="text-[10px] text-gray-300 truncate w-full text-center">{group.name}</span>
          </button>
        ))}
      </div>

      {activeGroup && activeStory && (
        <div className="fixed inset-0 z-[80] bg-black">
          <div className="absolute top-3 inset-x-3 z-10 flex gap-1">
            {activeGroup.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{
                    width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="absolute top-7 inset-x-3 z-10 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black">
              {activeGroup.avatarUrl ? (
                <img src={activeGroup.avatarUrl} className="w-full h-full object-cover" />
              ) : (
                activeGroup.name[0]
              )}
            </div>
            <span className="text-xs font-bold text-white">{activeGroup.name}</span>
            <button onClick={closeViewer} className="mr-auto p-1.5 rounded-full bg-black/40">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {activeStory.media_type === 'video' ? (
              <video
                key={activeStory.id}
                src={activeStory.media_url}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img key={activeStory.id} src={activeStory.media_url} className="w-full h-full object-cover" />
            )}
          </div>

          <button onClick={goPrev} className="absolute top-0 right-0 w-1/3 h-full" />
          <button onClick={goNext} className="absolute top-0 left-0 w-1/3 h-full" />

          {activeGroup.userId !== currentUserId && (
            <div className="absolute bottom-6 inset-x-3 z-10 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
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
          )}
        </div>
      )}
    </>
  );
};

// ============================================================
// 2) رفع قصة جديدة
// ============================================================

interface JixStoryUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const JixStoryUpload: React.FC<JixStoryUploadProps> = ({ isOpen, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type.startsWith('video/')) {
      const duration = await getVideoDuration(selected);
      if (duration > MAX_VIDEO_SECONDS + 1) {
        setError(`الفيديو طويل، الحد الأقصى ${MAX_VIDEO_SECONDS} ثانية`);
        e.target.value = '';
        return;
      }
    }
    setError(null);
    setFile(selected);
    setIsVideo(selected.type.startsWith('video/'));
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const resetAndClose = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('اختر صورة أو فيديو أولاً');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // الضغط أول شي - قبل أي انتظار (الآيفون يحتاجه من ضغطة الزر نفسها)
      const uploadFile = isVideo ? await compressVideo(file) : await compressImage(file);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error('يجب تسجيل الدخول لنشر قصة');

      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `stories/${userId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, uploadFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('stories').insert({
        user_id: userId,
        media_url: publicUrlData.publicUrl,
        media_type: isVideo ? 'video' : 'image',
      });

      if (insertError) throw insertError;

      onUploaded();
      resetAndClose();
    } catch (err) {
      const message = (err as Error).message;
      setError(message === 'VIDEO_TOO_LARGE' ? 'الفيديو كبير جدًا، جرّب فيديو أقصر' : message || 'فشل نشر القصة');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f1118] border border-[#8B5CF6]/30 rounded-3xl p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={resetAndClose} className="absolute top-5 left-5 text-gray-400 hover:text-white p-2 rounded-full bg-white/5">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black text-center mb-5 mt-2">قصة جديدة</h2>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {!previewUrl ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[9/16] rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-3 hover:border-[#8B5CF6] transition mb-4"
          >
            <Camera className="w-10 h-10 text-gray-500" />
            <span className="text-sm text-gray-400">التقط صورة/فيديو أو اختر من المعرض</span>
            <span className="text-[10px] text-gray-600">تختفي القصة تلقائياً بعد 24 ساعة</span>
          </button>
        ) : isVideo ? (
          <video src={previewUrl} controls className="w-full aspect-[9/16] object-cover rounded-2xl mb-4 bg-black" />
        ) : (
          <img src={previewUrl} className="w-full aspect-[9/16] object-cover rounded-2xl mb-4 bg-black" />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {previewUrl && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-4 py-2 text-xs font-bold text-[#8B5CF6] bg-white/5 rounded-xl"
          >
            تغيير الصورة/الفيديو
          </button>
        )}

        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className="w-full py-3.5 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isUploading ? 'جاري النشر...' : 'نشر القصة'}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// 3) قائمة المحادثات الخاصة
// ============================================================

interface ConversationRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_text: string | null;
  last_message_at: string | null;
  otherUser: {
    id: string;
    full_name: string | null;
    handle: string | null;
    avatar_url: string | null;
  } | null;
  unreadCount: number;
}

interface JixDMListProps {
  currentUserId: string;
  onOpenConversation: (conversationId: string, otherUserId: string, otherUserName: string) => void;
}

export const JixDMList: React.FC<JixDMListProps> = ({ currentUserId, onOpenConversation }) => {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = async () => {
    setIsLoading(true);

    const { data } = await supabase
      .from('dm_conversations')
      .select('id, user_a_id, user_b_id, last_message_text, last_message_at')
      .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    const rows = data || [];
    const otherIds = rows.map((r) => (r.user_a_id === currentUserId ? r.user_b_id : r.user_a_id));

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, handle, avatar_url')
      .in('id', otherIds.length > 0 ? otherIds : ['00000000-0000-0000-0000-000000000000']);

    const profilesMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const enriched: ConversationRow[] = await Promise.all(
      rows.map(async (r) => {
        const otherId = r.user_a_id === currentUserId ? r.user_b_id : r.user_a_id;
        const { count } = await supabase
          .from('dm_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', r.id)
          .neq('sender_id', currentUserId)
          .is('read_at', null);

        return {
          ...r,
          otherUser: profilesMap.get(otherId) || null,
          unreadCount: count || 0,
        };
      })
    );

    setConversations(enriched);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel(`dm_list_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return <p className="text-center text-xs text-gray-500 py-16">لا توجد محادثات بعد</p>;
  }

  return (
    <div className="divide-y divide-white/5">
      {conversations.map((c) => {
        const name = c.otherUser?.full_name || c.otherUser?.handle || 'مستخدم JIX';
        const otherId = c.user_a_id === currentUserId ? c.user_b_id : c.user_a_id;
        return (
          <button
            key={c.id}
            onClick={() => onOpenConversation(c.id, otherId, name)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-sm font-black overflow-hidden shrink-0">
              {c.otherUser?.avatar_url ? (
                <img src={c.otherUser.avatar_url} className="w-full h-full object-cover" />
              ) : (
                name[0]
              )}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-sm font-bold text-white truncate">{name}</p>
              <p className="text-xs text-gray-400 truncate">{c.last_message_text || 'ابدأ المحادثة'}</p>
            </div>
            {c.unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF3B5C] flex items-center justify-center text-[10px] font-black text-white shrink-0">
                {c.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================
// 4) شاشة محادثة خاصة واحدة
// ============================================================

interface DmMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
}

interface JixDMConversationProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  onBack: () => void;
  onStartCall: (callType: 'voice' | 'video') => void;
}

export const JixDMConversation: React.FC<JixDMConversationProps> = ({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  onBack,
  onStartCall,
}) => {
  const [messages, setMessages] = useState<DmMessageRow[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('dm_messages')
      .select('id, conversation_id, sender_id, message_text, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    await supabase.rpc('mark_dm_conversation_read', { p_conversation_id: conversationId });
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`dm_conversation_${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as DmMessageRow]);
          if ((payload.new as DmMessageRow).sender_id !== currentUserId) {
            supabase.rpc('mark_dm_conversation_read', { p_conversation_id: conversationId });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    setIsSending(true);
    const text = input.trim();
    setInput('');

    const { error } = await supabase.rpc('send_dm_message', {
      p_conversation_id: conversationId,
      p_message_text: text,
    });

    if (error) {
      setInput(text);
    }
    setIsSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0E0E12] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={onBack} className="p-1.5 rounded-full bg-white/5">
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
        <span className="flex-1 font-black text-sm text-white truncate">{otherUserName}</span>
        <button onClick={() => onStartCall('voice')} className="p-2 rounded-full bg-white/5">
          <Phone className="w-4 h-4 text-white" />
        </button>
        <button onClick={() => onStartCall('video')} className="p-2 rounded-full bg-white/5">
          <Video className="w-4 h-4 text-white" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-white/5 text-white rounded-bl-sm'
                    : 'bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] text-white rounded-br-sm'
                }`}
              >
                <LinkifiedText text={m.message_text} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اكتب رسالة..."
          className="flex-1 px-4 py-2.5 bg-[#171923] border border-gray-800 rounded-full text-white text-sm focus:border-[#8B5CF6] outline-none"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// 5) إشعار مكالمة واردة
// ============================================================

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callType: 'voice' | 'video';
  agoraChannel: string;
}

interface JixDMCallNotificationProps {
  currentUserId: string | null;
  onAccepted: (call: IncomingCall) => void;
}

export const JixDMCallNotification: React.FC<JixDMCallNotificationProps> = ({
  currentUserId,
  onAccepted,
}) => {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`dm_call_incoming_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_calls',
          filter: `callee_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            caller_id: string;
            call_type: 'voice' | 'video';
            agora_channel: string;
            status: string;
          };
          if (row.status !== 'ringing') return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, handle')
            .eq('id', row.caller_id)
            .maybeSingle();

          setIncoming({
            callId: row.id,
            callerId: row.caller_id,
            callerName: profile?.full_name || profile?.handle || 'مستخدم JIX',
            callType: row.call_type,
            agoraChannel: row.agora_channel,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const handleRespond = async (accept: boolean) => {
    if (!incoming) return;
    setIsResponding(true);
    await supabase.rpc('respond_dm_call', { p_call_id: incoming.callId, p_accept: accept });
    setIsResponding(false);

    if (accept) {
      onAccepted(incoming);
    }
    setIncoming(null);
  };

  if (!incoming) return null;

  return (
    <div className="fixed top-20 inset-x-0 z-[85] flex justify-center px-4">
      <div className="w-full max-w-sm bg-[#0f1118] border border-[#8B5CF6]/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center shrink-0">
          {incoming.callType === 'video' ? (
            <Video className="w-5 h-5 text-white" />
          ) : (
            <Phone className="w-5 h-5 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">{incoming.callerName}</p>
          <p className="text-[10px] text-gray-400">
            {incoming.callType === 'video' ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleRespond(false)}
            disabled={isResponding}
            className="w-8 h-8 rounded-full bg-red-600/80 flex items-center justify-center disabled:opacity-50"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => handleRespond(true)}
            disabled={isResponding}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center disabled:opacity-50"
          >
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Phone className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 6) الدردشة العامة
// ============================================================

interface GroupMessageRow {
  id: string;
  user_id: string;
  message_text: string;
  created_at: string;
  profiles: { handle: string | null; full_name: string | null; avatar_url: string | null } | null;
}

interface JixGroupChatProps {
  currentUserId: string | null;
  onOpenProfile?: (userId: string) => void;
}

const MAX_LOADED_MESSAGES = 100;

export const JixGroupChat: React.FC<JixGroupChatProps> = ({ currentUserId, onOpenProfile }) => {
  const [messages, setMessages] = useState<GroupMessageRow[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_chat_messages')
      .select('id, user_id, message_text, created_at, profiles(handle, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(MAX_LOADED_MESSAGES);

    setMessages(((data as unknown as GroupMessageRow[]) || []).reverse());
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('group_chat_global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_chat_messages' },
        async (payload) => {
          const row = payload.new as GroupMessageRow;
          const { data: profile } = await supabase
            .from('profiles')
            .select('handle, full_name, avatar_url')
            .eq('id', row.user_id)
            .maybeSingle();

          setMessages((prev) => [...prev.slice(-(MAX_LOADED_MESSAGES - 1)), { ...row, profiles: profile || null }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentUserId || isSending) return;

    const textCheck = checkText(input);
    if (!textCheck.isClean) {
      setError('رسالتك تحتوي على كلمات غير مسموح بها');
      return;
    }

    setError(null);
    setIsSending(true);
    const text = input.trim();
    setInput('');

    const { error: rpcError } = await supabase.rpc('send_group_chat_message', { p_message_text: text });
    if (rpcError) {
      setInput(text);
      setError('تعذر إرسال الرسالة');
    }
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((m) => {
          const name = m.profiles?.full_name || m.profiles?.handle || 'مستخدم JIX';
          return (
            <div key={m.id} className="flex items-start gap-2.5">
              <button
                onClick={() => onOpenProfile?.(m.user_id)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black shrink-0 overflow-hidden"
              >
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  name[0]
                )}
              </button>
              <div className="bg-white/5 rounded-2xl px-3.5 py-2 max-w-[80%]">
                <button onClick={() => onOpenProfile?.(m.user_id)} className="text-[11px] font-black text-[#F5B93E]">
                  {name}
                </button>
                <p className="text-sm text-white mt-0.5">{m.message_text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="px-4 pb-1 text-[10px] text-red-400 text-center">{error}</p>}

      {currentUserId && (
        <div className="p-3 border-t border-white/5 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="رسالة للجميع..."
            className="flex-1 px-4 py-2.5 bg-[#171923] border border-gray-800 rounded-full text-white text-sm focus:border-[#8B5CF6] outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};

// يحوّل الروابط داخل الرسالة لروابط قابلة للضغط (مثل رابط منشور أو بث شاركه صديق)
// روابط JIX نفسها تنفتح بنفس التطبيق، والروابط الخارجية بصفحة جديدة
const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span className="whitespace-pre-line break-words">
      {parts.map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <React.Fragment key={i}>{part}</React.Fragment>;
        const isInternal = part.startsWith(window.location.origin);
        return (
          <a
            key={i}
            href={part}
            target={isInternal ? undefined : '_blank'}
            rel={isInternal ? undefined : 'noopener noreferrer'}
            className="underline font-bold break-all"
          >
            {isInternal ? (part.includes('?live=') ? 'افتح البث ▶' : 'افتح المنشور ▶') : part}
          </a>
        );
      })}
    </span>
  );
};
