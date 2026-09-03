import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeadlines } from "@/hooks/useDashboard";
import { shortDate } from "@/lib/format";

function barColor(days: number) {
  if (days < 0) return "var(--chart-4)";
  if (days <= 7) return "var(--neg)";
  if (days <= 14) return "var(--chart-2)";
  return "var(--chart-1)";
}

export function DeadlinesChart({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useDeadlines(favOnly);
  const navigate = useNavigate();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data || data.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        Нет данных о сроках заявок.
      </p>
    );

  const rows = data
    .filter((d) => d.days_left >= -3)
    .map((d) => ({ ...d, label: shortDate(d.date) }));

  return (
    <div className="h-64 w-full rounded-xl bg-panel p-4">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            formatter={(v) => [`${v} кв.`, "На торги"]}
            labelFormatter={(l, p: any) =>
              `${l} · осталось ${p?.[0]?.payload?.days_left ?? "?"} дн`
            }
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="count"
            radius={[3, 3, 0, 0]}
            onClick={(d: any) =>
              d?.payload?.days_left >= 0 &&
              navigate(`/aparts?deadline_max=${d.payload.days_left}`)
            }
          >
            {rows.map((d) => (
              <Cell key={d.date} fill={barColor(d.days_left)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
