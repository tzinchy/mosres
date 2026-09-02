export function money(v: string | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("ru-RU").format(Number(v)) + " ₽";
}

export function PriceDelta({ abs, pct }: { abs: string | null; pct: string | null }) {
  if (abs === null || pct === null) return <span className="text-muted-foreground">—</span>;
  const n = Number(abs);
  const cls = n < 0 ? "text-red-600" : n > 0 ? "text-green-600" : "text-muted-foreground";
  const sign = n > 0 ? "+" : "";
  return (
    <span className={cls}>
      {sign}
      {new Intl.NumberFormat("ru-RU").format(n)} ₽ ({sign}
      {pct}%)
    </span>
  );
}
