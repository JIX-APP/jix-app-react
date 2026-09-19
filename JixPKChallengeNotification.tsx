import React, { useEffect, useState } from 'react';
import { Swords, Check, X, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { respondPKChallenge } from './JixPK';

interface IncomingChallenge {
  battleId: string;
  challengerId: string;
  challengerName: string;
}

interface JixPKChallengeNotificationProps {
  currentUserId: string | null;
  onAccepted: (battleId: string) => void;
}

export const JixPKChallengeNotification: React.FC<JixPKChallengeNotificationProps> = ({
  currentUserId,
  onAccepted,
}) => {
  const [incoming, setIncoming] = useState<IncomingChallenge | null>(null);
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    // نستمع لأي معركة جديدة تنضاف وأنا طرف فيها كـ host_b (المتحدَّى)
    const channel = supabase
      .channel(`pk_incoming_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pk_battles',
          filter: `host_b_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; status: string; host_a_id: string };
          if (row.status !== 'pending') return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, handle')
            .eq('id', row.host_a_id)
            .maybeSingle();

          setIncoming({
            battleId: row.id,
            challengerId: row.host_a_id,
            challengerName: profile?.full_name || profile?.handle || 'مذيع',
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
    const result = await respondPKChallenge(incoming.battleId, accept);
    setIsResponding(false);

    if (accept && result.success) {
      onAccepted(incoming.battleId);
    }
    setIncoming(null);
  };

  if (!incoming) return null;

  return (
    <div className="fixed top-20 inset-x-0 z-[70] flex justify-center px-4">
      <div className="w-full max-w-sm bg-[#0f1118] border border-[#FF3B5C]/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#8B5CF6] flex items-center justify-center shrink-0">
          <Swords className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">{incoming.challengerName} يتحداك!</p>
          <p className="text-[10px] text-gray-400">جولة PK لمدة 5 دقائق</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleRespond(false)}
            disabled={isResponding}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => handleRespond(true)}
            disabled={isResponding}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center disabled:opacity-50"
          >
            {isResponding ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
};
