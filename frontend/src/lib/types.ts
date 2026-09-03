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
  price_discounted: number | null;
  price_prev: number | null;
  price_delta_prev: number | null;
  price_delta_prev_pct: number | null;
  price_max: number | null;
  price_delta_max_pct: number | null;
  has_discount: boolean;
  discount_is_new: boolean;
  discount_pct: number | null;
  is_favorite: boolean;
  has_comment: boolean;
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
  updated_at: string;
  created_at?: string;
  price: string | null;
  price_m: string | null;
  price_with_discount: string | null;
  percentage_discount: string | null;
  reserve: number | null;
  open_sale: number | null;
  area: string | null;
  rooms: string | null;
  floor: string | null;
  number: string | null;
  block: string | null;
  block_name: string | null;
  type: string | null;
  property: string | null;
  num_on_floor: string | null;
  term_of_application: string | null;
  article: string | null;
  advants: string[] | null;
  plan: string | null;
  plan_s: string | null;
  tour_3d: string | null;
  address: string | null;
  building: string | null;
}

export interface Comment {
  id: number;
  new_apart_id: number;
  body: string;
  created_at: string;
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
  favorites_reserved: number;
  favorites_reserved_today: number;
}

export interface Notification {
  new_apart_id: number;
  version: number;
  updated_at: string;
  address: string | null;
  building: string | null;
  number: string | null;
  price: number | null;
  prev_price: number | null;
  price_down: boolean;
  price_up: boolean;
  discount_new: boolean;
  discount_gone: boolean;
  reserved: boolean;
  unreserved: boolean;
}

export interface PriceHistoryPoint {
  district: string;
  day: string;
  avg_price_m: number | null;
  min_price_m: number | null;
  aparts: number;
}

export interface MetroStat {
  metro_id: number;
  name: string | null;
  color: string | null;
  aparts: number;
  favorites: number;
  with_discount: number;
  reserved: number;
  avg_price_m: number | null;
}

export interface DashboardPoint {
  day: string;
  total: number;
  reserved: number;
  discounted: number;
  family: number;
}

export type PivotDimension = "date" | "district" | "rooms" | "building";
export type PivotMetric =
  | "count"
  | "reserved"
  | "discounted"
  | "family"
  | "avg_price"
  | "avg_price_m";

export interface PivotPoint {
  key: string;
  value: number | null;
}

export type ChangeKind =
  | "price_drop"
  | "price_rise"
  | "discount_new"
  | "discount_gone"
  | "reserved"
  | "unreserved"
  | "family_on"
  | "family_off";

export interface DashboardChange {
  new_apart_id: number;
  address: string | null;
  number: string | null;
  kind: ChangeKind;
  prev_price: number | null;
  next_price: number | null;
  pct: number | null;
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
  history_from: string | null;
  history_to: string | null;
}
