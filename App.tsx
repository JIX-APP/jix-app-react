import React, { useEffect, useMemo, useState } from 'react';
import { Home, Compass, MessageCircle, User, Plus, LogOut, Loader2, Search, Radio, Video, Eye, Pencil, Check, Crown, Calendar, MapPin, Camera } from 'lucide-react';
import { JixAuthModal } from './JixAuthModal';
import { JixStreamStudio } from './JixStreamStudio';
import { JixWatchStream } from './JixWatchStream';
import { JixVideoFeed, JixFeedMode } from './JixVideoFeed';
import { JixUploadVideo } from './JixUploadVideo';
import { JixAvatarUpload } from './JixAvatarUpload';
import { JixVipStore } from './JixVipStore';
import { JixDobPicker } from './JixDobPicker';
import { JixUserProfile } from './JixUserProfile';
import { LevelBadge, AvatarFrame, useLevelXp } from './JixLevelSystem';
import { checkText } from './JixModeration';
import { supabase } from './supabaseClient';
import { getPKBattle } from './JixPK';
import { JixPKChallengeNotification } from './JixPKChallengeNotification';
import { JixPKBattleView, JixPKResultOverlay } from './JixPKBattleView';
import { JixStoryRing } from './JixStoryRing';
import { JixPresenceProvider } from './JixPresence';
import { useI18n, JixLanguagePicker } from './JixLanguage';
import { JixLiveNotifier } from './JixLiveNotifier';
import { JixProfileStats } from './JixProfileStats';
import {
  JixStoryUpload,
  JixDMList,
  JixDMConversation,
  JixDMCallNotification,
} from './JixNewFeatures';
import { JixDMCall } from './JixDMCall';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarUrl: string | null;
  accountNumber: number | null;
  dateOfBirth: string | null;
  region: string | null;
  gender: 'male' | 'female' | null;
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

const PROFILE_COLUMNS = 'avatar_url, account_number, date_of_birth, region, gender';

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

