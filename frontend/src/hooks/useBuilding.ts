import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BuildingPricePoint, BuildingRow } from "@/lib/types";

export const useBuildingPriceDynamics = (id: number) =>
  useQuery({
    queryKey: ["price-dynamics", id],
    queryFn: () =>
      apiGet<BuildingPricePoint[]>(`/buildings/${id}/price-dynamics`),
  });

export function useBuilding(id: number) {
  return useQuery({
    queryKey: ["building", id],
    queryFn: async () => {
      const all = await apiGet<BuildingRow[]>("/buildings");
      return all.find((b) => b.building_id === id) ?? null;
    },
  });
}
