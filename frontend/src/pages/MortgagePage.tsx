import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRates } from "@/hooks/useDashboard";
import { money, moneyShort, shortDate } from "@/lib/format";
import {
  MORTGAGE_KEY,
  annuity,
  cfgRate,
  loadMortgageCfg,
  type MortgageCfg,
} from "@/lib/mortgage";
import { cn } from "@/lib/utils";

const TERMS = Array.from({ length: 30 }, (_, i) => i + 1);

/** number field: no spinners, no stuck leading zero, clamps to [min, max] */
function Field({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  placeholder,
  className,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <span className="flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value === 0 ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
            const n = raw === "" ? 0 : Number(raw);
            onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0);
          }}
          className={cn(
            "tnum h-9 w-40 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring",
            className,
          )}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

export function MortgagePage() {
  const [c, setC] = useState<MortgageCfg>(loadMortgageCfg);
  const set = (patch: Partial<MortgageCfg>) => setC((p) => ({ ...p, ...patch }));
  useEffect(() => {
    localStorage.setItem(MORTGAGE_KEY, JSON.stringify(c));
  }, [c]);

  const { data: rates } = useRates();
  useEffect(() => {
    if (rates && c.marketRate === 0)
      setC((p) => ({ ...p, marketRate: rates.market_rate }));
  }, [rates, c.marketRate]);

  const rate = cfgRate(c, rates?.market_rate ?? 20);
  const down = Math.round((c.price * c.downPct) / 100);
  const loan = Math.max(0, c.price - down);

  const setDownRub = (rub: number) => {
    const pct = c.price > 0 ? (Math.min(rub, c.price) / c.price) * 100 : 0;
    set({ downPct: Math.round(pct * 10) / 10 });
  };

  const rows = TERMS.map((years) => {
    const months = years * 12;
    const m = annuity(loan, rate, months);
    const total = m * months;
    return {
      years,
      monthly: Math.round(m),
      total: Math.round(total + down),
      overpay: Math.round(total - loan),
      ok: c.comfort > 0 && m <= c.comfort,
    };
  });
  const optimal = rows.find((r) => r.ok)?.years ?? null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-5 md:p-8">
      <div>
        <h1 className="text-lg font-semibold">Ипотека</h1>
        <p className="text-sm text-muted-foreground">
          Аннуитетный расчёт. Семейная — 6% (госпрограмма); рыночная — оценка
          «ключевая ЦБ + пункты», точную ставку банка вводите в «Свою».
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Цену конкретной квартиры можно подставить из карточки квартиры (панель
          справа) — там же есть быстрый расчёт.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <Field
            label="Цена квартиры, ₽"
            value={c.price}
            min={0}
            onChange={(n) => set({ price: n })}
          />
          <Field
            label="Первоначальный взнос, ₽"
            value={down}
            min={0}
            max={c.price}
            onChange={setDownRub}
          />
          <Field
            label="…он же в %"
            value={c.downPct}
            min={0}
            max={95}
            suffix="%"
            className="w-24"
            onChange={(n) => set({ downPct: n })}
          />
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            Программа
            <div className="flex h-9 rounded-md border border-input p-0.5">
              {(
                [
                  ["family", "Семейная"],
                  ["market", "Рыночная"],
                  ["custom", "Своя"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ program: k })}
                  className={cn(
                    "rounded px-3 text-sm transition-colors",
                    c.program === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Field
            label={
              c.program === "family"
                ? "Ставка (семейная), %"
                : c.program === "market"
                  ? "Ставка (рыночная), %"
                  : "Ставка, %"
            }
            value={rate}
            min={0}
            max={100}
            className="w-28"
            onChange={(n) =>
              set(
                c.program === "family"
                  ? { familyRate: n }
                  : c.program === "market"
                    ? { marketRate: n }
                    : { customRate: n },
              )
            }
          />
          <Field
            label="Комфортный платёж, ₽/мес"
            value={c.comfort}
            min={0}
            onChange={(n) => set({ comfort: n })}
          />
          <Field
            label="Срок для оценки в таблице квартир, лет"
            value={c.tableTerm}
            min={1}
            max={30}
            className="w-24"
            onChange={(n) => set({ tableTerm: n })}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <span>
            Кредит: <span className="tnum font-semibold">{money(loan)} ₽</span>{" "}
            под <span className="tnum font-semibold">{rate}%</span>
          </span>
          {rates && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => set({ program: "market", marketRate: 0 })}
              title="Оценка: ключевая ставка ЦБ + несколько процентных пунктов (обычно 3–5). Точную ставку банка вводите в «Свою»."
            >
              ключевая ЦБ {rates.key_rate}%
              {rates.key_rate_date ? ` (${shortDate(rates.key_rate_date)})` : ""}{" "}
              → рыночная ≈ {rates.market_rate}%
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5">Срок</th>
                <th className="px-4 py-2.5 text-right">Платёж / мес</th>
                <th className="px-4 py-2.5 text-right">Переплата</th>
                <th className="px-4 py-2.5 text-right">Всего выплат</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.years}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    optimal === r.years && "bg-pos-soft/50",
                  )}
                >
                  <td className="px-4 py-2">
                    {r.years} {r.years === 1 ? "год" : r.years < 5 ? "года" : "лет"}
                    {optimal === r.years && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        оптимальный
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "tnum px-4 py-2 text-right font-medium",
                      c.comfort > 0 && (r.ok ? "text-pos" : "text-neg"),
                    )}
                  >
                    {money(r.monthly)} ₽
                  </td>
                  <td className="tnum px-4 py-2 text-right text-muted-foreground">
                    {money(r.overpay)} ₽
                  </td>
                  <td className="tnum px-4 py-2 text-right">{money(r.total)} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-72 w-full rounded-xl bg-panel p-4">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="years"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              yAxisId="m"
              width={54}
              tickFormatter={(v) => moneyShort(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="o"
              orientation="right"
              width={54}
              tickFormatter={(v) => moneyShort(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            {c.comfort > 0 && (
              <ReferenceLine
                yAxisId="m"
                y={c.comfort}
                stroke="var(--pos)"
                strokeDasharray="4 4"
                label={{
                  value: "комфортный",
                  fontSize: 10,
                  fill: "var(--pos)",
                  position: "insideTopRight",
                }}
              />
            )}
            <Tooltip
              formatter={(v, n) => [`${money(Number(v))} ₽`, n]}
              labelFormatter={(l) => `${l} лет`}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              yAxisId="m"
              type="monotone"
              dataKey="monthly"
              name="Платёж / мес"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="o"
              type="monotone"
              dataKey="overpay"
              name="Переплата"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
