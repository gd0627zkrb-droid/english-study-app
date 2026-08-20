-- English Study: Supabase schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.study_tabs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('speaking','listening','writing','reading')),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tab_id uuid not null references public.study_tabs(id) on delete cascade,
  title text not null,
  url text,
  memo text,
  article_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.reading_articles(id) on delete cascade,
  term text not null,
  meaning text not null,
  how text,
  example text,
  level smallint not null default 0 check (level between 0 and 2),
  last_reviewed timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists study_tabs_user_category_idx on public.study_tabs(user_id, category);
create index if not exists reading_articles_user_tab_idx on public.reading_articles(user_id, tab_id);
create index if not exists learning_items_user_article_idx on public.learning_items(user_id, article_id);

alter table public.study_tabs enable row level security;
alter table public.reading_articles enable row level security;
alter table public.learning_items enable row level security;

drop policy if exists "users manage own study tabs" on public.study_tabs;
create policy "users manage own study tabs"
on public.study_tabs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own reading articles" on public.reading_articles;
create policy "users manage own reading articles"
on public.reading_articles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users manage own learning items" on public.learning_items;
create policy "users manage own learning items"
on public.learning_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Seed the four default tabs for a newly signed-in user from the app.
