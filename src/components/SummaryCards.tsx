import { useMemo, useState } from "react";
import type { AppData, Snapshot } from "../lib/types";
import { TOTAL_CATEGORY_ID } from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemTotalValue, itemTotalBought } from "../lib/itemCalc";

// Persisted across reloads so the user's "skjul beløb" choice sticks.
const HIDE_KEY = "vt:hideValues";

// A playful star mask shown instead of the real number when values are hidden.
const MASK = "✦ ✦ ✦ ✦";

// Headline numbers shown above the "Alle" list: total value, total profit/loss,
// and the change since the most recent saved snapshot.
export function SummaryCards({
  data,
  snapshots,
}: {
  data: AppData;
  snapshots: Snapshot[];
}) {
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleHidden() {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIDE_KEY, next ? "1" : "0");
      } catch {
        /* ignore storage errors (e.g. private mode) */
      }
      return next;
    });
  }

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
    <div className="mb-4">
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={toggleHidden}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-neutral-200 bg-white/70 text-neutral-600 hover:bg-white hover:text-neutral-900"
          title={hidden ? "Vis beløb" : "Skjul beløb (anonymisér)"}
        >
          {hidden ? <EyeOffIcon /> : <EyeIcon />}
          <span>{hidden ? "Vis beløb" : "Skjul beløb"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card label="Samlet værdi" value={formatDKK(stats.value)} hidden={hidden} />

        <Card
          label="Samlet gevinst"
          value={stats.hasBought ? signed(stats.gain) : "—"}
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
          value={stats.change != null ? signed(stats.change) : "—"}
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
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  tone = "neutral",
  hidden = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
  hidden?: boolean;
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
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${color}`}>
        {hidden ? MASK : value}
      </div>
      {sub && !hidden && <div className={`text-xs mt-0.5 tabular-nums ${color}`}>{sub}</div>}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M6.61 6.61A18.45 18.45 0 0 0 1 12s4 8 11 8a9.12 9.12 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
