import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from './supabaseClient';

interface LiveCommentMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
}

interface JixLiveCommentsProps {
  channelName: string; // نفس اسم قناة البث (channel_name) - يوحّد الناشر والمشاهدين بقناة واحدة
  currentUserId: string | null;
  currentUserName: string;
  onOpenProfile?: (userId: string) => void;
}

// أقصى عدد رسائل نحتفظ فيها بالذاكرة - يحمي من الزحمة بالبثوث الطويلة
const MAX_MESSAGES = 100;
// أقصى عدد أحرف بالتعليق الواحد - يمنع رسائل طويلة تكسر التصميم أو تُستخدم للسبام
const MAX_CHARS = 150;

export const JixLiveComments: React.FC<JixLiveCommentsProps> = ({
  channelName,
  currentUserId,
  currentUserName,
  onOpenProfile,
}) => {
  const [messages, setMessages] = useState<LiveCommentMsg[]>([]);
  const [input, setInput] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSentTextRef = useRef<string>('');

  useEffect(() => {
    // قناة بث مباشر (Broadcast) - ما تخزن أي شي بقاعدة البيانات نهائيًا، فقط توصل الرسائل للمتصلين حاليًا.
    // الرسائل تبقى بذاكرة الشاشة طول ما البث مفتوح، وتختفي تلقائيًا فقط لما تُغلق شاشة البث (unmount)
    const channel = supabase.channel(`live_comments_${channelName}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'comment' }, (payload) => {
        const msg = payload.payload as LiveCommentMsg;
        setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), msg]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  // تمرير تلقائي لآخر رسالة كل ما توصل رسالة جديدة
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !currentUserId || !channelRef.current) return;

    const trimmedText = input.trim().slice(0, MAX_CHARS);

    // منع إرسال نفس الرسالة مرتين متتاليتين من نفس الشخص (حماية من السبام)
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

  return (
    <>
      {/* قائمة تعليقات مستمرة - تبقى ظاهرة طول ما البث مفتوح، تختفي فقط لما تُغلق الشاشة. نسيب مساحة يمين لزر الهدية */}
      <div
        ref={listRef}
        className="absolute bottom-24 left-3 right-20 top-16 z-10 flex flex-col gap-1.5 overflow-y-auto pointer-events-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="mt-auto flex flex-col gap-1.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-black/50 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[90%] w-fit"
            >
              <button
                onClick={() => onOpenProfile?.(msg.senderId)}
                className="text-[11px] font-black text-[#F5B93E]"
              >
                {msg.senderName}:{' '}
              </button>
              <span className="text-[11px] text-white">{msg.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* صندوق كتابة التعليق - نوقفه قبل زر الهدية (يمين) عشان ما يغطيه */}
      {currentUserId && (
        <div className="absolute bottom-6 left-3 right-20 z-10">
          {duplicateWarning && (
            <p className="text-[10px] text-red-400 font-bold mb-1 px-1">
              لا يمكنك إرسال نفس التعليق مرتين متتاليتين
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب تعليق..."
              maxLength={MAX_CHARS}
              className="flex-1 px-4 py-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full text-white text-xs placeholder:text-gray-400 outline-none focus:border-[#8B5CF6]"
            />
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
    </>
  );
};
