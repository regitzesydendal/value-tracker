import { useEffect, useMemo, useState } from "react";
import type { Category, Snapshot} from "../lib/types";
import { TOTAL_CATEGORY_ID } from "../lib/types";
import { formatDKK, parseAmount } from "../lib/format";
import { replaceSnapshot } from "../lib/storage";

type Props = {
  open: boolean;
  userId: string;
  date: string | null; // the date being edited
  snapshots: Snapshot[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

type Row = {
  categoryId: string;
  name: string;
  input: string;
};

export function SnapshotEditModal({
  open,
  userId,
  date,
  snapshots,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [newDate, setNewDate] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  useEffect(() => {
    if (!open || !date) return;
    setError(null);
    setNewDate(date);

    // Find which categories have a value for this date
    const existing = snapshots.filter(
      (s) => s.date === date && s.categoryId !== TOTAL_CATEGORY_ID,
    );
    setRows(
      existing
        .map((s) => ({
          categoryId: s.categoryId,
          name: categoriesById.get(s.categoryId)?.name ?? s.categoryId,
          input: String(s.value),
        }))
        .sort(
          (a, b) =>
            (categoriesById.get(a.categoryId)?.order ?? 999) -
            (categoriesById.get(b.categoryId)?.order ?? 999),
        ),
    );
  }, [open, date, snapshots, categoriesById]);

  if (!open || !date) return null;

  const computedTotal = rows.reduce(
    (sum, r) => sum + (parseAmount(r.input) ?? 0),
    0,
  );

  function updateRow(categoryId: string, input: string) {
    setRows((prev) =>
      prev.map((r) => (r.categoryId === categoryId ? { ...r, input } : r)),
    );
  }

  function removeRow(categoryId: string) {
    setRows((prev) => prev.filter((r) => r.categoryId !== categoryId));
  }

  function addRow(categoryId: string) {
    const cat = categoriesById.get(categoryId);
    if (!cat) return;
    setRows((prev) => [
      ...prev,
      { categoryId, name: cat.name, input: "0" },
    ]);
  }

  const missingCategories = categories.filter(
    (c) => !rows.some((r) => r.categoryId === c.id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const values = new Map<string, number>();
      for (const r of rows) {
        const n = parseAmount(r.input);
        if (n == null) {
          throw new Error(`Ugyldigt tal for ${r.name}: "${r.input}"`);
        }
        values.set(r.categoryId, n);
      }
      await replaceSnapshot(userId, date!, newDate, values);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold">Rediger snapshot</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Du redigerer snapshot fra <strong>{date}</strong>.
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            <label className="block">
              <div className="text-xs font-medium text-neutral-600 mb-1">Dato</div>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="input"
                required
              />
              {newDate !== date && (
                <div className="text-xs text-amber-700 mt-1">
                  Ændrer dato fra {date} til {newDate}. Den gamle dato slettes.
                </div>
              )}
            </label>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2">
                Værdi pr. kategori (kr.)
              </div>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.categoryId} className="flex items-center gap-2">
                    <div className="flex-1 text-sm text-neutral-700">{r.name}</div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.input}
                      onChange={(e) => updateRow(r.categoryId, e.target.value)}
                      className="input tabular-nums w-32 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(r.categoryId)}
                      className="text-xs px-2 py-1 rounded hover:bg-red-100 hover:text-red-700 text-neutral-500"
                      title="Fjern fra snapshot"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div className="text-xs text-neutral-500 italic">
                    Ingen kategorier — tilføj mindst én nedenfor.
                  </div>
                )}
              </div>

              {missingCategories.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-neutral-500 mb-1">
                    Tilføj manglende kategori:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {missingCategories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => addRow(c.id)}
                        className="text-xs px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                      >
                        + {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center text-sm">
                <span className="text-neutral-500">I alt (beregnes automatisk)</span>
                <span className="tabular-nums font-semibold">
                  {formatDKK(computedTotal)}
                </span>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-neutral-200 flex justify-end gap-2 bg-neutral-50">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded hover:bg-neutral-200 text-neutral-700"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={saving || rows.length === 0}
              className="px-3 py-1.5 text-sm rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Gemmer…" : "Gem ændringer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
