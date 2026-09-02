import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings2,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DiscountCell, PriceDelta, ReserveTag } from "@/components/cells";
import { MetroList } from "@/components/MetroList";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { money } from "@/lib/format";
import type { ApartRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const col = createColumnHelper<ApartRow>();
const VIS_KEY = "mosres-aparts-cols";
const NUMERIC = new Set(["params", "price", "delta_prev", "delta_max"]);
const COL_LABELS: Record<string, string> = {
  params: "Параметры",
  price: "Цена",
  delta_prev: "Δ к прошлой",
  delta_max: "Δ к максимуму",
  discount: "Скидка",
  plan: "Планировка",
  updated: "Обновлено",
};

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
    { id: "delta_prev", desc: false },
  ]);
  const [visibility, setVisibility] = useState<VisibilityState>(() => {
    try {
      return JSON.parse(localStorage.getItem(VIS_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(VIS_KEY, JSON.stringify(visibility));
  }, [visibility]);

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
              {r.is_family && (
                <Badge className="shrink-0 border-transparent bg-accent text-accent-foreground">
                  семейная
                </Badge>
              )}
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
      size: 128,
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
    col.display({
      id: "discount",
      header: "Скидка",
      size: 128,
      cell: (c) => <DiscountCell row={c.row.original} />,
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
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "h-8 text-muted-foreground",
            })}
          >
            <Settings2 size={14} className="mr-1.5" />
            Колонки
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Показывать колонки</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllLeafColumns()
              .filter((c) => COL_LABELS[c.id])
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                >
                  {COL_LABELS[c.id]}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table
          className="w-full table-fixed text-sm"
          style={{ width: Math.max(table.getTotalSize(), 720) }}
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
                    "cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/60",
                    selectedId === o.new_apart_id && "bg-primary/10",
                    drop
                      ? "border-l-[3px] border-l-pos"
                      : "border-l-[3px] border-l-transparent",
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
