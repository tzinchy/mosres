import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NumberField } from "@/components/ui/number-field";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { useRates } from "@/hooks/useDashboard";
import { money, moneyShort } from "@/lib/format";
import { annuity, cfgRate, type Program } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

export function MortgageWidget({ price }: { price: number | null }) {
  const { data: rates } = useRates();
  const [c, set] = useMortgageCfg();
  useEffect(() => {
    if (rates && c.marketRate === 0) set({ marketRate: rates.market_rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  if (!price) return null;

  const rate = cfgRate(c, rates?.market_rate ?? 20);
  const down = Math.round((price * c.downPct) / 100);
  const loan = Math.max(0, price - down);
  const months = c.tableTerm * 12;
  const monthly = Math.round(annuity(loan, rate, months));
  const overpay = Math.round(monthly * months - loan);

  const series = Array.from({ length: 30 }, (_, i) => {
    const y = i + 1;
    const m = annuity(loan, rate, y * 12);
    return {
      y,
      monthly: Math.round(m),
      overpay: Math.round(m * y * 12 - loan),
    };
  });

  return (
    <div>
      <div className="mb-2 text-sm font-medium">Ипотека</div>
      <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
        <div className="flex gap-1 text-xs">
          {(
            [
              ["family", "Семейная"],
              ["market", "Рыночная"],
              ["custom", "Своя"],
            ] as [Program, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => set({ program: k })}
              className={cn(
                "rounded px-2 py-1 transition-colors",
                c.program === k
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            взнос
            <NumberField
              value={c.downPct}
              max={95}
              onChange={(n) => set({ downPct: n })}
              className="h-7 w-14"
            />
            %
          </span>
          <span className="inline-flex items-center gap-1">
            срок
            <NumberField
              value={c.tableTerm}
              min={1}
              max={30}
              inputMode="numeric"
              onChange={(n) => set({ tableTerm: n })}
              className="h-7 w-14"
            />
            лет
          </span>
          {c.program === "custom" && (
            <span className="inline-flex items-center gap-1">
              ставка
              <NumberField
                value={c.customRate}
                max={100}
                onChange={(n) => set({ customRate: n })}
                className="h-7 w-14"
              />
              %
            </span>
          )}
          {c.program !== "custom" && <span>ставка {rate}%</span>}
        </div>
        <div className="tnum text-lg font-semibold">
          {money(monthly)} ₽<span className="text-sm font-normal">/мес</span>
        </div>
        <div className="tnum text-xs text-muted-foreground">
          взнос {moneyShort(down)} · кредит {moneyShort(loan)} · переплата{" "}
          {moneyShort(overpay)} ₽
        </div>

        <div className="h-36">
          <ResponsiveContainer>
            <LineChart
              data={series}
              margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
            >
              <XAxis
                dataKey="y"
                ticks={[5, 10, 15, 20, 25, 30]}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis yAxisId="m" hide />
              <YAxis yAxisId="o" hide />
              <ReferenceLine
                yAxisId="m"
                x={c.tableTerm}
                stroke="var(--border)"
              />
              <Tooltip
                formatter={(v, n) => [`${money(Number(v))} ₽`, n]}
                labelFormatter={(l) => `срок ${l} лет`}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Line
                yAxisId="m"
                type="monotone"
                dataKey="monthly"
                name="платёж/мес"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="o"
                type="monotone"
                dataKey="overpay"
                name="переплата"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-[var(--chart-1)]" />
            платёж
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-[var(--chart-2)]" />
            переплата
          </span>
        </div>

        <Link
          to="/mortgage"
          className="inline-block text-xs text-primary hover:underline"
        >
          Полный расчёт и графики по срокам →
        </Link>
      </div>
    </div>
  );
}
