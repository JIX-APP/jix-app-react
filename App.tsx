import React, { useEffect, useState } from 'react';
import { Radio, Gift, LogIn, LogOut, Car, Rabbit, Bird, Loader2 } from 'lucide-react';
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

  // عند تحميل التطبيق: هل فيه جلسة Supabase شغالة بالفعل؟
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

    // الاستماع لأي تغيير في حالة الجلسة (دخول / خروج / تجديد توكن)
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
    <div className="min-h-screen bg-[#0c0d12] text-white flex flex-col">
      {/* الهيدر */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black">
            JIX
          </div>
          <span className="font-black text-lg">JIX Live</span>
        </div>

        {isCheckingSession ? (
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full border-2 border-amber-500" />
            <span className="text-sm font-bold">{user.name}</span>
            <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition" title="تسجيل الخروج">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black text-sm font-bold rounded-xl hover:bg-amber-400 transition"
          >
            <LogIn className="w-4 h-4" /> تسجيل الدخول
          </button>
        )}
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-10 text-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">منصة البث المباشر الأسطورية</h1>
          <p className="text-gray-400 max-w-md mx-auto">
            ابدأ بثك المباشر الآن، تحدَّ أصدقاءك في تحديات PK، وأرسل هدايا بمؤثرات صوتية حقيقية.
          </p>
        </div>

        <button
          onClick={handleGoLive}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black rounded-2xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition active:scale-95"
        >
          <Radio className="w-5 h-5" /> ابدأ البث المباشر
        </button>

        {/* منطقة تجربة الهدايا الصوتية */}
        <div className="w-full max-w-md bg-[#12141f] border border-gray-800 rounded-3xl p-6">
          <h3 className="font-bold text-sm mb-4 flex items-center justify-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" /> جرّب مؤثرات صوت الهدايا
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => jixAudio.playGiftEffect('supercar')}
              className="flex flex-col items-center gap-2 p-4 bg-black/40 border border-gray-800 rounded-2xl hover:border-amber-500 transition"
            >
              <Car className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-bold">سوبركار</span>
            </button>
            <button
              onClick={() => jixAudio.playGiftEffect('horse')}
              className="flex flex-col items-center gap-2 p-4 bg-black/40 border border-gray-800 rounded-2xl hover:border-amber-500 transition"
            >
              <Rabbit className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-bold">خيل</span>
            </button>
            <button
              onClick={() => jixAudio.playGiftEffect('falcon')}
              className="flex flex-col items-center gap-2 p-4 bg-black/40 border border-gray-800 rounded-2xl hover:border-amber-500 transition"
            >
              <Bird className="w-6 h-6 text-amber-400" />
              <span className="text-xs font-bold">صقر</span>
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
