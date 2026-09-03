import { Download, RotateCw, SlidersHorizontal, Star } from "lucide-react";
import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { ColumnsMenu } from "@/components/ColumnsMenu";
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
import type { ApartCols } from "@/hooks/useApartCols";
import type { ApartFilters } from "@/hooks/useAparts";
import { useBuildings } from "@/hooks/useBuildings";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { useRefreshData } from "@/hooks/useRefresh";
import { cn } from "@/lib/utils";

const TOGGLES: { key: keyof ApartFilters; label: string }[] = [
  { key: "best_only", label: "Выгодные" },
  { key: "favorites_only", label: "Избранное" },
  { key: "price_drop_only", label: "Дешевле стало" },
  { key: "discount_only", label: "Со скидкой" },
  { key: "available_only", label: "Не в резерве" },
  { key: "reserved_only", label: "В резерве" },
  { key: "family_only", label: "Семейная" },
  { key: "auction_only", label: "Аукцион" },
  { key: "comment_only", label: "С комментарием" },
];

const FINISHING: { value: ApartFilters["finishing"]; label: string }[] = [
  { value: "FULL", label: "С отделкой" },
  { value: "NO", label: "Без отделки" },
  { value: "STD", label: "По реновации" },
];

// filter keys that count toward the "active filters" badge (q lives in its own input)
const COUNTED: (keyof ApartFilters)[] = [
  ...TOGGLES.map((t) => t.key),
  "building_id",
  "finishing",
  "deadline_max",
  "min_price",
  "max_price",
  "min_discount",
  "mtg_min",
  "mtg_max",
];

function NumInput({
  placeholder,
  value,
  onChange,
  className,
}: {
  placeholder: string;
  value?: number;
  onChange: (n: number | undefined) => void;
  className?: string;
}) {
  return (
    <NumberField
      placeholder={placeholder}
      inputMode="numeric"
      value={value ?? 0}
      onChange={(n) => onChange(n === 0 ? undefined : n)}
      className={cn("h-9 w-full", className)}
    />
  );
}

function fileQuery(f: ApartFilters, favorites = false): string {
  const p = new URLSearchParams();
  if (favorites || f.favorites_only) p.set("favorites_only", "true");
  if (!favorites && f.building_id) p.set("building_id", String(f.building_id));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function ApartsToolbar({
  value,
  onChange,
  count,
  cols,
}: {
  value: ApartFilters;
  onChange: (f: ApartFilters) => void;
  count?: number;
  cols?: ApartCols;
}) {
  const buildings = useBuildings();
  const refresh = useRefreshData();
  const [mtg, setMtg] = useMortgageCfg();
  const [resetKey, setResetKey] = useState(0);

  const set = (patch: Partial<ApartFilters>) => {
    const next = { ...value, ...patch };
    if (patch.available_only) next.reserved_only = undefined;
    if (patch.reserved_only) next.available_only = undefined;
    onChange(next);
  };

  const activeCount = COUNTED.filter((k) => value[k] !== undefined).length;

  const clearAll = () => {
    onChange({ q: value.q });
    setResetKey((k) => k + 1);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Адрес, дом или номер"
        defaultValue={value.q ?? ""}
        onChange={(e) => set({ q: e.target.value || undefined })}
        className="h-9 w-56"
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
            <Select
              value={value.building_id ? String(value.building_id) : "all"}
              onValueChange={(v) =>
                set({ building_id: v === "all" ? undefined : Number(v) })
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Все дома">
                  {(v) =>
                    v && v !== "all"
                      ? (buildings.data?.find(
                          (b) => String(b.building_id) === v,
                        )?.address ?? `Дом ${v}`)
                      : "Все дома"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все дома</SelectItem>
                {(buildings.data ?? []).map((b) => (
                  <SelectItem key={b.building_id} value={String(b.building_id)}>
                    {b.address ?? `Дом ${b.building_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={value.finishing ?? "any"}
              onValueChange={(v) =>
                set({
                  finishing:
                    v === "any" ? undefined : (v as ApartFilters["finishing"]),
                })
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Отделка — любая">
                  {(v) =>
                    FINISHING.find((f) => f.value === v)?.label ??
                    "Отделка — любая"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Отделка — любая</SelectItem>
                {FINISHING.map((f) => (
                  <SelectItem key={f.value} value={f.value as string}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
              placeholder="Скидка от, %"
              value={value.min_discount}
              onChange={(n) => set({ min_discount: n })}
            />
            <NumInput
              placeholder="Заявка ≤ дней"
              value={value.deadline_max}
              onChange={(n) => set({ deadline_max: n })}
            />

            <div className="space-y-1.5 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <NumInput
                  placeholder="Платёж от, ₽/мес"
                  value={value.mtg_min}
                  onChange={(n) => set({ mtg_min: n })}
                />
                <span className="text-muted-foreground">—</span>
                <NumInput
                  placeholder="до"
                  value={value.mtg_max}
                  onChange={(n) => set({ mtg_max: n })}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Срок ипотеки
                </span>
                <NumberField
                  value={mtg.tableTerm}
                  min={1}
                  max={30}
                  inputMode="numeric"
                  onChange={(n) => setMtg({ tableTerm: n })}
                  className="h-8 w-16"
                />
                <span className="text-xs text-muted-foreground">лет</span>
              </div>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Платёж считается по калькулятору: взнос {mtg.downPct}%,{" "}
                {mtg.program === "family"
                  ? "семейная"
                  : mtg.program === "market"
                    ? "рыночная"
                    : "своя"}{" "}
                ставка. Срок влияет и на колонку «Ипотека/мес».
              </p>
            </div>

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
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Сбросить все фильтры
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {cols && (
        <ColumnsMenu value={cols.visibility} onChange={cols.setVisibility} />
      )}

      <div className="ml-auto flex items-center gap-2">
        {count !== undefined && (
          <span className="tnum mr-1 text-sm text-muted-foreground">
            {count} кв.
          </span>
        )}
        <a
          href={`${API_BASE}/file${fileQuery(value)}`}
          download
          title="Выгрузить показанные квартиры в Excel"
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-9" })}
        >
          <Download size={14} className="mr-1.5" />
          Excel
        </a>
        <a
          href={`${API_BASE}/file${fileQuery(value, true)}`}
          download
          title="Выгрузить избранное в Excel"
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-9" })}
        >
          <Star size={14} className="mr-1.5" />
          Избранное
        </a>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
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
