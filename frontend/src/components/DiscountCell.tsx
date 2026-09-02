import { Badge } from "@/components/ui/badge";
import type { ApartRow } from "@/lib/types";

export function DiscountCell({ row }: { row: ApartRow }) {
  if (!row.has_discount) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex gap-1">
      <Badge variant="secondary">
        −{row.discount_pct ? `${row.discount_pct}%` : "скидка"}
      </Badge>
      {row.discount_is_new && <Badge>NEW</Badge>}
    </div>
  );
}
