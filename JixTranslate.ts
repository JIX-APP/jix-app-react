import { supabase } from './supabaseClient';

// ============================================================
// ترجمة التعليقات تلقائيًا - مجانية بالكامل
// 1) Cloudflare Workers AI عن طريق سوبابيس (أفضل جودة، حصة يومية مشتركة)
// 2) لو خلصت الحصة: MyMemory مباشرة من جهاز المشاهد (كل جهاز له حصته)
// 3) لو خلص الاثنين: التعليق يطلع بلغته الأصلية
// ============================================================

// لغات تنكتب بالحروف اللاتينية
const LATIN_LANGS = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'tr', 'id', 'ms', 'vi', 'tl', 'nl', 'pl', 'ro', 'sv', 'cs', 'hu',
  'nb', 'az', 'uz', 'da', 'fi', 'hr', 'sk', 'sl', 'sq', 'lt', 'lv', 'et', 'is',
]);

// نحدد لغة التعليق من شكل حروفه، ونستعين بلغة جوال الكاتب لما الحروف تحتمل أكثر من لغة
// (مثلاً عربي كاتب بجوال إنجليزي: الحروف عربية فنعرف إنه عربي)
export function detectSourceLang(text: string, senderLang?: string): string | null {
  const s = senderLang ?? '';
  if (/[\u0600-\u06FF]/.test(text)) return ['ar', 'fa', 'ur', 'ckb'].includes(s) ? s : 'ar';
  if (/[\u0400-\u04FF]/.test(text)) return ['ru', 'uk', 'bg', 'sr'].includes(s) ? s : 'ru';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u4E00-\u9FFF]/.test(text)) return s === 'ja' ? 'ja' : 'zh';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  if (/[\u0900-\u097F]/.test(text)) return ['hi', 'ne'].includes(s) ? s : 'hi';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u10A0-\u10FF]/.test(text)) return 'ka';
  if (/[\u0530-\u058F]/.test(text)) return 'hy';
  if (/[\u1200-\u137F]/.test(text)) return 'am';
  if (/[\u0370-\u03FF]/.test(text)) return 'el';
  if (/[A-Za-z\u00C0-\u024F]/.test(text)) return LATIN_LANGS.has(s) ? s : 'en';
  return null;
}

// ما نصرف ترجمة على الإيموجي والكلام القصير جدًا ("😂"، "❤️"، "هههه"، "ok")
export function isWorthTranslating(text: string): boolean {
  const letters = text.replace(/[\p{P}\p{S}\p{N}\p{Z}\p{Extended_Pictographic}]/gu, '');
  if (letters.length < 3) return false;
  return new Set(letters.toLowerCase()).size > 2;
}

// ---------- الخدمة الاحتياطية: MyMemory ----------
const MYMEMORY_CODE: Record<string, string> = { zh: 'zh-CN', nb: 'no', ckb: 'ku' };
const EXHAUSTED_KEY = 'jix_mymemory_exhausted_day';
const today = () => new Date().toISOString().slice(0, 10);

const isMyMemoryExhausted = () => {
  try {
    return localStorage.getItem(EXHAUSTED_KEY) === today();
  } catch {
    return false;
  }
};

async function translateWithMyMemory(text: string, source: string, target: string): Promise<string | null> {
  if (isMyMemoryExhausted()) return null;
  try {
    const pair = `${MYMEMORY_CODE[source] ?? source}|${MYMEMORY_CODE[target] ?? target}`;
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`
    );
    const data = await res.json();
    const translated: string | undefined = data?.responseData?.translatedText;
    const status = Number(data?.responseStatus);
    const warning = typeof translated === 'string' && /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE/i.test(translated);

    // خلصت حصة هالجهاز اليوم - نوقف المحاولات لين بكرة
    if (status === 429 || (typeof translated === 'string' && /MYMEMORY WARNING/i.test(translated))) {
      try {
        localStorage.setItem(EXHAUSTED_KEY, today());
      } catch {
        // تجاهل
      }
      return null;
    }
    if (status !== 200 || !translated || warning) return null;
    if (translated.trim().toLowerCase() === text.trim().toLowerCase()) return null;
    return translated;
  } catch {
    return null;
  }
}

// ---------- الترجمة الرئيسية ----------
async function doTranslate(text: string, source: string, target: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('translate-text', { body: { text, source, target } });
    if (!error && data?.translated) return data.translated as string;
  } catch {
    // نكمل للخدمة الاحتياطية
  }
  return translateWithMyMemory(text, source, target);
}

// نفس التعليق ما ينطلب مرتين بنفس الجلسة
const sessionCache = new Map<string, Promise<string | null>>();

export function translateComment(text: string, source: string, target: string): Promise<string | null> {
  const key = `${source}|${target}|${text}`;
  let pending = sessionCache.get(key);
  if (!pending) {
    pending = doTranslate(text, source, target);
    sessionCache.set(key, pending);
  }
  return pending;
}
