import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Beeswarm } from "@/components/Beeswarm";
import { DashboardBreakdowns } from "@/components/DashboardBreakdowns";
import { DashboardChanges } from "@/components/DashboardChanges";
import { DashboardChart } from "@/components/DashboardChart";
import { MetroChart } from "@/components/MetroChart";
import { PivotChart } from "@/components/PivotChart";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { SankeyChart } from "@/components/SankeyChart";
import { ScatterExplorer } from "@/components/ScatterExplorer";
import { Skeleton } from "@/components/ui/skeleton";
import { useAparts } from "@/hooks/useAparts";
import {
  useDashboard,
  useDashboardTimeseries,
  useMetroStats,
  usePriceHistory,
  useStatus,
} from "@/hooks/useDashboard";
import { money, pct, relTime, shortDate, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHART_HELP =
  "Состояние списка на каждую дату: для каждой квартиры берётся её версия, " +
  "актуальная на тот день, и считается, сколько всего / в резерве / со скидкой / " +
  "по семейной ипотеке. Линии держат уровень и двигаются относительно соседних дат.";

const dateInputCls =
  "tnum rounded-md border border-border bg-card px-2 py-1 text-xs";

export function DashboardPage() {
  const [favOnly, setFavOnly] = useState(false);
  const { data: m, isLoading } = useDashboard(favOnly);
  const { data: status } = useStatus();
  const metro = useMetroStats();
  const priceHistory = usePriceHistory();
  const all = useAparts({ favorites_only: favOnly || undefined });

  const [params, setParams] = useSearchParams();
  const date = params.get("date") || todayISO();
  const setDate = (d: string) =>
    setParams(
      (p) => {
        p.set("date", d || todayISO());
        return p;
      },
      { replace: true },
    );

  // chart date range: defaults to the full history span, user can narrow it
  const [cf, setCf] = useState<string | null>(null);
  const [ct, setCt] = useState<string | null>(null);
  const chartFrom = cf ?? status?.history_from ?? "";
  const chartTo = ct ?? status?.history_to ?? todayISO();
  const ts = useDashboardTimeseries(
    favOnly,
    chartFrom || undefined,
    chartTo || undefined,
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 p-5 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Сводка</h1>
        <Toggle value={favOnly} onChange={setFavOnly} />
      </div>

      {m && (m.favorites_reserved > 0 || m.favorites_reserved_today > 0) && (
        <Link
          to="/aparts?favorites_only=1&reserved_only=1"
          className="flex items-start gap-3 rounded-lg border border-neg/40 bg-neg-soft px-4 py-3 text-sm"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-neg" />
          <span>
            <span className="font-medium text-neg">
              {m.favorites_reserved} избранн
              {plural(m.favorites_reserved, "ая", "ых", "ых")} квартир
              {plural(m.favorites_reserved, "а", "ы", "")} в резерве
            </span>
            {m.favorites_reserved_today > 0 && (
              <span className="text-muted-foreground">
                {" "}
                · сегодня ушло {m.favorites_reserved_today}
              </span>
            )}
            <span className="block text-muted-foreground">
              Открыть список →
            </span>
          </span>
        </Link>
      )}

      {isLoading || !m ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:flex-wrap sm:items-end">
            <Big
              label={favOnly ? "В избранном" : "Квартир под наблюдением"}
              value={m.aparts_total.toLocaleString("ru-RU")}
            />
            <Mid label="Домов" value={String(m.buildings_total)} />
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
            <Mid
              label="Сейчас со скидкой"
              value={m.discount_total.toLocaleString("ru-RU")}
            />
            <Mid
              label="Сейчас в резерве"
              value={m.reserved_total.toLocaleString("ru-RU")}
            />
          </div>

          <section>
            <SectionTitle help="События за сегодня. Нажмите на плитку — откроется отфильтрованный список.">
              Сегодня
            </SectionTitle>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Новых" value={m.new_today} to="/aparts" />
              <Metric label="Изменений" value={m.changed_today} to={`/?date=${todayISO()}`} />
              <Metric label="Подешевели" value={m.price_drops_today} tone="pos" to="/aparts?price_drop_only=1" />
              <Metric label="Подорожали" value={m.price_rises_today} tone="neg" to="/aparts" />
              <Metric label="Новых скидок" value={m.discounts_appeared_today} tone="pos" to="/aparts?discount_only=1" />
              <Metric label="Ушло в резерв" value={m.reserved_today} tone="reserve" to="/aparts?reserved_only=1" />
            </div>
          </section>

          <section id="changes">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle help="Квартиры, у которых в выбранную дату изменилась цена, скидка, статус резерва или доступность по семейной ипотеке. По умолчанию — сегодня.">
                Изменения за {shortDate(date)}
              </SectionTitle>
              <input
                type="date"
                value={date}
                min={status?.history_from ?? undefined}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className={dateInputCls}
              />
            </div>
            <DashboardChanges date={date} favOnly={favOnly} />
          </section>

          <section>
            <SectionTitle help="Выберите разрез, показатель и тип графика. «По датам» использует диапазон дат из блока «Состояние списка».">
              Свой график
            </SectionTitle>
            <PivotChart
              favOnly={favOnly}
              dateFrom={chartFrom || undefined}
              dateTo={chartTo || undefined}
            />
          </section>

          {metro.data && metro.data.length > 0 && (
            <section>
              <SectionTitle help="Топ станций метро: количество / со скидкой / в избранном / средняя цена м² в шаговой или транспортной доступности.">
                По метро
              </SectionTitle>
              <div className="rounded-xl bg-panel p-4">
                <MetroChart rows={metro.data} />
              </div>
            </section>
          )}

          <section>
            <SectionTitle help="Поток квартир: округ → комнатность → ценовой диапазон. Толщина связи — число квартир.">
              Округ → комнатность → цена
            </SectionTitle>
            <SankeyChart favOnly={favOnly} />
          </section>

          <section>
            <SectionTitle help="Каждая точка — квартира, разбросана по вертикали внутри своего округа. Округа отсортированы по медиане. Видно форму распределения цены — где сгущения.">
              Разброс цены по округам
            </SectionTitle>
            <Beeswarm favOnly={favOnly} />
          </section>

          {all.data && all.data.length > 0 && (
            <section>
              <SectionTitle help="Срез текущего списка квартир по ключевым признакам.">
                Состав предложения
              </SectionTitle>
              <DashboardBreakdowns rows={all.data} />
            </section>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle help={CHART_HELP}>Состояние списка по датам</SectionTitle>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={chartFrom}
                  min={status?.history_from ?? undefined}
                  max={chartTo}
                  onChange={(e) => setCf(e.target.value)}
                  className={dateInputCls}
                />
                <span className="text-xs text-muted-foreground">—</span>
                <input
                  type="date"
                  value={chartTo}
                  min={chartFrom || undefined}
                  max={todayISO()}
                  onChange={(e) => setCt(e.target.value)}
                  className={dateInputCls}
                />
              </div>
            </div>
            {ts.isLoading && <Skeleton className="h-72 w-full" />}
            {ts.data && ts.data.every((p) => p.total === 0) && (
              <p className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                Пока нет истории — она накапливается с каждым обновлением данных
                (каждые {status?.interval_minutes ?? 30} мин).
              </p>
            )}
            {ts.data && ts.data.some((p) => p.total > 0) && (
              <DashboardChart points={ts.data} />
            )}
          </section>

          <section>
            <SectionTitle help="Каждая точка — квартира: площадь по горизонтали, цена по вертикали. Цвет — округ или комнатность. Видно, где сосредоточены квартиры нужного типа и цены.">
              Квартиры: цена × площадь
            </SectionTitle>
            <ScatterExplorer favOnly={favOnly} />
          </section>

          {priceHistory.data && priceHistory.data.length > 0 && (
            <section>
              <SectionTitle help="Средняя цена за м² по округам по датам снимков данных. Наполняется по мере обновлений.">
                Цена за м² по округам
              </SectionTitle>
              <div className="rounded-xl bg-panel p-4">
                <PriceHistoryChart points={priceHistory.data} />
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Данные обновлены {relTime(status?.last_refresh)}.{" "}
        <Link to="/buildings" className="text-primary hover:underline">
          Статистика по домам →
        </Link>
      </p>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
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

function SectionTitle({
  children,
  help,
}: {
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
      {children}
      {help && (
        <span title={help} className="cursor-help text-muted-foreground">
          <Info size={13} />
        </span>
      )}
    </h2>
  );
}

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
    <Link to={to} className="bg-card px-4 py-3.5 transition-colors hover:bg-secondary/60">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("tnum mt-1 text-2xl font-medium", toneCls)}>{value}</div>
    </Link>
  );
}
