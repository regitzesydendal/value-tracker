import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AppData,
  Category,
  Snapshot} from "../lib/types";
import {
  TOTAL_CATEGORY_ID,
} from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemTotalValue } from "../lib/itemCalc";
import { backfillHistoricalSnapshots, deleteSnapshotsForDate } from "../lib/storage";
import { SnapshotEditModal } from "./SnapshotEditModal";

type Props = {
  userId: string;
  data: AppData;
  snapshots: Snapshot[];
  onSnapshotsChanged: () => void;
};

// A nice fixed palette for category lines. The grand-total line gets its own color.
const PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#dc2626", // red
  "#9333ea", // purple
  "#0891b2", // cyan
  "#ea580c", // orange
];

const TOTAL_COLOR = "#111827";

export function HistoryView({
  userId,
  data,
  snapshots,
  onSnapshotsChanged,
}: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [backfilling, setBackfilling] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  // Build the chart data: one object per date with one key per category.
  // Add a synthetic "today" point computed from the live items so the chart
  // always shows the current state at the right edge.
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();

    for (const s of snapshots) {
      const row = byDate.get(s.date) ?? {};
      row[s.categoryId] = s.value;
      byDate.set(s.date, row);
    }

    // "Today" — only add if no snapshot already exists for today.
    const today = new Date().toISOString().slice(0, 10);
    if (!byDate.has(today)) {
      const todayRow: Record<string, number> = {};
      let grandTotal = 0;
      const totalsByCategory = new Map<string, number>();
      // Children belong to their parent — only top-level items count.
      for (const item of data.items) {
        if (item.parentId) continue;
        const value = itemTotalValue(item);
        totalsByCategory.set(
          item.categoryId,
          (totalsByCategory.get(item.categoryId) ?? 0) + value,
        );
        grandTotal += value;
      }
      for (const cat of data.categories) {
        todayRow[cat.id] = totalsByCategory.get(cat.id) ?? 0;
      }
      todayRow[TOTAL_CATEGORY_ID] = grandTotal;
      byDate.set(today, todayRow);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [snapshots, data]);

  // Categories that appear in any snapshot or the current data — these get a line.
  const visibleCategories = useMemo(() => {
    const ids = new Set<string>();
    for (const s of snapshots) if (s.categoryId !== TOTAL_CATEGORY_ID) ids.add(s.categoryId);
    for (const c of data.categories) ids.add(c.id);
    return [...ids]
      .map((id): Category | undefined => data.categories.find((c) => c.id === id))
      .filter((c): c is Category => Boolean(c))
      .sort((a, b) => a.order - b.order);
  }, [snapshots, data.categories]);

  const snapshotDates = useMemo(() => {
    return Array.from(new Set(snapshots.map((s) => s.date))).sort();
  }, [snapshots]);

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillError(null);
    try {
      await backfillHistoricalSnapshots(userId);
      onSnapshotsChanged();
    } catch (e) {
      setBackfillError(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  async function handleDeleteDate(date: string) {
    if (!confirm(`Slet snapshot for ${date}?`)) return;
    try {
      await deleteSnapshotsForDate(userId, date);
      onSnapshotsChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const hasAnyData = chartData.length > 0;

  return (
    <div className="space-y-6">
      {snapshots.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm">
          <div className="font-medium text-amber-900 mb-1">
            Ingen snapshots endnu
          </div>
          <p className="text-amber-800 mb-3">
            Jeg har dine historiske data fra marts og april 2026 klar. Klik
            nedenfor for at indlæse dem på din konto.
          </p>
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="px-3 py-1.5 text-sm rounded bg-amber-900 text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {backfilling ? "Indlæser…" : "Indlæs historisk data"}
          </button>
          {backfillError && (
            <div className="mt-2 text-red-700 text-xs">{backfillError}</div>
          )}
        </div>
      )}

      {hasAnyData && (
        <div className="border border-neutral-200 rounded bg-white p-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                stroke="#d1d5db"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                stroke="#d1d5db"
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                width={50}
              />
              <Tooltip
                formatter={(value) => formatDKK(Number(value))}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                onClick={(o) => toggle(String(o.dataKey))}
              />

              {!hidden.has(TOTAL_CATEGORY_ID) && (
                <Line
                  type="monotone"
                  dataKey={TOTAL_CATEGORY_ID}
                  name="I alt"
                  stroke={TOTAL_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}

              {visibleCategories.map((cat, idx) =>
                hidden.has(cat.id) ? null : (
                  <Line
                    key={cat.id}
                    type="monotone"
                    dataKey={cat.id}
                    name={cat.name}
                    stroke={PALETTE[idx % PALETTE.length]}
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>

          <p className="text-xs text-neutral-500 mt-3">
            Klik på et navn i forklaringen for at skjule/vise den linje.
            “I dag” beregnes ud fra dine nuværende elementer.
          </p>
        </div>
      )}

      {snapshotDates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Gemte snapshots</h3>
          <div className="border border-neutral-200 rounded bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Dato</th>
                  <th className="text-right font-medium px-4 py-2">I alt</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {snapshotDates.map((date) => {
                  const total =
                    snapshots.find(
                      (s) => s.date === date && s.categoryId === TOTAL_CATEGORY_ID,
                    )?.value ?? 0;
                  return (
                    <tr
                      key={date}
                      className="border-t border-neutral-100 hover:bg-neutral-50 group cursor-pointer"
                      onClick={() => setEditingDate(date)}
                      title="Klik for at redigere"
                    >
                      <td className="px-4 py-2">{date}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">
                        {formatDKK(total)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDate(date);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded hover:bg-red-100 hover:text-red-700 text-neutral-600"
                          title="Slet snapshot"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SnapshotEditModal
        open={editingDate !== null}
        userId={userId}
        date={editingDate}
        snapshots={snapshots}
        categories={data.categories}
        onClose={() => setEditingDate(null)}
        onSaved={onSnapshotsChanged}
      />
    </div>
  );
}
