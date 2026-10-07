import { ArrowLeft, ExternalLink, MapPin, Star, Video } from "lucide-react";
import { useState } from "react";
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
import { PriceDelta } from "@/components/cells";
import { RemoteImg } from "@/components/RemoteImg";
import {
  Dim,
  FinalDeltaBadge,
  PlateCell,
  TorgiDeadlineBadge,
  TorgiStatusCell,
} from "@/components/torgiCells";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTorgiLot, useTorgiLotVersions } from "@/hooks/useTorgi";
import { useToggleTorgiFavorite } from "@/hooks/useTorgiFavorites";
import { money, moneyShort, relTime, shortDate } from "@/lib/format";
import type { TorgiLotRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const dt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

function Block({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card px-4 py-3", className)}
    >
      <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

function Gallery({ photos }: { photos: string[] }) {
  const [i, setI] = useState(0);
  if (photos.length === 0) return null;
  return (
    <div className="space-y-2">
      <a href={photos[i]} target="_blank" rel="noreferrer" className="block">
        <RemoteImg
          src={photos[i]}
          alt={`Фото ${i + 1}`}
          className="block h-80 w-full rounded-xl border border-border bg-secondary object-contain"
        />
      </a>
      {photos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {photos.map((p, idx) => (
            <button key={p + idx} type="button" onClick={() => setI(idx)}>
              <RemoteImg
                src={p}
                className={cn(
                  "block size-14 rounded border object-cover",
                  idx === i ? "border-primary" : "border-border",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceByVersion({ lotId }: { lotId: number }) {
  const { data, isLoading } = useTorgiLotVersions(lotId);
  if (isLoading) return <Skeleton className="h-56 w-full rounded-xl" />;
  if (!data || data.length === 0) return null;

  const series = data.map((v) => ({
    v: v.version,
    date: shortDate(v.updated_at),
    price: v.start_price,
  }));

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Начальная цена по версиям
      </h2>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={series} margin={{ left: 6, right: 10, top: 4, bottom: 4 }}>
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
              width={58}
              tickFormatter={(x) => moneyShort(x)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(x) => [`${money(Number(x))} ₽`, "начальная цена"]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#4f7686"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Версия</th>
              <th className="py-1.5 pr-3 font-medium">Когда</th>
              <th className="py-1.5 pr-3 font-medium">Статус</th>
              <th className="py-1.5 pr-3 text-right font-medium">Начальная, ₽</th>
              <th className="py-1.5 pr-3 text-right font-medium">Итоговая, ₽</th>
              <th className="py-1.5 font-medium">Номер</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((v) => (
              <tr key={v.version} className="border-b border-border/60 last:border-0">
                <td className="tnum py-1.5 pr-3">{v.version}</td>
                <td className="tnum py-1.5 pr-3 text-xs text-muted-foreground">
                  {dt(v.updated_at)}
                </td>
                <td className="py-1.5 pr-3">{v.status_text ?? "—"}</td>
                <td className="tnum py-1.5 pr-3 text-right">{money(v.start_price)}</td>
                <td className="tnum py-1.5 pr-3 text-right">
                  {v.final_price === null ? "—" : money(v.final_price)}
                </td>
                <td className="py-1.5 font-mono text-xs">
                  {v.plate_norm ?? v.plate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LotLinks({ lot }: { lot: TorgiLotRow }) {
  const links = [
    { href: lot.torgi_url, label: "Лот на torgi.mos.ru" },
    { href: lot.platform_link, label: "Электронная площадка (ЭТП)" },
    { href: lot.torgi_gov_link, label: "Карточка на torgi.gov.ru" },
    { href: lot.video_link, label: "Видео осмотра", icon: true },
  ].filter((l) => !!l.href);
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-3">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Ссылки
      </h2>
      <div className="flex flex-col gap-1.5">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href as string}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            {l.icon ? <Video size={13} /> : <ExternalLink size={13} />}
            {l.label}
          </a>
        ))}
        {lot.latitude && lot.longitude && (
          <a
            href={`https://yandex.ru/maps/?pt=${lot.longitude},${lot.latitude}&z=16&l=map`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <MapPin size={13} />
            Место осмотра: {lot.latitude}, {lot.longitude}
          </a>
        )}
      </div>
    </section>
  );
}

export function TorgiLotPage() {
  const { lotId } = useParams();
  const id = Number(lotId);
  const { data: lot, isLoading, isError } = useTorgiLot(id);
  const toggle = useToggleTorgiFavorite();

  if (isLoading)
    return (
      <div className="p-5 md:p-8">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  if (isError || !lot)
    return (
      <div className="p-5 text-sm text-muted-foreground md:p-8">Лот не найден.</div>
    );

  const deltaAbs =
    lot.start_price !== null && lot.start_price_prev !== null
      ? lot.start_price - lot.start_price_prev
      : null;

  return (
    <div className="space-y-4 p-5 md:p-8">
      <Link
        to="/torgi/cars"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> ко всем машинам
      </Link>

      <header className="space-y-2 rounded-xl border border-border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => toggle.mutate({ id: lot.lot_id, next: !lot.is_favorite })}
            className="mt-0.5 grid place-items-center rounded p-1 hover:bg-secondary"
            aria-label={lot.is_favorite ? "Убрать из избранного" : "В избранное"}
          >
            <Star
              size={18}
              className={
                lot.is_favorite ? "fill-primary stroke-primary" : "stroke-muted-foreground"
              }
            />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-medium leading-tight">
              {lot.name ?? `Лот ${lot.lot_id}`}
            </h1>
            <div className="tnum mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>№ {lot.lot_id}</span>
              {lot.transport_category && <span>· {lot.transport_category}</span>}
              <span>· версия {lot.version}</span>
              <span>· обновлён {relTime(lot.updated_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TorgiStatusCell row={lot} />
          <TorgiDeadlineBadge days={lot.days_left} />
          {lot.matched_masks.length > 0 && (
            <Badge className="border-transparent bg-primary/15 text-primary">
              под мои паттерны
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Gallery photos={lot.photos} />

          <Block title="Цены">
            <Row label="Начальная цена">
              <span className="tnum font-semibold">{money(lot.start_price)} ₽</span>
            </Row>
            <Row label="Δ к прошлой версии">
              <PriceDelta abs={deltaAbs} pctVal={lot.start_price_delta_pct} />
            </Row>
            <Row label="Итоговая цена">
              {lot.final_price === null ? (
                <Dim value={null} />
              ) : (
                <span className="tnum font-medium">{money(lot.final_price)} ₽</span>
              )}
            </Row>
            <Row label="Δ итог / начало">
              <FinalDeltaBadge row={lot} />
            </Row>
            <Row label="Задаток">
              {lot.deposit === null ? (
                <Dim value={null} />
              ) : (
                <span className="tnum">{money(lot.deposit)} ₽</span>
              )}
            </Row>
            <Row label="Шаг аукциона">
              {lot.auction_step === null ? (
                <Dim value={null} />
              ) : (
                <span className="tnum">{money(lot.auction_step)} ₽</span>
              )}
            </Row>
          </Block>

          <Block title="Госномер">
            <Row label="Как на портале">
              <Dim value={lot.plate} mono />
            </Row>
            <Row label="Нормализованный">
              <PlateCell row={lot} long />
            </Row>
            <Row label="Регион">
              <Dim value={lot.plate_region} mono />
            </Row>
            <Row label="Разобран">
              {lot.plate_norm === null ? (
                <Dim value={null} />
              ) : lot.plate_valid ? (
                <Badge className="border-transparent bg-pos-soft text-pos">да</Badge>
              ) : (
                <Badge className="border-transparent bg-secondary text-muted-foreground">
                  нет
                </Badge>
              )}
            </Row>
            <Row label="Сработали паттерны">
              {lot.matched_masks.length === 0 ? (
                <Dim value={null} />
              ) : (
                <span className="flex flex-wrap justify-end gap-1">
                  {lot.matched_masks.map((m) => (
                    <Badge
                      key={m}
                      className="border-transparent bg-primary/15 font-mono text-primary"
                    >
                      {m}
                    </Badge>
                  ))}
                </span>
              )}
            </Row>
          </Block>
        </div>

        <div className="space-y-4">
          <Block title="Характеристики">
            <Row label="Марка и модель">
              <Dim value={[lot.brand, lot.model].filter(Boolean).join(" ") || null} />
            </Row>
            <Row label="Год выпуска">
              <Dim value={lot.year} mono />
            </Row>
            <Row label="VIN">
              {lot.vin ? (
                <span className="font-mono text-xs">{lot.vin}</span>
              ) : (
                <Dim value={null} />
              )}
            </Row>
            <Row label="ПТС">
              <Dim value={lot.pts} />
            </Row>
            <Row label="Цвет">
              <Dim value={lot.color} />
            </Row>
            <Row label="Кузов">
              <Dim value={lot.body} />
            </Row>
            <Row label="Эко-класс">
              <Dim value={lot.eco_class} />
            </Row>
            <Row label="Мощность">
              <Dim value={lot.power} mono />
            </Row>
            <Row label="Объём двигателя">
              <Dim value={lot.engine_volume} mono />
            </Row>
            <Row label="Привод">
              <Dim value={lot.drive} />
            </Row>
            <Row label="КПП">
              <Dim value={lot.transmission} />
            </Row>
            <Row label="Пробег, км">
              {lot.mileage === null ? (
                <Dim value={null} />
              ) : (
                <span className="tnum">{money(lot.mileage)}</span>
              )}
            </Row>
          </Block>

          <Block title="Сроки">
            <Row label="Приём заявок с">
              <span className="tnum text-xs">{dt(lot.request_start_date)}</span>
            </Row>
            <Row label="Приём заявок до">
              <span className="tnum text-xs">{dt(lot.request_end_date)}</span>
            </Row>
            <Row label="Дата торгов">
              <span className="tnum text-xs">{dt(lot.tender_date)}</span>
            </Row>
            <Row label="Подведение итогов">
              <span className="tnum text-xs">{dt(lot.final_date)}</span>
            </Row>
            <Row label="Осталось дней">
              {lot.days_left === null ? (
                <Dim value={null} />
              ) : (
                <TorgiDeadlineBadge days={lot.days_left} />
              )}
            </Row>
          </Block>

          <Block title="Портал">
            <Row label="Просмотров">
              <Dim value={lot.portal_views} mono />
            </Row>
            <Row label="Фотографий">
              <span className="tnum">{lot.photos_count}</span>
            </Row>
          </Block>

          <LotLinks lot={lot} />
        </div>
      </div>

      <PriceByVersion lotId={id} />
    </div>
  );
}
