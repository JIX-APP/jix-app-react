import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Camera, Image, Users, UserX, VolumeX, Coins } from 'lucide-react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { supabase } from './supabaseClient';
import { jixAudio } from './jixAudioFx';
import { GIFTS_CATALOG, GiftIcon, giftLegendaryEnterStyle, giftPopStyle } from './JixGiftIcons';
import { LevelBadge, useLevelXp } from './JixLevelSystem';

interface Viewer {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
}

interface JixStreamStudioProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; avatar: string };
}

interface GiftToast {
  id: string;
  giftId: string;
  coinCost: number;
  rarity: string;
}

const AGORA_TOKEN_URL = 'https://wfvhzlpvtgnydhmsxcqr.supabase.co/functions/v1/agora-token';

export const JixStreamStudio: React.FC<JixStreamStudioProps> = ({ isOpen, onClose, currentUser }) => {
  const [streamMode, setStreamMode] = useState<'camera' | 'avatar'>('camera');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [giftToast, setGiftToast] = useState<GiftToast | null>(null);
  const [coinsEarnedThisStream, setCoinsEarnedThisStream] = useState(0);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const hostReceiverXp = useLevelXp(hostUserId, 'receiver');
  const [viewers, setViewers] = useState<Viewer[]>([
    { id: '1', name: 'سلطان VIP', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isMuted: false },
    { id: '2', name: 'الزعيم 505', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isMuted: false },
    { id: '3', name: 'أميرة الجواهر', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', isMuted: false },
  ]);

  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const channelNameRef = useRef<string | null>(null);

  const getChannelName = async (): Promise<string | null> => {
    if (channelNameRef.current) return channelNameRef.current;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;
    const name = `jix-${userId}`.slice(0, 64);
    channelNameRef.current = name;
    return name;
  };

  const fetchAgoraToken = async (channelName: string): Promise<{ token: string; appId: string; uid: number } | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const anonKey = (supabase as any).supabaseKey as string;

      const response = await fetch(AGORA_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${accessToken ?? anonKey}`,
        },
        body: JSON.stringify({
          channelName,
          uid: Math.floor(Math.random() * 100000),
          role: 'publisher',
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('[JIX] فشل جلب توكن Agora:', err);
      setConnectionError(`خطأ: ${(err as Error).message || 'غير معروف'}`);
      return null;
    }
  };

  // تسجيل البث في قاعدة البيانات، ونحتفظ بمعرّف الصف (id) عشان نربطه بأحداث الهدايا
  const registerLiveRow = async (channelName: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      await supabase.from('live_streams').delete().eq('user_id', userId);
      const { data } = await supabase
        .from('live_streams')
        .insert({ user_id: userId, username: currentUser.name, channel_name: channelName })
        .select('id')
        .single();

      setLiveId(data?.id ?? null);
    } catch (err) {
      console.error('[JIX] فشل تسجيل البث في قاعدة البيانات:', err);
    }
  };

  const unregisterLiveRow = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      await supabase.from('live_streams').delete().eq('user_id', userId);
      setLiveId(null);
    } catch (err) {
      console.error('[JIX] فشل حذف سجل البث:', err);
    }
  };

  const startLiveStream = async () => {
    setConnectionError(null);

    const channelName = await getChannelName();
    if (!channelName) {
      setConnectionError('خطأ: لم يتم العثور على جلسة الدخول');
      return;
    }

    const tokenData = await fetchAgoraToken(channelName);
    if (!tokenData) return;

    try {
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      client.setClientRole('host');
      clientRef.current = client;

      await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      if (videoRef.current) {
        videoTrack.play(videoRef.current);
      }

      await client.publish([audioTrack, videoTrack]);
      setIsLive(true);
      await registerLiveRow(channelName);
    } catch (err) {
      console.error('[JIX] فشل بدء البث:', err);
      setConnectionError(`خطأ: ${(err as Error).message || 'غير معروف'}`);
      setStreamMode('avatar');
    }
  };

  const stopLiveStream = async () => {
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    await clientRef.current?.leave();
    clientRef.current = null;
    setIsLive(false);
    await unregisterLiveRow();
  };

  useEffect(() => {
    if (isOpen && streamMode === 'camera' && !isLive) {
      startLiveStream();
    }
    supabase.auth.getSession().then(({ data }) => {
      setHostUserId(data.session?.user.id ?? null);
    });
    return () => {
      if (!isOpen) stopLiveStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, streamMode]);

  // الاستماع للهدايا الواردة على بثي (بعد ما نعرف liveId فعليًا) وتشغيل صوتها
  useEffect(() => {
    if (!isOpen || !liveId) return;

    const subscription = supabase
      .channel(`host_gift_events_${liveId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gift_events', filter: `live_id=eq.${liveId}` },
        (payload) => {
          const row = payload.new as { gift_id: string; coin_cost: number };
          const def = GIFTS_CATALOG.find((g) => g.id === row.gift_id);
          jixAudio.playGiftEffect(row.gift_id, def?.rarity, def?.archetype);
          setCoinsEarnedThisStream((prev) => prev + row.coin_cost);
          setGiftToast({
            id: crypto.randomUUID(),
            giftId: row.gift_id,
            coinCost: row.coin_cost,
            rarity: def?.rarity || 'common',
          });
          setTimeout(() => setGiftToast(null), def?.rarity === 'mythic' || def?.rarity === 'legendary' ? 4500 : 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isOpen, liveId]);

  const handleClose = async () => {
    await stopLiveStream();
    onClose();
  };

  if (!isOpen) return null;

  const toggleMic = () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(isMicMuted);
    }
    setIsMicMuted(!isMicMuted);
  };

  const toggleMuteViewer = (id: string) => {
    setViewers((prev) => prev.map((v) => (v.id === id ? { ...v, isMuted: !v.isMuted } : v)));
  };

  const kickViewer = (id: string) => {
    setViewers((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-4xl h-[90vh] bg-[#0d0f17] border border-gray-800 rounded-3xl flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {connectionError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-4 py-2 rounded-full z-10">
              {connectionError}
            </div>
          )}

          {streamMode === 'camera' ? (
            <div ref={videoRef} className="w-full h-full" />
          ) : (
            <div className="text-center p-8">
              <img src={currentUser.avatar} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-[#8B5CF6] mx-auto shadow-2xl animate-pulse mb-4" />
              <h3 className="text-xl font-bold">{currentUser.name}</h3>
              <p className="text-[#F5B93E] text-xs mt-1">بث بصورة ثابتة (Avatar Mode)</p>
            </div>
          )}

          {isLive && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
              <span className="bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                مباشر الآن
              </span>
              <LevelBadge xp={hostReceiverXp} kind="receiver" />
            </div>
          )}

          {isLive && (
            <div className="absolute top-4 left-4 bg-black/60 text-[#F5B93E] text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
              <Coins className="w-3.5 h-3.5" /> {coinsEarnedThisStream} كوين
            </div>
          )}

          {giftToast && (() => {
            const def = GIFTS_CATALOG.find((g) => g.id === giftToast.giftId);
            const isBig = giftToast.rarity === 'legendary' || giftToast.rarity === 'mythic';
            if (!def) return null;
            return isBig ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40">
                <div style={giftLegendaryEnterStyle}>
                  <GiftIcon gift={def} size={140} spinning />
                </div>
                <p className="mt-3 font-black text-lg text-[#F5B93E]">{def.name}!</p>
                <p className="text-xs font-bold text-white">هدية بقيمة {giftToast.coinCost} كوين</p>
              </div>
            ) : (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] px-4 py-2 rounded-full flex items-center gap-2 z-20">
                <div style={giftPopStyle}>
                  <GiftIcon gift={def} size={24} />
                </div>
                <span className="text-xs font-black text-white">هدية {def.name} بقيمة {giftToast.coinCost} كوين!</span>
              </div>
            );
          })()}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <button onClick={toggleMic} className={`p-3 rounded-full ${isMicMuted ? 'bg-red-600' : 'bg-white/10'}`}>
              {isMicMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={async () => {
                if (streamMode === 'camera') {
                  await stopLiveStream();
                  setStreamMode('avatar');
                } else {
                  setStreamMode('camera');
                }
              }}
              className="p-3 rounded-full bg-white/10"
            >
              {streamMode === 'camera' ? <Image className="w-5 h-5 text-[#F5B93E]" /> : <Camera className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>

        <div className="w-full md:w-80 bg-[#12141f] border-t md:border-t-0 md:border-r border-gray-800 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8B5CF6]" /> إدارة البث والفانزات
            </h4>
            <button onClick={handleClose} className="p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            <p className="text-xs text-gray-400">قائمة المشاهدين ({viewers.length}):</p>
            {viewers.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-gray-800">
                <div className="flex items-center gap-2">
                  <img src={v.avatar} alt={v.name} className="w-8 h-8 rounded-full" />
                  <span className="text-xs font-bold">{v.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleMuteViewer(v.id)} title={v.isMuted ? 'إلغاء كتم الكومنتات' : 'كتم الكومنتات'} className={`p-1.5 rounded-lg ${v.isMuted ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-gray-800 text-gray-300'}`}>
                    <VolumeX className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => kickViewer(v.id)} title="طرد نهائي من البث" className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition">
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
