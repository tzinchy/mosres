import { useMemo, useState } from "react";
import { ApartsTable } from "@/components/ApartsTable";
import { ApartsToolbar } from "@/components/ApartsToolbar";
import { useAparts, type ApartFilters } from "@/hooks/useAparts";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToggleFavorite } from "@/hooks/useFavorites";

export function ApartsPage() {
  const [filters, setFilters] = useState<ApartFilters>({});
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const effective = useMemo<ApartFilters>(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );
  const { data, isLoading, error } = useAparts(effective);
  const toggle = useToggleFavorite();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Квартиры</h1>
      <ApartsToolbar value={filters} onChange={setFilters} />
      {isLoading && <div>Загрузка…</div>}
      {error && <div className="text-red-600">Ошибка: {String(error)}</div>}
      {data && (
        <ApartsTable
          rows={data}
          onToggleFavorite={(id, next) => toggle.mutate({ id, next })}
        />
      )}
    </div>
  );
}
