import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { supabase } from './supabaseClient';

const AGORA_TOKEN_URL = 'https://wfvhzlpvtgnydhmsxcqr.supabase.co/functions/v1/agora-token';
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string;

interface JixDMCallProps {
  callId: string;
  agoraChannel: string;
  callType: 'voice' | 'video';
  otherUserName: string;
  currentUserId: string;
  isIncoming: boolean; // لو مكالمة واردة، ننتظر رد المستخدم قبل الانضمام فعلياً
  onEnd: () => void;
}

export const JixDMCall: React.FC<JixDMCallProps> = ({
  callId,
  agoraChannel,
  callType,
  otherUserName,
  currentUserId,
  isIncoming,
  onEnd,
}) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoElRef = useRef<HTMLDivElement>(null);
  const remoteVideoElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const join = async () => {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video' && remoteVideoElRef.current) {
          user.videoTrack?.play(remoteVideoElRef.current);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      try {
        const res = await fetch(AGORA_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: agoraChannel, role: 'publisher' }),
        });
        const { token, uid } = await res.json();

        await client.join(AGORA_APP_ID, agoraChannel, token, uid);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioRef.current = audioTrack;

        const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [audioTrack];

        if (callType === 'video') {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoRef.current = videoTrack;
          if (localVideoElRef.current) videoTrack.play(localVideoElRef.current);
          tracksToPublish.push(videoTrack);
        }

        await client.publish(tracksToPublish);

        if (mounted) setIsConnecting(false);
      } catch (err) {
        console.error('[JIX] فشل الانضمام للمكالمة:', err);
      }
    };

    // ملاحظة: isIncoming هنا للعرض فقط (تحديد إن هذا الطرف كان المستقبل)
    // لكن الانضمام الفعلي لازم يصير بمجرد ما تفتح هذي الشاشة بالحالتين -
    // لأن القبول يصير بمكوّن JixDMCallNotification قبل ما توصل هذي الشاشة أصلاً
    join();

    return () => {
      mounted = false;
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      clientRef.current?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIncoming]);

  // عداد مدة المكالمة بعد الاتصال
  useEffect(() => {
    if (isConnecting) return;
    const interval = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isConnecting]);

  const toggleMute = () => {
    if (!localAudioRef.current) return;
    localAudioRef.current.setEnabled(isMuted);
    setIsMuted((m) => !m);
  };

  const toggleCam = () => {
    if (!localVideoRef.current) return;
    localVideoRef.current.setEnabled(isCamOff);
    setIsCamOff((c) => !c);
  };

  const handleHangup = async () => {
    await supabase.rpc('end_dm_call', { p_call_id: callId });
    localAudioRef.current?.close();
    localVideoRef.current?.close();
    await clientRef.current?.leave();
    onEnd();
  };

  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;

  return (
    <div className="fixed inset-0 z-[90] bg-[#0E0E12] flex flex-col">
      {callType === 'video' && (
        <div className="absolute inset-0">
          <div ref={remoteVideoElRef} className="w-full h-full bg-black" />
          <div
            ref={localVideoElRef}
            className="absolute bottom-28 left-4 w-28 h-40 rounded-2xl overflow-hidden bg-black border border-white/10"
          />
        </div>
      )}

      <div className="relative flex-1 flex flex-col items-center justify-center gap-3">
        {callType === 'voice' && (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-3xl font-black text-white mb-2">
            {otherUserName[0]}
          </div>
        )}
        <p className="text-xl font-black text-white">{otherUserName}</p>
        <p className="text-sm text-gray-400">
          {isConnecting ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الاتصال...
            </span>
          ) : (
            `${minutes}:${seconds.toString().padStart(2, '0')}`
          )}
        </p>
      </div>

      <div className="relative flex items-center justify-center gap-5 pb-10">
        <button
          onClick={toggleMute}
          className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"
        >
          {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </button>

        {callType === 'video' && (
          <button
            onClick={toggleCam}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"
          >
            {isCamOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
          </button>
        )}

        <button
          onClick={handleHangup}
          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};
