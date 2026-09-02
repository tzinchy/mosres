import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { ApartRow } from "@/lib/types";

export interface ApartFilters {
  building_id?: number;
  building_ids?: string;
  favorites_only?: boolean;
  discount_only?: boolean;
  price_drop_only?: boolean;
  reserved_only?: boolean;
  available_only?: boolean;
  family_only?: boolean;
  comment_only?: boolean;
  best_only?: boolean;
  min_price?: number;
  max_price?: number;
  min_discount?: number;
  q?: string;
}

export function useAparts(filters: ApartFilters, enabled = true) {
  return useQuery({
    queryKey: ["aparts", filters],
    queryFn: () => apiGet<ApartRow[]>("/aparts", filters as Record<string, unknown>),
    enabled,
  });
}
