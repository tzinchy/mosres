import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type {
  ApartVersion,
  BuildingStat,
  DashboardMetrics,
  DashboardPoint,
  MetroStat,
  Notification,
  PriceHistoryPoint,
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

export const useMetroStats = () =>
  useQuery({
    queryKey: ["metro-stats"],
    queryFn: () => apiGet<MetroStat[]>("/dashboard/metro"),
  });

export const usePriceHistory = () =>
  useQuery({
    queryKey: ["price-history"],
    queryFn: () => apiGet<PriceHistoryPoint[]>("/dashboard/price-history"),
  });

export const useNotifications = (days = 14) =>
  useQuery({
    queryKey: ["notifications", days],
    queryFn: () => apiGet<Notification[]>("/notifications", { days }),
    refetchInterval: 120_000,
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
