export interface ApartRow {
  new_apart_id: number;
  address: string | null;
  building: string | null;
  building_id: string | null;
  number: string | null;
  rooms: string | null;
  floor: string | null;
  area: string | null;
  price: string | null;
  price_prev: string | null;
  price_delta_prev: string | null;
  price_delta_prev_pct: string | null;
  price_max: string | null;
  price_delta_max_pct: string | null;
  has_discount: boolean;
  discount_is_new: boolean;
  discount_pct: string | null;
  is_favorite: boolean;
  mosres_url: string;
  updated_at: string;
}

export interface BuildingPricePoint {
  snapshot_date: string;
  avg_price_m: string | null;
  min_price_m: string | null;
  median_price_m: string | null;
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
