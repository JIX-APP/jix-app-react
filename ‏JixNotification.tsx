import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Heart, MessageCircle, UserPlus, Gift, Radio, Wallet, Bell } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';

// ============================================================
// الإشعارات: شاشة القائمة + عداد غير المقروء + إعدادات الأنواع
// ============================================================

interface NotificationRow {
  id: string;
  type: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  target_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
}

// عداد غير المقروء + تحديث لحظي لما يوصل إشعار جديد
export const useUnreadNotifications = (userId: string | null | undefined) => {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    const { data } = await supabase.rpc('get_unread_notifications_count');
    setCount(Number(data) || 0);
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!userId) return;
    const channel = supabase
      .channel(`notif_count_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setCount((c) => c + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { count, refresh, clear: () => setCount(0) };
};

const TYPE_STYLE: Record<string, { icon: React.ReactNode; color: string }> = {
  follow: { icon: <UserPlus className="w-3 h-3" />, color: '#38BDF8' },
  like: { icon: <Heart className="w-3 h-3" />, color: '#FF4670' },
  comment: { icon: <MessageCircle className="w-3 h-3" />, color: '#8B5CF6' },
  gift: { icon: <Gift className="w-3 h-3" />, color: '#F5B93E' },
  live: { icon: <Radio className="w-3 h-3" />, color: '#FF2D55' },
  withdrawal: { icon: <Wallet className="w-3 h-3" />, color: '#10B981' },
};

export const JixNotificationsScreen: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenLive: (userId: string) => void;
  onRead?: () => void;
}> = ({ isOpen, onClose, onOpenProfile, onOpenLive, onRead }) => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data } = await supabase.rpc('get_my_notifications', { p_limit: 60 });
      if (cancelled) return;
      setRows((data as NotificationRow[]) ?? []);
      setIsLoading(false);
      await supabase.rpc('mark_notifications_read');
      onRead?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const ago = (iso: string) => {
    const sec = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(sec);
    if (abs < 60) return rtf.format(Math.round(sec), 'second');
    if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
    if (abs < 604800) return rtf.format(Math.round(sec / 86400), 'day');
    return new Date(iso).toLocaleDateString(lang);
  };

  const textFor = (n: NotificationRow) => {
    const name = n.actor_name || t('user_default');
    switch (n.type) {
      case 'follow':
        return t('notif_follow', { name });
      case 'like':
        return t('notif_like', { name });
      case 'comment':
        return t('notif_comment', { name, text: n.message || '' });
      case 'gift':
        return t('notif_gift', { name });
      case 'live':
        return t('notif_live', { name });
      default:
        return n.message || '';
    }
  };

  const openRow = (n: NotificationRow) => {
    if (!n.actor_id) return;
    if (n.type === 'live') onOpenLive(n.actor_id);
    else onOpenProfile(n.actor_id);
  };

  return (
    <div className="fixed inset-0 z-[44] flex justify-center bg-[#0E0E12]">
      <div className="w-full max-w-[430px] h-full flex flex-col">
        <div
          className="shrink-0 flex items-center justify-between px-4 pb-3 border-b border-white/5"
          style={{ paddingTop: 'calc(0.9rem + env(safe-area-inset-top, 0px))' }}
        >
          <button onClick={onClose} className="p-2 rounded-full bg-white/5" aria-label={t('cancel')}>
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="font-black text-sm text-white">{t('notif_title')}</h2>
          <span className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center py-24 px-8 text-center">
              <span className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-gray-500" />
              </span>
              <p className="text-sm font-bold text-white">{t('notif_empty_title')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('notif_empty_body')}</p>
            </div>
          ) : (
            rows.map((n) => {
              const style = TYPE_STYLE[n.type] ?? { icon: <Bell className="w-3 h-3" />, color: '#6B7280' };
              return (
                <button
                  key={n.id}
                  onClick={() => openRow(n)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-start border-b border-white/[0.04] ${
                    n.is_read ? '' : 'bg-[#8B5CF6]/[0.07]'
                  }`}
                >
                  <span className="relative shrink-0">
                    <span className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white">
                      {n.actor_avatar ? (
                        <img src={n.actor_avatar} className="w-full h-full object-cover" />
                      ) : (
                        (n.actor_name || 'J')[0]
                      )}
                    </span>
                    <span
                      className="absolute -bottom-0.5 -end-0.5 w-5 h-5 rounded-full border-2 border-[#0E0E12] flex items-center justify-center text-white"
                      style={{ background: style.color }}
                    >
                      {style.icon}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-white leading-snug line-clamp-2">{textFor(n)}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{ago(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#FF7A1A] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// إعدادات أنواع الإشعارات (تُستخدم داخل الإعدادات)
// ============================================================
const PREF_KEYS = ['follows', 'likes', 'comments', 'gifts', 'lives'] as const;
type PrefKey = (typeof PREF_KEYS)[number];

export const JixNotificationPrefs: React.FC = () => {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean> | null>(null);

  useEffect(() => {
    supabase.rpc('get_my_notification_prefs').then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setPrefs({
        follows: row?.follows ?? true,
        likes: row?.likes ?? true,
        comments: row?.comments ?? true,
        gifts: row?.gifts ?? true,
        lives: row?.lives ?? true,
      });
    });
  }, []);

  if (!prefs) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  const toggle = async (key: PrefKey) => {
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    const { error } = await supabase.rpc('set_notification_pref', { p_key: key, p_enabled: next });
    if (error) setPrefs((p) => (p ? { ...p, [key]: !next } : p));
  };

  return (
    <div className="bg-[#18181F] rounded-2xl overflow-hidden divide-y divide-white/5">
      {PREF_KEYS.map((key) => (
        <button key={key} onClick={() => toggle(key)} className="w-full flex items-center gap-3 px-4 py-3.5 text-start">
          <span className="flex-1 text-sm text-white">{t(`notif_pref_${key}`)}</span>
          <span
            className={`w-10 h-6 rounded-full p-0.5 flex shrink-0 transition ${
              prefs[key] ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] justify-end' : 'bg-white/15 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white" />
          </span>
        </button>
      ))}
    </div>
  );
};
