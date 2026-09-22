import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Loader2, Mic } from 'lucide-react';
import { supabase } from './supabaseClient';
import { checkText } from './JixModeration';

// دعم إملاء الصوت (تحويل كلام لنص) عبر Web Speech API - غير مدعوم في iOS Safari حاليًا،
// فلو غير متوفر نكتفي بفتح لوحة المفاتيح (اللي فيها زر مايك جاهز من نظام آيفون نفسه)
const SpeechRecognitionCtor: any =
  (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

interface JixCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onOpenProfile?: (userId: string) => void;
}

interface CommentRow {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: { handle: string | null; full_name: string | null; avatar_url: string | null } | null;
}

export const JixComments: React.FC<JixCommentsProps> = ({ isOpen, onClose, postId, onOpenProfile }) => {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchComments();
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('id, comment_text, created_at, user_id, profiles(handle, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    setComments((data as unknown as CommentRow[]) || []);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;

    const textCheck = checkText(newComment);
    if (!textCheck.isClean) {
      setError('التعليق يحتوي على كلمات غير مسموح بها');
      return;
    }

    setError(null);
    setIsSending(true);
    try {
      const { error: rpcError } = await supabase.rpc('add_comment', {
        p_post_id: postId,
        p_comment_text: newComment.trim(),
      });
      if (rpcError) throw rpcError;
      setNewComment('');
      await fetchComments();
    } catch (err) {
      setError((err as Error).message || 'تعذر إرسال التعليق');
    } finally {
      setIsSending(false);
    }
  };

  // زر المايك: يحوّل الكلام لنص مباشرة داخل مربع التعليق (نفس فكرة تيك توك)
  const handleMicPress = () => {
    if (!SpeechRecognitionCtor) {
      // المتصفح ما يدعم تحويل الصوت لنص تلقائيًا (مثلاً iOS Safari) - نفتح لوحة المفاتيح
      // اللي فيها زر مايك إملاء جاهز من نظام الجوال نفسه
      inputRef.current?.focus();
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setNewComment((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => {
    // نوقف الاستماع لو المستخدم سكّر شاشة التعليقات وهو لسه يسجل
    if (!isOpen) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-x border-gray-800 h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-black text-sm">التعليقات ({comments.length})</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10">لسه ما فيه تعليقات، كن أول واحد يعلّق!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <button
                  onClick={() => onOpenProfile?.(c.user_id)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black shrink-0 overflow-hidden"
                >
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    (c.profiles?.full_name || c.profiles?.handle || 'م')[0]
                  )}
                </button>
                <div>
                  <button
                    onClick={() => onOpenProfile?.(c.user_id)}
                    className="text-xs font-bold text-gray-300"
                  >
                    {c.profiles?.full_name || c.profiles?.handle || 'مستخدم JIX'}
                  </button>
                  <p className="text-sm text-white mt-0.5">{c.comment_text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="px-5 pb-1 text-[10px] text-red-400 text-center">{error}</p>}

        <div className="p-4 border-t border-gray-800 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب تعليق..."
              className="w-full pr-4 pl-10 py-2.5 bg-[#171923] border border-gray-800 rounded-full text-white text-sm focus:border-[#8B5CF6] outline-none"
            />
            <button
              type="button"
              onClick={handleMicPress}
              className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition ${
                isListening ? 'bg-red-600 animate-pulse' : 'bg-white/10'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={isSending || !newComment.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
