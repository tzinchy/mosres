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
const DISTRICT_PALETTE = [
  "#4f7686", "#b0763d", "#7d6ca6", "#4f8a6b", "#a1502a", "#5c6b8a",
  "#3c8f8f", "#9c6b8a", "#6b8f3c", "#8f6b3c", "#3c6b9c", "#8a8f98",
];
const SEP = "|";

function build(rows: SankeyRow[]) {
  const districts = [...new Set(rows.map((r) => r.district))].sort();
  const rooms = ROOM_ORDER.filter((r) => rows.some((x) => x.rooms === r));
  const buckets = BUCKET_ORDER.filter((b) => rows.some((x) => x.bucket === b));
  const names = [...districts, ...rooms, ...buckets];

  const districtColor = new Map(
    districts.map((d, i) => [d, DISTRICT_PALETTE[i % DISTRICT_PALETTE.length]]),
  );
  const nodes = names.map((name, i) => ({
    name,
    layer:
      i < districts.length
        ? 0
        : i < districts.length + rooms.length
          ? 1
          : 2,
    color:
      i < districts.length
        ? districtColor.get(name)!
        : i < districts.length + rooms.length
          ? "var(--chart-3)"
          : "var(--chart-2)",
  }));
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
    return {
      source: idx.get(src)!,
      target: idx.get(k.slice(at + 1))!,
      value: v,
      color: districtColor.get(src) ?? "var(--muted-foreground)",
    };
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
    const right = payload.layer === 2;
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
          fill="var(--foreground)"
        >
          {payload.name}
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
    const opacity = lit ? 0.6 : anyHover ? 0.05 : 0.18;
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

  return (
    <div className="h-[500px] w-full rounded-xl bg-panel p-4">
      <ResponsiveContainer>
        <Sankey
          data={chart}
          node={<Node />}
          link={<Link />}
          nodePadding={14}
          nodeWidth={10}
          margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
        >
          <Tooltip
            formatter={(v) => [`${v} кв.`, ""]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
