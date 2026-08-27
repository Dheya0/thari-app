/**
 * THARI Financial Application — Recurring Transactions Engine
 * Handles automated generation of scheduled transactions (salaries, rent, subscriptions, bills)
 * with strict idempotency protection preventing duplicate executions.
 */

import { RecurringRule, Transaction } from '../types';

/**
 * Calculates the next occurrence date string (YYYY-MM-DD)
 */
export function calculateNextDate(currentDateStr: string, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  const date = new Date(currentDateStr);
  if (isNaN(date.getTime())) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  if (frequency === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split('T')[0];
}

export const computeNextOccurrence = calculateNextDate;

/**
 * Process all active recurring rules and generate due transactions
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
    const maxCatchUpIterations = 12; // Prevent infinite loop if app wasn't opened in years

    while (currentNext <= todayStr && iterations < maxCatchUpIterations) {
      // Check if end date passed
      if (rule.endDate && currentNext > rule.endDate) {
        break;
      }

      const occurrenceKey = `${rule.id}:${currentNext}`;
      if (!existingOccurrenceKeys.has(occurrenceKey)) {
        const newTx: Transaction = {
          id: `rec-tx-${rule.id}-${currentNext}-${Date.now()}`,
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

      // Advance next occurrence
      currentNext = calculateNextDate(currentNext, rule.frequency);
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
