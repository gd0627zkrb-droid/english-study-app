-- Listening / Podcast bundle support
-- Run once in Supabase SQL Editor.

create table if not exists public.listening_podcasts (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references public.study_tabs(id) on delete cascade,
  title text not null,
  url text,
  memo text,
  transcript text,
  japanese_translation text,
  grammar_notes text,
  podcast_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.listening_items (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.listening_podcasts(id) on delete cascade,
  term text not null,
  meaning text not null,
  context text,
  how text,
  example text,
  created_at timestamptz not null default now()
);

create index if not exists listening_podcasts_tab_idx on public.listening_podcasts(tab_id);
create index if not exists listening_items_podcast_idx on public.listening_items(podcast_id);

alter table public.listening_podcasts enable row level security;
alter table public.listening_items enable row level security;

drop policy if exists "public app can manage listening podcasts" on public.listening_podcasts;
create policy "public app can manage listening podcasts"
on public.listening_podcasts for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public app can manage listening items" on public.listening_items;
create policy "public app can manage listening items"
on public.listening_items for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on table public.listening_podcasts to anon, authenticated;
grant select, insert, update, delete on table public.listening_items to anon, authenticated;
