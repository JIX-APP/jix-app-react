import React, { useEffect, useState } from 'react';
import { Home, Compass, MessageCircle, User, Plus, LogOut, Loader2, Search, Radio, Video, Eye, Pencil, Check } from 'lucide-react';
import { JixAuthModal } from './JixAuthModal';
import { JixStreamStudio } from './JixStreamStudio';
import { JixWatchStream } from './JixWatchStream';
import { JixVideoFeed } from './JixVideoFeed';
import { JixUploadVideo } from './JixUploadVideo';
import { JixAvatarUpload } from './JixAvatarUpload';
import { LevelBadge, AvatarFrame, useLevelXp } from './JixLevelSystem';
import { checkText } from './JixModeration';
import { supabase } from './supabaseClient';
import { getPKBattle } from './JixPK';
import { JixPKChallengeNotification } from './JixPKChallengeNotification';
import { JixPKBattleView, JixPKResultOverlay } from './JixPKBattleView';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarUrl: string | null;
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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [videoFeedKey, setVideoFeedKey] = useState(0);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [liveStreams, setLiveStreams] = useState<LiveStreamRow[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [watchingStream, setWatchingStream] = useState<LiveStreamRow | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const supporterXp = useLevelXp(user?.id ?? null, 'supporter');
  const receiverXp = useLevelXp(user?.id ?? null, 'receiver');

  // ---- نظام PK ----
  const [pkBattleId, setPkBattleId] = useState<string | null>(null);
  const [pkHostAName, setPkHostAName] = useState('');
  const [pkHostBName, setPkHostBName] = useState('');
  const [pkWinnerName, setPkWinnerName] = useState<string | null | undefined>(undefined);

  // لما تنبدأ معركة (بعد قبول تحدي) نجيب أسماء الطرفين
  useEffect(() => {
    if (!pkBattleId) return;

    const loadBattleNames = async () => {
      const battle = await getPKBattle(pkBattleId);
      if (!battle) return;

      const [{ data: profileA }, { data: profileB }] = await Promise.all([
        supabase.from('profiles').select('full_name, handle').eq('id', battle.host_a_id).maybeSingle(),
        battle.host_b_id
          ? supabase.from('profiles').select('full_name, handle').eq('id', battle.host_b_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setPkHostAName(profileA?.full_name || profileA?.handle || 'مذيع');
      setPkHostBName(profileB?.full_name || profileB?.handle || 'مذيع');
    };

    loadBattleNames();
  }, [pkBattleId]);

  useEffect(() => {
    const loadUser = async (sUser: any) => {
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', sUser.id).maybeSingle();
      setUser({
        id: sUser.id,
        name: (sUser.user_metadata?.username as string) || 'مستخدم JIX',
        email: sUser.email || '',
        avatar: DEFAULT_AVATAR,
        avatarUrl: profile?.avatar_url ?? null,
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      const sUser = data.session?.user;
      if (sUser) {
        loadUser(sUser);
      }
      setIsCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sUser = session?.user;
      if (sUser) {
        loadUser(sUser);
      } else {
        setUser(null);
      }
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
    supabase.auth.getSession().then(({ data }) => {
      const sUser = data.session?.user;
      if (sUser) {
        supabase.from('profiles').select('avatar_url').eq('id', sUser.id).maybeSingle().then(({ data: profile }) => {
          setUser({ id: sUser.id, name: username, email, avatar: DEFAULT_AVATAR, avatarUrl: profile?.avatar_url ?? null });
        });
      }
    });
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

  const handleUploadClick = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsUploadOpen(true);
  };

  const handleStartEditName = () => {
    if (!user) return;
    setNameDraft(user.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user || !nameDraft.trim()) return;

    const textCheck = checkText(nameDraft);
    if (!textCheck.isClean) {
      setNameError('الاسم يحتوي على كلمة غير مسموح بها');
      return;
    }

    setNameError(null);
    setIsSavingName(true);
    try {
      const newName = nameDraft.trim();

      await supabase.auth.updateUser({ data: { username: newName } });
      await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);

      setUser((prev) => (prev ? { ...prev, name: newName } : prev));
      setIsEditingName(false);
    } catch (err) {
      console.error('[JIX] فشل تحديث الاسم:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="h-[100dvh] max-w-[430px] mx-auto relative bg-[#0E0E12] text-white overflow-hidden">
      {screen === 'Home' && (
        <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-4 pb-3 bg-gradient-to-b from-black/60 to-transparent">
          <span className="font-black text-sm">JIX</span>
          {isCheckingSession ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
          ) : (
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur">
              <Search className="w-4 h-4" />
            </button>
          )}
        </header>
      )}

      {/* الرئيسية - فيد الفيديوهات (شغال) */}
      <div className={`absolute inset-0 pb-24 ${screen === 'Home' ? '' : 'hidden'}`}>
        <JixVideoFeed currentUserId={user?.id ?? null} refreshKey={videoFeedKey} />
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
              <AvatarFrame
                xp={Math.max(supporterXp, receiverXp)}
                kind={supporterXp >= receiverXp ? 'supporter' : 'receiver'}
                size={80}
              >
                <JixAvatarUpload
                  userId={user.id}
                  currentAvatarUrl={user.avatarUrl}
                  fallbackLetter={user.name[0]}
                  onUpdated={(newUrl) => setUser((prev) => (prev ? { ...prev, avatarUrl: newUrl } : prev))}
                />
              </AvatarFrame>
              {isEditingName ? (
                <div className="flex flex-col items-center gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      autoFocus
                      className="px-3 py-1.5 bg-[#171923] border border-gray-800 rounded-xl text-white text-sm text-center focus:border-[#8B5CF6] outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName || !nameDraft.trim()}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-50"
                    >
                      {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {nameError && <p className="text-[10px] text-red-400">{nameError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="font-black text-lg">{user.name}</p>
                  <button onClick={handleStartEditName} className="p-1 rounded-full bg-white/5">
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}
              <p className="text-xs text-[#6B6B76]">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <LevelBadge xp={supporterXp} kind="supporter" size="md" />
                <LevelBadge xp={receiverXp} kind="receiver" size="md" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={handleGoLive}
                className="flex flex-col items-center gap-1.5 py-3 bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] rounded-xl"
              >
                <Radio className="w-5 h-5" />
                <span className="text-[10px] font-bold">بث مباشر</span>
              </button>
              <button
                onClick={handleUploadClick}
                className="flex flex-col items-center gap-1.5 py-3 bg-white/5 rounded-xl"
              >
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
          onClick={handleUploadClick}
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

      <JixUploadVideo
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => {
          setVideoFeedKey((k) => k + 1);
          setScreen('Home');
        }}
      />

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

      {/* إشعار تحدي PK وارد - شغال دايمًا بالخلفية طالما مسجل دخول */}
      <JixPKChallengeNotification
        currentUserId={user?.id ?? null}
        onAccepted={(battleId) => setPkBattleId(battleId)}
      />

      {/* شاشة معركة PK النشطة - تطلع فوق كل شي لما تنبدأ معركة */}
      {pkBattleId && pkWinnerName === undefined && (
        <JixPKBattleView
          battleId={pkBattleId}
          hostAName={pkHostAName}
          hostBName={pkHostBName}
          onBattleEnded={(winner) => setPkWinnerName(winner)}
        />
      )}

      {/* شاشة إعلان الفائز */}
      {pkBattleId && pkWinnerName !== undefined && (
        <JixPKResultOverlay
          winnerName={pkWinnerName}
          onClose={() => {
            setPkBattleId(null);
            setPkWinnerName(undefined);
          }}
        />
      )}
    </div>
  );
}

export default App;
