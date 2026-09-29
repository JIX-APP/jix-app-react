import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  UserCog,
  Calendar,
  Lock,
  Wallet,
  FileText,
  ShieldCheck,
  Mail,
  ShieldAlert,
  LogOut,
  Loader2,
  Check,
  MapPin,
  X,
  Ban,
  Bell,
} from 'lucide-react';
import { useI18n, JixLanguagePicker } from './JixLanguage';
import { JixIncognitoToggle } from './JixIncognito';
import { JixDobPicker } from './JixDobPicker';
import { LegalDoc, LEGAL_CONTACT_EMAIL } from './JixLegal';
import { JixNotificationPrefs } from './JixNotifications';
import { toggleBlock } from './JixBlock';
import { supabase } from './supabaseClient';

// ============================================================
// الإعدادات والخصوصية - مثل تيك توك: كل شي ما يحتاجه المستخدم يوميًا هنا
// ============================================================

interface JixSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; avatarUrl?: string | null; dateOfBirth?: string | null; region?: string | null };
  isAdmin: boolean;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
  onOpenLegal: (doc: LegalDoc) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  // ترجع مفتاح ترجمة لرسالة الخطأ، أو null لو نجح الحفظ
  onSaveName: (name: string) => Promise<string | null>;
  onSaveRegion: (region: string) => Promise<string | null>;
  onSaveDob: (date: string) => Promise<string | null>;
}

// مربع الأيقونة الملون (نفس أسلوب إعدادات الآيفون)
const IconTile: React.FC<{ from: string; to: string; children: React.ReactNode }> = ({ from, to, children }) => (
  <span
    className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-white"
    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
  >
    {children}
  </span>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-5">
    <p className="text-[11px] font-bold text-gray-500 px-2 mb-1.5">{title}</p>
    <div className="bg-[#18181F] rounded-2xl overflow-hidden divide-y divide-white/5">{children}</div>
  </div>
);

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}> = ({ icon, label, value, onClick, chevron = true }) => {
  const { dir } = useI18n();
  const Chevron = dir === 'ltr' ? ChevronRight : ChevronLeft;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 text-start disabled:cursor-default active:bg-white/5"
    >
      {icon}
      <span className="flex-1 text-sm text-white">{label}</span>
      {value !== undefined && <span className="text-xs text-gray-500 flex items-center gap-1">{value}</span>}
      {chevron && onClick && <Chevron className="w-4 h-4 text-gray-600 shrink-0" />}
    </button>
  );
};

