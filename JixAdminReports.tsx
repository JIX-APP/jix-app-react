import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, ShieldAlert, Trash2, Ban, Clock, XCircle, RotateCcw, Flag } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';

// ============================================================
// لوحة البلاغات - لصاحب التطبيق فقط
// الحماية الحقيقية بقاعدة البيانات (admin_list_reports) والدالة (admin-moderate):
// لو أحد غيرك فتح الشاشة بطريقة ما، ما راح يشوف ولا يقدر يسوي شي
// ============================================================

interface ReportRow {
  id: string;
  target_type: 'post' | 'comment' | 'user' | 'live_stream';
  target_id: string;
  target_owner_id: string | null;
  owner_name: string | null;
  owner_avatar: string | null;
  reporter_name: string | null;
  reason: string;
  details: string | null;
  target_snapshot: string | null;
  status: 'pending' | 'dismissed' | 'actioned';
  action_taken: string | null;
  created_at: string;
  reviewed_at: string | null;
  pending_on_target: number;
  target_exists: boolean;
  owner_suspended_until: string | null;
  owner_banned: boolean;
}

type Tab = 'pending' | 'closed';
type Action = 'dismiss' | 'delete_content' | 'suspend' | 'ban' | 'unsuspend';

const PAGE_SIZE = 30;
const SUSPEND_DAYS = [1, 3, 7, 30];

interface JixAdminReportsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
}

