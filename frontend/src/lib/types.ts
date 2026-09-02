export interface MetroStop {
  name: string | null;
  color: string | null;
  car: string | null;
  walk: string | null;
}

export interface ApartRow {
  new_apart_id: number;
  address: string | null;
  building: string | null;
  building_id: string | null;
  number: string | null;
  rooms: string | null;
  floor: string | null;
  area: string | null;
  reserve: number | null;
  property: string | null;
  is_family: boolean;
  price: number | null;
  price_m: number | null;
  price_prev: number | null;
  price_delta_prev: number | null;
  price_delta_prev_pct: number | null;
  price_max: number | null;
  price_delta_max_pct: number | null;
  has_discount: boolean;
  discount_is_new: boolean;
  discount_pct: number | null;
  is_favorite: boolean;
  type_label: string | null;
  plan_url: string | null;
  tour_3d_url: string | null;
  metro: MetroStop[];
  family_hypotec: number | null;
  deal_score: number | null;
  mosres_url: string;
  updated_at: string;
}

export interface ApartVersion {
  new_apart_id: number;
  version: number;
  price: string | null;
  price_m: string | null;
  price_with_discount: string | null;
  percentage_discount: string | null;
  reserve: number | null;
  area: string | null;
  rooms: string | null;
  floor: string | null;
  term_of_application: string | null;
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
  code: string | null;
  status_code: string | null;
  status_label: string | null;
  finishing_code: string | null;
  finishing_label: string | null;
  floors: string | null;
  flats: string | null;
  vvod: string | null;
  family_hypotec: number | null;
  latitude: number | null;
  longitude: number | null;
  anons_texts: string[] | null;
  img_url: string | null;
  gallery_urls: string[];
  metro: MetroStop[];
  favorites_count: number;
}

export interface DashboardMetrics {
  aparts_total: number;
  favorites_total: number;
  buildings_total: number;
  reserved_total: number;
  discount_total: number;
  family_total: number;
  portfolio_value: number | null;
  avg_price: number | null;
  avg_price_m: number | null;
  new_today: number;
  changed_today: number;
  price_drops_today: number;
  price_rises_today: number;
  avg_price_change_pct_today: number | null;
  discounts_appeared_today: number;
  reserved_today: number;
  unreserved_today: number;
}

export interface DashboardPoint {
  day: string;
  new_aparts: number;
  changes: number;
  drops: number;
  rises: number;
  new_discounts: number;
  reserved: number;
  avg_change_pct: number | null;
}

export interface BuildingStat {
  building_id: number;
  address: string | null;
  status_label: string | null;
  img_url: string | null;
  aparts: number;
  avg_price: number | null;
  min_price: number | null;
  avg_price_m: number | null;
  reserved: number;
  with_discount: number;
  family: number;
  new_week: number;
  favorites_count: number;
}

export interface RefreshStatus {
  last_refresh: string | null;
  interval_minutes: number;
}
