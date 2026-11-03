import { D, ONE, ZERO } from "./decimal";

function npv(rate: D, cashFlows: D[]): D {
  const base = ONE.plus(rate);
  return cashFlows.reduce((acc, cf, t) => acc.plus(cf.div(base.pow(t))), ZERO);
}

/**
 * Internal rate of return for evenly spaced (annual) cash flows, where
 * cashFlows[0] is the initial (negative) investment.
 * Solved by bisection — slower than Newton's method but it always converges
 * when a sign change exists, which matters more than speed here.
 */
export function irr(cashFlows: D[]): D | null {
  if (cashFlows.length < 2) return null;
  const hasNegative = cashFlows.some((c) => c.isNegative());
  const hasPositive = cashFlows.some((c) => c.isPositive());
  if (!hasNegative || !hasPositive) return null;

  let low = new D(-0.9999);
  let high = new D(10); // 1000%
  let npvLow = npv(low, cashFlows);
  const npvHigh = npv(high, cashFlows);
  if (npvLow.isNegative() === npvHigh.isNegative()) return null;

  const tolerance = new D("1e-10");
  for (let i = 0; i < 200; i++) {
    const mid = low.plus(high).div(2);
    const npvMid = npv(mid, cashFlows);
    if (npvMid.abs().lt(tolerance) || high.minus(low).lt(tolerance)) return mid;
    if (npvMid.isNegative() === npvLow.isNegative()) {
      low = mid;
      npvLow = npvMid;
    } else {
      high = mid;
    }
  }
  return low.plus(high).div(2);
}
