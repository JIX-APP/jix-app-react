import React, { useCallback, useEffect, useState } from 'react';
import { X, Coins, Gem, Loader2, ArrowLeftRight, Banknote, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';

// ============================================================
// محفظتي - نفس فكرة تيك توك:
// الكوينز للشراء وإرسال الهدايا | الكنوز = أرباح الهدايا المستلمة
// الأسعار والحدود كلها تنحسب بالسيرفر (jix_wallet_rates) - هنا للعرض فقط
// ============================================================

export type WalletTab = 'coins' | 'earnings';

interface WalletInfo {
  coins: number;
  diamonds: number;
  diamond_usd: number;
  diamonds_per_coin: number;
  min_withdraw_diamonds: number;
  pending_withdraw_diamonds: number;
}

interface WithdrawalRow {
  id: string;
  diamonds: number;
  amount_usd: number;
  method: string;
  status: 'pending' | 'paid' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

// باقات الشحن (تتفعّل مع ربط الدفع - لازم تطابق باقات السيرفر وقتها)
const RECHARGE_PACKAGES = [
  { coins: 100, usd: 0.99 },
  { coins: 550, usd: 4.99 },
  { coins: 1150, usd: 9.99 },
  { coins: 6000, usd: 49.99 },
  { coins: 12500, usd: 99.99 },
  { coins: 65000, usd: 499.99 },
];

type Method = 'payoneer' | 'bank' | 'paypal';

export const useMyWallet = (enabled: boolean) => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_wallet');
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setWallet({
        coins: Number(row.coins),
        diamonds: Number(row.diamonds),
        diamond_usd: Number(row.diamond_usd),
        diamonds_per_coin: Number(row.diamonds_per_coin),
        min_withdraw_diamonds: Number(row.min_withdraw_diamonds),
        pending_withdraw_diamonds: Number(row.pending_withdraw_diamonds),
      });
    }
  }, []);
  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);
  return { wallet, refresh };
};

const ERROR_KEYS: Record<string, string> = {
  below_minimum: 'wallet_err_below_minimum',
  insufficient_diamonds: 'wallet_err_insufficient',
  pending_exists: 'wallet_err_pending_exists',
  invalid_details: 'wallet_err_invalid_details',
  amount_too_small: 'wallet_err_too_small',
  account_suspended: 'account_suspended',
};