export const JixAdminReports: React.FC<JixAdminReportsProps> = ({ isOpen, onClose, onOpenProfile }) => {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>('pending');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendPickerFor, setSuspendPickerFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (append = false, before?: string) => {
      setIsLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('admin_list_reports', {
        p_status: tab,
        p_limit: PAGE_SIZE,
        p_before: before ?? null,
      });
      setIsLoading(false);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      const rows = (data as ReportRow[]) ?? [];
      setReports((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    },
    [tab]
  );

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const tr = (key: string, fallback: string, vars?: Record<string, string | number>) => {
    const text = t(key, vars);
    return text === key ? fallback : text;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });

  const runAction = async (report: ReportRow, action: Action, days?: number) => {
    if (action === 'delete_content' && !window.confirm(t('admin_confirm_delete'))) return;
    if (action === 'ban' && !window.confirm(t('admin_confirm_ban'))) return;

    setBusyId(report.id);
    setSuspendPickerFor(null);
    setError(null);

    const body =
      action === 'unsuspend'
        ? { action, user_id: report.target_owner_id }
        : { action, report_id: report.id, days };

    const { data, error: fnError } = await supabase.functions.invoke('admin-moderate', { body });

    let reason: string | null = null;
    if (fnError) {
      try {
        reason = (await (fnError as any).context?.json())?.reason ?? fnError.message;
      } catch {
        reason = fnError.message;
      }
    } else if (!data?.ok) {
      reason = data?.reason ?? 'unknown';
    }

    setBusyId(null);
    if (reason) {
      setError(t('admin_action_failed', { reason }));
      return;
    }
    await load();
  };

  const actionLabel = (actionTaken: string | null) => {
    if (!actionTaken) return '';
    if (actionTaken === 'dismissed') return t('admin_done_dismissed');
    if (actionTaken === 'deleted_content') return t('admin_done_deleted');
    if (actionTaken === 'banned') return t('admin_done_banned');
    const m = actionTaken.match(/^suspended_(\d+)d$/);
    if (m) return t('admin_done_suspended', { n: m[1] });
    return actionTaken;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[45] bg-[#0E0E12] flex flex-col">
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#FF7A1A]" />
          <h2 className="font-black text-sm text-white">{t('admin_panel')}</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="shrink-0 flex gap-1 p-1 mx-4 mt-3 bg-white/5 rounded-2xl">
        {(['pending', 'closed'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === key ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'text-gray-400'
            }`}
          >
            {t(key === 'pending' ? 'admin_tab_pending' : 'admin_tab_closed')}
          </button>
        ))}
      </div>

      {error && <p className="shrink-0 mx-4 mt-3 text-xs text-red-400 text-center">{error}</p>}

      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {isLoading && reports.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-20">
            {t(tab === 'pending' ? 'admin_empty_pending' : 'admin_empty_closed')}
          </p>
        ) : (
          reports.map((r) => {
            const isBusy = busyId === r.id;
            const isSuspended = r.owner_banned || !!r.owner_suspended_until;
            return (
              <div key={r.id} className="bg-white/[0.04] border border-white/5 rounded-2xl p-4">
                {/* السبب ونوع المحتوى */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">
                      {tr(`report_reason_${r.reason}`, r.reason)}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {t(`admin_type_${r.target_type}`)} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  {r.status === 'pending' && r.pending_on_target > 1 && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 text-red-300 text-[10px] font-bold">
                      <Flag className="w-3 h-3" />
                      {r.pending_on_target}
                    </span>
                  )}
                </div>

                {/* صاحب المحتوى */}
                {r.target_owner_id && (
                  <button
                    onClick={() => onOpenProfile?.(r.target_owner_id!)}
                    className="flex items-center gap-2 mb-3 max-w-full"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] overflow-hidden flex items-center justify-center text-[10px] font-black shrink-0">
                      {r.owner_avatar ? (
                        <img src={r.owner_avatar} className="w-full h-full object-cover" />
                      ) : (
                        (r.owner_name || '?')[0]
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-200 truncate">{r.owner_name || t('user_default')}</span>
                    {isSuspended && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                        {r.owner_banned
                          ? t('admin_banned')
                          : t('admin_suspended_until', { date: formatDate(r.owner_suspended_until!) })}
                      </span>
                    )}
                  </button>
                )}

                {/* نسخة المحتوى وقت البلاغ */}
                {r.target_snapshot && r.target_type !== 'user' && (
                  <p className="text-xs text-gray-300 bg-black/30 rounded-xl px-3 py-2 mb-3 break-words whitespace-pre-wrap">
                    {r.target_snapshot}
                  </p>
                )}
                {!r.target_exists && r.target_type !== 'user' && (
                  <p className="text-[11px] text-gray-500 mb-3">{t('admin_content_gone')}</p>
                )}

                {r.details && (
                  <p className="text-xs text-gray-400 mb-3 break-words">
                    <span className="text-gray-500">{t('admin_reporter_note')} </span>
                    {r.details}
                  </p>
                )}

                <p className="text-[11px] text-gray-500 mb-3">
                  {t('admin_reported_by', { name: r.reporter_name || t('user_default') })}
                </p>

                {r.status === 'pending' ? (
                  isBusy ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
                    </div>
                  ) : suspendPickerFor === r.id ? (
                    <div>
                      <p className="text-[11px] text-gray-400 mb-2">{t('admin_suspend_length')}</p>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {SUSPEND_DAYS.map((d) => (
                          <button
                            key={d}
                            onClick={() => runAction(r, 'suspend', d)}
                            className="py-2 rounded-xl bg-amber-500/15 text-amber-200 text-xs font-bold"
                          >
                            {t('admin_days', { n: d })}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setSuspendPickerFor(null)} className="w-full py-1.5 text-xs text-gray-500">
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        icon={<XCircle className="w-3.5 h-3.5" />}
                        label={t('admin_action_dismiss')}
                        className="bg-white/5 text-gray-300"
                        onClick={() => runAction(r, 'dismiss')}
                      />
                      {r.target_type !== 'user' && r.target_exists && (
                        <ActionButton
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          label={t('admin_action_delete')}
                          className="bg-red-500/10 text-red-300 border border-red-500/30"
                          onClick={() => runAction(r, 'delete_content')}
                        />
                      )}
                      {r.target_owner_id && !r.owner_banned && (
                        <ActionButton
                          icon={<Clock className="w-3.5 h-3.5" />}
                          label={t('admin_action_suspend')}
                          className="bg-amber-500/10 text-amber-200"
                          onClick={() => setSuspendPickerFor(r.id)}
                        />
                      )}
                      {r.target_owner_id && !r.owner_banned && (
                        <ActionButton
                          icon={<Ban className="w-3.5 h-3.5" />}
                          label={t('admin_action_ban')}
                          className="bg-red-600 text-white"
                          onClick={() => runAction(r, 'ban')}
                        />
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold ${
                        r.status === 'dismissed' ? 'text-gray-400' : 'text-emerald-300'
                      }`}
                    >
                      {actionLabel(r.action_taken)}
                    </span>
                    {isSuspended && r.target_owner_id && (
                      isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                      ) : (
                        <button
                          onClick={() => runAction(r, 'unsuspend')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 text-xs font-bold text-gray-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {t('admin_action_unsuspend')}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {hasMore && !isLoading && (
          <button
            onClick={() => load(true, reports[reports.length - 1]?.created_at)}
            className="w-full py-3 text-xs font-bold text-gray-400"
          >
            {t('admin_load_more')}
          </button>
        )}
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; className: string; onClick: () => void }> = ({
  icon,
  label,
  className,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold ${className}`}
  >
    {icon}
    {label}
  </button>
);
