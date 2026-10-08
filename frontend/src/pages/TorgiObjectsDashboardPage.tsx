import { useState } from "react";
import { Link } from "react-router-dom";
import { Section } from "@/components/dash/Section";
import { TorgiObjectTypes } from "@/components/torgi/TorgiObjectTypes";
import { TorgiObjectChanges } from "@/components/torgi-objects/TorgiObjectChanges";
import { TorgiObjectDataQuality } from "@/components/torgi-objects/TorgiObjectDataQuality";
import { TorgiObjectDeadlines } from "@/components/torgi-objects/TorgiObjectDeadlines";
import { TorgiObjectFunnel } from "@/components/torgi-objects/TorgiObjectFunnel";
import { TorgiObjectInvest } from "@/components/torgi-objects/TorgiObjectInvest";
import { TorgiObjectHistograms } from "@/components/torgi-objects/TorgiObjectHistograms";
import { TorgiObjectKpiTiles } from "@/components/torgi-objects/TorgiObjectKpiTiles";
import { TorgiObjectMap } from "@/components/torgi-objects/TorgiObjectMap";
import { TorgiObjectScatter } from "@/components/torgi-objects/TorgiObjectScatter";
import { TorgiObjectSeasonality } from "@/components/torgi-objects/TorgiObjectSeasonality";
import { TorgiObjectTimeseries } from "@/components/torgi-objects/TorgiObjectTimeseries";
import { TorgiObjectTopLots } from "@/components/torgi-objects/TorgiObjectTopLots";
import { TorgiObjectVersionActivity } from "@/components/torgi-objects/TorgiObjectVersionActivity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTorgiObjectsBreakdown,
  useTorgiObjectsDashboard,
  useTorgiObjectsStats,
  type ObjectDimension,
} from "@/hooks/useTorgiObjects";
import { money, moneyShort, relTime } from "@/lib/format";

const DIMS: { key: ObjectDimension; label: string }[] = [
  { key: "region", label: "Округ" },
  { key: "district", label: "Район" },
  { key: "object_type", label: "Тип объекта" },
  { key: "house_type", label: "Тип дома" },
  { key: "rooms", label: "Комнат" },
];

const ANY = "__any__";

