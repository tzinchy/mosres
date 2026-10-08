import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Обвязка, специфичная для недвижимости. Панели, оси и шкалы берём из
 * components/torgi/parts — там они уже нейтральны к источнику данных,
 * а вот строка лота должна вести в /torgi/objects, а не в /torgi/cars.
 */

export const MONTHS = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

/** "2026-03-01" или "2026-03" → "мар 26" */
export function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1].slice(2)}`;
}

export const num = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("ru-RU");

/** Подписи оси Y: 26 000 в 32 пикселя не влезает и обрезается по первой цифре,
 *  поэтому крупные значения сокращаем. */
export const axisNum = (v: number): string => {
  const n = Math.abs(v);
  if (n >= 1_000_000) return `${(v / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (n >= 10_000) return `${Math.round(v / 1000)}к`;
  if (n >= 1_000) return `${(v / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}к`;
  return v.toLocaleString("ru-RU");
};

export const views = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${v.toLocaleString("ru-RU")} просм.`;

export function ObjectRow({
  lotId,
  title,
  sub,
  right,
}: {
  lotId: number;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Link
      to={`/torgi/objects/${lotId}`}
      className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-secondary/60"
    >
      <span className="min-w-0">
        <span className="block truncate">{title || `Лот ${lotId}`}</span>
        {sub && (
          <span className="block truncate text-xs text-muted-foreground">
            {sub}
          </span>
        )}
      </span>
      {right && <span className="shrink-0 text-right">{right}</span>}
    </Link>
  );
}
