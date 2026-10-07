import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TorgiTable, useTorgiCols } from "@/components/TorgiTable";
import { TorgiToolbar } from "@/components/TorgiToolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTorgiLots, type TorgiFilters } from "@/hooks/useTorgi";
import { useToggleTorgiFavorite } from "@/hooks/useTorgiFavorites";

const BOOL_KEYS: (keyof TorgiFilters)[] = [
  "open_only",
  "price_drop_only",
  "with_plate_only",
  "fav_only",
  "watch_only",
  "valid_plate_only",
];
const NUM_KEYS: (keyof TorgiFilters)[] = [
  "year_min",
  "year_max",
  "min_price",
  "max_price",
  "max_mileage",
];
const STR_KEYS: (keyof TorgiFilters)[] = ["status", "category", "brand", "plate_region"];

export function TorgiCarsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<TorgiFilters>(() => {
    const f: TorgiFilters = {};
    for (const k of BOOL_KEYS) if (params.get(k)) (f[k] as boolean) = true;
    for (const k of NUM_KEYS) {
      const v = params.get(k);
      if (v) (f[k] as number) = Number(v);
    }
    for (const k of STR_KEYS) {
      const v = params.get(k);
      if (v) (f[k] as string) = v;
    }
    const q = params.get("q");
    if (q) f.q = q;
    return f;
  });
  const cols = useTorgiCols();
  const q = useDebouncedValue(filters.q, 300);
  const effective = useMemo<TorgiFilters>(() => ({ ...filters, q }), [filters, q]);
  const { data, isLoading, error } = useTorgiLots(effective);
  const toggle = useToggleTorgiFavorite();

  return (
    <div className="space-y-4 p-5 md:p-8">
      <h1 className="text-lg font-semibold">Машины с торгов</h1>
      <TorgiToolbar
        value={filters}
        onChange={setFilters}
        rows={data}
        count={data?.length}
        cols={cols}
      />

      {isLoading && <Skeleton className="h-96 w-full rounded-lg" />}
      {error && (
        <p className="text-sm text-neg">
          Не удалось загрузить лоты. Проверьте, что API доступен.
        </p>
      )}
      {data && (
        <TorgiTable
          rows={data}
          cols={cols}
          onToggleFavorite={(id, next) => toggle.mutate({ id, next })}
          onSelect={(row) => navigate(`/torgi/cars/${row.lot_id}`)}
        />
      )}
    </div>
  );
}
