import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Sidebar } from "./components/Sidebar";
import { ItemTable } from "./components/ItemTable";
import { ItemFormModal } from "./components/ItemFormModal";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { AuthGate } from "./components/AuthGate";
import { SnapshotButton } from "./components/SnapshotButton";
import { HistoryView } from "./components/HistoryView";
import { CsvImportModal } from "./components/CsvImportModal";
import { WishlistView } from "./components/WishlistView";
import { WishlistFormModal } from "./components/WishlistFormModal";
import { AllocationChart } from "./components/AllocationChart";
import { SummaryCards } from "./components/SummaryCards";
import { CategoryIcon } from "./lib/categoryIcons";
import themeBg from "./assets/theme-bg.svg";
import {
  loadData,
  loadSnapshots,
  upsertCategory,
  deleteCategory as dbDeleteCategory,
  upsertItem,
  deleteItem as dbDeleteItem,
  loadWishlist,
  upsertWishlistItem,
  deleteWishlistItem as dbDeleteWishlistItem,
  makeId,
} from "./lib/storage";
import { supabase } from "./lib/supabase";
import type {
  AppData,
  Category,
  FieldKey,
  Item,
  Snapshot,
  WishlistItem,
} from "./lib/types";

export default function App() {
  return <AuthGate>{(session) => <TrackerApp session={session} />}</AuthGate>;
}

