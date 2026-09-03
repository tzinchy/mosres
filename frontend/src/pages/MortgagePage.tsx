import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { money, moneyShort, shortDate } from "@/lib/format";
import { annuity, cfgRate } from "@/lib/mortgage";
import { cn } from "@/lib/utils";

const TERMS = Array.from({ length: 30 }, (_, i) => i + 1);

const TIP = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

const CMP_COLORS = ["#4363d8", "#3cb44b", "#d98324", "#e6194b"];

function yearWord(y: number) {
  return y === 1 ? "год" : y % 10 >= 2 && y % 10 <= 4 && (y < 10 || y > 20) ? "года" : "лет";
}

/** амортизация: сколько за каждый год уходит на проценты и на тело кредита */
function yearlySplit(loan: number, annualPct: number, years: number) {
  const r = annualPct / 100 / 12;
  const n = years * 12;
  const m = annuity(loan, annualPct, n);
  let bal = loan;
  const out: { year: number; interest: number; principal: number }[] = [];
  for (let y = 1; y <= years; y++) {
    let interest = 0;
    let principal = 0;
    for (let k = 0; k < 12; k++) {
      const i = Math.max(0, bal * r);
      const p = m - i;
      interest += i;
      principal += p;
      bal -= p;
    }
    out.push({
      year: y,
      interest: Math.round(interest),
      principal: Math.round(principal),
    });
  }
  return out;
}

function Field({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  className,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <span className="flex items-center gap-1">
        <NumberField
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className={cn("h-9 w-40", className)}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  );
}