export const JixWallet: React.FC<{ isOpen: boolean; onClose: () => void; initialTab?: WalletTab }> = ({
  isOpen,
  onClose,
  initialTab = 'coins',
}) => {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<WalletTab>(initialTab);
  const { wallet, refresh } = useMyWallet(isOpen);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [method, setMethod] = useState<Method>('payoneer');
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');

  const loadWithdrawals = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_withdrawals');
    setWithdrawals((data as WithdrawalRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab);
    setMessage(null);
    setShowWithdrawForm(false);
    loadWithdrawals();
  }, [isOpen, initialTab, loadWithdrawals]);

  if (!isOpen) return null;

  const num = (n: number) => n.toLocaleString(lang);
  const usd = (n: number) =>
    n.toLocaleString(lang, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const errorText = (msg: string) => {
    const key = Object.keys(ERROR_KEYS).find((k) => msg.includes(k));
    return t(key ? ERROR_KEYS[key] : 'wallet_err_generic');
  };

  const convertAll = async () => {
    if (!wallet || isBusy) return;
    setIsBusy(true);
    setMessage(null);
    const { data, error } = await supabase.rpc('convert_diamonds_to_coins', { p_diamonds: wallet.diamonds });
    setIsBusy(false);
    if (error) setMessage({ ok: false, text: errorText(error.message) });
    else setMessage({ ok: true, text: t('wallet_converted', { n: num(Number(data)) }) });
    refresh();
  };

  const submitWithdraw = async () => {
    if (!wallet || isBusy) return;
    const diamonds = Math.floor(Number(amount || wallet.diamonds));
    setIsBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('request_withdrawal', {
      p_diamonds: diamonds,
      p_method: method,
      p_details: details,
    });
    setIsBusy(false);
    if (error) {
      setMessage({ ok: false, text: errorText(error.message) });
      return;
    }
    setMessage({ ok: true, text: t('wallet_withdraw_sent') });
    setShowWithdrawForm(false);
    setDetails('');
    setAmount('');
    refresh();
    loadWithdrawals();
  };

  const canWithdraw = !!wallet && wallet.diamonds >= wallet.min_withdraw_diamonds;
  const hasPending = withdrawals.some((w) => w.status === 'pending');

  return (
    <div className="fixed inset-0 z-[70] bg-[#0E0E12] flex flex-col">
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <h2 className="font-black text-sm text-white">{t('wallet_title')}</h2>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/5" aria-label={t('cancel')}>
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="shrink-0 flex gap-1 p-1 mx-4 mt-3 bg-white/5 rounded-2xl">
        {(['coins', 'earnings'] as WalletTab[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === key ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'text-gray-400'
            }`}
          >
            {t(key === 'coins' ? 'wallet_tab_coins' : 'wallet_tab_earnings')}
          </button>
        ))}
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {!wallet ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
          </div>
        ) : tab === 'coins' ? (
          <>
            {/* رصيد الكوينز */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-[#F5B93E]/25 to-[#FF7A1A]/10 border border-[#F5B93E]/20">
              <p className="text-xs text-gray-300">{t('wallet_coin_balance')}</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-black text-white">
                <Coins className="w-7 h-7 text-[#F5B93E]" />
                {num(wallet.coins)}
              </p>
            </div>

            {/* باقات الشحن */}
            <div>
              <p className="text-xs font-bold text-gray-400 mb-2">{t('wallet_recharge')}</p>
              <div className="grid grid-cols-3 gap-2">
                {RECHARGE_PACKAGES.map((p) => (
                  <button
                    key={p.coins}
                    disabled
                    className="relative flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/5 opacity-70"
                  >
                    <Coins className="w-5 h-5 text-[#F5B93E]" />
                    <span className="text-sm font-black text-white">{num(p.coins)}</span>
                    <span className="text-[11px] text-gray-400">{usd(p.usd)}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-gray-500">{t('wallet_recharge_soon')}</p>
            </div>
          </>
        ) : (
          <>
            {/* رصيد الكنوز وقيمتها */}
            <div className="rounded-3xl p-5 bg-gradient-to-br from-[#8B5CF6]/30 to-[#22D3EE]/10 border border-[#8B5CF6]/25">
              <p className="text-xs text-gray-300">{t('wallet_diamonds')}</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-black text-white">
                <Gem className="w-7 h-7 text-[#A78BFA]" />
                {num(wallet.diamonds)}
              </p>
              <p className="mt-2 text-sm text-gray-200">
                {t('wallet_cash_value')}: <span className="font-black">{usd(wallet.diamonds * wallet.diamond_usd)}</span>
              </p>
              {wallet.pending_withdraw_diamonds > 0 && (
                <p className="mt-1 text-[11px] text-amber-300">
                  {t('wallet_pending', { n: num(wallet.pending_withdraw_diamonds) })}
                </p>
              )}
              <p className="mt-3 text-[11px] text-gray-400">{t('wallet_diamonds_hint')}</p>
            </div>

            {message && (
              <p className={`text-xs text-center ${message.ok ? 'text-emerald-300' : 'text-red-400'}`}>{message.text}</p>
            )}

            {/* الخيارين: تحويل أو سحب */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={convertAll}
                disabled={isBusy || wallet.diamonds < wallet.diamonds_per_coin}
                className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-white/5 border border-white/10 disabled:opacity-40"
              >
                <ArrowLeftRight className="w-5 h-5 text-[#F5B93E]" />
                <span className="text-xs font-black text-white">{t('wallet_convert')}</span>
                <span className="text-[10px] text-gray-400">{t('wallet_convert_rate', { n: wallet.diamonds_per_coin })}</span>
              </button>
              <button
                onClick={() => setShowWithdrawForm((v) => !v)}
                disabled={isBusy || !canWithdraw || hasPending}
                className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-white/5 border border-white/10 disabled:opacity-40"
              >
                <Banknote className="w-5 h-5 text-emerald-300" />
                <span className="text-xs font-black text-white">{t('wallet_withdraw')}</span>
                <span className="text-[10px] text-gray-400 text-center px-1">
                  {t('wallet_withdraw_min', {
                    n: num(wallet.min_withdraw_diamonds),
                    usd: usd(wallet.min_withdraw_diamonds * wallet.diamond_usd),
                  })}
                </span>
              </button>
            </div>

            {/* نموذج السحب */}
            {showWithdrawForm && canWithdraw && !hasPending && (
              <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/10 space-y-3">
                <p className="text-xs font-bold text-gray-300">{t('wallet_method')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['payoneer', 'bank', 'paypal'] as Method[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`py-2 rounded-xl text-[11px] font-bold ${
                        method === m ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      {t(`wallet_method_${m}`)}
                    </button>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, 300))}
                  placeholder={t(`wallet_details_${method}`)}
                  rows={method === 'bank' ? 3 : 1}
                  className="w-full px-3 py-2.5 bg-[#171923] border border-gray-800 rounded-xl text-white text-sm focus:border-[#8B5CF6] outline-none resize-none"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${t('wallet_amount')}: ${num(wallet.diamonds)}`}
                  className="w-full px-3 py-2.5 bg-[#171923] border border-gray-800 rounded-xl text-white text-sm focus:border-[#8B5CF6] outline-none"
                />
                <p className="text-[11px] text-gray-400">
                  = {usd(Math.floor(Number(amount || wallet.diamonds)) * wallet.diamond_usd)}
                </p>
                <button
                  onClick={submitWithdraw}
                  disabled={isBusy || details.trim().length < 5}
                  className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('wallet_submit_withdraw')}
                </button>
              </div>
            )}

            {/* سجل السحوبات */}
            {withdrawals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 mb-2">{t('wallet_history')}</p>
                <div className="space-y-2">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white">{usd(Number(w.amount_usd))}</p>
                        <p className="text-[10px] text-gray-500">
                          {num(Number(w.diamonds))} · {new Date(w.created_at).toLocaleDateString(lang)}
                        </p>
                        {w.admin_note && <p className="text-[10px] text-gray-400 mt-0.5 break-words">{w.admin_note}</p>}
                      </div>
                      <span
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-bold ${
                          w.status === 'paid' ? 'text-emerald-300' : w.status === 'rejected' ? 'text-red-300' : 'text-amber-300'
                        }`}
                      >
                        {w.status === 'paid' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : w.status === 'rejected' ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {t(`wallet_status_${w.status}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
