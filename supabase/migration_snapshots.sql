-- Migration: add snapshots table for tracking category values over time
-- Run this once in the Supabase SQL editor (New query → paste → Run).
-- Safe to re-run (uses IF NOT EXISTS / drop-and-recreate for policies).

create table if not exists public.snapshots (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  date         date not null,                     -- the date the snapshot represents
  category_id  text not null,                     -- '__total__' for grand-total row
  value        numeric not null,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (user_id, date, category_id)
);

create index if not exists snapshots_user_date_idx on public.snapshots(user_id, date);

alter table public.snapshots enable row level security;

drop policy if exists "own snapshots" on public.snapshots;
create policy "own snapshots" on public.snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "shared snapshots" on public.snapshots;
create policy "shared snapshots" on public.snapshots
  for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.snapshots.user_id and s.shared_with = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.snapshots.user_id and s.shared_with = auth.uid()
    )
  );
