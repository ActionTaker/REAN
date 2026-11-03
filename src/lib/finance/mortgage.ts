import { D, ONE, TWELVE, ZERO, pct, type DecimalLike } from "./decimal";
import type { AmortizationYear } from "./types";

/**
 * Fixed-rate monthly payment (principal + interest):
 *   P = L · r(1+r)^n / ((1+r)^n − 1),  r = annual rate / 12,  n = years · 12
 * With a 0% rate the payment is simply L / n.
 */
export function monthlyPayment(loanAmount: D, annualRatePercent: DecimalLike, termYears: number): D {
  if (loanAmount.lte(0) || termYears <= 0) return ZERO;
  const n = termYears * 12;
  const r = pct(annualRatePercent).div(TWELVE);
  if (r.isZero()) return loanAmount.div(n);
  const growth = ONE.plus(r).pow(n);
  return loanAmount.times(r).times(growth).div(growth.minus(ONE));
}

/** Outstanding balance after `monthsPaid` payments. */
export function remainingBalance(
  loanAmount: D,
  annualRatePercent: DecimalLike,
  termYears: number,
  monthsPaid: number,
): D {
  if (loanAmount.lte(0) || termYears <= 0) return ZERO;
  const n = termYears * 12;
  if (monthsPaid >= n) return ZERO;
  const r = pct(annualRatePercent).div(TWELVE);
  if (r.isZero()) return loanAmount.minus(loanAmount.div(n).times(monthsPaid));
  const payment = monthlyPayment(loanAmount, annualRatePercent, termYears);
  const growth = ONE.plus(r).pow(monthsPaid);
  // B_k = L(1+r)^k − P((1+r)^k − 1)/r
  const balance = loanAmount.times(growth).minus(payment.times(growth.minus(ONE)).div(r));
  return D.max(balance, ZERO);
}

/** Yearly roll-up of the month-by-month amortization schedule. */
export function amortizationByYear(
  loanAmount: D,
  annualRatePercent: DecimalLike,
  termYears: number,
  years = termYears,
): AmortizationYear[] {
  const rows: AmortizationYear[] = [];
  if (loanAmount.lte(0) || termYears <= 0) {
    for (let y = 1; y <= years; y++) {
      rows.push({ year: y, payment: ZERO, principal: ZERO, interest: ZERO, endingBalance: ZERO });
    }
    return rows;
  }

  const r = pct(annualRatePercent).div(TWELVE);
  const payment = monthlyPayment(loanAmount, annualRatePercent, termYears);
  const totalMonths = termYears * 12;
  let balance = loanAmount;

  for (let y = 1; y <= years; y++) {
    let principal = ZERO;
    let interest = ZERO;
    let paid = ZERO;
    for (let m = 1; m <= 12; m++) {
      const month = (y - 1) * 12 + m;
      if (month > totalMonths || balance.lte(0)) break;
      const monthInterest = balance.times(r);
      // The final payment clears whatever balance remains.
      let monthPrincipal = payment.minus(monthInterest);
      if (month === totalMonths || monthPrincipal.gt(balance)) monthPrincipal = balance;
      balance = balance.minus(monthPrincipal);
      principal = principal.plus(monthPrincipal);
      interest = interest.plus(monthInterest);
      paid = paid.plus(monthPrincipal).plus(monthInterest);
    }
    rows.push({ year: y, payment: paid, principal, interest, endingBalance: D.max(balance, ZERO) });
  }
  return rows;
}
