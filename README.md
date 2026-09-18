# JIX Live Platform (Starter Scaffold)

هذا مشروع Vite + React + TypeScript + Tailwind، مبني من الأكواد اللي أرسلتها، مع إضافة الملفات
الناقصة عشان يشتغل فعليًا (`main.tsx`, `App.tsx`, ملفات إعداد Tailwind/PostCSS/Vite/TypeScript).

## تشغيل المشروع محليًا

```bash
npm install
npm run dev
```

بعدين افتح الرابط اللي هيظهر في التيرمنال (عادة `http://localhost:5173`).

## الملفات المتضمنة من كودك الأصلي

- `package.json`
- `index.html`
- `src/utils/jixAudioFx.ts` — محرك المؤثرات الصوتية (سيارة، خيل، صقر)
- `src/components/JixAuthModal.tsx` — شاشة تسجيل الدخول / إنشاء حساب
- `src/components/JixStreamStudio.tsx` — استوديو البث المباشر (كاميرا، كتم، طرد، أفاتار)

## الملفات اللي أضفتها عشان المشروع يشتغل

- `src/main.tsx` — نقطة الدخول
- `src/App.tsx` — صفحة رئيسية بسيطة بتربط تسجيل الدخول + بدء البث + تجربة أصوات الهدايا
- `src/index.css` — تفعيل Tailwind
- `tailwind.config.js`, `postcss.config.js`, `vite.config.ts`, `tsconfig.json`

## ملاحظات

- المشروع ده **واجهة أمامية فقط (Frontend)** — تسجيل الدخول والبث حاليًا وهميين (mock) لغرض العرض،
  ولسه محتاجين تربطهم بباك إند حقيقي (زي Supabase اللي شغال عليه مشروع JIX عندك) عشان:
  - تسجيل دخول/حساب حقيقي (OTP، إيميل، تليفون)
  - بث فيديو حقيقي بين المستخدمين (WebRTC / LiveKit)
  - نظام الهدايا والمحفظة ومدفوعات Stripe
- لو عندك أكواد تانية (متجر اليوزرات، تحديات PK، صفحة البروفايل، الخ) ابعتها وهضيفها لنفس المشروع.
