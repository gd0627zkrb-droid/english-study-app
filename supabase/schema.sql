-- English Study: Supabase schema (no-login personal app)
-- Run this in Supabase SQL Editor after the previous login-based schema.
-- This app intentionally uses Supabase anonymously; data is not private from other visitors.

create extension if not exists pgcrypto;

drop policy if exists "users manage own study tabs" on public.study_tabs;
drop policy if exists "users manage own reading articles" on public.reading_articles;
drop policy if exists "users manage own learning items" on public.learning_items;
drop policy if exists "public app can manage study tabs" on public.study_tabs;
drop policy if exists "public app can manage reading articles" on public.reading_articles;
drop policy if exists "public app can manage learning items" on public.learning_items;

alter table if exists public.learning_items drop constraint if exists learning_items_user_id_fkey;
alter table if exists public.reading_articles drop constraint if exists reading_articles_user_id_fkey;
alter table if exists public.study_tabs drop constraint if exists study_tabs_user_id_fkey;
alter table if exists public.learning_items drop column if exists user_id;
alter table if exists public.reading_articles drop column if exists user_id;
alter table if exists public.study_tabs drop column if exists user_id;

create table if not exists public.study_tabs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('speaking','listening','writing','reading')),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_articles (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references public.study_tabs(id) on delete cascade,
  title text not null,
  url text,
  memo text,
  article_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.reading_articles(id) on delete cascade,
  term text not null,
  meaning text not null,
  how text,
  example text,
  level smallint not null default 0 check (level between 0 and 2),
  last_reviewed timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists study_tabs_category_idx on public.study_tabs(category);
create index if not exists reading_articles_tab_idx on public.reading_articles(tab_id);
create index if not exists learning_items_article_idx on public.learning_items(article_id);

alter table public.study_tabs enable row level security;
alter table public.reading_articles enable row level security;
alter table public.learning_items enable row level security;

-- RLS: no-login app. Any visitor using the publishable key can access these tables.
create policy "public app can manage study tabs"
on public.study_tabs for all
to anon, authenticated
using (true)
with check (true);

create policy "public app can manage reading articles"
on public.reading_articles for all
to anon, authenticated
using (true)
with check (true);

create policy "public app can manage learning items"
on public.learning_items for all
to anon, authenticated
using (true)
with check (true);

-- Because automatic table exposure was disabled when the project was created,
-- explicitly grant the Data API privileges required by the no-login app.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.study_tabs to anon, authenticated;
grant select, insert, update, delete on table public.reading_articles to anon, authenticated;
grant select, insert, update, delete on table public.learning_items to anon, authenticated;

-- Default tabs are created by the app the first time it loads.
