import type { TorgiObjectOdds, TorgiObjectViewPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Спарклайн ряда просмотров: линия по дням, последняя точка выделена. */
export function Sparkline({ series }: { series: TorgiObjectViewPoint[] }) {
  const w = 56;
  const h = 18;
  const lo = Math.min(...series.map((p) => p.views));
  const hi = Math.max(...series.map((p) => p.views));
  const x = (i: number) => (i / (series.length - 1)) * (w - 4) + 2;
  const y = (v: number) => h - 2 - ((v - lo) / (hi - lo || 1)) * (h - 4);
  const last = series[series.length - 1];
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={1.5}
        points={series.map((p, i) => `${x(i)},${y(p.views)}`).join(" ")}
      />
      <circle cx={x(series.length - 1)} cy={y(last.views)} r={2.2} fill="var(--chart-1)" />
    </svg>
  );
}

/** Просмотры в таблице: число, полоска относительно максимума на странице и —
 *  когда накопилось хотя бы два дня истории — спарклайн. */
export function ViewsCell({
  views,
  max,
  series,
}: {
  views: number | null;
  max: number;
  series?: TorgiObjectViewPoint[];
}) {
  if (views == null) return <span className="text-muted-foreground">—</span>;
  const grew = series && series.length >= 2 ? views - series[0].views : null;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="min-w-0 text-right">
        <div className="tnum">{views.toLocaleString("ru-RU")}</div>
        <div className="mt-0.5 h-1 w-14 rounded-full bg-secondary">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(3, (views / (max || 1)) * 100)}%`,
              background: "var(--chart-1)",
            }}
          />
        </div>
      </div>
      {series && series.length >= 2 && (
        <div title={`+${grew} просм. с ${series[0].day}`}>
          <Sparkline series={series} />
        </div>
      )}
    </div>
  );
}

/** Цвет вероятности: низкая — нейтральная, средняя — янтарная, высокая — зелёная. */
export const oddsTone = (p: number) =>
  p >= 0.65 ? "text-pos" : p >= 0.35 ? "text-foreground" : "text-muted-foreground";

export function OddsChip({ odds }: { odds?: TorgiObjectOdds }) {
  if (!odds) return <span className="text-muted-foreground">—</span>;
  return (
    <div
      className="tnum text-right"
      title={`Просмотров в день: ${odds.views_per_day}. Среди ${odds.n} похожих лотов с такой скоростью торги состоялись в ${Math.round(odds.p_sold * 100)}% случаев${
        odds.p_competed != null
          ? `, а итог был выше начальной цены в ${Math.round(odds.p_competed * 100)}% продаж`
          : ""
      }.`}
    >
      <span className={cn("font-medium", oddsTone(odds.p_sold))}>
        {Math.round(odds.p_sold * 100)}%
      </span>
      {odds.p_competed != null && (
        <div className="text-xs text-muted-foreground">
          борьба {Math.round(odds.p_competed * 100)}%
        </div>
      )}
    </div>
  );
}

/** Блок «Шансы по просмотрам» для карточки лота — общий для недвижимости и
 *  транспорта. Не прогноз цены: как вели себя завершённые лоты с такой же
 *  скоростью просмотров. */
export function OddsPanel({ odds }: { odds?: TorgiObjectOdds }) {
  if (!odds) return null;
  const meter = (label: string, p: number, hint: string) => (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tnum font-medium">{Math.round(p * 100)}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-secondary">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(p * 100)}%`, background: "var(--chart-1)" }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">Шансы по просмотрам</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {meter(
          "Торги состоятся",
          odds.p_sold,
          "Доля продаж среди завершённых лотов этого типа с такой же скоростью просмотров.",
        )}
        {odds.p_competed != null &&
          meter(
            "Будет борьба за цену",
            odds.p_competed,
            "Доля продаж, где итог оказался выше начальной цены.",
          )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Лот собирает {odds.views_per_day.toLocaleString("ru-RU")} просм. в день — группа{" "}
        {odds.bucket} из 5 (5 — самые быстрые), опыт {odds.n} лотов в группе. Привлекательный
        номер или район уже отражены в просмотрах. Оценка эмпирическая, без поправки на цену и
        сезон.
      </p>
    </div>
  );
}