export function TorgiObjectsDashboardPage() {
  const stats = useTorgiObjectsStats();
  const { data: d, isLoading, isError } = useTorgiObjectsDashboard();
  const [dimension, setDimension] = useState<ObjectDimension>("region");
  const [objectType, setObjectType] = useState<string | undefined>();

  // избранного нет в composite-ответе — берём из той же сводки по типам
  const favorites = stats.data?.reduce((sum, s) => sum + s.favorites, 0);

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 p-5 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Сводка по недвижимости</h1>
        <Link
          to="/torgi/objects"
          className="text-xs text-primary hover:underline"
        >
          таблица лотов →
        </Link>
      </div>

      {isError && (
        <p className="rounded-lg border border-neg/40 bg-neg-soft px-4 py-3 text-sm">
          Не удалось загрузить сводку по недвижимости.
        </p>
      )}

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {d && <TorgiObjectKpiTiles kpi={d.kpi} favorites={favorites} />}

      <Section
        title="Где окупаются торги"
        help="Аналитика по завершённым продажам: в каких сегментах торги чаще всего заканчиваются сделкой, где покупают без борьбы и какие живые лоты стоят дешевле того, за что уходили похожие."
      >
        <TorgiObjectInvest />
      </Section>

      <Section
        title="Типы объектов"
        help="Разбивка по типу объекта: сколько лотов, сколько актуальных (приём заявок идёт либо торги впереди), средние цены. Плитка ведёт в таблицу с этим фильтром."
      >
        <TorgiObjectTypes />
      </Section>

      {d && (
        <>
          <Section
            title="Воронка статусов"
            help="Ступени от приёма заявок до продажи. Длина полосы — доля от самой массовой ступени."
          >
            <TorgiObjectFunnel rows={d.funnel} />
          </Section>

          <Section
            title="Динамика по месяцам торгов"
            help="По дате торгов: столбцы — число лотов, линия — средняя цена за м², пунктир — средний Δ итог/начало."
          >
            <TorgiObjectTimeseries rows={d.timeseries} />
          </Section>

          <Section
            title="Сезонность"
            help="Сколько лотов недвижимости выходит на торги в каждый месяц года — агрегат по всем годам."
          >
            <TorgiObjectSeasonality rows={d.seasonality} />
          </Section>

          <Section
            title="Ближайшие дедлайны заявок"
            help="Лоты, у которых скорее всего закрывается приём заявок. Красный — 3 дня и меньше, янтарный — неделя. Клик по столбцу или строке открывает лот."
          >
            <TorgiObjectDeadlines rows={d.deadlines} />
          </Section>

          <Section
            title="Лента изменений"
            help="Последние правки из истории лотов: цена, статус, появление итоговой цены. Группы раскрываются, строка ведёт в лот."
          >
            <TorgiObjectChanges rows={d.changes} />
          </Section>

          <Section
            title="Распределения"
            help="Гистограммы: площадь объекта, цена за м², наценка итоговой цены над начальной."
          >
            <TorgiObjectHistograms
              area={d.area_hist}
              pricePerSquare={d.price_per_square_hist}
              premium={d.premium_hist}
              viewsBins={d.views_hist}
            />
          </Section>

          <Section
            title="Топ-листы"
            help="Где сильнее всего упала начальная цена, где торги дали максимальную наценку и какие лоты чаще всего смотрят на портале."
          >
            <TorgiObjectTopLots
              drop={d.top_drop}
              premium={d.top_premium}
              viewsTop={d.top_views}
            />
          </Section>
        </>
      )}

      <Section
        title="Разрезы"
        help="Топ-20 значений выбранного измерения. Фильтр по типу объекта применяется к разрезу: например, цена за м² квартир по округам."
        right={
          <div className="flex gap-2">
            <Select
              value={dimension}
              items={Object.fromEntries(DIMS.map((d) => [d.key, d.label]))}
              onValueChange={(v) => setDimension(v as ObjectDimension)}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMS.map((dim) => (
                  <SelectItem key={dim.key} value={dim.key}>
                    {dim.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={objectType || ANY}
              items={{
                [ANY]: "Все типы",
                ...Object.fromEntries(
                  (stats.data ?? []).map((s) => [s.object_type_name, s.object_type_name]),
                ),
              }}
              onValueChange={(v) => setObjectType(!v || v === ANY ? undefined : v)}
            >
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Все типы</SelectItem>
                {(stats.data ?? []).map((s) => (
                  <SelectItem key={s.object_type_name} value={s.object_type_name}>
                    {s.object_type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <Breakdown dimension={dimension} objectType={objectType} />
      </Section>

      {d && (
        <>
          <Section
            title="Лоты: точки по двум осям"
            help="Каждая точка — лот недвижимости. Оси и раскраска выбираются: площадь, цена, цена за м², комнаты, просмотры."
          >
            <TorgiObjectScatter />
          </Section>

          <Section
            title="Карта лотов"
            help="Лоты с координатами. Зелёные — актуальные. В попапе цена, площадь, просмотры и ссылка на карточку."
          >
            <TorgiObjectMap />
          </Section>

          <Section
            title="Качество данных"
            help="Доля лотов, у которых заполнено поле. Отдельно — доля прочитанных карточек портала: пока карточка не прочитана, часть полей пустая."
          >
            <TorgiObjectDataQuality quality={d.data_quality} />
          </Section>

          <Section
            title="Активность версий"
            help="Сколько версий накопил лот и сколько правок приходило каждый день за последние 90 дней."
          >
            <TorgiObjectVersionActivity activity={d.version_activity} />
          </Section>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Данные недвижимости обновлены {relTime(d?.last_refresh)}.{" "}
        <Link to="/torgi/objects" className="text-primary hover:underline">
          Таблица лотов →
        </Link>{" "}
        <Link to="/" className="text-primary hover:underline">
          Сводка торгов по транспорту →
        </Link>
      </p>
    </div>
  );
}

function Breakdown({
  dimension,
  objectType,
}: {
  dimension: ObjectDimension;
  objectType?: string;
}) {
  const { data, isLoading } = useTorgiObjectsBreakdown(dimension, objectType);
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data || data.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Нет данных по этому разрезу.
      </p>
    );

  const max = Math.max(...data.map((r) => r.lots));

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-secondary/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Значение</th>
            <th className="px-3 py-2 text-right font-medium">Лотов</th>
            <th className="px-3 py-2 text-right font-medium">Актуальных</th>
            <th className="px-3 py-2 text-right font-medium">Средняя цена</th>
            <th className="px-3 py-2 text-right font-medium">₽/м²</th>
            <th className="px-3 py-2 text-right font-medium">Площадь</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((r) => (
            <tr key={r.label} className="hover:bg-secondary/40">
              <td className="px-3 py-2">
                {/* полоса длиной по числу лотов — сравнение без отдельного графика */}
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate">{r.label}</span>
                  <span
                    aria-hidden
                    className="h-1.5 shrink-0 rounded-full bg-primary/30"
                    style={{ width: `${Math.round((r.lots / max) * 80)}px` }}
                  />
                </div>
              </td>
              <td className="tnum px-3 py-2 text-right">
                {r.lots.toLocaleString("ru-RU")}
              </td>
              <td className="tnum px-3 py-2 text-right">
                {r.live_lots > 0 ? (
                  <span className="text-pos">
                    {r.live_lots.toLocaleString("ru-RU")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="tnum px-3 py-2 text-right">
                {r.avg_start_price ? `${moneyShort(r.avg_start_price)} ₽` : "—"}
              </td>
              <td className="tnum px-3 py-2 text-right">
                {r.avg_price_per_square ? money(r.avg_price_per_square) : "—"}
              </td>
              <td className="tnum px-3 py-2 text-right">
                {r.avg_area ? `${r.avg_area} м²` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
