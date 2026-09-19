import React, { useEffect, useState } from 'react';
import { Home, Compass, MessageCircle, User, Plus, LogOut, Loader2, Search, Radio, Image as ImageIcon, Video, Eye } from 'lucide-react';
import { JixAuthModal } from './JixAuthModal';
import { JixStreamStudio } from './JixStreamStudio';
import { JixWatchStream } from './JixWatchStream';
import { supabase } from './supabaseClient';

interface CurrentUser {
  name: string;
  email: string;
  avatar: string;
}

interface LiveStreamRow {
  id: string;
  user_id: string;
  username: string;
  channel_name: string;
  started_at: string;
}

type ScreenName = 'Home' | 'Discover' | 'Messages' | 'Profile';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200';

function App() {
  const [screen, setScreen] = useState<ScreenName>('Home');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [liveStreams, setLiveStreams] = useState<LiveStreamRow[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [watchingStream, setWatchingStream] = useState<LiveStreamRow | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sUser = data.session?.user;
      if (sUser) {
        setUser({
          name: (sUser.user_metadata?.username as string) || 'مستخدم JIX',
          email: sUser.email || '',
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
              email: sUser.email || '',
              avatar: DEFAULT_AVATAR,
            }
          : null
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      const { data } = await supabase
        .from('live_streams')
        .select('*')
        .order('started_at', { ascending: false });
      setLiveStreams(data || []);
      setIsLoadingLive(false);
    };

    fetchLiveStreams();

    const channel = supabase
      .channel('live_streams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        fetchLiveStreams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLoginSuccess = (username: string, email: string) => {
    setUser({ name: username, email, avatar: DEFAULT_AVATAR });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsStudioOpen(false);
    setScreen('Home');
  };

  const handleGoLive = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsStudioOpen(true);
  };

  return (
    <div className="h-[100dvh] max-w-[430px] mx-auto relative bg-[#0E0E12] text-white overflow-hidden">
      {screen === 'Home' && (
        <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-4 pb-3 bg-[#0E0E12]/80 backdrop-blur">
          <span className="font-black text-sm">JIX</span>
          {isCheckingSession ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
          ) : (
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </button>
          )}
        </header>
      )}

      <div className={`absolute inset-0 pt-16 pb-24 ${screen === 'Home' ? '' : 'hidden'}`}>
        <div className="h-full flex flex-col items-center justify-center px-8 text-center">
          <ImageIcon className="w-10 h-10 text-[#6B6B76] mb-3" />
          <p className="text-sm text-[#9A9A9E]">لسه مفيش منشورات (صور أو فيديوهات)</p>
          <p className="text-xs text-[#6B6B76] mt-1">أول منشور هيظهر هنا لما حد ينشر</p>
        </div>
      </div>

      <div className={`absolute inset-0 pt-6 pb-24 px-4 overflow-y-auto ${screen === 'Discover' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-3 mb-6">
          <Search className="w-4 h-4 text-[#6B6B76]" />
          <input
            placeholder="ابحث عن مستخدم أو بث..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-[#6B6B76] text-white"
          />
        </div>
        <p className="text-xs font-bold text-[#6B6B76] mb-3">بثوث مباشرة الآن</p>

        {isLoadingLive ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
          </div>
        ) : liveStreams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="w-10 h-10 text-[#6B6B76] mb-3" />
            <p className="text-sm text-[#9A9A9E]">مفيش أي بث مباشر شغال دلوقتي</p>
            <p className="text-xs text-[#6B6B76] mt-1">كن أول واحد يبدأ البث!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {liveStreams.map((stream) => (
              <div
                key={stream.id}
                onClick={() => {
                  if (!user) {
                    setIsAuthOpen(true);
                    return;
                  }
                  setWatchingStream(stream);
                }}
                className="relative aspect-[3/4] rounded-xl overflow-hidden flex items-end bg-gradient-to-br from-[#8B5CF6] to-[#FF7A1A] cursor-pointer"
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-25">
                  <span className="text-6xl font-black text-white select-none">{stream.username[0]}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
                <span className="absolute top-2 right-2 bg-[#FF3B5C] px-2 py-0.5 rounded text-[9px] font-black z-10">
                  LIVE
                </span>
                <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full text-[9px] font-bold z-10">
                  <Eye className="w-2.5 h-2.5" />
                </span>
                <p className="relative z-10 px-2 pb-2 text-xs font-black truncate">{stream.username}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`absolute inset-0 pt-6 pb-24 px-4 ${screen === 'Messages' ? '' : 'hidden'}`}>
        <h2 className="font-black text-lg mb-6">الرسائل</h2>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-10 h-10 text-[#6B6B76] mb-3" />
          <p className="text-sm text-[#9A9A9E]">لسه مفيش أي رسائل</p>
        </div>
      </div>

      <div className={`absolute inset-0 pt-6 pb-24 px-4 overflow-y-auto ${screen === 'Profile' ? '' : 'hidden'}`}>
        {!user ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-10 h-10 text-[#6B6B76] mb-3" />
            <p className="text-sm text-[#9A9A9E] mb-4">
              سجّل الدخول عشان تشوف حسابك، بثوثك، ومحفظتك
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] rounded-2xl font-black text-sm"
            >
              تسجيل الدخول
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-2xl mb-3">
                {user.name[0]}
              </div>
              <p className="font-black text-lg">{user.name}</p>
              <p className="text-xs text-[#6B6B76]">{user.email}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                onClick={handleGoLive}
                className="flex flex-col items-center gap-1.5 py-3 bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] rounded-xl"
              >
                <Radio className="w-5 h-5" />
                <span className="text-[10px] font-bold">بث مباشر</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 py-3 bg-white/5 rounded-xl" disabled>
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">رفع صورة</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 py-3 bg-white/5 rounded-xl" disabled>
                <Video className="w-5 h-5" />
                <span className="text-[10px] font-bold">رفع فيديو</span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 bg-white/5 text-red-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          </div>
        )}
      </div>

      <nav className="absolute bottom-0 inset-x-0 z-30 bg-black/40 backdrop-blur border-t border-white/10 flex items-center justify-around py-2.5">
        <button
          onClick={() => setScreen('Home')}
          className={`flex flex-col items-center gap-1 ${screen === 'Home' ? 'text-white' : 'text-[#B0B0B6]'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">الرئيسية</span>
        </button>
        <button
          onClick={() => setScreen('Discover')}
          className={`flex flex-col items-center gap-1 ${screen === 'Discover' ? 'text-white' : 'text-[#B0B0B6]'}`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-bold">اكتشف</span>
        </button>
        <button
          onClick={handleGoLive}
          className="w-12 h-12 -mt-4 rounded-2xl bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={() => setScreen('Messages')}
          className={`flex flex-col items-center gap-1 ${screen === 'Messages' ? 'text-white' : 'text-[#B0B0B6]'}`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold">الرسائل</span>
        </button>
        <button
          onClick={() => setScreen('Profile')}
          className={`flex flex-col items-center gap-1 ${screen === 'Profile' ? 'text-white' : 'text-[#B0B0B6]'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">حسابي</span>
        </button>
      </nav>

      <JixAuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccessLogin={handleLoginSuccess} />

      {user && (
        <JixStreamStudio
          isOpen={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
          currentUser={{ name: user.name, avatar: user.avatar }}
        />
      )}

      {watchingStream && (
        <JixWatchStream
          isOpen={!!watchingStream}
          onClose={() => setWatchingStream(null)}
          liveId={watchingStream.id}
          channelName={watchingStream.channel_name}
          hostUsername={watchingStream.username}
          hostId={watchingStream.user_id}
        />
      )}
    </div>
  );
}

export default App;
