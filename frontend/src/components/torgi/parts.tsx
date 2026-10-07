import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

/** Общая обвязка виджетов дашборда торгов: панель, пустое состояние, оси. */

export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export const axis = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
} as const;

/** палитра как в ScatterExplorer — новых цветов не вводим */
export const PALETTE = [
  "#4f7686", "#b0763d", "#7d6ca6", "#4f8a6b", "#a1502a", "#5c6b8a",
  "#8a8f98", "#3c8f8f", "#9c6b8a", "#6b8f3c", "#8f6b3c", "#3c6b9c",
];

export function Panel({
  title,
  help,
  right,
  children,
}: {
  title?: string;
  help?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-panel p-4">
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <div
              title={help}
              className={cn("text-sm font-medium", help && "cursor-help")}
            >
              {title}
            </div>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Прочерк вместо графика: блок остаётся на месте и не ломает сетку. */
export function Empty({
  children = "—",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "tnum py-10 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Chart({
  height = "h-60",
  children,
}: {
  height?: string;
  children: ReactElement;
}) {
  return (
    <div className={cn("w-full", height)}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

/** Строка лота: везде ведёт в карточку /torgi/cars/{lot_id}. */
export function LotRow({
  lotId,
  title,
  sub,
  right,
}: {
  lotId: number;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Link
      to={`/torgi/cars/${lotId}`}
      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-secondary/60"
    >
      <span className="min-w-0">
        <span className="block truncate">{title || `Лот ${lotId}`}</span>
        {sub && (
          <span className="block truncate text-xs text-muted-foreground">
            {sub}
          </span>
        )}
      </span>
      {right && <span className="shrink-0 text-right">{right}</span>}
    </Link>
  );
}

export function LotList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {children}
    </div>
  );
}

/** Горизонтальная шкала «доля от максимума» — для воронки и качества данных. */
export function MeterRow({
  label,
  value,
  share,
  color = "var(--chart-1)",
  hint,
}: {
  label: string;
  value: ReactNode;
  share: number;
  color?: string;
  hint?: string;
}) {
  return (
    <div title={hint}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate">{label}</span>
        <span className="tnum shrink-0 text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, share * 100))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
