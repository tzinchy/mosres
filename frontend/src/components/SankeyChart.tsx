import { useMemo, useState } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useSankey } from "@/hooks/useDashboard";
import type { SankeyRow } from "@/lib/types";

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

function kvartira(n: number) {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return "квартира";
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return "квартиры";
  return "квартир";
}
const flats = (n: number) => `${n} ${kvartira(n)}`;

type Layer = 0 | 1 | 2;

function districtLabel(name: string) {
  return DISTRICT_FULL[name] ?? name;
}
function nodePhrase(name: string, layer: Layer) {
  if (layer === 0) return districtLabel(name);
  if (layer === 1) return name === "Студия" ? "Студии" : name;
  return `цена ${name} ₽`;
}

function build(rows: SankeyRow[]) {
  const districts = [...new Set(rows.map((r) => r.district))].sort();
  const rooms = ROOM_ORDER.filter((r) => rows.some((x) => x.rooms === r));
  const buckets = BUCKET_ORDER.filter((b) => rows.some((x) => x.bucket === b));
  const names = [...districts, ...rooms, ...buckets];

  const districtColor = new Map(
    districts.map((d, i) => [
      d,
      DISTRICT_COLOR[d] ?? DISTRICT_FALLBACK[i % DISTRICT_FALLBACK.length],
    ]),
  );
  const nRoom = districts.length + rooms.length;
  const layerOf = (i: number): Layer => (i < districts.length ? 0 : i < nRoom ? 1 : 2);

  const nodes = names.map((name, i) => {
    const layer = layerOf(i);
    return {
      name,
      layer,
      color:
        layer === 0
          ? districtColor.get(name)!
          : layer === 1
            ? ROOM_COLOR
            : BUCKET_COLOR[name] ?? ROOM_COLOR,
    };
  });
  const idx = new Map(names.map((n, i) => [n, i]));

  const acc = new Map<string, number>();
  const bump = (a: string, b: string, n: number) =>
    acc.set(a + SEP + b, (acc.get(a + SEP + b) ?? 0) + n);
  for (const row of rows) {
    bump(row.district, row.rooms, row.count);
    bump(row.rooms, row.bucket, row.count);
  }
  const links = [...acc].map(([k, v]) => {
    const at = k.indexOf(SEP);
    const src = k.slice(0, at);
    const dst = k.slice(at + 1);
    // 1st hop keeps its округ colour; 2nd hop takes the target price-bucket colour.
    const color = districtColor.get(src) ?? BUCKET_COLOR[dst] ?? ROOM_COLOR;
    return { source: idx.get(src)!, target: idx.get(dst)!, value: v, color };
  });
  return { nodes, links };
}

export function SankeyChart({ favOnly }: { favOnly: boolean }) {
  const { data, isLoading } = useSankey(favOnly);
  const chart = useMemo(() => (data ? build(data) : null), [data]);
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
    const layer: Layer = payload.layer;
    const right = layer === 2;
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
          fontWeight={layer === 0 ? 600 : 400}
          fill="var(--foreground)"
        >
          {layer === 1 && payload.name === "Студия" ? "Студии" : payload.name}
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
    const opacity = lit ? 0.85 : anyHover ? 0.08 : 0.4;
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

  const TipContent = ({ payload }: any) => {
    const p = payload?.[0]?.payload;
    if (!p) return null;
    let text: string;
    if (p.source && typeof p.source === "object") {
      const s: Layer = p.source.layer;
      const from = nodePhrase(p.source.name, s);
      const to = nodePhrase(p.target.name, (s + 1) as Layer);
      const cap = from.charAt(0).toUpperCase() + from.slice(1);
      text = `${cap} → ${to}: ${flats(p.value)}`;
    } else {
      const phrase = nodePhrase(p.name, p.layer);
      const cap = phrase.charAt(0).toUpperCase() + phrase.slice(1);
      text = `${cap} — ${flats(p.value)}`;
    }
    return (
      <div
        style={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 12,
          color: "var(--popover-foreground)",
          maxWidth: 260,
        }}
      >
        {text}
      </div>
    );
  };

  return (
    <div className="h-[500px] w-full rounded-xl bg-panel p-4">
      <div className="mb-1 flex justify-between px-1 text-xs font-medium text-muted-foreground">
        <span>Округ</span>
        <span>Комнатность</span>
        <span>Ценовой диапазон</span>
      </div>
      <div className="h-[calc(100%-1.5rem)]">
        <ResponsiveContainer>
          <Sankey
            data={chart}
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
