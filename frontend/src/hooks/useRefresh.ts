import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

export function useRefreshData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiGet("/update_data"),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Данные обновлены");
    },
    onError: (e) => toast.error(`Не удалось обновить: ${String(e)}`),
  });
}
