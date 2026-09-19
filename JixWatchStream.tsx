import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { supabase } from './supabaseClient';
import { JixGiftBar } from './JixGiftBar';
import { jixAudio } from './jixAudioFx';
import { GIFTS_CATALOG, GiftIcon, giftLegendaryEnterStyle, giftPopStyle } from './JixGiftIcons';
import { LevelBadge, useLevelXp } from './JixLevelSystem';
import { JixReportButton } from './JixReportButton';
import { JixPKChallengeButton } from './JixPKChallengeButton';

interface JixWatchStreamProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
  channelName: string;
  hostUsername: string;
  hostId: string;
  currentUserId?: string | null;
  onPKBattleStarted?: (battleId: string) => void;
}

interface GiftToast {
  id: string;
  giftId: string;
  rarity: string;
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
}) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giftToast, setGiftToast] = useState<GiftToast | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const hostReceiverXp = useLevelXp(hostId, 'receiver');

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
          if (mediaType === 'video' && videoRef.current) {
            remoteUser.videoTrack?.play(videoRef.current);
          }
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
          }
          setIsConnecting(false);
        });

        client.on('user-unpublished', () => {
          setError('انتهى البث المباشر');
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

  // لو أنا (المشاهد) أرسلت تحدي PK لهذا المذيع، نستنى لين يوافق ونفتح شاشة المعركة تلقائيًا
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-1 relative flex items-center justify-center">
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

        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          <span className="bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-xs font-black px-3 py-1.5 rounded-full">
            {hostUsername}
          </span>
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
      </div>
    </div>
  );
};
