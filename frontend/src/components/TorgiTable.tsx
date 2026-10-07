import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Image, Star, Video } from "lucide-react";
import { PriceDelta } from "@/components/cells";
import { ColumnsMenu } from "@/components/ColumnsMenu";
import { RemoteImg } from "@/components/RemoteImg";
import {
  Dim,
  FinalDeltaBadge,
  PlateCell,
  TorgiDeadlineBadge,
  TorgiStatusCell,
  rowSignal,
  rowSignalClass,
} from "@/components/torgiCells";
import { money } from "@/lib/format";
import type { TorgiLotRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Колонки, которые пользователь прячет через существующий ColumnsMenu. */
export const TORGI_COL_LABELS: Record<string, string> = {
  status: "Статус",
  category: "Категория",
  brand: "Марка и модель",
  year: "Год",
  plate: "Госномер",
  region: "Регион номера",
  vin: "VIN",
  pts: "ПТС",
  color: "Цвет",
  body: "Кузов",
  eco: "Эко-класс",
  power: "Мощность",
  volume: "Объём",
  drive: "Привод",
  transmission: "КПП",
  mileage: "Пробег",
  start_price: "Начальная цена",
  delta_prev: "Δ к прошлой версии",
  deposit: "Задаток",
  step: "Шаг аукциона",
  final_price: "Итоговая цена",
  delta_final: "Δ итог/начало",
  deadline: "Дедлайн заявок",
  request_end: "Приём до",
  tender: "Дата торгов",
  final_date: "Дата итогов",
  photos: "Фото",
  views: "Просмотры",
  version: "Версия",
  updated: "Обновлено",
};

const VIS_KEY = "mosres-torgi-cols";

// редкие характеристики скрыты до первого включения в меню колонок
const DEFAULTS: VisibilityState = {
  region: false,
  pts: false,
  color: false,
  body: false,
  eco: false,
  volume: false,
  drive: false,
  transmission: false,
  deposit: false,
  step: false,
  request_end: false,
  final_date: false,
  views: false,
  version: false,
  updated: false,
};

export interface TorgiCols {
  visibility: VisibilityState;
  setVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
}

export function useTorgiCols(): TorgiCols {
  const [visibility, setVisibility] = useState<VisibilityState>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(VIS_KEY) ?? "{}") };
    } catch {
      return { ...DEFAULTS };
    }
  });
  useEffect(() => {
    localStorage.setItem(VIS_KEY, JSON.stringify(visibility));
  }, [visibility]);
  return { visibility, setVisibility };
}

const col = createColumnHelper<TorgiLotRow>();
const NUMERIC = new Set([
  "year",
  "mileage",
  "start_price",
  "delta_prev",
  "deposit",
  "step",
  "final_price",
  "views",
  "version",
]);

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU") : "—";

