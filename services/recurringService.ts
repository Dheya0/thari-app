/**
 * THARI Financial Application — Recurring Transactions Engine
 * Handles automated generation of scheduled transactions (salaries, rent, subscriptions, bills)
 * with strict idempotency protection preventing duplicate executions.
 */

import { RecurringRule, Transaction } from '../types';

export function parseDateOnly(dateStr: string): { year: number; month: number; day: number } {
  const parts = (dateStr || '').split('-').map(Number);
  return {
    year: parts[0] || new Date().getFullYear(),
    month: (parts[1] || 1) - 1, // 0-indexed
    day: parts[2] || 1,
  };
}

export function formatDateOnly(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function isLastDayOfMonth(year: number, month: number, day: number): boolean {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return day === lastDay;
}

/**
 * Calculates the next occurrence date string (YYYY-MM-DD) with timezone safety,
 * end-of-month anchoring, and leap year handling.
 */
export function calculateNextDate(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  originalStartDateStr?: string
): string {
  const { year, month, day } = parseDateOnly(currentDateStr);
  const base = originalStartDateStr ? parseDateOnly(originalStartDateStr) : { year, month, day };
  const wasLastDay = isLastDayOfMonth(base.year, base.month, base.day);

  if (frequency === 'daily') {
    const d = new Date(year, month, day + 1);
    return formatDateOnly(d.getFullYear(), d.getMonth(), d.getDate());
  } else if (frequency === 'weekly') {
    const d = new Date(year, month, day + 7);
    return formatDateOnly(d.getFullYear(), d.getMonth(), d.getDate());
  } else if (frequency === 'monthly') {
    let targetYear = year;
    let targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }

    const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
    let targetDay = base.day;

    if (wasLastDay) {
      targetDay = lastDayOfTarget;
    } else {
      targetDay = Math.min(base.day, lastDayOfTarget);
    }

    return formatDateOnly(targetYear, targetMonth, targetDay);
  } else if (frequency === 'yearly') {
    let targetYear = year + 1;
    let targetMonth = month;
    let targetDay = base.day;

    // Leap year handling for Feb 29
    if (base.month === 1 && base.day === 29) {
      const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
      targetDay = isLeap ? 29 : 28;
    } else if (wasLastDay) {
      targetDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    } else {
      targetDay = Math.min(base.day, new Date(targetYear, targetMonth + 1, 0).getDate());
    }

    return formatDateOnly(targetYear, targetMonth, targetDay);
  }

  return currentDateStr;
}

export const computeNextOccurrence = calculateNextDate;

/**
 * Process all active recurring rules and generate due transactions
 * with full catch-up capability, strict idempotency, and timezone safety.
 */
export function processDueRecurringRules(
  rules: RecurringRule[],
  existingTransactions: Transaction[],
  asOfDateStr?: string
): {
  newTransactions: Transaction[];
  updatedRules: RecurringRule[];
} {
  const todayStr = asOfDateStr || new Date().toISOString().split('T')[0];
  const newTransactions: Transaction[] = [];
  const updatedRules: RecurringRule[] = [];

  // Build a set of existing occurrence keys to ensure idempotency: ruleId:occurrenceDate
  const existingOccurrenceKeys = new Set<string>();
  existingTransactions.forEach(t => {
    if (t.recurrenceId && t.occurrenceDate) {
      existingOccurrenceKeys.add(`${t.recurrenceId}:${t.occurrenceDate}`);
    }
  });

  rules.forEach(rule => {
    if (!rule.isActive) {
      updatedRules.push(rule);
      return;
    }

    let currentNext = rule.nextOccurrence || rule.startDate;
    let ruleModified = false;
    let iterations = 0;
    const maxSafetyIterations = 5000; // Large safety limit against corrupted data loops, not a financial cap

    while (currentNext <= todayStr && iterations < maxSafetyIterations) {
      // Check if end date passed (occurrence on endDate is allowed if currentNext === endDate)
      if (rule.endDate && currentNext > rule.endDate) {
        break;
      }

      const occurrenceKey = `${rule.id}:${currentNext}`;
      if (!existingOccurrenceKeys.has(occurrenceKey)) {
        const newTx: Transaction = {
          id: `rec-${rule.id}-${currentNext}`,
          accountId: rule.accountId,
          walletId: rule.walletId,
          destinationWalletId: rule.destinationWalletId,
          currency: rule.currency,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          note: `[دوري] ${rule.description}`,
          date: currentNext,
          frequency: rule.frequency,
          recurrenceId: rule.id,
          occurrenceDate: currentNext,
          createdAt: new Date().toISOString(),
          syncStatus: 'PENDING',
        };

        newTransactions.push(newTx);
        existingOccurrenceKeys.add(occurrenceKey);
      }

      // Advance next occurrence using start date anchoring for end-of-month rules
      currentNext = calculateNextDate(currentNext, rule.frequency, rule.startDate);
      ruleModified = true;
      iterations++;
    }

    if (ruleModified) {
      updatedRules.push({
        ...rule,
        nextOccurrence: currentNext,
        lastGeneratedDate: todayStr,
      });
    } else {
      updatedRules.push(rule);
    }
  });

  return { newTransactions, updatedRules };
}

