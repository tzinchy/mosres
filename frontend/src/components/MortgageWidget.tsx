import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NumberField } from "@/components/ui/number-field";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { useRates } from "@/hooks/useDashboard";
import { AUCTION_UPLIFT_MAX, AUCTION_UPLIFT_MIN } from "@/lib/auction";
import { money, moneyShort } from "@/lib/format";
import { annuity, cfgRate, type Program } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

const TIP = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
} as const;

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function MortgageWidget({
  price,
  isAuction = false,
}: {
  price: number | null;
  isAuction?: boolean;
}) {
  const { data: rates } = useRates();
  const [c, set] = useMortgageCfg();
  useEffect(() => {
    if (rates && c.marketRate === 0) set({ marketRate: rates.market_rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  if (!price) return null;

  const rate = cfgRate(c, rates?.market_rate ?? 20);
  const months = c.tableTerm * 12;

  const calc = (p: number) => {
    const dn = Math.round((p * c.downPct) / 100);
    const ln = Math.max(0, p - dn);
    const m = Math.round(annuity(ln, rate, months));
    return { price: p, down: dn, loan: ln, monthly: m, overpay: Math.round(m * months - ln) };
  };
  const base = calc(price);
  // диапазон итоговой цены аукциона: старт +10…30 %
  const lo = isAuction ? calc(Math.round(price * (1 + AUCTION_UPLIFT_MIN))) : null;
  const hi = isAuction ? calc(Math.round(price * (1 + AUCTION_UPLIFT_MAX))) : null;

  const series = Array.from({ length: 30 }, (_, i) => {
    const y = i + 1;
    const m = Math.round(annuity(base.loan, rate, y * 12));
    const row: Record<string, number | number[]> = {
      y,
      monthly: m,
      overpay: Math.round(m * y * 12 - base.loan),
    };
    if (lo && hi) {
      row.band = [
        Math.round(annuity(lo.loan, rate, y * 12)),
        Math.round(annuity(hi.loan, rate, y * 12)),
      ];
    }
    return row;
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
          {lo && hi ? (
            <>
              {money(lo.monthly)} – {money(hi.monthly)}
            </>
          ) : (
            money(base.monthly)
          )}{" "}
          ₽<span className="text-sm font-normal">/мес</span>
        </div>
        <div className="tnum text-xs text-muted-foreground">
          {isAuction ? "по старту: " : ""}взнос {moneyShort(base.down)} · кредит{" "}
          {moneyShort(base.loan)} · переплата {moneyShort(base.overpay)} ₽
        </div>
        {lo && hi && (
          <div className="tnum text-xs text-reserve">
            аукцион обычно +{pct(AUCTION_UPLIFT_MIN)}…{pct(AUCTION_UPLIFT_MAX)} (
            {moneyShort(lo.price)} – {moneyShort(hi.price)} ₽): платёж{" "}
            {money(lo.monthly)}–{money(hi.monthly)} ₽/мес · переплата{" "}
            {moneyShort(lo.overpay)}–{moneyShort(hi.overpay)} ₽
          </div>
        )}

        <div className="h-36">
          <ResponsiveContainer>
            <ComposedChart
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
              <ReferenceLine yAxisId="m" x={c.tableTerm} stroke="var(--border)" />
              <Tooltip
                formatter={(v, n) =>
                  Array.isArray(v)
                    ? [`${money(v[0])} – ${money(v[1])} ₽`, n]
                    : [`${money(Number(v))} ₽`, n]
                }
                labelFormatter={(l) => `срок ${l} лет`}
                contentStyle={TIP}
              />
              {lo && hi && (
                <Area
                  yAxisId="m"
                  type="monotone"
                  dataKey="band"
                  name={`аукцион +${pct(AUCTION_UPLIFT_MIN)}…${pct(AUCTION_UPLIFT_MAX)}`}
                  stroke="var(--reserve)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="var(--reserve)"
                  fillOpacity={0.16}
                />
              )}
              <Line
                yAxisId="m"
                type="monotone"
                dataKey="monthly"
                name={isAuction ? "платёж (старт)" : "платёж/мес"}
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
              {!isAuction && (
                <Line
                  yAxisId="o"
                  type="monotone"
                  dataKey="overpay"
                  name="переплата"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 bg-[var(--chart-1)]" />
            платёж{isAuction ? " (старт)" : ""}
          </span>
          {lo && hi ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-3 bg-[var(--reserve)] opacity-30" />
              +{pct(AUCTION_UPLIFT_MIN)}…{pct(AUCTION_UPLIFT_MAX)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 bg-[var(--chart-2)]" />
              переплата
            </span>
          )}
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
