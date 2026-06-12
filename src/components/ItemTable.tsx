import { useEffect, useMemo, useState } from "react";
import type { Category, FieldKey, Item } from "../lib/types";
import { itemLocationLabels } from "../lib/types";
import { formatDKK, parseAmount } from "../lib/format";
import { itemTotalValue, itemTotalBought } from "../lib/itemCalc";
import {
  resolveCategoryIcon,
  renderCategoryIcon,
  resolveCategoryColor,
} from "../lib/categoryIcons";

const fieldLabels: Record<FieldKey, string> = {
  serial: "N.",
  version: "Version",
  set: "Sæt",
  boughtFor: "Købt for",
};

// ---------- Sorting ----------
type SortKey = "name" | "category" | FieldKey | "currentValue" | "gain";
type SortDir = "asc" | "desc";

function comparableValue(
  item: Item,
  key: SortKey,
  categoriesById: Map<string, Category>,
): string | number | null {
  switch (key) {
    case "name":
      return item.name?.toLowerCase() ?? null;
    case "category":
      return categoriesById.get(item.categoryId)?.name?.toLowerCase() ?? null;
    case "serial":
      return item.serial?.toLowerCase() ?? null;
    case "version":
      return item.version?.toLowerCase() ?? null;
    case "set":
      return item.set?.toLowerCase() ?? null;
    case "boughtFor":
      return itemTotalBought(item);
    case "currentValue":
      return itemTotalValue(item);
    case "gain": {
      const bought = itemTotalBought(item);
      return bought != null ? itemTotalValue(item) - bought : null;
    }
  }
}

// Profit/loss for one item (quantity-aware) — null when we don't know what it
// was bought for.
function itemGain(item: Item): { gain: number; pct: number | null } | null {
  const bought = itemTotalBought(item);
  if (bought == null) return null;
  const gain = itemTotalValue(item) - bought;
  const pct = bought > 0 ? (gain / bought) * 100 : null;
  return { gain, pct };
}

function GainText({ gain, pct }: { gain: number; pct: number | null }) {
  const up = gain >= 0;
  return (
    <span className={up ? "text-green-600" : "text-red-600"}>
      {up ? "+" : "−"}
      {formatDKK(Math.abs(gain))}
      {pct != null && (
        <span className="block text-[10px] opacity-80">
          {up ? "+" : "−"}
          {Math.abs(pct).toFixed(0)}%
        </span>
      )}
    </span>
  );
}

function makeComparator(
  key: SortKey,
  dir: SortDir,
  categoriesById: Map<string, Category>,
): (a: Item, b: Item) => number {
  const mult = dir === "asc" ? 1 : -1;
  return (a, b) => {
    const va = comparableValue(a, key, categoriesById);
    const vb = comparableValue(b, key, categoriesById);
    const aMissing = va === null || va === "";
    const bMissing = vb === null || vb === "";
    // Empty values always sort to the bottom, regardless of direction.
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
    return String(va).localeCompare(String(vb), "da-DK") * mult;
  };
}

