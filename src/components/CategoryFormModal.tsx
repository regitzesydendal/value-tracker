import { useEffect, useState } from "react";
import type { Category, FieldKey } from "../lib/types";

const allFields: { key: FieldKey; label: string }[] = [
  { key: "serial", label: "Nummer (f.eks. /99)" },
  { key: "version", label: "Version (Autograph, Parallel …)" },
  { key: "set", label: "Sæt" },
  { key: "boughtFor", label: "Købt for (pris)" },
];

type Props = {
  open: boolean;
  initial?: Category | null;
  onClose: () => void;
  onSubmit: (data: { id?: string; name: string; fields: FieldKey[] }) => void;
  onDelete?: (id: string) => void;
};

export function CategoryFormModal({
  open,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FieldKey[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setFields(initial?.fields ?? []);
  }, [open, initial]);

  if (!open) return null;

  function toggle(f: FieldKey) {
    setFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ id: initial?.id, name: name.trim(), fields });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold">
              {initial ? "Rediger kategori" : "Ny kategori"}
            </h2>
          </div>

          <div className="px-6 py-4 space-y-4">
            <label className="block">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                Navn
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="f.eks. Magic: The Gathering"
                required
                autoFocus
              />
            </label>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2">
                Felter at vise for denne kategori
              </div>
              <div className="space-y-1.5">
                {allFields.map((f) => (
                  <label
                    key={f.key}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-50 px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={fields.includes(f.key)}
                      onChange={() => toggle(f.key)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Navn og nuværende værdi vises altid.
              </p>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-neutral-200 flex justify-between items-center bg-neutral-50">
            <div>
              {initial && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `Slet kategorien "${initial.name}"? Elementer i den slettes også.`,
                      )
                    ) {
                      onDelete(initial.id);
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded text-red-600 hover:bg-red-50"
                >
                  Slet
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded hover:bg-neutral-200 text-neutral-700"
              >
                Annuller
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm rounded bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Gem
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
