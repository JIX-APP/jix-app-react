import React, { useEffect, useRef, useState } from 'react';
import { Send, MoreVertical, VolumeX, Clock, Ban, Mic, MicOff } from 'lucide-react';
import { supabase } from './supabaseClient';
import { JixMvpBadge, useLiveMvpTiers } from './JixMvpBadge';
import { useI18n } from './JixLanguage';

// يحسب ارتفاع لوحة المفاتيح الحالي عشان نرفع شريط كتابة التعليق فوقها
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(offset);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    handler();
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);
  return inset;
}

interface LiveCommentMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
}

interface ModerationEvent {
  action: 'mute' | 'kick_temp' | 'kick_permanent';
  targetUserId: string;
}

interface JixLiveCommentsProps {
  channelName: string;
  liveId: string;
  hostId: string;
  currentUserId: string | null;
  currentUserName: string;
  isHost: boolean;
  isModerator: boolean;
  onOpenProfile?: (userId: string) => void;
  onKicked?: (permanent: boolean) => void;
  // للمذيع: زر المايك داخل مربع التعليق (مثل تيك توك)
  micMuted?: boolean;
  onToggleMic?: () => void;
}

const MAX_MESSAGES = 100;
const MAX_CHARS = 150;

export const JixLiveComments: React.FC<JixLiveCommentsProps> = ({
  channelName,
  liveId,
  hostId,
  currentUserId,
  currentUserName,
  isHost,
  isModerator,
  onOpenProfile,
  onKicked,
  micMuted = false,
  onToggleMic,
}) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<LiveCommentMsg[]>([]);
  const [input, setInput] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);
  const [isMutedNotice, setIsMutedNotice] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSentTextRef = useRef<string>('');

  const canModerate = isHost || isModerator;
  const keyboardInset = useKeyboardInset();
  const mvpTiers = useLiveMvpTiers(liveId);

  useEffect(() => {
    const channel = supabase.channel(`live_comments_${channelName}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'comment' }, (payload) => {
        const msg = payload.payload as LiveCommentMsg;
        if (mutedUserIds.has(msg.senderId)) return;
        setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), msg]);
      })
      .on('broadcast', { event: 'moderation' }, (payload) => {
        const evt = payload.payload as ModerationEvent;

        if (evt.action === 'mute') {
          setMutedUserIds((prev) => new Set(prev).add(evt.targetUserId));
          setMessages((prev) => prev.filter((m) => m.senderId !== evt.targetUserId));
          if (evt.targetUserId === currentUserId) {
            setIsMutedNotice(true);
          }
        }

        if ((evt.action === 'kick_temp' || evt.action === 'kick_permanent') && evt.targetUserId === currentUserId && !isHost) {
          onKicked?.(evt.action === 'kick_permanent');
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !currentUserId || !channelRef.current) return;
    if (mutedUserIds.has(currentUserId)) return;

    const trimmedText = input.trim().slice(0, MAX_CHARS);

    if (trimmedText === lastSentTextRef.current) {
      setDuplicateWarning(true);
      setTimeout(() => setDuplicateWarning(false), 2000);
      return;
    }

    const msg: LiveCommentMsg = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: currentUserName,
      text: trimmedText,
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'comment',
      payload: msg,
    });

    lastSentTextRef.current = trimmedText;
    setInput('');
  };

  const broadcastModeration = (evt: ModerationEvent) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'moderation',
      payload: evt,
    });

    if (evt.action === 'mute') {
      setMutedUserIds((prev) => new Set(prev).add(evt.targetUserId));
      setMessages((prev) => prev.filter((m) => m.senderId !== evt.targetUserId));
    }
  };

  const handleMute = async (targetUserId: string) => {
    setOpenActionsFor(null);
    const { error } = await supabase.rpc('mute_stream_user', {
      p_live_id: liveId,
      p_host_id: hostId,
      p_target_user_id: targetUserId,
    });
    if (!error) {
      broadcastModeration({ action: 'mute', targetUserId });
    }
  };

  const handleKickTemp = async (targetUserId: string) => {
    setOpenActionsFor(null);
    const { error } = await supabase.rpc('kick_stream_user_temp', {
      p_live_id: liveId,
      p_host_id: hostId,
      p_target_user_id: targetUserId,
    });
    if (!error) {
      broadcastModeration({ action: 'kick_temp', targetUserId });
    }
  };

  const handleKickPermanent = async (targetUserId: string) => {
    setOpenActionsFor(null);
    const { error } = await supabase.rpc('kick_stream_user_permanent', {
      p_live_id: liveId,
      p_host_id: hostId,
      p_target_user_id: targetUserId,
    });
    if (!error) {
      broadcastModeration({ action: 'kick_permanent', targetUserId });
    }
  };

  return (
    <>
      {isMutedNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-600/90 text-white text-[11px] font-bold px-4 py-2 rounded-full">
          {t('muted_by_admin')}
        </div>
      )}

      <div
        ref={listRef}
        className="absolute bottom-24 left-3 right-20 top-[45%] z-10 flex flex-col gap-1.5 overflow-y-auto pointer-events-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="mt-auto flex flex-col gap-1.5">
          {messages.map((msg) => (
            <div key={msg.id} className="relative flex items-start gap-1">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[85%] w-fit flex items-center gap-1.5">
                {mvpTiers[msg.senderId] && (
                  <JixMvpBadge
                    tier={mvpTiers[msg.senderId].tier}
                    avatarUrl={mvpTiers[msg.senderId].avatarUrl}
                    fallbackLetter={msg.senderName[0]}
                    size={20}
                    onClick={() => onOpenProfile?.(msg.senderId)}
                  />
                )}
                <div>
                  <button
                    onClick={() => onOpenProfile?.(msg.senderId)}
                    className="text-[11px] font-black text-[#F5B93E]"
                  >
                    {msg.senderName}:{' '}
                  </button>
                  <span className="text-[11px] text-white">{msg.text}</span>
                </div>
              </div>

              {canModerate && msg.senderId !== currentUserId && (
                <button
                  onClick={() => setOpenActionsFor(openActionsFor === msg.id ? null : msg.id)}
                  className="w-5 h-5 mt-1 rounded-full bg-black/40 flex items-center justify-center shrink-0"
                >
                  <MoreVertical className="w-3 h-3 text-gray-300" />
                </button>
              )}

              {openActionsFor === msg.id && (
                <div className="absolute top-full right-0 mt-1 bg-[#171923] border border-gray-700 rounded-xl overflow-hidden z-20 w-32">
                  <button
                    onClick={() => handleMute(msg.senderId)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-white hover:bg-white/10"
                  >
                    <VolumeX className="w-3 h-3" /> {t('mute')}
                  </button>
                  <button
                    onClick={() => handleKickTemp(msg.senderId)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-orange-400 hover:bg-white/10"
                  >
                    <Clock className="w-3 h-3" /> {t('kick_5min')}
                  </button>
                  {isHost && (
                    <button
                      onClick={() => handleKickPermanent(msg.senderId)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-white/10"
                    >
                      <Ban className="w-3 h-3" /> {t('kick_permanent')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {currentUserId && !mutedUserIds.has(currentUserId) && (
        <div className="absolute left-3 right-20 z-10" style={{ bottom: 24 + keyboardInset }}>
          {duplicateWarning && (
            <p className="text-[10px] text-red-400 font-bold mb-1 px-1">
              {t('duplicate_comment')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('comment_placeholder')}
                maxLength={MAX_CHARS}
                className={`w-full py-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white text-xs placeholder:text-gray-400 outline-none focus:border-[#8B5CF6] ${
                  onToggleMic ? 'ps-4 pe-10' : 'px-4'
                }`}
              />
              {/* زر المايك داخل المربع - يكتم/يفتح صوت المذيع بالبث */}
              {onToggleMic && (
                <button
                  type="button"
                  onClick={onToggleMic}
                  aria-label={micMuted ? t('mic_on') : t('mic_off')}
                  className={`absolute top-1/2 -translate-y-1/2 end-1 w-7 h-7 rounded-full flex items-center justify-center ${
                    micMuted ? 'bg-red-600' : 'bg-white/10'
                  }`}
                >
                  {micMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                </button>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {currentUserId && mutedUserIds.has(currentUserId) && (
        <div className="absolute bottom-6 left-3 right-20 z-10 text-center">
          <p className="text-[10px] text-red-400 font-bold bg-black/40 rounded-full py-2">
            {t('muted_cant_comment')}
          </p>
        </div>
      )}
    </>
  );
};
