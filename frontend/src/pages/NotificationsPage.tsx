import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useDashboard";
import { useNotifSeen } from "@/hooks/useNotifSeen";
import { money, pct, relTime } from "@/lib/format";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const PERIODS = [7, 14, 30];

function label(n: Notification): { text: string; tone: "pos" | "neg" | "reserve" } {
  if (n.price_down)
    return {
      text: `Подешевела: ${money(n.prev_price)} → ${money(n.price)} ₽ (${pct(
        n.prev_price ? ((n.price! - n.prev_price) / n.prev_price) * 100 : null,
      )})`,
      tone: "pos",
    };
  if (n.price_up)
    return {
      text: `Подорожала: ${money(n.prev_price)} → ${money(n.price)} ₽`,
      tone: "neg",
    };
  if (n.discount_new) return { text: "Появилась скидка", tone: "pos" };
  if (n.discount_gone) return { text: "Скидка снята", tone: "neg" };
  if (n.reserved) return { text: "Ушла в резерв", tone: "reserve" };
  if (n.unreserved) return { text: "Вышла из резерва", tone: "pos" };
  return { text: "Изменение", tone: "reserve" };
}

export function NotificationsPage() {
  const [days, setDays] = useState(14);
  const { data, isLoading } = useNotifications(days);
  const { lastSeen, markSeen } = useNotifSeen();
  const [seenAt] = useState(lastSeen);

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  return (
    <div className="mx-auto max-w-[900px] space-y-5 p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Уведомления</h1>
          <p className="text-sm text-muted-foreground">
            Изменения по квартирам из избранного
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                days === d
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d} дн
            </button>
          ))}
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
      {data && data.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          Пока тихо. Добавьте квартиры в избранное — здесь появятся изменения по ним.
        </p>
      )}
      {data && data.length > 0 && (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {data.map((n) => {
            const l = label(n);
            const isNew = n.updated_at > seenAt;
            return (
              <li key={`${n.new_apart_id}-${n.version}`}>
                <Link
                  to="/aparts?favorites_only=1"
                  className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/60"
                >
                  {isNew && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className={cn("min-w-0 flex-1", !isNew && "pl-5")}>
                    <div className="truncate text-sm font-medium">
                      {n.address}, кв. {n.number}
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        l.tone === "pos" && "text-pos",
                        l.tone === "neg" && "text-neg",
                        l.tone === "reserve" && "text-reserve",
                      )}
                    >
                      {l.text}
                    </div>
                  </div>
                  <span className="tnum shrink-0 text-xs text-muted-foreground">
                    {relTime(n.updated_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
