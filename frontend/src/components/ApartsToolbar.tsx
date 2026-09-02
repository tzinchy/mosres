import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApartFilters } from "@/hooks/useAparts";
import { useBuildings } from "@/hooks/useBuildings";
import { useRefreshData } from "@/hooks/useRefresh";
import { cn } from "@/lib/utils";

const TOGGLES: { key: keyof ApartFilters; label: string }[] = [
  { key: "favorites_only", label: "Избранное" },
  { key: "price_drop_only", label: "Дешевле стало" },
  { key: "discount_only", label: "Со скидкой" },
  { key: "reserved_only", label: "В резерве" },
  { key: "family_only", label: "Семейная" },
];

export function ApartsToolbar({
  value,
  onChange,
  count,
}: {
  value: ApartFilters;
  onChange: (f: ApartFilters) => void;
  count?: number;
}) {
  const buildings = useBuildings();
  const refresh = useRefreshData();
  const set = (patch: Partial<ApartFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Адрес, дом или номер"
        defaultValue={value.q ?? ""}
        onChange={(e) => set({ q: e.target.value || undefined })}
        className="h-9 w-56"
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
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Select
        value={value.building_id ? String(value.building_id) : "all"}
        onValueChange={(v) =>
          set({ building_id: v === "all" ? undefined : Number(v) })
        }
      >
        <SelectTrigger className="h-9 w-52">
          <SelectValue placeholder="Все дома" />
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

      <div className="ml-auto flex items-center gap-3">
        {count !== undefined && (
          <span className="tnum text-sm text-muted-foreground">{count} кв.</span>
        )}
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