export function TorgiTable({
  rows,
  onToggleFavorite,
  onSelect,
  cols,
}: {
  rows: TorgiLotRow[];
  onToggleFavorite: (id: number, next: boolean) => void;
  onSelect: (row: TorgiLotRow) => void;
  /** общая видимость колонок; если передана — тулбар рисует свой ColumnsMenu */
  cols?: TorgiCols;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "deadline", desc: false },
  ]);
  const fallback = useTorgiCols();
  const { visibility, setVisibility } = cols ?? fallback;

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
            onToggleFavorite(c.row.original.lot_id, !c.getValue());
          }}
          aria-label={c.getValue() ? "Убрать из избранного" : "В избранное"}
        >
          <Star
            size={15}
            className={
              c.getValue() ? "fill-primary stroke-primary" : "stroke-muted-foreground"
            }
          />
        </button>
      ),
    }),
    col.accessor("name", {
      id: "name",
      header: "Лот",
      size: 300,
      minSize: 180,
      cell: (c) => {
        const r = c.row.original;
        return (
          <div className="min-w-0 py-0.5">
            <div className="truncate font-medium">{c.getValue() ?? `Лот ${r.lot_id}`}</div>
            <div className="tnum mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>№ {r.lot_id}</span>
              {r.transport_category && <span>· {r.transport_category}</span>}
              {r.photos_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  · <Image size={11} /> {r.photos_count}
                </span>
              )}
              {r.video_link && <Video size={11} aria-label="есть видео" />}
            </div>
          </div>
        );
      },
    }),
    col.accessor("status_text", {
      id: "status",
      header: "Статус",
      size: 170,
      cell: (c) => <TorgiStatusCell row={c.row.original} />,
    }),
    col.accessor("transport_category", {
      id: "category",
      header: "Категория",
      size: 140,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor((r) => [r.brand, r.model].filter(Boolean).join(" ") || null, {
      id: "brand",
      header: "Марка и модель",
      size: 180,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("year", {
      id: "year",
      header: "Год",
      size: 72,
      cell: (c) => <Dim value={c.getValue()} mono />,
    }),
    col.accessor((r) => r.plate_norm ?? "", {
      id: "plate",
      header: "Госномер",
      size: 190,
      cell: (c) => <PlateCell row={c.row.original} />,
    }),
    col.accessor("plate_region", {
      id: "region",
      header: "Регион",
      size: 90,
      cell: (c) => <Dim value={c.getValue()} mono />,
    }),
    col.accessor("vin", {
      id: "vin",
      header: "VIN",
      size: 170,
      cell: (c) =>
        c.getValue() ? (
          <span className="font-mono text-xs">{c.getValue()}</span>
        ) : (
          <Dim value={null} />
        ),
    }),
    col.accessor("pts", {
      id: "pts",
      header: "ПТС",
      size: 110,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("color", {
      id: "color",
      header: "Цвет",
      size: 110,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("body", {
      id: "body",
      header: "Кузов",
      size: 120,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("eco_class", {
      id: "eco",
      header: "Эко-класс",
      size: 100,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("power", {
      id: "power",
      header: "Мощность",
      size: 110,
      cell: (c) => <Dim value={c.getValue()} mono />,
    }),
    col.accessor("engine_volume", {
      id: "volume",
      header: "Объём",
      size: 100,
      cell: (c) => <Dim value={c.getValue()} mono />,
    }),
    col.accessor("drive", {
      id: "drive",
      header: "Привод",
      size: 110,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("transmission", {
      id: "transmission",
      header: "КПП",
      size: 110,
      cell: (c) => <Dim value={c.getValue()} />,
    }),
    col.accessor("mileage", {
      id: "mileage",
      header: "Пробег, км",
      size: 110,
      cell: (c) =>
        c.getValue() === null ? (
          <Dim value={null} />
        ) : (
          <span className="tnum">{money(c.getValue())}</span>
        ),
    }),
    col.accessor("start_price", {
      id: "start_price",
      header: "Начальная, ₽",
      size: 140,
      cell: (c) => (
        <span className="tnum font-semibold">{money(c.getValue())}</span>
      ),
    }),
    col.accessor(
      (r) =>
        r.start_price !== null && r.start_price_prev !== null
          ? r.start_price - r.start_price_prev
          : null,
      {
        id: "delta_prev",
        header: "Δ к прошлой",
        size: 150,
        cell: (c) => (
          <PriceDelta
            abs={c.getValue()}
            pctVal={c.row.original.start_price_delta_pct}
          />
        ),
      },
    ),
    col.accessor("deposit", {
      id: "deposit",
      header: "Задаток, ₽",
      size: 120,
      cell: (c) =>
        c.getValue() === null ? (
          <Dim value={null} />
        ) : (
          <span className="tnum">{money(c.getValue())}</span>
        ),
    }),
    col.accessor("auction_step", {
      id: "step",
      header: "Шаг, ₽",
      size: 110,
      cell: (c) =>
        c.getValue() === null ? (
          <Dim value={null} />
        ) : (
          <span className="tnum">{money(c.getValue())}</span>
        ),
    }),
    col.accessor("final_price", {
      id: "final_price",
      header: "Итоговая, ₽",
      size: 130,
      cell: (c) =>
        c.getValue() === null ? (
          <Dim value={null} />
        ) : (
          <span className="tnum font-medium">{money(c.getValue())}</span>
        ),
    }),
    col.accessor("final_price_delta_pct", {
      id: "delta_final",
      header: "Δ итог/старт",
      size: 120,
      cell: (c) => <FinalDeltaBadge row={c.row.original} />,
    }),
    // лоты без даты окончания уезжают в конец сортировки, а не в начало
    col.accessor((r) => r.days_left ?? Number.MAX_SAFE_INTEGER, {
      id: "deadline",
      header: "Дедлайн заявок",
      size: 140,
      cell: (c) =>
        c.row.original.days_left === null ? (
          <Dim value={null} />
        ) : (
          <TorgiDeadlineBadge days={c.row.original.days_left} />
        ),
    }),
    col.accessor("request_end_date", {
      id: "request_end",
      header: "Приём до",
      size: 110,
      cell: (c) => <span className="tnum text-xs">{date(c.getValue())}</span>,
    }),
    col.accessor("tender_date", {
      id: "tender",
      header: "Торги",
      size: 110,
      cell: (c) => <span className="tnum text-xs">{date(c.getValue())}</span>,
    }),
    col.accessor("final_date", {
      id: "final_date",
      header: "Итоги",
      size: 110,
      cell: (c) => <span className="tnum text-xs">{date(c.getValue())}</span>,
    }),
    col.accessor("photos_count", {
      id: "photos",
      header: "",
      size: 56,
      enableResizing: false,
      cell: (c) =>
        c.row.original.photos[0] ? (
          <RemoteImg
            src={c.row.original.photos[0]}
            className="block size-10 rounded border border-border bg-secondary object-cover"
          />
        ) : null,
    }),
    col.accessor("portal_views", {
      id: "views",
      header: "Просмотры",
      size: 110,
      cell: (c) => <Dim value={c.getValue()} mono />,
    }),
    col.accessor("version", {
      id: "version",
      header: "Версия",
      size: 90,
      cell: (c) => <span className="tnum text-xs">{c.getValue()}</span>,
    }),
    col.accessor("updated_at", {
      id: "updated",
      header: "Обновлено",
      size: 110,
      cell: (c) => (
        <span className="tnum text-xs text-muted-foreground">
          {date(c.getValue())}
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
          href={c.row.original.torgi_url}
          target="_blank"
          rel="noreferrer"
          className="grid place-items-center rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Открыть лот на torgi.mos.ru"
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
            labels={TORGI_COL_LABELS}
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
                          h.column.getIsResizing() ? "bg-primary opacity-100" : "bg-border",
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelect(r.original)}
                className={cn(
                  "cursor-pointer border-b border-l-[3px] border-border/60 last:border-b-0 hover:bg-secondary/60",
                  rowSignalClass(rowSignal(r.original)),
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
            ))}
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
