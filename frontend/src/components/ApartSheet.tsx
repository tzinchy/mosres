import { Box, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useApartVersions } from "@/hooks/useDashboard";
import { useAddComment, useComments, useDeleteComment } from "@/hooks/useComments";
import { money, pct, shortDate } from "@/lib/format";
import type { ApartRow, ApartVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

const num = (s: string | null) =>
  s ? Number(s.replace(/\D/g, "")) || null : null;

interface Change {
  text: string;
  tone?: "pos" | "neg";
}

// plain scalar fields compared verbatim old → new; price/discount/reserve
// have their own richer rules above and are intentionally left out here
const FIELD_LABELS: Record<string, string> = {
  rooms: "Комнат",
  floor: "Этаж",
  area: "Площадь, м²",
  number: "Номер квартиры",
  block: "Блок",
  block_name: "Корпус",
  type: "Тип",
  property: "Тип собственности",
  num_on_floor: "Квартир на этаже",
  term_of_application: "Срок подачи заявления",
  article: "Артикул",
  address: "Адрес",
  building: "Дом",
  open_sale: "Открытая продажа",
};

const norm = (v: unknown) =>
  v === null || v === undefined
    ? ""
    : Array.isArray(v)
      ? v.join(", ")
      : String(v);

function linkChange(
  label: string,
  x: string | null,
  y: string | null,
): Change | null {
  const before = norm(x);
  const after = norm(y);
  if (before === after) return null;
  if (!before) return { text: `${label}: добавлен`, tone: "pos" };
  if (!after) return { text: `${label}: убран`, tone: "neg" };
  return { text: `${label}: изменён` };
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

  const pctA = num(a.percentage_discount);
  const pctB = num(b.percentage_discount);
  if (pctA !== pctB && (pctA || pctB))
    out.push({ text: `Скидка, %: ${pctA ?? 0} → ${pctB ?? 0}` });

  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const before = norm((a as unknown as Record<string, unknown>)[key]);
    const after = norm((b as unknown as Record<string, unknown>)[key]);
    if (before !== after)
      out.push({ text: `${label}: ${before || "—"} → ${after || "—"}` });
  }

  const tour = linkChange("3D-тур", a.tour_3d, b.tour_3d);
  if (tour) out.push(tour);

  if (norm(a.advants) !== norm(b.advants))
    out.push({ text: "Изменён список преимуществ" });

  // The source re-hashes the floor-plan image URL on almost every refresh
  // without the plan itself changing. Call it out explicitly so a version with
  // no real change doesn't look like an unexplained "update".
  if (norm(a.plan) !== norm(b.plan) || norm(a.plan_s) !== norm(b.plan_s))
    out.push({
      text: out.length
        ? "Также: обновилась ссылка на картинку планировки"
        : "Только техническое: сменилась ссылка на картинку планировки (само изображение то же)",
    });

  return out.length ? out : [{ text: "Изменений в отслеживаемых полях нет" }];
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
                          <stop offset="0%" stopColor="var(--chart)" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="var(--chart)" stopOpacity={0.06} />
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
                        stroke="var(--chart)"
                        strokeWidth={2}
                        fill="url(#ap)"
                        baseValue="dataMin"
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

              <CommentsSection apartId={apart.new_apart_id} />

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

function CommentsSection({ apartId }: { apartId: number }) {
  const { data: comments } = useComments(apartId);
  const add = useAddComment(apartId);
  const del = useDeleteComment(apartId);
  const [text, setText] = useState("");

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    add.mutate(body, { onSuccess: () => setText("") });
  };

  return (
    <div>
      <div className="mb-2 text-sm font-medium">Комментарии</div>
      <div className="space-y-2">
        {(comments ?? []).map((c) => (
          <div
            key={c.id}
            className="group flex items-start justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="whitespace-pre-wrap break-words">{c.body}</div>
              <div className="tnum mt-1 text-xs text-muted-foreground">
                {shortDate(c.created_at)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => del.mutate(c.id)}
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-neg group-hover:opacity-100"
              aria-label="Удалить комментарий"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {comments && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">Пока нет комментариев.</p>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          rows={2}
          placeholder="Заметка по квартире…"
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={add.isPending || !text.trim()}
        >
          Добавить
        </Button>
      </div>
    </div>
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
