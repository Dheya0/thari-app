/**
 * THARI Financial Application — Currency-Aware Insights Engine
 * Calculates meaningful financial metrics, spending velocity, budget tracking,
 * and contextual advisory alerts.
 */

import { Transaction, Budget, Debt, Category } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { getActiveTransactions } from './balanceEngine';

export interface FinancialHealthMetrics {
  currentMonthExpense: number;
  lastMonthExpense: number;
  monthOverMonthExpenseChangePct: number;
  currentMonthIncome: number;
  netSavingsCurrentMonth: number;
  savingsRatePct: number;
  averageDailyExpense: number;
  topExpenseCategory: {
    categoryName: string;
    amount: number;
    percentage: number;
    color: string;
  } | null;
  budgetAdherence: {
    totalBudgeted: number;
    totalSpentOnBudgeted: number;
    overBudgetCategoriesCount: number;
  };
  debtRatio: {
    totalDebtsToMe: number;
    totalDebtsOnMe: number;
    netDebtPosition: number;
  };
}

export function calculateFinancialInsights(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  debts: Debt[],
  baseCurrencyCode: string = 'SAR',
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): FinancialHealthMetrics {
  const activeTxs = getActiveTransactions(transactions);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Format strings for prefix matching: YYYY-MM
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  let lastMonthExpense = 0;

  const currentMonthExpenseByCat: Record<string, number> = {};

  activeTxs.forEach(t => {
    const convertedAmount = convertCurrency(t.amount, t.currency, baseCurrencyCode, exchangeRates);
    const txDatePrefix = (t.date || '').substring(0, 7);

    if (txDatePrefix === currentMonthStr) {
      if (t.type === 'income') {
        currentMonthIncome += convertedAmount;
      } else if (t.type === 'expense') {
        currentMonthExpense += convertedAmount;
        currentMonthExpenseByCat[t.categoryId] = (currentMonthExpenseByCat[t.categoryId] || 0) + convertedAmount;
      }
    } else if (txDatePrefix === lastMonthStr) {
      if (t.type === 'expense') {
        lastMonthExpense += convertedAmount;
      }
    }
  });

  // Month-over-month calculation
  let monthOverMonthExpenseChangePct = 0;
  if (lastMonthExpense > 0) {
    monthOverMonthExpenseChangePct = ((currentMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
  }

  // Daily average
  const currentDayOfMonth = Math.max(1, now.getDate());
  const averageDailyExpense = currentMonthExpense / currentDayOfMonth;

  // Savings rate
  const netSavingsCurrentMonth = currentMonthIncome - currentMonthExpense;
  const savingsRatePct = currentMonthIncome > 0 ? Math.max(0, (netSavingsCurrentMonth / currentMonthIncome) * 100) : 0;

  // Top category
  let topExpenseCategory: FinancialHealthMetrics['topExpenseCategory'] = null;
  let maxSpent = 0;
  let topCatId = '';

  Object.entries(currentMonthExpenseByCat).forEach(([catId, spent]) => {
    if (spent > maxSpent) {
      maxSpent = spent;
      topCatId = catId;
    }
  });

  if (topCatId && currentMonthExpense > 0) {
    const catObj = categories.find(c => c.id === topCatId);
    topExpenseCategory = {
      categoryName: catObj ? catObj.name : 'أخرى',
      amount: maxSpent,
      percentage: (maxSpent / currentMonthExpense) * 100,
      color: catObj ? catObj.color : '#f59e0b',
    };
  }

  // Budget Adherence
  let totalBudgeted = 0;
  let totalSpentOnBudgeted = 0;
  let overBudgetCategoriesCount = 0;

  budgets.forEach(b => {
    const bAmt = b.amount || 0;
    totalBudgeted += bAmt;
    const spentOnThisCat = currentMonthExpenseByCat[b.categoryId] || 0;
    totalSpentOnBudgeted += spentOnThisCat;
    if (spentOnThisCat > bAmt) {
      overBudgetCategoriesCount++;
    }
  });

  // Debts
  let totalDebtsToMe = 0;
  let totalDebtsOnMe = 0;

  debts.forEach(d => {
    if (d.isPaid) return;
    const remaining = Math.max(0, d.amount - (d.paidAmount || 0));
    const converted = convertCurrency(remaining, d.currency, baseCurrencyCode, exchangeRates);
    if (d.type === 'to_me') {
      totalDebtsToMe += converted;
    } else {
      totalDebtsOnMe += converted;
    }
  });

  return {
    currentMonthExpense,
    lastMonthExpense,
    monthOverMonthExpenseChangePct,
    currentMonthIncome,
    netSavingsCurrentMonth,
    savingsRatePct,
    averageDailyExpense,
    topExpenseCategory,
    budgetAdherence: {
      totalBudgeted,
      totalSpentOnBudgeted,
      overBudgetCategoriesCount,
    },
    debtRatio: {
      totalDebtsToMe,
      totalDebtsOnMe,
      netDebtPosition: totalDebtsToMe - totalDebtsOnMe,
    },
  };
}
