import {
  Gavel,
  Hash,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useDashboard";
import { useNotifSeen } from "@/hooks/useNotifSeen";
import { useTorgiNotifications } from "@/hooks/useTorgi";
import { money, pct, relTime } from "@/lib/format";
import type { Notification, TorgiNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const PERIODS = [7, 14, 30];
type Tone = "pos" | "neg" | "reserve";

function label(n: Notification): { text: string; tone: Tone } {
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

/** Причина торгового уведомления: иконка + текст одним решением. */
function torgiLabel(n: TorgiNotification): {
  text: string;
  tone: Tone;
  Icon: typeof Hash;
} {
  if (n.kind === "plate_match")
    return {
      text: `Номер под паттерн${n.matched_masks.length ? `: ${n.matched_masks.join(", ")}` : ""}`,
      tone: "reserve",
      Icon: Hash,
    };
  if (n.sold)
    return {
      text: `Продан${n.final_price !== null ? ` за ${money(n.final_price)} ₽` : ""}`,
      tone: "neg",
      Icon: Gavel,
    };
  if (n.price_down)
    return {
      text: `Начальная цена упала: ${money(n.prev_start_price)} → ${money(n.start_price)} ₽`,
      tone: "pos",
      Icon: TrendingDown,
    };
  if (n.price_up)
    return {
      text: `Начальная цена выросла: ${money(n.prev_start_price)} → ${money(n.start_price)} ₽`,
      tone: "neg",
      Icon: TrendingUp,
    };
  if (n.status_changed)
    return {
      text: `Статус: ${n.status_text ?? "изменился"}`,
      tone: "reserve",
      Icon: RefreshCw,
    };
  return { text: "Изменение лота", tone: "reserve", Icon: RefreshCw };
}

const toneClass = (t: Tone) =>
  t === "pos" ? "text-pos" : t === "neg" ? "text-neg" : "text-reserve";

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Unread({ isNew }: { isNew: boolean }) {
  return isNew ? (
    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
  ) : null;
}

function ApartsFeed({ days, seenAt }: { days: number; seenAt: string }) {
  const { data, isLoading } = useNotifications(days);
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data) return null;
  if (data.length === 0)
    return (
      <Empty text="Пока тихо. Добавьте квартиры в избранное — здесь появятся изменения по ним." />
    );
  return (
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
              <Unread isNew={isNew} />
              <div className={cn("min-w-0 flex-1", !isNew && "pl-5")}>
                <div className="truncate text-sm font-medium">
                  {n.address}, кв. {n.number}
                </div>
                <div className={cn("text-sm", toneClass(l.tone))}>{l.text}</div>
              </div>
              <span className="tnum shrink-0 text-xs text-muted-foreground">
                {relTime(n.updated_at)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function TorgiFeed({ days, seenAt }: { days: number; seenAt: string }) {
  const { data, isLoading } = useTorgiNotifications(days);
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!data) return null;
  if (data.length === 0)
    return (
      <Empty text="Пока тихо. Задайте паттерн номера на странице «Номера» или добавьте лоты в избранное." />
    );
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {data.map((n) => {
        const l = torgiLabel(n);
        const isNew = n.updated_at > seenAt;
        return (
          <li key={`${n.kind}-${n.lot_id}-${n.version}`}>
            <Link
              to={`/torgi/cars/${n.lot_id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/60"
            >
              <Unread isNew={isNew} />
              <l.Icon
                size={15}
                className={cn("mt-0.5 shrink-0", toneClass(l.tone), !isNew && "ml-5")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {n.name ?? `Лот ${n.lot_id}`}
                  </span>
                  {n.plate_norm && (
                    <Badge className="border-transparent bg-secondary font-mono text-secondary-foreground">
                      {n.plate_norm}
                    </Badge>
                  )}
                </div>
                <div className={cn("text-sm", toneClass(l.tone))}>{l.text}</div>
              </div>
              <span className="tnum shrink-0 text-xs text-muted-foreground">
                {relTime(n.updated_at)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function NotificationsPage() {
  const [days, setDays] = useState(14);
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
            Изменения по избранным квартирам и по торгам
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

      <Tabs defaultValue="aparts">
        <TabsList>
          <TabsTrigger value="aparts">Квартиры</TabsTrigger>
          <TabsTrigger value="torgi">Торги</TabsTrigger>
        </TabsList>
        <TabsContent value="aparts">
          <ApartsFeed days={days} seenAt={seenAt} />
        </TabsContent>
        <TabsContent value="torgi">
          <TorgiFeed days={days} seenAt={seenAt} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
