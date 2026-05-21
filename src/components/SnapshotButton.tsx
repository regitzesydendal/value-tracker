import { useState } from "react";
import { takeSnapshot } from "../lib/storage";
import type { AppData } from "../lib/types";

type Props = {
  userId: string;
  data: AppData;
  onDone: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SnapshotButton({ userId, data, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await takeSnapshot(userId, date, data);
      setOpen(false);
      setDate(todayIso());
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-700"
        title="Gem en snapshot af nuværende værdier"
      >
        📸 Snapshot
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 border-b border-neutral-200">
                <h2 className="text-lg font-semibold">Tag snapshot</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Gemmer den nuværende værdi af hver kategori for den valgte dato.
                  Hvis der allerede findes en snapshot for den dato, overskrives den.
                </p>
              </div>

              <div className="px-6 py-4 space-y-3">
                <label className="block">
                  <div className="text-xs font-medium text-neutral-600 mb-1">Dato</div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                    required
                  />
                </label>

                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {error}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-neutral-200 flex justify-end gap-2 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm rounded hover:bg-neutral-200 text-neutral-700"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 text-sm rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? "Gemmer…" : "Gem snapshot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
