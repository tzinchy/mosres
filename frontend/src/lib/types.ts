export interface ApartRow {
  new_apart_id: number;
  address: string | null;
  building: string | null;
  building_id: string | null;
  number: string | null;
  rooms: string | null;
  floor: string | null;
  area: string | null;
  price: number | null;
  price_prev: number | null;
  price_delta_prev: number | null;
  price_delta_prev_pct: number | null;
  price_max: number | null;
  price_delta_max_pct: number | null;
  has_discount: boolean;
  discount_is_new: boolean;
  discount_pct: number | null;
  is_favorite: boolean;
  mosres_url: string;
  updated_at: string;
}

export interface BuildingPricePoint {
  snapshot_date: string;
  avg_price_m: number | null;
  min_price_m: number | null;
  median_price_m: number | null;
  apart_count: number;
}

export interface BuildingRow {
  building_id: number;
  address: string | null;
  status_code: string;
  finishing_code: string | null;
  metro: string[] | null;
  vvod: string | null;
}
