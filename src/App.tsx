import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Sidebar } from "./components/Sidebar";
import { ItemTable } from "./components/ItemTable";
import { ItemFormModal } from "./components/ItemFormModal";
import { CategoryFormModal } from "./components/CategoryFormModal";
import { AuthGate } from "./components/AuthGate";
import { SnapshotButton } from "./components/SnapshotButton";
import { HistoryView } from "./components/HistoryView";
import { CsvImportModal } from "./components/CsvImportModal";
import { CollectrImportModal } from "./components/CollectrImportModal";
import { rollUpContainers } from "./lib/itemCalc";
import { WishlistView } from "./components/WishlistView";
import { WishlistFormModal } from "./components/WishlistFormModal";
import { AllocationChart } from "./components/AllocationChart";
import { SummaryCards } from "./components/SummaryCards";
import { CategoryIcon, ContainerIcon } from "./lib/categoryIcons";
import { HideValuesProvider } from "./lib/hideValues";
import {
  loadData,
  loadSnapshots,
  upsertCategory,
  deleteCategory as dbDeleteCategory,
  upsertItem,
  deleteItem as dbDeleteItem,
  takeSnapshot,
  recordItemPrice,
  ensureStartingPrices,
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
  const [rawData, setData] = useState<AppData>({ categories: [], items: [] });
  // Containers that hold items show (and count as) the sum of their contents.
  const data = useMemo(() => rollUpContainers(rawData), [rawData]);
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
  // When the user clicks "Købt" on a wishlist item we open the item form
  // pre-filled; this holds the wishlist item so we can remove it once the
  // collection item is saved.
  const [convertingWish, setConvertingWish] = useState<WishlistItem | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [collectrOpen, setCollectrOpen] = useState(false);

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

  // Keep a ref to the latest data so the debounced auto-snapshot reads current
  // values (not a stale closure).
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  });

  // After the user changes values, automatically take/refresh today's snapshot
  // so they never have to click the snapshot button. Debounced so rapid edits
  // result in a single write once things settle.
  const autoSnapTimer = useRef<number | null>(null);
  function scheduleAutoSnapshot() {
    if (autoSnapTimer.current) window.clearTimeout(autoSnapTimer.current);
    autoSnapTimer.current = window.setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      takeSnapshot(userId, today, dataRef.current)
        .then(() => refreshSnapshots())
        .catch((e) => console.warn("auto-snapshot failed:", e));
    }, 2000);
  }
  useEffect(() => {
    return () => {
      if (autoSnapTimer.current) window.clearTimeout(autoSnapTimer.current);
    };
  }, []);

  // Log an item's per-unit price for today in its price history. Non-fatal:
  // fails quietly if the item_prices migration hasn't been run yet.
  async function logPrice(itemId: string, price: number) {
    try {
      await recordItemPrice(userId, itemId, new Date().toISOString().slice(0, 10), price);
    } catch (e) {
      console.warn("recordItemPrice failed:", e);
    }
  }

  // Make sure every item has at least one point in its price history.
  function ensurePriceHistory(items: Item[]) {
    ensureStartingPrices(userId, items, new Date().toISOString().slice(0, 10)).catch((e) =>
      console.warn("ensureStartingPrices failed:", e),
    );
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
          // Every item gets a starting point in its price history (today).
          ensureStartingPrices(userId, fresh.items, new Date().toISOString().slice(0, 10)).catch(
            (e) => console.warn("ensureStartingPrices failed:", e),
          );
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

  // Pre-fill values for the item form when converting a wishlist item into a
  // real collection item. The wishlist price becomes both the buy price and the
  // starting current value; the user picks the category and confirms.
  const wishPrefill = useMemo(
    () =>
      convertingWish
        ? {
            name: convertingWish.name,
            currentValue: convertingWish.price,
            boughtFor: convertingWish.price,
            quantity: convertingWish.quantity,
            notes: convertingWish.notes,
          }
        : null,
    [convertingWish],
  );

  // Top-level items only — children are rendered inside their parent.
  // Search matches children too: if a child matches, also include its parent.
  // A container with items (e.g. "Collectr") can be selected in the sidebar
  // like a category; it then lists what's inside it.
  const selectedContainer = useMemo(
    () => data.items.find((i) => i.id === selected && i.isContainer) ?? null,
    [data.items, selected],
  );

  const filteredItems = useMemo(() => {
    // Top-level containers with items have their own sidebar entry, so they're
    // left out of category lists.
    const parentIds = new Set(data.items.map((i) => i.parentId).filter(Boolean));
    const isInCat = (i: Item) =>
      selectedContainer
        ? i.parentId === selectedContainer.id
        : !i.parentId &&
          (selected === "all" || (i.categoryId === selected && !parentIds.has(i.id)));
    const q = search.trim().toLowerCase();
    const matches = (i: Item) =>
      !q ||
      i.name.toLowerCase().includes(q) ||
      i.set?.toLowerCase().includes(q) ||
      i.version?.toLowerCase().includes(q);

    if (!q) {
      return data.items.filter(isInCat);
    }
    // With search: include any top-level item that matches OR that contains a
    // match somewhere inside it (containers can be nested).
    const byId = new Map(data.items.map((i) => [i.id, i]));
    const parentIdsWithMatchingChild = new Set<string>();
    for (const i of data.items) {
      if (!i.parentId || !matches(i)) continue;
      let p = byId.get(i.parentId);
      while (p && !parentIdsWithMatchingChild.has(p.id)) {
        parentIdsWithMatchingChild.add(p.id);
        p = p.parentId ? byId.get(p.parentId) : undefined;
      }
    }
    return data.items.filter(
      (i) => isInCat(i) && (matches(i) || parentIdsWithMatchingChild.has(i.id)),
    );
  }, [data.items, selected, selectedContainer, search]);

  const currentCategory =
    selected === "all" ? null : data.categories.find((c) => c.id === selected) ?? null;

  function handleAddItem() {
    // Inside a collection, new items go into it.
    if (selectedContainer) {
      handleAddChild(selectedContainer);
      return;
    }
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
    // If this save came from marking a wishlist item as "Købt", remember it so
    // we can remove it from the wishlist once the item is persisted.
    const wishToClear = !isUpdate ? convertingWish : null;
    setItemModalOpen(false);
    setEditingItem(null);
    setConvertingWish(null);
    scheduleAutoSnapshot();

    try {
      await upsertItem(userId, item);
      const prev = isUpdate ? data.items.find((i) => i.id === item.id) : null;
      if (!prev || prev.currentValue !== item.currentValue) {
        await logPrice(item.id, item.currentValue);
      }
      if (wishToClear) {
        await handleDeleteWishlist(wishToClear.id);
        // Jump to the list so the newly added item is visible.
        setSelected(item.categoryId);
        setView("list");
      }
    } catch (e) {
      alert(`Kunne ikke gemme: ${e instanceof Error ? e.message : String(e)}`);
      // Reload from server to undo the optimistic change
      const fresh = await loadData(userId);
      setData(fresh);
    }
  }

  // Patch one or more fields of an item and save (used by the inline,
  // spreadsheet-style table editing). Optimistic; reverts on error.
  async function handlePatchItem(item: Item, patch: Partial<Item>) {
    const updated: Item = {
      ...item,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === item.id ? updated : i)),
    }));
    scheduleAutoSnapshot();
    try {
      await upsertItem(userId, updated);
      if ("currentValue" in patch && patch.currentValue !== item.currentValue) {
        await logPrice(item.id, updated.currentValue);
      }
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
    scheduleAutoSnapshot();
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

  // "Købt": open the item form pre-filled so the user picks a category and
  // confirms the price. The wishlist entry is removed once the item is saved
  // (see handleSubmitItem).
  function handleMarkBought(item: WishlistItem) {
    setEditingItem(null);
    setAddingChildOf(null);
    setConvertingWish(item);
    setItemModalOpen(true);
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
    <HideValuesProvider>
    <div className="min-h-screen flex">
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
        email={session.user.email ?? ""}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-ink/75 backdrop-blur-xl px-8 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap flex items-center gap-2.5">
              {view === "list" && selectedContainer && <ContainerIcon size={26} />}
              {view === "list" && currentCategory && (
                <CategoryIcon category={currentCategory} size={26} />
              )}
              <span>
                {view === "history"
                  ? "Historik"
                  : view === "wishlist"
                    ? "Ønskeliste"
                    : selectedContainer
                      ? selectedContainer.name
                      : currentCategory
                      ? currentCategory.name
                      : "Overblik"}
              </span>
            </h1>
            <div className="text-xs text-neutral-500 mt-0.5">
              {view === "history"
                ? `${snapshots.length > 0 ? new Set(snapshots.map((s) => s.date)).size : 0} snapshot${
                    new Set(snapshots.map((s) => s.date)).size === 1 ? "" : "s"
                  }`
                : view === "wishlist"
                  ? `${wishlist.length} ting`
                  : `${filteredItems.length} element${filteredItems.length === 1 ? "" : "er"}`}
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {view !== "wishlist" && (
              <div className="flex p-0.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm">
                {(["list", "history"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium transition-colors ${
                      view === v
                        ? "bg-neutral-100 text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    {v === "list" ? "Liste" : "Historik"}
                  </button>
                ))}
              </div>
            )}

            {view === "list" && (
              <>
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Søg i samlingen…"
                    className="input w-52 pl-8"
                  />
                </div>

                {currentCategory && (
                  <button
                    onClick={() => {
                      setEditingCat(currentCategory);
                      setCatModalOpen(true);
                    }}
                    className="btn"
                  >
                    Rediger kategori
                  </button>
                )}

                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={
                    editMode
                      ? "text-sm px-3 py-2 rounded-lg font-semibold whitespace-nowrap bg-amber-500 text-ink hover:bg-amber-600"
                      : "btn"
                  }
                  title="Regneark-tilstand: klik i felterne og ret direkte. Tab/Enter = næste felt, gemmes automatisk."
                >
                  {editMode ? "✓ Færdig" : "Redigér"}
                </button>

                <button onClick={() => setCsvOpen(true)} className="btn">
                  Importér
                </button>

                <button onClick={handleAddItem} className="btn-primary">
                  + Tilføj
                </button>
              </>
            )}

            <SnapshotButton userId={userId} data={data} onDone={refreshSnapshots} />
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
              grouped={selected === "all"}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onPatch={handlePatchItem}
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
        defaultCategoryId={currentCategory?.id}
        parent={addingChildOf}
        prefill={wishPrefill}
        containers={data.items.filter((i) => i.isContainer)}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          setAddingChildOf(null);
          setConvertingWish(null);
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
        defaultCategoryId={currentCategory?.id}
        onClose={() => setCsvOpen(false)}
        onImported={async () => {
          const fresh = await loadData(userId);
          setData(fresh);
          ensurePriceHistory(fresh.items);
        }}
        onOpenCollectr={() => {
          setCsvOpen(false);
          setCollectrOpen(true);
        }}
      />

      <CollectrImportModal
        open={collectrOpen}
        userId={userId}
        categories={data.categories}
        items={rawData.items}
        onClose={() => setCollectrOpen(false)}
        onImported={async () => {
          const fresh = await loadData(userId);
          setData(fresh);
          ensurePriceHistory(fresh.items);
          scheduleAutoSnapshot();
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
    </HideValuesProvider>
  );
}
