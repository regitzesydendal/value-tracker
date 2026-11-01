import type { ReactNode } from "react";
import type { Category, Item } from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemTotalValue } from "../lib/itemCalc";
import {
  resolveCategoryIcon,
  renderCategoryIcon,
  resolveCategoryColor,
  ContainerIcon,
} from "../lib/categoryIcons";
import { useHideValues } from "../lib/hideValues";

type Props = {
  categories: Category[];
  items: Item[];
  selectedId: string | "all";
  onSelect: (id: string | "all") => void;
  onAddCategory: () => void;
  wishlistActive: boolean;
  wishlistCount: number;
  onSelectWishlist: () => void;
  email: string;
  onSignOut: () => void;
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
  email,
  onSignOut,
}: Props) {
  const { mask } = useHideValues();

  // Children are "inside" a parent — only count top-level items in the totals
  // so we don't double-count.
  const topLevelItems = items.filter((i) => !i.parentId);
  const grandTotal = topLevelItems.reduce((sum, i) => sum + itemTotalValue(i), 0);

  // Top-level containers that hold items (e.g. "Collectr") get their own entry
  // under "Samlinger" and are left out of their category's total.
  const childrenOf = new Map<string, Item[]>();
  for (const it of items) {
    if (!it.parentId) continue;
    const arr = childrenOf.get(it.parentId) ?? [];
    arr.push(it);
    childrenOf.set(it.parentId, arr);
  }
  const collections = topLevelItems.filter((i) => i.isContainer && childrenOf.has(i.id));
  const collectionIds = new Set(collections.map((c) => c.id));
  // Number of actual cards/products inside a collection (folders not counted).
  const countLeaves = (id: string): number =>
    (childrenOf.get(id) ?? []).reduce(
      (n, c) => n + (c.isContainer && childrenOf.has(c.id) ? countLeaves(c.id) : 1),
      0,
    );

  const categoryItems = topLevelItems.filter((i) => !collectionIds.has(i.id));
  const totalsByCategory = new Map<string, { value: number; count: number }>();
  for (const item of categoryItems) {
    const t = totalsByCategory.get(item.categoryId) ?? { value: 0, count: 0 };
    t.value += itemTotalValue(item);
    t.count += 1;
    totalsByCategory.set(item.categoryId, t);
  }

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 bg-white/40 backdrop-blur-xl h-screen sticky top-0 flex flex-col">
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        <LogoMark />
        <span className="font-extrabold tracking-tight text-[15px]">Samlertracker</span>
      </div>

      <div className="mx-3 mb-3 rounded-xl p-4 border border-accent/25 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-soft/80">
          Samlet værdi
        </div>
        <div className="text-2xl font-extrabold mt-1 tabular-nums tracking-tight">
          {mask(formatDKK(grandTotal))}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <NavItem
          active={selectedId === "all" && !wishlistActive}
          onClick={() => onSelect("all")}
          icon={<GridIcon />}
          label="Overblik"
          count={topLevelItems.length}
        />

        {collections.length > 0 && (
          <>
            <SectionLabel>Samlinger</SectionLabel>
            {collections.map((c) => (
              <NavItem
                key={c.id}
                active={selectedId === c.id && !wishlistActive}
                onClick={() => onSelect(c.id)}
                icon={<ContainerIcon size={18} />}
                label={c.name}
                count={countLeaves(c.id)}
                value={mask(formatDKK(itemTotalValue(c)))}
                color="#f2c14e"
              />
            ))}
          </>
        )}

        <SectionLabel>Kategorier</SectionLabel>
        {sorted.map((cat) => {
          const t = totalsByCategory.get(cat.id) ?? { value: 0, count: 0 };
          const iconToken = resolveCategoryIcon(cat);
          const color = resolveCategoryColor(cat);
          return (
            <NavItem
              key={cat.id}
              active={selectedId === cat.id && !wishlistActive}
              onClick={() => onSelect(cat.id)}
              icon={
                iconToken ? (
                  renderCategoryIcon(iconToken, 18)
                ) : (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color ?? "#5d687d" }}
                  />
                )
              }
              label={cat.name}
              count={t.count}
              value={mask(formatDKK(t.value))}
              color={color}
            />
          );
        })}
        <button
          onClick={onAddCategory}
          className="w-full text-left px-3 py-2 mt-1 rounded-lg text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        >
          + Ny kategori
        </button>

        <SectionLabel>Andet</SectionLabel>
        <NavItem
          active={wishlistActive}
          onClick={onSelectWishlist}
          icon={<span className="text-[15px] leading-none">🛒</span>}
          label="Ønskeliste"
          count={wishlistCount}
        />
      </nav>

      <div className="border-t border-neutral-200 px-4 py-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 shrink-0">
          {(email[0] ?? "?").toUpperCase()}
        </div>
        <span className="text-xs text-neutral-500 truncate flex-1" title={email}>
          {email}
        </span>
        <button
          onClick={onSignOut}
          className="text-xs text-neutral-500 hover:text-neutral-900 whitespace-nowrap"
        >
          Log ud
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
  value,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count?: number;
  value?: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left px-3 py-2 rounded-lg text-sm mt-0.5 flex items-center gap-2.5 transition-colors ${
        active
          ? "bg-neutral-100 text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-100/60 hover:text-neutral-900"
      }`}
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ backgroundColor: color ?? "#f2c14e" }}
        />
      )}
      <span className="w-5 flex justify-center shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
          {count != null && (
            <span className="text-[11px] tabular-nums text-neutral-400 shrink-0">{count}</span>
          )}
        </span>
        {value && (
          <span className="block text-xs tabular-nums text-neutral-500 mt-0.5">{value}</span>
        )}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </svg>
  );
}

// App mark: a gold card standing in a slab, with a sparkle.
function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="logoGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.5" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#b9821f" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#131a26" stroke="#2a3446" />
      <rect x="9" y="6" width="14" height="20" rx="2.5" fill="url(#logoGold)" />
      <rect x="11.5" y="9" width="9" height="3" rx="1" fill="#131a26" opacity="0.55" />
      <path d="M24.5 4.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#fff7df" />
    </svg>
  );
}
