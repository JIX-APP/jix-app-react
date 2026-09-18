import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Camera, Image, Users, UserX, VolumeX } from 'lucide-react';

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

export const JixStreamStudio: React.FC<JixStreamStudioProps> = ({ isOpen, onClose, currentUser }) => {
  const [streamMode, setStreamMode] = useState<'camera' | 'avatar'>('camera');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([
    { id: '1', name: 'سلطان VIP', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', isMuted: false },
    { id: '2', name: 'الزعيم 505', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', isMuted: false },
    { id: '3', name: 'أميرة الجواهر', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', isMuted: false },
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && streamMode === 'camera') {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => setStreamMode('avatar'));
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [isOpen, streamMode]);

  if (!isOpen) return null;

  const toggleMuteViewer = (id: string) => {
    setViewers((prev) => prev.map((v) => (v.id === id ? { ...v, isMuted: !v.isMuted } : v)));
  };

  const kickViewer = (id: string) => {
    setViewers((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-4xl h-[90vh] bg-[#0d0f17] border border-gray-800 rounded-3xl flex flex-col md:flex-row overflow-hidden">
        {/* شاشة البث الرئيسية */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {streamMode === 'camera' ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-8">
              <img src={currentUser.avatar} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-amber-500 mx-auto shadow-2xl animate-pulse mb-4" />
              <h3 className="text-xl font-bold">{currentUser.name}</h3>
              <p className="text-amber-400 text-xs mt-1">بث بصورة ثابتة (Avatar Mode)</p>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <button onClick={() => setIsMicMuted(!isMicMuted)} className={`p-3 rounded-full ${isMicMuted ? 'bg-red-600' : 'bg-white/10'}`}>
              {isMicMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
            <button onClick={() => setStreamMode(streamMode === 'camera' ? 'avatar' : 'camera')} className="p-3 rounded-full bg-white/10">
              {streamMode === 'camera' ? <Image className="w-5 h-5 text-amber-400" /> : <Camera className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* لوحة تحكم الفانزات */}
        <div className="w-full md:w-80 bg-[#12141f] border-t md:border-t-0 md:border-r border-gray-800 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> إدارة البث والفانزات
            </h4>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
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
                  <button onClick={() => toggleMuteViewer(v.id)} title={v.isMuted ? 'إلغاء كتم الكومنتات' : 'كتم الكومنتات'} className={`p-1.5 rounded-lg ${v.isMuted ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-300'}`}>
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
