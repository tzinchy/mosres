import { Car, Footprints } from "lucide-react";
import type { MetroStop } from "@/lib/types";

export function MetroList({
  stops,
  limit = 2,
}: {
  stops: MetroStop[];
  limit?: number;
}) {
  if (!stops?.length) return <span className="text-muted-foreground">—</span>;
  const shown = stops.slice(0, limit);
  const rest = stops.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((s, i) => {
        const walk = s.walk?.replace(/[^\d]/g, "");
        const car = s.car?.replace(/[^\d]/g, "");
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 py-0.5 pr-2 pl-1.5 text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ background: s.color ?? "var(--muted-foreground)" }}
            />
            <span className="max-w-32 truncate font-medium">{s.name}</span>
            {(walk || car) && (
              <span className="tnum inline-flex items-center gap-0.5 text-muted-foreground">
                {walk ? <Footprints size={11} /> : <Car size={11} />}
                {walk ?? car}′
              </span>
            )}
          </span>
        );
      })}
      {rest > 0 && <span className="text-xs text-muted-foreground">+{rest}</span>}
    </div>
  );
}
