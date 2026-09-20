import React, { useEffect, useState } from 'react';
import { X, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

interface JixModeratorManagerProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
}

interface FollowerRow {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  isModerator: boolean;
}

export const JixModeratorManager: React.FC<JixModeratorManagerProps> = ({ isOpen, onClose, hostId }) => {
  const [followers, setFollowers] = useState<FollowerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchFollowers();
  }, [isOpen]);

  const fetchFollowers = async () => {
    setIsLoading(true);

    const { data: followRows } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(id, full_name, handle, avatar_url)')
      .eq('following_id', hostId);

    const { data: moderatorRows } = await supabase
      .from('stream_moderators')
      .select('moderator_id')
      .eq('host_id', hostId);

    const moderatorIds = new Set((moderatorRows || []).map((m) => m.moderator_id));

    const list: FollowerRow[] = (followRows || [])
      .map((f: any) => f.profiles)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        handle: p.handle,
        avatar_url: p.avatar_url,
        isModerator: moderatorIds.has(p.id),
      }));

    setFollowers(list);
    setIsLoading(false);
  };

  const handleToggle = async (follower: FollowerRow) => {
    setBusyId(follower.id);
    try {
      if (follower.isModerator) {
        await supabase.rpc('remove_stream_moderator', { p_moderator_id: follower.id });
      } else {
        await supabase.rpc('add_stream_moderator', { p_moderator_id: follower.id });
      }
      setFollowers((prev) =>
        prev.map((f) => (f.id === follower.id ? { ...f, isModerator: !f.isModerator } : f))
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0f1118] rounded-t-3xl border-t border-gray-800 max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-black text-sm text-white">إدارة المشرفين</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <p className="text-[10px] text-gray-500 mb-3">
            اختر من متابعيك من تبي تعيّنه مشرف - يقدر يكتم ويطرد مؤقتًا بالبث
          </p>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            </div>
          ) : followers.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-10">ما عندك متابعين بعد</p>
          ) : (
            <div className="space-y-2">
              {followers.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center text-xs font-black overflow-hidden">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        (f.full_name || f.handle || 'م')[0]
                      )}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {f.full_name || f.handle || 'مستخدم JIX'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(f)}
                    disabled={busyId === f.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold disabled:opacity-50 ${
                      f.isModerator ? 'bg-red-600/20 text-red-400' : 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white'
                    }`}
                  >
                    {busyId === f.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : f.isModerator ? (
                      <ShieldOff className="w-3 h-3" />
                    ) : (
                      <Shield className="w-3 h-3" />
                    )}
                    {f.isModerator ? 'إزالة الإشراف' : 'تعيين مشرف'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
