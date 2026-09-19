import React, { useEffect, useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

interface JixCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

interface CommentRow {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: { handle: string | null; full_name: string | null; avatar_url: string | null } | null;
}

export const JixComments: React.FC<JixCommentsProps> = ({ isOpen, onClose, postId }) => {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black shrink-0">
                  {(c.profiles?.full_name || c.profiles?.handle || 'م')[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-300">
                    {c.profiles?.full_name || c.profiles?.handle || 'مستخدم JIX'}
                  </p>
                  <p className="text-sm text-white mt-0.5">{c.comment_text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {error && <p className="px-5 pb-1 text-[10px] text-red-400 text-center">{error}</p>}

        <div className="p-4 border-t border-gray-800 flex items-center gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب تعليق..."
            className="flex-1 px-4 py-2.5 bg-[#171923] border border-gray-800 rounded-full text-white text-sm focus:border-[#8B5CF6] outline-none"
          />
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