export const JixSettings: React.FC<JixSettingsProps> = ({
  isOpen,
  onClose,
  user,
  isAdmin,
  onOpenWallet,
  onOpenAdmin,
  onOpenLegal,
  onLogout,
  onDeleteAccount,
  onSaveName,
  onSaveRegion,
  onSaveDob,
}) => {
  const { t } = useI18n();
  const [editing, setEditing] = useState<null | 'profile' | 'dob' | 'blocked' | 'notifications'>(null);
  const [blocked, setBlocked] = useState<{ user_id: string; name: string | null; avatar_url: string | null; account_number: number | null }[] | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [regionDraft, setRegionDraft] = useState('');
  const [dobDraft, setDobDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const openProfileEditor = () => {
    setNameDraft(user.name);
    setRegionDraft(user.region || '');
    setError(null);
    setEditing('profile');
  };

  const openDobEditor = () => {
    setDobDraft('');
    setError(null);
    setEditing('dob');
  };

  const openBlocked = async () => {
    setBlocked(null);
    setEditing('blocked');
    const { data } = await supabase.rpc('get_my_blocked');
    setBlocked((data as typeof blocked) ?? []);
  };

  const unblock = async (id: string) => {
    setUnblockingId(id);
    const result = await toggleBlock(id);
    setUnblockingId(null);
    if (result === false) setBlocked((list) => (list ?? []).filter((b) => b.user_id !== id));
  };

  const saveProfile = async () => {
    if (!nameDraft.trim()) return;
    setIsSaving(true);
    setError(null);
    let err: string | null = null;
    if (nameDraft.trim() !== user.name) err = await onSaveName(nameDraft.trim());
    if (!err && regionDraft.trim() !== (user.region || '')) err = await onSaveRegion(regionDraft.trim());
    setIsSaving(false);
    if (err) setError(t(err));
    else setEditing(null);
  };

  const saveDob = async () => {
    if (!dobDraft) return;
    setIsSaving(true);
    setError(null);
    const err = await onSaveDob(dobDraft);
    setIsSaving(false);
    if (err) setError(t(err));
    else setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-[42] flex justify-center bg-[#0E0E12]">
      <div className="relative w-full max-w-[430px] h-full flex flex-col">
        {/* توهج خفيف أعلى الصفحة */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-40"
          style={{ background: 'radial-gradient(60% 100% at 70% 0%, #8B5CF6 0%, transparent 70%)' }}
        />

        <div
          className="relative shrink-0 flex items-center justify-between px-4 pb-3"
          style={{ paddingTop: 'calc(0.9rem + env(safe-area-inset-top, 0px))' }}
        >
          <button onClick={onClose} className="p-2 rounded-full bg-white/5" aria-label={t('cancel')}>
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="font-black text-sm text-white">{t('settings_title')}</h2>
          <span className="w-8" />
        </div>

        <div
          className="relative flex-1 overflow-y-auto px-4 pt-2"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* بطاقة الملف المصغرة */}
          <button
            onClick={openProfileEditor}
            className="w-full flex items-center gap-3 p-3.5 mb-5 bg-[#18181F] rounded-2xl text-start"
          >
            <span className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white shrink-0">
              {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name[0]}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-black text-white truncate">{user.name}</span>
              <span className="block text-[11px] text-gray-500">{t('settings_edit_profile')}</span>
            </span>
          </button>

          <Group title={t('settings_group_account')}>
            <Row
              icon={
                <IconTile from="#FF7A1A" to="#FF4670">
                  <UserCog className="w-4 h-4" />
                </IconTile>
              }
              label={t('settings_edit_profile')}
              onClick={openProfileEditor}
            />
            <Row
              icon={
                <IconTile from="#38BDF8" to="#8B5CF6">
                  <Calendar className="w-4 h-4" />
                </IconTile>
              }
              label={t('dob')}
              // تاريخ الميلاد يتسجل مرة وحدة بس (حماية 18+) - التعديل بعدها عبر الدعم
              value={
                user.dateOfBirth ? (
                  <>
                    <span dir="ltr">{user.dateOfBirth}</span>
                    <Lock className="w-3 h-3" />
                  </>
                ) : (
                  t('add_dob')
                )
              }
              onClick={user.dateOfBirth ? undefined : openDobEditor}
            />
          </Group>

          <Group title={t('settings_group_wallet')}>
            <Row
              icon={
                <IconTile from="#F5B93E" to="#FF7A1A">
                  <Wallet className="w-4 h-4" />
                </IconTile>
              }
              label={t('wallet_title')}
              onClick={onOpenWallet}
            />
          </Group>

          <Group title={t('settings_group_privacy')}>
            <div className="[&>button]:!mt-0 [&>button]:!rounded-none [&>button]:!bg-transparent">
              <JixIncognitoToggle key={user.id} />
            </div>
            <Row
              icon={
                <IconTile from="#F87171" to="#B91C1C">
                  <Ban className="w-4 h-4" />
                </IconTile>
              }
              label={t('block_list_title')}
              onClick={openBlocked}
            />
          </Group>

          <Group title={t('settings_group_app')}>
            <div className="[&>button]:!rounded-none [&>button]:!bg-transparent">
              <JixLanguagePicker />
            </div>
            <Row
              icon={
                <IconTile from="#F472B6" to="#8B5CF6">
                  <Bell className="w-4 h-4" />
                </IconTile>
              }
              label={t('notif_settings_title')}
              onClick={() => setEditing('notifications')}
            />
          </Group>

          <Group title={t('settings_group_support')}>
            <Row
              icon={
                <IconTile from="#94A3B8" to="#475569">
                  <FileText className="w-4 h-4" />
                </IconTile>
              }
              label={t('legal_terms')}
              onClick={() => onOpenLegal('terms')}
            />
            <Row
              icon={
                <IconTile from="#94A3B8" to="#475569">
                  <ShieldCheck className="w-4 h-4" />
                </IconTile>
              }
              label={t('legal_privacy')}
              onClick={() => onOpenLegal('privacy')}
            />
            <Row
              icon={
                <IconTile from="#94A3B8" to="#475569">
                  <Mail className="w-4 h-4" />
                </IconTile>
              }
              label={t('settings_contact')}
              onClick={() => {
                window.location.href = `mailto:${LEGAL_CONTACT_EMAIL}?subject=JIX`;
              }}
            />
          </Group>

          {isAdmin && (
            <Group title={t('settings_group_admin')}>
              <Row
                icon={
                  <IconTile from="#FB923C" to="#DC2626">
                    <ShieldAlert className="w-4 h-4" />
                  </IconTile>
                }
                label={t('admin_panel')}
                onClick={onOpenAdmin}
              />
            </Group>
          )}

          <button
            onClick={onLogout}
            className="w-full py-3.5 mt-2 rounded-2xl border border-red-500/60 text-red-400 text-sm font-black flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t('logout')}
          </button>

          <button onClick={onDeleteAccount} className="w-full mt-4 py-2 text-[11px] text-gray-500 underline">
            {t('delete_account')}
          </button>

          <p className="text-center text-[10px] text-gray-700 mt-2">JIX 1.0</p>
        </div>

        {/* نافذة تعديل الملف / تاريخ الميلاد */}
        {editing && (
          <div className="absolute inset-0 z-10 flex items-end bg-black/70" onClick={() => setEditing(null)}>
            <div
              className="w-full bg-[#12131a] border-t border-white/10 rounded-t-3xl p-5"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-black text-sm text-white mb-4">
                {editing === 'profile'
                  ? t('settings_edit_profile')
                  : editing === 'dob'
                    ? t('dob')
                    : editing === 'blocked'
                      ? t('block_list_title')
                      : t('notif_settings_title')}
              </h3>

              {editing === 'notifications' ? (
                <JixNotificationPrefs />
              ) : editing === 'blocked' ? (
                <div className="max-h-[55vh] overflow-y-auto">
                  {blocked === null ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
                    </div>
                  ) : blocked.length === 0 ? (
                    <p className="text-center text-xs text-gray-500 py-8">{t('block_list_empty')}</p>
                  ) : (
                    <div className="space-y-2">
                      {blocked.map((b) => (
                        <div key={b.user_id} className="flex items-center gap-3 bg-[#18181F] rounded-2xl px-3 py-2.5">
                          <span className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#FF7A1A] to-[#8B5CF6] flex items-center justify-center font-black text-white shrink-0">
                            {b.avatar_url ? <img src={b.avatar_url} className="w-full h-full object-cover" /> : (b.name || 'J')[0]}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-white truncate">{b.name || t('user_default')}</span>
                            {b.account_number && <span className="block text-[10px] text-gray-500" dir="ltr">ID {b.account_number}</span>}
                          </span>
                          <button
                            onClick={() => unblock(b.user_id)}
                            disabled={unblockingId === b.user_id}
                            className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {unblockingId === b.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('block_unblock')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : editing === 'profile' ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="block text-[11px] text-gray-400 mb-1">{t('settings_name')}</span>
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value.slice(0, 40))}
                      className="w-full px-3.5 py-3 bg-[#171923] border border-gray-800 rounded-xl text-white text-sm focus:border-[#8B5CF6] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <MapPin className="w-3 h-3" /> {t('settings_region')}
                    </span>
                    <input
                      value={regionDraft}
                      onChange={(e) => setRegionDraft(e.target.value.slice(0, 60))}
                      placeholder={t('region_placeholder')}
                      className="w-full px-3.5 py-3 bg-[#171923] border border-gray-800 rounded-xl text-white text-sm focus:border-[#8B5CF6] outline-none"
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <JixDobPicker value={dobDraft} onChange={setDobDraft} />
                  <p className="text-[11px] text-amber-300/80 mt-2">{t('settings_dob_once')}</p>
                </div>
              )}

              {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

              {(editing === 'profile' || editing === 'dob') && (
              <button
                onClick={editing === 'profile' ? saveProfile : saveDob}
                disabled={isSaving || (editing === 'profile' ? !nameDraft.trim() : !dobDraft)}
                className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t('save')}
              </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
