import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';
import { useI18n } from './JixLanguage';

// ============================================================
// JIX - سياسة الخصوصية وشروط الاستخدام (عربي / English / Français)
// باقي اللغات تعرض النسخة الإنجليزية
// رابط مباشر للمتاجر: رابط التطبيق + #privacy أو #terms
// ============================================================

// بريد التواصل الظاهر بالصفحتين - غيّره هنا فقط لو غيّرت البريد
export const LEGAL_CONTACT_EMAIL = 'sjilani262@gmail.com';
const LAST_UPDATED = '2026-09-27';

export type LegalDoc = 'privacy' | 'terms';
type DocLang = 'ar' | 'en' | 'fr';
interface Section {
  title: string;
  body: string[];
}

export const getLegalDocFromHash = (): LegalDoc | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace('#', '').toLowerCase();
  return hash === 'privacy' || hash === 'terms' ? hash : null;
};

const E = LEGAL_CONTACT_EMAIL;

// ============================================================
// سياسة الخصوصية
// ============================================================
const PRIVACY: Record<DocLang, Section[]> = {
  ar: [
    {
      title: '1. من نحن',
      body: [
        `JIX تطبيق تواصل اجتماعي وبث مباشر يديره فريق JIX ("نحن"). توضح هذه السياسة ما نجمعه من بياناتك، ولماذا، وكيف نحميها، وما حقوقك. للتواصل: ${E}`,
      ],
    },
    {
      title: '2. البيانات التي تقدّمها لنا',
      body: [
        'بيانات الحساب: بريدك الإلكتروني، واسم المستخدم، والجنس، وتاريخ الميلاد عند التسجيل.',
        'بيانات الملف الشخصي: الاسم، والصورة، والنبذة، والمنطقة.',
        'المحتوى: الفيديوهات والصور والقصص والأوصاف والتعليقات والبثوث المباشرة التي تنشرها.',
        'الرسائل والمكالمات: رسائلك الخاصة ومكالماتك ورسائل الدردشة العامة.',
        'البلاغات: ما ترسله من بلاغات وتفاصيلها.',
      ],
    },
    {
      title: '3. البيانات التي تنشأ أثناء استخدامك',
      body: [
        'رقم حسابك، والمتابَعون والمتابِعون، والإعجابات والمشاهدات والمشاركات.',
        'الهدايا والعملات وأرقام VIP والمستويات وترتيب الداعمين.',
        'مشاركتك في البثوث وحالة الاتصال (متصل الآن).',
        'لغة جهازك، وسجلات تقنية يحتفظ بها مزودو الاستضافة لأغراض الأمان (مثل عنوان IP ونوع المتصفح).',
      ],
    },
    {
      title: '4. الكاميرا والميكروفون والصوت',
      body: [
        'نستخدم الكاميرا والميكروفون فقط عندما تبدأ بثًا أو مكالمة أو تسجيلًا، أو تستخدم الكتابة بالصوت.',
        'فلاتر الوجه تُعالَج على جهازك نفسه، ولا يُرسَل الفيديو إلينا لتطبيقها.',
        'الكتابة بالصوت تستخدم خدمة التعرّف على الكلام في متصفحك، وقد تعالجها الشركة المزودة للمتصفح أو نظام التشغيل.',
      ],
    },
    {
      title: '5. كيف نستخدم بياناتك',
      body: [
        'لتشغيل التطبيق: إنشاء حسابك، وعرض ملفك ومحتواك، وتشغيل البث والمكالمات والرسائل.',
        'لحساب الهدايا والعملات والمستويات، وترجمة التعليقات تلقائيًا.',
        'لحماية المستخدمين: فحص المحتوى، ومراجعة البلاغات، ومنع الاحتيال، وتطبيق شروط الاستخدام.',
        'للتحقق من أن عمرك 18 سنة أو أكثر، ولإرسال رموز الدخول إلى بريدك.',
        'نحن لا نبيع بياناتك الشخصية، ولا نستخدمها لإعلانات جهات خارجية.',
      ],
    },
    {
      title: '6. ما يراه الآخرون',
      body: [
        'ظاهر للجميع: الاسم، واسم المستخدم، والصورة، والنبذة، والمنطقة، والجنس، ورقم الحساب، والمستويات، وأعداد المتابعين، ومنشوراتك وقصصك وتعليقاتك العامة وبثوثك.',
        'غير ظاهر لأحد: بريدك الإلكتروني، وتاريخ ميلادك، ورصيد عملاتك، ورسائلك الخاصة.',
        'الدخول المخفي: يرى المستخدمون الآخرون "زائر مخفي" بدل اسمك، لكننا نحتفظ بالربط بحسابك لأغراض الأمان والإشراف، وقد تظهر الهدايا التي ترسلها في ترتيب الداعمين.',
      ],
    },
    {
      title: '7. مزودو الخدمة',
      body: [
        'نستعين بشركات تعالج البيانات نيابة عنا ولتشغيل التطبيق فقط:',
        'Supabase: قاعدة البيانات وتسجيل الدخول وتخزين الملفات.',
        'Agora: البث المباشر والمكالمات الصوتية والمرئية.',
        'Cloudflare: استضافة التطبيق وترجمة التعليقات بالذكاء الاصطناعي.',
        'MyMemory: ترجمة احتياطية للتعليقات.',
        'خدمة فحص آلي للصور قبل نشرها.',
        'قد تُعالَج بياناتك على خوادم في دول مختلفة، مع الالتزام بنفس مستوى الحماية أينما كانت.',
      ],
    },
    {
      title: '8. الإشراف على المحتوى',
      body: [
        'تُفحص الصور آليًا قبل نشرها، وتُفلتر الأسماء والتعليقات من الكلمات الممنوعة، ويراجع فريقنا البلاغات.',
        'قد نحذف محتوى أو نوقف حسابات تخالف شروط الاستخدام.',
      ],
    },
    {
      title: '9. مدة الاحتفاظ بالبيانات',
      body: [
        'نحتفظ ببياناتك ما دام حسابك قائمًا.',
        'القصص تُحذف تلقائيًا بعد 24 ساعة، وتعليقات البث المباشر لا تُحفَظ أصلًا.',
        'نحتفظ بسجلات البلاغات والإيقاف المدة اللازمة لحماية المستخدمين.',
      ],
    },
    {
      title: '10. حذف حسابك',
      body: [
        'تستطيع حذف حسابك من صفحة البروفايل. يُخفى حسابك فورًا، ويُحذف نهائيًا مع منشوراتك وقصصك ورسائلك وعملاتك بعد 30 يومًا.',
        'إذا سجّلت الدخول خلال هذه المدة تستطيع استعادة حسابك.',
        'قد نحتفظ ببعض السجلات بعد الحذف إذا لزم ذلك لمنع الاحتيال أو للالتزام بالقانون.',
      ],
    },
    {
      title: '11. حقوقك',
      body: [
        'لك الحق في الاطلاع على بياناتك وتصحيحها (من صفحة البروفايل) وحذفها، والاعتراض على معالجتها. نطبّق هذه الحقوق على جميع المستخدمين وفق أعلى المعايير الدولية لحماية البيانات، مثل اللائحة الأوروبية العامة لحماية البيانات (GDPR)، أينما كنت.',
        `لممارسة أي من هذه الحقوق راسلنا على: ${E}`,
      ],
    },
    {
      title: '12. أمان البيانات',
      body: [
        'نحمي بياناتك بضوابط وصول صارمة وتشفير أثناء النقل، لكن لا يوجد نظام آمن بنسبة 100%.',
      ],
    },
    {
      title: '13. الأعمار',
      body: ['JIX مخصص لمن أعمارهم 18 سنة فأكثر فقط. إذا علمنا بوجود حساب لقاصر فسنحذفه.'],
    },
    {
      title: '14. التعديلات',
      body: ['قد نحدّث هذه السياسة. سنغيّر تاريخ آخر تحديث، ونبلّغك داخل التطبيق عند التغييرات المهمة.'],
    },
    {
      title: "15. النسخ اللغوية",
      body: [
        "النسخ العربية والإنجليزية والفرنسية هي النسخ الرسمية، وأي ترجمة أخرى للتسهيل فقط.",
        "في حال وجود اختلاف بين النسخ الرسمية، تُعتمد النسخة العربية.",
      ],
    },
  ],

  en: [
    {
      title: '1. Who we are',
      body: [
        `JIX is a social and live-streaming app operated by the JIX team ("we"). This policy explains what data we collect, why, how we protect it, and your rights. Contact: ${E}`,
      ],
    },
    {
      title: '2. Information you give us',
      body: [
        'Account data: your email, username, gender and date of birth when you sign up.',
        'Profile data: your name, photo, bio and region.',
        'Content: videos, photos, stories, captions, comments and live streams you post.',
        'Messages and calls: your private messages, calls and public chat messages.',
        'Reports: reports you submit and their details.',
      ],
    },
    {
      title: '3. Information created as you use JIX',
      body: [
        'Your account ID, followers and following, likes, views and shares.',
        'Gifts, coins, VIP numbers, levels and supporter rankings.',
        'Your participation in live streams and your online status.',
        'Your device language, and technical logs kept by our hosting providers for security (such as IP address and browser type).',
      ],
    },
    {
      title: '4. Camera, microphone and voice',
      body: [
        'We use your camera and microphone only when you go live, start a call, record, or use voice typing.',
        'Face filters are processed on your own device; your video is not sent to us to apply them.',
        "Voice typing uses your browser's speech recognition service, which may be processed by your browser or operating system provider.",
      ],
    },
    {
      title: '5. How we use your data',
      body: [
        'To run the app: create your account, show your profile and content, and power lives, calls and messages.',
        'To calculate gifts, coins and levels, and to translate comments automatically.',
        'To keep users safe: check content, review reports, prevent fraud and enforce our Terms.',
        'To confirm you are 18 or older, and to send login codes to your email.',
        'We do not sell your personal data or use it for third-party advertising.',
      ],
    },
    {
      title: '6. What others can see',
      body: [
        'Public: your name, username, photo, bio, region, gender, account ID, levels, follower counts, and your public posts, stories, comments and lives.',
        'Never public: your email, date of birth, coin balance and private messages.',
        'Incognito mode: other users see "Hidden guest" instead of your name, but we keep the link to your account for safety and moderation, and gifts you send may appear in supporter rankings.',
      ],
    },
    {
      title: '7. Service providers',
      body: [
        'We use companies that process data on our behalf, only to run the app:',
        'Supabase: database, login and file storage.',
        'Agora: live streaming and voice/video calls.',
        'Cloudflare: app hosting and AI translation of comments.',
        'MyMemory: backup translation of comments.',
        'An automated image-checking service used before images are published.',
        'Your data may be processed on servers in different countries, with the same level of protection wherever it is.',
      ],
    },
    {
      title: '8. Content moderation',
      body: [
        'Images are checked automatically before publishing, names and comments are filtered for banned words, and our team reviews reports.',
        'We may remove content or suspend accounts that break our Terms.',
      ],
    },
    {
      title: '9. How long we keep data',
      body: [
        'We keep your data while your account exists.',
        'Stories are deleted automatically after 24 hours, and live stream comments are not stored.',
        'We keep report and suspension records for as long as needed to protect users.',
      ],
    },
    {
      title: '10. Deleting your account',
      body: [
        'You can delete your account from your profile. It is hidden right away and permanently deleted with your posts, stories, messages and coins after 30 days.',
        'Log in during those 30 days to restore it.',
        'We may keep some records after deletion where needed to prevent fraud or comply with the law.',
      ],
    },
    {
      title: '11. Your rights',
      body: [
        "You have the right to access, correct (from your profile), and delete your data, and to object to its processing. We apply these rights to all users, wherever you are, following the highest international data protection standards, such as the EU General Data Protection Regulation (GDPR).",
        `To use any of these rights, email us at: ${E}`,
      ],
    },
    {
      title: '12. Security',
      body: ['We protect your data with strict access controls and encryption in transit, but no system is 100% secure.'],
    },
    {
      title: '13. Age',
      body: ['JIX is only for people aged 18 or older. If we learn an account belongs to a minor, we will delete it.'],
    },
    {
      title: '14. Changes',
      body: ['We may update this policy. We will change the "last updated" date and notify you in the app about important changes.'],
    },
    {
      title: "15. Language versions",
      body: [
        "The Arabic, English and French versions are the official versions. Any other translation is for convenience only.",
        "If the official versions differ, the Arabic version prevails.",
      ],
    },
  ],

  fr: [
    {
      title: '1. Qui sommes-nous',
      body: [
        `JIX est une application sociale et de diffusion en direct exploitée par l'équipe JIX (« nous »). Cette politique explique quelles données nous collectons, pourquoi, comment nous les protégeons et quels sont vos droits. Contact : ${E}`,
      ],
    },
    {
      title: '2. Les informations que vous nous fournissez',
      body: [
        "Données du compte : votre e-mail, nom d'utilisateur, genre et date de naissance lors de l'inscription.",
        'Données du profil : votre nom, photo, biographie et région.',
        'Contenu : les vidéos, photos, stories, légendes, commentaires et lives que vous publiez.',
        'Messages et appels : vos messages privés, appels et messages du chat public.',
        'Signalements : les signalements que vous envoyez et leurs détails.',
      ],
    },
    {
      title: "3. Les informations générées par votre utilisation",
      body: [
        'Votre identifiant de compte, abonnés et abonnements, mentions « j’aime », vues et partages.',
        'Cadeaux, pièces, numéros VIP, niveaux et classements des soutiens.',
        'Votre participation aux lives et votre statut en ligne.',
        "La langue de votre appareil, et des journaux techniques conservés par nos hébergeurs pour la sécurité (comme l'adresse IP et le type de navigateur).",
      ],
    },
    {
      title: '4. Caméra, microphone et voix',
      body: [
        "Nous utilisons votre caméra et votre microphone uniquement lorsque vous lancez un live, un appel, un enregistrement ou la saisie vocale.",
        "Les filtres visage sont traités sur votre propre appareil ; votre vidéo ne nous est pas envoyée pour les appliquer.",
        "La saisie vocale utilise le service de reconnaissance vocale de votre navigateur, qui peut être traité par le fournisseur de votre navigateur ou de votre système d'exploitation.",
      ],
    },
    {
      title: '5. Comment nous utilisons vos données',
      body: [
        "Pour faire fonctionner l'application : créer votre compte, afficher votre profil et votre contenu, et assurer les lives, appels et messages.",
        'Pour calculer les cadeaux, pièces et niveaux, et traduire automatiquement les commentaires.',
        'Pour protéger les utilisateurs : vérifier le contenu, examiner les signalements, prévenir la fraude et appliquer nos Conditions.',
        'Pour confirmer que vous avez 18 ans ou plus, et envoyer les codes de connexion à votre e-mail.',
        'Nous ne vendons pas vos données personnelles et ne les utilisons pas pour de la publicité de tiers.',
      ],
    },
    {
      title: "6. Ce que les autres peuvent voir",
      body: [
        "Public : votre nom, nom d'utilisateur, photo, biographie, région, genre, identifiant, niveaux, nombre d'abonnés, ainsi que vos publications, stories, commentaires publics et lives.",
        'Jamais public : votre e-mail, date de naissance, solde de pièces et messages privés.',
        'Mode incognito : les autres utilisateurs voient « Invité masqué » au lieu de votre nom, mais nous conservons le lien avec votre compte pour la sécurité et la modération, et les cadeaux que vous envoyez peuvent apparaître dans les classements des soutiens.',
      ],
    },
    {
      title: '7. Prestataires de services',
      body: [
        "Nous faisons appel à des sociétés qui traitent des données pour notre compte, uniquement pour faire fonctionner l'application :",
        'Supabase : base de données, connexion et stockage des fichiers.',
        'Agora : diffusion en direct et appels audio/vidéo.',
        "Cloudflare : hébergement de l'application et traduction des commentaires par IA.",
        'MyMemory : traduction de secours des commentaires.',
        "Un service automatique de vérification des images avant leur publication.",
        "Vos données peuvent être traitées sur des serveurs situés dans différents pays, avec le même niveau de protection où qu'elles se trouvent.",
      ],
    },
    {
      title: '8. Modération du contenu',
      body: [
        'Les images sont vérifiées automatiquement avant publication, les noms et commentaires sont filtrés contre les mots interdits, et notre équipe examine les signalements.',
        'Nous pouvons supprimer du contenu ou suspendre des comptes qui enfreignent nos Conditions.',
      ],
    },
    {
      title: '9. Durée de conservation',
      body: [
        'Nous conservons vos données tant que votre compte existe.',
        'Les stories sont supprimées automatiquement après 24 heures, et les commentaires des lives ne sont pas conservés.',
        'Nous conservons les signalements et suspensions aussi longtemps que nécessaire pour protéger les utilisateurs.',
      ],
    },
    {
      title: '10. Supprimer votre compte',
      body: [
        'Vous pouvez supprimer votre compte depuis votre profil. Il est masqué immédiatement et supprimé définitivement avec vos publications, stories, messages et pièces après 30 jours.',
        'Connectez-vous pendant ces 30 jours pour le récupérer.',
        'Nous pouvons conserver certains enregistrements après la suppression lorsque cela est nécessaire pour prévenir la fraude ou respecter la loi.',
      ],
    },
    {
      title: '11. Vos droits',
      body: [
        "Vous avez le droit d'accéder à vos données, de les corriger (depuis votre profil), de les supprimer et de vous opposer à leur traitement. Nous appliquons ces droits à tous les utilisateurs, où qu'ils se trouvent, selon les normes internationales les plus élevées en matière de protection des données, comme le Règlement général sur la protection des données (RGPD).",
        `Pour exercer ces droits, écrivez-nous à : ${E}`,
      ],
    },
    {
      title: '12. Sécurité',
      body: ["Nous protégeons vos données par des contrôles d'accès stricts et un chiffrement en transit, mais aucun système n'est sûr à 100 %."],
    },
    {
      title: '13. Âge',
      body: ["JIX est réservé aux personnes âgées de 18 ans ou plus. Si nous apprenons qu'un compte appartient à un mineur, nous le supprimerons."],
    },
    {
      title: '14. Modifications',
      body: ["Nous pouvons mettre à jour cette politique. Nous modifierons la date de mise à jour et vous informerons dans l'application des changements importants."],
    },
    {
      title: "15. Versions linguistiques",
      body: [
        "Les versions arabe, anglaise et française sont les versions officielles. Toute autre traduction est fournie à titre indicatif uniquement.",
        "En cas de divergence entre les versions officielles, la version arabe prévaut.",
      ],
    },
  ],
};

