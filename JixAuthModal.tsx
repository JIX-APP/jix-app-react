import React, { useState } from 'react';
import { X, Mail, Smartphone, ArrowLeft, ShieldCheck, Loader2, Calendar } from 'lucide-react';
import { supabase } from './supabaseClient';

interface JixAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (username: string, email: string) => void;
}

type Step = 'form' | 'otp';

// حساب العمر بدقة من تاريخ الميلاد (يراعي الشهر واليوم مو بس فرق السنوات)
const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const JixAuthModal: React.FC<JixAuthModalProps> = ({ isOpen, onClose, onSuccessLogin }) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const identifier = authMethod === 'email' ? email.trim() : phone.trim();

  const resetAndClose = () => {
    setStep('form');
    setOtp('');
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  // خطوة 1: التحقق من العمر أولاً، ثم إرسال كود الـ OTP عبر Supabase
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dateOfBirth) {
      setError('يجب إدخال تاريخ الميلاد للمتابعة');
      return;
    }

    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      setError('يجب أن يكون عمرك 18 سنة أو أكثر لاستخدام JIX');
      return;
    }

    setIsSubmitting(true);

    const { error: otpError } =
      authMethod === 'email'
        ? await supabase.auth.signInWithOtp({
            email: identifier,
            options: {
              shouldCreateUser: true,
              data: username ? { username, date_of_birth: dateOfBirth } : { date_of_birth: dateOfBirth },
            },
          })
        : await supabase.auth.signInWithOtp({
            phone: identifier,
            options: {
              shouldCreateUser: true,
              data: username ? { username, date_of_birth: dateOfBirth } : { date_of_birth: dateOfBirth },
            },
          });

    setIsSubmitting(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep('otp');
  };

  // خطوة 2: التحقق من كود الـ 6 أرقام
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { data, error: verifyError } =
      authMethod === 'email'
        ? await supabase.auth.verifyOtp({ email: identifier, token: otp, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: identifier, token: otp, type: 'sms' });

    if (verifyError) {
      setIsSubmitting(false);
      setError(verifyError.message);
      return;
    }

    // نحفظ تاريخ الميلاد بجدول profiles بعد نجاح تسجيل الدخول
    // (Trigger بقاعدة البيانات يرفض تلقائيًا أي عمر أقل من 18 كحماية إضافية)
    if (data.user && dateOfBirth) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ date_of_birth: dateOfBirth })
        .eq('id', data.user.id);

      if (profileError) {
        setIsSubmitting(false);
        setError(profileError.message);
        return;
      }
    }

    setIsSubmitting(false);

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
      <div className="relative w-full max-w-md bg-[#0f1118] border border-amber-500/30 rounded-3xl p-6 text-white shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto">
        <button onClick={resetAndClose} className="absolute top-5 left-5 text-gray-400 hover:text-white p-2 rounded-full bg-white/5">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500 flex items-center justify-center text-black font-black text-2xl mb-3 shadow-lg shadow-amber-500/20">
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
          <>
            <div className="flex bg-[#171923] p-1 rounded-2xl border border-gray-800 mb-5">
              <button type="button" onClick={() => setAuthMethod('email')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${authMethod === 'email' ? 'bg-amber-500 text-black' : 'text-gray-400'}`}>
                <Mail className="w-4 h-4" /> البريد الإلكتروني
              </button>
              <button type="button" onClick={() => setAuthMethod('phone')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${authMethod === 'phone' ? 'bg-amber-500 text-black' : 'text-gray-400'}`}>
                <Smartphone className="w-4 h-4" /> رقم الهاتف
              </button>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">اسم المستخدم / اللقب (اختياري)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="الجيلاني"
                  className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  {authMethod === 'email' ? 'عنوان البريد الإلكتروني' : 'رقم الهاتف (مع رمز الدولة)'}
                </label>
                <input
                  type={authMethod === 'email' ? 'email' : 'tel'}
                  value={authMethod === 'email' ? email : phone}
                  onChange={(e) => (authMethod === 'email' ? setEmail(e.target.value) : setPhone(e.target.value))}
                  placeholder={authMethod === 'email' ? 'name@example.com' : '+9745XXXXXXX'}
                  required
                  className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> تاريخ الميلاد
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-sm focus:border-amber-500 outline-none [color-scheme:dark]"
                />
                <p className="text-[10px] text-gray-500 mt-1">يجب أن يكون عمرك 18 سنة أو أكثر لاستخدام JIX</p>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </form>
          </>
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
                className="w-full px-4 py-3 bg-[#171923] border border-gray-800 rounded-2xl text-white text-center text-2xl tracking-[0.5em] focus:border-amber-500 outline-none"
              />
            </div>

            <button type="submit" disabled={isSubmitting || otp.length !== 6} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60">
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
