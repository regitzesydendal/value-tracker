# Roadmap

Future features and decisions for the value tracker.

## Live price syncing

**Status:** not built yet. The current app stores whatever price the user types in.

### What about Collectr?

Collectr (the mobile collection-tracking app) does **not** publish a public/documented API
as of this writing. Their product is mobile-first and a third-party integration would either
need:

- A CSV export from the Collectr app (if/when they support it) — clean and ToS-safe.
- Reverse-engineering the mobile app's private API — fragile, can break any time, and
  likely violates their terms of service.

So we will **not** integrate directly with Collectr.

### Plan instead: pull live prices from other sources

Phased rollout once the core app is deployed and being used:

#### Phase 1 — CSV import (cheap, immediate value)

Add a "Import CSV" button on each category. Accept either:

- A Collectr CSV export (if available)
- A copy/paste from the existing Google Sheet / Excel

This is a snapshot of prices at the moment of export — not live, but lets us bulk-load
the existing collection in seconds.

#### Phase 2 — Auto-refresh Pokémon prices

Use **pokemontcg.io** (free public REST API, prices fed by TCGPlayer & Cardmarket).
For each Pokémon item, store an external card ID and a "last refreshed" timestamp.
A "Refresh prices" button (or nightly cron once we have a backend) pulls fresh
values automatically.

Sealed Pokémon products (boosters, ETBs, etc.) require a different source —
TCGPlayer's product API (free, requires approval) or PriceCharting (paid).

#### Phase 3 — Sports cards (football, basketball)

Harder market — no clean free public API.

- **eBay Browse API** for sold-listing comparables (paid tier, rate-limited).
- **Card Ladder** has an API (paid).
- Manual override always available — the user can pin a price the auto-refresh won't touch.

#### Phase 4 — One Piece, Magic, etc.

- TCGPlayer for English print runs.
- For JP / Asia print: still manual until a good source surfaces.

### Design notes for whoever builds this

- Each item should have optional fields: `externalSource` (e.g. `pokemontcg.io`),
  `externalId`, `priceRefreshedAt`, `priceLocked` (true = don't auto-update).
- Refresh logic lives on the backend (Supabase Edge Function) so we don't ship API
  keys to the browser.
- A small "i" tooltip on each price shows where the value came from and when it was last
  refreshed.

---

## Other future ideas

- Charts: portfolio value over time (we already have `updatedAt`, just need to snapshot
  on a schedule)
- Photos: upload an image per item
- Public sharing: read-only link to show off the collection
- Buy/sell ledger: track realised profit, not just unrealised value
