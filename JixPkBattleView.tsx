import React, { useEffect, useRef, useState } from 'react';
import { Swords, Crown } from 'lucide-react';
import { supabase } from './supabaseClient';
import { PKBattle, finishPKBattle } from './JixPK';

interface JixPKBattleViewProps {
  battleId: string;
  hostAName: string;
  hostBName: string;
  onBattleEnded: (winnerName: string | null) => void;
}

export const JixPKBattleView: React.FC<JixPKBattleViewProps> = ({
  battleId,
  hostAName,
  hostBName,
  onBattleEnded,
}) => {
  const [battle, setBattle] = useState<PKBattle | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const hasFinishedRef = useRef(false);

  // تحديث حي لحالة المعركة (النقاط) كل ما يجي تحديث من قاعدة البيانات
  useEffect(() => {
    const channel = supabase
      .channel(`pk_battle_${battleId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pk_battles', filter: `id=eq.${battleId}` },
        (payload) => {
          setBattle(payload.new as PKBattle);
        }
      )
      .subscribe();

    // جلب الحالة الأولية
    supabase
      .from('pk_battles')
      .select('*')
      .eq('id', battleId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBattle(data as PKBattle);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  // العداد التنازلي - يعتمد على started_at الحقيقي من السيرفر عشان يضل مضبوط لكل الأطراف
  useEffect(() => {
    if (!battle?.started_at) return;

    const startedAt = new Date(battle.started_at).getTime();
    const durationMs = battle.duration_seconds * 1000;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        finishPKBattle(battleId).then(() => {
          supabase
            .from('pk_battles')
            .select('*')
            .eq('id', battleId)
            .maybeSingle()
            .then(({ data }) => {
              const finalBattle = data as PKBattle | null;
              if (!finalBattle) {
                onBattleEnded(null);
                return;
              }
              if (finalBattle.winner_id === finalBattle.host_a_id) {
                onBattleEnded(hostAName);
              } else if (finalBattle.winner_id === finalBattle.host_b_id) {
                onBattleEnded(hostBName);
              } else {
                onBattleEnded(null); // تعادل
              }
            });
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [battle?.started_at, battle?.duration_seconds, battleId, hostAName, hostBName, onBattleEnded]);

  if (!battle) return null;

  const scoreA = battle.score_a;
  const scoreB = battle.score_b;
  const total = scoreA + scoreB;
  // نسبة شريط التقدم - لو ما فيه أي نقاط بعد نخليه متعادل 50/50
  const percentA = total === 0 ? 50 : Math.round((scoreA / total) * 100);
  const percentB = 100 - percentA;

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : 0;

  return (
    <div className="absolute top-0 inset-x-0 z-40 px-3 pt-3">
      {/* العداد بالمنتصف */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur px-3 py-1 rounded-full">
          <Swords className="w-3 h-3 text-[#FF3B5C]" />
          <span className="text-xs font-black text-white tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* شريط النقاط المزدوج */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-white shrink-0 w-14 truncate">{hostAName}</span>

        <div className="flex-1 h-3 rounded-full overflow-hidden bg-white/10 flex">
          <div
            className="h-full bg-gradient-to-r from-[#FF7A1A] to-[#FF3B5C] transition-all duration-500"
            style={{ width: `${percentA}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] transition-all duration-500"
            style={{ width: `${percentB}%` }}
          />
        </div>

        <span className="text-[10px] font-black text-white shrink-0 w-14 truncate text-left">{hostBName}</span>
      </div>

      {/* الأرقام تحت الشريط */}
      <div className="flex items-center justify-between mt-0.5 px-1">
        <span className="text-[9px] font-bold text-[#FF7A1A]">{scoreA}</span>
        <span className="text-[9px] font-bold text-[#8B5CF6]">{scoreB}</span>
      </div>
    </div>
  );
};

// شاشة إعلان النتيجة النهائية - تظهر فوق كل شي بعد انتهاء الوقت
interface JixPKResultOverlayProps {
  winnerName: string | null;
  onClose: () => void;
}

export const JixPKResultOverlay: React.FC<JixPKResultOverlayProps> = ({ winnerName, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      {winnerName ? (
        <>
          <Crown className="w-16 h-16 text-[#F5B93E] mb-3" />
          <p className="text-2xl font-black text-white mb-1">{winnerName} فاز!</p>
          <p className="text-xs text-gray-300">انتهت جولة PK</p>
        </>
      ) : (
        <>
          <Swords className="w-14 h-14 text-gray-400 mb-3" />
          <p className="text-xl font-black text-white">تعادل!</p>
        </>
      )}
    </div>
  );
};
