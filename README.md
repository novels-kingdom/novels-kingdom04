# مملكة الروايات

منصة عربية ثابتة متعددة الصفحات لقراءة ونشر الروايات، مع Backend حقيقي عبر Supabase للمصادقة، الروايات، التعليقات، ولوحة التحكم.

## البنية

```text
├── index.html
├── login.html
├── register.html
├── novel.html
├── dashboard.html
├── publish.html
├── css/
│   ├── style.css
│   ├── auth.css
│   ├── dashboard.css
│   └── novel.css
├── js/
│   ├── main.js
│   ├── auth.js
│   ├── novels.js
│   ├── ui.js
│   └── supabase.js
├── assets/
│   ├── logo.png
│   ├── hero.jpg
│   └── covers/
├── components/
│   ├── header.html
│   └── footer.html
└── supabase/
    └── schema.sql
```

## إعداد Supabase

1. افتح مشروع Supabase.
2. من **SQL Editor** نفّذ الملف `supabase/schema.sql` كاملًا.
3. راجع إعدادات الاتصال في `js/supabase.js` وتأكد من وجود رابط المشروع ومفتاح `publishable` فقط.
4. أنشئ أول حساب من صفحة `register.html`.
5. من جدول `profiles` غيّر قيمة `role` للحساب الأول إلى `admin` إذا أردته مديرًا.

> لا تضع مفتاح `service_role` أو كلمات مرور قاعدة البيانات داخل ملفات الواجهة.

## التشغيل المحلي

يفضل تشغيل خادم محلي حتى تعمل مكونات `components/header.html` و`components/footer.html` عبر `fetch`:

```bash
python3 -m http.server 8000
```

ثم افتح:

```text
http://localhost:8000
```

## الملفات المهمة

- `js/supabase.js`: إعداد Supabase وطبقة الوصول إلى قاعدة البيانات.
- `js/auth.js`: تسجيل الدخول وإنشاء الحساب عبر Supabase Auth.
- `js/novels.js`: قراءة الروايات، نشر الروايات، التعليقات، ولوحة التحكم.
- `js/main.js`: عرض وتصفية الروايات في الصفحة الرئيسية.
- `supabase/schema.sql`: الجداول، السياسات، الدوال، والبيانات التجريبية.
- `SECURITY.md`: قائمة مراجعة الأمان قبل النشر.
