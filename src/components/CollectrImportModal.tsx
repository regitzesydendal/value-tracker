import { useEffect, useMemo, useState } from "react";
import type { Category, Item } from "../lib/types";
import { formatDKK } from "../lib/format";
import { insertItems, makeId, recordItemPrices, upsertItem } from "../lib/storage";

// Imports a Collectr portfolio export (CSV). Every Collectr portfolio
// ("151 Masterset", "SLABS", …) becomes a container inside a top-level
// "Collectr" container, with its cards inside. Cards the user already has are
// detected and can be merged (price/details updated, moved into the right
// portfolio) instead of duplicated.

type Props = {
  open: boolean;
  userId: string;
  categories: Category[];
  items: Item[];
  onClose: () => void;
  onImported: () => void;
};

type CollectrRow = {
  key: number;
  portfolio: string;
  game: string;
  set: string;
  name: string;
  number: string;
  rarity: string;
  variant: string;
  condition: string;
  grade?: string; // "PSA 10", "Sealed", or undefined for ungraded cards
  quantity: number;
  price: number; // per unit, DKK (custom price wins over market price)
  productId: string;
};

// ---------- CSV parsing ----------

function parseCsvLines(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    out.push(row);
  }
  return out.filter((r) => r.some((f) => f.trim()));
}

