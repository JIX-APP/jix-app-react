import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

interface JixCohostSlotProps {
  name: string;
  remoteUser?: IAgoraRTCRemoteUser | null;
  isLocalPreview?: boolean;
  localVideoTrack?: any;
  onRemove?: () => void;
  canRemove?: boolean;
}

export const JixCohostSlot: React.FC<JixCohostSlotProps> = ({
  name,
  remoteUser,
  isLocalPreview,
  localVideoTrack,
  onRemove,
  canRemove,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLocalPreview && localVideoTrack && videoRef.current) {
      localVideoTrack.play(videoRef.current);
    } else if (remoteUser?.videoTrack && videoRef.current) {
      remoteUser.videoTrack.play(videoRef.current);
    }
  }, [remoteUser, localVideoTrack, isLocalPreview]);

  return (
    <div className="relative w-full h-full bg-[#1a1c26] rounded-lg overflow-hidden">
      <div ref={videoRef} className="w-full h-full" />

      <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
        {name}
      </span>

      {canRemove && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
};
