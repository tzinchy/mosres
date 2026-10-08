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
  finishing_code: string | null;
  finishing_label: string | null;
  is_auction: boolean;
  auction_url: string | null;
  term_of_application: string | null;
  deadline_days: number | null;
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
  author: string;
  is_mine: boolean;
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
  auction: number;
}

export type PivotDimension =
  | "date"
  | "district"
  | "rooms"
  | "building"
  | "finishing";
export type PivotMetric =
  | "count"
  | "reserved"
  | "discounted"
  | "family"
  | "auction"
  | "avg_price"
  | "avg_price_m";

export interface PivotPoint {
  key: string;
  value: number | null;
}

export interface ScatterPoint {
  new_apart_id: number;
  address: string | null;
  district: string;
  rooms: string;
  area: number;
  price: number;
  price_m: number | null;
}

export interface SankeyRow {
  district: string;
  rooms: string;
  bucket: string;
  count: number;
}

export interface DeadlinePoint {
  date: string;
  days_left: number;
  count: number;
}

export interface RatesInfo {
  key_rate: number;
  key_rate_date: string | null;
  market_rate: number;
  family_rate: number;
}

export interface BreakdownRow {
  key: string;
  count: number;
  reserved: number;
  discounted: number;
  family: number;
  auction: number;
  avg_price: number | null;
  avg_price_m: number | null;
}

export type ChangeKind =
  | "price_drop"
  | "price_rise"
  | "discount_new"
  | "discount_gone"
  | "reserved"
  | "unreserved"
  | "family_on"
  | "family_off"
  | "auction_on"
  | "auction_off";

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

/** Лот torgi.mos.ru (транспорт) — /torgi/lots, поля считает src/sql/torgi_lots.sql. */
export interface TorgiLotRow {
  lot_id: number;
  name: string | null;
  status_text: string | null;
  is_open: boolean;
  transport_category: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  plate_norm: string | null;
  plate_region: string | null;
  plate_valid: boolean;
  vin: string | null;
  pts: string | null;
  color: string | null;
  body: string | null;
  eco_class: string | null;
  power: string | null;
  engine_volume: string | null;
  drive: string | null;
  transmission: string | null;
  mileage: number | null;
  start_price: number | null;
  deposit: number | null;
  auction_step: number | null;
  final_price: number | null;
  start_price_prev: number | null;
  start_price_delta_pct: number | null;
  final_price_delta_pct: number | null;
  request_start_date: string | null;
  request_end_date: string | null;
  tender_date: string | null;
  final_date: string | null;
  days_left: number | null;
  platform_link: string | null;
  torgi_gov_link: string | null;
  video_link: string | null;
  latitude: string | null;
  longitude: string | null;
  photos: string[];
  photos_count: number;
  portal_views: number | null;
  torgi_url: string;
  version: number;
  updated_at: string;
  is_favorite: boolean;
  /** маски/лейблы паттернов пользователя, под которые подошёл номер */
  matched_masks: string[];
  is_new: boolean;
}

/** Снимок лота из torgi_lots_history — /torgi/lots/{id}/versions. */
export interface TorgiLotVersion {
  lot_id: number;
  version: number;
  updated_at: string;
  name?: string | null;
  status_text: string | null;
  start_price: number | null;
  final_price: number | null;
  deposit: number | null;
  auction_step: number | null;
  plate: string | null;
  plate_norm?: string | null;
  plate_region?: string | null;
  plate_valid?: boolean | null;
  mileage: number | null;
  request_end_date: string | null;
  tender_date: string | null;
}

/** Паттерн номера пользователя — /torgi/watches. mask = null у пресета. */
export interface TorgiWatch {
  id: number;
  mask: string | null;
  label: string | null;
  regex: string;
  matched_now: number;
  created_at: string;
}

/** Готовое правило номера — /torgi/presets. */
export interface TorgiPreset {
  preset: string;
  label: string;
}

export type TorgiNotifKind = "plate_match" | "lot_change";

export interface TorgiNotification {
  kind: TorgiNotifKind;
  lot_id: number;
  name: string | null;
  plate_norm: string | null;
  matched_masks: string[];
  version: number;
  updated_at: string;
  status_text: string | null;
  start_price: number | null;
  prev_start_price: number | null;
  final_price: number | null;
  price_down: boolean;
  price_up: boolean;
  status_changed: boolean;
  sold: boolean;
}

