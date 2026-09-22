import React, { useEffect, useRef, useState } from 'react';
import { X, Circle, Square } from 'lucide-react';
import { useFilteredCanvas, JixFilterPicker, ArFilterId } from './JixCameraFilters';

interface JixVideoRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onRecorded: (file: File) => void;
}

const MAX_RECORD_SECONDS = 60;

export const JixVideoRecorder: React.FC<JixVideoRecorderProps> = ({ isOpen, onClose, onRecorded }) => {
  const sourceVideoElRef = useRef<HTMLVideoElement>(null);
  const [colorFilterId, setColorFilterId] = useState('normal');
  const [arFilterId, setArFilterId] = useState<ArFilterId>('none');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const { canvasRef, getStream } = useFilteredCanvas(sourceVideoElRef, colorFilterId, arFilterId);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // تشغيل الكاميرا لما تفتح الشاشة، وإيقافها لما تسكر
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (sourceVideoElRef.current) {
          sourceVideoElRef.current.srcObject = stream;
          await sourceVideoElRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError('تعذر الوصول للكاميرا. تأكد من إعطاء الإذن.');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    };
  }, [isOpen]);

  const handleStartRecording = () => {
    const canvasStream = getStream(30);
    const audioTrack = cameraStreamRef.current?.getAudioTracks()[0];
    if (!canvasStream) {
      setError('تعذر بدء التسجيل، حاول مرة أخرى');
      return;
    }

    // ندمج صوت الكاميرا الحقيقي مع فيديو الكانفاس المفلتر بنفس التسجيل
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(audioTrack ? [audioTrack] : []),
    ]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `recording_${Date.now()}.webm`, { type: mimeType });
      onRecorded(file);
      resetAndClose();
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setSeconds(0);

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) {
          handleStopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const resetAndClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setSeconds(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <video ref={sourceVideoElRef} muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
        <button onClick={resetAndClose} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>

        {isRecording && (
          <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
          </span>
        )}

        <button
          onClick={() => setIsFilterBarOpen((v) => !v)}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            isFilterBarOpen ? 'bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6]' : 'bg-black/50'
          }`}
        >
          <span className="text-base leading-none">🎨</span>
        </button>
      </div>

      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-4 py-2 rounded-full z-20 max-w-[85%] text-center">
          {error}
        </div>
      )}

      {isFilterBarOpen && !isRecording && (
        <div className="absolute bottom-28 inset-x-0 z-10">
          <JixFilterPicker
            colorFilterId={colorFilterId}
            arFilterId={arFilterId}
            onColorChange={setColorFilterId}
            onArChange={setArFilterId}
          />
        </div>
      )}

      <div className="absolute bottom-8 inset-x-0 flex items-center justify-center z-10">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-red-600 fill-red-600" />
          ) : (
            <Circle className="w-12 h-12 text-red-600 fill-red-600" />
          )}
        </button>
      </div>

      <p className="absolute bottom-1 inset-x-0 text-center text-[10px] text-gray-400 z-10">
        حتى {MAX_RECORD_SECONDS} ثانية
      </p>
    </div>
  );
};
