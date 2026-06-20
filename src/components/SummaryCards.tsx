import { useMemo } from "react";
import type { AppData, Snapshot } from "../lib/types";
import { TOTAL_CATEGORY_ID } from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemTotalValue, itemTotalBought } from "../lib/itemCalc";
import { useHideValues, EyeIcon, EyeOffIcon } from "../lib/hideValues";

// Headline numbers shown above the "Alle" list: total value, total profit/loss,
// and the change since the most recent saved snapshot.
export function SummaryCards({
  data,
  snapshots,
}: {
  data: AppData;
  snapshots: Snapshot[];
}) {
  const { hidden, toggle, mask } = useHideValues();

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
      <Card
        label="Samlet værdi"
        value={mask(formatDKK(stats.value))}
        hidden={hidden}
        action={
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            title={hidden ? "Vis beløb" : "Skjul beløb (anonymisér hele siden)"}
          >
            {hidden ? <EyeOffIcon /> : <EyeIcon />}
            <span>{hidden ? "Vis" : "Skjul"}</span>
          </button>
        }
      />

      <Card
        label="Samlet gevinst"
        value={stats.hasBought ? mask(signed(stats.gain)) : "—"}
        tone={stats.hasBought ? tone(stats.gain) : "neutral"}
        hidden={hidden}
        sub={
          stats.hasBought && stats.gainPct != null
            ? `${stats.gain >= 0 ? "+" : "−"}${Math.abs(stats.gainPct).toFixed(0)}%`
            : undefined
        }
      />

      <Card
        label="Ændring siden sidst"
        value={stats.change != null ? mask(signed(stats.change)) : "—"}
        tone={stats.change != null ? tone(stats.change) : "neutral"}
        hidden={hidden}
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
  hidden = false,
  action,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
  hidden?: boolean;
  action?: React.ReactNode;
}) {
  // When hidden, neutralise the colour too so up/down (gain/loss) isn't leaked.
  const color = hidden
    ? "text-neutral-400"
    : tone === "up"
      ? "text-green-600"
      : tone === "down"
        ? "text-red-600"
        : "text-neutral-900";
  return (
    <div className="border border-neutral-200 rounded bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
        {action}
      </div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${color}`}>{value}</div>
      {sub && !hidden && <div className={`text-xs mt-0.5 tabular-nums ${color}`}>{sub}</div>}
    </div>
  );
}
