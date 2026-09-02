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
import { moneyShort } from "@/lib/format";
import type { ApartRow } from "@/lib/types";

function Panel({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-panel p-4">
      <div title={help} className="mb-3 cursor-help text-sm font-medium">
        {title}
      </div>
      <div className="h-44">
        <ResponsiveContainer>{children as React.ReactElement}</ResponsiveContainer>
      </div>
    </div>
  );
}

const axis = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
} as const;

export function DashboardBreakdowns({ rows }: { rows: ApartRow[] }) {
  const roomsMap = new Map<string, number>();
  for (const r of rows) {
    const k = !r.rooms || r.rooms === "0" ? "Студия" : `${r.rooms}-комн`;
    roomsMap.set(k, (roomsMap.get(k) ?? 0) + 1);
  }
  const rooms = [...roomsMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const pm = rows.map((r) => r.price_m).filter((v): v is number => v != null);
  const min = Math.min(...pm, 0);
  const max = Math.max(...pm, 1);
  const step = Math.max(1, Math.ceil((max - min) / 8 / 10000) * 10000);
  const histMap = new Map<number, number>();
  for (const v of pm) {
    const bucket = Math.floor((v - min) / step) * step + min;
    histMap.set(bucket, (histMap.get(bucket) ?? 0) + 1);
  }
  const hist = [...histMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({ label: moneyShort(bucket), count }));

  const composition = [
    { name: "В резерве", count: rows.filter((r) => r.reserve === 1).length, fill: "var(--reserve)" },
    { name: "Со скидкой", count: rows.filter((r) => r.has_discount).length, fill: "var(--pos)" },
    { name: "Семейная", count: rows.filter((r) => r.is_family).length, fill: "var(--accent-foreground)" },
    { name: "В избранном", count: rows.filter((r) => r.is_favorite).length, fill: "var(--primary)" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Комнатность" help="Сколько квартир каждого типа в текущем списке.">
        <BarChart data={rooms}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="name" {...axis} />
          <YAxis allowDecimals={false} width={30} {...axis} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </Panel>

      <Panel
        title="Цена за м²"
        help="Распределение квартир по цене квадратного метра — где сосредоточена основная масса предложений."
      >
        <BarChart data={hist}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" {...axis} interval={0} angle={-30} textAnchor="end" height={44} />
          <YAxis allowDecimals={false} width={30} {...axis} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </Panel>

      <Panel
        title="Состав списка"
        help="Сколько квартир помечено каждым признаком (пересекаются)."
      >
        <BarChart data={composition} layout="vertical" margin={{ left: 12 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axis} />
          <YAxis type="category" dataKey="name" width={78} {...axis} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {composition.map((c) => (
              <Cell key={c.name} fill={c.fill} />
            ))}
          </Bar>
        </BarChart>
      </Panel>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;
