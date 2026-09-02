import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApartRow } from "@/lib/types";
import { DiscountCell } from "./DiscountCell";
import { PriceDelta, money } from "./PriceCell";

const col = createColumnHelper<ApartRow>();

export function ApartsTable({
  rows,
  onToggleFavorite,
}: {
  rows: ApartRow[];
  onToggleFavorite: (id: number, next: boolean) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    col.accessor("is_favorite", {
      header: "★",
      cell: (c) => (
        <button
          type="button"
          onClick={() => onToggleFavorite(c.row.original.new_apart_id, !c.getValue())}
          aria-label="favorite"
        >
          <Star
            size={16}
            className={
              c.getValue()
                ? "fill-yellow-400 stroke-yellow-500"
                : "stroke-muted-foreground"
            }
          />
        </button>
      ),
    }),
    col.accessor("address", { header: "Адрес" }),
    col.accessor("building", {
      header: "Дом",
      cell: (c) =>
        c.row.original.building_id ? (
          <Link className="underline" to={`/buildings/${c.row.original.building_id}`}>
            {c.getValue()}
          </Link>
        ) : (
          c.getValue()
        ),
    }),
    col.accessor("number", { header: "№" }),
    col.accessor("rooms", { header: "Комн." }),
    col.accessor("floor", { header: "Этаж" }),
    col.accessor("area", { header: "S, м²" }),
    col.accessor("price", { header: "Цена", cell: (c) => money(c.getValue()) }),
    col.display({
      id: "delta_prev",
      header: "Δ пред.",
      cell: (c) => (
        <PriceDelta
          abs={c.row.original.price_delta_prev}
          pct={c.row.original.price_delta_prev_pct}
        />
      ),
    }),
    col.accessor("price_delta_max_pct", {
      header: "Δ макс.",
      cell: (c) =>
        c.getValue() === null ? (
          "—"
        ) : (
          <span className="text-red-600">{c.getValue()}%</span>
        ),
    }),
    col.display({
      id: "discount",
      header: "Скидка",
      cell: (c) => <DiscountCell row={c.row.original} />,
    }),
    col.display({
      id: "link",
      header: "",
      cell: (c) => (
        <a
          href={c.row.original.mosres_url}
          target="_blank"
          rel="noreferrer"
          aria-label="источник"
        >
          <ExternalLink size={16} />
        </a>
      ),
    }),
    col.accessor("updated_at", {
      header: "Обновлено",
      cell: (c) => new Date(c.getValue()).toLocaleDateString("ru-RU"),
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((r) => {
            const drop =
              r.original.price_delta_prev !== null &&
              Number(r.original.price_delta_prev) < 0;
            return (
              <TableRow
                key={r.id}
                className={drop ? "bg-red-50 dark:bg-red-950/30" : undefined}
              >
                {r.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
