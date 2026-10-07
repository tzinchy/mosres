import { Link } from "react-router-dom";
import type { TorgiKpi } from "@/hooks/useTorgiDashboard";
import { money, moneyShort, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("ru-RU");

export function TorgiKpiTiles({ kpi }: { kpi: TorgiKpi }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:flex-wrap sm:items-end">
        <Big label="Лотов под наблюдением" value={num(kpi.lots)} />
        <Mid label="В приёме заявок" value={num(kpi.open_lots)} />
        <Mid label="Продано" value={num(kpi.sold_lots)} />
        <Mid
          label="Средняя начальная"
          value={kpi.avg_start_price ? `${money(kpi.avg_start_price)} ₽` : "—"}
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
          label="Сумма начальных"
          value={kpi.sum_start_price ? `${moneyShort(kpi.sum_start_price)} ₽` : "—"}
        />
        <Tile
          label="Сумма итоговых"
          value={kpi.sum_final_price ? `${moneyShort(kpi.sum_final_price)} ₽` : "—"}
        />
        <Tile label="С номером" value={num(kpi.with_plate)} />
        <Tile
          label="Интересных номеров"
          value={num(kpi.interesting_plates)}
          tone={kpi.interesting_plates > 0 ? "reserve" : undefined}
        />
        <Tile
          label="Под мои паттерны"
          value={num(kpi.watch_matches)}
          tone={kpi.watch_matches > 0 ? "pos" : undefined}
          to="/torgi/cars?watch_only=1"
        />
        <Tile
          label="Заявка → торги"
          value={
            kpi.avg_days_request_to_tender === null ||
            kpi.avg_days_request_to_tender === undefined
              ? "—"
              : `${kpi.avg_days_request_to_tender.toLocaleString("ru-RU", {
                  maximumFractionDigits: 1,
                })} дн`
          }
        />
        <Tile
          label="Лотов с фото"
          value={
            kpi.photos_coverage_pct === null ||
            kpi.photos_coverage_pct === undefined
              ? "—"
              : `${kpi.photos_coverage_pct.toLocaleString("ru-RU", {
                  maximumFractionDigits: 1,
                })}%`
          }
        />
        <Tile label="Изменилось за 24 ч" value={num(kpi.changed_24h)} />
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="tnum mt-1 text-4xl font-semibold tracking-tight">
        {value}
      </div>
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

function Tile({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "reserve";
  to?: string;
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
