import { useEffect, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";

const VIS_KEY = "mosres-aparts-cols";

/** columns the user can show/hide, in menu order */
export const APART_COL_LABELS: Record<string, string> = {
  params: "Параметры",
  price: "Цена",
  delta_prev: "Δ к прошлой",
  delta_max: "Δ к максимуму",
  discount: "Скидка",
  plan: "Планировка",
  updated: "Обновлено",
};

// hidden until the user opts in via the columns menu
const DEFAULTS: VisibilityState = { updated: false };

export interface ApartCols {
  visibility: VisibilityState;
  setVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
}

export function useApartCols(): ApartCols {
  const [visibility, setVisibility] = useState<VisibilityState>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(VIS_KEY) ?? "{}") };
    } catch {
      return { ...DEFAULTS };
    }
  });
  useEffect(() => {
    localStorage.setItem(VIS_KEY, JSON.stringify(visibility));
  }, [visibility]);
  return { visibility, setVisibility };
}
