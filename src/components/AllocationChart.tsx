import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AppData } from "../lib/types";
import { formatDKK } from "../lib/format";
import { valueByLeafCategory } from "../lib/itemCalc";
import { resolveCategoryColor } from "../lib/categoryIcons";
import { useHideValues } from "../lib/hideValues";

// A donut showing how big a share of total value each category makes up.
// Cards inside containers (e.g. Collectr) count toward their own category.
export function AllocationChart({ data }: { data: AppData }) {
  const { mask } = useHideValues();
  const slices = useMemo(() => {
    const totals = valueByLeafCategory(data.items);
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
    <div className="panel p-5 mb-6">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
        Fordeling
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-8">
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
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => mask(formatDKK(Number(value)))}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 10,
                  border: "1px solid #242d3d",
                  background: "#131a26",
                  color: "#f3f5f9",
                }}
                itemStyle={{ color: "#f3f5f9" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 w-full max-w-lg space-y-2 min-w-0">
          {slices.map((s) => {
            const pct = (s.value / total) * 100;
            return (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate flex-1 text-neutral-700">{s.name}</span>
                <span className="tabular-nums text-neutral-500">{mask(formatDKK(s.value))}</span>
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
