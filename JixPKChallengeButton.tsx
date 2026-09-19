import React, { useState } from 'react';
import { Swords, X, Loader2, Shuffle, UserPlus } from 'lucide-react';
import { requestPKChallenge, joinPKRandomQueue } from './JixPK';

interface JixPKChallengeButtonProps {
  targetUserId: string;
  targetUsername: string;
  onBattleStarted: (battleId: string) => void;
}

export const JixPKChallengeButton: React.FC<JixPKChallengeButtonProps> = ({
  targetUserId,
  targetUsername,
  onBattleStarted,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentPending, setSentPending] = useState(false);

  const handleDirectChallenge = async () => {
    setIsSending(true);
    setError(null);
    try {
      const result = await requestPKChallenge(targetUserId);
      setIsSending(false);

      if (result.error) {
        alert('خطأ: ' + result.error);
        setError(result.error);
        return;
      }

      alert('تم إرسال التحدي بنجاح! battleId: ' + result.battleId);
      setSentPending(true);
      setTimeout(() => {
        setIsOpen(false);
        setSentPending(false);
      }, 2000);
    } catch (err: any) {
      setIsSending(false);
      alert('استثناء غير متوقع: ' + (err?.message || String(err)));
      setError('حدث خطأ غير متوقع');
    }
  };

  const handleRandomMatch = async () => {
    setIsSending(true);
    setError(null);
    try {
      const result = await joinPKRandomQueue();
      setIsSending(false);

      if (result.error) {
        alert('خطأ: ' + result.error);
        setError(result.error);
        return;
      }

      if (result.battleId) {
        alert('صار تطابق فوري! battleId: ' + result.battleId);
        setIsOpen(false);
        onBattleStarted(result.battleId);
      } else {
        alert('انضممت لطابور الانتظار');
        setSentPending(true);
      }
    } catch (err: any) {
      setIsSending(false);
      alert('استثناء غير متوقع: ' + (err?.message || String(err)));
      setError('حدث خطأ غير متوقع');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#8B5CF6] text-white"
      >
        <Swords className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-gray-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm text-white">تحدي PK</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {sentPending ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6] mb-3" />
                <p className="text-sm text-white font-bold">بانتظار الرد...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleDirectChallenge}
                  disabled={isSending}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] rounded-2xl disabled:opacity-50"
                >
                  <UserPlus className="w-5 h-5 text-white shrink-0" />
                  <div className="text-right flex-1">
                    <p className="text-sm font-black text-white">تحدي {targetUsername}</p>
                    <p className="text-[10px] text-white/80">إرسال طلب تحدي مباشر لهذا المذيع</p>
                  </div>
                  {isSending && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                </button>

                <button
                  onClick={handleRandomMatch}
                  disabled={isSending}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/5 rounded-2xl disabled:opacity-50"
                >
                  <Shuffle className="w-5 h-5 text-gray-300 shrink-0" />
                  <div className="text-right flex-1">
                    <p className="text-sm font-black text-white">مطابقة عشوائية</p>
                    <p className="text-[10px] text-gray-400">تحدي أول مذيع متاح تلقائيًا</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
