import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { Comment } from "@/lib/types";

export const useComments = (id: number | null) =>
  useQuery({
    queryKey: ["comments", id],
    queryFn: () => apiGet<Comment[]>(`/aparts/${id}/comments`),
    enabled: id !== null,
  });

export function useAddComment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiPost<Comment>(`/aparts/${id}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", id] });
      qc.invalidateQueries({ queryKey: ["aparts"] });
    },
  });
}

export function useDeleteComment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => apiDelete(`/comments/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", id] });
      qc.invalidateQueries({ queryKey: ["aparts"] });
    },
  });
}
