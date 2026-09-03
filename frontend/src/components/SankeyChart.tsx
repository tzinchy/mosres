import { useMemo, useState } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useSankey } from "@/hooks/useDashboard";
import type { SankeyRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROOM_ORDER = ["Студия", "1-комн", "2-комн", "3-комн", "4-комн", "5-комн"];
const BUCKET_ORDER = [
  "до 10 млн",
  "10–15 млн",
  "15–20 млн",
  "20–30 млн",
  "30–50 млн",
  "50+ млн",
];

// Vivid categorical scale for Moscow's административные округа — maximally
// distinct hues so adjacent flows never blend into one grey mass.
const DISTRICT_COLOR: Record<string, string> = {
  ЦАО: "#e6194b",
  САО: "#3cb44b",
  СВАО: "#4363d8",
  ВАО: "#f58231",
  ЮВАО: "#911eb4",
  ЮАО: "#f032e6",
  ЮЗАО: "#009c8f",
  ЗАО: "#9a6324",
  СЗАО: "#808000",
  ЗелАО: "#000075",
  НАО: "#00b4d8",
  ТАО: "#bcbd22",
  Прочие: "#9aa0a6",
};
const DISTRICT_FALLBACK = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#f032e6", "#009c8f", "#9a6324", "#808000", "#000075", "#00b4d8", "#bcbd22"];

// Sequential green→red price ramp for the ценовой диапазон column.
const BUCKET_COLOR: Record<string, string> = {
  "до 10 млн": "#3f8f5f",
  "10–15 млн": "#7fa03c",
  "15–20 млн": "#c9a227",
  "20–30 млн": "#d98324",
  "30–50 млн": "#c8552f",
  "50+ млн": "#a83232",
};
const ROOM_COLOR = "#5c6b8a";

// Short округ code → human label for tooltips ("СВАО" → "Северо-Восточный округ").
const DISTRICT_FULL: Record<string, string> = {
  ЦАО: "Центральный округ",
  САО: "Северный округ",
  СВАО: "Северо-Восточный округ",
  ВАО: "Восточный округ",
  ЮВАО: "Юго-Восточный округ",
  ЮАО: "Южный округ",
  ЮЗАО: "Юго-Западный округ",
  ЗАО: "Западный округ",
  СЗАО: "Северо-Западный округ",
  ЗелАО: "Зеленоградский округ",
  НАО: "Новомосковский округ",
  ТАО: "Троицкий округ",
  Прочие: "Прочие округа",
};

const SEP = "|";
type Mode = "rooms" | "direct";
type Kind = "district" | "rooms" | "bucket";

function kvartira(n: number) {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return "квартира";
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return "квартиры";
  return "квартир";
}
const flats = (n: number) => `${n} ${kvartira(n)}`;

function districtLabel(name: string) {
  return DISTRICT_FULL[name] ?? name;
}
function nodePhrase(name: string, kind: Kind) {
  if (kind === "district") return districtLabel(name);
  if (kind === "rooms") return name === "Студия" ? "Студии" : name;
  return `цена ${name} ₽`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function build(rows: SankeyRow[], mode: Mode) {
  const districts = [...new Set(rows.map((r) => r.district))].sort();
  const rooms = ROOM_ORDER.filter((r) => rows.some((x) => x.rooms === r));
  const buckets = BUCKET_ORDER.filter((b) => rows.some((x) => x.bucket === b));

  const districtColor = new Map(
    districts.map((d, i) => [
      d,
      DISTRICT_COLOR[d] ?? DISTRICT_FALLBACK[i % DISTRICT_FALLBACK.length],
    ]),
  );

  const order =
    mode === "rooms"
      ? [...districts, ...rooms, ...buckets]
      : [...districts, ...buckets];
  const kindOf = (name: string): Kind =>
    districts.includes(name) ? "district" : buckets.includes(name) ? "bucket" : "rooms";
  const lastRight = mode === "rooms" ? "bucket" : "bucket";

  const nodes = order.map((name) => {
    const kind = kindOf(name);
    return {
      name,
      kind,
      right: kind === lastRight,
      color:
        kind === "district"
          ? districtColor.get(name)!
          : kind === "rooms"
            ? ROOM_COLOR
            : BUCKET_COLOR[name] ?? ROOM_COLOR,
    };
  });
  const idx = new Map(order.map((n, i) => [n, i]));

  const acc = new Map<string, number>();
  const bump = (a: string, b: string, n: number) =>
    acc.set(a + SEP + b, (acc.get(a + SEP + b) ?? 0) + n);
  for (const row of rows) {
    if (mode === "rooms") {
      bump(row.district, row.rooms, row.count);
      bump(row.rooms, row.bucket, row.count);
    } else {
      bump(row.district, row.bucket, row.count);
    }
  }
  const links = [...acc].map(([k, v]) => {
    const at = k.indexOf(SEP);
    const src = k.slice(0, at);
    const dst = k.slice(at + 1);
    // округ colour on any hop that starts at an округ; otherwise the target bucket colour.
    const color = districtColor.get(src) ?? BUCKET_COLOR[dst] ?? ROOM_COLOR;
    return { source: idx.get(src)!, target: idx.get(dst)!, value: v, color };
  });

  // for every price bucket — which округа feed it, biggest first (tooltip)
  const breakdown = new Map<string, { district: string; count: number }[]>();
  for (const b of buckets) {
    const per = new Map<string, number>();
    for (const row of rows)
      if (row.bucket === b)
        per.set(row.district, (per.get(row.district) ?? 0) + row.count);
    breakdown.set(
      b,
      [...per]
        .map(([district, count]) => ({ district, count }))
        .sort((x, y) => y.count - x.count),
    );
  }

  return { nodes, links, breakdown, districtColor };
}

export function SankeyChart({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useSankey(favOnly);
  const [mode, setMode] = useState<Mode>("rooms");
  const chart = useMemo(() => (data ? build(data, mode) : null), [data, mode]);
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const [hoverLink, setHoverLink] = useState<number | null>(null);
  const anyHover = hoverNode !== null || hoverLink !== null;

  if (isLoading) return <Skeleton className="h-[480px] w-full rounded-xl" />;
  if (!chart || chart.links.length === 0)
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Нет данных.
      </p>
    );

  const Node = ({ x, y, width, height, index, payload }: any) => {
    const right: boolean = payload.right;
    return (
      <g
        onMouseEnter={() => setHoverNode(index)}
        onMouseLeave={() => setHoverNode(null)}
      >
        <rect x={x} y={y} width={width} height={height} fill={payload.color} rx={2} />
        <text
          x={right ? x - 6 : x + width + 6}
          y={y + height / 2}
          textAnchor={right ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={payload.kind === "district" ? 600 : 400}
          fill="var(--foreground)"
        >
          {payload.kind === "rooms" && payload.name === "Студия"
            ? "Студии"
            : payload.name}
        </text>
      </g>
    );
  };

  const Link = (props: any) => {
    const { sourceX, sourceY, sourceControlX, targetControlX, targetX, targetY, linkWidth, index, payload } = props;
    const lit =
      hoverLink === index ||
      hoverNode === payload.source.index ||
      hoverNode === payload.target.index;
    const opacity = lit ? 0.9 : anyHover ? 0.08 : 0.5;
    return (
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={payload.color}
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={opacity}
        onMouseEnter={() => setHoverLink(index)}
        onMouseLeave={() => setHoverLink(null)}
      />
    );
  };

  const box = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    color: "var(--popover-foreground)",
    maxWidth: 300,
  } as const;

  const TipContent = ({ payload }: any) => {
    const p = payload?.[0]?.payload;
    if (!p) return null;

    // link hover
    if (p.source && typeof p.source === "object") {
      const from = nodePhrase(p.source.name, p.source.kind);
      const to = nodePhrase(p.target.name, p.target.kind);
      return (
        <div style={box}>
          {cap(from)} → {to}: {flats(p.value)}
        </div>
      );
    }

    // node hover
    const phrase = nodePhrase(p.name, p.kind);
    const rows = p.kind === "bucket" ? chart.breakdown.get(p.name) : null;
    return (
      <div style={box}>
        <div>
          {cap(phrase)} — {flats(p.value)}
        </div>
        {rows && rows.length > 0 && (
          <div style={{ marginTop: 4, display: "grid", gap: 2 }}>
            {rows.slice(0, 7).map((r) => (
              <div
                key={r.district}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: chart.districtColor.get(r.district) ?? ROOM_COLOR,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{districtLabel(r.district)}</span>
                <span style={{ opacity: 0.7 }}>{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[520px] w-full rounded-xl bg-panel p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs">
        <span className="mr-1 text-muted-foreground">Разбивка:</span>
        {(
          [
            ["rooms", "по комнатности"],
            ["direct", "округ → цена"],
          ] as [Mode, string][]
        ).map(([m, l]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 transition-colors",
              mode === m
                ? "border-primary bg-primary/15 font-medium text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="mb-1 flex justify-between px-1 text-xs font-medium text-muted-foreground">
        <span>Округ</span>
        {mode === "rooms" && <span>Комнатность</span>}
        <span>Ценовой диапазон</span>
      </div>
      <div className="h-[calc(100%-3rem)]">
        <ResponsiveContainer>
          <Sankey
            data={{ nodes: chart.nodes, links: chart.links }}
            node={<Node />}
            link={<Link />}
            nodePadding={14}
            nodeWidth={10}
            margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
          >
            <Tooltip content={<TipContent />} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
