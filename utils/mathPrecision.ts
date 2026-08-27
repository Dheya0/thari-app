/**
 * THARI Financial Application — Safe Math & Precision Engine
 * Prevents IEEE-754 floating-point inaccuracies in financial calculations,
 * currency conversions, ledger reconciliations, and Zakat evaluations.
 */

const PRECISION_FACTOR = 1000000; // 6 decimal places internal precision

/**
 * Safely adds two or more numbers avoiding floating point artifacts
 */
export function safeAdd(...numbers: (number | string | undefined | null)[]): number {
  const sum = numbers.reduce<number>((acc, curr) => {
    const val = Number(curr) || 0;
    return acc + Math.round(val * PRECISION_FACTOR);
  }, 0);
  return sum / PRECISION_FACTOR;
}

/**
 * Safely subtracts subtrahends from minuend
 */
export function safeSub(minuend: number | string, ...subtrahends: (number | string | undefined | null)[]): number {
  const minVal = Math.round((Number(minuend) || 0) * PRECISION_FACTOR);
  const subSum = subtrahends.reduce<number>((acc, curr) => {
    const val = Number(curr) || 0;
    return acc + Math.round(val * PRECISION_FACTOR);
  }, 0);
  return (minVal - subSum) / PRECISION_FACTOR;
}

/**
 * Safely multiplies numbers
 */
export function safeMul(a: number | string, b: number | string): number {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return Math.round(numA * numB * PRECISION_FACTOR) / PRECISION_FACTOR;
}

/**
 * Safely divides dividend by divisor with zero-division protection
 */
export function safeDiv(dividend: number | string, divisor: number | string, fallback = 0): number {
  const div = Number(divisor) || 0;
  if (div === 0) return fallback;
  const num = Number(dividend) || 0;
  return Math.round((num / div) * PRECISION_FACTOR) / PRECISION_FACTOR;
}

/**
 * Rounds a monetary amount to specific currency decimal places (default 2)
 */
export function roundToCurrency(amount: number | string, decimalPlaces = 2): number {
  const num = Number(amount) || 0;
  const factor = Math.pow(10, decimalPlaces);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Safely calculates percentage (e.g. 2.5% for Zakat or savings rate)
 */
export function safePercent(amount: number | string, percentageRate: number | string): number {
  const num = Number(amount) || 0;
  const rate = Number(percentageRate) || 0;
  return safeMul(num, safeDiv(rate, 100));
}

/**
 * Checks if two monetary amounts are virtually equal within epsilon threshold
 */
export function areAmountsEqual(a: number | string, b: number | string, epsilon = 0.005): boolean {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  return Math.abs(numA - numB) < epsilon;
}
