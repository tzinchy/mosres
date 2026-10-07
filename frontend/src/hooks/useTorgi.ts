import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import type {
  TorgiLotRow,
  TorgiLotVersion,
  TorgiNotification,
} from "@/lib/types";

/** Фильтры /torgi/lots — имена совпадают с параметрами эндпоинта один к одному. */
export interface TorgiFilters {
  lot_id?: number;
  open_only?: boolean;
  status?: string;
  category?: string;
  brand?: string;
  year_min?: number;
  year_max?: number;
  min_price?: number;
  max_price?: number;
  max_mileage?: number;
  price_drop_only?: boolean;
  with_plate_only?: boolean;
  q?: string;
  fav_only?: boolean;
  watch_only?: boolean;
  plate_region?: string;
  valid_plate_only?: boolean;
}

export function useTorgiLots(filters: TorgiFilters, enabled = true) {
  return useQuery({
    queryKey: ["torgi-lots", filters],
    queryFn: () =>
      apiGet<TorgiLotRow[]>("/torgi/lots", filters as Record<string, unknown>),
    enabled,
  });
}

export function useTorgiLot(lotId: number) {
  return useQuery({
    queryKey: ["torgi-lot", lotId],
    queryFn: () => apiGet<TorgiLotRow>(`/torgi/lots/${lotId}`),
    enabled: Number.isFinite(lotId),
  });
}

export function useTorgiLotVersions(lotId: number) {
  return useQuery({
    queryKey: ["torgi-lot-versions", lotId],
    queryFn: () => apiGet<TorgiLotVersion[]>(`/torgi/lots/${lotId}/versions`),
    enabled: Number.isFinite(lotId),
  });
}

export function useTorgiNotifications(days = 30) {
  return useQuery({
    queryKey: ["torgi-notifications", days],
    queryFn: () =>
      apiGet<TorgiNotification[]>("/torgi/notifications", { days }),
    refetchInterval: 120_000,
  });
}

/** Кнопка «обновить сейчас» на торгах. */
export function useRefreshTorgi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiGet("/torgi/update_data"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["torgi-lots"] });
      qc.invalidateQueries({ queryKey: ["torgi-notifications"] });
      toast.success("Данные торгов обновлены");
    },
    onError: (e) => toast.error(`Не удалось обновить: ${e.message}`),
  });
}