function parseCollectr(text: string): CollectrRow[] | string {
  const lines = parseCsvLines(text.replace(/^\uFEFF/, ""));
  if (lines.length < 2) return "Filen er tom.";
  const header = lines[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.findIndex((h) => h.startsWith(name));
  const idx = {
    portfolio: col("portfolio"),
    game: col("game"),
    set: col("set"),
    name: col("name"),
    number: col("card number"),
    rarity: col("rarity"),
    type: col("type"),
    variant: col("variant"),
    condition: col("condition"),
    company: col("grading company"),
    grade: col("grade"),
    quantity: col("quantity"),
    market: col("market price per unit"),
    custom: col("custom price per unit"),
    productId: col("collectr product id"),
  };
  if (idx.portfolio < 0 || idx.name < 0 || idx.market < 0) {
    return "Det ligner ikke en Collectr-fil (mangler Portfolio / Name / Market price).";
  }
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  return lines.slice(1).map((r, key) => {
    const type = get(r, idx.type).toLowerCase();
    const company = get(r, idx.company);
    const gradeNum = get(r, idx.grade).split(" ")[0];
    const grade =
      type === "sealed"
        ? "Sealed"
        : company && gradeNum && gradeNum.toLowerCase() !== "ungraded"
          ? `${company} ${gradeNum}`
          : undefined;
    const custom = parseFloat(get(r, idx.custom));
    const market = parseFloat(get(r, idx.market));
    const qty = parseInt(get(r, idx.quantity), 10);
    return {
      key,
      portfolio: get(r, idx.portfolio) || "Collectr",
      game: get(r, idx.game),
      set: get(r, idx.set),
      name: get(r, idx.name),
      number: get(r, idx.number),
      rarity: get(r, idx.rarity),
      variant: get(r, idx.variant),
      condition: get(r, idx.condition),
      grade,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price: Number.isFinite(custom) ? custom : Number.isFinite(market) ? market : 0,
      productId: get(r, idx.productId),
    };
  });
}

// ---------- Duplicate detection ----------

function norm(s: string | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const gradeKey = (g: string | undefined) => {
  const k = (g ?? "").trim().toLowerCase();
  return k === "raw" ? "" : k;
};

// How well an existing item matches a Collectr row: 2 = same name, 1 = loose,
// 0 = no match. Graded/sealed items (few, valuable, often typed in by hand with
// a longer name like "Base Set Charizard PSA 8") match loosely on name words;
// ordinary cards need an exact name.
function matchScore(row: CollectrRow, it: Item): number {
  const rowName = norm(row.name);
  const rowGrade = gradeKey(row.grade);
  if (!rowName || gradeKey(it.grade) !== rowGrade) return 0;
  const name = norm(it.name);
  if (name === rowName && (!it.set || norm(it.set) === norm(row.set))) return 2;
  if (rowGrade) {
    const words = new Set(name.split(" "));
    if (rowName.split(" ").every((w) => words.has(w))) return 1;
  }
  return 0;
}

// Pair rows with existing items, one-to-one: best name match first, then the
// closest price (so of two "Psyduck PSA 9" rows, the one priced like the
// user's own entry wins).
function autoMatch(rows: CollectrRow[], candidates: Item[]): Map<number, string> {
  const pairs: { row: number; item: string; score: number; diff: number }[] = [];
  for (const r of rows) {
    for (const it of candidates) {
      const score = matchScore(r, it);
      if (score) pairs.push({ row: r.key, item: it.id, score, diff: Math.abs(r.price - it.currentValue) });
    }
  }
  pairs.sort((a, b) => b.score - a.score || a.diff - b.diff);
  const result = new Map<number, string>();
  const usedItems = new Set<string>();
  for (const p of pairs) {
    if (result.has(p.row) || usedItems.has(p.item)) continue;
    result.set(p.row, p.item);
    usedItems.add(p.item);
  }
  return result;
}

const NEW = "__new__";

// ---------- Component ----------

export function CollectrImportModal({
  open,
  userId,
  categories,
  items,
  onClose,
  onImported,
}: Props) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  // "" = use the auto-detected category (see below).
  const [pokemonChoice, setPokemonCat] = useState("");
  const [onePieceChoice, setOnePieceCat] = useState("");
  // Row key → existing item id it's the same as (or NEW).
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findCat = (re: RegExp) =>
    categories.find((c) => re.test(c.name))?.id ?? categories[0]?.id ?? "";
  const pokemonCat = pokemonChoice || findCat(/pok[eé]mon/i);
  const onePieceCat = onePieceChoice || findCat(/one\s*piece/i);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !importing && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, importing, onClose]);

  const parsed = useMemo(() => (text ? parseCollectr(text) : null), [text]);
  const rows = useMemo(() => (Array.isArray(parsed) ? parsed : []), [parsed]);

  // Items that can be merged into: anything that isn't a container.
  const candidates = useMemo(
    () => items.filter((i) => !i.isContainer && norm(i.name) !== "collectr"),
    [items],
  );

  const autoMatches = useMemo(() => autoMatch(rows, candidates), [rows, candidates]);

  const choiceFor = (r: CollectrRow) => choices[r.key] ?? autoMatches.get(r.key) ?? NEW;

  // Rows worth a manual look: auto-matched ones plus every graded/sealed item
  // (those are the ones most likely already typed in by hand).
  const reviewRows = rows.filter((r) => autoMatches.has(r.key) || r.grade);

  const portfolios = useMemo(() => {
    const m = new Map<string, { count: number; value: number; games: Map<string, number> }>();
    for (const r of rows) {
      const p = m.get(r.portfolio) ?? { count: 0, value: 0, games: new Map() };
      p.count += 1;
      p.value += r.price * r.quantity;
      p.games.set(r.game, (p.games.get(r.game) ?? 0) + 1);
      m.set(r.portfolio, p);
    }
    return [...m.entries()];
  }, [rows]);

  if (!open) return null;

  const catForGame = (game: string) => (/one\s*piece/i.test(game) ? onePieceCat : pokemonCat);
  const mergeCount = rows.filter((r) => choiceFor(r) !== NEW).length;
  const newCount = rows.length - mergeCount;

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const baseMs = Date.now();
      let seq = 0;
      const stamp = () => new Date(baseMs + seq++).toISOString();
      const nowIso = new Date(baseMs).toISOString();

      // 1. The top-level "Collectr" container (reuse/convert an existing one).
      const existingCollectr =
        items.find((i) => i.isContainer && !i.parentId && norm(i.name) === "collectr") ??
        items.find((i) => !i.parentId && norm(i.name) === "collectr");
      let collectr: Item;
      const containersToInsert: Item[] = [];
      if (existingCollectr) {
        collectr = existingCollectr;
        if (!existingCollectr.isContainer) {
          collectr = { ...existingCollectr, isContainer: true, updatedAt: nowIso };
          await upsertItem(userId, collectr);
        }
      } else {
        collectr = {
          id: makeId(),
          categoryId: pokemonCat,
          name: "Collectr",
          currentValue: 0,
          isContainer: true,
          createdAt: stamp(),
          updatedAt: nowIso,
        };
        containersToInsert.push(collectr);
      }

      // 2. One container per portfolio (reused if it already exists).
      const portfolioIds = new Map<string, string>();
      for (const [name, info] of portfolios) {
        const existing = items.find(
          (i) => i.isContainer && i.parentId === collectr.id && norm(i.name) === norm(name),
        );
        if (existing) {
          portfolioIds.set(name, existing.id);
          continue;
        }
        const topGame = [...info.games.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
        const c: Item = {
          id: makeId(),
          categoryId: catForGame(topGame),
          name,
          currentValue: 0,
          isContainer: true,
          parentId: collectr.id,
          createdAt: stamp(),
          updatedAt: nowIso,
        };
        containersToInsert.push(c);
        portfolioIds.set(name, c.id);
      }
      if (containersToInsert.length) await insertItems(userId, containersToInsert);

      // 3. Cards: new ones inserted, matched ones merged into the existing item.
      const newItems: Item[] = [];
      const prices: { itemId: string; date: string; price: number }[] = [];
      const byId = new Map(items.map((i) => [i.id, i]));
      for (const r of rows) {
        const details = {
          set: r.set || undefined,
          serial: r.number || undefined,
          version: r.variant || undefined,
          marketplaceUrl: r.productId
            ? `https://www.tcgplayer.com/product/${r.productId}`
            : undefined,
        };
        const parentId = portfolioIds.get(r.portfolio);
        const forSale = /for sale/i.test(r.portfolio) || undefined;
        const choice = choiceFor(r);
        const existing = choice !== NEW ? byId.get(choice) : undefined;
        if (existing) {
          // Keep what the user typed (name, købspris, dato, noter); fill in gaps,
          // refresh the price and move it into its portfolio.
          const merged: Item = {
            ...existing,
            set: existing.set || details.set,
            serial: existing.serial || details.serial,
            version: existing.version || details.version,
            marketplaceUrl: existing.marketplaceUrl || details.marketplaceUrl,
            grade: existing.grade || r.grade,
            currentValue: r.price,
            parentId,
            forSale: existing.forSale || forSale,
            updatedAt: nowIso,
          };
          await upsertItem(userId, merged);
          prices.push({ itemId: merged.id, date: today, price: r.price });
          continue;
        }
        const notes = [
          r.rarity && r.rarity !== "None" && r.rarity,
          r.condition && r.condition !== "Near Mint" && r.condition,
        ]
          .filter(Boolean)
          .join(" · ");
        const it: Item = {
          id: makeId(),
          categoryId: catForGame(r.game),
          name: r.name,
          ...details,
          grade: r.grade,
          quantity: r.quantity,
          currentValue: r.price,
          notes: notes || undefined,
          forSale,
          parentId,
          createdAt: stamp(),
          updatedAt: nowIso,
        };
        newItems.push(it);
        prices.push({ itemId: it.id, date: today, price: r.price });
      }
      await insertItems(userId, newItems);
      try {
        await recordItemPrices(userId, prices);
      } catch (e) {
        console.warn("recordItemPrices failed:", e);
      }
      onImported();
      onClose();
      setText("");
      setFileName("");
      setChoices({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Some rows may have been written — reload so the screen matches the DB.
      onImported();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => e.target === e.currentTarget && !importing && onClose()}
    >
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold">Importér fra Collectr</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Hver mappe i Collectr bliver sin egen container inde under “Collectr”, som du kan
            folde ud og lukke.
          </p>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <label className="block">
            <div className="text-xs font-medium text-neutral-600 mb-1">Collectr-fil (.csv)</div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFileName(f.name);
                setChoices({});
                setText(await f.text());
              }}
              className="text-xs"
            />
            {fileName && <span className="text-xs text-neutral-500 ml-2">{fileName}</span>}
          </label>

          {typeof parsed === "string" && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {parsed}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <CatSelect label="Pokémon-kort → kategori" value={pokemonCat} onChange={setPokemonCat} categories={categories} />
                <CatSelect label="One Piece-kort → kategori" value={onePieceCat} onChange={setOnePieceCat} categories={categories} />
              </div>

              <div>
                <div className="text-xs font-medium text-neutral-600 mb-1">Mapper</div>
                <div className="border border-neutral-200 rounded divide-y divide-neutral-100 text-sm">
                  {portfolios.map(([name, info]) => (
                    <div key={name} className="px-3 py-1.5 flex justify-between">
                      <span>📦 {name}</span>
                      <span className="text-neutral-500 tabular-nums">
                        {info.count} kort · {formatDKK(info.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-neutral-600 mb-1">
                  Har du allerede nogle af dem? ({reviewRows.length} at tjekke)
                </div>
                <p className="text-xs text-neutral-500 mb-2">
                  Graded og sealed kort, plus dem hvor vi fandt et match. Vælg “Samme som …” for at
                  opdatere dit eksisterende kort (din købspris, dato og noter bevares) og flytte det
                  ind i mappen. Eller “Tilføj som ny”.
                </p>
                <div className="border border-neutral-200 rounded divide-y divide-neutral-100">
                  {reviewRows.map((r) => {
                    const choice = choiceFor(r);
                    return (
                      <div
                        key={r.key}
                        className={`px-3 py-2 flex flex-wrap items-center gap-2 text-sm ${
                          choice !== NEW ? "bg-amber-50" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {r.name}{" "}
                            {r.grade && <span className="text-xs text-neutral-500">· {r.grade}</span>}
                          </div>
                          <div className="text-xs text-neutral-500 truncate">
                            {r.portfolio} · {r.set} · {formatDKK(r.price)}
                          </div>
                        </div>
                        <select
                          value={choice}
                          onChange={(e) => setChoices((c) => ({ ...c, [r.key]: e.target.value }))}
                          className="input max-w-[260px] text-xs"
                        >
                          <option value={NEW}>Tilføj som ny</option>
                          {candidates.map((it) => (
                            <option key={it.id} value={it.id}>
                              Samme som: {it.name}
                              {it.grade ? ` (${it.grade})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              Import fejlede: {error}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-200 flex items-center justify-end gap-2 bg-neutral-50">
          {rows.length > 0 && (
            <span className="text-xs text-neutral-500 mr-auto">
              {newCount} nye · {mergeCount} opdateres
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-3 py-1.5 text-sm rounded hover:bg-neutral-200 text-neutral-700"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || rows.length === 0 || !pokemonCat || !onePieceCat}
            className="px-3 py-1.5 text-sm rounded bg-accent text-ink font-semibold hover:bg-accent-soft disabled:opacity-50"
          >
            {importing ? "Importerer…" : `Importér ${rows.length} kort`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CatSelect({
  label,
  value,
  onChange,
  categories,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  categories: Category[];
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-neutral-600 mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
