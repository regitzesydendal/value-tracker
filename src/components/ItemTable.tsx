import type { Category, FieldKey, Item } from "../lib/types";
import { formatDKK } from "../lib/format";

const fieldLabels: Record<FieldKey, string> = {
  serial: "N.",
  version: "Version",
  set: "Sæt",
  boughtFor: "Købt for",
};

type Props = {
  items: Item[];
  category: Category | null; // null = "Alle"
  categoriesById: Map<string, Category>;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
};

export function ItemTable({
  items,
  category,
  categoriesById,
  onEdit,
  onDelete,
}: Props) {
  const showCategory = category === null;
  const visibleFields: FieldKey[] = category
    ? category.fields
    : (["serial", "version", "set", "boughtFor"] as FieldKey[]);

  const total = items.reduce((s, i) => s + (i.currentValue || 0), 0);

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
            <th className="w-20"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-t border-neutral-100 hover:bg-neutral-50 group"
            >
              <td className="px-4 py-2.5 font-medium text-neutral-900">
                <span className="inline-flex items-center gap-2">
                  {item.name}
                  {item.isPending && (
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                      title="Ingående lager — potentielt køb"
                    >
                      Ingående
                    </span>
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
                <td className="px-4 py-2.5 text-neutral-600">
                  {item.set || "—"}
                </td>
              )}
              {visibleFields.includes("boughtFor") && (
                <td className="px-4 py-2.5 text-right text-neutral-600 tabular-nums">
                  {item.boughtFor != null ? formatDKK(item.boughtFor) : "—"}
                </td>
              )}
              <td className="px-4 py-2.5 text-right font-medium text-neutral-900 tabular-nums">
                {formatDKK(item.currentValue)}
              </td>
              <td className="px-2 py-2.5 text-right">
                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
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
                    title="Slet"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-neutral-50 border-t border-neutral-200">
          <tr>
            <td
              className="px-4 py-2.5 text-xs uppercase tracking-wider text-neutral-500"
              colSpan={
                1 +
                (showCategory ? 1 : 0) +
                visibleFields.filter((f) => f !== "boughtFor").length +
                (visibleFields.includes("boughtFor") ? 1 : 0)
              }
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
