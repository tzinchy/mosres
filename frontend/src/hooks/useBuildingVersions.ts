import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface BuildingVersionRow {
  version: number;
  updated_at: string;
  status_code?: string;
  finishing_code?: string | null;
  [key: string]: unknown;
}

export const useBuildingVersions = (id: number) =>
  useQuery({
    queryKey: ["building-versions", id],
    queryFn: () => apiGet<BuildingVersionRow[]>(`/buildings/${id}/versions`),
  });
