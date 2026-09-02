import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { ApartVersion, DashboardMetrics, RefreshStatus } from "@/lib/types";

export const useDashboard = (favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["dashboard", favoritesOnly],
    queryFn: () =>
      apiGet<DashboardMetrics>("/dashboard", { favorites_only: favoritesOnly }),
  });

export const useStatus = () =>
  useQuery({
    queryKey: ["status"],
    queryFn: () => apiGet<RefreshStatus>("/status"),
    refetchInterval: 60_000,
  });

export const useApartVersions = (id: number | null) =>
  useQuery({
    queryKey: ["apart-versions", id],
    queryFn: () => apiGet<ApartVersion[]>(`/aparts/${id}/versions`),
    enabled: id !== null,
  });