export function MortgagePage() {
  const [c, set] = useMortgageCfg();

  const { data: rates } = useRates();
  useEffect(() => {
    if (rates && c.marketRate === 0) set({ marketRate: rates.market_rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, c.marketRate]);

  const rate = cfgRate(c, rates?.market_rate ?? 20);
  const down = Math.round((c.price * c.downPct) / 100);
  const loan = Math.max(0, c.price - down);

  const setDownRub = (rub: number) => {
    const pct = c.price > 0 ? (Math.min(rub, c.price) / c.price) * 100 : 0;
    set({ downPct: Math.round(pct * 10) / 10 });
  };

  const rows = TERMS.map((years, i, arr) => {
    const m = annuity(loan, rate, years * 12);
    const overpay = Math.round(m * years * 12 - loan);
    const prevYears = i > 0 ? arr[i - 1] : years;
    const prevM = annuity(loan, rate, prevYears * 12);
    const prevOverpay = Math.round(prevM * prevYears * 12 - loan);
    return {
      years,
      monthly: Math.round(m),
      total: Math.round(m * years * 12 + down),
      overpay,
      // цена лишнего года: +переплата и -платёж относительно срока на год короче
      overpayStep: i > 0 ? overpay - prevOverpay : 0,
      reliefStep: i > 0 ? Math.round(prevM - m) : 0,
    };
  }).map((r) => ({
    ...r,
    // строгая проверка — для цвета платежа в таблице
    ok: c.comfort > 0 && r.monthly <= c.comfort,
  }));

  // оптимальный = самый короткий срок, платёж которого укладывается в
  // комфортный. Крошечный допуск (0.5%, не больше 2 000 ₽) — только на
  // округление, чтобы платёж 60 196 при комфортных 60 000 считался «влез».
  const grace = Math.min(c.comfort * 0.005, 2000);
  const optimal =
    c.comfort > 0
      ? rows.find((r) => r.monthly <= c.comfort + grace)?.years ?? null
      : null;
  // точка убывающей отдачи: 5 лет экономии на платеже от лишнего года уже
  // меньше, чем этот год добавляет к переплате — дальше растягивать невыгодно
  const knee =
    rows.find(
      (r) => r.years > 1 && r.overpayStep > 0 && r.reliefStep * 60 < r.overpayStep,
    )?.years ?? null;

  const split = yearlySplit(loan, rate, c.tableTerm);

  // сравнение нескольких первоначальных взносов на одном графике
  const [cmpPct, setCmpPct] = useState<number[]>([0, 15, 30]);
  const [cmpMetric, setCmpMetric] = useState<"monthly" | "overpay">("monthly");
  const cmpU = [...new Set(cmpPct.filter((p) => p >= 0 && p <= 95))];
  const cmpData = TERMS.map((years) => {
    const o: Record<string, number> = { years };
    for (const p of cmpU) {
      const dn = Math.round((c.price * p) / 100);
      const ln = Math.max(0, c.price - dn);
      const m = annuity(ln, rate, years * 12);
      o[`p${p}`] = Math.round(cmpMetric === "monthly" ? m : m * years * 12 - ln);
    }
    return o;
  });

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
          Цену квартиры можно подставить из карточки (панель справа) — там же
          быстрый расчёт и графики. Первоначальный взнос задаёте вы (по
          умолчанию 20%), он нигде не «подтягивается». Из внешних источников
          берётся только ключевая ставка ЦБ — и лишь для оценки рыночной.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <Field
            label="Цена квартиры, ₽"
            value={c.price}
            min={0}
            onChange={(n) => set({ price: n })}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Первоначальный взнос, ₽
            <span className="flex items-center gap-1">
              <NumberField
                value={down}
                min={0}
                max={c.price}
                onChange={setDownRub}
                className="h-9 w-40"
              />
              <span className="tnum whitespace-nowrap">
                {c.price > 0 ? Math.round(c.downPct) : 0}%
              </span>
            </span>
          </label>
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
            label="Срок для графиков и таблицы квартир, лет"
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
          {optimal && (
            <span
              className="text-muted-foreground"
              title="Самый короткий срок, платёж которого укладывается в комфортный. Короче — платёж уже не по карману, длиннее — больше переплата."
            >
              мин. срок в бюджете:{" "}
              <span className="font-medium text-primary">
                {optimal} {yearWord(optimal)}
              </span>
            </span>
          )}
          {knee && (
            <span
              className="text-muted-foreground"
              title="Дальше каждый добавленный год почти не снижает платёж, но заметно увеличивает переплату."
            >
              растягивать смысла нет с{" "}
              <span className="font-medium text-accent-foreground">
                {knee} {yearWord(knee)}
              </span>
            </span>
          )}
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

      {/* по годам: платёж, переплата, цена лишнего года */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5">Срок</th>
                <th className="px-4 py-2.5 text-right">Платёж / мес</th>
                <th className="px-4 py-2.5 text-right">Переплата</th>
                <th
                  className="px-4 py-2.5 text-right"
                  title="Что стоит +1 год к сроку: насколько вырастет общая переплата и насколько снизится платёж"
                >
                  Цена лишнего года
                </th>
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
                    knee === r.years && optimal !== r.years && "bg-accent/10",
                  )}
                >
                  <td className="px-4 py-2">
                    {r.years} {yearWord(r.years)}
                    {optimal === r.years && (
                      <span
                        className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                        title="Самый короткий срок, платёж которого укладывается в комфортный"
                      >
                        мин. в бюджете
                      </span>
                    )}
                    {knee === r.years && optimal !== r.years && (
                      <span
                        className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-foreground"
                        title="Дальше увеличение срока почти не снижает платёж, а переплата продолжает расти"
                      >
                        дальше нет смысла
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
                  <td className="tnum px-4 py-2 text-right text-xs">
                    {r.overpayStep > 0 ? (
                      <span>
                        <span className="text-neg">
                          +{moneyShort(r.overpayStep)}
                        </span>{" "}
                        переплаты
                        <br />
                        <span className="text-pos">
                          −{money(r.reliefStep)} ₽/мес
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="tnum px-4 py-2 text-right">
                    {money(r.total)} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. платёж и переплата от срока */}
      <figure className="space-y-1">
        <figcaption className="text-xs text-muted-foreground">
          Платёж и переплата в зависимости от срока. Линии — мин. срок в
          бюджете и точка убывающей отдачи.
        </figcaption>
        <div className="h-72 w-full rounded-xl bg-panel p-4">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
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
              {optimal && (
                <ReferenceLine
                  yAxisId="m"
                  x={optimal}
                  stroke="var(--primary)"
                  strokeDasharray="3 3"
                />
              )}
              <Tooltip
                formatter={(v, n) => [`${money(Number(v))} ₽`, n]}
                labelFormatter={(l) => `${l} ${yearWord(Number(l))}`}
                contentStyle={TIP}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
      </figure>

      {/* 2. компромисс: платёж против переплаты */}
      <figure className="space-y-1">
        <figcaption className="text-xs text-muted-foreground">
          Компромисс: каждая точка — срок от 1 до 30 лет. Изгиб — там, где
          удлинение срока почти перестаёт снижать платёж, а переплата всё растёт.
        </figcaption>
        <div className="h-72 w-full rounded-xl bg-panel p-4">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
              <XAxis
                type="number"
                dataKey="monthly"
                name="Платёж"
                tickFormatter={(v) => moneyShort(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                dataKey="overpay"
                tickFormatter={(v) => moneyShort(v)}
                width={54}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              {c.comfort > 0 && (
                <ReferenceLine
                  x={c.comfort}
                  stroke="var(--pos)"
                  strokeDasharray="4 4"
                  label={{
                    value: "комфортный платёж",
                    fontSize: 10,
                    fill: "var(--pos)",
                    position: "insideTopLeft",
                  }}
                />
              )}
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                formatter={(v) => `${money(Number(v))} ₽`}
                labelFormatter={() => ""}
                contentStyle={TIP}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof rows)[number];
                  return (
                    <div style={TIP as React.CSSProperties} className="px-2 py-1">
                      <div className="font-medium">
                        {p.years} {yearWord(p.years)}
                      </div>
                      <div>платёж {money(p.monthly)} ₽/мес</div>
                      <div>переплата {money(p.overpay)} ₽</div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="overpay"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={(props) => {
                  const p = props.payload as (typeof rows)[number];
                  const hit = p.years === optimal || p.years === knee;
                  return (
                    <circle
                      key={p.years}
                      cx={props.cx}
                      cy={props.cy}
                      r={hit ? 5 : 2.5}
                      fill={
                        p.years === optimal
                          ? "var(--primary)"
                          : p.years === knee
                            ? "var(--accent-foreground)"
                            : "var(--chart-2)"
                      }
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>

      {/* 3. структура выплат по годам для выбранного срока */}
      <figure className="space-y-1">
        <figcaption className="text-xs text-muted-foreground">
          Куда уходят платежи при сроке {c.tableTerm} {yearWord(c.tableTerm)}:
          первые годы — почти одни проценты.
        </figcaption>
        <div className="h-72 w-full rounded-xl bg-panel p-4">
          <ResponsiveContainer>
            <BarChart data={split} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                width={54}
                tickFormatter={(v) => moneyShort(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v, n) => [`${money(Number(v))} ₽`, n]}
                labelFormatter={(l) => `${l}-й год`}
                contentStyle={TIP}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="interest"
                name="Проценты"
                stackId="a"
                fill="var(--chart-2)"
              />
              <Bar
                dataKey="principal"
                name="Тело кредита"
                stackId="a"
                fill="var(--chart-1)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>

      {/* 4. сравнение первоначальных взносов */}
      <figure className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <figcaption className="text-xs text-muted-foreground">
            Сравнение взносов —{" "}
            {cmpMetric === "monthly" ? "платёж/мес" : "переплата"} по сроку
          </figcaption>
          <div className="flex h-7 rounded-md border border-input p-0.5 text-xs">
            {(
              [
                ["monthly", "платёж"],
                ["overpay", "переплата"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setCmpMetric(k)}
                className={cn(
                  "rounded px-2 transition-colors",
                  cmpMetric === k
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {cmpPct.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: CMP_COLORS[i % CMP_COLORS.length] }}
                />
                <NumberField
                  value={p}
                  min={0}
                  max={95}
                  inputMode="numeric"
                  onChange={(n) =>
                    setCmpPct((a) => a.map((x, j) => (j === i ? n : x)))
                  }
                  className="h-5 w-9 border-0 bg-transparent px-0 text-right"
                />
                %
                <span className="tnum text-muted-foreground">
                  {moneyShort(Math.round((c.price * p) / 100))}
                </span>
                {cmpPct.length > 1 && (
                  <button
                    type="button"
                    aria-label="убрать"
                    onClick={() =>
                      setCmpPct((a) => a.filter((_, j) => j !== i))
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {cmpPct.length < 4 && (
              <button
                type="button"
                onClick={() => setCmpPct((a) => [...a, 50])}
                className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                + взнос
              </button>
            )}
          </div>
        </div>
        <div className="h-72 w-full rounded-xl bg-panel p-4">
          <ResponsiveContainer>
            <LineChart
              data={cmpData}
              margin={{ left: 8, right: 8, top: 8, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="years"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                width={54}
                tickFormatter={(v) => moneyShort(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v, n) => [`${money(Number(v))} ₽`, n]}
                labelFormatter={(l) => `${l} ${yearWord(Number(l))}`}
                contentStyle={TIP}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {cmpU.map((p) => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={`p${p}`}
                  name={`взнос ${p}%`}
                  stroke={CMP_COLORS[cmpPct.indexOf(p) % CMP_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
