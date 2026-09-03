import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApartSheet } from "@/components/ApartSheet";
import { ApartsTable } from "@/components/ApartsTable";
import { ApartsToolbar } from "@/components/ApartsToolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useApartCols } from "@/hooks/useApartCols";
import {
  CLIENT_ONLY_KEYS,
  useAparts,
  type ApartFilters,
} from "@/hooks/useAparts";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { useRates } from "@/hooks/useDashboard";
import { monthlyFor } from "@/lib/mortgage";
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
    if (params.get("deadline_max"))
      f.deadline_max = Number(params.get("deadline_max"));
    const fin = params.get("finishing");
    if (fin === "FULL" || fin === "NO" || fin === "STD") f.finishing = fin;
    return f;
  });
  const [selected, setSelected] = useState<ApartRow | null>(null);
  const cols = useApartCols();
  const q = useDebouncedValue(filters.q, 300);
  const [mtgCfg] = useMortgageCfg();
  const { data: rates } = useRates();
  const marketRate = rates?.market_rate ?? 20;

  const effective = useMemo<ApartFilters>(() => {
    const f: ApartFilters = { ...filters, q };
    for (const k of CLIENT_ONLY_KEYS) delete f[k];
    return f;
  }, [filters, q]);

  const { data, isLoading, error } = useAparts(effective);
  const toggle = useToggleFavorite();

  const rows = useMemo(() => {
    if (!data) return data;
    let r = data;
    if (filters.best_only) {
      r = [...r]
        .filter((x) => (x.deal_score ?? 0) >= 5)
        .sort((a, b) => (b.deal_score ?? 0) - (a.deal_score ?? 0));
    }
    const { mtg_min, mtg_max } = filters;
    if (mtg_min != null || mtg_max != null) {
      r = r.filter((x) => {
        if (!x.price) return false;
        const m = monthlyFor(x.price, mtgCfg, marketRate);
        if (mtg_min != null && m < mtg_min) return false;
        if (mtg_max != null && m > mtg_max) return false;
        return true;
      });
    }
    return r;
  }, [data, filters.best_only, filters.mtg_min, filters.mtg_max, mtgCfg, marketRate]);

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
