import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { ApartRow } from "@/lib/types";

export interface ApartFilters {
  building_id?: number;
  favorites_only?: boolean;
  discount_only?: boolean;
  price_drop_only?: boolean;
  q?: string;
}

export function useAparts(filters: ApartFilters) {
  return useQuery({
    queryKey: ["aparts", filters],
    queryFn: () => apiGet<ApartRow[]>("/aparts", filters as Record<string, unknown>),
  });
}
