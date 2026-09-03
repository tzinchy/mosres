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
};

export function loadMortgageCfg(): MortgageCfg {
  try {
    return {
      ...MORTGAGE_DEFAULT,
      ...JSON.parse(localStorage.getItem(MORTGAGE_KEY) ?? "{}"),
    };
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