function App() {
  const { t } = useI18n();
  const [screen, setScreen] = useState<ScreenName>('Home');
  const [feedMode, setFeedMode] = useState<JixFeedMode>('latest');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isVipStoreOpen, setIsVipStoreOpen] = useState(false);
  const [videoFeedKey, setVideoFeedKey] = useState(0);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [liveStreams, setLiveStreams] = useState<LiveStreamRow[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverSearchResults, setDiscoverSearchResults] = useState<
    { id: string; handle: string | null; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [watchingStream, setWatchingStream] = useState<LiveStreamRow | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [isEditingDob, setIsEditingDob] = useState(false);
  const [dobDraft, setDobDraft] = useState('');
  const [isSavingDob, setIsSavingDob] = useState(false);
  const [dobError, setDobError] = useState<string | null>(null);

  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [regionDraft, setRegionDraft] = useState('');
  const [isSavingRegion, setIsSavingRegion] = useState(false);

  // صفحة بروفايل مستخدم آخر - تفتح فوق كل شي من أي نقطة بالتطبيق
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

  const supporterXp = useLevelXp(user?.id ?? null, 'supporter');
  const receiverXp = useLevelXp(user?.id ?? null, 'receiver');

  const [pkBattleId, setPkBattleId] = useState<string | null>(null);
  const [pkHostAName, setPkHostAName] = useState('');
  const [pkHostBName, setPkHostBName] = useState('');
  const [pkWinnerName, setPkWinnerName] = useState<string | null | undefined>(undefined);

  // القصص
  const [isStoryUploadOpen, setIsStoryUploadOpen] = useState(false);
  // يزيد بعد رفع ستوري جديدة عشان حلقة الستوري حول الصورة تتحدث فورًا
  const [storyRefreshKey, setStoryRefreshKey] = useState(0);
  // مين عنده ستوري خلال آخر 24 ساعة (للحلقة الملونة حول الصور بكل التطبيق)
  const [storyUserIds, setStoryUserIds] = useState<Set<string>>(new Set());
  // اللي أتابعهم - عشان شريط "فاتحين بث الحين" بتبويب متابعة
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // المحادثة الخاصة المفتوحة حالياً (لو موجودة تفتح فوق كل شي)
  const [openConversation, setOpenConversation] = useState<{
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
  } | null>(null);

  // المكالمة النشطة حالياً (صادرة أو واردة بعد القبول)
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    agoraChannel: string;
    callType: 'voice' | 'video';
    otherUserName: string;
    isIncoming: boolean;
  } | null>(null);

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

      setPkHostAName(profileA?.full_name || profileA?.handle || t('host_default'));
      setPkHostBName(profileB?.full_name || profileB?.handle || t('host_default'));
    };

    loadBattleNames();
  }, [pkBattleId]);

  useEffect(() => {
    const loadUser = async (sUser: any) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', sUser.id)
        .maybeSingle();
      setUser({
        id: sUser.id,
        name: (sUser.user_metadata?.username as string) || t('user_default'),
        email: sUser.email || '',
        avatar: DEFAULT_AVATAR,
        avatarUrl: profile?.avatar_url ?? null,
        accountNumber: profile?.account_number ?? null,
        dateOfBirth: profile?.date_of_birth ?? null,
        region: profile?.region ?? null,
        gender: profile?.gender ?? null,
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
        supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', sUser.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setUser({
              id: sUser.id,
              name: username,
              email,
              avatar: DEFAULT_AVATAR,
              avatarUrl: profile?.avatar_url ?? null,
              accountNumber: profile?.account_number ?? null,
              dateOfBirth: profile?.date_of_birth ?? null,
              region: profile?.region ?? null,
              gender: profile?.gender ?? null,
            });
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

  // بحث عن مستخدمين بشاشة اكتشف - يبحث بالاسم أو المعرّف، مع تأخير بسيط (debounce)
  useEffect(() => {
    const query = discoverSearch.trim();
    if (!query) {
      setDiscoverSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }
    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, full_name, avatar_url')
        .or(`handle.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);
      setDiscoverSearchResults(data || []);
      setIsSearchingUsers(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [discoverSearch]);

  // ===== الحضور: مين فاتح بث ومين عنده ستوري =====
  const liveByUser = useMemo(() => {
    const map: Record<string, LiveStreamRow> = {};
    for (const stream of liveStreams) map[stream.user_id] = stream;
    return map;
  }, [liveStreams]);

  const fetchStoryUsers = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('stories').select('user_id').gte('created_at', since);
    setStoryUserIds(new Set((data || []).map((r: { user_id: string }) => r.user_id)));
  };

  useEffect(() => {
    fetchStoryUsers();
    // تحديث دوري بسيط عشان الستوريات الجديدة/المنتهية تنعكس بدون إعادة فتح التطبيق
    const interval = window.setInterval(fetchStoryUsers, 2 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [storyRefreshKey]);

  // اللي أتابعهم - نجيبهم لما أفتح تبويب "متابعة"
  useEffect(() => {
    if (!user || feedMode !== 'following') return;
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(({ data }) => setFollowingIds((data || []).map((r) => r.following_id)));
  }, [user?.id, feedMode]);

  const followedLiveStreams = liveStreams.filter((stream) => followingIds.includes(stream.user_id));

  // دخول بث شخص من أي مكان (حلقة LIVE، إشعار، شريط المتابعة)
  const openLive = async (hostUserId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    let stream: LiveStreamRow | undefined = liveByUser[hostUserId];
    if (!stream) {
      // ممكن الإشعار يوصل قبل ما القائمة تتحدث - نجيبه مباشرة
      const { data } = await supabase.from('live_streams').select('*').eq('user_id', hostUserId).maybeSingle();
      stream = (data as LiveStreamRow) ?? undefined;
    }
    if (!stream) {
      alert(t('live_ended'));
      return;
    }
    setViewingProfileUserId(null);
    setWatchingStream(stream);
  };

  const handleVipStoreClick = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsVipStoreOpen(true);
  };

  // فتح بروفايل مستخدم - يتجاهل الطلب لو المستخدم ضغط على بروفايله هو نفسه من مكان عام
  const handleOpenProfile = (targetUserId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setViewingProfileUserId(targetUserId);
  };

  // بدء مكالمة صوتية/مرئية - قاعدة البيانات ترفضها لو ما كنتوا أصدقاء
  const startCallWith = async (
    conversationId: string,
    otherUserId: string,
    otherUserName: string,
    callType: 'voice' | 'video'
  ) => {
    const { data, error } = await supabase.rpc('start_dm_call', {
      p_conversation_id: conversationId,
      p_callee_id: otherUserId,
      p_call_type: callType,
    });

    if (error || !data || data.length === 0) {
      console.error('[JIX] فشل بدء المكالمة:', error);
      alert(error?.message || t('call_start_failed'));
      return;
    }

    const row = data[0] as { call_id: string; agora_channel: string };
    setActiveCall({
      callId: row.call_id,
      agoraChannel: row.agora_channel,
      callType,
      otherUserName,
      isIncoming: false,
    });
  };

  // بدء مكالمة من داخل محادثة خاصة مفتوحة
  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (!openConversation || !user) return;
    await startCallWith(
      openConversation.conversationId,
      openConversation.otherUserId,
      openConversation.otherUserName,
      callType
    );
  };

  // فتح محادثة (أو مكالمة مباشرة) مع صديق من صفحة بروفايله
  const handleOpenChatWithUser = async (
    otherUserId: string,
    otherUserName: string,
    callType?: 'voice' | 'video'
  ) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const { data: conversationId, error } = await supabase.rpc('get_or_create_dm_conversation', {
      p_other_user_id: otherUserId,
    });
    if (error || !conversationId) {
      alert(error?.message || t('chat_open_failed'));
      return;
    }

    setViewingProfileUserId(null);
    setOpenConversation({ conversationId: conversationId as string, otherUserId, otherUserName });
    if (callType) {
      await startCallWith(conversationId as string, otherUserId, otherUserName, callType);
    }
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
      setNameError(t('name_banned_word'));
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

  const handleStartEditDob = () => {
    if (!user) return;
    setDobDraft(user.dateOfBirth || '');
    setDobError(null);
    setIsEditingDob(true);
  };

  const handleSaveDob = async () => {
    if (!user || !dobDraft) return;

    const age = calculateAge(dobDraft);
    if (age < 18) {
      setDobError(t('age_min_18'));
      return;
    }

    setDobError(null);
    setIsSavingDob(true);
    try {
      const { error } = await supabase.from('profiles').update({ date_of_birth: dobDraft }).eq('id', user.id);
      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, dateOfBirth: dobDraft } : prev));
      setIsEditingDob(false);
    } catch (err) {
      setDobError((err as Error).message || t('dob_save_failed'));
    } finally {
      setIsSavingDob(false);
    }
  };

  const handleStartEditRegion = () => {
    if (!user) return;
    setRegionDraft(user.region || '');
    setIsEditingRegion(true);
  };

  const handleSaveRegion = async () => {
    if (!user) return;

    setIsSavingRegion(true);
    try {
      const newRegion = regionDraft.trim();
      const { error } = await supabase.from('profiles').update({ region: newRegion || null }).eq('id', user.id);
      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, region: newRegion || null } : prev));
      setIsEditingRegion(false);
    } catch (err) {
      console.error('[JIX] فشل تحديث المنطقة:', err);
    } finally {
      setIsSavingRegion(false);
    }
  };

  return (
    <JixPresenceProvider value={{ liveByUser, storyUserIds, openLive, refreshStories: fetchStoryUsers }}>
    <div className="h-[100dvh] max-w-[430px] mx-auto relative bg-[#0E0E12] text-white overflow-hidden">
      <JixLiveNotifier currentUserId={user?.id ?? null} />
      {screen === 'Home' && (
        <header className="absolute top-0 inset-x-0 z-30 flex flex-col bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="font-black text-sm">JIX</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFeedMode('following')}
                className={`text-xs font-black transition-opacity ${
                  feedMode === 'following' ? 'text-white opacity-100' : 'text-white/60 opacity-70'
                }`}
              >
                {t('feed_following')}
              </button>
              <button
                onClick={() => setFeedMode('latest')}
                className={`text-xs font-black transition-opacity ${
                  feedMode === 'latest' ? 'text-white opacity-100' : 'text-white/60 opacity-70'
                }`}
              >
                {t('feed_latest')}
              </button>
              <button
                onClick={() => setFeedMode('popular')}
                className={`text-xs font-black transition-opacity ${
                  feedMode === 'popular' ? 'text-white opacity-100' : 'text-white/60 opacity-70'
                }`}
              >
                {t('feed_popular')}
              </button>
            </div>
            {isCheckingSession ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
            ) : (
              <button
                onClick={() => setScreen('Discover')}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {feedMode === 'following' && followedLiveStreams.length > 0 && (
            <div className="flex gap-3 px-4 pb-2 pt-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {followedLiveStreams.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => openLive(stream.user_id)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-14"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full p-[2px] bg-[#FF2D55] animate-pulse">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white border-2 border-black">
                        {stream.username[0]}
                      </div>
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded bg-[#FF2D55] text-[7px] font-black text-white leading-tight">
                      LIVE
                    </span>
                  </div>
                  <span className="text-[10px] text-white truncate w-full text-center">{stream.username}</span>
                </button>
              ))}
            </div>
          )}
        </header>
      )}

      <div className={`absolute inset-0 pb-24 ${screen === 'Home' ? '' : 'hidden'}`}>
        <JixVideoFeed
          currentUserId={user?.id ?? null}
          refreshKey={videoFeedKey}
          feedMode={feedMode}
          onOpenProfile={handleOpenProfile}
        />
      </div>

      <div className={`absolute inset-0 pt-6 pb-24 px-4 overflow-y-auto ${screen === 'Discover' ? '' : 'hidden'}`}>
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-3 mb-6">
          <Search className="w-4 h-4 text-[#6B6B76]" />
          <input
            value={discoverSearch}
            onChange={(e) => setDiscoverSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-[#6B6B76] text-white"
          />
        </div>

        {discoverSearch.trim() ? (
          <div className="mb-6">
            {isSearchingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
              </div>
            ) : discoverSearchResults.length === 0 ? (
              <p className="text-xs text-[#6B6B76] text-center py-8">{t('search_no_results', { q: discoverSearch })}</p>
            ) : (
              <div className="space-y-2">
                {discoverSearchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleOpenProfile(result.id)}
                    className="w-full flex items-center gap-3 bg-white/5 rounded-2xl p-2.5 text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white shrink-0 overflow-hidden">
                      {result.avatar_url ? (
                        <img src={result.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        (result.full_name || result.handle || '?')[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{result.full_name || result.handle}</p>
                      {result.handle && <p className="text-[10px] text-[#6B6B76] truncate">@{result.handle}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <p className="text-xs font-bold text-[#6B6B76] mb-3">{t('live_now')}</p>

        {isLoadingLive ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
          </div>
        ) : liveStreams.length === 0 ? null : (
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

      <div className={`absolute inset-0 pt-6 pb-24 flex flex-col ${screen === 'Messages' ? '' : 'hidden'}`}>
        <h2 className="font-black text-lg mb-3 px-4">{t('messages')}</h2>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MessageCircle className="w-10 h-10 text-[#6B6B76] mb-3" />
            <p className="text-sm text-[#9A9A9E] mb-4">{t('login_to_see_messages')}</p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] rounded-2xl font-black text-sm"
            >
              {t('login')}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <JixDMList
              currentUserId={user.id}
              onOpenConversation={(conversationId, otherUserId, otherUserName) =>
                setOpenConversation({ conversationId, otherUserId, otherUserName })
              }
            />
          </div>
        )}
      </div>

      <div className={`absolute inset-0 pt-6 pb-24 px-4 overflow-y-auto ${screen === 'Profile' ? '' : 'hidden'}`}>
        {!user ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-10 h-10 text-[#6B6B76] mb-3" />
            <p className="text-sm text-[#9A9A9E] mb-4">
              {t('login_to_see_profile')}
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] rounded-2xl font-black text-sm"
            >
              {t('login')}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              {/* الأزرار (+ ستوري / كاميرا) برّا إطار المستوى - قبل كانت داخله وتنقص فما تنضغط */}
              <JixStoryRing
                userId={user.id}
                currentUserId={user.id}
                size={96}
                userName={user.name}
                avatarUrl={user.avatarUrl}
                onAddStory={() => setIsStoryUploadOpen(true)}
                bottomLeftSlot={
                  <label
                    htmlFor="jix-avatar-upload-input"
                    className="w-7 h-7 rounded-full bg-[#171923] border-2 border-[#0E0E12] flex items-center justify-center cursor-pointer"
                    aria-label={t('change_photo')}
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </label>
                }
              >
                <AvatarFrame
                  xp={Math.max(supporterXp, receiverXp)}
                  kind={supporterXp >= receiverXp ? 'supporter' : 'receiver'}
                  size={80}
                >
                  <JixAvatarUpload
                    userId={user.id}
                    currentAvatarUrl={user.avatarUrl}
                    fallbackLetter={user.name[0]}
                    inputId="jix-avatar-upload-input"
                    hideCameraButton
                    onUpdated={(newUrl) => setUser((prev) => (prev ? { ...prev, avatarUrl: newUrl } : prev))}
                  />
                </AvatarFrame>
              </JixStoryRing>
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
              <div className="flex items-center gap-2 mt-2">
                <LevelBadge xp={supporterXp} kind="supporter" size="md" />
                <LevelBadge xp={receiverXp} kind="receiver" size="md" />
                {user.accountNumber !== null && (
                  // نفس خانة شارة Lv بالضبط: خلفية رصاصية + نفس الحجم والارتفاع
                  <span
                    className="inline-flex items-center rounded-full font-black px-3 py-1.5 text-sm"
                    style={{ background: 'linear-gradient(90deg, #6B6B76, #4A4A52)' }}
                    dir="ltr"
                  >
                    <span
                      className="bg-clip-text text-transparent flex items-center"
                      style={{ backgroundImage: 'linear-gradient(90deg, #FF7A1A, #8B5CF6)', height: 30 }}
                    >
                      ID: {user.accountNumber}
                    </span>
                  </span>
                )}
              </div>

              <JixProfileStats userId={user.id} onOpenProfile={handleOpenProfile} />
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="px-4 py-3 bg-white/5 rounded-2xl">
                {isEditingDob ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                      <span className="text-xs font-bold text-gray-300">{t('dob')}</span>
                    </div>
                    <JixDobPicker value={dobDraft} onChange={setDobDraft} />
                    {dobError && <p className="text-[10px] text-red-400 mt-1.5">{dobError}</p>}
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => setIsEditingDob(false)}
                        className="flex-1 py-2 bg-white/5 text-white text-xs font-bold rounded-xl"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={handleSaveDob}
                        disabled={isSavingDob || !dobDraft}
                        className="flex-1 py-2 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isSavingDob ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {t('save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#8B5CF6]" />
                      <span className="text-xs text-gray-300">
                        {user.dateOfBirth ? t('dob_value', { date: user.dateOfBirth }) : t('add_dob')}
                      </span>
                    </div>
                    <button onClick={handleStartEditDob} className="p-1 rounded-full bg-white/5 shrink-0">
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#8B5CF6]" />
                  {isEditingRegion ? (
                    <input
                      value={regionDraft}
                      onChange={(e) => setRegionDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRegion()}
                      placeholder={t('region_placeholder')}
                      autoFocus
                      className="px-2 py-1 bg-[#171923] border border-gray-800 rounded-lg text-white text-xs focus:border-[#8B5CF6] outline-none w-36"
                    />
                  ) : (
                    <span className="text-xs text-gray-300">
                      {user.region || t('add_region')}
                    </span>
                  )}
                </div>
                {isEditingRegion ? (
                  <button
                    onClick={handleSaveRegion}
                    disabled={isSavingRegion}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center disabled:opacity-50 shrink-0"
                  >
                    {isSavingRegion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <button onClick={handleStartEditRegion} className="p-1 rounded-full bg-white/5 shrink-0">
                    <Pencil className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>

              {/* اختيار لغة التطبيق - الافتراضي لغة الجوال تلقائيًا */}
              <JixLanguagePicker />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                onClick={handleGoLive}
                className="flex flex-col items-center gap-1.5 py-3 bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] rounded-xl"
              >
                <Radio className="w-5 h-5" />
                <span className="text-[10px] font-bold">{t('go_live')}</span>
              </button>
              <button
                onClick={handleVipStoreClick}
                className="flex flex-col items-center gap-1.5 py-3 bg-white/5 rounded-xl"
              >
                <Crown className="w-5 h-5 text-[#F5B93E]" />
                <span className="text-[10px] font-bold">{t('vip_numbers')}</span>
              </button>
              <button
                onClick={handleUploadClick}
                className="flex flex-col items-center gap-1.5 py-3 bg-white/5 rounded-xl"
              >
                <Video className="w-5 h-5" />
                <span className="text-[10px] font-bold">{t('upload_video')}</span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 bg-white/5 text-red-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> {t('logout')}
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
          <span className="text-[10px] font-bold">{t('nav_home')}</span>
        </button>
        <button
          onClick={() => setScreen('Discover')}
          className={`flex flex-col items-center gap-1 ${screen === 'Discover' ? 'text-white' : 'text-[#B0B0B6]'}`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-bold">{t('nav_discover')}</span>
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
          <span className="text-[10px] font-bold">{t('messages')}</span>
        </button>
        <button
          onClick={() => setScreen('Profile')}
          className={`flex flex-col items-center gap-1 ${screen === 'Profile' ? 'text-white' : 'text-[#B0B0B6]'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">{t('nav_profile')}</span>
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
          currentUserId={user?.id ?? null}
          onOpenProfile={handleOpenProfile}
        />
      )}

      <JixVipStore
        isOpen={isVipStoreOpen}
        onClose={() => setIsVipStoreOpen(false)}
        currentUserId={user?.id ?? null}
      />

      {/* صفحة بروفايل مستخدم آخر - تفتح فوق كل شي */}
      {viewingProfileUserId && (
        <JixUserProfile
          isOpen={!!viewingProfileUserId}
          onClose={() => setViewingProfileUserId(null)}
          userId={viewingProfileUserId}
          currentUserId={user?.id ?? null}
          onOpenChat={handleOpenChatWithUser}
          onOpenProfile={handleOpenProfile}
        />
      )}

      <JixPKChallengeNotification
        currentUserId={user?.id ?? null}
        onAccepted={(battleId) => setPkBattleId(battleId)}
      />

      <JixStoryUpload
        isOpen={isStoryUploadOpen}
        onClose={() => setIsStoryUploadOpen(false)}
        onUploaded={() => {
          setIsStoryUploadOpen(false);
          setStoryRefreshKey((k) => k + 1);
        }}
      />

      {/* شاشة محادثة خاصة مفتوحة - تفتح فوق كل شي */}
      {openConversation && user && (
        <JixDMConversation
          conversationId={openConversation.conversationId}
          currentUserId={user.id}
          otherUserId={openConversation.otherUserId}
          otherUserName={openConversation.otherUserName}
          onBack={() => setOpenConversation(null)}
          onStartCall={handleStartCall}
        />
      )}

      {/* إشعار مكالمة واردة - يظهر بأي مكان بالتطبيق */}
      <JixDMCallNotification
        currentUserId={user?.id ?? null}
        onAccepted={(call) =>
          setActiveCall({
            callId: call.callId,
            agoraChannel: call.agoraChannel,
            callType: call.callType,
            otherUserName: call.callerName,
            isIncoming: true,
          })
        }
      />

      {/* شاشة المكالمة النشطة - صوتية أو مرئية */}
      {activeCall && user && (
        <JixDMCall
          callId={activeCall.callId}
          agoraChannel={activeCall.agoraChannel}
          callType={activeCall.callType}
          otherUserName={activeCall.otherUserName}
          currentUserId={user.id}
          isIncoming={activeCall.isIncoming}
          onEnd={() => setActiveCall(null)}
        />
      )}

      {pkBattleId && pkWinnerName === undefined && (
        <JixPKBattleView
          battleId={pkBattleId}
          hostAName={pkHostAName}
          hostBName={pkHostBName}
          onBattleEnded={(winner) => setPkWinnerName(winner)}
        />
      )}

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
    </JixPresenceProvider>
  );
}

export default App;
