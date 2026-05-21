-- Migration: Round 1 — additive fields for category colors, "want to buy more",
-- "for sale" flags, and physical location.
--
-- Safe to re-run.

-- Per-category color (hex string, e.g. "#f59e0b"). Optional.
alter table public.categories
  add column if not exists color text;

-- "I want to buy more of this" wishlist flag + desired buy price.
alter table public.items
  add column if not exists want_more boolean not null default false;
alter table public.items
  add column if not exists desired_buy_price numeric;

-- "Currently listed for sale" flag + asking price.
alter table public.items
  add column if not exists for_sale boolean not null default false;
alter table public.items
  add column if not exists asking_price numeric;

-- Where the physical item lives. Free text on the DB side; the UI restricts to
-- a fixed list of options ("home", "parents", "digital", "incoming", "other").
alter table public.items
  add column if not exists location text;