// ============================================================
// شروط الاستخدام
// ============================================================
const TERMS: Record<DocLang, Section[]> = {
  ar: [
    {
      title: '1. قبول الشروط',
      body: ['بإنشاء حساب في JIX أو استخدامه فأنت توافق على هذه الشروط وعلى سياسة الخصوصية. إذا لم توافق فلا تستخدم التطبيق.'],
    },
    {
      title: '2. الأهلية والحساب',
      body: [
        'يجب أن يكون عمرك 18 سنة أو أكثر.',
        'يجب أن تكون بيانات التسجيل صحيحة، وأن يكون الحساب لشخص واحد.',
        'أنت مسؤول عن حسابك وكل ما يحدث فيه، ولا تشارك رموز الدخول مع أي أحد.',
      ],
    },
    {
      title: '3. محتواك',
      body: [
        'المحتوى الذي تنشره ملكك. وبنشره تمنح JIX ترخيصًا عالميًا وغير حصري ومجانيًا لاستضافته وتخزينه وعرضه ونشره وترجمته بالقدر اللازم لتشغيل التطبيق.',
        'ينتهي هذا الترخيص عند حذف المحتوى، باستثناء ما يلزم الاحتفاظ به قانونًا أو لأغراض الأمان.',
        'أنت مسؤول عن أن تملك حقوق ما تنشره.',
      ],
    },
    {
      title: '4. المحتوى والسلوك الممنوع',
      body: [
        'العري أو المحتوى الجنسي.',
        'أي محتوى جنسي أو مؤذٍ يتعلق بالقاصرين.',
        'التنمر أو التحرش أو التهديد.',
        'خطاب الكراهية.',
        'العنف أو المحتوى الصادم، أو تشجيع إيذاء النفس.',
        'الاحتيال أو النصب أو الرسائل المزعجة.',
        'انتحال شخصية أي شخص أو جهة.',
        'بيع أو ترويج أشياء أو أنشطة غير قانونية، أو المقامرة.',
        'نشر المعلومات الخاصة للآخرين.',
        'انتهاك حقوق الملكية الفكرية.',
        'اختراق التطبيق أو التلاعب به، أو استخدام برامج آلية أو حسابات وهمية، أو التلاعب بالمستويات والهدايا.',
        'تسجيل بثوث الآخرين أو إعادة نشرها بدون إذنهم.',
      ],
    },
    {
      title: '5. البث المباشر والمكالمات',
      body: [
        'أنت مسؤول عما تعرضه وتقوله في بثك ومكالماتك.',
        'المذيعون والمشرفون يستطيعون كتم المشاهدين أو طردهم من بثوثهم.',
        'مستخدمو الدخول المخفي يخضعون لنفس الشروط، ويستطيع المذيع كتمهم أو طردهم.',
      ],
    },
    {
      title: '6. البلاغات والإجراءات',
      body: [
        'تستطيع الإبلاغ عن أي حساب أو منشور أو بث يخالف هذه الشروط، بحد أقصى 3 بلاغات يوميًا، وبلاغ واحد على نفس الشخص أو المحتوى كل 30 يومًا.',
        'قد نحذف المحتوى المخالف، أو نقيّد بعض الميزات، أو نوقف الحساب مؤقتًا أو نهائيًا، وقد يتم ذلك بدون إشعار مسبق عند الضرورة.',
        'إساءة استخدام البلاغات قد تؤدي إلى اتخاذ إجراء ضد حسابك.',
        `للاعتراض على قرار راسلنا على: ${E}`,
      ],
    },
    {
      title: '7. العملات والهدايا وأرقام VIP',
      body: [
        'العملات والهدايا وأرقام VIP عناصر افتراضية ليس لها قيمة نقدية حقيقية، وأنت تملك حق استخدامها داخل التطبيق فقط، ولا يجوز بيعها أو نقلها خارج JIX.',
        'تُعرض الأسعار قبل الشراء، وعمليات الشراء نهائية وغير قابلة للاسترجاع، إلا إذا فرض القانون أو سياسة متجر التطبيقات غير ذلك.',
        'الهدية لا يمكن استرجاعها بعد إرسالها.',
        'يحق لنا تصحيح الأخطاء، وسحب العملات التي تم الحصول عليها بالاحتيال أو بإلغاء الدفع أو بخلل تقني.',
        'تُفقد العملات غير المستخدمة عند حذف الحساب.',
      ],
    },
    {
      title: '8. المستويات والشارات',
      body: ['تُحسب المستويات والشارات بناءً على نشاطك، وقد نعدّل طريقة حسابها، ولا يمكن نقلها لحساب آخر.'],
    },
    {
      title: '9. توفر الخدمة',
      body: [
        'نقدّم التطبيق "كما هو". قد نضيف ميزات أو نغيّرها أو نوقفها، وقد تتوقف الخدمة مؤقتًا للصيانة أو لأسباب خارجة عن إرادتنا.',
      ],
    },
    {
      title: '10. حدود المسؤولية',
      body: [
        'إلى الحد الذي يسمح به القانون، لا نتحمل المسؤولية عن الأضرار غير المباشرة، ولا عن المحتوى أو السلوك الصادر عن مستخدمين آخرين.',
      ],
    },
    {
      title: '11. إنهاء الحساب',
      body: ['تستطيع حذف حسابك في أي وقت من صفحة البروفايل. ويحق لنا إنهاء أي حساب يخالف هذه الشروط.'],
    },
    {
      title: '12. القوانين المطبقة',
      body: [
        'نطبّق هذه الشروط وفق القوانين المعمول بها، ونلتزم بأعلى المعايير الدولية في حماية البيانات وسلامة المستخدمين.',
        'لا يوجد في هذه الشروط ما يحرمك من أي حق تمنحك إياه القوانين الإلزامية في بلدك.',
      ],
    },
    {
      title: '13. التعديلات والتواصل',
      body: [
        'قد نحدّث هذه الشروط، واستمرارك في استخدام التطبيق بعد التحديث يعني موافقتك عليه.',
        `للتواصل: ${E}`,
      ],
    },
    {
      title: "14. النسخ اللغوية",
      body: [
        "النسخ العربية والإنجليزية والفرنسية هي النسخ الرسمية، وأي ترجمة أخرى للتسهيل فقط.",
        "في حال وجود اختلاف بين النسخ الرسمية، تُعتمد النسخة العربية.",
      ],
    },
  ],

  en: [
    {
      title: '1. Accepting these terms',
      body: ["By creating a JIX account or using the app, you agree to these Terms and our Privacy Policy. If you don't agree, don't use JIX."],
    },
    {
      title: '2. Eligibility and your account',
      body: [
        'You must be 18 or older.',
        'Your sign-up information must be accurate, and each account is for one person.',
        'You are responsible for your account and everything done with it. Never share your login codes.',
      ],
    },
    {
      title: '3. Your content',
      body: [
        'You own the content you post. By posting it, you give JIX a worldwide, non-exclusive, royalty-free license to host, store, display, distribute and translate it as needed to run the app.',
        'This license ends when you delete the content, except where we must keep it by law or for safety.',
        'You are responsible for having the rights to what you post.',
      ],
    },
    {
      title: '4. Prohibited content and behavior',
      body: [
        'Nudity or sexual content.',
        'Any sexual or harmful content involving minors.',
        'Bullying, harassment or threats.',
        'Hate speech.',
        'Violence, graphic content, or encouraging self-harm.',
        'Scams, fraud or spam.',
        'Impersonating any person or organization.',
        'Selling or promoting illegal goods or activities, or gambling.',
        "Sharing other people's private information.",
        'Infringing intellectual property rights.',
        'Hacking or manipulating the app, using bots or fake accounts, or manipulating levels and gifts.',
        "Recording or re-posting other people's lives without their permission.",
      ],
    },
    {
      title: '5. Live streams and calls',
      body: [
        'You are responsible for what you show and say in your lives and calls.',
        'Hosts and moderators can mute or remove viewers from their lives.',
        'Incognito users follow the same rules, and hosts can mute or remove them.',
      ],
    },
    {
      title: '6. Reports and enforcement',
      body: [
        'You can report any account, post or live that breaks these Terms, up to 3 reports per day and once per person or item every 30 days.',
        'We may remove content, limit features, or suspend accounts temporarily or permanently, without prior notice when needed.',
        'Misusing reports may lead to action against your account.',
        `To appeal a decision, email us at: ${E}`,
      ],
    },
    {
      title: '7. Coins, gifts and VIP numbers',
      body: [
        'Coins, gifts and VIP numbers are virtual items with no real-world monetary value. You have a license to use them inside the app only, and you may not sell or transfer them outside JIX.',
        'Prices are shown before purchase. Purchases are final and non-refundable, except where required by law or app store policy.',
        'A gift cannot be taken back once sent.',
        'We may correct errors and remove coins obtained through fraud, chargebacks or technical bugs.',
        'Unused coins are lost when an account is deleted.',
      ],
    },
    {
      title: '8. Levels and badges',
      body: ['Levels and badges are based on your activity. We may change how they are calculated, and they cannot be transferred to another account.'],
    },
    {
      title: '9. Availability',
      body: ['JIX is provided "as is". We may add, change or remove features, and the service may be interrupted for maintenance or reasons beyond our control.'],
    },
    {
      title: '10. Limitation of liability',
      body: ["To the extent permitted by law, we are not liable for indirect damages, or for other users' content or behavior."],
    },
    {
      title: '11. Termination',
      body: ['You can delete your account at any time from your profile. We may terminate any account that breaks these Terms.'],
    },
    {
      title: '12. Applicable law',
      body: [
        'We apply these Terms in accordance with applicable laws and follow the highest international standards for data protection and user safety.',
        'Nothing in these Terms takes away any right you have under the mandatory laws of your country.',
      ],
    },
    {
      title: '13. Changes and contact',
      body: [
        'We may update these Terms. Continuing to use the app after an update means you accept it.',
        `Contact: ${E}`,
      ],
    },
    {
      title: "14. Language versions",
      body: [
        "The Arabic, English and French versions are the official versions. Any other translation is for convenience only.",
        "If the official versions differ, the Arabic version prevails.",
      ],
    },
  ],

  fr: [
    {
      title: '1. Acceptation des conditions',
      body: ["En créant un compte JIX ou en utilisant l'application, vous acceptez ces Conditions et notre Politique de confidentialité. Si vous ne les acceptez pas, n'utilisez pas JIX."],
    },
    {
      title: '2. Éligibilité et compte',
      body: [
        'Vous devez avoir 18 ans ou plus.',
        "Vos informations d'inscription doivent être exactes, et chaque compte appartient à une seule personne.",
        'Vous êtes responsable de votre compte et de tout ce qui y est fait. Ne partagez jamais vos codes de connexion.',
      ],
    },
    {
      title: '3. Votre contenu',
      body: [
        "Vous êtes propriétaire du contenu que vous publiez. En le publiant, vous accordez à JIX une licence mondiale, non exclusive et gratuite pour l'héberger, le stocker, l'afficher, le diffuser et le traduire dans la mesure nécessaire au fonctionnement de l'application.",
        'Cette licence prend fin lorsque vous supprimez le contenu, sauf lorsque nous devons le conserver en vertu de la loi ou pour des raisons de sécurité.',
        'Vous êtes responsable de détenir les droits sur ce que vous publiez.',
      ],
    },
    {
      title: '4. Contenus et comportements interdits',
      body: [
        'La nudité ou le contenu sexuel.',
        'Tout contenu sexuel ou préjudiciable impliquant des mineurs.',
        'Le harcèlement, l’intimidation ou les menaces.',
        'Les discours haineux.',
        "La violence, le contenu choquant ou l'incitation à l'automutilation.",
        'Les arnaques, la fraude ou le spam.',
        "L'usurpation de l'identité d'une personne ou d'une organisation.",
        "La vente ou la promotion de biens ou d'activités illégaux, ou les jeux d'argent.",
        "La divulgation d'informations privées d'autrui.",
        'La violation des droits de propriété intellectuelle.',
        "Le piratage ou la manipulation de l'application, l'utilisation de robots ou de faux comptes, ou la manipulation des niveaux et des cadeaux.",
        "L'enregistrement ou la republication des lives d'autrui sans leur autorisation.",
      ],
    },
    {
      title: '5. Lives et appels',
      body: [
        'Vous êtes responsable de ce que vous montrez et dites dans vos lives et appels.',
        'Les hôtes et modérateurs peuvent rendre muets ou exclure des spectateurs de leurs lives.',
        'Les utilisateurs en mode incognito sont soumis aux mêmes règles, et les hôtes peuvent les rendre muets ou les exclure.',
      ],
    },
    {
      title: '6. Signalements et sanctions',
      body: [
        "Vous pouvez signaler tout compte, publication ou live qui enfreint ces Conditions, dans la limite de 3 signalements par jour et d'un signalement par personne ou contenu tous les 30 jours.",
        'Nous pouvons supprimer du contenu, restreindre des fonctionnalités ou suspendre des comptes temporairement ou définitivement, sans préavis si nécessaire.',
        "L'abus des signalements peut entraîner des mesures contre votre compte.",
        `Pour contester une décision, écrivez-nous à : ${E}`,
      ],
    },
    {
      title: '7. Pièces, cadeaux et numéros VIP',
      body: [
        "Les pièces, cadeaux et numéros VIP sont des objets virtuels sans valeur monétaire réelle. Vous disposez d'une licence d'utilisation dans l'application uniquement et ne pouvez pas les vendre ni les transférer en dehors de JIX.",
        "Les prix sont affichés avant l'achat. Les achats sont définitifs et non remboursables, sauf si la loi ou la politique de la boutique d'applications l'exige.",
        "Un cadeau ne peut pas être repris une fois envoyé.",
        'Nous pouvons corriger les erreurs et retirer les pièces obtenues par fraude, rétrofacturation ou bug technique.',
        'Les pièces non utilisées sont perdues lors de la suppression du compte.',
      ],
    },
    {
      title: '8. Niveaux et badges',
      body: ['Les niveaux et badges reposent sur votre activité. Nous pouvons modifier leur mode de calcul, et ils ne peuvent pas être transférés vers un autre compte.'],
    },
    {
      title: '9. Disponibilité',
      body: ['JIX est fourni « en l’état ». Nous pouvons ajouter, modifier ou retirer des fonctionnalités, et le service peut être interrompu pour maintenance ou pour des raisons indépendantes de notre volonté.'],
    },
    {
      title: '10. Limitation de responsabilité',
      body: ["Dans la mesure permise par la loi, nous ne sommes pas responsables des dommages indirects, ni du contenu ou du comportement des autres utilisateurs."],
    },
    {
      title: '11. Résiliation',
      body: ['Vous pouvez supprimer votre compte à tout moment depuis votre profil. Nous pouvons résilier tout compte qui enfreint ces Conditions.'],
    },
    {
      title: '12. Lois applicables',
      body: [
        "Nous appliquons ces Conditions conformément aux lois applicables et respectons les normes internationales les plus élevées en matière de protection des données et de sécurité des utilisateurs.",
        "Rien dans ces Conditions ne vous prive des droits que vous accordent les lois impératives de votre pays.",
      ],
    },
    {
      title: '13. Modifications et contact',
      body: [
        "Nous pouvons mettre à jour ces Conditions. Continuer à utiliser l'application après une mise à jour signifie que vous l'acceptez.",
        `Contact : ${E}`,
      ],
    },
    {
      title: "14. Versions linguistiques",
      body: [
        "Les versions arabe, anglaise et française sont les versions officielles. Toute autre traduction est fournie à titre indicatif uniquement.",
        "En cas de divergence entre les versions officielles, la version arabe prévaut.",
      ],
    },
  ],
};

