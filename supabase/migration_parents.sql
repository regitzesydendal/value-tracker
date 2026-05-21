-- Migration: allow items to have children (e.g. "Collectr" containing many cards)
--
-- Items can be marked as containers (is_container = true). Other items can then
-- be added as children with parent_id pointing to the container.
--
-- Parent value stays independent of children (children are informational).
-- Children do NOT count toward category totals — only top-level items do.
--
-- Safe to re-run.

alter table public.items
  add column if not exists is_container boolean not null default false;

alter table public.items
  add column if not exists parent_id text references public.items(id) on delete cascade;

create index if not exists items_parent_id_idx on public.items(parent_id);
