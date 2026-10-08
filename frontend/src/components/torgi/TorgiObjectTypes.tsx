import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiObjectsStats } from "@/hooks/useTorgiObjects";
import { money, moneyShort } from "@/lib/format";

/**
 * Разбивка лотов недвижимости по типу объекта. Каждая плитка — ссылка в
 * таблицу с уже наложенным фильтром: из сводки сразу попадаешь в список.
 */
export function TorgiObjectTypes() {
  const { data, isLoading } = useTorgiObjectsStats();

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!data || data.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Лоты недвижимости ещё не загружены. Прогон запускается по расписанию
        либо вручную — <code>GET /torgi/objects/update_data</code>.
      </p>
    );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((s) => (
        <Link
          key={s.object_type_name}
          to={`/torgi/objects?object_type=${encodeURIComponent(s.object_type_name)}`}
          className="rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/60"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {s.object_type_name}
            </span>
            <span className="tnum text-lg font-medium">
              {s.lots.toLocaleString("ru-RU")}
            </span>
          </div>
          <dl className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            <div className="flex justify-between gap-2">
              <dt>актуальных</dt>
              <dd className={s.live_lots > 0 ? "tnum text-pos" : "tnum"}>
                {s.live_lots.toLocaleString("ru-RU")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>отторговано</dt>
              <dd className="tnum">{s.sold_lots.toLocaleString("ru-RU")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>средняя цена</dt>
              <dd className="tnum">
                {s.avg_start_price ? `${moneyShort(s.avg_start_price)} ₽` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>средняя ₽/м²</dt>
              <dd className="tnum">
                {s.avg_price_per_square ? money(s.avg_price_per_square) : "—"}
              </dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}
