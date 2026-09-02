import { Box, ExternalLink } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { DiscountCell, ReserveTag } from "@/components/cells";
import { MetroList } from "@/components/MetroList";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useApartVersions } from "@/hooks/useDashboard";
import { money, pct, shortDate } from "@/lib/format";
import type { ApartRow, ApartVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

const num = (s: string | null) =>
  s ? Number(s.replace(/\D/g, "")) || null : null;

interface Change {
  text: string;
  tone?: "pos" | "neg";
}

function diffLabel(a: ApartVersion, b: ApartVersion): Change[] {
  const out: Change[] = [];
  const pa = num(a.price);
  const pb = num(b.price);
  if (pa !== null && pb !== null && pa !== pb) {
    const d = pb - pa;
    out.push({
      text: `Цена: ${money(pa)} → ${money(pb)} ₽ (${d < 0 ? "" : "+"}${money(d)} ₽, ${pct((d / pa) * 100)})`,
      tone: d < 0 ? "pos" : "neg",
    });
  }
  const ma = num(a.price_m);
  const mb = num(b.price_m);
  if (ma !== null && mb !== null && ma !== mb)
    out.push({ text: `Цена м²: ${money(ma)} → ${money(mb)} ₽` });

  const da = num(a.price_with_discount);
  const db = num(b.price_with_discount);
  const hadA = da !== null && da > 0 && pa !== null && da < pa;
  const hadB = db !== null && db > 0 && pb !== null && db < pb;
  if (!hadA && hadB)
    out.push({ text: `Появилась скидка до ${money(db)} ₽`, tone: "pos" });
  if (hadA && !hadB) out.push({ text: "Скидка снята", tone: "neg" });
  else if (hadA && hadB && da !== db)
    out.push({ text: `Скидка изменилась: ${money(da)} → ${money(db)} ₽` });

  if ((a.reserve ?? 0) !== (b.reserve ?? 0))
    out.push({
      text: b.reserve === 1 ? "Ушла в резерв" : "Вышла из резерва",
      tone: b.reserve === 1 ? "neg" : "pos",
    });

  return out.length ? out : [{ text: "Обновлены прочие поля" }];
}

export function ApartSheet({
  apart,
  onOpenChange,
}: {
  apart: ApartRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: versions, isLoading } = useApartVersions(
    apart?.new_apart_id ?? null,
  );

  const series =
    versions?.map((v) => ({
      v: v.version,
      date: shortDate(v.updated_at),
      price: num(v.price),
    })) ?? [];

  return (
    <Sheet open={apart !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[460px]">
        {apart && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="text-base leading-tight">
                {apart.address}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="tnum">кв. {apart.number}</span>
                <span>· {apart.type_label ?? "квартира"}</span>
                <span className="tnum">· {apart.rooms}-комн · {apart.area} м²</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {apart.is_family && (
                  <Badge className="border-transparent bg-accent text-accent-foreground">
                    семейная ипотека
                  </Badge>
                )}
                <ReserveTag reserve={apart.reserve} />
                <DiscountCell row={apart} />
              </div>
            </SheetHeader>

            <div className="space-y-6 px-5 py-5">
              {apart.plan_url && (
                <a href={apart.plan_url} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={apart.plan_url}
                    alt="Планировка"
                    className="mx-auto max-h-80 w-full rounded-lg border border-border bg-secondary object-contain p-2"
                  />
                </a>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Fact label="Текущая" value={`${money(apart.price)} ₽`} strong />
                <Fact
                  label="Прошлая"
                  value={apart.price_prev ? `${money(apart.price_prev)} ₽` : "—"}
                />
                <Fact
                  label="Максимум"
                  value={apart.price_max ? `${money(apart.price_max)} ₽` : "—"}
                />
              </div>

              {series.length > 1 && (
                <div className="h-28 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={series} margin={{ left: 4, right: 4, top: 4 }}>
                      <defs>
                        <linearGradient id="ap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Tooltip
                        formatter={(v) => [`${money(Number(v))} ₽`, "Цена"]}
                        labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ""}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#ap)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  {apart.metro?.length > 0 && <MetroList stops={apart.metro} limit={3} />}
                </div>
                <a
                  href={apart.mosres_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink size={14} /> Открыть на москварталы.рф
                </a>
                {apart.tour_3d_url && (
                  <a
                    href={apart.tour_3d_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Box size={14} /> 3D-тур
                  </a>
                )}
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">История изменений</div>
                {isLoading && <Skeleton className="h-24 w-full" />}
                {versions && versions.length <= 1 && (
                  <p className="text-sm text-muted-foreground">
                    Пока одна версия — изменений не было.
                  </p>
                )}
                {versions && versions.length > 1 && (
                  <ol className="relative ml-1 border-l border-border">
                    {versions
                      .slice(1)
                      .map((v, i) => ({ v, prev: versions[i] }))
                      .reverse()
                      .map(({ v, prev }) => (
                        <li key={v.version} className="mb-4 ml-4 last:mb-0">
                          <span
                            className={cn(
                              "absolute -left-[5px] mt-1 size-2.5 rounded-full border-2 border-card",
                              "bg-primary",
                            )}
                          />
                          <div className="tnum text-xs text-muted-foreground">
                            {shortDate(v.updated_at)} · v{v.version}
                          </div>
                          <ul className="mt-1 space-y-1 text-sm">
                            {diffLabel(prev, v).map((d, k) => (
                              <li
                                key={k}
                                className={cn(
                                  "tnum rounded-md border border-border bg-secondary/40 px-2 py-1 text-[13px]",
                                  d.tone === "pos" && "text-pos",
                                  d.tone === "neg" && "text-neg",
                                )}
                              >
                                {d.text}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-2.5 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("tnum mt-0.5 text-sm", strong && "font-semibold")}>
        {value}
      </div>
    </div>
  );
}
