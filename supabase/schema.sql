-- Value Tracker — database schema
-- Run this whole file in the Supabase SQL editor (Supabase dashboard → SQL Editor → New query)

-- ---------- Tables ----------

create table if not exists public.categories (
  id           text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  name         text not null,
  fields       text[] not null default '{}',  -- subset of: serial, version, set, boughtFor
  "order"      int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);

-- Items reference categories by (user_id, category_id), so we need a UNIQUE on
-- (user_id, id) before we can declare the foreign key. Add it idempotently.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_user_id_id_key'
  ) then
    alter table public.categories add constraint categories_user_id_id_key unique (user_id, id);
  end if;
end$$;

create table if not exists public.items (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  category_id   text not null,
  name          text not null,
  serial        text,
  version       text,
  "set"         text,
  bought_for    numeric,
  current_value numeric not null default 0,
  notes         text,
  is_pending    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint items_category_fk
    foreign key (user_id, category_id)
    references public.categories(user_id, id)
    on delete cascade
);

create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_category_id_idx on public.items(user_id, category_id);

-- ---------- Row Level Security ----------
-- Every user only sees their own rows. The boyfriend logs in with his own email,
-- so by default he sees his own (empty) account. To share data we use a tiny
-- "share" table below.

alter table public.categories enable row level security;
alter table public.items      enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own items" on public.items;
create policy "own items" on public.items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- Sharing ----------
-- A simple allowlist: rows here say "user A grants user B full read/write access to A's data".
-- We then extend the RLS policies above to also allow access when there's a matching share.

create table if not exists public.shares (
  owner_id     uuid not null references auth.users on delete cascade,
  shared_with  uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (owner_id, shared_with)
);

alter table public.shares enable row level security;

drop policy if exists "see own shares" on public.shares;
create policy "see own shares" on public.shares
  for select using (auth.uid() = owner_id or auth.uid() = shared_with);

drop policy if exists "manage own shares" on public.shares;
create policy "manage own shares" on public.shares
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Extend the policies so shared users can read & write
drop policy if exists "shared categories" on public.categories;
create policy "shared categories" on public.categories
  for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.categories.user_id and s.shared_with = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.categories.user_id and s.shared_with = auth.uid()
    )
  );

drop policy if exists "shared items" on public.items;
create policy "shared items" on public.items
  for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.items.user_id and s.shared_with = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.shares s
      where s.owner_id = public.items.user_id and s.shared_with = auth.uid()
    )
  );
