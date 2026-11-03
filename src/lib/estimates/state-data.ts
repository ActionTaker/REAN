/**
 * State-level cost benchmarks used to pre-fill new deals. All are averages;
 * the UI labels every pre-filled value as an estimate the user can override.
 *
 * insurance  — average annual HO-3 premium, $300k dwelling / $1k deductible.
 *              Insurance.com, Sept 2026.
 * closingPct — average buyer closing costs as % of price (purchase with mortgage).
 *              Lodestar 2025 report via Bankrate.
 * costIndex  — approximate residential construction cost factor vs. U.S. average
 *              (1.00), used to scale rehab estimates. Rounded regional figures.
 */
export interface StateBenchmark {
  insurance: number;
  closingPct: string;
  costIndex: string;
}

export const STATE_BENCHMARKS: Record<string, StateBenchmark> = {
  AL: { insurance: 3716, closingPct: "0.89", costIndex: "0.88" },
  AK: { insurance: 1492, closingPct: "0.54", costIndex: "1.25" },
  AZ: { insurance: 2397, closingPct: "0.76", costIndex: "0.95" },
  AR: { insurance: 3195, closingPct: "0.84", costIndex: "0.86" },
  CA: { insurance: 1653, closingPct: "0.74", costIndex: "1.22" },
  CO: { insurance: 5511, closingPct: "0.59", costIndex: "1.02" },
  CT: { insurance: 2132, closingPct: "0.93", costIndex: "1.12" },
  DE: { insurance: 1461, closingPct: "2.99", costIndex: "1.04" },
  DC: { insurance: 1558, closingPct: "2.39", costIndex: "1.10" },
  FL: { insurance: 8471, closingPct: "1.82", costIndex: "0.93" },
  GA: { insurance: 2301, closingPct: "1.24", costIndex: "0.90" },
  HI: { insurance: 738, closingPct: "0.62", costIndex: "1.30" },
  ID: { insurance: 2412, closingPct: "0.70", costIndex: "0.92" },
  IL: { insurance: 2802, closingPct: "1.30", costIndex: "1.10" },
  IN: { insurance: 2869, closingPct: "0.70", costIndex: "0.93" },
  IA: { insurance: 3148, closingPct: "0.64", costIndex: "0.95" },
  KS: { insurance: 5289, closingPct: "0.80", costIndex: "0.92" },
  KY: { insurance: 4471, closingPct: "0.91", costIndex: "0.91" },
  LA: { insurance: 5185, closingPct: "1.20", costIndex: "0.89" },
  ME: { insurance: 1299, closingPct: "0.88", costIndex: "0.98" },
  MD: { insurance: 2242, closingPct: "2.03", costIndex: "1.00" },
  MA: { insurance: 2112, closingPct: "0.81", costIndex: "1.18" },
  MI: { insurance: 3071, closingPct: "1.08", costIndex: "0.99" },
  MN: { insurance: 3333, closingPct: "0.91", costIndex: "1.05" },
  MS: { insurance: 2602, closingPct: "0.98", costIndex: "0.86" },
  MO: { insurance: 3783, closingPct: "0.60", costIndex: "0.98" },
  MT: { insurance: 3221, closingPct: "0.60", costIndex: "0.95" },
  NE: { insurance: 5513, closingPct: "0.74", costIndex: "0.93" },
  NV: { insurance: 1876, closingPct: "0.84", costIndex: "1.03" },
  NH: { insurance: 1324, closingPct: "1.34", costIndex: "1.02" },
  NJ: { insurance: 1449, closingPct: "0.92", costIndex: "1.15" },
  NM: { insurance: 3497, closingPct: "0.84", costIndex: "0.92" },
  NY: { insurance: 1844, closingPct: "2.47", costIndex: "1.20" },
  NC: { insurance: 3799, closingPct: "0.56", costIndex: "0.88" },
  ND: { insurance: 2846, closingPct: "0.69", costIndex: "0.95" },
  OH: { insurance: 2109, closingPct: "1.07", costIndex: "0.94" },
  OK: { insurance: 5378, closingPct: "1.08", costIndex: "0.88" },
  OR: { insurance: 1647, closingPct: "0.67", costIndex: "1.05" },
  PA: { insurance: 1434, closingPct: "2.36", costIndex: "1.03" },
  RI: { insurance: 2379, closingPct: "0.75", costIndex: "1.10" },
  SC: { insurance: 2870, closingPct: "0.65", costIndex: "0.88" },
  SD: { insurance: 3740, closingPct: "0.46", costIndex: "0.90" },
  TN: { insurance: 3198, closingPct: "1.18", costIndex: "0.89" },
  TX: { insurance: 4582, closingPct: "0.93", costIndex: "0.89" },
  UT: { insurance: 1771, closingPct: "0.72", costIndex: "0.93" },
  VT: { insurance: 1017, closingPct: "2.20", costIndex: "0.98" },
  VA: { insurance: 1939, closingPct: "1.36", costIndex: "0.95" },
  WA: { insurance: 1766, closingPct: "1.01", costIndex: "1.08" },
  WV: { insurance: 1961, closingPct: "1.14", costIndex: "0.94" },
  WI: { insurance: 1836, closingPct: "0.76", costIndex: "1.00" },
  WY: { insurance: 2075, closingPct: "0.76", costIndex: "0.93" },
};

export const NATIONAL: StateBenchmark = { insurance: 2872, closingPct: "1.00", costIndex: "1.00" };

export function benchmarkFor(state: string | null | undefined): { code: string | null; data: StateBenchmark } {
  const code = state?.toUpperCase() ?? null;
  const data = code ? STATE_BENCHMARKS[code] : undefined;
  return data ? { code, data } : { code: null, data: NATIONAL };
}
