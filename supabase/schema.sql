@@ -2,51 +2,51 @@
-- Run this once in the Supabase SQL editor, then create the first admin user in Auth
-- and update profiles.role to 'admin' for that user.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('reader', 'author', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  email text not null,
  role public.user_role not null default 'reader',
  created_at timestamptz not null default now()
);

create table if not exists public.novels (
  id text primary key,
  title text not null check (char_length(title) between 1 and 180),
  author text not null check (char_length(author) between 1 and 120),
  author_id uuid references public.profiles(id) on delete set null,
  category text not null default 'عام',
  type text not null default 'عربية' check (type in ('عربية', 'مترجمة')),
  status text not null default 'قيد النشر' check (status in ('قيد النشر', 'مكتملة')),
  status text not null default 'مستمرة' check (status in ('مستمرة', 'مكتملة', 'مسودة')),
  reads integer not null default 0 check (reads >= 0),
  rating numeric(2,1) not null default 4.5 check (rating between 0 and 5),
  description text not null default '',
  cover text not null default '',
  chapters jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  approved boolean not null default false,
  premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id text primary key,
  novel_id text references public.novels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  text text not null check (char_length(text) between 1 and 1000),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key default 'main',
  value jsonb not null default '{}'::jsonb,
@@ -132,76 +132,145 @@ using (true);

drop policy if exists "users update own non role profile" on public.profiles;
create policy "users update own non role profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public reads approved novels" on public.novels;
create policy "public reads approved novels"
on public.novels for select
to anon, authenticated
using (approved = true or author_id = auth.uid() or public.is_admin());

drop policy if exists "authors create own pending novels" on public.novels;
create policy "authors create own pending novels"
on public.novels for insert
to authenticated
with check (author_id = auth.uid() and approved = false);
with check (author_id = auth.uid() and (approved = false or public.is_admin()));

drop policy if exists "authors update own pending novels" on public.novels;
create policy "authors update own pending novels"
on public.novels for update
to authenticated
using (author_id = auth.uid() and approved = false)
with check (author_id = auth.uid() and approved = false);

drop policy if exists "admins manage novels" on public.novels;
create policy "admins manage novels"
on public.novels for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public reads approved comments" on public.comments;
create policy "public reads approved comments"
on public.comments for select
to anon, authenticated
using (approved = true or user_id = auth.uid() or public.is_admin());

drop policy if exists "anyone creates comments" on public.comments;
create policy "anyone creates comments"
on public.comments for insert
to anon, authenticated
with check (approved = true and char_length(text) between 1 and 1000);

drop policy if exists "admins manage comments" on public.comments;
create policy "admins manage comments"
on public.comments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public reads settings" on public.settings;
create policy "public reads settings"
on public.settings for select
to anon, authenticated
using (id = 'main');

drop policy if exists "admins manage settings" on public.settings;
create policy "admins manage settings"
on public.settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.settings (id, value)
values ('main', '{"siteName":"مملكة الروايات","description":"منصة عربية احترافية لنشر الروايات وقراءتها وإدارة مجتمع القراء والكتّاب.","contactEmail":"admin@novels-kingdom.local","patreonUrl":"https://patreon.com/yourpage"}'::jsonb)
on conflict (id) do nothing;


insert into public.novels (id, title, author, category, type, status, reads, rating, description, cover, chapters, featured, approved, premium)
values
  (
    'shadows-of-ink',
    'ظلال الحبر',
    'ليان السامرائي',
    'غموض',
    'عربية',
    'مستمرة',
    12840,
    4.8,
    'كاتبة شابة تجد مخطوطة قديمة تفتح لها أبواب مدينة لا تظهر إلا في منتصف الليل.',
    '',
    '[{"title":"الباب الذي لا ينام","body":"في تلك الليلة، كان الحبر يلمع كأنه يعرف الطريق. مدّت ليان يدها إلى الصفحة الأولى، فسمعت المدينة تتنفس خلف الجدار."},{"title":"سوق الهمسات","body":"كل بائع كان يبيع ذكرى، وكل زائر كان يترك ظله رهينة للضوء الأزرق."}]'::jsonb,
    true,
    true,
    false
  ),
  (
    'moon-gate',
    'بوابة القمر',
    'رامي الأندلسي',
    'فانتازيا',
    'مترجمة',
    'مكتملة',
    9350,
    4.6,
    'رحلة عبر ممالك مضاءة بالقمر حيث يحرس الشعراء مفاتيح الزمن.',
    '',
    '[{"title":"المفتاح الفضي","body":"قال الحارس: لا تعبر البوابة إلا إذا تذكرت اسمك الأول، الاسم الذي نسيته قبل أن تولد."}]'::jsonb,
    true,
    true,
    false
  ),
  (
    'coffee-letters',
    'رسائل القهوة',
    'سارة محمود',
    'رومانسي',
    'عربية',
    'مستمرة',
    7140,
    4.4,
    'رسائل مجهولة تصل كل صباح إلى مقهى صغير وتغيّر حياة أصحابه وزواره.',
    '',
    '[{"title":"طاولة قرب النافذة","body":"كانت الرسالة مطوية بعناية، وعليها رائحة قهوة لا تُنسى: أرجوك لا تغادر قبل المطر."}]'::jsonb,
    false,
    true,
    false
  )
on conflict (id) do update set
  title = excluded.title,
  author = excluded.author,
  category = excluded.category,
  type = excluded.type,
  status = excluded.status,
  reads = excluded.reads,
  rating = excluded.rating,
  description = excluded.description,
  chapters = excluded.chapters,
  featured = excluded.featured,
  approved = excluded.approved,
  premium = excluded.premium;

insert into public.comments (id, novel_id, name, text, approved)
values ('seed-comment-shadows', 'shadows-of-ink', 'قارئ شغوف', 'بداية مشوقة وأسلوب جميل!', true)
on conflict (id) do nothing;
