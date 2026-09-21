import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Camera, Image, Users, UserX, VolumeX, Coins, ChevronDown, Shield, UserPlus2, Check, Bell } from 'lucide-react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { supabase } from './supabaseClient';
import { jixAudio } from './jixAudioFx';
import { GIFTS_CATALOG, GiftIcon, giftLegendaryEnterStyle, giftPopStyle } from './JixGiftIcons';
import { LevelBadge, useLevelXp } from './JixLevelSystem';
import { JixLiveComments } from './JixLiveComments';
import { JixModeratorManager } from './JixModeratorManager';
import { JixCohostSlot } from './JixCohostSlot';
import { JixLiveMvpBadge } from './JixMvpBadge';

interface Viewer {
  id: string;
  name: string;
  isMuted: boolean;
}

interface CohostSlotData {
  slot: number;
  guestId: string;
  guestName: string;
  agoraUid: number | null;
}

interface CohostRequest {
  requesterId: string;
  requesterName: string;
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
  const [isSwitching, setIsSwitching] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [giftToast, setGiftToast] = useState<GiftToast | null>(null);
  const [coinsEarnedThisStream, setCoinsEarnedThisStream] = useState(0);
  const [liveId, setLiveId] = useState<string | null>(null);
  const moderationChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [isViewersOpen, setIsViewersOpen] = useState(false);
  const [isModeratorManagerOpen, setIsModeratorManagerOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const hostReceiverXp = useLevelXp(hostUserId, 'receiver');
  const [viewers, setViewers] = useState<Viewer[]>([]);

  // ---- نظام القستات (Co-host) ----
  const [cohostSlots, setCohostSlots] = useState<(CohostSlotData | null)[]>([null, null, null]);
  const [cohostRequests, setCohostRequests] = useState<CohostRequest[]>([]);
  const [remoteUsersByUid, setRemoteUsersByUid] = useState<Record<number, IAgoraRTCRemoteUser>>({});

  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const channelNameRef = useRef<string | null>(null);
  const isBusyRef = useRef(false);

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

  const registerLiveRow = async (channelName: string, hostAgoraUid: number) => {
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

      if (data?.id) {
        await supabase.rpc('set_host_agora_uid', { p_live_id: data.id, p_agora_uid: hostAgoraUid });
      }
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
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setConnectionError(null);

    try {
      const channelName = await getChannelName();
      if (!channelName) {
        setConnectionError('خطأ: لم يتم العثور على جلسة الدخول');
        return;
      }

      const tokenData = await fetchAgoraToken(channelName);
      if (!tokenData) return;

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      client.setClientRole('host');
      clientRef.current = client;

      // نستقبل فيديو القستات كمان - نفس اتصال المذيع يقدر يشترك بفيديوهات ثانية بجانب نشره هو
      client.on('user-published', async (remoteUser: IAgoraRTCRemoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        setRemoteUsersByUid((prev) => ({ ...prev, [remoteUser.uid as number]: remoteUser }));
        if (mediaType === 'audio') {
          remoteUser.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (remoteUser) => {
        setRemoteUsersByUid((prev) => {
          const next = { ...prev };
          delete next[remoteUser.uid as number];
          return next;
        });
      });

      await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      if (videoRef.current) {
        videoTrack.play(videoRef.current);

        // إصلاح خلل معروف بمتصفح Safari على iOS: المتصفح أحياناً ما يرسم
        // أول فريمات الكاميرا فعلياً حتى لو المسار شغال، ويضل الفيديو
        // عالق على إطار أسود لين يصير أي حدث يجبره يعيد الرسم (زي تبديل
        // الوضع يدوياً). هذا نفس الأثر لكن تلقائي وغير محسوس للمستخدم.
        setTimeout(() => {
          videoTrack.setEnabled(false);
          setTimeout(() => {
            videoTrack.setEnabled(true);
          }, 100);
        }, 800);
      }

      await client.publish([audioTrack, videoTrack]);
      setIsLive(true);
      await registerLiveRow(channelName, tokenData.uid);
    } catch (err) {
      console.error('[JIX] فشل بدء البث:', err);
      setConnectionError(`خطأ: ${(err as Error).message || 'غير معروف'}`);
      setStreamMode('avatar');
    } finally {
      isBusyRef.current = false;
    }
  };

  const stopLiveStream = async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;

    try {
      const client = clientRef.current;
      const tracks = [localAudioTrackRef.current, localVideoTrackRef.current].filter(Boolean) as any[];

      if (client && tracks.length > 0) {
        try {
          await client.unpublish(tracks);
        } catch {
          // تجاهل
        }
      }

      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.close();
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;

      if (client) {
        try {
          await client.leave();
        } catch {
          // تجاهل
        }
      }
      clientRef.current = null;
      setIsLive(false);
      await unregisterLiveRow();
    } finally {
      isBusyRef.current = false;
    }
  };

  useEffect(() => {
    if (isOpen && streamMode === 'camera' && !isLive && !isBusyRef.current) {
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

  useEffect(() => {
    if (!isOpen || !liveId) return;

    const presenceChannel = supabase.channel(`presence_${liveId}`, {
      config: { presence: { key: 'host' } },
    });

    const syncViewers = () => {
      const state = presenceChannel.presenceState<{ id: string; name: string }>();
      const list: Viewer[] = [];
      Object.values(state).forEach((entries) => {
        entries.forEach((entry) => {
          list.push({ id: entry.id, name: entry.name, isMuted: false });
        });
      });
      setViewers((prev) =>
        list.map((v) => ({ ...v, isMuted: prev.find((p) => p.id === v.id)?.isMuted ?? false }))
      );
    };

    presenceChannel
      .on('presence', { event: 'sync' }, syncViewers)
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [isOpen, liveId]);

  useEffect(() => {
    if (!isOpen || !hostUserId) return;

    const channel = supabase.channel(`live_comments_${`jix-${hostUserId}`.slice(0, 64)}`, {
      config: { broadcast: { self: true } },
    });
    channel.subscribe();
    moderationChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      moderationChannelRef.current = null;
    };
  }, [isOpen, hostUserId]);

  // جلب وتتبع القستات الحاليين لحظيًا
  useEffect(() => {
    if (!isOpen || !liveId) return;

    const loadSlots = async () => {
      const { data } = await supabase
        .from('stream_cohosts')
        .select('slot, guest_id, agora_uid, profiles(full_name, handle)')
        .eq('live_id', liveId);

      const next: (CohostSlotData | null)[] = [null, null, null];
      (data || []).forEach((row: any) => {
        next[row.slot - 1] = {
          slot: row.slot,
          guestId: row.guest_id,
          guestName: row.profiles?.full_name || row.profiles?.handle || 'ضيف',
          agoraUid: row.agora_uid,
        };
      });
      setCohostSlots(next);
    };

    loadSlots();

    const channel = supabase
      .channel(`stream_cohosts_host_${liveId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stream_cohosts', filter: `live_id=eq.${liveId}` },
        () => loadSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, liveId]);

  // جلب وتتبع طلبات الصعود الواردة لحظيًا
  useEffect(() => {
    if (!isOpen || !liveId) return;

    const loadRequests = async () => {
      const { data } = await supabase
        .from('cohost_requests')
        .select('requester_id, profiles(full_name, handle)')
        .eq('live_id', liveId)
        .eq('status', 'pending');

      const list: CohostRequest[] = (data || []).map((row: any) => ({
        requesterId: row.requester_id,
        requesterName: row.profiles?.full_name || row.profiles?.handle || 'مستخدم JIX',
      }));
      setCohostRequests(list);
    };

    loadRequests();

    const channel = supabase
      .channel(`cohost_requests_${liveId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cohost_requests', filter: `live_id=eq.${liveId}` },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, liveId]);

  const handleClose = async () => {
    await stopLiveStream();
    onClose();
  };

  const handleModeSwitch = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      if (streamMode === 'camera') {
        await stopLiveStream();
        setStreamMode('avatar');
      } else {
        setStreamMode('camera');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  if (!isOpen) return null;

  const toggleMic = () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(isMicMuted);
    }
    setIsMicMuted(!isMicMuted);
  };

  const toggleMuteViewer = async (id: string) => {
    const viewer = viewers.find((v) => v.id === id);
    if (!viewer || !liveId || !hostUserId) return;

    if (viewer.isMuted) return;

    const { error } = await supabase.rpc('mute_stream_user', {
      p_live_id: liveId,
      p_host_id: hostUserId,
      p_target_user_id: id,
    });

    if (!error) {
      setViewers((prev) => prev.map((v) => (v.id === id ? { ...v, isMuted: true } : v)));
      moderationChannelRef.current?.send({
        type: 'broadcast',
        event: 'moderation',
        payload: { action: 'mute', targetUserId: id },
      });
    }
  };

  const kickViewer = async (id: string) => {
    if (!liveId || !hostUserId) return;

    const { error } = await supabase.rpc('kick_stream_user_permanent', {
      p_live_id: liveId,
      p_host_id: hostUserId,
      p_target_user_id: id,
    });

    if (!error) {
      setViewers((prev) => prev.filter((v) => v.id !== id));
      moderationChannelRef.current?.send({
        type: 'broadcast',
        event: 'moderation',
        payload: { action: 'kick_permanent', targetUserId: id },
      });
    }
  };

  const findFreeSlot = (): number | null => {
    for (let i = 0; i < 3; i++) {
      if (!cohostSlots[i]) return i + 1;
    }
    return null;
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!liveId) return;
    const freeSlot = findFreeSlot();
    if (!freeSlot) return; // ما فيه مكان فاضي

    await supabase.rpc('accept_cohost', { p_live_id: liveId, p_guest_id: requesterId, p_slot: freeSlot });
  };

  const handleRejectRequest = async (requesterId: string) => {
    if (!liveId) return;
    await supabase.rpc('reject_cohost_request', { p_live_id: liveId, p_requester_id: requesterId });
  };

  const handleInviteViewer = async (viewerId: string) => {
    if (!liveId) return;
    const freeSlot = findFreeSlot();
    if (!freeSlot) return;

    await supabase.rpc('accept_cohost', { p_live_id: liveId, p_guest_id: viewerId, p_slot: freeSlot });
    setIsViewersOpen(false);
  };

  const handleRemoveCohost = async (guestId: string) => {
    if (!liveId) return;
    await supabase.rpc('remove_cohost', { p_live_id: liveId, p_guest_id: guestId });
  };

  const hasCohosts = cohostSlots.some((s) => s !== null);
  const isSlotTakenByViewer = (id: string) => cohostSlots.some((s) => s?.guestId === id);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className={`relative ${hasCohosts ? 'h-1/2' : 'flex-1'} flex items-center justify-center`}>
        {streamMode === 'camera' ? (
          <div ref={videoRef} className="w-full h-full" />
        ) : (
          <div className="text-center p-8">
            <img src={currentUser.avatar} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-[#8B5CF6] mx-auto shadow-2xl animate-pulse mb-4" />
            <h3 className="text-xl font-bold text-white">{currentUser.name}</h3>
            <p className="text-[#F5B93E] text-xs mt-1">بث بصورة ثابتة (Avatar Mode)</p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {connectionError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-4 py-2 rounded-full z-20 max-w-[85%] text-center">
            {connectionError}
          </div>
        )}

        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
          <button onClick={() => setShowExitConfirm(true)} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                مباشر الآن
              </span>
            )}
            <LevelBadge xp={hostReceiverXp} kind="receiver" />
            {liveId && <JixLiveMvpBadge liveId={liveId} size={32} />}
          </div>

          {isLive && (
            <div className="bg-black/60 text-[#F5B93E] text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> {coinsEarnedThisStream}
            </div>
          )}
        </div>

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
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] px-4 py-2 rounded-full flex items-center gap-2 z-20">
              <div style={giftPopStyle}>
                <GiftIcon gift={def} size={24} />
              </div>
              <span className="text-xs font-black text-white">هدية {def.name} بقيمة {giftToast.coinCost} كوين!</span>
            </div>
          );
        })()}

        <button
          onClick={() => setIsViewersOpen(true)}
          className="absolute bottom-24 left-4 flex items-center gap-1.5 bg-black/50 px-3 py-2 rounded-full z-10"
        >
          <Users className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white">{viewers.length}</span>
        </button>

        {isLive && (
          <button
            onClick={() => setIsModeratorManagerOpen(true)}
            className="absolute bottom-24 left-20 flex items-center gap-1.5 bg-black/50 px-3 py-2 rounded-full z-10"
          >
            <Shield className="w-4 h-4 text-[#8B5CF6]" />
          </button>
        )}

        {/* زر طلبات الصعود - مع عداد لو فيه طلبات جديدة */}
        {isLive && (
          <button
            onClick={() => setIsRequestsOpen(true)}
            className="absolute bottom-24 left-36 flex items-center gap-1.5 bg-black/50 px-3 py-2 rounded-full z-10"
          >
            <Bell className="w-4 h-4 text-[#F5B93E]" />
            {cohostRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-[9px] font-black flex items-center justify-center text-white">
                {cohostRequests.length}
              </span>
            )}
          </button>
        )}

        {isLive && hostUserId && (
          <JixLiveComments
            channelName={`jix-${hostUserId}`.slice(0, 64)}
            liveId={liveId ?? ''}
            hostId={hostUserId}
            currentUserId={hostUserId}
            currentUserName={currentUser.name}
            isHost={true}
            isModerator={false}
          />
        )}

        <JixModeratorManager
          isOpen={isModeratorManagerOpen}
          onClose={() => setIsModeratorManagerOpen(false)}
          hostId={hostUserId ?? ''}
        />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-10">
          <button onClick={toggleMic} className={`p-3 rounded-full ${isMicMuted ? 'bg-red-600' : 'bg-white/10'}`}>
            {isMicMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
          </button>
          <button onClick={handleModeSwitch} disabled={isSwitching} className="p-3 rounded-full bg-white/10 disabled:opacity-50">
            {streamMode === 'camera' ? <Image className="w-5 h-5 text-[#F5B93E]" /> : <Camera className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>

        {/* قائمة المشاهدين المنزلقة من الأسفل */}
        {isViewersOpen && (
          <div className="absolute inset-0 z-40 flex items-end" onClick={() => setIsViewersOpen(false)}>
            <div
              className="w-full bg-[#12141f] border-t border-gray-800 rounded-t-3xl p-4 max-h-[60vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <h4 className="font-bold text-sm flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-[#8B5CF6]" /> إدارة البث والفانزات
                </h4>
                <button onClick={() => setIsViewersOpen(false)} className="p-1 text-gray-400 hover:text-white">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                <p className="text-xs text-gray-400">قائمة المشاهدين ({viewers.length}):</p>
                {viewers.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">ما فيه مشاهدين حاليًا</p>
                ) : (
                  viewers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-[10px] font-black text-white">
                          {v.name[0]}
                        </div>
                        <span className="text-xs font-bold text-white">{v.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isSlotTakenByViewer(v.id) && (
                          <button
                            onClick={() => handleInviteViewer(v.id)}
                            disabled={!findFreeSlot()}
                            title="دعوة كضيف بالبث"
                            className="p-1.5 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] disabled:opacity-30"
                          >
                            <UserPlus2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => toggleMuteViewer(v.id)} disabled={v.isMuted} title={v.isMuted ? 'مكتوم بالفعل' : 'كتم الكومنتات'} className={`p-1.5 rounded-lg disabled:opacity-50 ${v.isMuted ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-gray-800 text-gray-300'}`}>
                          <VolumeX className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => kickViewer(v.id)} title="طرد نهائي من البث" className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition">
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* قائمة طلبات الصعود */}
        {isRequestsOpen && (
          <div className="absolute inset-0 z-40 flex items-end" onClick={() => setIsRequestsOpen(false)}>
            <div
              className="w-full bg-[#12141f] border-t border-gray-800 rounded-t-3xl p-4 max-h-[60vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <h4 className="font-bold text-sm flex items-center gap-2 text-white">
                  <Bell className="w-4 h-4 text-[#F5B93E]" /> طلبات الصعود كقست
                </h4>
                <button onClick={() => setIsRequestsOpen(false)} className="p-1 text-gray-400 hover:text-white">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {cohostRequests.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">ما فيه طلبات حاليًا</p>
                ) : (
                  cohostRequests.map((r) => (
                    <div key={r.requesterId} className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-gray-800">
                      <span className="text-xs font-bold text-white">{r.requesterName}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcceptRequest(r.requesterId)}
                          disabled={!findFreeSlot()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white text-[10px] font-bold disabled:opacity-30"
                        >
                          <Check className="w-3 h-3" /> قبول
                        </button>
                        <button
                          onClick={() => handleRejectRequest(r.requesterId)}
                          className="px-3 py-1.5 rounded-full bg-white/10 text-white text-[10px] font-bold"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showExitConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm bg-[#12141f] border border-gray-800 rounded-3xl p-6">
              <h3 className="font-black text-sm text-white mb-2">إنهاء البث المباشر؟</h3>
              <p className="text-xs text-gray-400 mb-5">
                هل أنت متأكد إنك تبي تخرج وتنهي البث؟ كل من يشاهدك الآن بينقطع اتصاله.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-white/5 text-white font-bold text-sm rounded-2xl"
                >
                  البقاء بالبث
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    handleClose();
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-black text-sm rounded-2xl"
                >
                  إنهاء البث
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* شبكة القستات الثلاثة - يشوفها المذيع بنفس شاشته */}
      {hasCohosts && (
        <div className="h-1/2 grid grid-cols-3 gap-1 p-1 bg-[#0a0a0e]">
          {cohostSlots.map((slot, i) => {
            if (!slot) {
              return (
                <div key={i} className="bg-[#1a1c26] rounded-lg flex items-center justify-center">
                  <span className="text-[9px] text-gray-600">مكان فاضي</span>
                </div>
              );
            }

            return (
              <JixCohostSlot
                key={i}
                name={slot.guestName}
                remoteUser={slot.agoraUid ? remoteUsersByUid[slot.agoraUid] : undefined}
                canRemove={true}
                onRemove={() => handleRemoveCohost(slot.guestId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
