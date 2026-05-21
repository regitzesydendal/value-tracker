import { useEffect, useState } from "react";
import type { Category, Item } from "../lib/types";
import { parseAmount } from "../lib/format";

type Props = {
  open: boolean;
  initial?: Item | null;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
  onSubmit: (
    data: Omit<Item, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => void;
};

export function ItemFormModal({
  open,
  initial,
  categories,
  defaultCategoryId,
  onClose,
  onSubmit,
}: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [version, setVersion] = useState("");
  const [set, setSet] = useState("");
  const [boughtFor, setBoughtFor] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [marketplaceUrl, setMarketplaceUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCategoryId(initial.categoryId);
      setName(initial.name);
      setSerial(initial.serial ?? "");
      setVersion(initial.version ?? "");
      setSet(initial.set ?? "");
      setBoughtFor(initial.boughtFor != null ? String(initial.boughtFor) : "");
      setCurrentValue(String(initial.currentValue ?? ""));
      setNotes(initial.notes ?? "");
      setIsPending(!!initial.isPending);
      setMarketplaceUrl(initial.marketplaceUrl ?? "");
    } else {
      setCategoryId(defaultCategoryId || categories[0]?.id || "");
      setName("");
      setSerial("");
      setVersion("");
      setSet("");
      setBoughtFor("");
      setCurrentValue("");
      setNotes("");
      setIsPending(false);
      setMarketplaceUrl("");
    }
  }, [open, initial, defaultCategoryId, categories]);

  if (!open) return null;

  const category = categories.find((c) => c.id === categoryId);
  const fields = category?.fields ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    onSubmit({
      id: initial?.id,
      categoryId,
      name: name.trim(),
      serial: fields.includes("serial") ? serial.trim() || undefined : undefined,
      version: fields.includes("version") ? version.trim() || undefined : undefined,
      set: fields.includes("set") ? set.trim() || undefined : undefined,
      boughtFor: fields.includes("boughtFor") ? parseAmount(boughtFor) : undefined,
      currentValue: parseAmount(currentValue) ?? 0,
      notes: notes.trim() || undefined,
      isPending: isPending || undefined,
      marketplaceUrl: marketplaceUrl.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold">
              {initial ? "Rediger" : "Tilføj"} element
            </h2>
          </div>

          <div className="px-6 py-4 space-y-3">
            <Field label="Kategori">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Navn">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="f.eks. Luffy Gear 5"
                required
                autoFocus
              />
            </Field>

            {fields.includes("serial") && (
              <Field label="Nummer (N.)">
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="input"
                  placeholder="/99, /1, ----"
                />
              </Field>
            )}

            {fields.includes("version") && (
              <Field label="Version">
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="input"
                  placeholder="Autograph, Parallel, Insert, Base, Relic …"
                />
              </Field>
            )}

            {fields.includes("set") && (
              <Field label="Sæt">
                <input
                  value={set}
                  onChange={(e) => setSet(e.target.value)}
                  className="input"
                  placeholder="Topps Deco, Immaculate 2024/25 …"
                />
              </Field>
            )}

            {fields.includes("boughtFor") && (
              <Field label="Købt for (kr.)">
                <input
                  value={boughtFor}
                  onChange={(e) => setBoughtFor(e.target.value)}
                  className="input tabular-nums"
                  inputMode="decimal"
                  placeholder="0"
                />
              </Field>
            )}

            <Field label="Nuværende værdi (kr.)">
              <input
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="input tabular-nums"
                inputMode="decimal"
                placeholder="0"
                required
              />
            </Field>

            <Field label="Cardmarket / TCGPlayer / eBay link (valgfrit)">
              <input
                type="url"
                value={marketplaceUrl}
                onChange={(e) => setMarketplaceUrl(e.target.value)}
                className="input"
                placeholder="https://www.cardmarket.com/..."
              />
              <div className="text-xs text-neutral-500 mt-1">
                Lyn-link til at tjekke pris. Vises som ↗ ud for navnet i listen.
              </div>
            </Field>

            <Field label="Noter (valgfrit)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={2}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPending}
                onChange={(e) => setIsPending(e.target.checked)}
              />
              <span>
                Ingående lager
                <span className="text-neutral-500 ml-1">
                  (potentielt køb / på vej ind)
                </span>
              </span>
            </label>
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
              className="px-3 py-1.5 text-sm rounded bg-neutral-900 text-white hover:bg-neutral-800"
            >
              {initial ? "Gem ændringer" : "Tilføj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-neutral-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
