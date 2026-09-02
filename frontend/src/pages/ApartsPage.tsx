import { useAparts } from "@/hooks/useAparts";
import { ApartsTable } from "@/components/ApartsTable";

export function ApartsPage() {
  const { data, isLoading, error } = useAparts({});
  if (isLoading) return <div className="p-6">Загрузка…</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {String(error)}</div>;
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Квартиры</h1>
      <ApartsTable rows={data ?? []} onToggleFavorite={() => {}} />
    </div>
  );
}
