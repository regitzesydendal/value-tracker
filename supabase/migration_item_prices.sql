-- Migration: price history per item.
--
-- One row per item per day. Written automatically whenever an item's current
-- value changes, and from the "Opdater pris" box in the item detail view.
-- Powers the per-item price chart.
--
-- Safe to re-run.

create table if not exists public.item_prices (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  item_id     text not null references public.items(id) on delete cascade,
  date        date not null,
  price       numeric not null,          -- per-unit price (kr.)
  created_at  timestamptz not null default now(),
  unique (item_id, date)
);

create index if not exists item_prices_item_idx on public.item_prices(item_id, date);
create index if not exists item_prices_user_idx on public.item_prices(user_id);

alter table public.item_prices enable row level security;

drop policy if exists "own item prices" on public.item_prices;
create policy "own item prices" on public.item_prices
  for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.item_prices.user_id and s.shared_with = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.item_prices.user_id and s.shared_with = auth.uid()
    )
  );
