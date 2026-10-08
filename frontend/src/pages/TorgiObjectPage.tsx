import { ArrowLeft, ExternalLink, Star } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gallery } from "@/components/Gallery";
import { OddsPanel } from "@/components/torgi-objects/RowCharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useToggleTorgiObjectFavorite,
  useTorgiObject,
  useTorgiObjectsOdds,
  useTorgiObjectVersions,
  useTorgiObjectViews,
} from "@/hooks/useTorgiObjects";
import { money, moneyShort, pct, relTime, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TorgiObjectPage() {
  const { lotId } = useParams();
  const id = Number(lotId);
  const { data: lot, isLoading } = useTorgiObject(id);
  const { data: versions } = useTorgiObjectVersions(id);
  const toggleFav = useToggleTorgiObjectFavorite();

  if (isLoading) return <Skeleton className="m-6 h-96 rounded-xl" />;
  if (!lot)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Лот не найден.{" "}
        <Link to="/torgi/objects" className="text-primary hover:underline">
          К списку
        </Link>
      </p>
    );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <Link
        to="/torgi/objects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Недвижимость на торгах
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-medium">{lot.name ?? `Лот ${lot.lot_id}`}</h1>
          <p className="text-sm text-muted-foreground">
            {lot.object_type_name} · {lot.address ?? "адрес не указан"}
          </p>
          {lot.metro.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {lot.metro
                .map(
                  (m) =>
                    `м. ${m.name}${m.walk ? ` — ${m.walk} мин пешком` : ""}`,
                )
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFav.mutate({ id: lot.lot_id, next: !lot.is_favorite })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            <Star
              size={15}
              className={
                lot.is_favorite
                  ? "fill-primary stroke-primary"
                  : "stroke-muted-foreground"
              }
            />
            {lot.is_favorite ? "В избранном" : "В избранное"}
          </button>
          {lot.url && (
            <a
              href={lot.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
            >
              На портале <ExternalLink size={14} />
            </a>
          )}
        </div>
      </header>

      <Gallery photos={lot.photos} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Начальная цена" value={lot.start_price ? `${money(lot.start_price)} ₽` : "—"}>
          {lot.start_price_delta_pct != null && (
            <span className={lot.start_price_delta_pct < 0 ? "text-pos" : "text-neg"}>
              {pct(lot.start_price_delta_pct)} к прошлой версии
            </span>
          )}
        </Tile>
        <Tile
          label="Итоговая цена"
          value={lot.final_price ? `${money(lot.final_price)} ₽` : "—"}
        >
          {lot.final_price_delta_pct != null && (
            <span className={lot.final_price_delta_pct > 0 ? "text-neg" : "text-pos"}>
              {pct(lot.final_price_delta_pct)} к начальной
            </span>
          )}
        </Tile>
        <Tile
          label="Цена за м²"
          value={lot.price_per_square ? `${moneyShort(lot.price_per_square)} ₽` : "—"}
        />
        <Tile label="Задаток" value={lot.deposit ? `${money(lot.deposit)} ₽` : "—"}>
          {lot.auction_step != null && <>шаг {moneyShort(lot.auction_step)} ₽</>}
        </Tile>
      </div>

      <section>
        <div className="space-y-4">
          <Block title="Характеристики">
            <Facts
              rows={[
                ["Тип объекта", lot.object_type_name],
                ["Площадь", lot.object_area ? `${lot.object_area} м²` : null],
                ["Жилая площадь", lot.living_area ? `${lot.living_area} м²` : null],
                ["Площадь кухни", lot.kitchen_area ? `${lot.kitchen_area} м²` : null],
                ["Комнат", lot.rooms_count?.toString() ?? null],
                [
                  "Этаж",
                  lot.room_floor
                    ? `${lot.room_floor}${lot.floors ? ` из ${lot.floors}` : ""}`
                    : null,
                ],
                ["Год постройки", lot.build_year?.toString() ?? null],
                ["Тип дома", lot.house_type],
                ["Назначение", lot.purpose],
                ["Кадастровый номер", lot.cadastral_number],
                ["Округ", lot.region_name],
                ["Район", lot.district_name],
              ]}
            />
          </Block>

          {/* Карточка портала у каждого типа объекта своя — показываем как пришло */}
          {lot.details && Object.keys(lot.details).length > 0 && (
            <Block title="Из карточки портала">
              <Facts rows={Object.entries(lot.details)} />
            </Block>
          )}

          <Block title="Процедура">
            <Facts
              rows={[
                ["Статус", lot.status_text],
                [
                  "Приём заявок",
                  lot.request_start_date || lot.request_end_date
                    ? `${lot.request_start_date ? shortDate(lot.request_start_date) : "—"} — ${
                        lot.request_end_date ? shortDate(lot.request_end_date) : "—"
                      }`
                    : null,
                ],
                ["Торги", lot.tender_date ? shortDate(lot.tender_date) : null],
                ["Итоги", lot.final_date ? shortDate(lot.final_date) : null],
                ["Просмотров на портале", lot.portal_views?.toString() ?? null],
                ["Обновлено", lot.updated_at ? relTime(lot.updated_at) : null],
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {lot.platform_link && (
                <a
                  href={lot.platform_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Электронная площадка
                </a>
              )}
              {lot.torgi_gov_link && (
                <a
                  href={lot.torgi_gov_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  torgi.gov.ru
                </a>
              )}
            </div>
          </Block>

          <OddsBlock lotId={id} />

          <ViewsByDay lotId={id} />

          {versions && versions.length > 1 && (
            <Block title={`История изменений · ${versions.length} версий`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Версия</th>
                      <th className="px-2 py-1.5 text-left font-medium">Когда</th>
                      <th className="px-2 py-1.5 text-right font-medium">Цена</th>
                      <th className="px-2 py-1.5 text-left font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {versions.map((v) => (
                      <tr key={v.version}>
                        <td className="tnum px-2 py-1.5">{v.version}</td>
                        <td className="px-2 py-1.5">
                          {v.updated_at ? shortDate(v.updated_at) : "—"}
                        </td>
                        <td className="tnum px-2 py-1.5 text-right">
                          {v.start_price ? money(v.start_price) : "—"}
                          {v.start_price_prev != null &&
                            v.start_price != null &&
                            v.start_price !== v.start_price_prev && (
                              <span
                                className={cn(
                                  "ml-1.5 text-xs",
                                  v.start_price < v.start_price_prev
                                    ? "text-pos"
                                    : "text-neg",
                                )}
                              >
                                было {moneyShort(v.start_price_prev)}
                              </span>
                            )}
                        </td>
                        <td className="px-2 py-1.5">{v.status_text ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Block>
          )}
        </div>

      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tnum mt-1 text-lg font-medium">{value}</div>
      {children && <div className="mt-0.5 text-xs">{children}</div>}
    </div>
  );
}

function OddsBlock({ lotId }: { lotId: number }) {
  const { data } = useTorgiObjectsOdds();
  return <OddsPanel odds={data?.get(lotId)} />;
}

/** Просмотры карточки на портале по дням. Ряд копится с момента запуска
 *  истории просмотров, поэтому у свежих лотов точек пока мало. */
function ViewsByDay({ lotId }: { lotId: number }) {
  const { data } = useTorgiObjectViews(lotId);
  if (!data || data.length === 0) return null;

  const day = (iso: string) => shortDate(`${iso}T00:00:00`);
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <Block title="Просмотры по дням">
      {data.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Ряд копится с {day(first.day)}: пока одна точка — {first.views} просм.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            +{last.views - first.views} просм. с {day(first.day)} (сейчас{" "}
            {last.views})
          </p>
          <div className="h-44 w-full">
            <ResponsiveContainer>
              <LineChart
                data={data.map((p) => ({ date: day(p.day), views: p.views }))}
                margin={{ left: 6, right: 10, top: 4, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  minTickGap={24}
                />
                <YAxis
                  width={44}
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(x) => [Number(x).toLocaleString("ru-RU"), "просмотров"]}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#4f7686"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Block>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {children}
    </div>
  );
}

function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const filled = rows.filter(([, v]) => v != null && v !== "");
  if (filled.length === 0)
    return <p className="text-sm text-muted-foreground">Портал не передал данных.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {filled.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