/**
 * Test runner for recurring engine to verify invariants, catch-up, end-of-month, leap year, and idempotency.
 */
export function runRecurringEngineTests(): { allPassed: boolean; testResults: Array<{ testName: string; passed: boolean; details: string }> } {
  const testResults: Array<{ testName: string; passed: boolean; details: string }> = [];

  // Test 1: Monthly End-of-Month (Jan 31 -> Feb 28 -> Mar 31)
  const d1 = calculateNextDate('2026-01-31', 'monthly', '2026-01-31');
  const d2 = calculateNextDate(d1, 'monthly', '2026-01-31');
  const d3 = calculateNextDate(d2, 'monthly', '2026-01-31');
  const test1Passed = d1 === '2026-02-28' && d2 === '2026-03-31' && d3 === '2026-04-30';
  testResults.push({
    testName: 'Monthly End-of-Month Propagation (Jan 31 -> Feb 28 -> Mar 31 -> Apr 30)',
    passed: test1Passed,
    details: `Got ${d1}, ${d2}, ${d3}`,
  });

  // Test 2: Leap Year (29 Feb 2028 -> 29 Mar 2028, and 29 Feb 2028 -> 28 Feb 2029)
  const leap1 = calculateNextDate('2028-02-29', 'yearly', '2028-02-29');
  const test2Passed = leap1 === '2029-02-28';
  testResults.push({
    testName: 'Leap Year to Non-Leap Year Yearly (29 Feb 2028 -> 28 Feb 2029)',
    passed: test2Passed,
    details: `Got ${leap1}`,
  });

  // Test 3: Idempotency (Run engine 1 time -> N tx, Run engine again -> still N tx, not 2N)
  const rule: RecurringRule = {
    id: 'r-test-1',
    walletId: 'w-1',
    type: 'expense',
    categoryId: 'c-1',
    amount: 100,
    currency: 'SAR',
    description: 'Test Rent',
    frequency: 'monthly',
    startDate: '2026-01-31',
    nextOccurrence: '2026-01-31',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const run1 = processDueRecurringRules([rule], [], '2026-04-30');
  const run2 = processDueRecurringRules(run1.updatedRules, run1.newTransactions, '2026-04-30');
  const idempotencyPassed = run1.newTransactions.length > 0 && run2.newTransactions.length === 0;
  testResults.push({
    testName: 'Idempotency (Run 1 -> N tx, Run 2 immediately -> 0 new tx)',
    passed: idempotencyPassed,
    details: `Run 1 generated ${run1.newTransactions.length}, Run 2 generated ${run2.newTransactions.length}`,
  });

  // Test 4: Paused rule
  const pausedRule: RecurringRule = {
    ...rule,
    id: 'r-test-paused',
    isActive: false,
    nextOccurrence: '2026-01-31',
  };
  const pausedRun = processDueRecurringRules([pausedRule], [], '2026-04-30');
  const pausedPassed = pausedRun.newTransactions.length === 0;
  testResults.push({
    testName: 'Paused Rule Inactive (Generates 0 transactions)',
    passed: pausedPassed,
    details: `Generated ${pausedRun.newTransactions.length} transactions`,
  });

  // Test 5: End date boundary
  const endedRule: RecurringRule = {
    ...rule,
    id: 'r-test-ended',
    startDate: '2026-01-31',
    endDate: '2026-02-28',
    nextOccurrence: '2026-01-31',
  };
  const endedRun = processDueRecurringRules([endedRule], [], '2026-05-31');
  const endedPassed = endedRun.newTransactions.length === 2 && endedRun.newTransactions.every(t => t.occurrenceDate! <= '2026-02-28');
  testResults.push({
    testName: 'End Date Boundary (Stops strictly at endDate)',
    passed: endedPassed,
    details: `Generated ${endedRun.newTransactions.length} transactions up to ${endedRun.newTransactions[endedRun.newTransactions.length - 1]?.occurrenceDate}`,
  });

  const allPassed = testResults.every(r => r.passed);
  return { allPassed, testResults };
}