/** Лот недвижимости torgi.mos.ru: квартиры, машино-места, нежилые, ЗУ и прочее. */
export interface TorgiObjectRow {
  lot_id: number;
  object_type_name: string | null;
  name: string | null;
  url: string | null;
  address: string | null;
  short_address: string | null;
  region_name: string | null;
  district_name: string | null;
  object_area: number | null;
  living_area: number | null;
  kitchen_area: number | null;
  rooms_count: number | null;
  room_floor: number | null;
  floors: number | null;
  build_year: number | null;
  house_type: string | null;
  purpose: string | null;
  cadastral_number: string | null;
  start_price: number | null;
  price_per_square: number | null;
  deposit: number | null;
  auction_step: number | null;
  final_price: number | null;
  start_price_prev: number | null;
  start_price_delta_pct: number | null;
  final_price_delta_pct: number | null;
  status_text: string | null;
  request_start_date: string | null;
  request_end_date: string | null;
  tender_date: string | null;
  final_date: string | null;
  days_left: number | null;
  is_live: boolean;
  platform_link: string | null;
  torgi_gov_link: string | null;
  latitude: string | null;
  longitude: string | null;
  photos: string[];
  photos_count: number;
  metro: { name?: string; walk?: number; transport?: number }[];
  details: Record<string, string | null> | null;
  portal_views: number | null;
  is_favorite: boolean;
  version: number;
  updated_at: string | null;
  source_updated_at: string | null;
}

export interface TorgiObjectStat {
  object_type_name: string;
  lots: number;
  live_lots: number;
  sold_lots: number;
  avg_start_price: number | null;
  sum_start_price: number | null;
  avg_price_per_square: number | null;
  avg_area: number | null;
  favorites: number;
  sum_views: number | null;
  avg_views: number | null;
}

export interface TorgiObjectVersion {
  version: number;
  updated_at: string | null;
  status_text: string | null;
  start_price: number | null;
  final_price: number | null;
  deposit: number | null;
  request_end_date: string | null;
  tender_date: string | null;
  start_price_prev: number | null;
  status_text_prev: string | null;
}

export interface TorgiObjectViewPoint {
  day: string;
  views: number;
}

export interface TorgiObjectSegment {
  object_type_name: string;
  region_name: string;
  finished: number;
  sold: number;
  sold_share: number | null;
  median_final_ppm: number | null;
  median_premium: number | null;
  at_start_share: number | null;
  median_views: number | null;
  live_lots: number;
}

export interface TorgiObjectDeal {
  lot_id: number;
  object_type_name: string | null;
  short_address: string | null;
  region_name: string | null;
  district_name: string | null;
  object_area: number | null;
  start_price: number | null;
  start_ppm: number;
  bench_ppm: number;
  bench_level: "house" | "district" | "region";
  bench_n: number;
  discount: number;
  est_final_price: number | null;
  deposit: number | null;
  request_end_date: string | null;
  tender_date: string | null;
  portal_views: number | null;
  p_sold: number | null;
  p_competed: number | null;
}

/** Шанс живого лота по скорости просмотров (src/sql/torgi_objects_odds.sql). */
export interface TorgiObjectOdds {
  lot_id: number;
  object_type_name: string | null;
  views_per_day: number;
  bucket: number;
  p_sold: number;
  p_competed: number | null;
  n: number;
}

export interface TorgiObjectInvest {
  segments: TorgiObjectSegment[];
  deals: TorgiObjectDeal[];
}

export interface TorgiObjectBreakdownRow {
  label: string;
  lots: number;
  live_lots: number;
  avg_start_price: number | null;
  avg_price_per_square: number | null;
  avg_area: number | null;
  sum_views: number | null;
  avg_views: number | null;
}

/* --- Сводка по недвижимости: контракт GET /torgi/objects/dashboard --- */

