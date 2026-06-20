import { useEffect, useState } from "react";
import type { Category, Item, ItemLocation } from "../lib/types";
import { itemLocationLabels, itemLocationOrder } from "../lib/types";
import { parseAmount } from "../lib/format";

type Props = {
  open: boolean;
  initial?: Item | null;
  categories: Category[];
  defaultCategoryId?: string;
  parent?: Item | null; // if set, this is creating/editing a child of `parent`
  // Available container items ("Collectr" etc.) an existing item can be moved
  // into. The item being edited is filtered out so it can't contain itself.
  containers?: Item[];
  // Pre-fill a NEW item (not an edit) — used when moving a wishlist item into
  // the collection after marking it "Købt".
  prefill?: {
    name?: string;
    currentValue?: number;
    boughtFor?: number;
    quantity?: number;
    notes?: string;
  } | null;
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
  parent,
  prefill,
  containers,
  onClose,
  onSubmit,
}: Props) {
  const [categoryId, setCategoryId] = useState("");
  // "" = top level; otherwise the id of the container this item lives inside.
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [version, setVersion] = useState("");
  const [set, setSet] = useState("");
  const [grade, setGrade] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [boughtFor, setBoughtFor] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [marketplaceUrl, setMarketplaceUrl] = useState("");
  const [isContainer, setIsContainer] = useState(false);
  const [wantMore, setWantMore] = useState(false);
  const [desiredBuyPrice, setDesiredBuyPrice] = useState("");
  const [forSale, setForSale] = useState(false);
  const [askingPrice, setAskingPrice] = useState("");
  const [location, setLocation] = useState<ItemLocation | "">("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCategoryId(initial.categoryId);
      setParentId(initial.parentId ?? "");
      setName(initial.name);
      setSerial(initial.serial ?? "");
      setVersion(initial.version ?? "");
      setSet(initial.set ?? "");
      setGrade(initial.grade ?? "");
      setPurchaseDate(initial.purchaseDate ?? "");
      setQuantity(String(initial.quantity ?? 1));
      setBoughtFor(initial.boughtFor != null ? String(initial.boughtFor) : "");
      setCurrentValue(String(initial.currentValue ?? ""));
      setNotes(initial.notes ?? "");
      setIsPending(!!initial.isPending);
      setMarketplaceUrl(initial.marketplaceUrl ?? "");
      setIsContainer(!!initial.isContainer);
      setWantMore(!!initial.wantMore);
      setDesiredBuyPrice(
        initial.desiredBuyPrice != null ? String(initial.desiredBuyPrice) : "",
      );
      setForSale(!!initial.forSale);
      setAskingPrice(
        initial.askingPrice != null ? String(initial.askingPrice) : "",
      );
      setLocation(initial.location ?? "");
    } else {
      // When adding a child, lock category to the parent's category.
      setCategoryId(parent?.categoryId || defaultCategoryId || categories[0]?.id || "");
      setParentId(parent?.id ?? "");
      setName(prefill?.name ?? "");
      setSerial("");
      setVersion("");
      setSet("");
      setGrade("");
      setPurchaseDate("");
      setQuantity(String(prefill?.quantity ?? 1));
      setBoughtFor(prefill?.boughtFor != null ? String(prefill.boughtFor) : "");
      setCurrentValue(
        prefill?.currentValue != null ? String(prefill.currentValue) : "",
      );
      setNotes(prefill?.notes ?? "");
      setIsPending(false);
      setMarketplaceUrl("");
      setIsContainer(false);
      setWantMore(false);
      setDesiredBuyPrice("");
      setForSale(false);
      setAskingPrice("");
      setLocation("");
    }
  }, [open, initial, defaultCategoryId, categories, parent, prefill]);

  if (!open) return null;

  // The dedicated "add child" flow (`parent`) wins; otherwise the container the
  // user picked in the dropdown. A child always inherits its container's category.
  const chosenParent =
    parent ?? (parentId ? containers?.find((c) => c.id === parentId) ?? null : null);
  const isChild = !!chosenParent;
  const effectiveCategoryId = chosenParent ? chosenParent.categoryId : categoryId;

  const category = categories.find((c) => c.id === effectiveCategoryId);
  const fields = category?.fields ?? [];

  // Containers this item can be moved into (never itself).
  const moveTargets = (containers ?? []).filter((c) => c.id !== initial?.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !effectiveCategoryId) return;
    onSubmit({
      id: initial?.id,
      categoryId: effectiveCategoryId,
      name: name.trim(),
      serial: fields.includes("serial") ? serial.trim() || undefined : undefined,
      version: fields.includes("version") ? version.trim() || undefined : undefined,
      set: fields.includes("set") ? set.trim() || undefined : undefined,
      grade: grade.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      quantity: (() => {
        const q = parseInt(quantity, 10);
        return Number.isFinite(q) && q > 0 ? q : 1;
      })(),
      boughtFor: fields.includes("boughtFor") ? parseAmount(boughtFor) : undefined,
      currentValue: parseAmount(currentValue) ?? 0,
      notes: notes.trim() || undefined,
      isPending: isPending || undefined,
      marketplaceUrl: marketplaceUrl.trim() || undefined,
      isContainer: isContainer || undefined,
      wantMore: wantMore || undefined,
      desiredBuyPrice: wantMore ? parseAmount(desiredBuyPrice) ?? undefined : undefined,
      forSale: forSale || undefined,
      askingPrice: forSale ? parseAmount(askingPrice) ?? undefined : undefined,
      location: location || undefined,
      // Container chosen via the dedicated add-child flow or the dropdown.
      parentId: chosenParent?.id ?? undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold">
              {initial
                ? "Rediger element"
                : parent
                  ? `Tilføj kort under "${parent.name}"`
                  : prefill
                    ? "Flyt købt ønske til samlingen"
                    : "Tilføj element"}
            </h2>
            {isChild && !initial && (
              <p className="text-xs text-neutral-500 mt-1">
                Dette kort tæller ikke i kategori-totalen — det er "inde i" {parent?.name}.
              </p>
            )}
          </div>

          <div className="px-6 py-4 space-y-3">
            {!isChild && (
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
            )}

            {!parent && !isContainer && moveTargets.length > 0 && (
              <Field label="Placér under (container)">
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="input"
                >
                  <option value="">— Ingen (øverste niveau) —</option>
                  {moveTargets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {parentId && (
                  <div className="text-xs text-neutral-500 mt-1">
                    Flyttes ind i “{moveTargets.find((c) => c.id === parentId)?.name}”
                    og tæller ikke længere selvstændigt i kategori-totalen.
                  </div>
                )}
              </Field>
            )}

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
              {(() => {
                const q = parseInt(quantity, 10);
                const v = parseAmount(currentValue);
                return Number.isFinite(q) && q > 1 && v != null ? (
                  <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                    {q} stk. = {(v * q).toLocaleString("da-DK")} kr. i alt
                  </div>
                ) : null;
              })()}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Antal">
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input tabular-nums"
                  inputMode="numeric"
                  placeholder="1"
                />
              </Field>
              <Field label="Stand / grade (valgfrit)">
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="input"
                  placeholder="PSA 10, Raw …"
                />
              </Field>
            </div>

            <Field label="Købsdato (valgfrit)">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="input"
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

            <Field label="Lokation">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as ItemLocation | "")}
                className="input"
              >
                <option value="">— Vælg —</option>
                {itemLocationOrder.map((loc) => (
                  <option key={loc} value={loc}>
                    {itemLocationLabels[loc]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Noter (valgfrit)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={2}
              />
            </Field>

            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantMore}
                  onChange={(e) => setWantMore(e.target.checked)}
                />
                <span>
                  Vil købe mere
                  <span className="text-neutral-500 ml-1">
                    (på ønskelisten)
                  </span>
                </span>
              </label>
              {wantMore && (
                <div className="pl-6">
                  <label className="block">
                    <div className="text-xs font-medium text-neutral-600 mb-1">
                      Ønsket købspris (kr.)
                    </div>
                    <input
                      value={desiredBuyPrice}
                      onChange={(e) => setDesiredBuyPrice(e.target.value)}
                      className="input tabular-nums"
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={forSale}
                  onChange={(e) => setForSale(e.target.checked)}
                />
                <span>
                  Til salg
                  <span className="text-neutral-500 ml-1">
                    (lige nu sat til salg)
                  </span>
                </span>
              </label>
              {forSale && (
                <div className="pl-6">
                  <label className="block">
                    <div className="text-xs font-medium text-neutral-600 mb-1">
                      Min pris (kr.)
                    </div>
                    <input
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      className="input tabular-nums"
                      inputMode="decimal"
                      placeholder="0"
                    />
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer">
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

            {!isChild && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isContainer}
                  onChange={(e) => setIsContainer(e.target.checked)}
                />
                <span>
                  Container
                  <span className="text-neutral-500 ml-1">
                    (kan rumme kort, f.eks. "Collectr")
                  </span>
                </span>
              </label>
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
