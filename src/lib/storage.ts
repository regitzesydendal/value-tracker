import { supabase } from "./supabase";
import { seedData } from "./seed";
import { historicalSnapshots } from "./historicalSeed";
import { TOTAL_CATEGORY_ID } from "./types";
import type { AppData, Category, Item, Snapshot } from "./types";

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Mapping between DB rows (snake_case) and app types (camelCase) ----------

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  fields: string[];
  order: number;
};

type ItemRow = {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  serial: string | null;
  version: string | null;
  set: string | null;
  bought_for: number | null;
  current_value: number;
  notes: string | null;
  is_pending: boolean;
  marketplace_url: string | null;
  created_at: string;
  updated_at: string;
};

function rowToCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    fields: (r.fields ?? []) as Category["fields"],
    order: r.order,
  };
}

function rowToItem(r: ItemRow): Item {
  return {
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    serial: r.serial ?? undefined,
    version: r.version ?? undefined,
    set: r.set ?? undefined,
    boughtFor: r.bought_for ?? undefined,
    currentValue: r.current_value,
    notes: r.notes ?? undefined,
    isPending: r.is_pending,
    marketplaceUrl: r.marketplace_url ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------- Reads ----------

export async function loadData(userId: string): Promise<AppData> {
  const [catRes, itemRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("order", { ascending: true }),
    supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  if (catRes.error) throw catRes.error;
  if (itemRes.error) throw itemRes.error;

  return {
    categories: (catRes.data as CategoryRow[]).map(rowToCategory),
    items: (itemRes.data as ItemRow[]).map(rowToItem),
  };
}

// ---------- Writes ----------

export async function upsertCategory(
  userId: string,
  cat: Category,
): Promise<void> {
  const { error } = await supabase.from("categories").upsert({
    id: cat.id,
    user_id: userId,
    name: cat.name,
    fields: cat.fields,
    order: cat.order,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  // FK cascade in the schema deletes the items along with it.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertItem(userId: string, item: Item): Promise<void> {
  const { error } = await supabase.from("items").upsert({
    id: item.id,
    user_id: userId,
    category_id: item.categoryId,
    name: item.name,
    serial: item.serial ?? null,
    version: item.version ?? null,
    set: item.set ?? null,
    bought_for: item.boughtFor ?? null,
    current_value: item.currentValue,
    notes: item.notes ?? null,
    is_pending: item.isPending ?? false,
    marketplace_url: item.marketplaceUrl ?? null,
    updated_at: item.updatedAt,
  });
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

// Bulk-insert items (used by CSV import). Returns the number of rows inserted.
export async function insertItems(userId: string, items: Item[]): Promise<number> {
  if (items.length === 0) return 0;
  const rows = items.map((item) => ({
    id: item.id,
    user_id: userId,
    category_id: item.categoryId,
    name: item.name,
    serial: item.serial ?? null,
    version: item.version ?? null,
    set: item.set ?? null,
    bought_for: item.boughtFor ?? null,
    current_value: item.currentValue,
    notes: item.notes ?? null,
    is_pending: item.isPending ?? false,
    marketplace_url: item.marketplaceUrl ?? null,
    updated_at: item.updatedAt,
  }));
  const { error } = await supabase.from("items").insert(rows);
  if (error) throw error;
  return rows.length;
}

// ---------- Snapshots ----------

type SnapshotRow = {
  id: string;
  user_id: string;
  date: string;
  category_id: string;
  value: number;
  notes: string | null;
  created_at: string;
};

function rowToSnapshot(r: SnapshotRow): Snapshot {
  return {
    id: r.id,
    date: r.date,
    categoryId: r.category_id,
    value: Number(r.value),
    notes: r.notes ?? undefined,
  };
}

export async function loadSnapshots(userId: string): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as SnapshotRow[]).map(rowToSnapshot);
}

// Take a full snapshot for a given date: one row per category + grand total.
// Replaces any existing rows for the same date (idempotent by (user_id, date, category_id)).
export async function takeSnapshot(
  userId: string,
  date: string,
  data: AppData,
  notes?: string,
): Promise<void> {
  const totalsByCategory = new Map<string, number>();
  let grandTotal = 0;
  for (const item of data.items) {
    totalsByCategory.set(
      item.categoryId,
      (totalsByCategory.get(item.categoryId) ?? 0) + (item.currentValue || 0),
    );
    grandTotal += item.currentValue || 0;
  }

  const rows: Omit<SnapshotRow, "created_at">[] = [];
  for (const cat of data.categories) {
    rows.push({
      id: `${userId}:${date}:${cat.id}`,
      user_id: userId,
      date,
      category_id: cat.id,
      value: totalsByCategory.get(cat.id) ?? 0,
      notes: notes ?? null,
    });
  }
  rows.push({
    id: `${userId}:${date}:${TOTAL_CATEGORY_ID}`,
    user_id: userId,
    date,
    category_id: TOTAL_CATEGORY_ID,
    value: grandTotal,
    notes: notes ?? null,
  });

  const { error } = await supabase
    .from("snapshots")
    .upsert(rows, { onConflict: "user_id,date,category_id" });
  if (error) throw error;
}

export async function deleteSnapshotsForDate(
  userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from("snapshots")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);
  if (error) throw error;
}

// Edit an existing snapshot — overwrite category values and/or move it to a
// different date. `values` maps category_id -> kr value. The grand-total row
// is computed automatically as the sum of all category values.
export async function replaceSnapshot(
  userId: string,
  originalDate: string,
  newDate: string,
  values: Map<string, number>,
  notes?: string,
): Promise<void> {
  // If the date moved, drop the old day entirely first so we don't leave orphans.
  if (originalDate !== newDate) {
    await deleteSnapshotsForDate(userId, originalDate);
  } else {
    // Same date — clear out any categories the user removed before re-inserting.
    await deleteSnapshotsForDate(userId, newDate);
  }

  const rows: Omit<SnapshotRow, "created_at">[] = [];
  let total = 0;
  for (const [categoryId, value] of values) {
    if (categoryId === TOTAL_CATEGORY_ID) continue; // recomputed below
    rows.push({
      id: `${userId}:${newDate}:${categoryId}`,
      user_id: userId,
      date: newDate,
      category_id: categoryId,
      value,
      notes: notes ?? null,
    });
    total += value;
  }
  rows.push({
    id: `${userId}:${newDate}:${TOTAL_CATEGORY_ID}`,
    user_id: userId,
    date: newDate,
    category_id: TOTAL_CATEGORY_ID,
    value: total,
    notes: notes ?? null,
  });

  if (rows.length === 1) return; // only the total row — no real data, nothing to save
  const { error } = await supabase
    .from("snapshots")
    .upsert(rows, { onConflict: "user_id,date,category_id" });
  if (error) throw error;
}

// One-time backfill of March + April 2026 historical data from the spreadsheet.
// Uses upsert so re-clicking the button is harmless.
export async function backfillHistoricalSnapshots(userId: string): Promise<number> {
  const rows = historicalSnapshots.map((s) => ({
    id: `${userId}:${s.date}:${s.categoryId}`,
    user_id: userId,
    date: s.date,
    category_id: s.categoryId,
    value: s.value,
    notes: "Historisk backfill",
  }));
  const { error } = await supabase
    .from("snapshots")
    .upsert(rows, { onConflict: "user_id,date,category_id" });
  if (error) throw error;
  return rows.length;
}

// ---------- First-time setup ----------

export async function seedIfEmpty(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  if ((count ?? 0) > 0) return false;

  const nowIso = new Date().toISOString();

  const categoryRows = seedData.categories.map((c) => ({
    id: c.id,
    user_id: userId,
    name: c.name,
    fields: c.fields,
    order: c.order,
    updated_at: nowIso,
  }));
  const { error: catErr } = await supabase.from("categories").insert(categoryRows);
  if (catErr) throw catErr;

  const itemRows = seedData.items.map((i) => ({
    id: i.id,
    user_id: userId,
    category_id: i.categoryId,
    name: i.name,
    serial: i.serial ?? null,
    version: i.version ?? null,
    set: i.set ?? null,
    bought_for: i.boughtFor ?? null,
    current_value: i.currentValue,
    notes: i.notes ?? null,
    is_pending: i.isPending ?? false,
    updated_at: nowIso,
  }));
  const { error: itemErr } = await supabase.from("items").insert(itemRows);
  if (itemErr) throw itemErr;

  return true;
}
