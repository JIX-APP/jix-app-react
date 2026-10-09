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

type Tab = 'pending' | 'closed' | 'withdrawals';
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
    if (isOpen && tab !== 'withdrawals') load();
  }, [isOpen, load, tab]);

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
        {(['pending', 'closed', 'withdrawals'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === key ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'text-gray-400'
            }`}
          >
            {t(key === 'pending' ? 'admin_tab_pending' : key === 'closed' ? 'admin_tab_closed' : 'admin_tab_withdrawals')}
          </button>
        ))}
      </div>

      {tab === 'withdrawals' ? (
        <WithdrawalsPanel />
      ) : (
      <>
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
      </>
      )}
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


// ============================================================
// طلبات سحب الأرباح - أنت تحوّل المبلغ يدويًا ثم تضغط "تم الدفع"
// ============================================================
interface WithdrawalAdminRow {
  id: string;
  user_id: string;
  user_name: string | null;
  account_number: number | null;
  diamonds: number;
  amount_usd: number;
  method: string;
  account_details: string;
  status: 'pending' | 'paid' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

const WithdrawalsPanel: React.FC = () => {
  const { t, lang } = useI18n();
  const [view, setView] = useState<'pending' | 'done'>('pending');
  const [rows, setRows] = useState<WithdrawalAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data, error: rpcError } = await supabase.rpc('admin_list_withdrawals', { p_status: view });
    setIsLoading(false);
    if (rpcError) setError(rpcError.message);
    setRows((data as WithdrawalAdminRow[]) ?? []);
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const usd = (n: number) => Number(n).toLocaleString(lang, { style: 'currency', currency: 'USD' });
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  // ملف CSV (يفتح في Excel وNumbers): الاسم، رقم الحساب، الطريقة، بيانات الاستلام، المبلغ
  const exportPending = async () => {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s*\n\s*/g, ' ')}"`;
    const header = ['Name', 'JIX ID', 'Method', 'Account details (name + IBAN / email)', 'Amount USD', 'Diamonds', 'Request date'];
    const lines = rows.map((r) =>
      [r.user_name, r.account_number, r.method, r.account_details, Number(r.amount_usd).toFixed(2), r.diamonds, new Date(r.created_at).toISOString().slice(0, 10)]
        .map(cell)
        .join(','),
    );
    const csv = '\ufeff' + [header.map(cell).join(','), ...lines].join('\n');
    const fileName = `jix-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    try {
      const file = new File([csv], fileName, { type: 'text/csv' });
      const nav = navigator as any;
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: fileName });
        setExportMsg(t('admin_withdraw_exported'));
        return;
      }
    } catch (e: any) {
      if (/abort|cancel/i.test(String(e?.name ?? e?.message ?? ''))) return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      setExportMsg(t('admin_withdraw_copied'));
    } catch {
      setExportMsg(null);
    }
  };

  const process = async (row: WithdrawalAdminRow, action: 'paid' | 'rejected') => {
    let note: string | null = null;
    if (action === 'paid' && !window.confirm(t('admin_withdraw_confirm_paid'))) return;
    if (action === 'rejected') {
      note = window.prompt(t('admin_withdraw_note_prompt')) ?? null;
      if (note === null) return;
    }
    setBusyId(row.id);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_process_withdrawal', {
      p_id: row.id,
      p_action: action,
      p_note: note,
    });
    setBusyId(null);
    if (rpcError) setError(t('admin_action_failed', { reason: rpcError.message }));
    else load();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex gap-2">
        {(['pending', 'done'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${view === v ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500'}`}
          >
            {t(v === 'pending' ? 'admin_tab_pending' : 'admin_tab_closed')}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      {/* ملف واحد لكل طلبات السحب المعلّقة - تدفع للجميع دفعة واحدة من Paysera */}
      {view === 'pending' && rows.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={exportPending}
            className="w-full py-2.5 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C4B5FD] text-xs font-black"
          >
            {t('admin_withdraw_export', { n: rows.length, total: usd(rows.reduce((sum, r) => sum + Number(r.amount_usd), 0)) })}
          </button>
          {exportMsg && <p className="text-[11px] text-center text-emerald-300">{exportMsg}</p>}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-xs text-gray-500 py-16">{t('admin_withdraw_empty')}</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="bg-white/[0.04] border border-white/5 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-black text-white">{usd(r.amount_usd)}</p>
                <p className="text-[11px] text-gray-500">
                  {Number(r.diamonds).toLocaleString(lang)} · {new Date(r.created_at).toLocaleString(lang)}
                </p>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-white/5 text-[10px] font-bold text-gray-300">
                {t(`wallet_method_${r.method}`)}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-300">
              {r.user_name || t('user_default')} {r.account_number ? `· ID ${r.account_number}` : ''}
            </p>
            <p className="mt-2 text-xs text-white bg-black/30 rounded-xl px-3 py-2 break-words whitespace-pre-wrap select-all">
              {r.account_details}
            </p>
            {r.admin_note && <p className="mt-2 text-[11px] text-gray-400">{r.admin_note}</p>}

            {r.status === 'pending' ? (
              busyId === r.id ? (
                <div className="flex justify-center pt-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => process(r, 'paid')} className="py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                    {t('admin_withdraw_paid')}
                  </button>
                  <button onClick={() => process(r, 'rejected')} className="py-2.5 rounded-xl bg-red-500/10 text-red-300 border border-red-500/30 text-xs font-bold">
                    {t('admin_withdraw_reject')}
                  </button>
                </div>
              )
            ) : (
              <p className={`mt-3 text-[11px] font-bold ${r.status === 'paid' ? 'text-emerald-300' : 'text-red-300'}`}>
                {t(`wallet_status_${r.status}`)}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
};
