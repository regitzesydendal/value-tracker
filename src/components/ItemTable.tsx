import { useEffect, useMemo, useState } from "react";
import type { Category, Item } from "../lib/types";
import { itemLocationLabels } from "../lib/types";
import { formatDKK, parseAmount } from "../lib/format";

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

  const total = items.reduce((s, i) => s + (i.currentValue || 0), 0);

  if (items.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-12 text-center border border-dashed border-neutral-200 rounded">
        Ingen elementer endnu. Klik på “Tilføj” øverst for at komme i gang.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          depth={0}
          childrenByParent={childrenByParent}
          showCategory={showCategory}
          categoriesById={categoriesById}
          editMode={editMode}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateValue={onUpdateValue}
          onAddChild={onAddChild}
        />
      ))}
      <div className="flex justify-between items-center px-4 py-3 mt-2 border-t border-neutral-200 bg-neutral-50 rounded">
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          I alt
        </span>
        <span className="font-semibold tabular-nums text-base">
          {formatDKK(total)}
        </span>
      </div>
    </div>
  );
}

type CardProps = {
  item: Item;
  depth: number;
  childrenByParent: Map<string, Item[]>;
  showCategory: boolean;
  categoriesById: Map<string, Category>;
  editMode: boolean;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onUpdateValue: (item: Item, newCurrentValue: number) => void;
  onAddChild: (parent: Item) => void;
};

function ItemCard({
  item,
  depth,
  childrenByParent,
  showCategory,
  categoriesById,
  editMode,
  onEdit,
  onDelete,
  onUpdateValue,
  onAddChild,
}: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const kids = childrenByParent.get(item.id) ?? [];
  const hasKids = kids.length > 0;
  const isContainer = !!item.isContainer;
  const childrenSum = kids.reduce((s, k) => s + (k.currentValue || 0), 0);

  const cat = categoriesById.get(item.categoryId);
  const visibleFields = cat?.fields ?? [];
  const accentColor = cat?.color ?? "#e5e7eb"; // neutral-200 fallback

  // Secondary meta line — only show fields configured for this category that
  // actually have a value, joined with middle dots.
  const metaParts: string[] = [];
  if (visibleFields.includes("set") && item.set) metaParts.push(item.set);
  if (visibleFields.includes("version") && item.version) metaParts.push(item.version);
  if (visibleFields.includes("serial") && item.serial) {
    metaParts.push(item.serial);
  }

  const showBoughtFor =
    visibleFields.includes("boughtFor") && item.boughtFor != null;

  return (
    <>
      <div
        className="group"
        style={{ marginLeft: depth * 24 }}
      >
        <div
          className={`flex items-stretch overflow-hidden rounded border border-neutral-200 bg-white hover:border-neutral-300 transition-colors ${
            depth > 0 ? "bg-neutral-50/40" : ""
          }`}
        >
          {/* Category accent bar */}
          <div
            className="w-1.5 shrink-0"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />

          <div className="flex-1 min-w-0 px-4 py-3">
            <div className="flex items-start gap-3">
              {/* Expand chevron for containers */}
              {isContainer && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-neutral-400 hover:text-neutral-700 text-xs w-4 mt-1 shrink-0"
                  title={expanded ? "Skjul kort" : "Vis kort"}
                >
                  {expanded ? "▼" : "▶"}
                </button>
              )}

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Top row: name + badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-neutral-900 text-[15px]">
                    {item.name}
                  </span>
                  {isContainer && (
                    <Badge
                      tone="blue"
                      title={
                        hasKids
                          ? `${kids.length} kort indeni`
                          : "Container — kan rumme kort"
                      }
                    >
                      {hasKids ? `${kids.length} kort` : "container"}
                    </Badge>
                  )}
                  {item.isPending && (
                    <Badge tone="amber" title="Ingående lager — potentielt køb">
                      Ingående
                    </Badge>
                  )}
                  {item.wantMore && (
                    <Badge
                      tone="violet"
                      title={
                        item.desiredBuyPrice != null
                          ? `Vil købe mere — ønsker ≤ ${formatDKK(item.desiredBuyPrice)}`
                          : "Vil købe mere"
                      }
                    >
                      ★ Køb mere
                      {item.desiredBuyPrice != null && (
                        <span className="ml-1 font-normal opacity-80 tabular-nums">
                          ≤ {formatDKK(item.desiredBuyPrice)}
                        </span>
                      )}
                    </Badge>
                  )}
                  {item.forSale && (
                    <Badge
                      tone="emerald"
                      title={
                        item.askingPrice != null
                          ? `Til salg for ${formatDKK(item.askingPrice)}`
                          : "Til salg"
                      }
                    >
                      ⊕ Til salg
                      {item.askingPrice != null && (
                        <span className="ml-1 font-normal opacity-80 tabular-nums">
                          {formatDKK(item.askingPrice)}
                        </span>
                      )}
                    </Badge>
                  )}
                  {item.location && (
                    <Badge tone="neutral" title="Lokation">
                      {itemLocationLabels[item.location]}
                    </Badge>
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
                </div>

                {/* Meta row: category + set/version/serial + købt for */}
                {(showCategory || metaParts.length > 0 || showBoughtFor) && (
                  <div className="mt-1 text-xs text-neutral-500 flex items-center gap-x-3 gap-y-1 flex-wrap">
                    {showCategory && cat && (
                      <span className="inline-flex items-center gap-1.5">
                        {cat.color && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        {cat.name}
                      </span>
                    )}
                    {metaParts.length > 0 && (
                      <span>{metaParts.join(" · ")}</span>
                    )}
                    {showBoughtFor && (
                      <span>
                        Købt:{" "}
                        <span className="tabular-nums text-neutral-700">
                          {formatDKK(item.boughtFor!)}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Value column */}
              <div className="text-right shrink-0">
                {editMode ? (
                  <InlineValueInput
                    initial={item.currentValue}
                    onCommit={(v) => onUpdateValue(item, v)}
                  />
                ) : (
                  <>
                    <div className="text-lg font-semibold tabular-nums text-neutral-900">
                      {formatDKK(item.currentValue)}
                    </div>
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
              </div>

              {/* Actions */}
              <div
                className={`flex gap-1 items-start shrink-0 transition-opacity ${
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
            </div>
          </div>
        </div>
      </div>
      {expanded &&
        kids.map((child) => (
          <ItemCard
            key={child.id}
            item={child}
            depth={depth + 1}
            childrenByParent={childrenByParent}
            showCategory={showCategory}
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

type Tone = "blue" | "amber" | "violet" | "emerald" | "neutral";
const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  violet: "bg-violet-100 text-violet-800",
  emerald: "bg-emerald-100 text-emerald-800",
  neutral: "bg-neutral-100 text-neutral-700",
};

function Badge({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${toneClasses[tone]}`}
      title={title}
    >
      {children}
    </span>
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
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setValue(String(initial));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-28 px-2 py-1 text-right tabular-nums text-sm border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
    />
  );
}
