import { BuildingsStatsTable } from "@/components/BuildingsStatsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useBuildingsStats } from "@/hooks/useDashboard";

export function BuildingsListPage() {
  const { data, isLoading, error } = useBuildingsStats();

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-5 md:p-8">
      <div>
        <h1 className="text-lg font-semibold">Дома</h1>
        <p className="text-sm text-muted-foreground">
          {data?.length ?? "—"} домов · сортировка по клику на заголовок столбца
        </p>
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-lg" />}
      {error && (
        <p className="text-sm text-neg">Не удалось загрузить статистику по домам.</p>
      )}
      {data && data.length > 0 && <BuildingsStatsTable rows={data} />}
    </div>
  );
}
