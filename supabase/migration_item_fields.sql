-- Migration: extra per-item fields — condition/grade, purchase date, quantity.
--
-- quantity defaults to 1; the app multiplies value and "bought for" by it so
-- totals stay correct (e.g. 3 copies à 100 kr = 300 kr).
--
-- Safe to re-run.

alter table public.items
  add column if not exists grade text;

alter table public.items
  add column if not exists purchase_date date;

alter table public.items
  add column if not exists quantity int not null default 1;
