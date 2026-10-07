import { Badge } from "@/components/ui/badge";
import { money, pct } from "@/lib/format";
import type { TorgiLotRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** «—» приглушённым: нет номера, нет VIN, нет значения. */
export function Dim({
  value,
  mono,
}: {
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground">—</span>;
  return <span className={cn(mono && "tnum")}>{value}</span>;
}

/**
 * Госномер: моноширинным, рядом — бейджи сработавших паттернов. Нет номера или
 * номер не разобрался — приглушаем, чтобы мусор не спорил с реальными номерами.
 */
export function PlateCell({ row, long }: { row: TorgiLotRow; long?: boolean }) {
  const text = row.plate_norm || row.plate;
  if (!text) return <Dim value={null} />;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className={cn(
          "font-mono tracking-wide",
          row.plate_valid ? "font-medium" : "text-muted-foreground",
        )}
        title={row.plate_valid ? undefined : "Номер не разобрался"}
      >
        {text}
      </span>
      {row.matched_masks.slice(0, long ? 99 : 2).map((m) => (
        <Badge
          key={m}
          className="border-transparent bg-primary/15 font-mono text-primary"
          title="Подходит под ваш паттерн"
        >
          {m}
        </Badge>
      ))}
      {!long && row.matched_masks.length > 2 && (
        <Badge className="border-transparent bg-primary/15 text-primary">
          +{row.matched_masks.length - 2}
        </Badge>
      )}
    </div>
  );
}

/** Статус лота: зелёная точка, пока открыт приём заявок, плюс бейдж «новый». */
export function TorgiStatusCell({ row }: { row: TorgiLotRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.is_open && (
        <span
          className="size-2 shrink-0 rounded-full bg-pos"
          aria-label="приём заявок открыт"
          title="Приём заявок открыт"
        />
      )}
      <span className="truncate text-sm">{row.status_text ?? "—"}</span>
      {row.is_new && (
        <Badge className="border-transparent bg-primary/15 text-primary">
          новый
        </Badge>
      )}
    </div>
  );
}

/** Дни до конца приёма заявок: ≤3 красный, ≤7 янтарный, прошёл — серый. */
export function TorgiDeadlineBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0)
    return (
      <Badge className="shrink-0 border-transparent bg-secondary text-muted-foreground">
        приём закрыт
      </Badge>
    );
  const tone =
    days <= 3
      ? "bg-neg-soft text-neg font-medium"
      : days <= 7
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <Badge className={cn("tnum shrink-0 border-transparent", tone)}>
      заявки: {days} дн
    </Badge>
  );
}

/** Δ итоговой к начальной: ниже старта — зелёным, выше — красным. */
export function FinalDeltaBadge({ row }: { row: TorgiLotRow }) {
  const d = row.final_price_delta_pct;
  if (d === null || row.final_price === null) return <Dim value={null} />;
  return (
    <Badge
      className={cn(
        "tnum border-transparent",
        d < 0 ? "bg-pos-soft text-pos" : d > 0 ? "bg-neg-soft text-neg" : "bg-secondary text-secondary-foreground",
      )}
      title={`Итог ${money(row.final_price)} ₽ против старта ${money(row.start_price)} ₽`}
    >
      {pct(d)}
    </Badge>
  );
}

export type TorgiSignal = "pattern" | "drop" | "deadline" | null;

/**
 * Один доминирующий сигнал на строку: паттерн → падение цены → дедлайн.
 * Иначе таблица превращается в радугу и подсветка перестаёт работать.
 */
export function rowSignal(row: TorgiLotRow): TorgiSignal {
  if (row.matched_masks.length > 0) return "pattern";
  if (row.start_price_prev !== null && row.start_price !== null && row.start_price < row.start_price_prev)
    return "drop";
  if (row.days_left !== null && row.days_left >= 0 && row.days_left <= 3)
    return "deadline";
  return null;
}

export function rowSignalClass(signal: TorgiSignal): string {
  switch (signal) {
    case "pattern":
      return "bg-primary/10 border-l-primary";
    case "drop":
      return "bg-pos-soft/40 border-l-pos";
    case "deadline":
      return "bg-neg-soft/40 border-l-neg";
    default:
      return "border-l-transparent";
  }
}
