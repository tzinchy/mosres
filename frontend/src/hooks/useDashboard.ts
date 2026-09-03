import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type {
  ApartVersion,
  BreakdownRow,
  BuildingStat,
  DashboardChange,
  DeadlinePoint,
  DashboardMetrics,
  DashboardPoint,
  MetroStat,
  Notification,
  PivotDimension,
  PivotMetric,
  PivotPoint,
  PriceHistoryPoint,
  RatesInfo,
  SankeyRow,
  ScatterPoint,
  RefreshStatus,
} from "@/lib/types";

export const useDashboard = (favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["dashboard", favoritesOnly],
    queryFn: () =>
      apiGet<DashboardMetrics>("/dashboard", { favorites_only: favoritesOnly }),
  });

export const useDashboardTimeseries = (
  favoritesOnly: boolean,
  dateFrom?: string,
  dateTo?: string,
) =>
  useQuery({
    queryKey: ["dashboard-ts", favoritesOnly, dateFrom ?? "", dateTo ?? ""],
    queryFn: () =>
      apiGet<DashboardPoint[]>("/dashboard/timeseries", {
        favorites_only: favoritesOnly,
        date_from: dateFrom,
        date_to: dateTo,
      }),
  });

export const useDashboardPivot = (
  dimension: PivotDimension,
  metric: PivotMetric,
  favoritesOnly: boolean,
  dateFrom?: string,
  dateTo?: string,
  district?: string,
) =>
  useQuery({
    queryKey: [
      "pivot",
      dimension,
      metric,
      favoritesOnly,
      dateFrom ?? "",
      dateTo ?? "",
      district ?? "",
    ],
    queryFn: () =>
      apiGet<PivotPoint[]>("/dashboard/pivot", {
        dimension,
        metric,
        favorites_only: favoritesOnly,
        date_from: dimension === "date" ? dateFrom : undefined,
        date_to: dimension === "date" ? dateTo : undefined,
        district: district || undefined,
      }),
  });

export const useScatter = (favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["scatter", favoritesOnly],
    queryFn: () =>
      apiGet<ScatterPoint[]>("/dashboard/scatter", {
        favorites_only: favoritesOnly,
      }),
  });

export const useSankey = (favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["sankey", favoritesOnly],
    queryFn: () =>
      apiGet<SankeyRow[]>("/dashboard/sankey", {
        favorites_only: favoritesOnly,
      }),
  });

export const useDeadlines = (favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["deadlines", favoritesOnly],
    queryFn: () =>
      apiGet<DeadlinePoint[]>("/dashboard/deadlines", {
        favorites_only: favoritesOnly,
      }),
  });

export const useBreakdown = (
  dimension: "district" | "rooms" | "finishing",
  favoritesOnly: boolean,
) =>
  useQuery({
    queryKey: ["breakdown", dimension, favoritesOnly],
    queryFn: () =>
      apiGet<BreakdownRow[]>("/dashboard/breakdown", {
        dimension,
        favorites_only: favoritesOnly,
      }),
  });

export const useDashboardChanges = (date: string, favoritesOnly: boolean) =>
  useQuery({
    queryKey: ["dashboard-changes", date, favoritesOnly],
    queryFn: () =>
      apiGet<DashboardChange[]>("/dashboard/changes", {
        date,
        favorites_only: favoritesOnly,
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

export const useRates = () =>
  useQuery({
    queryKey: ["rates"],
    queryFn: () => apiGet<RatesInfo>("/rates"),
    staleTime: 6 * 60 * 60 * 1000,
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
