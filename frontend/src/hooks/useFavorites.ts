import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPost } from "@/lib/api";
import type { ApartRow } from "@/lib/types";

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) =>
      next ? apiPost(`/favorites/${id}`) : apiDelete(`/favorites/${id}`),
    onMutate: async ({ id, next }) => {
      await qc.cancelQueries({ queryKey: ["aparts"] });
      const snapshots = qc.getQueriesData<ApartRow[]>({ queryKey: ["aparts"] });
      for (const [key, rows] of snapshots) {
        if (!rows) continue;
        qc.setQueryData<ApartRow[]>(
          key,
          rows.map((r) => (r.new_apart_id === id ? { ...r, is_favorite: next } : r)),
        );
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, rows]) => qc.setQueryData(key, rows));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["aparts"] }),
  });
}
