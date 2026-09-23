import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Check, Globe, X } from 'lucide-react';
import { LOCALES } from './JixLocales';

// ============================================================
// نظام الترجمة في JIX
// - يكشف لغة الجوال تلقائيًا (مثل تيك توك)
// - يقلب اتجاه الشاشة: يمين لليسار للعربي/الفارسي/الأردو/الكردي
// - المستخدم يقدر يختار لغة يدويًا، ويتحفظ اختياره
// - أي نص ناقص بلغة معينة يرجع للإنجليزي، وبعدين العربي
// ============================================================

export interface JixLanguage {
  code: string;
  name: string; // اسم اللغة بلغتها نفسها
  dir: 'rtl' | 'ltr';
}

export const JIX_LANGUAGES: JixLanguage[] = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'it', name: 'Italiano', dir: 'ltr' },
  { code: 'pt', name: 'Português', dir: 'ltr' },
  { code: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', dir: 'rtl' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', name: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'th', name: 'ไทย', dir: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
  { code: 'tl', name: 'Filipino', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Polski', dir: 'ltr' },
  { code: 'uk', name: 'Українська', dir: 'ltr' },
  { code: 'ro', name: 'Română', dir: 'ltr' },
  { code: 'el', name: 'Ελληνικά', dir: 'ltr' },
  { code: 'sv', name: 'Svenska', dir: 'ltr' },
  { code: 'cs', name: 'Čeština', dir: 'ltr' },
  { code: 'hu', name: 'Magyar', dir: 'ltr' },
  { code: 'nb', name: 'Norsk', dir: 'ltr' },
  { code: 'az', name: 'Azərbaycan', dir: 'ltr' },
  { code: 'uz', name: "O'zbek", dir: 'ltr' },
  { code: 'ne', name: 'नेपाली', dir: 'ltr' },
  { code: 'ckb', name: 'کوردی', dir: 'rtl' },
  { code: 'am', name: 'አማርኛ', dir: 'ltr' },
  // لغات أوروبية إضافية
  { code: 'da', name: 'Dansk', dir: 'ltr' },
  { code: 'fi', name: 'Suomi', dir: 'ltr' },
  { code: 'bg', name: 'Български', dir: 'ltr' },
  { code: 'sr', name: 'Српски', dir: 'ltr' },
  { code: 'hr', name: 'Hrvatski', dir: 'ltr' },
  { code: 'sk', name: 'Slovenčina', dir: 'ltr' },
  { code: 'sl', name: 'Slovenščina', dir: 'ltr' },
  { code: 'sq', name: 'Shqip', dir: 'ltr' },
  { code: 'lt', name: 'Lietuvių', dir: 'ltr' },
  { code: 'lv', name: 'Latviešu', dir: 'ltr' },
  { code: 'et', name: 'Eesti', dir: 'ltr' },
  { code: 'is', name: 'Íslenska', dir: 'ltr' },
  { code: 'ka', name: 'ქართული', dir: 'ltr' },
  { code: 'hy', name: 'Հայերեն', dir: 'ltr' },
];

const SUPPORTED = new Set(JIX_LANGUAGES.map((l) => l.code));
const STORAGE_KEY = 'jix_language'; // 'auto' أو رمز لغة
const FALLBACK = 'en';

// أسماء قديمة/بديلة تستخدمها بعض الأجهزة لنفس اللغة
const ALIASES: Record<string, string> = {
  in: 'id',
  fil: 'tl',
  ku: 'ckb',
  no: 'nb', // النرويجي بأسمائه المختلفة
  nn: 'nb',
  bs: 'hr', // البوسني قريب جدًا من الكرواتي
  sh: 'hr',
};

// يقرأ لغات الجوال بالترتيب ويختار أول وحدة ندعمها
export const detectDeviceLanguage = (): string => {
  const candidates = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : [];
  for (const raw of candidates) {
    if (!raw) continue;
    const full = raw.toLowerCase();
    const base = full.split('-')[0];
    const code = ALIASES[base] ?? base;
    if (SUPPORTED.has(code)) return code;
  }
  return FALLBACK;
};

const readStoredChoice = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
};

type Vars = Record<string, string | number>;

interface JixI18nValue {
  lang: string; // اللغة الفعلية المستخدمة
  choice: string; // 'auto' أو لغة يدوية
  dir: 'rtl' | 'ltr';
  setChoice: (choice: string) => void;
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<JixI18nValue | null>(null);

export const JixI18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [choice, setChoiceState] = useState<string>(readStoredChoice);

  const lang = choice === 'auto' || !SUPPORTED.has(choice) ? detectDeviceLanguage() : choice;
  const dir = JIX_LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';

  // نحدّث لغة واتجاه الصفحة كلها
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setChoice = useCallback((next: string) => {
    setChoiceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // الحفظ مو ضروري - اللغة تتغير للجلسة الحالية على الأقل
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      let text = LOCALES[lang]?.[key] ?? LOCALES[FALLBACK]?.[key] ?? LOCALES.ar?.[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, choice, dir, setChoice, t }), [lang, choice, dir, setChoice, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): JixI18nValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // أمان: لو مكون استخدم الترجمة بره المزوّد، نرجع العربي بدل ما يطيح التطبيق
    return {
      lang: 'ar',
      choice: 'auto',
      dir: 'rtl',
      setChoice: () => {},
      t: (key: string) => LOCALES.ar?.[key] ?? key,
    };
  }
  return ctx;
};

// اختصار: const t = useT();
export const useT = () => useI18n().t;

// ============================================================
// زر + نافذة اختيار اللغة (يستخدم بصفحة البروفايل)
// ============================================================
export const JixLanguagePicker: React.FC = () => {
  const { lang, choice, setChoice, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const current = JIX_LANGUAGES.find((l) => l.code === lang);

  const pick = (next: string) => {
    setChoice(next);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl text-start"
      >
        <Globe className="w-4 h-4 text-[#8B5CF6] shrink-0" />
        <span className="text-sm text-gray-300 flex-1">{t('language')}</span>
        <span className="text-sm font-bold text-white">
          {choice === 'auto' ? `${current?.name ?? ''} · ${t('language_auto').split(/\s*[(（]/)[0]}` : current?.name}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-[430px] bg-[#12141f] border-t border-gray-800 rounded-t-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="font-black text-sm text-white">{t('choose_language')}</h3>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full bg-white/5">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto p-3 space-y-1"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <LanguageRow label={t('language_auto')} isActive={choice === 'auto'} onClick={() => pick('auto')} />
              {JIX_LANGUAGES.map((l) => (
                <LanguageRow
                  key={l.code}
                  label={l.name}
                  dir={l.dir}
                  isActive={choice === l.code}
                  onClick={() => pick(l.code)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const LanguageRow: React.FC<{ label: string; isActive: boolean; onClick: () => void; dir?: 'rtl' | 'ltr' }> = ({
  label,
  isActive,
  onClick,
  dir,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl ${
      isActive ? 'bg-gradient-to-r from-[#FF7A1A]/20 to-[#8B5CF6]/20' : 'hover:bg-white/5'
    }`}
  >
    <span className="text-sm font-bold text-white" dir={dir}>
      {label}
    </span>
    {isActive && <Check className="w-4 h-4 text-[#8B5CF6]" />}
  </button>
);
