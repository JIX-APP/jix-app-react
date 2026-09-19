import React, { useState } from 'react';
import { Flag, X, Check, Loader2 } from 'lucide-react';
import { REPORT_REASONS, ReportTargetType, submitReport } from './JixModeration';

interface JixReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  // شكل الزر: أيقونة صغيرة فقط، أو نص "إبلاغ" كامل
  variant?: 'icon' | 'text';
}

export const JixReportButton: React.FC<JixReportButtonProps> = ({ targetType, targetId, variant = 'icon' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    const result = await submitReport(targetType, targetId, selectedReason);
    setIsSubmitting(false);
    if (result.success) {
      setIsDone(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsDone(false);
        setSelectedReason(null);
      }, 1500);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <button onClick={() => setIsOpen(true)} className="p-1.5 rounded-full bg-black/40 text-gray-300">
          <Flag className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 text-xs text-gray-400">
          <Flag className="w-3.5 h-3.5" /> إبلاغ
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-gray-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm text-white">الإبلاغ عن محتوى</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDone ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm text-white font-bold">تم إرسال البلاغ، شكرًا لك</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">اختر السبب:</p>
                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                        selectedReason === reason
                          ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white'
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="w-full py-3 bg-red-600 text-white font-black text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  إرسال البلاغ
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
