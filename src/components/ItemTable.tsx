import { useEffect, useMemo, useState } from "react";
import type { Category, FieldKey, Item } from "../lib/types";
import { formatDKK, parseAmount } from "../lib/format";

const fieldLabels: Record<FieldKey, string> = {
  serial: "N.",
  version: "Version",
  set: "Sæt",
  boughtFor: "Købt for",
};

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
  const colSpan =
    1 + // name
    (showCategory ? 1 : 0) +
    visibleFields.length +
    1; // current value

  if (items.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-12 text-center border border-dashed border-neutral-200 rounded">
        Ingen elementer endnu. Klik på “Tilføj” øverst for at komme i gang.
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left font-medium px-4 py-2.5">Navn</th>
            {showCategory && (
              <th className="text-left font-medium px-4 py-2.5">Kategori</th>
            )}
            {visibleFields.includes("serial") && (
              <th className="text-left font-medium px-4 py-2.5">
                {fieldLabels.serial}
              </th>
            )}
            {visibleFields.includes("version") && (
              <th className="text-left font-medium px-4 py-2.5">
                {fieldLabels.version}
              </th>
            )}
            {visibleFields.includes("set") && (
              <th className="text-left font-medium px-4 py-2.5">
                {fieldLabels.set}
              </th>
            )}
            {visibleFields.includes("boughtFor") && (
              <th className="text-right font-medium px-4 py-2.5">
                {fieldLabels.boughtFor}
              </th>
            )}
            <th className="text-right font-medium px-4 py-2.5">
              Nuværende værdi
            </th>
            <th className="w-28"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              depth={0}
              childrenByParent={childrenByParent}
              showCategory={showCategory}
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
              colSpan={colSpan - 1}
            >
              I alt
            </td>
            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
              {formatDKK(total)}
            </td>
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
  showCategory: boolean;
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
  showCategory,
  visibleFields,
  categoriesById,
  editMode,
  onEdit,
  onDelete,
  onUpdateValue,
  onAddChild,
}: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const kids = childrenByParent.get(item.id) ?? [];
  const hasKids = kids.length > 0;
  const isContainer = !!item.isContainer;
  const childrenSum = kids.reduce((s, k) => s + (k.currentValue || 0), 0);

  return (
    <>
      <tr
        className={`border-t border-neutral-100 hover:bg-neutral-50 group ${
          depth > 0 ? "bg-neutral-50/40" : ""
        }`}
      >
        <td
          className="px-4 py-2.5 font-medium text-neutral-900"
          style={{ paddingLeft: 16 + depth * 24 }}
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
            {item.name}
            {isContainer && (
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800"
                title={hasKids ? `${kids.length} kort indeni` : "Container — kan rumme kort"}
              >
                {hasKids ? `${kids.length} kort` : "container"}
              </span>
            )}
            {item.isPending && (
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                title="Ingående lager — potentielt køb"
              >
                Ingående
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
        {showCategory && (
          <td className="px-4 py-2.5 text-neutral-500">
            {categoriesById.get(item.categoryId)?.name ?? "—"}
          </td>
        )}
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
            {item.boughtFor != null ? formatDKK(item.boughtFor) : "—"}
          </td>
        )}
        <td className="px-4 py-2.5 text-right font-medium text-neutral-900 tabular-nums">
          {editMode ? (
            <InlineValueInput
              initial={item.currentValue}
              onCommit={(v) => onUpdateValue(item, v)}
            />
          ) : (
            <>
              {formatDKK(item.currentValue)}
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
            showCategory={showCategory}
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
