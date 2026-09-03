import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAparts } from "@/hooks/useAparts";
import { useRates } from "@/hooks/useDashboard";
import { money, moneyShort, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const KEY = "mosres-mortgage";
const TERMS = [5, 7, 10, 12, 15, 20, 25, 30];

type Program = "family" | "market" | "custom";
interface Cfg {
  price: number;
  downPct: number;
  program: Program;
  familyRate: number;
  marketRate: number; // 0 = не задано, подставится из /rates
  customRate: number;
  comfort: number;
}
const DEFAULT: Cfg = {
  price: 15_000_000,
  downPct: 20,
  program: "family",
  familyRate: 6,
  marketRate: 0,
  customRate: 20,
  comfort: 150_000,
};

function load(): Cfg {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULT };
  }
}

/** monthly annuity payment */
function annuity(loan: number, annualPct: number, months: number): number {
  const r = annualPct / 100 / 12;
  if (r === 0) return loan / months;
  const k = Math.pow(1 + r, months);
  return (loan * r * k) / (k - 1);
}

function Field({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <span className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tnum h-9 w-40 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:border-ring"
        />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

export function MortgagePage() {
  const [c, setC] = useState<Cfg>(load);
  const set = (patch: Partial<Cfg>) => setC((p) => ({ ...p, ...patch }));
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(c));
  }, [c]);

  const { data: rates } = useRates();
  // подставить рыночную ставку из ЦБ, если пользователь ещё не трогал поле
  useEffect(() => {
    if (rates && c.marketRate === 0)
      setC((p) => ({ ...p, marketRate: rates.market_rate }));
  }, [rates, c.marketRate]);

  const [q, setQ] = useState("");
  const { data: aparts } = useAparts({});
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return (aparts ?? [])
      .filter(
        (a) =>
          a.price &&
          (`${a.address ?? ""} ${a.number ?? ""}`.toLowerCase().includes(s)),
      )
      .slice(0, 6);
  }, [aparts, q]);

  const rate =
    c.program === "family"
      ? c.familyRate
      : c.program === "market"
        ? c.marketRate || rates?.market_rate || 20
        : c.customRate;
  const down = Math.round((c.price * c.downPct) / 100);
  const loan = Math.max(0, c.price - down);

  const rows = TERMS.map((years) => {
    const months = years * 12;
    const m = annuity(loan, rate, months);
    const total = m * months;
    return {
      years,
      rate,
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
          Аннуитетный расчёт по заданным ставкам. Актуальные ставки уточняйте в
          банке — здесь они редактируются вручную.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="relative mb-4 max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Взять цену из квартиры — адрес или номер"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
          {matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
              {matches.map((a) => (
                <button
                  key={a.new_apart_id}
                  type="button"
                  onClick={() => {
                    set({ price: a.price ?? c.price });
                    setQ("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/60"
                >
                  <span className="truncate">
                    {a.address}
                    {a.number ? `, кв. ${a.number}` : ""}
                  </span>
                  <span className="tnum shrink-0 text-xs text-muted-foreground">
                    {money(a.price)} ₽
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <Field
            label="Цена квартиры, ₽"
            value={c.price}
            step={100000}
            onChange={(n) => set({ price: n })}
          />
          <Field
            label="Первоначальный взнос, %"
            value={c.downPct}
            onChange={(n) => set({ downPct: Math.min(90, Math.max(0, n)) })}
            suffix={`= ${money(down)} ₽`}
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
            step={0.1}
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
            step={5000}
            onChange={(n) => set({ comfort: n })}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <span>
            Сумма кредита:{" "}
            <span className="tnum font-semibold">{money(loan)} ₽</span>
          </span>
          {rates && (
            <span
              className="text-xs text-muted-foreground"
              title="Семейная ипотека — 6%, ставка фиксирована госпрограммой. «Рыночная» — оценка: ключевая ставка ЦБ плюс несколько процентных пунктов (обычно 3–5). Точную ставку своего банка вводите вручную в поле «Своя»."
            >
              Ключевая ставка ЦБ {rates.key_rate}%
              {rates.key_rate_date
                ? ` на ${shortDate(rates.key_rate_date)}`
                : ""}{" "}
              · рыночная ≈ {rates.market_rate}% · семейная {rates.family_rate}%
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5">Срок</th>
              <th className="px-4 py-2.5 text-right">Ставка</th>
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
                  r.ok && "bg-pos-soft/40",
                )}
              >
                <td className="px-4 py-2.5">
                  {r.years} лет
                  {optimal === r.years && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      оптимальный
                    </span>
                  )}
                </td>
                <td className="tnum px-4 py-2.5 text-right">{r.rate}%</td>
                <td
                  className={cn(
                    "tnum px-4 py-2.5 text-right font-medium",
                    c.comfort > 0 && (r.ok ? "text-pos" : "text-neg"),
                  )}
                >
                  {money(r.monthly)} ₽
                </td>
                <td className="tnum px-4 py-2.5 text-right text-muted-foreground">
                  {money(r.overpay)} ₽
                </td>
                <td className="tnum px-4 py-2.5 text-right">
                  {money(r.total)} ₽
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-72 w-full rounded-xl bg-panel p-4">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="years"
              unit=" л"
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
              dot
            />
            <Line
              yAxisId="o"
              type="monotone"
              dataKey="overpay"
              name="Переплата"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