function SortableTh({
  label,
  col,
  align = "left",
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  col: SortKey;
  align?: "left" | "right";
  activeKey: SortKey | null;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === col;
  return (
    <th
      className={`font-medium px-4 py-2.5 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-neutral-900 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-neutral-900" : ""}`}
        title="Klik for at sortere"
      >
        <span>{label}</span>
        <span className="text-[10px] w-2 inline-block">
          {active ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

type Props = {
  items: Item[];          // filtered top-level items to display
  allItems: Item[];       // every item in scope (used to look up children)
  category: Category | null; // null = "Alle"
  categoriesById: Map<string, Category>;
  editMode: boolean;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onUpdateValue: (item: Item, newCurrentValue: number) => void;
  onAddChild: (parent: Item) => void;
};

export function ItemTable({
  items,
  allItems,
  category,
  categoriesById,
  editMode,
  onEdit,
  onDelete,
  onUpdateValue,
  onAddChild,
}: Props) {
  const showCategory = category === null;
  const visibleFields: FieldKey[] = category
    ? category.fields
    : (["serial", "version", "set", "boughtFor"] as FieldKey[]);
  // Show a profit/loss column whenever purchase prices are in play.
  const showGain = visibleFields.includes("boughtFor");

  const childrenByParent = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of allItems) {
      if (it.parentId) {
        const arr = m.get(it.parentId) ?? [];
        arr.push(it);
        m.set(it.parentId, arr);
      }
    }
    return m;
  }, [allItems]);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Clicking a column cycles: ascending → descending → no sort.
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const comparator = useMemo(
    () => (sortKey ? makeComparator(sortKey, sortDir, categoriesById) : null),
    [sortKey, sortDir, categoriesById],
  );

  const sortedItems = useMemo(
    () => (comparator ? [...items].sort(comparator) : items),
    [items, comparator],
  );

  const total = items.reduce((s, i) => s + itemTotalValue(i), 0);
  const totalBought = items.reduce((s, i) => s + (itemTotalBought(i) ?? 0), 0);
  const totalGain = items.reduce((s, i) => {
    const bought = itemTotalBought(i);
    return bought != null ? s + (itemTotalValue(i) - bought) : s;
  }, 0);
  const totalGainPct = totalBought > 0 ? (totalGain / totalBought) * 100 : null;
  // Footer: label spans everything up to (and including) the last field column;
  // then come the current-value, optional gain, and actions cells.
  const footerLabelSpan = 1 + (showCategory ? 1 : 0) + visibleFields.length;

  if (items.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-12 text-center border border-dashed border-neutral-200 rounded">
        Ingen elementer endnu. Klik på “Tilføj” øverst for at komme i gang.
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded overflow-hidden bg-white/80">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
          <tr>
            {showCategory && (
              <SortableTh label="" col="category" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            )}
            <SortableTh label="Navn" col="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            {visibleFields.includes("serial") && (
              <SortableTh label={fieldLabels.serial} col="serial" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            )}
            {visibleFields.includes("version") && (
              <SortableTh label={fieldLabels.version} col="version" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            )}
            {visibleFields.includes("set") && (
              <SortableTh label={fieldLabels.set} col="set" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            )}
            {visibleFields.includes("boughtFor") && (
              <SortableTh label={fieldLabels.boughtFor} col="boughtFor" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            )}
            <SortableTh label="Nuværende værdi" col="currentValue" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            {showGain && (
              <SortableTh label="Gevinst" col="gain" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
            )}
            <th className="w-28"></th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              depth={0}
              childrenByParent={childrenByParent}
              comparator={comparator}
              showCategory={showCategory}
              showGain={showGain}
              visibleFields={visibleFields}
              categoriesById={categoriesById}
              editMode={editMode}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateValue={onUpdateValue}
              onAddChild={onAddChild}
            />
          ))}
        </tbody>
        <tfoot className="bg-neutral-50 border-t border-neutral-200">
          <tr>
            <td
              className="px-4 py-2.5 text-xs uppercase tracking-wider text-neutral-500"
              colSpan={footerLabelSpan}
            >
              I alt
            </td>
            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
              {formatDKK(total)}
            </td>
            {showGain && (
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                {totalBought > 0 ? (
                  <GainText gain={totalGain} pct={totalGainPct} />
                ) : (
                  <span className="text-neutral-300">—</span>
                )}
              </td>
            )}
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

type RowProps = {
  item: Item;
  depth: number;
  childrenByParent: Map<string, Item[]>;
  comparator: ((a: Item, b: Item) => number) | null;
  showCategory: boolean;
  showGain: boolean;
  visibleFields: FieldKey[];
  categoriesById: Map<string, Category>;
  editMode: boolean;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onUpdateValue: (item: Item, newCurrentValue: number) => void;
  onAddChild: (parent: Item) => void;
};

