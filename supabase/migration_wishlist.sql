-- Migration: "Ønskeliste" (wishlist) — things the user wants to buy.
--
-- A standalone list, kept separate from the collection so it does NOT count
-- toward net worth / category totals. Each row is one thing to buy, with an
-- expected price, quantity, expected purchase date, priority and a free note.
--
-- Safe to re-run.

create table if not exists public.wishlist (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  price         numeric,                       -- expected price per unit (kr.)
  quantity      int not null default 1,
  expected_date date,                          -- expected purchase date
  priority      text,                          -- 'high' | 'medium' | 'low'
  notes         text,                          -- free note / link
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists wishlist_user_id_idx on public.wishlist(user_id);

-- ---------- Row Level Security ----------
alter table public.wishlist enable row level security;

-- Own rows.
drop policy if exists "own wishlist" on public.wishlist;
create policy "own wishlist" on public.wishlist
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Shared access mirrors the items/categories policies (see schema.sql): a user
-- who has been granted access via `shares` can also read/write these rows.
drop policy if exists "shared wishlist" on public.wishlist;
create policy "shared wishlist" on public.wishlist
  for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.wishlist.user_id and s.shared_with = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.wishlist.user_id and s.shared_with = auth.uid()
    )
  );
