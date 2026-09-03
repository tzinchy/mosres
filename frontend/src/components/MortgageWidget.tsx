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
import { MortgageDowns } from "@/components/MortgageDowns";
import { NumberField } from "@/components/ui/number-field";
import { useMortgageCfg } from "@/hooks/useMortgageCfg";
import { useRates } from "@/hooks/useDashboard";
import { AUCTION_UPLIFT_MAX, AUCTION_UPLIFT_MIN } from "@/lib/auction";
import { money, moneyShort } from "@/lib/format";
import {
  annuity,
  cfgRate,
  DOWN_COLORS,
  loanFor,
  MIN_DOWN_PCT,
  pctOfPrice,
  resolveDownRubs,
  type Program,
} from "@/lib/mortgage";
import { cn } from "@/lib/utils";

const TIP = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
} as const;

const pctLabel = (x: number) => `${Math.round(x * 100)}%`;

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
  const downs = resolveDownRubs(c);
  const downPctNow = pctOfPrice(c.downRub, price);

  const payAt = (rub: number, priceOverride = price) =>
    Math.round(annuity(loanFor(priceOverride, rub), rate, months));

  // диапазон итоговой цены аукциона: старт +10…30 % (по текущему взносу)
  const loPrice = Math.round(price * (1 + AUCTION_UPLIFT_MIN));
  const hiPrice = Math.round(price * (1 + AUCTION_UPLIFT_MAX));
  const base = payAt(c.downRub);
  const auLo = isAuction ? payAt(c.downRub, loPrice) : null;
  const auHi = isAuction ? payAt(c.downRub, hiPrice) : null;

  const series = Array.from({ length: 30 }, (_, i) => {
    const y = i + 1;
    const row: Record<string, number | number[]> = { y };
    downs.forEach((rub, di) => {
      row[`m${di}`] = Math.round(annuity(loanFor(price, rub), rate, y * 12));
    });
    if (isAuction) {
      row.band = [
        Math.round(annuity(loanFor(loPrice, c.downRub), rate, y * 12)),
        Math.round(annuity(loanFor(hiPrice, c.downRub), rate, y * 12)),
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
          {isAuction && auLo && auHi ? (
            <>
              {money(auLo)} – {money(auHi)}
            </>
          ) : (
            money(base)
          )}{" "}
          ₽<span className="text-sm font-normal">/мес</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            · взнос {moneyShort(c.downRub)} ({downPctNow}%)
          </span>
          {downPctNow < MIN_DOWN_PCT && (
            <span className="ml-1 rounded-full bg-neg-soft px-1.5 py-0.5 text-xs font-medium text-neg">
              недостаточно средств
            </span>
          )}
        </div>
        {isAuction && auLo && auHi && (
          <div className="tnum text-xs text-reserve">
            аукцион обычно +{pctLabel(AUCTION_UPLIFT_MIN)}…
            {pctLabel(AUCTION_UPLIFT_MAX)} ({moneyShort(loPrice)} –{" "}
            {moneyShort(hiPrice)} ₽); по старту {money(base)} ₽/мес
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
              <YAxis hide />
              <ReferenceLine x={c.tableTerm} stroke="var(--border)" />
              <Tooltip
                formatter={(v, n) =>
                  Array.isArray(v)
                    ? [`${money(v[0])} – ${money(v[1])} ₽`, n]
                    : [`${money(Number(v))} ₽`, n]
                }
                labelFormatter={(l) => `срок ${l} лет`}
                contentStyle={TIP}
              />
              {isAuction && (
                <Area
                  type="monotone"
                  dataKey="band"
                  name={`аукцион +${pctLabel(AUCTION_UPLIFT_MIN)}…${pctLabel(AUCTION_UPLIFT_MAX)}`}
                  stroke="var(--reserve)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="var(--reserve)"
                  fillOpacity={0.16}
                />
              )}
              {downs.map((rub, di) => (
                <Line
                  key={di}
                  type="monotone"
                  dataKey={`m${di}`}
                  name={`взнос ${moneyShort(rub)} (${pctOfPrice(rub, price)}%)`}
                  stroke={DOWN_COLORS[di % DOWN_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {downs.map((rub, di) => (
            <span key={di} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-0.5 w-3"
                style={{ background: DOWN_COLORS[di % DOWN_COLORS.length] }}
              />
              {moneyShort(rub)} ({pctOfPrice(rub, price)}%)
            </span>
          ))}
          {isAuction && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-3 bg-[var(--reserve)] opacity-30" />
              +{pctLabel(AUCTION_UPLIFT_MIN)}…{pctLabel(AUCTION_UPLIFT_MAX)}
            </span>
          )}
        </div>

        <MortgageDowns price={price} compact className="!bg-background/60" />

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
