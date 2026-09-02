import { useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, useStatus } from "@/hooks/useDashboard";
import { pct, relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const [favOnly, setFavOnly] = useState(false);
  const { data: m, isLoading } = useDashboard(favOnly);
  const { data: status } = useStatus();

  return (
    <div className="space-y-8 p-5 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Сводка</h1>
        <div className="flex rounded-full border border-border p-0.5 text-xs">
          {[
            { v: false, l: "Все" },
            { v: true, l: "Избранное" },
          ].map(({ v, l }) => (
            <button
              key={l}
              type="button"
              onClick={() => setFavOnly(v)}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                favOnly === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !m ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-12">
            <div>
              <div className="text-sm text-muted-foreground">
                {favOnly ? "В избранном" : "Квартир под наблюдением"}
              </div>
              <div className="tnum mt-1 text-5xl font-semibold tracking-tight">
                {m.aparts_total.toLocaleString("ru-RU")}
              </div>
            </div>
            {!favOnly && (
              <div>
                <div className="text-sm text-muted-foreground">В избранном</div>
                <div className="tnum mt-1 text-2xl font-medium">
                  {m.favorites_total}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">
                Средняя динамика цены за сегодня
              </div>
              <div
                className={cn(
                  "tnum mt-1 text-2xl font-medium",
                  (m.avg_price_change_pct_today ?? 0) < 0
                    ? "text-pos"
                    : (m.avg_price_change_pct_today ?? 0) > 0
                      ? "text-neg"
                      : "",
                )}
              >
                {m.avg_price_change_pct_today === null
                  ? "—"
                  : pct(m.avg_price_change_pct_today)}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-medium">Сегодня</div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Новых" value={m.new_today} to="/aparts" />
              <Metric label="С изменениями" value={m.changed_today} to="/aparts" />
              <Metric
                label="Подешевели"
                value={m.price_drops_today}
                tone="pos"
                to="/aparts?price_drop_only=1"
              />
              <Metric
                label="Подорожали"
                value={m.price_rises_today}
                tone="neg"
                to="/aparts"
              />
              <Metric
                label="Новых скидок"
                value={m.discounts_appeared_today}
                tone="pos"
                to="/aparts?discount_only=1"
              />
              <Metric
                label="Ушло в резерв"
                value={m.reserved_today}
                tone="reserve"
                to="/aparts?reserved_only=1"
              />
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Данные обновлены {relTime(status?.last_refresh)}
        {status && `, следующее обновление в течение ${status.interval_minutes} мин`}.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: number;
  tone?: "pos" | "neg" | "reserve";
  to: string;
}) {
  const toneCls =
    value === 0
      ? "text-muted-foreground"
      : tone === "pos"
        ? "text-pos"
        : tone === "neg"
          ? "text-neg"
          : tone === "reserve"
            ? "text-reserve"
            : "";
  return (
    <Link
      to={to}
      className="bg-card px-4 py-3.5 transition-colors hover:bg-secondary/50"
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("tnum mt-1 text-2xl font-medium", toneCls)}>{value}</div>
    </Link>
  );
}
