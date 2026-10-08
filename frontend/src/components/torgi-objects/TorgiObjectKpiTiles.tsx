import { Link } from "react-router-dom";
import { num } from "@/components/torgi-objects/parts";
import { money, moneyShort, pct } from "@/lib/format";
import type { TorgiObjectKpi } from "@/lib/types";
import { cn } from "@/lib/utils";

const dec = (v: number | null | undefined, suffix: string) =>
  v === null || v === undefined
    ? "—"
    : `${v.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}${suffix}`;

export function TorgiObjectKpiTiles({
  kpi,
  favorites,
}: {
  kpi: TorgiObjectKpi;
  favorites?: number;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:flex-wrap sm:items-end">
        <Big label="Лотов в базе" value={num(kpi.lots)} to="/torgi/objects" />
        <Mid
          label="Актуальных"
          value={num(kpi.live_lots)}
          tone={kpi.live_lots > 0 ? "pos" : undefined}
          to="/torgi/objects?live_only=1"
        />
        <Mid
          label="Отторговано"
          value={num(kpi.sold_lots)}
          to="/torgi/objects?sold_only=1"
        />
        <Mid
          label="Торги состоялись"
          value={kpi.sold_share == null ? "—" : `${Math.round(kpi.sold_share * 100)}%`}
        />
        <Mid
          label="Медианный Δ итог/начало"
          value={pct(kpi.median_final_delta_pct)}
          tone={
            (kpi.median_final_delta_pct ?? 0) > 0
              ? "neg"
              : (kpi.median_final_delta_pct ?? 0) < 0
                ? "pos"
                : undefined
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
        <Tile
          label="Начальная сумма проданных"
          value={
            kpi.sum_start_price_sold
              ? `${moneyShort(kpi.sum_start_price_sold)} ₽`
              : "—"
          }
          hint={
            kpi.sum_start_price
              ? `по всем лотам, включая несостоявшиеся и живые: ${moneyShort(kpi.sum_start_price)} ₽`
              : undefined
          }
        />
        <Tile
          label="Итоговая сумма"
          value={kpi.sum_final_price ? `${moneyShort(kpi.sum_final_price)} ₽` : "—"}
          hint={
            kpi.sum_start_price_sold && kpi.sum_final_price
              ? `${pct(((kpi.sum_final_price / kpi.sum_start_price_sold) - 1) * 100)} к начальной сумме тех же лотов`
              : undefined
          }
        />
        <Tile label="Типов объектов" value={num(kpi.object_types)} />
        <Tile
          label="Продано без борьбы"
          value={kpi.at_start_share == null ? "—" : `${Math.round(kpi.at_start_share * 100)}%`}
          hint="доля продаж по начальной цене: никто не перебил"
        />
        <Tile
          label="Квартиры: медиана ₽/м²"
          value={kpi.apartment_median_ppm ? money(kpi.apartment_median_ppm) : "—"}
          hint="по начальной цене всех лотов-квартир"
        />
        <Tile
          label="Заявка → торги"
          value={dec(kpi.avg_days_request_to_tender, " дн")}
        />
        <Tile label="Лотов с фото" value={dec(kpi.photos_coverage_pct, "%")} />
        <Tile
          label="Просмотров всего"
          value={kpi.sum_portal_views ? moneyShort(kpi.sum_portal_views) : "—"}
        />
        {/* среднее тянут вверх несколько очень популярных лотов, поэтому рядом
            показываем медиану — она про типичный лот */}
        <Tile
          label="Просмотров: медиана / среднее"
          value={
            kpi.median_portal_views != null
              ? `${num(Math.round(kpi.median_portal_views))} / ${num(
                  Math.round(kpi.avg_portal_views ?? 0),
                )}`
              : "—"
          }
        />
        <Tile
          label="Максимум просмотров"
          value={num(kpi.max_portal_views ?? 0)}
        />
        <Tile
          label="Изменилось за 24 ч"
          value={num(kpi.changed_24h)}
          tone={kpi.changed_24h > 0 ? "reserve" : undefined}
        />
        {favorites !== undefined && (
          <Tile
            label="В избранном"
            value={num(favorites)}
            tone={favorites > 0 ? "pos" : undefined}
            to="/torgi/objects?fav_only=1"
          />
        )}
      </div>
    </div>
  );
}

function Big({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to?: string;
}) {
  const inner = (
    <>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="tnum mt-1 text-4xl font-semibold tracking-tight">
        {value}
      </div>
    </>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function Mid({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  to?: string;
}) {
  const inner = (
    <>
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
    </>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function Tile({
  label,
  value,
  tone,
  to,
  hint,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "reserve";
  to?: string;
  hint?: string;
}) {
  const inner = (
    <>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tnum mt-1 text-xl font-medium",
          value === "—" && "text-muted-foreground",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
          tone === "reserve" && "text-reserve",
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 break-words text-xs text-muted-foreground">{hint}</div>
      )}
    </>
  );
  return to ? (
    <Link
      to={to}
      className="bg-card px-4 py-3.5 transition-colors hover:bg-secondary/60"
    >
      {inner}
    </Link>
  ) : (
    <div className="bg-card px-4 py-3.5">{inner}</div>
  );
}
