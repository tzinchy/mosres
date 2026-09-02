import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type {
  ApartVersion,
  BuildingStat,
  DashboardMetrics,
  DashboardPoint,
  RefreshStatus,
} from "@/lib/types";

export const useDashboard = (favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["dashboard", favoritesOnly],
    queryFn: () =>
      apiGet<DashboardMetrics>("/dashboard", { favorites_only: favoritesOnly }),
  });

export const useDashboardTimeseries = (favoritesOnly: boolean, days = 30) =>
  useQuery({
    queryKey: ["dashboard-ts", favoritesOnly, days],
    queryFn: () =>
      apiGet<DashboardPoint[]>("/dashboard/timeseries", {
        favorites_only: favoritesOnly,
        days,
      }),
  });

export const useBuildingsStats = () =>
  useQuery({
    queryKey: ["buildings-stats"],
    queryFn: () => apiGet<BuildingStat[]>("/buildings/stats"),
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
