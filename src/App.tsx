import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Sidebar } from "./components/Sidebar";
import { ItemTable } from "./components/ItemTable";
import { ItemFormModal } from "./components/ItemFormModal";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { AuthGate } from "./components/AuthGate";
import {
  loadData,
  upsertCategory,
  deleteCategory as dbDeleteCategory,
  upsertItem,
  deleteItem as dbDeleteItem,
  seedIfEmpty,
  makeId,
} from "./lib/storage";
import { supabase } from "./lib/supabase";
import type { AppData, Category, FieldKey, Item } from "./lib/types";

export default function App() {
  return <AuthGate>{(session) => <TrackerApp session={session} />}</AuthGate>;
}

function TrackerApp({ session }: { session: Session }) {
  const userId = session.user.id;
  const [data, setData] = useState<AppData>({ categories: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Initial load: seed defaults on first login, then fetch everything.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedIfEmpty(userId);
        const fresh = await loadData(userId);
        if (!cancelled) setData(fresh);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const categoriesById = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c])),
    [data.categories],
  );

  const filteredItems = useMemo(() => {
    let list = data.items;
    if (selected !== "all") list = list.filter((i) => i.categoryId === selected);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.set?.toLowerCase().includes(q) ||
          i.version?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data.items, selected, search]);

  const currentCategory =
    selected === "all" ? null : data.categories.find((c) => c.id === selected) ?? null;

  function handleAddItem() {
    setEditingItem(null);
    setItemModalOpen(true);
  }

  function handleEditItem(item: Item) {
    setEditingItem(item);
    setItemModalOpen(true);
  }

  async function handleSubmitItem(
    payload: Omit<Item, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    const nowIso = new Date().toISOString();
    const isUpdate = !!payload.id;
    const item: Item = isUpdate
      ? {
          ...(data.items.find((i) => i.id === payload.id) as Item),
          ...payload,
          id: payload.id!,
          updatedAt: nowIso,
        }
      : {
          ...payload,
          id: makeId(),
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    // Optimistic update
    setData((prev) => ({
      ...prev,
      items: isUpdate
        ? prev.items.map((i) => (i.id === item.id ? item : i))
        : [...prev.items, item],
    }));
    setItemModalOpen(false);
    setEditingItem(null);

    try {
      await upsertItem(userId, item);
    } catch (e) {
      alert(`Kunne ikke gemme: ${e instanceof Error ? e.message : String(e)}`);
      // Reload from server to undo the optimistic change
      const fresh = await loadData(userId);
      setData(fresh);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Slet dette element?")) return;
    const prevItems = data.items;
    setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
    try {
      await dbDeleteItem(id);
    } catch (e) {
      alert(`Kunne ikke slette: ${e instanceof Error ? e.message : String(e)}`);
      setData((prev) => ({ ...prev, items: prevItems }));
    }
  }

  function handleAddCategory() {
    setEditingCat(null);
    setCatModalOpen(true);
  }

  async function handleSubmitCategory(payload: {
    id?: string;
    name: string;
    fields: FieldKey[];
  }) {
    const isUpdate = !!payload.id;
    const cat: Category = isUpdate
      ? {
          ...(data.categories.find((c) => c.id === payload.id) as Category),
          name: payload.name,
          fields: payload.fields,
        }
      : {
          id: makeId(),
          name: payload.name,
          fields: payload.fields,
          order: Math.max(0, ...data.categories.map((c) => c.order)) + 1,
        };

    setData((prev) => ({
      ...prev,
      categories: isUpdate
        ? prev.categories.map((c) => (c.id === cat.id ? cat : c))
        : [...prev.categories, cat],
    }));
    setCatModalOpen(false);
    setEditingCat(null);

    try {
      await upsertCategory(userId, cat);
    } catch (e) {
      alert(`Kunne ikke gemme kategori: ${e instanceof Error ? e.message : String(e)}`);
      const fresh = await loadData(userId);
      setData(fresh);
    }
  }

  async function handleDeleteCategory(id: string) {
    const prev = data;
    setData((p) => ({
      categories: p.categories.filter((c) => c.id !== id),
      items: p.items.filter((i) => i.categoryId !== id),
    }));
    setCatModalOpen(false);
    setEditingCat(null);
    if (selected === id) setSelected("all");

    try {
      await dbDeleteCategory(id);
    } catch (e) {
      alert(`Kunne ikke slette kategori: ${e instanceof Error ? e.message : String(e)}`);
      setData(prev);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
        Indlæser dine data…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold mb-2">Kunne ikke indlæse data</h1>
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-3">
            {loadError}
          </p>
          <p className="text-xs text-neutral-500">
            Har du kørt <code>supabase/schema.sql</code> i SQL editoren?
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 text-sm underline text-neutral-500"
          >
            Log ud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar
        categories={data.categories}
        items={data.items}
        selectedId={selected}
        onSelect={setSelected}
        onAddCategory={handleAddCategory}
      />

      <main className="flex-1 min-w-0">
        <header className="border-b border-neutral-200 bg-white px-8 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">
              {currentCategory ? currentCategory.name : "Alle elementer"}
            </h1>
            <div className="text-xs text-neutral-500 mt-0.5">
              {filteredItems.length} element
              {filteredItems.length === 1 ? "" : "er"}
            </div>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg…"
            className="input max-w-xs"
          />

          {currentCategory && (
            <button
              onClick={() => {
                setEditingCat(currentCategory);
                setCatModalOpen(true);
              }}
              className="text-sm px-3 py-1.5 rounded hover:bg-neutral-100 text-neutral-600"
            >
              Rediger kategori
            </button>
          )}

          <button
            onClick={handleAddItem}
            className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800"
          >
            + Tilføj
          </button>

          <div className="border-l border-neutral-200 pl-4 flex items-center gap-2">
            <span className="text-xs text-neutral-500" title={session.user.email ?? ""}>
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-neutral-500 underline hover:text-neutral-900"
            >
              Log ud
            </button>
          </div>
        </header>

        <div className="p-8">
          <ItemTable
            items={filteredItems}
            category={currentCategory}
            categoriesById={categoriesById}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
          />
        </div>
      </main>

      <ItemFormModal
        open={itemModalOpen}
        initial={editingItem}
        categories={data.categories}
        defaultCategoryId={selected !== "all" ? selected : undefined}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmitItem}
      />

      <CategoryFormModal
        open={catModalOpen}
        initial={editingCat}
        onClose={() => {
          setCatModalOpen(false);
          setEditingCat(null);
        }}
        onSubmit={handleSubmitCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
}