export interface TorgiObjectKpi {
  lots: number;
  live_lots: number;
  sold_lots: number;
  object_types: number;
  avg_start_price: number | null;
  sum_start_price: number | null;
  sum_final_price: number | null;
  /** сумма начальных цен только у проданных лотов — с ней сравнивается итог */
  sum_start_price_sold: number | null;
  sold_share: number | null;
  at_start_share: number | null;
  apartment_median_ppm: number | null;
  median_final_delta_pct: number | null;
  avg_area: number | null;
  avg_price_per_square: number | null;
  avg_days_request_to_tender: number | null;
  photos_coverage_pct: number | null;
  changed_24h: number;
  sum_portal_views: number | null;
  avg_portal_views: number | null;
  median_portal_views: number | null;
  max_portal_views: number | null;
}

/** Заполненность полей процентами 0–100. `card` — доля дочитанных карточек портала. */
export interface TorgiObjectDataQuality {
  lots: number;
  address: number | null;
  area: number | null;
  rooms: number | null;
  cadastral: number | null;
  build_year: number | null;
  photos: number | null;
  coords: number | null;
  metro: number | null;
  /** сколько лотов вошло в знаменатель: поле считается по типам, где оно бывает */
  rooms_of: number | null;
  cadastral_of: number | null;
  build_year_of: number | null;
  metro_of: number | null;
  card: number | null;
}

export interface TorgiObjectTimePoint {
  month: string;
  lots: number;
  sum_final_price: number | null;
  avg_delta_pct: number | null;
  avg_price_per_square: number | null;
}

export interface TorgiObjectDeadlineRow {
  lot_id: number;
  name: string | null;
  object_type_name: string | null;
  short_address: string | null;
  status_text: string | null;
  request_end_date: string;
  days_left: number;
  start_price: number | null;
  object_area: number | null;
}

export interface TorgiObjectChange {
  lot_id: number;
  name: string | null;
  object_type_name: string | null;
  version: number;
  updated_at: string;
  status_text: string | null;
  prev_status_text: string | null;
  start_price: number | null;
  prev_start_price: number | null;
  final_price: number | null;
  delta_pct: number | null;
  price_down: boolean;
  price_up: boolean;
  status_changed: boolean;
  sold: boolean;
}

export interface TorgiObjectTopLot {
  lot_id: number;
  name: string | null;
  object_type_name: string | null;
  short_address: string | null;
  object_area: number | null;
  start_price: number | null;
  prev_start_price: number | null;
  final_price: number | null;
  price_per_square: number | null;
  delta_pct: number | null;
  portal_views: number | null;
}

/** Точка карты/скаттера: координаты портал отдаёт строками. */
export interface TorgiObjectPoint {
  lot_id: number;
  object_type_name: string | null;
  short_address: string | null;
  latitude: string | null;
  longitude: string | null;
  start_price: number | null;
  price_per_square: number | null;
  object_area: number | null;
  rooms_count: number | null;
  portal_views: number | null;
  is_live: boolean;
}

/* Структуры, общие со сводкой транспорта (src/schemas.py: Torgi*). */
export interface TorgiFunnelStage {
  status: string | null;
  lots: number;
}
export interface TorgiSeasonPoint {
  month_of_year: number;
  lots: number;
}
export interface TorgiHistBin {
  bucket: string | number | null;
  lots: number;
}
export interface TorgiVersionActivity {
  versions: { bucket: string | number | null; lots: number }[];
  changes_by_day: { day: string; changes: number }[];
}

export interface TorgiObjectDashboard {
  last_refresh: string | null;
  kpi: TorgiObjectKpi;
  types: TorgiObjectStat[];
  regions: TorgiObjectBreakdownRow[];
  funnel: TorgiFunnelStage[];
  timeseries: TorgiObjectTimePoint[];
  seasonality: TorgiSeasonPoint[];
  deadlines: TorgiObjectDeadlineRow[];
  changes: TorgiObjectChange[];
  area_hist: TorgiHistBin[];
  price_per_square_hist: TorgiHistBin[];
  premium_hist: TorgiHistBin[];
  views_hist: TorgiHistBin[];
  top_drop: TorgiObjectTopLot[];
  top_premium: TorgiObjectTopLot[];
  top_views: TorgiObjectTopLot[];
  data_quality: TorgiObjectDataQuality;
  version_activity: TorgiVersionActivity;
}
