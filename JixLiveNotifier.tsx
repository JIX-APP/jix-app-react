import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useJixPresence } from './JixPresence';

// ============================================================
// لما شخص تتابعه يفتح بث: قاعدة البيانات تسجل إشعار (type = 'live')
// لكل متابعينه، وهنا نستقبله لحظيًا ونعرض شريط فوق الشاشة
// "فلان بدأ بث مباشر" مع زر "شاهد" يدخلك البث مباشرة.
// ============================================================

interface LiveAlert {
  actorId: string;
  name: string;
  avatarUrl: string | null;
}

const ALERT_DURATION_MS = 7000;

export const JixLiveNotifier: React.FC<{ currentUserId: string | null }> = ({ currentUserId }) => {
  const { openLive } = useJixPresence();
  const [alert, setAlert] = useState<LiveAlert | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`live_alerts_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          const row = payload.new as { type: string; actor_id: string };
          if (row.type !== 'live' || !row.actor_id) return;

          const { data: actor } = await supabase
            .from('profiles')
            .select('full_name, handle, avatar_url')
            .eq('id', row.actor_id)
            .maybeSingle();

          setAlert({
            actorId: row.actor_id,
            name: actor?.full_name || actor?.handle || 'مستخدم JIX',
            avatarUrl: actor?.avatar_url ?? null,
          });

          if (hideTimer.current) window.clearTimeout(hideTimer.current);
          hideTimer.current = window.setTimeout(() => setAlert(null), ALERT_DURATION_MS);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [currentUserId]);

  if (!alert) return null;

  return (
    <div
      className="fixed inset-x-3 z-[90] flex items-center gap-3 bg-[#171923]/95 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-2xl"
      style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full p-[2px] bg-[#FF2D55] animate-pulse">
          <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white border-2 border-[#171923]">
            {alert.avatarUrl ? <img src={alert.avatarUrl} className="w-full h-full object-cover" /> : alert.name[0]}
          </div>
        </div>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded bg-[#FF2D55] text-[7px] font-black text-white leading-tight">
          LIVE
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white truncate">{alert.name}</p>
        <p className="text-[11px] text-gray-400">بدأ بث مباشر الآن</p>
      </div>

      <button
        onClick={() => {
          openLive(alert.actorId);
          setAlert(null);
        }}
        className="px-4 py-2 rounded-full bg-[#FF2D55] text-white text-xs font-black shrink-0"
      >
        شاهد
      </button>
      <button onClick={() => setAlert(null)} className="p-1 shrink-0">
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
};
