import { createContext, useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Chart, Empty, PALETTE, Panel, axis } from "@/components/torgi/parts";
import { num } from "@/components/torgi-objects/parts";
import { Skeleton } from "@/components/ui/skeleton";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTorgiCarsOdds, useTorgiInvest } from "@/hooks/useTorgiDashboard";
import { useTorgiObjectsInvest, useTorgiObjectsOdds } from "@/hooks/useTorgiObjects";
import { moneyShort, shortDate } from "@/lib/format";
import type {
  TorgiObjectDeal,
  TorgiObjectInvest as Invest,
  TorgiObjectOdds,
  TorgiObjectSegment,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const share = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(v * 100)}%`;
const signedShare = (v: number | null | undefined) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
const OKRUG_ABBR: Record<string, string> = {
  "Центральный": "ЦАО",
  "Северный": "САО",
  "Северо-Восточный": "СВАО",
  "Восточный": "ВАО",
  "Юго-Восточный": "ЮВАО",
  "Южный": "ЮАО",
  "Юго-Западный": "ЮЗАО",
  "Западный": "ЗАО",
  "Северо-Западный": "СЗАО",
  "Зеленоградский": "ЗелАО",
  "Новомосковский": "НАО",
  "Троицкий": "ТАО",
};
const okrug = (name: string) => {
  const short = name.replace(" административный округ", "");
  return short === "не указан" ? "—" : short;
};
/** Короткая подпись округа для узких колонок: ЮЗАО, СВАО… */
const okrugAbbr = (name: string) => OKRUG_ABBR[okrug(name)] ?? okrug(name);
const baseType = (name: string) => name.replace(" · подвал", "");
const isBasement = (name: string) => name.endsWith(" · подвал");

/** Среднее по сегментам с весом «число продаж»: медианы сегментов честно не
 *  складываются, но взвешенное среднее хорошо описывает тип целиком. */
function wavg(
  rows: TorgiObjectSegment[],
  key: "sold_share" | "at_start_share" | "median_premium" | "median_final_ppm" | "median_views",
): number | null {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const v = r[key];
    if (v == null) continue;
    const w = key === "sold_share" ? r.finished : r.sold;
    num += v * w;
    den += w;
  }
  return den ? num / den : null;
}

type Level = TorgiObjectDeal["bench_level"];

/** Один компонент на недвижимость и транспорт: отличаются хуки данных, ссылки на
 *  карточку, единица цены и то, как называются «тип» и «округ». */
interface InvestCfg {
  useInvest: () => UseQueryResult<Invest>;
  useOdds: () => UseQueryResult<Map<number, TorgiObjectOdds>>;
  lotPath: string;
  unit: string;
  level: Record<Level, string>;
  levelGen: Record<Level, string>;
  regionPlural: string;
  segmentLabel: string;
  reliableLabel: string;
  regionShort: (name: string) => string;
  dealTitle: (d: TorgiObjectDeal, withType: boolean) => string;
  dealSub: (d: TorgiObjectDeal) => string;
}

const OBJECTS_CFG: InvestCfg = {
  useInvest: useTorgiObjectsInvest,
  useOdds: useTorgiObjectsOdds,
  lotPath: "/torgi/objects",
  unit: "₽/м²",
  level: { house: "дом", district: "район", region: "округ" },
  levelGen: { house: "дома", district: "района", region: "округа" },
  regionPlural: "округам",
  segmentLabel: "тип × округ",
  reliableLabel: "только с ориентиром по дому или району",
  regionShort: (n) => okrugAbbr(n),
  dealTitle: (d, withType) =>
    `${withType ? `${d.object_type_name} · ` : ""}${d.object_area ?? "—"} м²`,
  dealSub: (d) => d.short_address ?? "",
};

const CARS_CFG: InvestCfg = {
  useInvest: useTorgiInvest,
  useOdds: useTorgiCarsOdds,
  lotPath: "/torgi/cars",
  unit: "₽",
  level: { house: "марка", district: "марка", region: "категория" },
  levelGen: { house: "марки", district: "марки", region: "категории" },
  regionPlural: "возрастам",
  segmentLabel: "категория × возраст",
  reliableLabel: "только с ориентиром по марке",
  regionShort: (n) => n,
  dealTitle: (d, withType) =>
    `${d.short_address ?? "лот"}${withType && d.object_type_name ? ` · ${d.object_type_name}` : ""}`,
  dealSub: (d) => d.region_name ?? "",
};

const CfgCtx = createContext<InvestCfg>(OBJECTS_CFG);
const useCfg = () => useContext(CfgCtx);

/** Подпись региона/возраста: у недвижимости режем «административный округ». */
const regionName = (cfg: InvestCfg, n: string) =>
  cfg.regionShort(n) === n ? n : okrug(n);

// ---------------------------------------------------------------- scatter

interface SegPoint {
  x: number;
  y: number;
  z: number;
  seg: TorgiObjectSegment;
}

function SegmentTooltip({ active, payload }: any) {
  const cfg = useCfg();
  if (!active || !payload?.length) return null;
  const s: TorgiObjectSegment = (payload[0].payload as SegPoint).seg;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{s.object_type_name}</div>
      <div className="text-muted-foreground">{regionName(cfg, s.region_name)}</div>
      <div className="tnum mt-1 space-y-0.5">
        <div>продано {num(s.sold)} из {num(s.finished)} · состоялось {share(s.sold_share)}</div>
        <div>без борьбы {share(s.at_start_share)} · наценка {signedShare(s.median_premium)}</div>
        <div>итог {num(s.median_final_ppm)} {cfg.unit} · просмотров {num(s.median_views)}</div>
      </div>
    </div>
  );
}

function SegmentScatter({ rows, focus }: { rows: TorgiObjectSegment[]; focus: string }) {
  const cfg = useCfg();
  const groups = useMemo(() => {
    const by = new Map<string, SegPoint[]>();
    for (const s of rows) {
      if (s.sold_share == null || s.at_start_share == null) continue;
      const k = focus
        ? cfg.regionShort(s.region_name) + (isBasement(s.object_type_name) ? " · подвал" : "")
        : baseType(s.object_type_name);
      const arr = by.get(k) ?? [];
      arr.push({
        x: Math.round(s.at_start_share * 100),
        y: Math.round(s.sold_share * 100),
        z: s.sold,
        seg: s,
      });
      by.set(k, arr);
    }
    return [...by.entries()].sort(
      (a, b) =>
        b[1].reduce((n, p) => n + p.z, 0) - a[1].reduce((n, p) => n + p.z, 0),
    );
  }, [rows, focus, cfg]);

  if (groups.length === 0) return <Empty />;
  return (
    <>
      <Chart height="h-96">
        <ScatterChart margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="x"
            name="Без борьбы"
            domain={[0, 100]}
            unit="%"
            {...axis}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Состоялось"
            domain={[0, 100]}
            unit="%"
            width={44}
            {...axis}
            axisLine={false}
          />
          <ZAxis type="number" dataKey="z" range={[50, 520]} name="Продано" />
          <ReferenceLine x={50} stroke="var(--border)" strokeDasharray="4 4" />
          <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4" />
          <Tooltip content={<SegmentTooltip />} cursor={false} />
          <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
          {groups.map(([key, pts], i) => (
            <Scatter
              key={key}
              name={key}
              data={pts}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.7}
              stroke="var(--background)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </Chart>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        → продано без борьбы, % (по начальной цене) · ↑ торги состоялись, %
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {focus
          ? `Точка — сегмент внутри «${focus}», цвет — ${cfg.regionPlural === "округам" ? "округ" : "возраст"}, размер — число продаж.`
          : `Точка — сегмент «${cfg.segmentLabel}», размер — число продаж.`}{" "}
        Вверх и вправо — торги почти всегда состоятся, а покупают по начальной
        цене.
      </p>
    </>
  );
}

// ---------------------------------------------------------------- heatmap

const METRICS = {
  sold_share: { label: "Состоялось", fmt: share },
  at_start_share: { label: "Без борьбы", fmt: share },
  median_premium: { label: "Наценка итога", fmt: signedShare },
  median_final_ppm: { label: "Итог {u}", fmt: (v: number) => moneyShort(v) },
} as const;
type MetricKey = keyof typeof METRICS;

function Heatmap({ rows }: { rows: TorgiObjectSegment[] }) {
  const cfg = useCfg();
  const [metric, setMetric] = useState<MetricKey>("at_start_share");

  const { types, regions, cell, max, min } = useMemo(() => {
    const sum = (key: "object_type_name" | "region_name") => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + r.sold);
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    };
    const cell = new Map(rows.map((r) => [`${r.object_type_name}|${r.region_name}`, r]));
    const vals = rows
      .map((r) => r[metric])
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    // верхняя граница шкалы — 90-й процентиль, чтобы один выброс (наценка
    // на землю +228%) не обесцвечивал остальные ячейки
    const max = vals[Math.floor(vals.length * 0.9)] ?? 1;
    return {
      types: sum("object_type_name").slice(0, 9),
      regions: sum("region_name").slice(0, 12),
      cell,
      max,
      min: vals[0] ?? 0,
    };
  }, [rows, metric]);

  const fmt = METRICS[metric].fmt as (v: number) => string;
  const tone = (v: number | null) => {
    if (v == null) return undefined;
    const t = Math.min(1, Math.max(0, (v - min) / (max - min || 1)));
    return { t, background: `color-mix(in srgb, var(--chart-1) ${Math.round(8 + t * 72)}%, transparent)` };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>показатель:</span>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
          className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
        >
          {(Object.keys(METRICS) as MetricKey[]).map((k) => (
            <option key={k} value={k}>
              {METRICS[k].label.replace("{u}", cfg.unit)}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-1.5">
          меньше
          <span
            className="h-2.5 w-24 rounded-sm"
            style={{
              background:
                "linear-gradient(to right, color-mix(in srgb, var(--chart-1) 8%, transparent), color-mix(in srgb, var(--chart-1) 80%, transparent))",
            }}
          />
          больше
        </span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[820px] gap-0.5 text-xs"
          style={{ gridTemplateColumns: `190px repeat(${regions.length}, minmax(0, 1fr))` }}
        >
          <div />
          {regions.map((g) => (
            <div key={g} className="px-1 pb-1 text-center text-muted-foreground" title={regionName(cfg, g)}>
              {cfg.regionShort(g)}
            </div>
          ))}
          {types.map((t) => (
            <>
              <div
                key={t}
                className="flex min-h-8 items-center justify-end pr-2 text-right leading-tight"
                title={t}
              >
                {t}
              </div>
              {regions.map((g) => {
                const s = cell.get(`${t}|${g}`);
                const v = s ? (s[metric] as number | null) : null;
                const c = tone(v);
                return (
                  <div
                    key={`${t}|${g}`}
                    title={
                      s
                        ? `${t} · ${regionName(cfg, g)}\nпродано ${s.sold}, состоялось ${share(s.sold_share)}, без борьбы ${share(s.at_start_share)}, наценка ${signedShare(s.median_premium)}, итог ${num(s.median_final_ppm)} ${cfg.unit}`
                        : "нет данных (меньше 10 продаж)"
                    }
                    className={cn(
                      "tnum grid min-h-8 place-items-center rounded-sm text-center",
                      v == null && "bg-secondary/40 text-muted-foreground/50",
                    )}
                    style={c && { background: c.background, color: c.t > 0.6 ? "#fff" : undefined }}
                  >
                    {v == null ? "·" : fmt(v)}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- type matrix

const MATRIX_COLS = [
  { key: "sold", label: "Продано", fmt: (v: number) => num(v) },
  { key: "sold_share", label: "Состоялось", fmt: (v: number) => share(v) },
  { key: "at_start_share", label: "Без борьбы", fmt: (v: number) => share(v) },
  { key: "median_premium", label: "Наценка", fmt: (v: number) => signedShare(v) },
  { key: "median_final_ppm", label: "Итог {u}", fmt: (v: number) => moneyShort(v) },
  { key: "median_views", label: "Просмотры", fmt: (v: number) => num(v) },
] as const;

/** Один тип объекта подробно: строка — округ, колонка — показатель, каждая
 *  колонка закрашена по своей шкале (светлее — меньше, темнее — больше). */
function TypeMatrix({ rows }: { rows: TorgiObjectSegment[] }) {
  const cfg = useCfg();
  const sorted = useMemo(() => [...rows].sort((a, b) => b.sold - a.sold), [rows]);
  const scale = useMemo(() => {
    const out: Record<string, { min: number; max: number }> = {};
    for (const c of MATRIX_COLS) {
      const v = sorted
        .map((r) => r[c.key] as number | null)
        .filter((x): x is number => x != null)
        .sort((a, b) => a - b);
      out[c.key] = { min: v[0] ?? 0, max: v[Math.floor(v.length * 0.9)] ?? 1 };
    }
    return out;
  }, [sorted]);
  if (sorted.length === 0) return <Empty>Мало завершённых продаж.</Empty>;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px] gap-0.5 text-xs"
        style={{ gridTemplateColumns: `150px repeat(${MATRIX_COLS.length}, minmax(0, 1fr))` }}
      >
        <div />
        {MATRIX_COLS.map((c) => (
          <div key={c.key} className="px-1 pb-1 text-center text-muted-foreground">
            {c.label.replace("{u}", cfg.unit)}
          </div>
        ))}
        {sorted.map((r) => (
          <>
            <div
              key={`${r.region_name}|${r.object_type_name}`}
              className="flex min-h-8 items-center justify-end pr-2 text-right leading-tight"
              title={`${regionName(cfg, r.region_name)}${isBasement(r.object_type_name) ? " · подвал" : ""}`}
            >
              {cfg.regionShort(r.region_name)}
              {isBasement(r.object_type_name) ? " · подвал" : ""}
            </div>
            {MATRIX_COLS.map((c) => {
              const v = r[c.key] as number | null;
              const { min, max } = scale[c.key];
              const t = v == null ? 0 : Math.min(1, Math.max(0, (v - min) / (max - min || 1)));
              return (
                <div
                  key={c.key}
                  className={cn(
                    "tnum grid min-h-8 place-items-center rounded-sm text-center",
                    v == null && "bg-secondary/40 text-muted-foreground/50",
                  )}
                  style={
                    v == null
                      ? undefined
                      : {
                          background: `color-mix(in srgb, var(--chart-1) ${Math.round(8 + t * 72)}%, transparent)`,
                          color: t > 0.6 ? "#fff" : undefined,
                        }
                  }
                >
                  {v == null ? "·" : c.fmt(v)}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- deals bars

function DealBars({ rows, fixedType }: { rows: TorgiObjectDeal[]; fixedType?: string }) {
  const cfg = useCfg();
  const [reliableOnly, setReliableOnly] = useState(true);
  const [pickedType, setType] = useState("");
  const type = fixedType ?? pickedType;
  const types = useMemo(
    () => [...new Set(rows.map((r) => r.object_type_name ?? ""))].filter(Boolean).sort(),
    [rows],
  );
  const top = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (!reliableOnly || r.bench_level !== "region") &&
            (!type || r.object_type_name === type),
        )
        .slice(0, 10),
    [rows, reliableOnly, type],
  );
  const maxDiscount = Math.max(0.01, ...top.map((r) => r.discount));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {!fixedType && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          >
            <option value="">Все типы</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={reliableOnly}
            onChange={(e) => setReliableOnly(e.target.checked)}
          />
          {cfg.reliableLabel}
        </label>
      </div>
      {top.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-1">
          {top.map((r) => (
            <li key={r.lot_id}>
              <Link
                to={`${cfg.lotPath}/${r.lot_id}`}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px] items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60"
              >
                <span className="min-w-0">
                  <span className="block truncate">
                    {cfg.dealTitle(r, !fixedType)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {cfg.dealSub(r)}
                    {r.request_end_date ? ` · заявки до ${shortDate(r.request_end_date)}` : ""}
                  </span>
                </span>
                <span
                  className="min-w-0"
                  title={`старт ${num(r.start_ppm)} ${cfg.unit}, типичный итог ${num(r.bench_ppm)} ${cfg.unit} (${cfg.level[r.bench_level]}, ${r.bench_n} прод.) · ожидаемый итог ${moneyShort(r.est_final_price)} ₽ · задаток ${moneyShort(r.deposit)} ₽ · просмотров ${num(r.portal_views)}`}
                >
                  <span className="block h-2.5 rounded-sm bg-secondary">
                    <span
                      className="block h-full rounded-sm"
                      style={{
                        width: `${(r.discount / maxDiscount) * 100}%`,
                        background: "var(--chart-1)",
                      }}
                    />
                  </span>
                  <span className="tnum mt-0.5 block truncate text-xs text-muted-foreground">
                    {moneyShort(r.start_ppm)} → {moneyShort(r.bench_ppm)} {cfg.unit} · {cfg.level[r.bench_level]}, {r.bench_n}
                    {r.p_sold != null && ` · продажа ${Math.round(r.p_sold * 100)}%`}
                  </span>
                </span>
                <span className="tnum text-right text-sm font-medium">
                  −{Math.round(r.discount * 100)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -------------------------------------------------------------- highlights

function Highlight({
  tone,
  title,
  value,
  children,
}: {
  tone: "pos" | "neg" | "info";
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-3 border-l-4",
        tone === "pos" && "border-l-pos",
        tone === "neg" && "border-l-neg",
        tone === "info" && "border-l-[var(--chart-1)]",
      )}
    >
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="tnum mt-0.5 text-lg font-medium leading-tight">{value}</div>
      <div className="mt-1 break-words text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

/** Что значимого в данных прямо сейчас — считается из тех же сегментов,
 *  лотов и шансов, что и графики ниже. */
function Highlights({
  segments,
  deals,
  focus,
}: {
  segments: TorgiObjectSegment[];
  deals: TorgiObjectDeal[];
  focus: string;
}) {
  const cfg = useCfg();
  const odds = cfg.useOdds();
  // внутри одного типа в сегменте достаточно 15 продаж, во всём наборе — 30
  const big = segments.filter((s) => s.sold >= (focus ? 15 : 30));
  const label = (s: TorgiObjectSegment) =>
    focus
      ? `${regionName(cfg, s.region_name)}${isBasement(s.object_type_name) ? " · подвал" : ""}`
      : `${s.object_type_name} · ${regionName(cfg, s.region_name)}`;

  const liveOdds = [...(odds.data?.values() ?? [])].filter(
    (o) => !focus || (o.object_type_name && baseType(o.object_type_name) === focus),
  );
  const quiet = liveOdds.filter((o) => o.p_sold < 0.3).length;
  const hot = liveOdds.filter((o) => (o.p_competed ?? 0) >= 0.7).length;

  const easy = big
    .filter((s) => (s.sold_share ?? 0) >= 0.5 && s.live_lots > 0)
    .sort((a, b) => (b.at_start_share ?? 0) - (a.at_start_share ?? 0))[0];
  const fight = [...big].sort(
    (a, b) => (b.median_premium ?? 0) - (a.median_premium ?? 0),
  )[0];
  const deal = deals
    .filter((d) => d.bench_level !== "region" && d.bench_n >= 10)
    .sort((a, b) => b.discount - a.discount)[0];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {easy && (
        <Highlight tone="pos" title="Войти без борьбы" value={share(easy.at_start_share)}>
          {label(easy)}: столько продаж ушло по начальной цене, живых лотов{" "}
          {num(easy.live_lots)}
        </Highlight>
      )}
      {fight && (
        <Highlight tone="neg" title="Жарче всего торгуются" value={signedShare(fight.median_premium)}>
          {label(fight)}: медианный итог над начальной ценой
        </Highlight>
      )}
      {deal && (
        <Highlight tone="info" title="Крупнейшая надёжная скидка" value={`−${share(deal.discount)}`}>
          <Link to={`${cfg.lotPath}/${deal.lot_id}`} className="text-primary hover:underline">
            {cfg.dealTitle(deal, !focus)}
          </Link>{" "}
          к итогам {cfg.levelGen[deal.bench_level]} ({deal.bench_n} продаж)
        </Highlight>
      )}
      {odds.data && (
        <Highlight tone="info" title="По просмотрам сейчас" value={`${num(hot)} / ${num(quiet)}`}>
          лотов с вероятной борьбой / с низким интересом (торги скорее всего не
          состоятся — потом лот выставят с меньшей ценой)
        </Highlight>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- block

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tnum mt-0.5 text-lg font-medium leading-tight">{value}</div>
      {hint && <div className="mt-0.5 break-words text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Итоги по выбранному типу целиком. */
function TypeStats({ segs, focus }: { segs: TorgiObjectSegment[]; focus: string }) {
  const odds = useCfg().useOdds();
  const sold = segs.reduce((n, s) => n + s.sold, 0);
  const finished = segs.reduce((n, s) => n + s.finished, 0);
  const live = segs.reduce((n, s) => n + s.live_lots, 0);
  const own = [...(odds.data?.values() ?? [])].filter(
    (o) => o.object_type_name && baseType(o.object_type_name) === focus,
  );
  const hot = own.filter((o) => (o.p_competed ?? 0) >= 0.7).length;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Stat label="Продано торгов" value={num(sold)} hint={`из ${num(finished)} завершённых`} />
      <Stat label="Состоялось" value={share(wavg(segs, "sold_share"))} hint="остальное — несостоявшиеся" />
      <Stat label="Продано без борьбы" value={share(wavg(segs, "at_start_share"))} hint="по начальной цене" />
      <Stat label="Типичная наценка" value={signedShare(wavg(segs, "median_premium"))} hint="итог к начальной" />
      <Stat
        label="Живых лотов"
        value={num(live)}
        hint={own.length ? `с вероятной борьбой: ${num(hot)}` : undefined}
      />
    </div>
  );
}

function InvestBlock() {
  const cfg = useCfg();
  const { data, isLoading, isError } = cfg.useInvest();
  const [focus, setFocus] = useState("");

  const types = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of data?.segments ?? []) {
      const k = baseType(s.object_type_name);
      m.set(k, (m.get(k) ?? 0) + s.sold);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !data)
    return (
      <p className="rounded-lg border border-neg/40 bg-neg-soft px-4 py-3 text-sm">
        Не удалось посчитать сегменты.
      </p>
    );

  const segs = focus
    ? data.segments.filter((s) => baseType(s.object_type_name) === focus)
    : data.segments;
  const deals = focus ? data.deals.filter((d) => d.object_type_name === focus) : data.deals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Тип объекта">
        {["", ...types].map((t) => (
          <button
            key={t || "all"}
            type="button"
            role="tab"
            aria-selected={focus === t}
            onClick={() => setFocus(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              focus === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t || "Все типы"}
          </button>
        ))}
      </div>

      {focus && <TypeStats segs={segs} focus={focus} />}
      <Highlights segments={segs} deals={deals} focus={focus} />
      <Panel
        title={focus ? `${focus}: исход торгов по ${cfg.regionPlural}` : "Исход торгов по сегментам"}
        help="По горизонтали — доля лотов, проданных по начальной цене (никто не перебил), по вертикали — доля торгов, закончившихся продажей. Размер точки — число продаж."
      >
        <SegmentScatter rows={segs} focus={focus} />
      </Panel>
      <Panel
        title={focus ? `${focus}: сегменты по показателям` : `Карта сегментов: ${cfg.segmentLabel}`}
        help={
          focus
            ? "Строка — сегмент, колонка — показатель. Каждая колонка закрашена по своей шкале: чем темнее, тем больше. Пусто — меньше 10 продаж."
            : "Те же сегменты матрицей: чем темнее ячейка, тем выше показатель. Пустая ячейка — меньше 10 продаж. Наведи на ячейку, чтобы увидеть все показатели сегмента."
        }
      >
        {focus ? <TypeMatrix rows={segs} /> : <Heatmap rows={segs} />}
      </Panel>
      <Panel
        title={`${focus ? `${focus}: ж` : "Ж"}ивые лоты дешевле типичного итога — топ-10`}
        help="Стартовая цена ниже того, за что уходили похожие лоты (для недвижимости — в том же доме, районе или округе, для транспорта — той же марки или категории и возраста). Это скидка к итогам торгов, а не прибыль: цен перепродажи в данных портала нет, их нужно сверять с объявлениями."
      >
        <DealBars rows={deals} fixedType={focus || undefined} />
      </Panel>
    </div>
  );
}

export function TorgiObjectInvest() {
  return (
    <CfgCtx.Provider value={OBJECTS_CFG}>
      <InvestBlock />
    </CfgCtx.Provider>
  );
}

export function TorgiCarsInvest() {
  return (
    <CfgCtx.Provider value={CARS_CFG}>
      <InvestBlock />
    </CfgCtx.Provider>
  );
}
