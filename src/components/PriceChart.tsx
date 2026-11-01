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
import type { Item, PricePoint } from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemQuantity } from "../lib/itemCalc";
import { loadItemPrices } from "../lib/storage";
import { useHideValues, MONEY_MASK } from "../lib/hideValues";

type ChartPoint = { date: string; price: number; label?: string };

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
  const updated = (item.updatedAt ?? "").slice(0, 10);
  if (updated && updated > lastHistoryDate && !byDate.has(updated)) {
    byDate.set(updated, { date: updated, price: item.currentValue });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Per-unit price over time for one item, shown in the edit window.
export function PriceChart({ item }: { item: Item }) {
  const { hidden, mask } = useHideValues();
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    loadItemPrices(item.id)
      .then(setHistory)
      .catch((e) => {
        // Most likely the item_prices migration hasn't been run yet.
        console.warn("loadItemPrices failed:", e);
        setHistoryError(true);
      });
  }, [item.id]);

  const chartData = useMemo(() => buildChart(item, history), [item, history]);
  const first = chartData[0];
  const change = first && chartData.length > 1 ? item.currentValue - first.price : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs font-medium text-neutral-600">
          Pris over tid {itemQuantity(item) > 1 && "(pr. stk.)"}
        </div>
        {change != null && !hidden && (
          <span className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : "−"}
            {formatDKK(Math.abs(change))} siden {formatDate(first.date)}
          </span>
        )}
      </div>
      {historyError || chartData.length === 0 ? (
        <div className="h-28 flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded text-center px-6">
          {historyError
            ? "Prishistorik er ikke slået til endnu — kør supabase/migration_item_prices.sql i Supabase."
            : "Ingen priser registreret endnu."}
        </div>
      ) : (
        <>
        {chartData.length === 1 && (
          <div className="text-[11px] text-neutral-500 mb-1">
            Startpunkt {formatDate(chartData[0].date)}. Opdater “Nuværende værdi”, næste gang du
            tjekker prisen, så tegnes kurven derfra.
          </div>
        )}
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                width={72}
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
        </>
      )}
    </div>
  );
}
