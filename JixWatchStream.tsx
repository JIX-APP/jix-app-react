import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, UserPlus2, LogOut, Trophy, Users } from 'lucide-react';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { supabase } from './supabaseClient';
import { JixGiftBar } from './JixGiftBar';
import { jixAudio } from './jixAudioFx';
import { GIFTS_CATALOG, GiftIcon, giftLegendaryEnterStyle, giftPopStyle } from './JixGiftIcons';
import { LevelBadge, useLevelXp } from './JixLevelSystem';
import { JixReportButton } from './JixReportButton';
import { JixPKChallengeButton } from './JixPKChallengeButton';
import { JixLiveComments } from './JixLiveComments';
import { JixCohostSlot } from './JixCohostSlot';
import { JixTopChart } from './JixTopChart';

interface JixWatchStreamProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
  channelName: string;
  hostUsername: string;
  hostId: string;
  currentUserId?: string | null;
  onPKBattleStarted?: (battleId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

interface GiftToast {
  id: string;
  giftId: string;
  rarity: string;
}

interface CohostSlotData {
  slot: number;
  guestId: string;
  guestName: string;
  agoraUid: number | null;
}

const AGORA_TOKEN_URL = 'https://wfvhzlpvtgnydhmsxcqr.supabase.co/functions/v1/agora-token';

export const JixWatchStream: React.FC<JixWatchStreamProps> = ({
  isOpen,
  onClose,
  liveId,
  channelName,
  hostUsername,
  hostId,
  currentUserId,
  onPKBattleStarted,
  onOpenProfile,
}) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giftToast, setGiftToast] = useState<GiftToast | null>(null);
  const [viewerName, setViewerName] = useState<string>('مستخدم JIX');
  const [isModerator, setIsModerator] = useState(false);
  // زر الكأس (التوبات) + عدد المشاهدين - نفس اللي عند المذيع
  const [isTopChartOpen, setIsTopChartOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [kickedNotice, setKickedNotice] = useState<{ permanent: boolean } | null>(null);

  const [cohostSlots, setCohostSlots] = useState<(CohostSlotData | null)[]>([null, null, null]);
  const [requestSent, setRequestSent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [remoteUsersByUid, setRemoteUsersByUid] = useState<Record<number, IAgoraRTCRemoteUser>>({});
  const cohostPublishClientRef = useRef<IAgoraRTCClient | null>(null);
  const cohostLocalVideoTrackRef = useRef<any>(null);
  const cohostLocalAudioTrackRef = useRef<any>(null);

  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const hostReceiverXp = useLevelXp(hostId, 'receiver');

  const isMeCohost = cohostSlots.some((s) => s?.guestId === currentUserId);

  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('profiles')
      .select('full_name, handle')
      .eq('id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        setViewerName(data?.full_name || data?.handle || 'مستخدم JIX');
      });
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || currentUserId === hostId) return;
    supabase
      .from('stream_moderators')
      .select('id')
      .eq('host_id', hostId)
      .eq('moderator_id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        setIsModerator(!!data);
      });
  }, [currentUserId, hostId]);

  useEffect(() => {
    if (!isOpen || !liveId || !currentUserId) return;

    const presenceChannel = supabase.channel(`presence_${liveId}`, {
      config: { presence: { key: currentUserId } },
    });

    // عدد المشاهدين: نعد كل الموجودين بالبث (ما عدا المذيع)
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const keys = Object.keys(presenceChannel.presenceState());
      setViewerCount(keys.filter((k) => k !== 'host').length);
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ id: currentUserId, name: viewerName });
      }
    });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [isOpen, liveId, currentUserId, viewerName]);

  const handleKicked = (permanent: boolean) => {
    clientRef.current?.leave();
    setKickedNotice({ permanent });
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsConnecting(true);
    setError(null);

    const join = async () => {
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
            role: 'subscriber',
          }),
        });

        if (!response.ok) {
          throw new Error('تعذر الحصول على إذن مشاهدة البث');
        }

        const tokenData = await response.json();
        if (cancelled) return;

        const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
        client.setClientRole('audience');
        clientRef.current = client;

        client.on('user-published', async (remoteUser: IAgoraRTCRemoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);

          setRemoteUsersByUid((prev) => ({ ...prev, [remoteUser.uid as number]: remoteUser }));

          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
          }
          setIsConnecting(false);
        });

        client.on('user-unpublished', (remoteUser) => {
          setRemoteUsersByUid((prev) => {
            const next = { ...prev };
            delete next[remoteUser.uid as number];
            return next;
          });
        });

        await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);
      } catch (err) {
        console.error('[JIX] فشل الانضمام للبث:', err);
        if (!cancelled) {
          setError('تعذر الاتصال بالبث. حاول مرة أخرى.');
          setIsConnecting(false);
        }
      }
    };

    join();

    return () => {
      cancelled = true;
      clientRef.current?.leave();
      clientRef.current = null;
    };
  }, [isOpen, channelName]);

  useEffect(() => {
    if (!liveId) return;

    let hostAgoraUid: number | null = null;

    const applyHostVideo = () => {
      if (hostAgoraUid === null) return;
      const remoteUser = remoteUsersByUid[hostAgoraUid];
      if (remoteUser?.videoTrack && videoRef.current) {
        remoteUser.videoTrack.play(videoRef.current);
      }
    };

    supabase
      .from('live_streams')
      .select('host_agora_uid')
      .eq('id', liveId)
      .maybeSingle()
      .then(({ data }) => {
        hostAgoraUid = data?.host_agora_uid ?? null;
        applyHostVideo();
      });

    applyHostVideo();
  }, [liveId, remoteUsersByUid]);

  useEffect(() => {
    if (!liveId) return;

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
      .channel(`stream_cohosts_${liveId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stream_cohosts', filter: `live_id=eq.${liveId}` },
        () => loadSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId]);

  useEffect(() => {
    const mySlot = cohostSlots.find((s) => s?.guestId === currentUserId);

    const startPublishing = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const anonKey = (supabase as any).supabaseKey as string;
        const uid = Math.floor(Math.random() * 100000) + 500000;

        const response = await fetch(AGORA_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${accessToken ?? anonKey}`,
          },
          body: JSON.stringify({ channelName, uid, role: 'publisher' }),
        });
        if (!response.ok) return;
        const tokenData = await response.json();

        const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
        client.setClientRole('host');
        cohostPublishClientRef.current = client;

        await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        cohostLocalAudioTrackRef.current = audioTrack;
        cohostLocalVideoTrackRef.current = videoTrack;

        await client.publish([audioTrack, videoTrack]);

        await supabase.rpc('set_cohost_uid', { p_live_id: liveId, p_agora_uid: uid });
      } catch (err) {
        console.error('[JIX] فشل نشر فيديو القست:', err);
      }
    };

    const stopPublishing = async () => {
      const tracks = [cohostLocalAudioTrackRef.current, cohostLocalVideoTrackRef.current].filter(Boolean);
      if (tracks.length) {
        try {
          await cohostPublishClientRef.current?.unpublish(tracks as any);
        } catch {
          // تجاهل
        }
      }
      cohostLocalAudioTrackRef.current?.close();
      cohostLocalVideoTrackRef.current?.close();
      cohostLocalAudioTrackRef.current = null;
      cohostLocalVideoTrackRef.current = null;
      try {
        await cohostPublishClientRef.current?.leave();
      } catch {
        // تجاهل
      }
      cohostPublishClientRef.current = null;
    };

    if (mySlot && !cohostPublishClientRef.current) {
      startPublishing();
    } else if (!mySlot && cohostPublishClientRef.current) {
      stopPublishing();
    }
  }, [cohostSlots, currentUserId, channelName, liveId]);

  useEffect(() => {
    return () => {
      cohostPublishClientRef.current?.leave();
      cohostLocalAudioTrackRef.current?.close();
      cohostLocalVideoTrackRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !liveId) return;

    const giftChannel = supabase
      .channel(`gift_events_${liveId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gift_events', filter: `live_id=eq.${liveId}` },
        (payload) => {
          const row = payload.new as { gift_id: string };
          const def = GIFTS_CATALOG.find((g) => g.id === row.gift_id);
          jixAudio.playGiftEffect(row.gift_id, def?.rarity, def?.archetype);
          setGiftToast({ id: crypto.randomUUID(), giftId: row.gift_id, rarity: def?.rarity || 'common' });
          setTimeout(() => setGiftToast(null), def?.rarity === 'mythic' || def?.rarity === 'legendary' ? 4500 : 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(giftChannel);
    };
  }, [isOpen, liveId]);

  useEffect(() => {
    if (!isOpen || !currentUserId || !onPKBattleStarted) return;

    const pkChannel = supabase
      .channel(`pk_watcher_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pk_battles',
          filter: `host_a_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string };
          if (row.status === 'active') {
            onPKBattleStarted(row.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pkChannel);
    };
  }, [isOpen, currentUserId, onPKBattleStarted]);

  const handleRequestCohost = async () => {
    if (!currentUserId) return;
    setIsRequesting(true);
    const { error } = await supabase.rpc('request_cohost', { p_live_id: liveId, p_host_id: hostId });
    setIsRequesting(false);
    if (!error) setRequestSent(true);
  };

  const handleLeaveCohost = async () => {
    if (!currentUserId) return;
    await supabase.rpc('remove_cohost', { p_live_id: liveId, p_guest_id: currentUserId });
  };

  if (!isOpen) return null;

  const hasCohosts = cohostSlots.some((s) => s !== null);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className={`relative ${hasCohosts ? 'h-1/2' : 'flex-1'} flex items-center justify-center`}>
        <div ref={videoRef} className="w-full h-full" />

        {isConnecting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6] mb-3" />
            <p className="text-sm text-gray-300">جارٍ الاتصال ببث {hostUsername}...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-white/10 rounded-xl text-sm font-bold">
              رجوع
            </button>
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
            </div>
          ) : (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] px-4 py-2 rounded-full flex items-center gap-2 z-20">
              <div style={giftPopStyle}>
                <GiftIcon gift={def} size={22} />
              </div>
              <span className="text-xs font-black text-white">هدية {def.name}!</span>
            </div>
          );
        })()}

        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* عدد المشاهدين + زر الكأس: يفتح توب المذيعين وتوب الداعمين */}
        <div className="absolute top-4 left-16 flex items-center gap-1.5 z-10">
          <div className="flex items-center gap-1.5 bg-black/50 px-3 py-2 rounded-full">
            <Users className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-white">{viewerCount}</span>
          </div>
          <button
            onClick={() => setIsTopChartOpen(true)}
            className="flex items-center bg-black/50 px-3 py-2 rounded-full"
            aria-label="التوبات"
          >
            <Trophy className="w-4 h-4 text-[#F5B93E]" />
          </button>
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          <button
            onClick={() => onOpenProfile?.(hostId)}
            className="bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-xs font-black px-3 py-1.5 rounded-full"
          >
            {hostUsername}
          </button>
          <LevelBadge xp={hostReceiverXp} kind="receiver" />
          {currentUserId && currentUserId !== hostId && onPKBattleStarted && (
            <JixPKChallengeButton
              targetUserId={hostId}
              targetUsername={hostUsername}
              onBattleStarted={onPKBattleStarted}
            />
          )}
          <JixReportButton targetType="live_stream" targetId={liveId} />
        </div>

        {!isConnecting && !error && <JixGiftBar liveId={liveId} hostId={hostId} />}

        <JixTopChart
          isOpen={isTopChartOpen}
          onClose={() => setIsTopChartOpen(false)}
          onOpenProfile={(userId) => {
            setIsTopChartOpen(false);
            onOpenProfile?.(userId);
          }}
        />

        {currentUserId && currentUserId !== hostId && (
          <div className="absolute bottom-4 left-4 z-10">
            {isMeCohost ? (
              <button
                onClick={handleLeaveCohost}
                className="flex items-center gap-1.5 bg-red-600/80 px-3 py-2 rounded-full text-[10px] font-bold text-white"
              >
                <LogOut className="w-3.5 h-3.5" /> نزول من القست
              </button>
            ) : requestSent ? (
              <span className="flex items-center gap-1.5 bg-black/50 px-3 py-2 rounded-full text-[10px] font-bold text-gray-300">
                بانتظار موافقة المذيع...
              </span>
            ) : (
              <button
                onClick={handleRequestCohost}
                disabled={isRequesting}
                className="flex items-center gap-1.5 bg-black/50 px-3 py-2 rounded-full text-[10px] font-bold text-white disabled:opacity-50"
              >
                {isRequesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus2 className="w-3.5 h-3.5" />}
                طلب الصعود كقست
              </button>
            )}
          </div>
        )}

        {!isConnecting && !error && (
          <JixLiveComments
            channelName={channelName}
            liveId={liveId}
            hostId={hostId}
            currentUserId={currentUserId ?? null}
            currentUserName={viewerName}
            isHost={false}
            isModerator={isModerator}
            onOpenProfile={onOpenProfile}
            onKicked={handleKicked}
          />
        )}

        {kickedNotice && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 px-6 text-center">
            <p className="text-sm text-red-400 font-bold mb-4">
              {kickedNotice.permanent
                ? 'تم طردك نهائيًا من هذا البث'
                : 'تم طردك مؤقتًا من هذا البث لمدة 5 دقايق'}
            </p>
            <button onClick={onClose} className="px-5 py-2.5 bg-white/10 rounded-xl text-sm font-bold text-white">
              رجوع
            </button>
          </div>
        )}
      </div>

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

            const isMe = slot.guestId === currentUserId;

            return (
              <JixCohostSlot
                key={i}
                name={slot.guestName}
                isLocalPreview={isMe}
                localVideoTrack={isMe ? cohostLocalVideoTrackRef.current : undefined}
                remoteUser={!isMe && slot.agoraUid ? remoteUsersByUid[slot.agoraUid] : undefined}
                canRemove={isMe}
                onRemove={isMe ? handleLeaveCohost : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
