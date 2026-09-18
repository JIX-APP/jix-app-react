import React, { useEffect, useState } from 'react';
import { Radio, Gift, LogIn, LogOut, Car, Rabbit, Bird, Loader2, Eye, Volume2, Swords } from 'lucide-react';
import { JixAuthModal } from './JixAuthModal';
import { JixStreamStudio } from './JixStreamStudio';
import { jixAudio } from './jixAudioFx';
import { supabase } from './supabaseClient';

interface CurrentUser {
  name: string;
  email: string;
  avatar: string;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200';

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sUser = data.session?.user;
      if (sUser) {
        setUser({
          name: (sUser.user_metadata?.username as string) || 'مستخدم JIX',
          email: sUser.email || sUser.phone || '',
          avatar: DEFAULT_AVATAR,
        });
      }
      setIsCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sUser = session?.user;
      setUser(
        sUser
          ? {
              name: (sUser.user_metadata?.username as string) || 'مستخدم JIX',
              email: sUser.email || sUser.phone || '',
              avatar: DEFAULT_AVATAR,
            }
          : null
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (username: string, email: string) => {
    setUser({ name: username, email, avatar: DEFAULT_AVATAR });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsStudioOpen(false);
  };

  const handleGoLive = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsStudioOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#08080C] text-[#F5F5F7]">
      {/* الهيدر */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-[#08080C]/80 backdrop-blur-md border-b border-[#1C1C26]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF2D6B] to-[#F5B93E] flex items-center justify-center text-black font-black text-sm">
            JX
          </div>
          <span className="font-black text-base tracking-tight">JIX Live</span>
        </div>

        {isCheckingSession ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#F5B93E]" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full ring-2 ring-[#F5B93E]" />
            <span className="text-sm font-bold hidden sm:inline">{user.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/5 text-[#8E8E9A] hover:text-white hover:bg-white/10 transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF2D6B] to-[#FF6B3D] text-white text-sm font-bold rounded-xl hover:opacity-90 transition"
          >
            <LogIn className="w-4 h-4" /> تسجيل الدخول
          </button>
        )}
      </header>

      {/* القسم الرئيسي */}
      <main className="px-6 pt-14 pb-20 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-14">
          {/* النص */}
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-3xl md:text-5xl font-black leading-tight mb-5">
              منصة البث المباشر
              <br />
              الأقوى بين الشباب العربي
            </h1>
            <p className="text-[#8E8E9A] text-base md:text-lg max-w-md mx-auto md:mx-0 mb-8 leading-relaxed">
              ابدأ بثك الآن، تحدَّ أصدقاءك في مواجهات PK مباشرة، وأرسل هدايا
              بمؤثرات صوتية حقيقية تسمعها الغرفة كلها.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <button
                onClick={handleGoLive}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF2D6B] to-[#FF6B3D] font-black rounded-2xl shadow-lg shadow-[#FF2D6B]/25 hover:opacity-90 transition active:scale-95"
              >
                <Radio className="w-5 h-5" /> ابدأ البث المباشر
              </button>
              <a
                href="#gifts"
                className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-[#232330] font-bold rounded-2xl hover:bg-white/10 transition"
              >
                <Volume2 className="w-4 h-4 text-[#F5B93E]" /> جرّب صوت الهدايا
              </a>
            </div>

            {/* مميزات */}
            <div className="mt-10 flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-3 text-sm text-[#8E8E9A]">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#FF2D6B]" /> بث فائق الجودة
              </span>
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#FF2D6B]" /> تحديات PK مباشرة
              </span>
              <span className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#F5B93E]" /> هدايا بأصوات حقيقية
              </span>
            </div>
          </div>

          {/* المشهد المرئي - دوائر بث نابضة */}
          <div className="relative flex-shrink-0 w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-[#FF2D6B]/20 animate-ping [animation-duration:2.5s]" />
            <span className="absolute inset-6 rounded-full border border-[#FF2D6B]/30" />
            <span className="absolute inset-12 rounded-full border border-[#FF2D6B]/40" />
            <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[#FF2D6B] to-[#FF6B3D] flex items-center justify-center shadow-2xl shadow-[#FF2D6B]/30">
              <Radio className="w-12 h-12 text-white" />
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#08080C] border border-[#232330] px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#FF2D6B] animate-pulse" />
              <span className="text-xs font-bold">مباشر</span>
            </div>
            <div className="absolute bottom-4 right-0 flex items-center gap-1.5 bg-[#08080C] border border-[#232330] px-3 py-1.5 rounded-full">
              <Eye className="w-3.5 h-3.5 text-[#8E8E9A]" />
              <span className="text-xs font-bold">مشاهدون الآن</span>
            </div>
          </div>
        </div>

        {/* قسم الهدايا */}
        <div id="gifts" className="mt-24 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-2">هدايا لها صوت</h2>
          <p className="text-[#8E8E9A] text-sm mb-8">مؤثرات صوتية حقيقية تسمعها الغرفة كلها لحظة الإرسال</p>

          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => jixAudio.playGiftEffect('falcon')}
              className="flex flex-col items-center gap-2 group"
            >
              <span className="w-16 h-16 rounded-full bg-[#131319] border-2 border-[#232330] flex items-center justify-center group-hover:border-sky-400 transition">
                <Bird className="w-7 h-7 text-sky-400" />
              </span>
              <span className="text-xs font-bold text-[#8E8E9A] group-hover:text-white transition">صقر</span>
            </button>
            <button
              onClick={() => jixAudio.playGiftEffect('horse')}
              className="flex flex-col items-center gap-2 group"
            >
              <span className="w-16 h-16 rounded-full bg-[#131319] border-2 border-[#232330] flex items-center justify-center group-hover:border-[#F5B93E] transition">
                <Rabbit className="w-7 h-7 text-[#F5B93E]" />
              </span>
              <span className="text-xs font-bold text-[#8E8E9A] group-hover:text-white transition">خيل</span>
            </button>
            <button
              onClick={() => jixAudio.playGiftEffect('supercar')}
              className="flex flex-col items-center gap-2 group"
            >
              <span className="w-16 h-16 rounded-full bg-[#131319] border-2 border-[#232330] flex items-center justify-center group-hover:border-[#FF2D6B] transition">
                <Car className="w-7 h-7 text-[#FF2D6B]" />
              </span>
              <span className="text-xs font-bold text-[#8E8E9A] group-hover:text-white transition">سوبركار</span>
            </button>
          </div>
        </div>
      </main>

      <JixAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccessLogin={handleLoginSuccess} />

      {user && (
        <JixStreamStudio
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          currentUser={{ name: user.name, avatar: user.avatar }}
        />
      )}
    </div>
  );
}

export default App;
