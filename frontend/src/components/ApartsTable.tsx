import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DiscountCell, PriceDelta, ReserveTag } from "@/components/cells";
import { MetroList } from "@/components/MetroList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import type { ApartRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const col = createColumnHelper<ApartRow>();

export function ApartsTable({
  rows,
  onToggleFavorite,
  onSelect,
  selectedId,
}: {
  rows: ApartRow[];
  onToggleFavorite: (id: number, next: boolean) => void;
  onSelect: (row: ApartRow) => void;
  selectedId?: number | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "price_delta_prev", desc: false },
  ]);

  const columns = [
    col.accessor("is_favorite", {
      header: "",
      enableSorting: false,
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
      header: "Адрес",
      cell: (c) => {
        const r = c.row.original;
        return (
          <div className="min-w-0 py-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{c.getValue() ?? "—"}</span>
              {r.is_family && (
                <Badge className="shrink-0 border-transparent bg-accent text-accent-foreground">
                  семейная
                </Badge>
              )}
              <ReserveTag reserve={r.reserve} />
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
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
    col.accessor("rooms", {
      header: "Комн.",
      cell: (c) => <span className="tnum">{c.getValue() ?? "—"}</span>,
    }),
    col.accessor("floor", {
      header: "Этаж",
      cell: (c) => <span className="tnum">{c.getValue() ?? "—"}</span>,
    }),
    col.accessor((r) => Number(r.area), {
      id: "area",
      header: "S, м²",
      cell: (c) => <span className="tnum">{c.row.original.area ?? "—"}</span>,
    }),
    col.accessor("price", {
      header: "Цена, ₽",
      cell: (c) => <span className="tnum font-medium">{money(c.getValue())}</span>,
    }),
    col.accessor("price_delta_prev", {
      header: "Δ к прошлой",
      cell: (c) => (
        <PriceDelta
          abs={c.getValue()}
          pctVal={c.row.original.price_delta_prev_pct}
        />
      ),
    }),
    col.accessor("price_delta_max_pct", {
      header: "Δ к максимуму",
      cell: (c) =>
        c.getValue() ? (
          <span className="tnum text-pos">{c.getValue()}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    col.display({
      id: "discount",
      header: "Скидка",
      cell: (c) => <DiscountCell row={c.row.original} />,
    }),
    col.display({
      id: "plan",
      header: "",
      cell: (c) =>
        c.row.original.plan_url ? (
          <img
            src={c.row.original.plan_url}
            alt=""
            loading="lazy"
            className="size-9 rounded border border-border bg-secondary object-cover"
          />
        ) : null,
    }),
    col.display({
      id: "link",
      header: "",
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const NUMERIC = new Set([
    "rooms",
    "floor",
    "area",
    "price",
    "price_delta_prev",
    "price_delta_max_pct",
  ]);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className={cn(
                      "select-none px-3 py-2.5 text-xs font-medium text-muted-foreground",
                      NUMERIC.has(h.column.id) ? "text-right" : "text-left",
                      h.column.getCanSort() && "cursor-pointer hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        NUMERIC.has(h.column.id) && "flex-row-reverse",
                      )}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{ asc: <ChevronUp size={12} />, desc: <ChevronDown size={12} /> }[
                        h.column.getIsSorted() as string
                      ] ?? null}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => {
              const o = r.original;
              const drop =
                (o.price_delta_prev !== null && o.price_delta_prev < 0) ||
                o.discount_is_new;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(o)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/50",
                    selectedId === o.new_apart_id && "bg-primary/5",
                    drop
                      ? "border-l-2 border-l-pos"
                      : "border-l-2 border-l-transparent",
                  )}
                >
                  {r.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2 align-middle",
                        NUMERIC.has(cell.column.id) && "text-right",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-16 text-center text-muted-foreground"
                >
                  Ничего не найдено. Смягчите фильтры или обновите данные.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span className="tnum">
            {table.getState().pagination.pageIndex * 50 + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * 50,
              rows.length,
            )}{" "}
            из {rows.length}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Назад
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
