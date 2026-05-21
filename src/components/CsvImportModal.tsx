import { useEffect, useMemo, useState } from "react";
import type { Category, Item } from "../lib/types";
import { formatDKK, parseAmount } from "../lib/format";
import { insertItems, makeId } from "../lib/storage";

type Props = {
  open: boolean;
  userId: string;
  categories: Category[];
  defaultCategoryId?: string;
  onClose: () => void;
  onImported: () => void;
};

type ParsedRow = {
  name: string;
  serial?: string;
  version?: string;
  set?: string;
  boughtFor?: number;
  currentValue?: number;
  notes?: string;
  marketplaceUrl?: string;
  errors: string[];
};

// Map of normalised header → field key. Lowercased, no accents, no whitespace.
const HEADER_MAP: Record<string, keyof ParsedRow | "ignore"> = {
  navn: "name",
  name: "name",
  card: "name",
  kort: "name",

  n: "serial",
  nummer: "serial",
  serial: "serial",
  print: "serial",

  version: "version",
  variant: "version",

  set: "set",
  saet: "set",
  series: "set",

  "koebtfor": "boughtFor",
  "købtfor": "boughtFor",
  cost: "boughtFor",
  purchase: "boughtFor",
  paid: "boughtFor",

  "nuvaerendevaerdi": "currentValue",
  "nuværendeværdi": "currentValue",
  vaerdi: "currentValue",
  værdi: "currentValue",
  value: "currentValue",
  price: "currentValue",
  pris: "currentValue",

  noter: "notes",
  notes: "notes",
  note: "notes",
  kommentar: "notes",

  link: "marketplaceUrl",
  url: "marketplaceUrl",
  cardmarket: "marketplaceUrl",
};

function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[\s_\-:.()/\\]/g, "")
    .replace(/[é]/g, "e")
    .replace(/[ø]/g, "oe");
}

function detectDelimiter(line: string): string {
  const tabs = (line.match(/\t/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  const semis = (line.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function splitLine(line: string, delim: string): string[] {
  // Naive split — good enough for spreadsheets. Doesn't handle escaped quotes
  // inside quoted fields, which is rare for collection data.
  if (delim === "\t") return line.split("\t");
  // For commas: respect simple "double-quoted" fields.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === delim && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): { rows: ParsedRow[]; columns: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], columns: [] };

  const delim = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delim);
  const mapped = headers.map((h) => HEADER_MAP[normaliseHeader(h)] ?? "ignore");

  // If no header row is detected (no recognised columns), treat all lines as
  // single-column "name" data.
  const headerMatched = mapped.some((m) => m !== "ignore");
  const start = headerMatched ? 1 : 0;
  const cols = headerMatched ? headers : ["Navn"];
  const colKeys = headerMatched ? mapped : (["name"] as (keyof ParsedRow | "ignore")[]);

  const rows: ParsedRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = splitLine(lines[i], delim);
    const row: ParsedRow = { name: "", errors: [] };
    for (let c = 0; c < parts.length && c < colKeys.length; c++) {
      const key = colKeys[c];
      if (key === "ignore") continue;
      const raw = parts[c]?.trim();
      if (!raw) continue;
      if (key === "boughtFor" || key === "currentValue") {
        const n = parseAmount(raw);
        if (n == null) row.errors.push(`Ugyldigt tal i kolonne "${cols[c]}": ${raw}`);
        else row[key] = n;
      } else {
        row[key] = raw as never;
      }
    }
    if (!row.name) row.errors.push("Mangler navn");
    rows.push(row);
  }
  return { rows, columns: cols };
}

export function CsvImportModal({
  open,
  userId,
  categories,
  defaultCategoryId,
  onClose,
  onImported,
}: Props) {
  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || "");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (defaultCategoryId) setCategoryId(defaultCategoryId);
      else if (categories.length > 0 && !categoryId) setCategoryId(categories[0].id);
    }
  }, [open, defaultCategoryId, categories, categoryId]);

  const parsed = useMemo(() => (text.trim() ? parseCsv(text) : null), [text]);
  const validRows = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];

  async function handleFile(file: File) {
    const t = await file.text();
    setText(t);
  }

  async function handleImport() {
    if (!categoryId) return;
    setImporting(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const items: Item[] = validRows.map((r) => ({
        id: makeId(),
        categoryId,
        name: r.name,
        serial: r.serial,
        version: r.version,
        set: r.set,
        boughtFor: r.boughtFor,
        currentValue: r.currentValue ?? 0,
        notes: r.notes,
        marketplaceUrl: r.marketplaceUrl,
        createdAt: nowIso,
        updatedAt: nowIso,
      }));
      await insertItems(userId, items);
      onImported();
      onClose();
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold">Importér fra CSV / regneark</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Paste fra Excel / Sheets, eller upload en .csv fil. Vi forsøger
            automatisk at genkende kolonnerne (Navn, Nuværende værdi, Sæt osv.).
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          <label className="block">
            <div className="text-xs font-medium text-neutral-600 mb-1">
              Tilføj alle som ny i kategori
            </div>
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
          </label>

          <label className="block">
            <div className="text-xs font-medium text-neutral-600 mb-1">
              Paste CSV / TSV data
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input font-mono text-xs"
              rows={8}
              placeholder={`Navn\tVersion\tSæt\tNuværende værdi\nLuffy Gear 5\t\t\t3300 kr.\nOP05 Box\t\t\t5200 kr.`}
            />
          </label>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="text-xs"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                className="text-xs underline text-neutral-500"
              >
                Ryd
              </button>
            )}
          </div>

          {parsed && parsed.rows.length > 0 && (
            <div className="border border-neutral-200 rounded">
              <div className="px-3 py-2 bg-neutral-50 text-xs text-neutral-600 flex items-center justify-between">
                <span>
                  Preview: {validRows.length} klar til import
                  {invalidRows.length > 0 && (
                    <span className="text-red-700 ml-2">
                      ({invalidRows.length} med fejl)
                    </span>
                  )}
                </span>
                <span className="text-neutral-400">
                  Genkendte kolonner: {parsed.columns.join(", ")}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-3 py-1.5">#</th>
                      <th className="text-left font-medium px-3 py-1.5">Navn</th>
                      <th className="text-left font-medium px-3 py-1.5">Sæt</th>
                      <th className="text-left font-medium px-3 py-1.5">Version</th>
                      <th className="text-right font-medium px-3 py-1.5">Værdi</th>
                      <th className="text-left font-medium px-3 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-t border-neutral-100 ${
                          r.errors.length > 0 ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-3 py-1.5 text-neutral-400">{i + 1}</td>
                        <td className="px-3 py-1.5">{r.name || "—"}</td>
                        <td className="px-3 py-1.5 text-neutral-600">{r.set || ""}</td>
                        <td className="px-3 py-1.5 text-neutral-600">{r.version || ""}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {r.currentValue != null ? formatDKK(r.currentValue) : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-red-700 text-[11px]">
                          {r.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-200 flex justify-end gap-2 bg-neutral-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded hover:bg-neutral-200 text-neutral-700"
          >
            Annuller
          </button>
          <button
            onClick={handleImport}
            disabled={importing || validRows.length === 0 || !categoryId}
            className="px-3 py-1.5 text-sm rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {importing
              ? "Importerer…"
              : validRows.length > 0
                ? `Importér ${validRows.length} item${validRows.length === 1 ? "" : "s"}`
                : "Importér"}
          </button>
        </div>
      </div>
    </div>
  );
}
