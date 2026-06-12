import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AppData } from "../lib/types";
import { formatDKK } from "../lib/format";
import { itemTotalValue } from "../lib/itemCalc";
import { resolveCategoryColor } from "../lib/categoryIcons";

// A donut showing how big a share of total value each category makes up.
// Children belong to their parent, so only top-level items are counted —
// matching the totals shown in the sidebar.
export function AllocationChart({ data }: { data: AppData }) {
  const slices = useMemo(() => {
    const totals = new Map<string, number>();
    for (const it of data.items) {
      if (it.parentId) continue;
      totals.set(it.categoryId, (totals.get(it.categoryId) ?? 0) + itemTotalValue(it));
    }
    return data.categories
      .map((c) => ({
        name: c.name,
        value: totals.get(c.id) ?? 0,
        color: resolveCategoryColor(c) ?? "#9ca3af",
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = slices.reduce((s, x) => s + x.value, 0);

  // Nothing to show until there's at least one valued item.
  if (slices.length === 0 || total === 0) return null;

  return (
    <div className="border border-neutral-200 rounded bg-white p-4 mb-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
        Fordeling
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div style={{ width: 200, height: 200 }} className="shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={1}
                minAngle={3}
                stroke="none"
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatDKK(Number(value))}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 w-full space-y-1.5 min-w-0">
          {slices.map((s) => {
            const pct = (s.value / total) * 100;
            return (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate flex-1 text-neutral-700">{s.name}</span>
                <span className="tabular-nums text-neutral-500">{formatDKK(s.value)}</span>
                <span className="tabular-nums font-medium text-neutral-900 w-12 text-right">
                  {pct.toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
