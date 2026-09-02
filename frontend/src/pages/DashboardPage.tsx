import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardChart } from "@/components/DashboardChart";
import { BuildingsStatsTable } from "@/components/BuildingsStatsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useAparts } from "@/hooks/useAparts";
import {
  useBuildingsStats,
  useDashboard,
  useDashboardTimeseries,
  useStatus,
} from "@/hooks/useDashboard";
import { money, moneyShort, pct, relTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const [favOnly, setFavOnly] = useState(false);
  const { data: m, isLoading } = useDashboard(favOnly);
  const ts = useDashboardTimeseries(favOnly, 30);
  const stats = useBuildingsStats();
  const { data: status } = useStatus();
  const drops = useAparts({ price_drop_only: true, favorites_only: favOnly || undefined });

  const topMovers = useMemo(
    () =>
      [...(drops.data ?? [])]
        .filter((r) => r.price_delta_prev != null)
        .sort((a, b) => (a.price_delta_prev ?? 0) - (b.price_delta_prev ?? 0))
        .slice(0, 6),
    [drops.data],
  );

  return (
    <div className="space-y-8 p-5 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Сводка</h1>
        <Toggle value={favOnly} onChange={setFavOnly} />
      </div>

      {isLoading || !m ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:flex-wrap sm:items-end">
            <Big
              label={favOnly ? "В избранном" : "Квартир под наблюдением"}
              value={m.aparts_total.toLocaleString("ru-RU")}
            />
            <Mid label="Домов" value={String(m.buildings_total)} />
            <Mid
              label="Суммарная стоимость"
              value={m.portfolio_value ? `${moneyShort(m.portfolio_value)} ₽` : "—"}
            />
            <Mid
              label="Средняя цена м²"
              value={m.avg_price_m ? `${money(m.avg_price_m)} ₽` : "—"}
            />
            <Mid
              label="Динамика цены сегодня"
              value={
                m.avg_price_change_pct_today === null
                  ? "—"
                  : pct(m.avg_price_change_pct_today)
              }
              tone={
                (m.avg_price_change_pct_today ?? 0) < 0
                  ? "pos"
                  : (m.avg_price_change_pct_today ?? 0) > 0
                    ? "neg"
                    : undefined
              }
            />
          </div>

          <section>
            <SectionTitle>Сегодня</SectionTitle>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4 lg:grid-cols-8">
              <Metric label="Новых" value={m.new_today} to="/aparts" />
              <Metric label="Изменений" value={m.changed_today} to="/aparts" />
              <Metric label="Подешевели" value={m.price_drops_today} tone="pos" to="/aparts?price_drop_only=1" />
              <Metric label="Подорожали" value={m.price_rises_today} tone="neg" to="/aparts" />
              <Metric label="Новых скидок" value={m.discounts_appeared_today} tone="pos" to="/aparts?discount_only=1" />
              <Metric label="Ушло в резерв" value={m.reserved_today} tone="reserve" to="/aparts?reserved_only=1" />
              <Metric label="Всего в резерве" value={m.reserved_total} tone="reserve" to="/aparts?reserved_only=1" />
              <Metric label="Со скидкой" value={m.discount_total} tone="pos" to="/aparts?discount_only=1" />
            </div>
          </section>

          <section>
            <SectionTitle>Динамика за 30 дней</SectionTitle>
            {ts.isLoading && <Skeleton className="h-72 w-full" />}
            {ts.data && ts.data.every((p) => p.changes + p.new_aparts === 0) && (
              <p className="text-sm text-muted-foreground">
                Пока нет истории изменений — она накапливается с каждым обновлением
                данных (каждые {status?.interval_minutes ?? 30} мин).
              </p>
            )}
            {ts.data && ts.data.some((p) => p.changes + p.new_aparts > 0) && (
              <DashboardChart points={ts.data} />
            )}
          </section>

          {topMovers.length > 0 && (
            <section>
              <SectionTitle>Сильнее всего подешевели сегодня</SectionTitle>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {topMovers.map((r) => (
                  <Link
                    key={r.new_apart_id}
                    to="/aparts?price_drop_only=1"
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/50"
                  >
                    <span className="min-w-0 truncate text-sm">
                      {r.address}, кв. {r.number}
                    </span>
                    <span className="tnum shrink-0 text-sm text-pos">
                      {money(r.price)} ₽ · {pct(r.price_delta_prev_pct)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>По домам</SectionTitle>
            {stats.isLoading && <Skeleton className="h-64 w-full" />}
            {stats.data && stats.data.length > 0 && (
              <BuildingsStatsTable rows={stats.data} />
            )}
          </section>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Данные обновлены {relTime(status?.last_refresh)}.
      </p>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex rounded-full border border-border p-0.5 text-xs">
      {[
        { v: false, l: "Все" },
        { v: true, l: "Избранное" },
      ].map(({ v, l }) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            value === v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 text-sm font-medium">{children}</h2>
);

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="tnum mt-1 text-4xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Mid({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tnum mt-1 text-xl font-medium",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
        )}
      >
        {value}
      </div>
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
    <Link to={to} className="bg-card px-4 py-3.5 transition-colors hover:bg-secondary/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("tnum mt-1 text-2xl font-medium", toneCls)}>{value}</div>
    </Link>
  );
}
