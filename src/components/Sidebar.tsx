import type { Category, Item } from "../lib/types";
import { formatDKK } from "../lib/format";

type Props = {
  categories: Category[];
  items: Item[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
  onAddCategory: () => void;
};

export function Sidebar({
  categories,
  items,
  selectedId,
  onSelect,
  onAddCategory,
}: Props) {
  const grandTotal = items.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  const totalsByCategory = new Map<string, number>();
  for (const item of items) {
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
            selectedId === "all"
              ? "bg-neutral-900 text-white"
              : "hover:bg-neutral-100 text-neutral-700"
          }`}
        >
          <span>Alle</span>
          <span className="tabular-nums text-xs opacity-80">
            {items.length}
          </span>
        </button>

        {sorted.map((cat) => {
          const total = totalsByCategory.get(cat.id) || 0;
          const count = items.filter((i) => i.categoryId === cat.id).length;
          const active = selectedId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm mt-0.5 ${
                active
                  ? "bg-neutral-900 text-white"
                  : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="truncate">{cat.name}</span>
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
          onClick={onAddCategory}
          className="w-full text-left px-3 py-2 rounded text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          + Tilføj kategori
        </button>
      </div>
    </aside>
  );
}
