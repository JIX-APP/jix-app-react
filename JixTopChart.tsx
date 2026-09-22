import React, { useEffect, useState } from 'react';
import { X, Loader2, Coins } from 'lucide-react';
import { supabase } from './supabaseClient';
import { JixMvpBadge, getTierFromAmount } from './JixMvpBadge';

interface JixTopChartProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
}

type ChartMode = 'supporters' | 'hosts';
type ChartPeriod = 'day' | 'week';

interface ChartRow {
  user_id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  total_coins: number;
}

// نفس ألوان أرقام الترتيب اللي تيك توك يستخدمها للمراكز الثلاث الأولى
const RANK_COLORS: Record<number, string> = {
  1: '#FAC775', // ذهبي
  2: '#D3D1C7', // فضي
  3: '#C98B4E', // برونزي
};

export const JixTopChart: React.FC<JixTopChartProps> = ({ isOpen, onClose, onOpenProfile }) => {
  const [mode, setMode] = useState<ChartMode>('supporters');
  const [period, setPeriod] = useState<ChartPeriod>('day');
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    fetchChart();
  }, [isOpen, mode, period]);

  const fetchChart = async () => {
    setIsLoading(true);
    const rpcName = mode === 'supporters' ? 'get_top_supporters' : 'get_top_hosts';
    const { data } = await supabase.rpc(rpcName, { p_period: period });
    setRows((data as ChartRow[]) || []);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-[430px] bg-[#12141f] border-t border-gray-800 rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-black text-sm text-white">قائمة الصدارة</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* تبويب داعمين / مذيعين */}
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setMode('supporters')}
            className={`flex-1 py-2 rounded-full text-xs font-black transition ${
              mode === 'supporters' ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-white/5 text-gray-400'
            }`}
          >
            توب الداعمين
          </button>
          <button
            onClick={() => setMode('hosts')}
            className={`flex-1 py-2 rounded-full text-xs font-black transition ${
              mode === 'hosts' ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'bg-white/5 text-gray-400'
            }`}
          >
            توب المذيعين
          </button>
        </div>

        {/* فلتر يومي / أسبوعي */}
        <div className="flex gap-1.5 px-4 pt-2.5 pb-1">
          <button
            onClick={() => setPeriod('day')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${
              period === 'day' ? 'bg-white text-black' : 'bg-white/5 text-gray-400'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${
              period === 'week' ? 'bg-white text-black' : 'bg-white/5 text-gray-400'
            }`}
          >
            الأسبوع
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-12">
              ما فيه {mode === 'supporters' ? 'داعمين' : 'مذيعين'} بهالفترة لسه
            </p>
          ) : (
            rows.map((row, index) => {
              const rank = index + 1;
              // نحسب مستوى الشارة (MVP) بناءً على مجموع الفترة نفسها (يومي/أسبوعي)
              // مو بمبلغ بث واحد - نفس عتبات MVP لكن على نطاق هالتشارت
              const tier = getTierFromAmount(row.total_coins);

              return (
                <button
                  key={row.user_id}
                  onClick={() => onOpenProfile?.(row.user_id)}
                  className="w-full flex items-center gap-3 bg-white/5 rounded-2xl p-2.5"
                >
                  {/* رقم الترتيب - الثلاث الأوائل بألوان مميزة زي تيك توك */}
                  <span
                    className="w-6 text-center font-black text-sm shrink-0"
                    style={{ color: RANK_COLORS[rank] || '#6B6B76' }}
                  >
                    {rank}
                  </span>

                  {tier ? (
                    <JixMvpBadge
                      tier={tier}
                      avatarUrl={row.avatar_url}
                      fallbackLetter={(row.full_name || row.handle || '?')[0]}
                      size={44}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white shrink-0 overflow-hidden">
                      {row.avatar_url ? (
                        <img src={row.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        (row.full_name || row.handle || '?')[0]
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-sm font-bold text-white truncate">{row.full_name || row.handle}</p>
                    {row.handle && <p className="text-[10px] text-gray-500 truncate">@{row.handle}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-[#F5B93E] text-xs font-black">
                    <Coins className="w-3.5 h-3.5" />
                    {row.total_coins.toLocaleString()}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