const HEADINGS: Record<DocLang, { privacy: string; terms: string; updated: string }> = {
  ar: { privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام', updated: 'آخر تحديث' },
  en: { privacy: 'Privacy Policy', terms: 'Terms of Service', updated: 'Last updated' },
  fr: { privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation", updated: 'Dernière mise à jour' },
};

const pickLang = (lang: string): DocLang => (lang.startsWith('ar') ? 'ar' : lang.startsWith('fr') ? 'fr' : 'en');

export const JixLegalModal: React.FC<{
  doc: LegalDoc | null;
  onClose: () => void;
  onSwitch: (doc: LegalDoc) => void;
}> = ({ doc, onClose, onSwitch }) => {
  const { lang } = useI18n();
  if (!doc) return null;

  const docLang = pickLang(lang);
  const h = HEADINGS[docLang];
  const sections = (doc === 'privacy' ? PRIVACY : TERMS)[docLang];

  return (
    <div className="fixed inset-0 z-[90] bg-[#0E0E12] flex flex-col" dir={docLang === 'ar' ? 'rtl' : 'ltr'}>
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <h2 className="font-black text-sm text-white">JIX</h2>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/5" aria-label="close">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="shrink-0 flex gap-1 p-1 mx-4 mt-3 bg-white/5 rounded-2xl">
        {(['privacy', 'terms'] as LegalDoc[]).map((key) => (
          <button
            key={key}
            onClick={() => onSwitch(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              doc === key ? 'bg-gradient-to-r from-[#FF7A1A] to-[#8B5CF6] text-white' : 'text-gray-400'
            }`}
          >
            {key === 'privacy' ? <ShieldCheck className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            {h[key]}
          </button>
        ))}
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 py-5"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <h1 className="text-xl font-black text-white">{h[doc]}</h1>
        <p className="text-[11px] text-gray-500 mt-1 mb-6">
          {h.updated}: {LAST_UPDATED}
        </p>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-black text-white mb-2">{section.title}</h3>
              {section.body.length > 2 ? (
                <ul className="space-y-1.5 list-disc ps-5 marker:text-[#8B5CF6]">
                  {section.body.map((line) => (
                    <li key={line} className="text-[13px] leading-relaxed text-gray-300">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                section.body.map((line) => (
                  <p key={line} className="text-[13px] leading-relaxed text-gray-300 mb-2">
                    {line}
                  </p>
                ))
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

// سطر "بالمتابعة أنت توافق..." مع رابطين - يُستخدم بشاشة التسجيل
export const JixLegalLinks: React.FC<{ onOpen: (doc: LegalDoc) => void; showAgreement?: boolean }> = ({
  onOpen,
  showAgreement = false,
}) => {
  const { t } = useI18n();
  return (
    <div className="text-center">
      {showAgreement && <p className="text-[11px] text-gray-500 mb-1">{t('legal_agree')}</p>}
      <div className="flex items-center justify-center gap-2 text-[11px]">
        <button type="button" onClick={() => onOpen('terms')} className="text-gray-400 underline">
          {t('legal_terms')}
        </button>
        <span className="text-gray-600">·</span>
        <button type="button" onClick={() => onOpen('privacy')} className="text-gray-400 underline">
          {t('legal_privacy')}
        </button>
      </div>
    </div>
  );
};
