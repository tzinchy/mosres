import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export function ApartsToolbar({
  value,
  onChange,
}: {
  value: ApartFilters;
  onChange: (f: ApartFilters) => void;
}) {
  const buildings = useBuildings();
  const refresh = useRefreshData();
  const set = (patch: Partial<ApartFilters>) => onChange({ ...value, ...patch });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input
        placeholder="Поиск по адресу / дому / №"
        defaultValue={value.q ?? ""}
        onChange={(e) => set({ q: e.target.value || undefined })}
        className="w-64"
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.favorites_only}
          onCheckedChange={(c) => set({ favorites_only: c === true || undefined })}
        />
        только избранное
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.discount_only}
          onCheckedChange={(c) => set({ discount_only: c === true || undefined })}
        />
        со скидкой
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={!!value.price_drop_only}
          onCheckedChange={(c) => set({ price_drop_only: c === true || undefined })}
        />
        с падением цены
      </label>
      <Select
        value={value.building_id ? String(value.building_id) : "all"}
        onValueChange={(v) =>
          set({ building_id: v === "all" ? undefined : Number(v) })
        }
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Дом" />
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
      <Button
        variant="outline"
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending}
      >
        {refresh.isPending ? "Обновление…" : "Обновить данные"}
      </Button>
    </div>
  );
}
