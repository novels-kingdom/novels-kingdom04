-- Supabase schema for Novels Kingdom.
-- Run the whole file from Supabase SQL Editor.
-- After creating the first account, promote it manually with:
-- update public.profiles set role = 'admin' where email = 'you@example.com';

begin;

-- -----------------------------------------------------------------------------
-- 1) Types
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'user_role') then
    create type public.user_role as enum ('reader', 'author', 'admin');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2) Tables
-- -----------------------------------------------------------------------------
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
  novel_id text not null references public.novels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  text text not null check (char_length(text) between 1 and 1000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key default 'main',
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 'main')
);

-- Keep partially-created old schemas aligned with the expected defaults.
alter table public.comments alter column approved set default false;
alter table public.profiles alter column role set default 'reader';
alter table public.novels alter column approved set default false;

create index if not exists novels_approved_created_at_idx on public.novels (approved, created_at desc);
create index if not exists novels_author_id_idx on public.novels (author_id);
create index if not exists comments_novel_id_created_at_idx on public.comments (novel_id, created_at desc);
create index if not exists comments_approved_idx on public.comments (approved);

-- -----------------------------------------------------------------------------
-- 3) Helper functions and triggers
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists novels_touch_updated_at on public.novels;
create trigger novels_touch_updated_at
before update on public.novels
for each row execute function public.touch_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() = 'admin'::public.user_role, false);
$$;

create or replace function public.is_author_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() in ('author'::public.user_role, 'admin'::public.user_role), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_role public.user_role := 'reader';
  requested_name text;
begin
  if new.raw_user_meta_data ->> 'role' = 'author' then
    requested_role := 'author';
  end if;

  requested_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1))), '');

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
     coalesce(requested_name, 'مستخدم جديد'),
    coalesce(new.email, ''),
    requested_role
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.increment_novel_reads(novel_id text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.novels
  set reads = reads + 1
  where id = novel_id and approved = true;
$$;

-- -----------------------------------------------------------------------------
-- 4) Grants for Supabase API roles. RLS policies below still decide row access.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant insert, update, delete on public.profiles to authenticated;

grant select on public.novels to anon, authenticated;
grant insert, update, delete on public.novels to authenticated;

grant select, insert on public.comments to anon, authenticated;
grant update, delete on public.comments to authenticated;

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_author_or_admin() to authenticated;
grant execute on function public.increment_novel_reads(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.novels enable row level security;
alter table public.comments enable row level security;
alter table public.settings enable row level security;

-- profiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own_basic_fields" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "users update own non role profile" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_update_own_basic_fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role = public.current_user_role());

create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- novels
drop policy if exists "novels_select_visible" on public.novels;
drop policy if exists "novels_insert_author_pending" on public.novels;
drop policy if exists "novels_update_own_pending" on public.novels;
drop policy if exists "novels_admin_all" on public.novels;
drop policy if exists "public reads approved novels" on public.novels;
drop policy if exists "authors create own pending novels" on public.novels;
drop policy if exists "authors update own pending novels" on public.novels;
drop policy if exists "admins manage novels" on public.novels;

create policy "novels_select_visible"
on public.novels for select
to anon, authenticated
using (approved = true or author_id = auth.uid() or public.is_admin());

create policy "novels_insert_author_pending"
on public.novels for insert
to authenticated
with check (
  author_id = auth.uid()
  and public.is_author_or_admin()
  and (approved = false or public.is_admin())
);

create policy "novels_update_own_pending"
on public.novels for update
to authenticated
using (author_id = auth.uid() and approved = false and public.is_author_or_admin())
with check (author_id = auth.uid() and approved = false and public.is_author_or_admin());

create policy "novels_admin_all"
on public.novels for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- comments
drop policy if exists "comments_select_visible" on public.comments;
drop policy if exists "comments_insert_public_pending" on public.comments;
drop policy if exists "comments_admin_all" on public.comments;
drop policy if exists "public reads approved comments" on public.comments;
drop policy if exists "anyone creates comments" on public.comments;
drop policy if exists "admins manage comments" on public.comments;

create policy "comments_select_visible"
on public.comments for select
to anon, authenticated
using (approved = true or user_id = auth.uid() or public.is_admin());

create policy "comments_insert_public_pending"
on public.comments for insert
to anon, authenticated
with check (
(user_id is null or user_id = auth.uid())
  and char_length(name) between 1 and 80
  and char_length(text) between 1 and 1000
  and (approved = false or public.is_admin())
);

create policy "comments_admin_all"
on public.comments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- settings
drop policy if exists "settings_select_public" on public.settings;
drop policy if exists "settings_admin_all" on public.settings;
drop policy if exists "public reads settings" on public.settings;
 drop policy if exists "admins manage settings" on public.settings;

create policy "settings_select_public"
on public.settings for select
to anon, authenticated
using (id = 'main');

create policy "settings_admin_all"
on public.settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6) Seed data
-- -----------------------------------------------------------------------------
insert into public.settings (id, value)
values (
  'main',
  '{"siteName":"مملكة الروايات","description":"منصة عربية احترافية لنشر الروايات وقراءتها وإدارة مجتمع القراء والكتّاب.","contactEmail":"admin@novels-kingdom.local","patreonUrl":"https://patreon.com/yourpage"}'::jsonb
)
on conflict (id) do update set
  value = excluded.value,
  updated_at = now();
insert into public.novels (id, title, author, category, type, status, reads, rating, description, cover, chapters, featured, approved, premium)
on conflict (id) do update set
  title = excluded.title,
  author = excluded.author,
  category = excluded.category,
  type = excluded.type,
  status = excluded.status,
  reads = excluded.reads,
  rating = excluded.rating,
  description = excluded.description,
  cover = excluded.cover,
  chapters = excluded.chapters,
  featured = excluded.featured,
  approved = excluded.approved,
  premium = excluded.premium,
  updated_at = now();

insert into public.comments (id, novel_id, name, text, approved)
values ('seed-comment-shadows', 'shadows-of-ink', 'قارئ شغوف', 'بداية مشوقة وأسلوب جميل!', true)
on conflict (id) do update set
  novel_id = excluded.novel_id,
  name = excluded.name,
  text = excluded.text,
  approved = excluded.approved;

commit;