function ItemRow({
  item,
  depth,
  childrenByParent,
  comparator,
  showCategory,
  showGain,
  visibleFields,
  categoriesById,
  editMode,
  onEdit,
  onDelete,
  onUpdateValue,
  onAddChild,
}: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const rawKids = childrenByParent.get(item.id) ?? [];
  const kids = comparator ? [...rawKids].sort(comparator) : rawKids;
  const hasKids = kids.length > 0;
  const isContainer = !!item.isContainer;
  const childrenSum = kids.reduce((s, k) => s + itemTotalValue(k), 0);
  const qty = item.quantity ?? 1;
  const cat = categoriesById.get(item.categoryId);
  const catIconNode = cat ? renderCategoryIcon(resolveCategoryIcon(cat), 16) : null;
  const catColor = cat ? resolveCategoryColor(cat) : undefined;
  const gain = itemGain(item);

  return (
    <>
      <tr
        className={`border-t border-neutral-100 hover:bg-neutral-50 group ${
          depth > 0 ? "bg-neutral-50/40" : ""
        }`}
      >
        {showCategory && (
          <td
            className="px-3 py-2.5 text-center"
            style={{ borderLeft: catColor ? `4px solid ${catColor}` : undefined }}
            title={cat?.name ?? ""}
          >
            {catIconNode ??
              (catColor ? (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: catColor }}
                />
              ) : null)}
          </td>
        )}
        <td
          className="px-4 py-2.5 font-medium text-neutral-900"
          style={{
            paddingLeft: 16 + depth * 24,
            borderLeft: showCategory
              ? undefined
              : catColor
                ? `4px solid ${catColor}`
                : undefined,
          }}
        >
          <span className="inline-flex items-center gap-2">
            {isContainer && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-neutral-400 hover:text-neutral-700 text-xs w-4"
                title={expanded ? "Skjul kort" : "Vis kort"}
              >
                {expanded ? "▼" : "▶"}
              </button>
            )}
            {!isContainer && depth === 0 && <span className="w-4" />}
            {!showCategory && catIconNode && (
              <span className="shrink-0">{catIconNode}</span>
            )}
            {item.name}
            {item.grade && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-white shrink-0"
                title="Stand / grade"
              >
                {item.grade}
              </span>
            )}
            {isContainer && (
              <span
                className="text-[11px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0"
                title={hasKids ? `${kids.length} kort indeni` : "Container — kan rumme kort"}
              >
                {hasKids ? `📦 ${kids.length}` : "📦"}
              </span>
            )}
            {item.isPending && (
              <span
                className="text-[11px] px-1 py-0.5 rounded bg-amber-100 shrink-0"
                title="Ingående lager — potentielt køb"
              >
                ⏳
              </span>
            )}
            {item.wantMore && (
              <span
                className="text-[11px] px-1 py-0.5 rounded bg-violet-100 shrink-0"
                title={
                  item.desiredBuyPrice != null
                    ? `Vil købe mere — ønsker ≤ ${formatDKK(item.desiredBuyPrice)}`
                    : "Vil købe mere"
                }
              >
                ★
              </span>
            )}
            {item.forSale && (
              <span
                className="text-[11px] px-1 py-0.5 rounded bg-emerald-100 shrink-0"
                title={
                  item.askingPrice != null
                    ? `Til salg for ${formatDKK(item.askingPrice)}`
                    : "Til salg"
                }
              >
                🏷️
              </span>
            )}
            {item.location && (
              <span
                className="text-[11px] px-1 py-0.5 rounded bg-neutral-100 shrink-0"
                title={`Lokation: ${itemLocationLabels[item.location]}`}
              >
                📍
              </span>
            )}
            {item.marketplaceUrl && (
              <a
                href={item.marketplaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-neutral-400 hover:text-blue-600 text-xs"
                title="Åbn link til pris-side"
              >
                ↗
              </a>
            )}
          </span>
        </td>
        {visibleFields.includes("serial") && (
          <td className="px-4 py-2.5 text-neutral-600 tabular-nums">
            {item.serial || "—"}
          </td>
        )}
        {visibleFields.includes("version") && (
          <td className="px-4 py-2.5 text-neutral-600">
            {item.version || "—"}
          </td>
        )}
        {visibleFields.includes("set") && (
          <td className="px-4 py-2.5 text-neutral-600">{item.set || "—"}</td>
        )}
        {visibleFields.includes("boughtFor") && (
          <td className="px-4 py-2.5 text-right text-neutral-600 tabular-nums">
            {item.boughtFor != null ? formatDKK(itemTotalBought(item)!) : "—"}
            {qty > 1 && item.boughtFor != null && (
              <div className="text-[10px] text-neutral-400 tabular-nums">
                {qty} × {formatDKK(item.boughtFor)}
              </div>
            )}
          </td>
        )}
        <td
          className="px-4 py-2.5 text-right font-medium text-neutral-900 tabular-nums"
          title={`Sidst opdateret: ${(item.updatedAt ?? "").slice(0, 10) || "—"}`}
        >
          {editMode ? (
            <InlineValueInput
              initial={item.currentValue}
              onCommit={(v) => onUpdateValue(item, v)}
            />
          ) : (
            <>
              {formatDKK(itemTotalValue(item))}
              {qty > 1 && (
                <div className="text-[10px] text-neutral-400 tabular-nums">
                  {qty} × {formatDKK(item.currentValue)}
                </div>
              )}
              {isContainer && hasKids && (
                <div
                  className="text-[10px] text-neutral-400 tabular-nums"
                  title="Sum af kort indeni"
                >
                  Σ {formatDKK(childrenSum)}
                </div>
              )}
            </>
          )}
        </td>
        {showGain && (
          <td className="px-4 py-2.5 text-right tabular-nums">
            {gain ? (
              <GainText gain={gain.gain} pct={gain.pct} />
            ) : (
              <span className="text-neutral-300">—</span>
            )}
          </td>
        )}
        <td className="px-2 py-2.5 text-right">
          <div
            className={`flex gap-1 justify-end transition-opacity ${
              editMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isContainer && (
              <button
                onClick={() => {
                  onAddChild(item);
                  setExpanded(true);
                }}
                className="text-xs px-2 py-1 rounded hover:bg-neutral-200 text-neutral-600"
                title="Tilføj kort herunder"
              >
                +
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              className="text-xs px-2 py-1 rounded hover:bg-neutral-200 text-neutral-600"
              title="Rediger"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs px-2 py-1 rounded hover:bg-red-100 hover:text-red-700 text-neutral-600"
              title={hasKids ? "Slet (sletter også kort indeni)" : "Slet"}
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
      {expanded &&
        kids.map((child) => (
          <ItemRow
            key={child.id}
            item={child}
            depth={depth + 1}
            childrenByParent={childrenByParent}
            comparator={comparator}
            showCategory={showCategory}
            showGain={showGain}
            visibleFields={visibleFields}
            categoriesById={categoriesById}
            editMode={editMode}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateValue={onUpdateValue}
            onAddChild={onAddChild}
          />
        ))}
    </>
  );
}

function InlineValueInput({
  initial,
  onCommit,
}: {
  initial: number;
  onCommit: (newValue: number) => void;
}) {
  const [value, setValue] = useState(String(initial));

  useEffect(() => {
    setValue(String(initial));
  }, [initial]);

  function commit() {
    const n = parseAmount(value);
    if (n == null) {
      setValue(String(initial));
      return;
    }
    if (n !== initial) onCommit(n);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      data-price-input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        const el = e.target as HTMLInputElement;
        if (e.key === "Enter") {
          e.preventDefault();
          // Commit, then jump straight to the next price field for fast updating.
          const inputs = Array.from(
            document.querySelectorAll<HTMLInputElement>("[data-price-input]"),
          );
          const next = inputs[inputs.indexOf(el) + 1];
          el.blur();
          if (next) {
            next.focus();
            next.select();
          }
        }
        if (e.key === "Escape") {
          setValue(String(initial));
          el.blur();
        }
      }}
      className="w-28 px-2 py-1 text-right tabular-nums text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
    />
  );
}
