import type { Category, Item } from "../lib/types";
import { formatDKK } from "../lib/format";
import {
  resolveCategoryIcon,
  renderCategoryIcon,
  resolveCategoryColor,
} from "../lib/categoryIcons";

type Props = {
  categories: Category[];
  items: Item[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
  onAddCategory: () => void;
  wishlistActive: boolean;
  wishlistCount: number;
  onSelectWishlist: () => void;
};

export function Sidebar({
  categories,
  items,
  selectedId,
  onSelect,
  onAddCategory,
  wishlistActive,
  wishlistCount,
  onSelectWishlist,
}: Props) {
  // Children are "inside" a parent — only count top-level items in the totals
  // so we don't double-count.
  const topLevelItems = items.filter((i) => !i.parentId);
  const grandTotal = topLevelItems.reduce(
    (sum, i) => sum + (i.currentValue || 0),
    0,
  );
  const totalsByCategory = new Map<string, number>();
  for (const item of topLevelItems) {
    totalsByCategory.set(
      item.categoryId,
      (totalsByCategory.get(item.categoryId) || 0) + (item.currentValue || 0),
    );
  }

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 bg-white">
      <div className="p-5 border-b border-neutral-200">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          I alt
        </div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">
          {formatDKK(grandTotal)}
        </div>
      </div>

      <nav className="p-2">
        <button
          onClick={() => onSelect("all")}
          className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${
            selectedId === "all" && !wishlistActive
              ? "bg-neutral-900 text-white"
              : "hover:bg-neutral-100 text-neutral-700"
          }`}
        >
          <span>Alle</span>
          <span className="tabular-nums text-xs opacity-80">
            {topLevelItems.length}
          </span>
        </button>

        {sorted.map((cat) => {
          const total = totalsByCategory.get(cat.id) || 0;
          const count = topLevelItems.filter((i) => i.categoryId === cat.id).length;
          const active = selectedId === cat.id && !wishlistActive;
          const iconToken = resolveCategoryIcon(cat);
          const catColor = resolveCategoryColor(cat);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              style={{
                borderLeft: catColor ? `3px solid ${catColor}` : "3px solid transparent",
              }}
              className={`w-full text-left px-3 py-2 rounded text-sm mt-0.5 ${
                active
                  ? "bg-neutral-900 text-white"
                  : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 min-w-0">
                  {iconToken ? (
                    renderCategoryIcon(iconToken, 16)
                  ) : cat.color ? (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                  ) : null}
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="tabular-nums text-xs opacity-80 ml-2 shrink-0">
                  {count}
                </span>
              </div>
              <div
                className={`text-xs mt-0.5 tabular-nums ${
                  active ? "opacity-80" : "text-neutral-500"
                }`}
              >
                {formatDKK(total)}
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-neutral-200 mt-2">
        <button
          onClick={onSelectWishlist}
          className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${
            wishlistActive
              ? "bg-neutral-900 text-white"
              : "hover:bg-neutral-100 text-neutral-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>🛒</span>
            <span>Ønskeliste</span>
          </span>
          <span className="tabular-nums text-xs opacity-80">{wishlistCount}</span>
        </button>
      </div>

      <div className="p-2 border-t border-neutral-200">
        <button
          onClick={onAddCategory}
          className="w-full text-left px-3 py-2 rounded text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          + Tilføj kategori
        </button>
      </div>
    </aside>
  );
}
