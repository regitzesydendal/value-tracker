-- Migration: add marketplace_url column to items.
-- A free-form URL the user can click to jump straight to e.g. Cardmarket /
-- TCGPlayer / eBay listing for that card. Used as a manual price-check shortcut
-- since the Cardmarket public API is currently closed to new applications.
--
-- Safe to re-run.

alter table public.items
  add column if not exists marketplace_url text;
