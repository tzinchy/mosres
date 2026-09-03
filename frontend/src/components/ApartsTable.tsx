import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquareText,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DeadlineBadge,
  DiscountCell,
  FinishingBadge,
  PriceDelta,
  ReserveTag,
} from "@/components/cells";
import { ColumnsMenu } from "@/components/ColumnsMenu";
import { MetroList } from "@/components/MetroList";
import { Badge } from "@/components/ui/badge";
import { useRates } from "@/hooks/useDashboard";
import { useApartCols, type ApartCols } from "@/hooks/useApartCols";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { auctionRange } from "@/lib/auction";
import { money, moneyShort } from "@/lib/format";
import { cfgRate, monthlyFor } from "@/lib/mortgage";
import type { ApartRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const col = createColumnHelper<ApartRow>();
const NUMERIC = new Set(["price", "delta_prev", "delta_max", "mortgage"]);

export function ApartsTable({
  rows,
  onToggleFavorite,
  onSelect,
  selectedId,
  cols,
}: {
  rows: ApartRow[];
  onToggleFavorite: (id: number, next: boolean) => void;
  onSelect: (row: ApartRow) => void;
  selectedId?: number | null;
  /** shared column visibility; when passed, the parent renders its own <ColumnsMenu> */
  cols?: ApartCols;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "delta_prev", desc: false },
  ]);
  const fallback = useApartCols();
  const { visibility, setVisibility } = cols ?? fallback;
  const { data: rateInfo } = useRates();
  const marketRate = rateInfo?.market_rate ?? 20;
  const [mtgCfg] = useMortgageCfg();
  const mtgRate = cfgRate(mtgCfg, marketRate);
  const mtgProgram =
    mtgCfg.program === "family"
      ? "семейная"
      : mtgCfg.program === "market"
        ? "рыночная"
        : "своя";

  const columns = [
    col.accessor("is_favorite", {
      id: "fav",
      header: "",
      size: 40,
      enableSorting: false,
      enableResizing: false,
      cell: (c) => (
        <button
          type="button"
          className="grid place-items-center rounded p-1 hover:bg-secondary"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(c.row.original.new_apart_id, !c.getValue());
          }}
          aria-label={c.getValue() ? "Убрать из избранного" : "В избранное"}
        >
          <Star
            size={15}
            className={
              c.getValue()
                ? "fill-primary stroke-primary"
                : "stroke-muted-foreground"
            }
          />
        </button>
      ),
    }),
    col.accessor("address", {
      id: "address",
      header: "Адрес",
      size: 320,
      minSize: 180,
      cell: (c) => {
        const r = c.row.original;
        return (
          <div className="min-w-0 py-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{c.getValue() ?? "—"}</span>
              {r.has_comment && (
                <MessageSquareText
                  size={13}
                  className="shrink-0 text-muted-foreground"
                  aria-label="есть комментарий"
                />
              )}
              {r.is_family && (
                <Badge className="shrink-0 border-transparent bg-accent text-accent-foreground">
                  семейная
                </Badge>
              )}
              {r.is_auction && (
                <Badge className="shrink-0 border-transparent bg-reserve-soft text-reserve">
                  аукцион
                </Badge>
              )}
              <FinishingBadge code={r.finishing_code} label={r.finishing_label} />
              <DeadlineBadge days={r.deadline_days} />
              <ReserveTag reserve={r.reserve} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {r.building_id ? (
                <Link
                  to={`/buildings/${r.building_id}`}
                  className="truncate hover:text-foreground hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.building ?? `дом ${r.building_id}`}
                </Link>
              ) : (
                <span className="truncate">{r.building}</span>
              )}
              <MetroList stops={r.metro} />
            </div>
          </div>
        );
      },
    }),
    col.accessor((r) => Number(r.area) || 0, {
      id: "params",
      header: "Параметры",
      size: 184,
      minSize: 150,
      cell: (c) => {
        const r = c.row.original;
        return (
          <span className="tnum whitespace-nowrap text-sm">
            {[r.rooms && `${r.rooms}-к`, r.floor && `${r.floor} эт`, r.area && `${r.area} м²`]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
        );
      },
    }),
    col.accessor("price", {
      id: "price",
      header: "Цена, ₽",
      size: 150,
      cell: (c) => {
        const r = c.row.original;
        const disc = r.price_discounted;
        return (
          <div className="tnum leading-tight">
            {disc != null ? (
              <div>
                <span className="font-semibold text-pos">{money(disc)}</span>{" "}
                <span className="text-xs text-muted-foreground line-through">
                  {money(c.getValue())}
                </span>
              </div>
            ) : (
              <div className="font-semibold">{money(c.getValue())}</div>
            )}
            {r.price_m != null && (
              <div className="text-xs text-muted-foreground">
                {money(r.price_m)} / м²
              </div>
            )}
            {r.is_auction && r.price && (
              <div
                className="text-xs text-reserve"
                title="Грубая оценка: городские аукционы обычно закрываются на 10–30% выше старта. Не фактические результаты торгов."
              >
                аукц. ≈ {moneyShort(auctionRange(r.price)[0])}–
                {moneyShort(auctionRange(r.price)[1])}
              </div>
            )}
          </div>
        );
      },
    }),
    col.accessor("price_delta_prev", {
      id: "delta_prev",
      header: "Δ к прошлой",
      size: 156,
      cell: (c) => (
        <PriceDelta
          abs={c.getValue()}
          pctVal={c.row.original.price_delta_prev_pct}
        />
      ),
    }),
    col.accessor("price_delta_max_pct", {
      id: "delta_max",
      header: "Δ к максимуму",
      size: 116,
      cell: (c) =>
        c.getValue() ? (
          <span className="tnum font-medium text-pos">{c.getValue()}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    col.accessor((r) => r.discount_pct ?? 0, {
      id: "discount",
      header: "Скидка",
      size: 128,
      sortDescFirst: true,
      cell: (c) => <DiscountCell row={c.row.original} />,
    }),
    col.accessor((r) => monthlyFor(r.price ?? 0, mtgCfg, marketRate), {
      id: "mortgage",
      header: () => (
        <span
          title={`Оценка по калькулятору: взнос ${moneyShort(mtgCfg.downRub)} ₽, ${mtgProgram} ставка ${mtgRate}%, срок ${mtgCfg.tableTerm} лет. Параметры — на странице «Ипотека».`}
          className="underline decoration-dotted underline-offset-2"
        >
          Ипотека/мес
        </span>
      ),
      size: 130,
      cell: (c) =>
        c.row.original.price ? (
          <span className="tnum whitespace-nowrap text-sm">
            ≈ {money(Math.round(c.getValue()))} ₽
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    col.display({
      id: "plan",
      header: "",
      size: 56,
      enableResizing: false,
      cell: (c) =>
        c.row.original.plan_url ? (
          <img
            src={c.row.original.plan_url}
            alt=""
            loading="lazy"
            className="size-10 rounded border border-border bg-secondary object-cover"
          />
        ) : null,
    }),
    col.accessor("updated_at", {
      id: "updated",
      header: "Обновлено",
      size: 104,
      cell: (c) => (
        <span className="tnum text-xs text-muted-foreground">
          {new Date(c.getValue()).toLocaleDateString("ru-RU")}
        </span>
      ),
    }),
    col.display({
      id: "link",
      header: "",
      size: 44,
      enableResizing: false,
      cell: (c) => (
        <a
          href={c.row.original.mosres_url}
          target="_blank"
          rel="noreferrer"
          className="grid place-items-center rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Открыть на москварталы.рф"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
      ),
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const PAGE = 80;
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLTableRowElement>(null);
  const allRows = table.getRowModel().rows;

  // reset the window whenever the underlying list or sort changes
  useEffect(() => {
    setVisible(PAGE);
  }, [rows, sorting]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => e[0].isIntersecting && setVisible((v) => v + PAGE),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [allRows.length]);

  const shown = allRows.slice(0, visible);

  return (
    <div>
      {!cols && (
        <div className="mb-2 flex justify-end">
          <ColumnsMenu
            value={visibility}
            onChange={setVisibility}
            align="end"
            className="h-8"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table
          className="w-full table-fixed text-sm"
          style={{ minWidth: Math.max(table.getTotalSize(), 720) }}
        >
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className={cn(
                      "group relative select-none px-3 py-2.5 text-xs font-medium text-muted-foreground",
                      NUMERIC.has(h.column.id) ? "text-right" : "text-left",
                    )}
                  >
                    <span
                      onClick={h.column.getToggleSortingHandler()}
                      className={cn(
                        "inline-flex items-center gap-1",
                        h.column.getCanSort() && "cursor-pointer hover:text-foreground",
                        NUMERIC.has(h.column.id) && "flex-row-reverse",
                      )}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{ asc: <ChevronUp size={12} />, desc: <ChevronDown size={12} /> }[
                        h.column.getIsSorted() as string
                      ] ?? null}
                    </span>
                    {h.column.getCanResize() && (
                      <span
                        onMouseDown={h.getResizeHandler()}
                        onTouchStart={h.getResizeHandler()}
                        className={cn(
                          "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none",
                          "opacity-0 group-hover:opacity-100",
                          h.column.getIsResizing()
                            ? "bg-primary opacity-100"
                            : "bg-border",
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {shown.map((r) => {
              const o = r.original;
              const hot =
                o.deadline_days !== null &&
                o.deadline_days >= 0 &&
                o.deadline_days <= 7;
              const drop =
                (o.price_delta_prev !== null && o.price_delta_prev < 0) ||
                o.discount_is_new;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(o)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/60",
                    selectedId === o.new_apart_id && "bg-primary/10",
                    hot && "bg-neg-soft/40",
                    "border-l-[3px]",
                    hot
                      ? "border-l-neg"
                      : drop
                        ? "border-l-pos"
                        : "border-l-transparent",
                  )}
                >
                  {r.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={cn(
                        "overflow-hidden px-3 py-2 align-middle",
                        NUMERIC.has(cell.column.id) && "text-right",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {allRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-16 text-center text-muted-foreground"
                >
                  Ничего не найдено. Смягчите фильтры или обновите данные.
                </td>
              </tr>
            )}
            <tr ref={sentinel} aria-hidden="true" />
          </tbody>
        </table>
      </div>

      {allRows.length > 0 && (
        <div className="tnum mt-2 text-xs text-muted-foreground">
          показано {Math.min(visible, allRows.length)} из {allRows.length}
        </div>
      )}
    </div>
  );
}
