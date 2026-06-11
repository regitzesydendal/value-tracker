import { useMemo } from "react";
import type { WishlistItem, WishlistPriority } from "../lib/types";
import { wishlistPriorityLabels } from "../lib/types";
import { formatDKK } from "../lib/format";

type Props = {
  items: WishlistItem[];
  onAdd: () => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  onMarkBought: (item: WishlistItem) => void;
};

const priorityRank: Record<WishlistPriority, number> = { high: 0, medium: 1, low: 2 };

const priorityStyles: Record<WishlistPriority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-neutral-100 text-neutral-600",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Turn a note that is a bare URL into a clickable link; otherwise show text.
function NoteCell({ notes }: { notes?: string }) {
  if (!notes) return <span className="text-neutral-300">—</span>;
  const isUrl = /^https?:\/\//i.test(notes.trim());
  if (isUrl) {
    return (
      <a
        href={notes.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Link ↗
      </a>
    );
  }
  return <span className="text-neutral-600">{notes}</span>;
}

export function WishlistView({ items, onAdd, onEdit, onDelete, onMarkBought }: Props) {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const pa = a.priority ? priorityRank[a.priority] : 3;
      const pb = b.priority ? priorityRank[b.priority] : 3;
      if (pa !== pb) return pa - pb;
      // Then by expected date (soonest first; missing dates last).
      const da = a.expectedDate ?? "9999-12-31";
      const db = b.expectedDate ?? "9999-12-31";
      return da.localeCompare(db);
    });
  }, [items]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity || 1), 0),
    [items],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Forventet i alt
          </div>
          <div className="text-2xl font-semibold mt-0.5 tabular-nums">
            {formatDKK(total)}
          </div>
        </div>
        <button
          onClick={onAdd}
          className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 whitespace-nowrap"
        >
          + Tilføj til ønskeliste
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-sm text-neutral-500 border border-dashed border-neutral-200 rounded-lg py-16">
          Din ønskeliste er tom.
          <br />
          Klik på <span className="font-medium">“+ Tilføj til ønskeliste”</span> for at tilføje noget, du gerne vil købe.
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2 font-medium">Prioritet</th>
                <th className="px-4 py-2 font-medium">Navn</th>
                <th className="px-4 py-2 font-medium text-right">Antal</th>
                <th className="px-4 py-2 font-medium text-right">Forventet pris</th>
                <th className="px-4 py-2 font-medium text-right">I alt</th>
                <th className="px-4 py-2 font-medium">Forventet købsdato</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 font-medium text-right">Handling</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5">
                    {item.priority ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[item.priority]}`}
                      >
                        {wishlistPriorityLabels[item.priority]}
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{item.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {item.price != null ? formatDKK(item.price) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {item.price != null
                      ? formatDKK(item.price * (item.quantity || 1))
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(item.expectedDate)}</td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate">
                    <NoteCell notes={item.notes} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onMarkBought(item)}
                        className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                        title="Marker som købt og fjern fra listen"
                      >
                        ✓ Købt
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="text-xs px-2 py-1 rounded hover:bg-neutral-100 text-neutral-600"
                      >
                        Rediger
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-red-50 text-red-600"
                        title="Slet"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
