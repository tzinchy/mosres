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
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {shown.map((s, i) => {
        const time = s.walk
          ? `${s.walk} пешком`
          : s.car
            ? `${s.car} на авто`
            : undefined;
        return (
          <span
            key={i}
            title={time ? `${s.name}: ${time}` : (s.name ?? undefined)}
            className="inline-flex items-center gap-1 text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: s.color ?? "var(--muted-foreground)" }}
            />
            <span className="truncate">{s.name}</span>
            {time && (
              <span className="tnum text-muted-foreground">
                {s.walk ?? s.car}
              </span>
            )}
          </span>
        );
      })}
      {rest > 0 && <span className="text-xs text-muted-foreground">+{rest}</span>}
    </div>
  );
}