function TrackerApp({ session }: { session: Session }) {
  const userId = session.user.id;
  const [data, setData] = useState<AppData>({ categories: [], items: [] });
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [view, setView] = useState<"list" | "history" | "wishlist">("list");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [wishlistModalOpen, setWishlistModalOpen] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState<WishlistItem | null>(null);

  const [selected, setSelected] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<Item | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  async function refreshSnapshots() {
    try {
      const fresh = await loadSnapshots(userId);
      setSnapshots(fresh);
    } catch (e) {
      // Snapshot loading is non-fatal; the history view will show 0 entries.
      // The most common cause is the migration not having been run yet.
      console.warn("loadSnapshots failed:", e);
    }
  }

  // Initial load: fetch items + categories + snapshots for this user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fresh, snaps, wish] = await Promise.all([
          loadData(userId),
          loadSnapshots(userId).catch(() => [] as Snapshot[]),
          loadWishlist(userId).catch(() => [] as WishlistItem[]),
        ]);
        if (!cancelled) {
          setData(fresh);
          setSnapshots(snaps);
          setWishlist(wish);
        }
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

  // Top-level items only — children are rendered inside their parent.
  // Search matches children too: if a child matches, also include its parent.
  const filteredItems = useMemo(() => {
    const isInCat = (i: Item) =>
      selected === "all" || i.categoryId === selected;
    const q = search.trim().toLowerCase();
    const matches = (i: Item) =>
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.set?.toLowerCase().includes(q) ||
      i.version?.toLowerCase().includes(q);

    if (!q) {
      return data.items.filter((i) => !i.parentId && isInCat(i));
    }
    // With search: include any top-level item that matches OR whose child matches
    const parentIdsWithMatchingChild = new Set<string>();
    for (const i of data.items) {
      if (i.parentId && matches(i)) parentIdsWithMatchingChild.add(i.parentId);
    }
    return data.items.filter(
      (i) =>
        !i.parentId &&
        isInCat(i) &&
        (matches(i) || parentIdsWithMatchingChild.has(i.id)),
    );
  }, [data.items, selected, search]);

  const currentCategory =
    selected === "all" ? null : data.categories.find((c) => c.id === selected) ?? null;

  function handleAddItem() {
    setEditingItem(null);
    setAddingChildOf(null);
    setItemModalOpen(true);
  }

  function handleEditItem(item: Item) {
    setEditingItem(item);
    setAddingChildOf(null);
    setItemModalOpen(true);
  }

  function handleAddChild(parent: Item) {
    setEditingItem(null);
    setAddingChildOf(parent);
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

  async function handleUpdateItemValue(item: Item, newCurrentValue: number) {
    const updated: Item = {
      ...item,
      currentValue: newCurrentValue,
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === item.id ? updated : i)),
    }));
    try {
      await upsertItem(userId, updated);
    } catch (e) {
      alert(`Kunne ikke gemme: ${e instanceof Error ? e.message : String(e)}`);
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
    color?: string;
    icon?: string;
  }) {
    const isUpdate = !!payload.id;
    const cat: Category = isUpdate
      ? {
          ...(data.categories.find((c) => c.id === payload.id) as Category),
          name: payload.name,
          fields: payload.fields,
          color: payload.color,
          icon: payload.icon,
        }
      : {
          id: makeId(),
          name: payload.name,
          fields: payload.fields,
          color: payload.color,
          icon: payload.icon,
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

  function handleAddWishlist() {
    setEditingWishlistItem(null);
    setWishlistModalOpen(true);
  }

  function handleEditWishlist(item: WishlistItem) {
    setEditingWishlistItem(item);
    setWishlistModalOpen(true);
  }

  async function handleSubmitWishlist(
    payload: Omit<WishlistItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    const nowIso = new Date().toISOString();
    const isUpdate = !!payload.id;
    const item: WishlistItem = isUpdate
      ? {
          ...(wishlist.find((w) => w.id === payload.id) as WishlistItem),
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

    setWishlist((prev) =>
      isUpdate ? prev.map((w) => (w.id === item.id ? item : w)) : [...prev, item],
    );
    setWishlistModalOpen(false);
    setEditingWishlistItem(null);

    try {
      await upsertWishlistItem(userId, item);
    } catch (e) {
      alert(`Kunne ikke gemme: ${e instanceof Error ? e.message : String(e)}`);
      setWishlist(await loadWishlist(userId));
    }
  }

  async function handleDeleteWishlist(id: string) {
    const prev = wishlist;
    setWishlist((p) => p.filter((w) => w.id !== id));
    try {
      await dbDeleteWishlistItem(id);
    } catch (e) {
      alert(`Kunne ikke slette: ${e instanceof Error ? e.message : String(e)}`);
      setWishlist(prev);
    }
  }

  async function handleMarkBought(item: WishlistItem) {
    if (!confirm(`Marker "${item.name}" som købt og fjern fra ønskelisten?`)) return;
    await handleDeleteWishlist(item.id);
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
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ backgroundImage: `url(${themeBg})`, backgroundRepeat: "repeat" }}
      />
      <Sidebar
        categories={data.categories}
        items={data.items}
        selectedId={selected}
        onSelect={(id) => {
          setSelected(id);
          setView("list");
        }}
        onAddCategory={handleAddCategory}
        wishlistActive={view === "wishlist"}
        wishlistCount={wishlist.length}
        onSelectWishlist={() => setView("wishlist")}
      />

      <main className="flex-1 min-w-0">
        <header className="border-b border-neutral-200 bg-white px-8 py-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap flex items-center gap-2">
              {view === "list" && currentCategory && (
                <CategoryIcon category={currentCategory} size={22} />
              )}
              <span>
                {view === "history"
                  ? "Historik"
                  : view === "wishlist"
                    ? "Ønskeliste"
                    : currentCategory
                      ? currentCategory.name
                      : "Alle elementer"}
              </span>
            </h1>
            <div className="text-xs text-neutral-500 mt-0.5">
              {view === "history"
                ? `${snapshots.length > 0 ? new Set(snapshots.map((s) => s.date)).size : 0} snapshot${
                    new Set(snapshots.map((s) => s.date)).size === 1 ? "" : "s"
                  }`
                : view === "wishlist"
                  ? `${wishlist.length} ting${wishlist.length === 1 ? "" : ""}`
                  : `${filteredItems.length} element${filteredItems.length === 1 ? "" : "er"}`}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex rounded border border-neutral-200 overflow-hidden text-sm">
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 whitespace-nowrap ${
                  view === "list"
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Liste
              </button>
              <button
                onClick={() => setView("history")}
                className={`px-3 py-1.5 whitespace-nowrap ${
                  view === "history"
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                Historik
              </button>
            </div>

            {view === "list" && (
              <>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søg…"
                  className="input max-w-[180px]"
                />

                {currentCategory && (
                  <button
                    onClick={() => {
                      setEditingCat(currentCategory);
                      setCatModalOpen(true);
                    }}
                    className="text-sm px-3 py-1.5 rounded hover:bg-neutral-100 text-neutral-600 whitespace-nowrap"
                  >
                    Rediger kategori
                  </button>
                )}

                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`text-sm px-3 py-1.5 rounded whitespace-nowrap ${
                    editMode
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "border border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                  }`}
                  title="Hurtig redigér: klik direkte på en pris for at opdatere"
                >
                  {editMode ? "✓ Færdig" : "✏️ Redigér"}
                </button>

                <button
                  onClick={() => setCsvOpen(true)}
                  className="text-sm px-3 py-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-700 whitespace-nowrap"
                >
                  ⇪ Importér
                </button>

                <button
                  onClick={handleAddItem}
                  className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 whitespace-nowrap"
                >
                  + Tilføj
                </button>
              </>
            )}

            <SnapshotButton userId={userId} data={data} onDone={refreshSnapshots} />

            <div className="border-l border-neutral-200 pl-3 flex items-center gap-2">
              <span
                className="text-xs text-neutral-500 max-w-[140px] truncate"
                title={session.user.email ?? ""}
              >
                {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-neutral-500 underline hover:text-neutral-900 whitespace-nowrap"
              >
                Log ud
              </button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {view === "list" ? (
            <>
              {selected === "all" && !search && (
                <>
                  <SummaryCards data={data} snapshots={snapshots} />
                  <AllocationChart data={data} />
                </>
              )}
              <ItemTable
                items={filteredItems}
              allItems={data.items}
              category={currentCategory}
              categoriesById={categoriesById}
              editMode={editMode}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onUpdateValue={handleUpdateItemValue}
              onAddChild={handleAddChild}
              />
            </>
          ) : view === "history" ? (
            <HistoryView
              userId={userId}
              data={data}
              snapshots={snapshots}
              onSnapshotsChanged={refreshSnapshots}
            />
          ) : (
            <WishlistView
              items={wishlist}
              onAdd={handleAddWishlist}
              onEdit={handleEditWishlist}
              onDelete={handleDeleteWishlist}
              onMarkBought={handleMarkBought}
            />
          )}
        </div>
      </main>

      <ItemFormModal
        open={itemModalOpen}
        initial={editingItem}
        categories={data.categories}
        defaultCategoryId={selected !== "all" ? selected : undefined}
        parent={addingChildOf}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          setAddingChildOf(null);
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

      <CsvImportModal
        open={csvOpen}
        userId={userId}
        categories={data.categories}
        defaultCategoryId={selected !== "all" ? selected : undefined}
        onClose={() => setCsvOpen(false)}
        onImported={async () => {
          const fresh = await loadData(userId);
          setData(fresh);
        }}
      />

      <WishlistFormModal
        open={wishlistModalOpen}
        initial={editingWishlistItem}
        onClose={() => {
          setWishlistModalOpen(false);
          setEditingWishlistItem(null);
        }}
        onSubmit={handleSubmitWishlist}
      />
    </div>
  );
}
