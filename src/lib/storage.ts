import { supabase } from "./supabase";
import { seedData } from "./seed";
import type { AppData, Category, Item } from "./types";

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
    updated_at: item.updatedAt,
  });
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
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
