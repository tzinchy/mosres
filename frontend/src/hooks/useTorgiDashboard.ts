import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

// Типы дашборда торгов живут здесь, а не в lib/types.ts: таблицу лотов пишет
// другой автор, пересекаться в одном файле незачем.

export type TorgiKpi = {
  lots: number;
  open_lots: number;
  sold_lots: number;
  avg_start_price: number | null;
  sum_start_price: number | null;
  sum_final_price: number | null;
  median_final_delta_pct: number | null;
  with_plate: number;
  interesting_plates: number;
  watch_matches: number;
  avg_days_request_to_tender: number | null;
  photos_coverage_pct: number | null;
  changed_24h: number;
};

export type TorgiCategoryRow = {
  category: string | null;
  lots: number;
  open_lots: number;
  sold_lots: number;
  avg_start_price: number | null;
  min_start_price: number | null;
  avg_final_price: number | null;
  avg_mileage: number | null;
  with_plate: number;
};

export type TorgiBrandRow = {
  brand: string | null;
  lots: number;
  avg_start_price: number | null;
  avg_delta_pct: number | null;
};

export type TorgiFunnelRow = { status: string | null; lots: number };

export type TorgiTimeseriesRow = {
  month: string;
  lots: number;
  sum_final_price: number | null;
  avg_delta_pct: number | null;
};

export type TorgiSeasonRow = { month_of_year: number; lots: number };

export type TorgiDeadlineRow = {
  lot_id: number;
  name: string | null;
  request_end_date: string | null;
  days_left: number | null;
  start_price: number | null;
};

export type TorgiChangeRow = {
  lot_id: number;
  name: string | null;
  version: number | null;
  updated_at: string | null;
  start_price: number | null;
  prev_start_price: number | null;
  status_text: string | null;
  prev_status_text: string | null;
  final_price: number | null;
};

/** bucket — подпись корзины: у дисконта это диапазон, у года/пробега число. */
export type TorgiBucketRow = { bucket: string | number | null; lots: number };

export type TorgiTopLot = {
  lot_id: number;
  name: string | null;
  start_price: number | null;
  prev_start_price: number | null;
  final_price: number | null;
  delta_pct: number | null;
};

export type TorgiTopViewLot = {
  lot_id: number;
  name: string | null;
  portal_views: number | null;
  start_price: number | null;
};

export type TorgiDataQuality = {
  plate: number | null;
  vin: number | null;
  pts: number | null;
  photos: number | null;
  video: number | null;
  coords: number | null;
};

export type TorgiPlateFlavorRow = { preset: string; lots: number };

export type TorgiVersionActivity = {
  /** распределение числа версий на лот; имя массива уточняется с бэкендом */
  versions?: TorgiBucketRow[];
  versions_bucket?: TorgiBucketRow[];
  changes_by_day: { day: string; changes: number }[];
};

export type TorgiDashboard = {
  kpi: TorgiKpi;
  categories: TorgiCategoryRow[];
  brands: TorgiBrandRow[];
  funnel: TorgiFunnelRow[];
  timeseries: TorgiTimeseriesRow[];
  seasonality: TorgiSeasonRow[];
  deadlines: TorgiDeadlineRow[];
  changes: TorgiChangeRow[];
  discount_hist: TorgiBucketRow[];
  year_hist: TorgiBucketRow[];
  mileage_hist: TorgiBucketRow[];
  top_drop: TorgiTopLot[];
  top_premium: TorgiTopLot[];
  top_views: TorgiTopViewLot[];
  data_quality: TorgiDataQuality;
  plate_flavors: TorgiPlateFlavorRow[];
  version_activity: TorgiVersionActivity;
  /** когда джоба последний раз обновляла лоты; необязательное поле */
  last_refresh?: string | null;
};

export const TORGI_PIVOT_DIMENSIONS = {
  transport_category: "Категория",
  brand: "Марка",
  model: "Модель",
  year: "Год выпуска",
  color: "Цвет",
  body: "Кузов",
  eco_class: "Эко-класс",
  drive: "Привод",
  transmission: "КПП",
  pts: "ПТС",
  status_text: "Статус",
  plate_region: "Регион номера",
} as const;

export type TorgiPivotDimension = keyof typeof TORGI_PIVOT_DIMENSIONS;

export type TorgiPivotRow = {
  key: string | null;
  lots: number;
  open_lots: number;
  sold_lots: number;
  avg_start: number | null;
  median_start: number | null;
  avg_final: number | null;
  avg_delta_pct: number | null;
  avg_mileage: number | null;
  avg_power: number | null;
  rub_per_hp: number | null;
};

export type TorgiPoint = {
  lot_id: number;
  name: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  category: string | null;
  status_text: string | null;
  is_open: boolean;
  mileage: number | null;
  power_hp: number | null;
  engine_volume: number | null;
  start_price: number | null;
  final_price: number | null;
  delta_pct: number | null;
  portal_views: number | null;
  plate_norm: string | null;
  plate_region: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const useTorgiDashboard = () =>
  useQuery({
    queryKey: ["torgi-dashboard"],
    queryFn: () => apiGet<TorgiDashboard>("/torgi/dashboard"),
  });

export const useTorgiPivot = (dimension: TorgiPivotDimension) =>
  useQuery({
    queryKey: ["torgi-pivot", dimension],
    queryFn: () => apiGet<TorgiPivotRow[]>("/torgi/pivot", { dimension }),
  });

export const useTorgiPoints = () =>
  useQuery({
    queryKey: ["torgi-points"],
    queryFn: () => apiGet<TorgiPoint[]>("/torgi/points"),
    staleTime: 5 * 60 * 1000,
  });

export function useTorgiRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiGet("/torgi/update_data"),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Данные торгов обновлены");
    },
    onError: (e) => toast.error(`Не удалось обновить: ${String(e)}`),
  });
}
