import { useEffect, useState } from "react";
import type { Category, FieldKey } from "../lib/types";
import { CATEGORY_ICON_CHOICES, renderCategoryIcon } from "../lib/categoryIcons";

const allFields: { key: FieldKey; label: string }[] = [
  { key: "serial", label: "Nummer (f.eks. /99)" },
  { key: "version", label: "Version (Autograph, Parallel …)" },
  { key: "set", label: "Sæt" },
  { key: "boughtFor", label: "Købt for (pris)" },
];

// Fixed palette — keeps the UI consistent vs. arbitrary hex.
export const categoryColorPalette: string[] = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

type Props = {
  open: boolean;
  initial?: Category | null;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    name: string;
    fields: FieldKey[];
    color?: string;
    icon?: string;
  }) => void;
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
  const [color, setColor] = useState<string | undefined>(undefined);
  const [icon, setIcon] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setFields(initial?.fields ?? []);
    setColor(initial?.color);
    setIcon(initial?.icon);
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
    onSubmit({ id: initial?.id, name: name.trim(), fields, color, icon });
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
                Farve
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setColor(undefined)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-neutral-400 text-xs ${
                    !color
                      ? "border-neutral-900"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                  title="Ingen farve"
                >
                  ✕
                </button>
                {categoryColorPalette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 ${
                      color === c
                        ? "border-neutral-900"
                        : "border-transparent hover:border-neutral-300"
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2">Logo</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICON_CHOICES.map((token) => (
                  <button
                    key={token}
                    type="button"
                    // Click a selected icon again to clear it (back to automatic).
                    onClick={() => setIcon((cur) => (cur === token ? undefined : token))}
                    className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center ${
                      icon === token
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                    title={token === "pokeball" ? "Pokéball" : token}
                  >
                    {renderCategoryIcon(token, 20)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Vælg et logo — ellers vælges et automatisk ud fra navnet.
              </p>
            </div>

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
