export function money(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("ru-RU").format(v) + " ₽";
}

export function PriceDelta({ abs, pct }: { abs: number | null; pct: number | null }) {
  if (abs === null || pct === null) return <span className="text-muted-foreground">—</span>;
  const cls = abs < 0 ? "text-red-600" : abs > 0 ? "text-green-600" : "text-muted-foreground";
  const sign = abs > 0 ? "+" : "";
  return (
    <span className={cls}>
      {sign}
      {new Intl.NumberFormat("ru-RU").format(abs)} ₽ ({sign}
      {pct}%)
    </span>
  );
}
