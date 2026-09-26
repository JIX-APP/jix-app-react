import React, { useEffect, useState } from 'react';
import { EyeOff, Lock, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';

// ============================================================
// الدخول المخفي للبثوث - لمستوى الداعم 21 فما فوق
// المستوى يتحقق منه السيرفر (jix_incognito.sql)، هذا الرقم للعرض فقط
// ============================================================
export const INCOGNITO_MIN_LEVEL = 21;

// هوية المستخدم داخل البث: رقم مؤقت لو كان مخفي، أو رقم حسابه العادي
export const useLiveIdentity = (isOpen: boolean, liveId: string, currentUserId: string | null) => {
  const [state, setState] = useState<{ ready: boolean; alias: string | null }>({ ready: false, alias: null });

  useEffect(() => {
    if (!isOpen || !liveId || !currentUserId) {
      setState({ ready: !currentUserId, alias: null });
      return;
    }
    let cancelled = false;
    setState({ ready: false, alias: null });
    supabase.rpc('get_live_identity', { p_live_id: liveId }).then(({ data }) => {
      if (!cancelled) setState({ ready: true, alias: (data as string | null) ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, liveId, currentUserId]);

  return {
    ready: state.ready,
    isIncognito: !!state.alias,
    identityId: state.alias ?? currentUserId,
  };
};

// زر التشغيل/الإيقاف بصفحة البروفايل
export const JixIncognitoToggle: React.FC = () => {
  const { t } = useI18n();
  const [status, setStatus] = useState<{ enabled: boolean; eligible: boolean } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    supabase.rpc('get_my_incognito').then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setStatus({ enabled: !!row.enabled, eligible: !!row.eligible });
    });
  }, []);

  if (!status) return null;

  const toggle = async () => {
    if (!status.eligible || isBusy) return;
    const next = !status.enabled;
    setIsBusy(true);
    const { error } = await supabase.rpc('set_live_incognito', { p_on: next });
    setIsBusy(false);
    if (!error) setStatus({ ...status, enabled: next });
  };

  return (
    <button
      onClick={toggle}
      disabled={!status.eligible || isBusy}
      className="w-full flex items-center gap-3 px-4 py-3 mt-2 bg-white/5 rounded-2xl text-start disabled:cursor-not-allowed"
    >
      <EyeOff className={`w-4 h-4 shrink-0 ${status.eligible ? 'text-[#8B5CF6]' : 'text-gray-600'}`} />
      <span className="flex-1 min-w-0">
        <span className={`block text-sm ${status.eligible ? 'text-gray-300' : 'text-gray-500'}`}>
          {t('incognito_toggle')}
        </span>
        <span className="block text-[11px] text-gray-500 mt-0.5">
          {status.eligible ? t('incognito_desc') : t('incognito_locked', { n: INCOGNITO_MIN_LEVEL })}
        </span>
      </span>
      {!status.eligible ? (
        <Lock className="w-4 h-4 text-gray-600 shrink-0" />
      ) : isBusy ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6] shrink-0" />
      ) : (
        <span
          className={`w-10 h-6 rounded-full p-0.5 flex shrink-0 transition ${
            status.enabled ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] justify-end' : 'bg-white/15 justify-start'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white" />
        </span>
      )}
    </button>
  );
};
