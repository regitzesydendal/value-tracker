-- Migration: per-category logo/icon.
--
-- Stores either an emoji (e.g. "⚽") or the token "pokeball" (drawn as an SVG
-- in the app). Optional — when empty, the app guesses an icon from the
-- category name.
--
-- Safe to re-run.

alter table public.categories
  add column if not exists icon text;
