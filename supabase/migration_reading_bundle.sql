-- Reading bundle migration: English / translation / vocabulary context / grammar
-- Run this once in Supabase SQL Editor.

alter table public.reading_articles
  add column if not exists english_text text,
  add column if not exists japanese_translation text,
  add column if not exists grammar_notes text;

alter table public.learning_items
  add column if not exists context text;

grant select, insert, update, delete
on table public.reading_articles
 to anon, authenticated;

grant select, insert, update, delete
on table public.learning_items
 to anon, authenticated;
