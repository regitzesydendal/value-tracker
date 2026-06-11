import { useEffect, useState } from "react";
import type { WishlistItem, WishlistPriority } from "../lib/types";
import { wishlistPriorityLabels, wishlistPriorityOrder } from "../lib/types";
import { parseAmount } from "../lib/format";

type Props = {
  open: boolean;
  initial?: WishlistItem | null;
  onClose: () => void;
  onSubmit: (
    data: Omit<WishlistItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => void;
};

export function WishlistFormModal({ open, initial, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expectedDate, setExpectedDate] = useState("");
  const [priority, setPriority] = useState<WishlistPriority | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setPrice(initial.price != null ? String(initial.price) : "");
      setQuantity(String(initial.quantity ?? 1));
      setExpectedDate(initial.expectedDate ?? "");
      setPriority(initial.priority ?? "");
      setNotes(initial.notes ?? "");
    } else {
      setName("");
      setPrice("");
      setQuantity("1");
      setExpectedDate("");
      setPriority("");
      setNotes("");
    }
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const qty = parseInt(quantity, 10);
    onSubmit({
      id: initial?.id,
      name: name.trim(),
      price: parseAmount(price),
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      expectedDate: expectedDate || undefined,
      priority: priority || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold">
              {initial ? "Rediger ønske" : "Tilføj til ønskeliste"}
            </h2>
          </div>

          <div className="px-6 py-4 space-y-3">
            <Field label="Navn">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="f.eks. Charizard ex"
                required
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Forventet pris (kr.)">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input tabular-nums"
                  inputMode="decimal"
                  placeholder="0"
                />
              </Field>

              <Field label="Antal">
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input tabular-nums"
                  inputMode="numeric"
                  placeholder="1"
                />
              </Field>
            </div>

            <Field label="Forventet købsdato">
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Prioritet">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WishlistPriority | "")}
                className="input"
              >
                <option value="">— Vælg —</option>
                {wishlistPriorityOrder.map((p) => (
                  <option key={p} value={p}>
                    {wishlistPriorityLabels[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Note / link (valgfrit)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={2}
                placeholder="f.eks. hvor du vil købe den, eller et link"
              />
            </Field>
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
