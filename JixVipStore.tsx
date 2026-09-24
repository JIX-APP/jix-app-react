import React, { useEffect, useState } from 'react';
import { X, Crown, Loader2, Check } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';

interface VipNumberRow {
  number: number;
  category: string;
  price_coins: number;
  is_beautiful: boolean;
  is_sold: boolean;
}

interface JixVipStoreProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

// أسماء الفئات من ملف الترجمة (vip_mono، vip_double...)
const CATEGORY_KEYS: Record<string, string> = {
  mono: 'vip_mono',
  double: 'vip_double',
  triple: 'vip_triple',
  quad: 'vip_quad',
  penta: 'vip_penta',
  hexa: 'vip_hexa',
};

const CATEGORY_ORDER = ['mono', 'double', 'triple', 'quad', 'penta', 'hexa'];

export const JixVipStore: React.FC<JixVipStoreProps> = ({ isOpen, onClose, currentUserId }) => {
  const { t } = useI18n();
  const [numbers, setNumbers] = useState<VipNumberRow[]>([]);
  const [activeTab, setActiveTab] = useState('mono');
  const [isLoading, setIsLoading] = useState(true);
  const [buyingNumber, setBuyingNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNumber, setSuccessNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchNumbers();
  }, [isOpen]);

  const fetchNumbers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('vip_numbers')
      .select('number, category, price_coins, is_beautiful, is_sold')
      .eq('is_sold', false)
      .order('price_coins', { ascending: false });

    setNumbers((data as VipNumberRow[]) || []);
    setIsLoading(false);
  };

  const handleBuy = async (number: number) => {
    if (!currentUserId) {
      setError(t('vip_login_required'));
      return;
    }

    setBuyingNumber(number);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('buy_vip_number', {
        p_number: number,
      });

      if (rpcError) throw rpcError;

      setSuccessNumber(number);
      setNumbers((prev) => prev.filter((n) => n.number !== number));

      setTimeout(() => setSuccessNumber(null), 2500);
    } catch (err) {
      setError((err as Error).message || t('vip_buy_failed'));
    } finally {
      setBuyingNumber(null);
    }
  };

  if (!isOpen) return null;

  const numbersInTab = numbers.filter((n) => n.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-gray-800 h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-black text-base text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#F5B93E]" />
            {t('vip_store_title')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 px-4 pt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                activeTab === cat
                  ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white'
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              {t(CATEGORY_KEYS[cat])}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
            </div>
          ) : numbersInTab.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-16">{t('vip_empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {numbersInTab.map((n) => (
                <div
                  key={n.number}
                  className={`relative rounded-2xl p-3.5 flex flex-col items-center gap-2 border ${
                    n.is_beautiful
                      ? 'bg-gradient-to-br from-[#F5B93E]/20 to-[#8B5CF6]/20 border-[#F5B93E]/40'
                      : 'bg-white/5 border-gray-800'
                  }`}
                >
                  {n.is_beautiful && (
                    <span className="absolute top-2 left-2 text-[9px] font-black text-[#F5B93E]">{t('vip_special')}</span>
                  )}
                  <span className="text-xl font-black text-white tracking-wider" dir="ltr">
                    {n.number}
                  </span>
                  <span className="text-[10px] font-bold text-[#F5B93E]">
                    {n.price_coins.toLocaleString()} 🪙
                  </span>
                  <button
                    onClick={() => handleBuy(n.number)}
                    disabled={buyingNumber === n.number}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white text-xs font-black disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {buyingNumber === n.number ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : successNumber === n.number ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      t('vip_buy')
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
