import { Download, RotateCw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ColumnsMenu } from "@/components/ColumnsMenu";
import { TORGI_COL_LABELS, type TorgiCols } from "@/components/TorgiTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRefreshTorgi, type TorgiFilters } from "@/hooks/useTorgi";
import { API_BASE } from "@/lib/api";
import type { TorgiLotRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOGGLES: { key: keyof TorgiFilters; label: string }[] = [
  { key: "watch_only", label: "Под мои паттерны" },
  { key: "fav_only", label: "Избранное" },
  { key: "open_only", label: "Приём заявок открыт" },
  { key: "price_drop_only", label: "Цена упала" },
  { key: "with_plate_only", label: "С номером" },
  { key: "valid_plate_only", label: "Номер разобран" },
];

const COUNTED: (keyof TorgiFilters)[] = [
  ...TOGGLES.map((t) => t.key),
  "status",
  "category",
  "brand",
  "plate_region",
  "year_min",
  "year_max",
  "min_price",
  "max_price",
  "max_mileage",
];

function NumInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value?: number;
  onChange: (n: number | undefined) => void;
}) {
  return (
    <NumberField
      placeholder={placeholder}
      inputMode="numeric"
      value={value ?? 0}
      onChange={(n) => onChange(n === 0 ? undefined : n)}
      className="h-9 w-full"
    />
  );
}

/** Выгрузка в Excel идёт ровно теми же фильтрами, что и таблица. */
function fileQuery(f: TorgiFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Варианты справочников берём из уже загруженных строк — без лишних запросов. */
function distinct(rows: TorgiLotRow[] | undefined, pick: (r: TorgiLotRow) => string | null) {
  const set = new Set<string>();
  for (const r of rows ?? []) {
    const v = pick(r);
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

function FacetSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : String(v))}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder={allLabel}>
          {(v) => (v && v !== "all" ? String(v) : allLabel)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TorgiToolbar({
  value,
  onChange,
  rows,
  count,
  cols,
}: {
  value: TorgiFilters;
  onChange: (f: TorgiFilters) => void;
  /** загруженные строки — из них собираются списки статусов, категорий, марок */
  rows?: TorgiLotRow[];
  count?: number;
  cols?: TorgiCols;
}) {
  const refresh = useRefreshTorgi();
  const [resetKey, setResetKey] = useState(0);

  const facets = useMemo(
    () => ({
      statuses: distinct(rows, (r) => r.status_text),
      categories: distinct(rows, (r) => r.transport_category),
      brands: distinct(rows, (r) => r.brand),
      regions: distinct(rows, (r) => r.plate_region),
    }),
    [rows],
  );

  const set = (patch: Partial<TorgiFilters>) => onChange({ ...value, ...patch });
  const activeCount = COUNTED.filter((k) => value[k] !== undefined).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Название, марка, модель, номер, VIN"
        defaultValue={value.q ?? ""}
        onChange={(e) => set({ q: e.target.value || undefined })}
        className="h-9 w-64"
      />

      <Popover>
        <PopoverTrigger
          className={buttonVariants({
            variant: activeCount ? "default" : "outline",
            size: "sm",
            className: "h-9",
          })}
        >
          <SlidersHorizontal size={14} className="mr-1.5" />
          Фильтры
          {activeCount > 0 && (
            <span className="tnum ml-1.5 rounded-full bg-background/25 px-1.5 text-xs">
              {activeCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[22rem] space-y-3">
          <div key={resetKey} className="space-y-3">
            <FacetSelect
              value={value.status}
              onChange={(v) => set({ status: v })}
              options={facets.statuses}
              allLabel="Любой статус"
            />
            <FacetSelect
              value={value.category}
              onChange={(v) => set({ category: v })}
              options={facets.categories}
              allLabel="Все категории"
            />
            <FacetSelect
              value={value.brand}
              onChange={(v) => set({ brand: v })}
              options={facets.brands}
              allLabel="Все марки"
            />
            <FacetSelect
              value={value.plate_region}
              onChange={(v) => set({ plate_region: v })}
              options={facets.regions}
              allLabel="Любой регион номера"
            />

            <div className="flex items-center gap-2">
              <NumInput
                placeholder="Год от"
                value={value.year_min}
                onChange={(n) => set({ year_min: n })}
              />
              <span className="text-muted-foreground">—</span>
              <NumInput
                placeholder="до"
                value={value.year_max}
                onChange={(n) => set({ year_max: n })}
              />
            </div>
            <div className="flex items-center gap-2">
              <NumInput
                placeholder="Цена от, ₽"
                value={value.min_price}
                onChange={(n) => set({ min_price: n })}
              />
              <span className="text-muted-foreground">—</span>
              <NumInput
                placeholder="до, ₽"
                value={value.max_price}
                onChange={(n) => set({ max_price: n })}
              />
            </div>
            <NumInput
              placeholder="Пробег не больше, км"
              value={value.max_mileage}
              onChange={(n) => set({ max_mileage: n })}
            />

            <div className="flex flex-wrap gap-1.5">
              {TOGGLES.map(({ key, label }) => {
                const on = !!value[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set({ [key]: on ? undefined : true })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      on
                        ? "border-primary bg-primary/15 font-medium text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChange({ q: value.q });
                  setResetKey((k) => k + 1);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Сбросить все фильтры
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {cols && (
        <ColumnsMenu
          value={cols.visibility}
          onChange={cols.setVisibility}
          labels={TORGI_COL_LABELS}
        />
      )}

      <div className="ml-auto flex items-center gap-2">
        {count !== undefined && (
          <span className="tnum mr-1 text-sm text-muted-foreground">{count} лот.</span>
        )}
        <a
          href={`${API_BASE}/torgi/file${fileQuery(value)}`}
          download
          title="Выгрузить показанные лоты в Excel"
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-9" })}
        >
          <Download size={14} className="mr-1.5" />
          Excel
        </a>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          title="Сходить на torgi.mos.ru прямо сейчас"
        >
          <RotateCw
            size={14}
            className={cn("mr-1.5", refresh.isPending && "animate-spin")}
          />
          Обновить
        </Button>
      </div>
    </div>
  );
}
