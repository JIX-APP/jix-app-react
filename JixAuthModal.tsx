import React, { useState } from 'react';
import { X, Mail, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
 
interface JixAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (username: string, email: string) => void;
}

type Step = 'form' | 'otp';

export const JixAuthModal: React.FC<JixAuthModalProps> = ({ isOpen, onClose, onSuccessLogin }) => {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const identifier = email.trim();

  const resetAndClose = () => {
    setStep('form');
    setOtp('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: identifier,
      options: {
        shouldCreateUser: true,
        data: username ? { username } : undefined,
      },
    });

    setIsSubmitting(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: identifier,
      token: otp,
      type: 'email',
    });

    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    const finalUsername =
      (data.user?.user_metadata?.username as string | undefined) ||
      username ||
      'مستخدم JIX';
    const finalEmail = data.user?.email || identifier;

    onSuccessLogin(finalUsername, finalEmail);
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f1118] border border-[#8B5CF6]/30 rounded-3xl p-6 text-white shadow-2xl shadow-[#8B5CF6]/10">
        <button onClick={resetAndClose} className="absolute top-5 left-5 text-gray-400 hover:text-white p-2 rounded-full bg-white/5">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-black font-black text-2xl mb-3 shadow-lg shadow-[#8B5CF6]/20">
            JIX
          </div>
          <h2 className="text-2xl font-black">
            {step === 'form' ? 'مرحباً بك في JIX' : 'أدخل رمز التحقق'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {step === 'form'
              ? 'سجّل دخولك للوصول إلى البثوث وتحديات الـ PK والهدايا الأسطورية'
              : `أرسلنا كود مكوّن من 6 أرقام إلى ${identifier}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">اسم المستخدم / اللقب (اختياري)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="الجيلاني"
                className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-[#8B5CF6] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> عنوان البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-[#8B5CF6] outline-none"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] hover:opacity-90 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">رمز التحقق (6 أرقام)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                required
                autoFocus
                className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-center text-2xl tracking-[0.5em] focus:border-[#8B5CF6] outline-none"
              />
            </div>

            <button type="submit" disabled={isSubmitting || otp.length !== 6} className="w-full py-3.5 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] hover:opacity-90 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {isSubmitting ? 'جاري التحقق...' : 'تأكيد الدخول'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('form');
                setOtp('');
                setError(null);
              }}
              className="w-full text-xs font-bold text-gray-400 hover:text-white"
            >
              تعديل البيانات أو إعادة الإرسال
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
