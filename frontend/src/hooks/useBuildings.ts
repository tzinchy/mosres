import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { BuildingRow } from "@/lib/types";

export const useBuildings = () =>
  useQuery({
    queryKey: ["buildings"],
    queryFn: () => apiGet<BuildingRow[]>("/buildings"),
  });
