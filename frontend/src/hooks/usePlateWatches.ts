import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { TorgiPreset, TorgiWatch } from "@/lib/types";

export function usePlateWatches() {
  return useQuery({
    queryKey: ["plate-watches"],
    queryFn: () => apiGet<TorgiWatch[]>("/torgi/watches"),
  });
}

/** Готовые пресеты: ключ для POST и подпись для кнопки. */
export function usePlatePresets() {
  return useQuery({
    queryKey: ["plate-presets"],
    queryFn: () => apiGet<TorgiPreset[]>("/torgi/presets"),
    staleTime: 60 * 60 * 1000,
  });
}

export function useAddPlateWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mask?: string; preset?: string; label?: string }) =>
      apiPost<TorgiWatch>("/torgi/watches", body),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ["plate-watches"] });
      qc.invalidateQueries({ queryKey: ["torgi-lots"] });
      qc.invalidateQueries({ queryKey: ["torgi-notifications"] });
      toast.success(
        `Паттерн добавлен: совпадений сейчас — ${w?.matched_now ?? 0}`,
      );
    },
    // текст 422 от бэкенда («= не может быть первым символом» и т.п.)
    onError: (e) => toast.error(e.message),
  });
}

export function useDeletePlateWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/torgi/watches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plate-watches"] });
      qc.invalidateQueries({ queryKey: ["torgi-lots"] });
      qc.invalidateQueries({ queryKey: ["torgi-notifications"] });
      toast.success("Паттерн удалён");
    },
    onError: (e) => toast.error(e.message),
  });
}
