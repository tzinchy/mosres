export const MORTGAGE_KEY = "mosres-mortgage";

export type Program = "family" | "market" | "custom";

export interface MortgageCfg {
  price: number;
  downPct: number;
  program: Program;
  familyRate: number;
  marketRate: number; // 0 = не задано, подставится из /rates
  customRate: number;
  comfort: number;
  tableTerm: number; // срок для оценки платежа в таблице квартир, лет
  compareDowns: number[]; // доп. доли взноса (%) для сравнения на графиках
}

export const MORTGAGE_DEFAULT: MortgageCfg = {
  price: 15_000_000,
  downPct: 20,
  program: "family",
  familyRate: 6,
  marketRate: 0,
  customRate: 20,
  comfort: 150_000,
  tableTerm: 20,
  compareDowns: [],
};

export function loadMortgageCfg(): MortgageCfg {
  try {
    const cfg = {
      ...MORTGAGE_DEFAULT,
      ...JSON.parse(localStorage.getItem(MORTGAGE_KEY) ?? "{}"),
    };
    // heal junk from earlier builds: keep valid numbers, at most 3 extras
    cfg.compareDowns = (
      Array.isArray(cfg.compareDowns) ? cfg.compareDowns : []
    )
      .map((n: unknown) => Number(n))
      .filter((n: number) => Number.isFinite(n) && n >= 0 && n <= 95)
      .slice(0, 3);
    return cfg;
  } catch {
    return { ...MORTGAGE_DEFAULT };
  }
}

/** monthly annuity payment */
export function annuity(
  loan: number,
  annualPct: number,
  months: number,
): number {
  const r = annualPct / 100 / 12;
  if (r <= 0) return loan / months;
  const k = Math.pow(1 + r, months);
  return (loan * r * k) / (k - 1);
}

/** effective annual rate for a config, given the market fallback from /rates */
export function cfgRate(c: MortgageCfg, marketFallback: number): number {
  if (c.program === "family") return c.familyRate;
  if (c.program === "market") return c.marketRate || marketFallback || 20;
  return c.customRate;
}

/** estimated monthly payment for an apartment price under a saved config */
export function monthlyFor(
  price: number,
  c: MortgageCfg,
  marketFallback: number,
): number {
  const loan = Math.max(0, price - (price * c.downPct) / 100);
  return annuity(loan, cfgRate(c, marketFallback), c.tableTerm * 12);
}

/** distinct colour per compared down payment, in list order */
export const DOWN_COLORS = ["#4363d8", "#3cb44b", "#d98324", "#e6194b"];

/** the ordered list of down-payment shares (%) every chart draws: current first, then saved extras */
export function resolveDowns(c: MortgageCfg): number[] {
  return [c.downPct, ...c.compareDowns]
    .filter((p) => p >= 0 && p <= 95)
    .slice(0, 4);
}

export function loanFor(price: number, downPct: number): number {
  return Math.max(0, price - Math.round((price * downPct) / 100));
}
