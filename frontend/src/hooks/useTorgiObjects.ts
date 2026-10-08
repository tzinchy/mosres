import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type {
  TorgiObjectBreakdownRow,
  TorgiObjectRow,
  TorgiObjectStat,
  TorgiObjectVersion,
} from "@/lib/types";

/** Фильтры /torgi/objects — имена совпадают с параметрами эндпоинта. */
export interface TorgiObjectFilters {
  object_type?: string;
  district?: string;
  region?: string;
  fav_only?: boolean;
  live_only?: boolean;
  sold_only?: boolean;
  price_drop_only?: boolean;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  rooms?: number;
  q?: string;
  limit?: number;
}

export function useTorgiObjects(filters: TorgiObjectFilters) {
  return useQuery({
    queryKey: ["torgi-objects", filters],
    queryFn: () =>
      apiGet<TorgiObjectRow[]>(
        "/torgi/objects",
        filters as Record<string, unknown>,
      ),
  });
}

export function useTorgiObject(lotId: number) {
  return useQuery({
    queryKey: ["torgi-object", lotId],
    queryFn: () => apiGet<TorgiObjectRow>(`/torgi/objects/${lotId}`),
    enabled: Number.isFinite(lotId),
  });
}

export function useTorgiObjectVersions(lotId: number) {
  return useQuery({
    queryKey: ["torgi-object-versions", lotId],
    queryFn: () =>
      apiGet<TorgiObjectVersion[]>(`/torgi/objects/${lotId}/versions`),
    enabled: Number.isFinite(lotId),
  });
}

export function useTorgiObjectsStats() {
  return useQuery({
    queryKey: ["torgi-objects-stats"],
    queryFn: () => apiGet<TorgiObjectStat[]>("/torgi/objects/stats"),
  });
}

export type ObjectDimension =
  | "region"
  | "district"
  | "object_type"
  | "house_type"
  | "rooms";

export function useTorgiObjectsBreakdown(
  dimension: ObjectDimension,
  objectType?: string,
) {
  return useQuery({
    queryKey: ["torgi-objects-breakdown", dimension, objectType ?? null],
    queryFn: () =>
      apiGet<TorgiObjectBreakdownRow[]>("/torgi/objects/breakdown", {
        dimension,
        object_type: objectType,
      }),
  });
}

/** Избранное: список обновляем на месте, чтобы звёздочка не мигала. */
export function useToggleTorgiObjectFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      next
        ? apiPost(`/torgi/objects/favorites/${id}`)
        : apiDelete(`/torgi/objects/favorites/${id}`),
    onSuccess: (_data, { id, next }) => {
      qc.setQueriesData<TorgiObjectRow[]>(
        { queryKey: ["torgi-objects"] },
        (rows) =>
          rows?.map((r) => (r.lot_id === id ? { ...r, is_favorite: next } : r)),
      );
      qc.setQueriesData<TorgiObjectRow>({ queryKey: ["torgi-object"] }, (lot) =>
        lot && lot.lot_id === id ? { ...lot, is_favorite: next } : lot,
      );
      qc.invalidateQueries({ queryKey: ["torgi-objects-stats"] });
    },
    onError: () => toast.error("Не удалось изменить избранное"),
  });
}
