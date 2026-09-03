export const MORTGAGE_KEY = "mosres-mortgage";

export type Program = "family" | "market" | "custom";

export interface MortgageCfg {
  price: number;
  /** первоначальный взнос — АБСОЛЮТНАЯ сумма в ₽ («мои деньги»), одна и та же для любой квартиры */
  downRub: number;
  program: Program;
  familyRate: number;
  marketRate: number; // 0 = не задано, подставится из /rates
  customRate: number;
  comfort: number;
  tableTerm: number; // срок для оценки платежа в таблице квартир, лет
  compareDowns: number[]; // доп. суммы взноса, ₽, для сравнения на графиках
}

export const MORTGAGE_DEFAULT: MortgageCfg = {
  price: 15_000_000,
  downRub: 3_000_000,
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
    const raw = JSON.parse(localStorage.getItem(MORTGAGE_KEY) ?? "{}");
    const cfg = { ...MORTGAGE_DEFAULT, ...raw };
    const price = Number(cfg.price) || MORTGAGE_DEFAULT.price;

    // migrate the old percent-based model (downPct + compareDowns as %)
    if (cfg.downRub == null && raw.downPct != null) {
      cfg.downRub = Math.round((price * Number(raw.downPct)) / 100);
    }
    let cd = (Array.isArray(cfg.compareDowns) ? cfg.compareDowns : [])
      .map((n: unknown) => Number(n))
      .filter((n: number) => Number.isFinite(n) && n >= 0);
    // old values were percentages (all tiny); anything ≤ 95 → treat as %
    if (cd.length && cd.every((n: number) => n > 0 && n <= 95)) {
      cd = cd.map((p: number) => Math.round((price * p) / 100));
    }
    cfg.compareDowns = cd.slice(0, 3);
    if (!Number.isFinite(cfg.downRub)) cfg.downRub = MORTGAGE_DEFAULT.downRub;
    delete (cfg as Record<string, unknown>).downPct;
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

/** loan body = price minus the (fixed) down payment, never below zero */
export function loanFor(price: number, downRub: number): number {
  return Math.max(0, price - Math.min(downRub, price));
}

/** estimated monthly payment for an apartment price under a saved config */
export function monthlyFor(
  price: number,
  c: MortgageCfg,
  marketFallback: number,
): number {
  return annuity(
    loanFor(price, c.downRub),
    cfgRate(c, marketFallback),
    c.tableTerm * 12,
  );
}

/** distinct colour per compared down payment, in list order */
export const DOWN_COLORS = ["#4363d8", "#3cb44b", "#d98324", "#e6194b"];

/** banks typically want at least this share down; below it — "недостаточно средств" */
export const MIN_DOWN_PCT = 20;

/** what share of the price a ₽ down payment covers, 1 decimal */
export function pctOfPrice(rub: number, price: number): number {
  return price > 0 ? Math.round((rub / price) * 1000) / 10 : 0;
}

/** the ordered list of down-payment sums (₽) every chart draws: current first, then saved extras */
export function resolveDownRubs(c: MortgageCfg): number[] {
  return [c.downRub, ...c.compareDowns].filter((r) => r >= 0).slice(0, 4);
}
