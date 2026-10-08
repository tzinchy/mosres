import { ArrowDown, ArrowUp, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OddsChip, ViewsCell } from "@/components/torgi-objects/RowCharts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useToggleTorgiObjectFavorite,
  useTorgiObjects,
  useTorgiObjectsOdds,
  useTorgiObjectsStats,
  useTorgiObjectsViewsSeries,
  type TorgiObjectFilters,
} from "@/hooks/useTorgiObjects";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { money, moneyShort, pct, shortDate } from "@/lib/format";
import type { TorgiObjectOdds, TorgiObjectRow, TorgiObjectViewPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOGGLES: { key: keyof TorgiObjectFilters; label: string }[] = [
  { key: "live_only", label: "Актуальные" },
  { key: "sold_only", label: "Отторгованы" },
  { key: "price_drop_only", label: "Цена снижена" },
  { key: "fav_only", label: "Избранное" },
];

const ANY = "__any__";

export function TorgiObjectsPage() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<TorgiObjectFilters>(() => {
    const f: TorgiObjectFilters = {};
    for (const t of TOGGLES) if (params.get(t.key)) (f[t.key] as boolean) = true;
    const type = params.get("object_type");
    if (type) f.object_type = type;
    const rooms = params.get("rooms");
    if (rooms) f.rooms = Number(rooms);
    // зашли без фильтров в адресе — сразу показываем актуальные лоты
    if (params.toString() === "") f.live_only = true;
    return f;
  });
  const q = useDebouncedValue(filters.q, 300);
  const effective = useMemo(() => ({ ...filters, q }), [filters, q]);
  const { data, isLoading, error } = useTorgiObjects(effective);
  const stats = useTorgiObjectsStats();
  const odds = useTorgiObjectsOdds();
  const toggleFav = useToggleTorgiObjectFavorite();
  // сортировка по просмотрам — на клиенте: бэкенд отдаёт выдачу своим порядком
  const [viewsSort, setViewsSort] = useState<"desc" | "asc" | null>(null);

  const rows = useMemo(() => {
    if (!data || !viewsSort) return data;
    const sign = viewsSort === "desc" ? -1 : 1;
    return [...data].sort(
      (a, b) => sign * ((a.portal_views ?? -1) - (b.portal_views ?? -1)),
    );
  }, [data, viewsSort]);

  const viewsSeries = useTorgiObjectsViewsSeries(
    useMemo(() => (rows ?? []).slice(0, 200).map((r) => r.lot_id), [rows]),
  );
  const maxViews = useMemo(
    () => Math.max(1, ...(rows ?? []).map((r) => r.portal_views ?? 0)),
    [rows],
  );

  const set = <K extends keyof TorgiObjectFilters>(
    key: K,
    value: TorgiObjectFilters[K],
  ) => setFilters((f) => ({ ...f, [key]: value }));

  const total = stats.data?.reduce((sum, s) => sum + s.lots, 0) ?? 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-medium">Недвижимость на торгах</h1>
        <p className="text-sm text-muted-foreground">
          Лоты torgi.mos.ru: квартиры, комнаты, машино-места, нежилые помещения,
          здания и земельные участки.{" "}
          {total > 0 && <>Всего в базе {total.toLocaleString("ru-RU")} лотов.</>}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.object_type || ANY}
          items={{
            [ANY]: "Все типы",
            ...Object.fromEntries(
              (stats.data ?? []).map((s) => [
                s.object_type_name,
                `${s.object_type_name} · ${s.lots.toLocaleString("ru-RU")}`,
              ]),
            ),
          }}
          onValueChange={(v) => set("object_type", !v || v === ANY ? undefined : v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Тип объекта" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Все типы</SelectItem>
            {(stats.data ?? []).map((s) => (
              <SelectItem key={s.object_type_name} value={s.object_type_name}>
                {s.object_type_name} · {s.lots.toLocaleString("ru-RU")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={filters.q ?? ""}
          onChange={(e) => set("q", e.target.value || undefined)}
          placeholder="Адрес, название, кадастровый номер, id лота"
          className="w-full sm:w-80"
        />

        {TOGGLES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => set(t.key, (!filters[t.key] || undefined) as never)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              filters[t.key]
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-neg">{(error as Error).message}</p>}
      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {data && (
        <>
          <p className="text-xs text-muted-foreground">
            Показано {data.length.toLocaleString("ru-RU")} лотов
            {data.length >= (filters.limit ?? 500) && " (предел выдачи)"}
          </p>
          {/* широкая таблица скроллится внутри себя, страница — нет */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-2 py-2" />
                  <th className="px-3 py-2 text-left font-medium">Объект</th>
                  <th className="px-3 py-2 text-left font-medium">Адрес</th>
                  <th className="px-3 py-2 text-right font-medium">Площадь</th>
                  <th className="px-3 py-2 text-right font-medium">Комнат</th>
                  <th className="px-3 py-2 text-right font-medium">Этаж</th>
                  <th className="px-3 py-2 text-right font-medium">Цена</th>
                  <th className="px-3 py-2 text-right font-medium">₽/м²</th>
                  <th className="px-3 py-2 text-right font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        setViewsSort((s) =>
                          s === "desc" ? "asc" : s === "asc" ? null : "desc",
                        )
                      }
                      className="ml-auto flex items-center gap-1 hover:text-foreground"
                      title="Сортировать по числу просмотров карточки на портале"
                    >
                      Просмотров
                      {viewsSort === "desc" && <ArrowDown size={12} />}
                      {viewsSort === "asc" && <ArrowUp size={12} />}
                    </button>
                  </th>
                  <th
                    className="px-3 py-2 text-right font-medium"
                    title="Шанс, что торги состоятся, и что итог будет выше начальной цены. По скорости просмотров, только для живых лотов."
                  >
                    Шанс
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Срок заявок</th>
                  <th className="px-3 py-2 text-left font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(rows ?? []).map((row) => (
                  <Row
                    key={row.lot_id}
                    row={row}
                    maxViews={maxViews}
                    series={viewsSeries.data?.[row.lot_id]}
                    odds={odds.data?.get(row.lot_id)}
                    onToggleFavorite={(id, next) => toggleFav.mutate({ id, next })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  row,
  maxViews,
  series,
  odds,
  onToggleFavorite,
}: {
  row: TorgiObjectRow;
  maxViews: number;
  series?: TorgiObjectViewPoint[];
  odds?: TorgiObjectOdds;
  onToggleFavorite: (id: number, next: boolean) => void;
}) {
  return (
    <tr className="hover:bg-secondary/40">
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={() => onToggleFavorite(row.lot_id, !row.is_favorite)}
          aria-label={row.is_favorite ? "Убрать из избранного" : "В избранное"}
          className="grid place-items-center rounded p-1 hover:bg-secondary"
        >
          <Star
            size={15}
            className={
              row.is_favorite
                ? "fill-primary stroke-primary"
                : "stroke-muted-foreground"
            }
          />
        </button>
      </td>
      <td className="max-w-[260px] px-3 py-2">
        <Link
          to={`/torgi/objects/${row.lot_id}`}
          className="block truncate font-medium text-primary hover:underline"
          title={row.name ?? undefined}
        >
          {row.name ?? `Лот ${row.lot_id}`}
        </Link>
        <div className="text-xs text-muted-foreground">
          {row.object_type_name}
          {row.metro[0]?.name ? ` · м. ${row.metro[0].name}` : ""}
        </div>
      </td>
      <td className="max-w-[260px] truncate px-3 py-2" title={row.address ?? undefined}>
        {row.short_address ?? row.address ?? "—"}
      </td>
      <td className="tnum px-3 py-2 text-right">
        {row.object_area ? `${row.object_area} м²` : "—"}
      </td>
      <td className="tnum px-3 py-2 text-right">{row.rooms_count ?? "—"}</td>
      <td className="tnum px-3 py-2 text-right">
        {row.room_floor ? `${row.room_floor}${row.floors ? `/${row.floors}` : ""}` : "—"}
      </td>
      <td className="tnum px-3 py-2 text-right">
        {row.start_price ? money(row.start_price) : "—"}
        {row.start_price_delta_pct != null && (
          <div
            className={cn(
              "text-xs",
              row.start_price_delta_pct < 0 ? "text-pos" : "text-neg",
            )}
          >
            {pct(row.start_price_delta_pct)}
          </div>
        )}
        {row.final_price != null && (
          <div className="text-xs text-muted-foreground">
            итог {moneyShort(row.final_price)} ₽
          </div>
        )}
      </td>
      <td className="tnum px-3 py-2 text-right">
        {row.price_per_square ? moneyShort(row.price_per_square) : "—"}
      </td>
      <td className="px-3 py-2">
        <ViewsCell views={row.portal_views} max={maxViews} series={series} />
      </td>
      <td className="px-3 py-2">
        <OddsChip odds={odds} />
      </td>
      <td className="px-3 py-2">
        {row.request_end_date ? (
          <>
            {shortDate(row.request_end_date)}
            {row.days_left != null && row.days_left >= 0 && (
              <div className="text-xs text-muted-foreground">
                осталось {row.days_left} дн.
              </div>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            row.is_live
              ? "bg-pos/10 text-pos"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {row.is_live ? "идут торги" : (row.status_text ?? "архив")}
        </span>
      </td>
    </tr>
  );
}
