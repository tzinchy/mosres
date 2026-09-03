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
  auction_only?: boolean;
  finishing?: "FULL" | "NO" | "STD";
  deadline_max?: number;
  comment_only?: boolean;
  best_only?: boolean;
  min_price?: number;
  max_price?: number;
  min_discount?: number;
  /** client-side: estimated monthly mortgage payment, ₽ (see useMortgageCfg) */
  mtg_min?: number;
  mtg_max?: number;
  q?: string;
}

/** filter keys applied in the browser, never sent to /aparts */
export const CLIENT_ONLY_KEYS = ["mtg_min", "mtg_max"] as const;

export function useAparts(filters: ApartFilters, enabled = true) {
  return useQuery({
    queryKey: ["aparts", filters],
    queryFn: () => apiGet<ApartRow[]>("/aparts", filters as Record<string, unknown>),
    enabled,
  });
}
