import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPost } from "@/lib/api";
import type { TorgiLotRow } from "@/lib/types";

/** Избранное по лотам торгов: оптимистично правим и таблицу, и карточку лота. */
export function useToggleTorgiFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      next
        ? apiPost(`/torgi/favorites/${id}`)
        : apiDelete(`/torgi/favorites/${id}`),
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey: ["torgi-lots"] });
      await qc.cancelQueries({ queryKey: ["torgi-lot", id] });
      const lists = qc.getQueriesData<TorgiLotRow[]>({ queryKey: ["torgi-lots"] });
      const singles = qc.getQueriesData<TorgiLotRow>({ queryKey: ["torgi-lot", id] });
      for (const [key, rows] of lists) {
        if (!rows) continue;
        qc.setQueryData<TorgiLotRow[]>(
          key,
          rows.map((r) => (r.lot_id === id ? { ...r, is_favorite: next } : r)),
        );
      }
      for (const [key, lot] of singles) {
        if (!lot) continue;
        qc.setQueryData<TorgiLotRow>(key, { ...lot, is_favorite: next });
      }
      return { lists, singles };
    },
    onError: (_e, _v, ctx) => {
      ctx?.lists.forEach(([key, rows]) => qc.setQueryData(key, rows));
      ctx?.singles.forEach(([key, lot]) => qc.setQueryData(key, lot));
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ["torgi-lots"] });
      qc.invalidateQueries({ queryKey: ["torgi-lot", id] });
    },
  });
}
