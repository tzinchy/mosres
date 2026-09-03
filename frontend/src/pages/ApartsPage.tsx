import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApartSheet } from "@/components/ApartSheet";
import { ApartsTable } from "@/components/ApartsTable";
import { ApartsToolbar } from "@/components/ApartsToolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useApartCols } from "@/hooks/useApartCols";
import { useAparts, type ApartFilters } from "@/hooks/useAparts";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToggleFavorite } from "@/hooks/useFavorites";
import type { ApartRow } from "@/lib/types";

const BOOL_KEYS: (keyof ApartFilters)[] = [
  "favorites_only",
  "discount_only",
  "price_drop_only",
  "reserved_only",
  "available_only",
  "family_only",
  "auction_only",
  "comment_only",
  "best_only",
];

export function ApartsPage() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<ApartFilters>(() => {
    const f: ApartFilters = {};
    for (const k of BOOL_KEYS) if (params.get(k)) (f[k] as boolean) = true;
    if (params.get("building_id")) f.building_id = Number(params.get("building_id"));
    return f;
  });
  const [selected, setSelected] = useState<ApartRow | null>(null);
  const cols = useApartCols();
  const q = useDebouncedValue(filters.q, 300);
  const effective = useMemo<ApartFilters>(() => ({ ...filters, q }), [filters, q]);

  const { data, isLoading, error } = useAparts(effective);
  const toggle = useToggleFavorite();

  const rows = useMemo(() => {
    if (!data) return data;
    if (!filters.best_only) return data;
    return [...data]
      .filter((r) => (r.deal_score ?? 0) >= 5)
      .sort((a, b) => (b.deal_score ?? 0) - (a.deal_score ?? 0));
  }, [data, filters.best_only]);

  return (
    <div className="space-y-4 p-5 md:p-8">
      <h1 className="text-lg font-semibold">Квартиры</h1>
      <ApartsToolbar
        value={filters}
        onChange={setFilters}
        count={rows?.length}
        cols={cols}
      />

      {isLoading && <Skeleton className="h-96 w-full rounded-lg" />}
      {error && (
        <p className="text-sm text-neg">
          Не удалось загрузить квартиры. Проверьте, что API доступен.
        </p>
      )}
      {rows && (
        <ApartsTable
          rows={rows}
          cols={cols}
          selectedId={selected?.new_apart_id}
          onToggleFavorite={(id, next) => toggle.mutate({ id, next })}
          onSelect={setSelected}
        />
      )}

      <ApartSheet
        apart={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
