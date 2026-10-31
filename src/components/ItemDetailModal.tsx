import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category, Item, PricePoint } from "../lib/types";
import { formatDKK, parseAmount } from "../lib/format";
import { itemQuantity, itemTotalBought, itemTotalValue } from "../lib/itemCalc";
import { loadItemPrices } from "../lib/storage";
import { CategoryIcon } from "../lib/categoryIcons";
import { useHideValues, MONEY_MASK } from "../lib/hideValues";

type Props = {
  item: Item | null;
  category?: Category;
  onClose: () => void;
  onEdit: (item: Item) => void;
  // Saves today's per-unit price (updates current value + price history).
  onUpdatePrice: (item: Item, price: number) => Promise<void>;
};

type ChartPoint = { date: string; price: number; label?: string };

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

// Combine recorded price history with what we already know about the item:
// the purchase price (on the purchase date) and the current value (on the day
// it was last updated) — so items without history still get a useful chart.
function buildChart(item: Item, history: PricePoint[]): ChartPoint[] {
  const byDate = new Map<string, ChartPoint>();
  if (item.boughtFor != null && item.purchaseDate) {
    byDate.set(item.purchaseDate, {
      date: item.purchaseDate,
      price: item.boughtFor,
      label: "Købt",
    });
  }
  for (const p of history) byDate.set(p.date, { date: p.date, price: p.price });
  const lastHistoryDate = history.length ? history[history.length - 1].date : "";
  const updated = (item.updatedAt ?? "").slice(0, 10) || today();
  if (updated > lastHistoryDate && !byDate.has(updated)) {
    byDate.set(updated, { date: updated, price: item.currentValue });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function ItemDetailModal(props: Props) {
  if (!props.item) return null;
  // Keyed by item so all local state starts fresh for each item opened.
  return <ItemDetail key={props.item.id} {...props} item={props.item} />;
}

function ItemDetail({
  item,
  category,
  onClose,
  onEdit,
  onUpdatePrice,
}: Props & { item: Item }) {
  const { hidden, mask } = useHideValues();
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [priceInput, setPriceInput] = useState(String(item.currentValue ?? ""));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    loadItemPrices(item.id)
      .then(setHistory)
      .catch((e) => {
        // Most likely the item_prices migration hasn't been run yet.
        console.warn("loadItemPrices failed:", e);
        setHistoryError(true);
      });
  }, [item.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chartData = useMemo(() => buildChart(item, history), [item, history]);

  const qty = itemQuantity(item);
  const bought = itemTotalBought(item);
  const total = itemTotalValue(item);
  const gain = bought != null ? total - bought : null;
  const first = chartData[0];
  const change = first && chartData.length > 1 ? item.currentValue - first.price : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const price = parseAmount(priceInput);
    if (price == null) return;
    setSaving(true);
    try {
      await onUpdatePrice(item, price);
      setHistory(await loadItemPrices(item.id));
      setHistoryError(false);
      setSavedMsg(true);
    } catch (err) {
      console.warn("price update failed:", err);
    } finally {
      setSaving(false);
    }
  }

  const details = [
    item.set && `Sæt: ${item.set}`,
    item.version && `Version: ${item.version}`,
    item.serial && `N. ${item.serial}`,
    qty > 1 && `${qty} stk.`,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-neutral-200 flex items-start gap-3">
          {category && <CategoryIcon category={category} size={24} />}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
              <span>{item.name}</span>
              {item.grade && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-white">
                  {item.grade}
                </span>
              )}
            </h2>
            {details.length > 0 && (
              <div className="text-xs text-neutral-500 mt-0.5">{details.join(" · ")}</div>
            )}
          </div>
          <button
            onClick={() => onEdit(item)}
            className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 shrink-0"
          >
            ✎ Rediger
          </button>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 text-lg leading-none px-1 py-1.5"
            title="Luk"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Nuværende værdi" value={mask(formatDKK(total))} />
          <Stat label="Købt for" value={bought != null ? mask(formatDKK(bought)) : "—"} />
          <Stat
            label="Gevinst"
            value={gain != null ? mask(`${gain >= 0 ? "+" : "−"}${formatDKK(Math.abs(gain))}`) : "—"}
            tone={gain == null || hidden ? undefined : gain >= 0 ? "up" : "down"}
          />
        </div>

        <div className="px-6 pb-2">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-neutral-500">
              Pris over tid {qty > 1 && "(pr. stk.)"}
            </h3>
            {change != null && !hidden && (
              <span className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {change >= 0 ? "+" : "−"}
                {formatDKK(Math.abs(change))} siden {formatDate(first.date)}
              </span>
            )}
          </div>
          {chartData.length < 2 ? (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded text-center px-6">
              {historyError
                ? "Prishistorik er ikke slået til endnu — kør supabase/migration_item_prices.sql i Supabase."
                : "Grafen kommer, når der er registreret mindst to priser. Opdater prisen nedenfor næste gang du tjekker den."}
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: "#737373" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e5e5" }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => (hidden ? MONEY_MASK : formatDKK(v))}
                    tick={{ fontSize: 11, fill: "#737373" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    formatter={(v) => [mask(formatDKK(Number(v))), "Pris"]}
                    labelFormatter={(d, payload) => {
                      const label = payload?.[0]?.payload?.label;
                      return `${formatDate(String(d))}${label ? ` · ${label}` : ""}`;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSave}
          className="mx-6 my-4 p-4 rounded border border-neutral-200 bg-neutral-50"
        >
          <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
            Dagens pris {qty > 1 && "(pr. stk.)"} — {formatDate(today())}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value);
                setSavedMsg(false);
              }}
              inputMode="decimal"
              className="input max-w-[140px] text-right tabular-nums"
              placeholder="0"
            />
            <span className="text-sm text-neutral-500">kr.</span>
            <button
              type="submit"
              disabled={saving || parseAmount(priceInput) == null}
              className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Gemmer…" : "Gem dagens pris"}
            </button>
            {item.marketplaceUrl && (
              <a
                href={item.marketplaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-3 py-1.5 rounded border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700"
              >
                Tjek pris ↗
              </a>
            )}
            {savedMsg && <span className="text-sm text-green-600">✓ Gemt</span>}
          </div>
        </form>

        {item.notes && (
          <div className="px-6 pb-4 text-sm text-neutral-600 whitespace-pre-wrap">{item.notes}</div>
        )}

        <div className="px-6 py-3 border-t border-neutral-200 flex justify-end gap-2">
          <button
            onClick={() => onEdit(item)}
            className="text-sm px-3 py-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-700"
          >
            ✎ Rediger
          </button>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded bg-neutral-900 text-white hover:bg-neutral-800"
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded border border-neutral-200 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div
        className={`font-semibold tabular-nums mt-0.5 ${
          tone === "up" ? "text-green-600" : tone === "down" ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
