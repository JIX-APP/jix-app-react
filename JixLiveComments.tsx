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
}

export const JixLiveComments: React.FC<JixLiveCommentsProps> = ({
  channelName,
  currentUserId,
  currentUserName,
}) => {
  const [messages, setMessages] = useState<LiveCommentMsg[]>([]);
  const [input, setInput] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // قناة بث مباشر (Broadcast) - ما تخزن أي شي بقاعدة البيانات، فقط توصل الرسائل للمتصلين حاليًا
    const channel = supabase.channel(`live_comments_${channelName}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'comment' }, (payload) => {
        const msg = payload.payload as LiveCommentMsg;
        setMessages((prev) => [...prev.slice(-30), msg]); // نحتفظ بآخر 30 رسالة بالذاكرة بس

        // كل رسالة تختفي تلقائيًا بعد 6 ثواني
        setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        }, 6000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  const handleSend = () => {
    if (!input.trim() || !currentUserId || !channelRef.current) return;

    const msg: LiveCommentMsg = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: currentUserName,
      text: input.trim(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'comment',
      payload: msg,
    });

    setInput('');
  };

  return (
    <>
      {/* فقاعات الكومنتات - تطلع فوق بعض من الأسفل وتختفي تلقائيًا. نسيب مساحة يمين لزر الهدية */}
      <div className="absolute bottom-24 left-3 right-20 z-10 flex flex-col-reverse gap-1.5 pointer-events-none max-h-[45%] overflow-hidden">
        {[...messages].reverse().map((msg) => (
          <div
            key={msg.id}
            className="bg-black/50 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[90%] animate-[fadeIn_0.3s_ease-out]"
          >
            <span className="text-[11px] font-black text-[#F5B93E]">{msg.senderName}: </span>
            <span className="text-[11px] text-white">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* صندوق كتابة التعليق - نوقفه قبل زر الهدية (يمين) عشان ما يغطيه */}
      {currentUserId && (
        <div className="absolute bottom-6 left-3 right-20 z-10 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب تعليق..."
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
      )}
    </>
  );
};
