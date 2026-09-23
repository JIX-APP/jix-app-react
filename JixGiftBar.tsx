import React, { useState } from 'react';
import { Gift, Coins, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';
import { GIFTS_CATALOG, RARITY_LABEL, RARITY_ORDER, GiftDef, GiftIcon, GiftRarity } from './JixGiftIcons';

interface JixGiftBarProps {
  liveId: string; // معرّف صف live_streams (uuid)
  hostId: string;
}

export const JixGiftBar: React.FC<JixGiftBarProps> = ({ liveId, hostId }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GiftRarity>('common');
  const [isSending, setIsSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendGift = async (gift: GiftDef) => {
    setError(null);
    setIsSending(gift.id);
    try {
      const { error: rpcError } = await supabase.rpc('send_gift', {
        p_live_id: liveId,
        p_receiver_id: hostId,
        p_gift_id: gift.id,
        p_gift_name: gift.name,
        p_coin_cost: gift.cost,
      });
      if (rpcError) throw rpcError;
      setIsOpen(false);
    } catch (err) {
      setError((err as Error).message || t('gift_send_failed'));
    } finally {
      setIsSending(null);
    }
  };

  const giftsInTab = GIFTS_CATALOG.filter((g) => g.rarity === activeTab);

  return (
    <div className="absolute bottom-6 right-4 z-20 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-[280px] bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3">
            <span className="text-xs font-black">{t('gifts_title')}</span>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full bg-white/5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-1 px-3 pt-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {RARITY_ORDER.map((r) => (
              <button
                key={r}
                onClick={() => setActiveTab(r)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                  activeTab === r ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-white/5 text-gray-400'
                }`}
              >
                {t(`rarity_${r}`)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-3 max-h-[220px] overflow-y-auto">
            {giftsInTab.map((gift) => (
              <button
                key={gift.id}
                onClick={() => sendGift(gift)}
                disabled={isSending !== null}
                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 transition"
              >
                <GiftIcon gift={gift} size={36} spinning={isSending === gift.id} />
                <span className="text-[9px] font-bold text-gray-300 truncate w-full text-center px-1">{t(`gift_${gift.id}`)}</span>
                <span className="text-[9px] font-bold flex items-center gap-0.5 text-[#F5B93E]">
                  <Coins className="w-2 h-2" /> {gift.cost}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-2 px-3 py-1.5 bg-red-600/90 text-white text-[10px] rounded-full text-center max-w-[220px]">
          {error}
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30"
      >
        <Gift className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};
