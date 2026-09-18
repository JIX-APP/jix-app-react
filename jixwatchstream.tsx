import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { supabase } from './supabaseClient';

interface JixWatchStreamProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  hostUsername: string;
}

const AGORA_TOKEN_URL = 'https://wfvhzlpvtgnydhmsxcqr.supabase.co/functions/v1/agora-token';

export const JixWatchStream: React.FC<JixWatchStreamProps> = ({ isOpen, onClose, channelName, hostUsername }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);

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

        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-4 right-4 bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-xs font-black px-3 py-1.5 rounded-full z-10">
          {hostUsername}
        </div>
      </div>
    </div>
  );
};
