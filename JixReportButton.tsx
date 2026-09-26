import React, { useState } from 'react';
import { Flag, X, Check, Loader2 } from 'lucide-react';
import { REPORT_REASONS, ReportReason, ReportTargetType, submitReport } from './JixModeration';
import { supabase } from './supabaseClient';
import { useI18n } from './JixLanguage';

interface JixReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  // icon: أيقونة بخلفية (المنشورات والبث) | text: نص "إبلاغ" | header: زر بأعلى البروفايل | mini: صغير بجانب التعليق
  variant?: 'icon' | 'text' | 'header' | 'mini';
}

const TITLE_KEYS: Record<ReportTargetType, string> = {
  post: 'report_title_post',
  live_stream: 'report_title_live',
  comment: 'report_title_comment',
  user: 'report_title_user',
};

const MAX_DETAILS = 500;

export const JixReportButton: React.FC<JixReportButtonProps> = ({ targetType, targetId, variant = 'icon' }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const reset = () => {
    setIsOpen(false);
    setIsDone(false);
    setSelectedReason(null);
    setDetails('');
    setErrorKey(null);
  };

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase.auth.getSession();
    setIsLoggedIn(!!data.session);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setErrorKey(null);
    setIsSubmitting(true);
    const result = await submitReport(targetType, targetId, selectedReason, details);
    setIsSubmitting(false);

    if (result.success) {
      setIsDone(true);
      setTimeout(reset, 1800);
      return;
    }
    if (result.error === 'already_reported') setErrorKey('report_duplicate');
    else if (result.error === 'daily_limit') setErrorKey('report_daily_limit');
    else if (result.error === 'not_authenticated') setIsLoggedIn(false);
    else setErrorKey('report_failed');
  };

  const trigger =
    variant === 'text' ? (
      <button onClick={handleOpen} className="flex items-center gap-1.5 text-xs text-gray-400">
        <Flag className="w-3.5 h-3.5" /> {t('report')}
      </button>
    ) : variant === 'header' ? (
      <button onClick={handleOpen} aria-label={t('report')} className="p-1.5 rounded-full bg-white/5">
        <Flag className="w-4 h-4 text-gray-300" />
      </button>
    ) : variant === 'mini' ? (
      <button onClick={handleOpen} aria-label={t('report')} className="p-1 text-gray-600 hover:text-gray-300 shrink-0">
        <Flag className="w-3 h-3" />
      </button>
    ) : (
      <button onClick={handleOpen} aria-label={t('report')} className="p-1.5 rounded-full bg-black/40 text-gray-300">
        <Flag className="w-3.5 h-3.5" />
      </button>
    );

  return (
    <>
      {trigger}

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            reset();
          }}
        >
          <div
            className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-gray-800 p-5 max-h-[85vh] flex flex-col"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="font-black text-sm text-white">{t(TITLE_KEYS[targetType])}</h3>
              <button onClick={reset} className="p-1 text-gray-400" aria-label={t('cancel')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isLoggedIn ? (
              <p className="text-sm text-gray-300 text-center py-8">{t('report_login_required')}</p>
            ) : isDone ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm text-white font-bold">{t('report_sent')}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3 shrink-0">{t('report_choose_reason')}</p>
                <div className="space-y-2 mb-4 overflow-y-auto">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-start px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                        selectedReason === reason
                          ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white'
                          : 'bg-white/5 text-gray-300'
                      }`}
                    >
                      {t(`report_reason_${reason}`)}
                    </button>
                  ))}
                </div>

                {selectedReason && (
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS))}
                    placeholder={t('report_details_placeholder')}
                    rows={2}
                    className="w-full mb-3 px-4 py-2.5 bg-[#171923] border border-gray-800 rounded-xl text-white text-sm focus:border-[#8B5CF6] outline-none resize-none shrink-0"
                  />
                )}

                {errorKey && <p className="text-xs text-red-400 text-center mb-3 shrink-0">{t(errorKey)}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="w-full py-3 bg-red-600 text-white font-black text-sm rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 shrink-0"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  {t('report_submit')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
