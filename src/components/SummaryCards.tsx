import { useMemo } from "react";
import type { AppData, Snapshot } from "../lib/types";
import { TOTAL_CATEGORY_ID } from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemTotalValue, itemTotalBought } from "../lib/itemCalc";

// Headline numbers shown above the "Alle" list: total value, total profit/loss,
// and the change since the most recent saved snapshot.
export function SummaryCards({
  data,
  snapshots,
}: {
  data: AppData;
  snapshots: Snapshot[];
}) {
  const stats = useMemo(() => {
    let value = 0;
    let bought = 0;
    let valueWithBought = 0;
    for (const it of data.items) {
      if (it.parentId) continue; // children belong to their parent
      value += itemTotalValue(it);
      const b = itemTotalBought(it);
      if (b != null) {
        bought += b;
        valueWithBought += itemTotalValue(it);
      }
    }
    const gain = valueWithBought - bought;
    const gainPct = bought > 0 ? (gain / bought) * 100 : null;

    const totals = snapshots
      .filter((s) => s.categoryId === TOTAL_CATEGORY_ID)
      .sort((a, b) => a.date.localeCompare(b.date));
    const last = totals.length ? totals[totals.length - 1] : null;
    const change = last ? value - last.value : null;
    const changePct = last && last.value > 0 ? ((value - last.value) / last.value) * 100 : null;

    return {
      value,
      hasBought: bought > 0,
      gain,
      gainPct,
      change,
      changePct,
      lastDate: last?.date ?? null,
    };
  }, [data, snapshots]);

  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatDKK(Math.abs(n))}`;
  const tone = (n: number) => (n >= 0 ? "up" : "down");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <Card label="Samlet værdi" value={formatDKK(stats.value)} />

      <Card
        label="Samlet gevinst"
        value={stats.hasBought ? signed(stats.gain) : "—"}
        tone={stats.hasBought ? tone(stats.gain) : "neutral"}
        sub={
          stats.hasBought && stats.gainPct != null
            ? `${stats.gain >= 0 ? "+" : "−"}${Math.abs(stats.gainPct).toFixed(0)}%`
            : undefined
        }
      />

      <Card
        label="Ændring siden sidst"
        value={stats.change != null ? signed(stats.change) : "—"}
        tone={stats.change != null ? tone(stats.change) : "neutral"}
        sub={
          stats.lastDate
            ? stats.changePct != null
              ? `${stats.change! >= 0 ? "+" : "−"}${Math.abs(stats.changePct).toFixed(0)}% siden ${stats.lastDate}`
              : `siden ${stats.lastDate}`
            : "intet tidligere snapshot"
        }
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const color =
    tone === "up" ? "text-green-600" : tone === "down" ? "text-red-600" : "text-neutral-900";
  return (
    <div className="border border-neutral-200 rounded bg-white/80 p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${color}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 tabular-nums ${color}`}>{sub}</div>}
    </div>
  );
}
