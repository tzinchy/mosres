const nf = new Intl.NumberFormat("ru-RU");

export function money(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return nf.format(Math.round(v));
}

/** compact rubles: 12,04 млн */
export function moneyShort(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} млн`;
  if (Math.abs(v) >= 1_000)
    return `${(v / 1_000).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} тыс`;
  return nf.format(v);
}

export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const s = v > 0 ? "+" : "";
  return `${s}${v.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "нет данных";
  const then = new Date(iso).getTime();
  const min = Math.round((Date.now() - then) / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
