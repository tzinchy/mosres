import { useState } from "react";
import { Link } from "react-router-dom";
import { Section } from "@/components/dash/Section";
import { TorgiObjectTypes } from "@/components/torgi/TorgiObjectTypes";
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
  useTorgiObjectsStats,
  type ObjectDimension,
} from "@/hooks/useTorgiObjects";
import { money, moneyShort } from "@/lib/format";

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
  const [dimension, setDimension] = useState<ObjectDimension>("region");
  const [objectType, setObjectType] = useState<string | undefined>();

  const totals = (stats.data ?? []).reduce(
    (acc, s) => ({
      lots: acc.lots + s.lots,
      live: acc.live + s.live_lots,
      sold: acc.sold + s.sold_lots,
      favorites: acc.favorites + s.favorites,
    }),
    { lots: 0, live: 0, sold: 0, favorites: 0 },
  );

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

      {stats.isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Лотов в базе" value={totals.lots} to="/torgi/objects" />
          <Kpi
            label="Актуальных лотов"
            value={totals.live}
            tone="pos"
            to="/torgi/objects?live_only=1"
          />
          <Kpi
            label="Отторговано"
            value={totals.sold}
            to="/torgi/objects?sold_only=1"
          />
          <Kpi
            label="В избранном"
            value={totals.favorites}
            to="/torgi/objects?fav_only=1"
          />
        </div>
      )}

      <Section
        title="Типы объектов"
        help="Разбивка по типу объекта: сколько лотов, сколько актуальных (приём заявок идёт либо торги впереди), средние цены. Плитка ведёт в таблицу с этим фильтром."
      >
        <TorgiObjectTypes />
      </Section>

      <Section
        title="Разрезы"
        help="Топ-20 значений выбранного измерения. Фильтр по типу объекта применяется к разрезу: например, цена за м² квартир по округам."
        right={
          <div className="flex gap-2">
            <Select
              value={dimension}
              onValueChange={(v) => setDimension(v as ObjectDimension)}
            >
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={objectType || ANY}
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
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: number;
  tone?: "pos";
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/60"
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          tone === "pos" && value > 0
            ? "tnum mt-1 text-2xl font-medium text-pos"
            : "tnum mt-1 text-2xl font-medium"
        }
      >
        {value.toLocaleString("ru-RU")}
      </div>
    </Link>
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
