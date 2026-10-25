/**
 * THARI Financial Suite — Cashflow Forecasting & Liquidity Runway Engine
 * Provides accurate multi-currency future balance projections (30/60/90 days),
 * moving average daily burn rates, and conservative Safe-to-Spend runway calculations.
 */

import { Wallet, Transaction, RecurringRule, Debt, Budget, Currency } from '../types';
import { convertCurrency } from '../constants';
import { formatLocalDateOnly } from '../utils/formatters';
import { calculateNextDate, parseDateOnly, formatDateOnly } from './recurringService';

export interface CashflowDayPoint {
  date: string;
  dayIndex: number; // 1 to 30/60/90
  dayNameAr: string;
  openingBalance: number;
  projectedIncome: number;
  projectedExpense: number;
  netChange: number;
  closingBalance: number;
  events: {
    title: string;
    amount: number;
    type: 'income' | 'expense' | 'debt_payable' | 'debt_receivable' | 'recurring';
    currency: string;
  }[];
}

export interface SafeToSpendMetrics {
  availableLiquidity: number;
  confirmedIncomeInPeriod: number;
  committedBudgetsInPeriod: number;
  duePayablesInPeriod: number;
  simulatedReceivablesInPeriod: number;
  safeToSpendTotal: number;
  safeToSpendDaily: number;
  dailyBurnRate: number;
  runwayDays: number; // How many days liquidity lasts with zero new income
  healthStatus: 'healthy' | 'warning' | 'critical';
  currencyCode: string;
  currencySymbol: string;
}

export interface CashflowSimulationOptions {
  days: 30 | 60 | 90;
  wallets: Wallet[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  debts: Debt[];
  budgets: Budget[];
  exchangeRates: Record<string, number>;
  baseCurrency: Currency;
  filterCurrencyCode?: string | null; // null for consolidated base currency
  whatIfExpenseAmount?: number;
  includeReceivablesInWhatIf?: boolean;
}

/**
 * Calculates the 30-day moving average daily expenditure
 */
export function calculateMovingAverageDailySpend(
  transactions: Transaction[],
  wallets: Wallet[],
  exchangeRates: Record<string, number>,
  targetCurrencyCode: string
): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = formatLocalDateOnly(thirtyDaysAgo);

  const relevantExpenses = transactions.filter(t => {
    if (t.isDeleted) return false;
    if (t.type !== 'expense') return false;
    if (t.isFinancing) return false; // Exclude loan disbursements
    return t.date >= thirtyDaysAgoStr;
  });

  if (relevantExpenses.length === 0) return 0;

  const totalExpenseInTarget = relevantExpenses.reduce((sum, t) => {
    const txCurrency = t.currency || t.walletCurrency || targetCurrencyCode;
    const amountInTarget = convertCurrency(t.amount, txCurrency, targetCurrencyCode, exchangeRates);
    return sum + amountInTarget;
  }, 0);

  return totalExpenseInTarget / 30;
}

/**
 * Computes the strict Safe-to-Spend Runway metrics
 */
export function calculateSafeToSpend(
  options: CashflowSimulationOptions
): SafeToSpendMetrics {
  const {
    days,
    wallets,
    transactions,
    recurringRules,
    debts,
    budgets,
    exchangeRates,
    baseCurrency,
    filterCurrencyCode,
    includeReceivablesInWhatIf = false
  } = options;

  const targetCode = filterCurrencyCode || baseCurrency.code;
  const targetSymbol = filterCurrencyCode 
    ? (wallets.find(w => w.currencyCode === filterCurrencyCode)?.currencyCode || filterCurrencyCode) 
    : baseCurrency.symbol;

  // 1. Available Liquidity
  const relevantWallets = filterCurrencyCode 
    ? wallets.filter(w => w.currencyCode === filterCurrencyCode)
    : wallets;

  const availableLiquidity = relevantWallets.reduce((sum, w) => {
    const bal = w.currentBalance !== undefined ? w.currentBalance : (w.balance || 0);
    const converted = convertCurrency(bal, w.currencyCode, targetCode, exchangeRates);
    return sum + converted;
  }, 0);

  // 2. Confirmed Recurring Incomes over period
  let confirmedIncomeInPeriod = 0;
  const activeRecurringIncomes = recurringRules.filter(r => r.isActive && r.type === 'income');
  activeRecurringIncomes.forEach(r => {
    const rCurr = r.currency || targetCode;
    const amountInTarget = convertCurrency(r.amount, rCurr, targetCode, exchangeRates);
    let occurrences = 0;
    if (r.frequency === 'daily') occurrences = days;
    else if (r.frequency === 'weekly') occurrences = Math.floor(days / 7);
    else if (r.frequency === 'monthly') occurrences = Math.floor(days / 30);
    else if (r.frequency === 'yearly') occurrences = days >= 365 ? 1 : 0;
    confirmedIncomeInPeriod += amountInTarget * occurrences;
  });

  // 3. Committed Budgets over period
  let committedBudgetsInPeriod = 0;
  budgets.forEach(b => {
    const bCurr = b.currencyCode || targetCode;
    const monthlyAmtInTarget = convertCurrency(b.amount, bCurr, targetCode, exchangeRates);
    committedBudgetsInPeriod += (monthlyAmtInTarget / 30) * days;
  });

  // 4. Due Payables (الديون التي عليّ) within the projection period
  const todayStr = formatLocalDateOnly(new Date());
  const horizonDate = new Date(new Date().getTime() + days * 24 * 60 * 60 * 1000);
  const horizonDateStr = formatLocalDateOnly(horizonDate);

  let duePayablesInPeriod = 0;
  let simulatedReceivablesInPeriod = 0;

  debts.forEach(d => {
    if (d.isPaid) return;
    const remaining = Math.max(0, (d.amount || d.originalAmount || 0) - (d.paidAmount || 0));
    if (remaining <= 0) return;

    const debtCurr = d.currency || targetCode;
    const remainingInTarget = convertCurrency(remaining, debtCurr, targetCode, exchangeRates);

    const isDueInHorizon = d.dueDate ? (d.dueDate <= horizonDateStr) : true;

    if (isDueInHorizon) {
      if (d.type === 'on_me') {
        duePayablesInPeriod += remainingInTarget;
      } else if (d.type === 'to_me') {
        simulatedReceivablesInPeriod += remainingInTarget;
      }
    }
  });

  // Safe-to-Spend formula
  const effectiveInflow = confirmedIncomeInPeriod + (includeReceivablesInWhatIf ? simulatedReceivablesInPeriod : 0);
  const committedOutflows = committedBudgetsInPeriod + duePayablesInPeriod;
  const safeToSpendTotal = Math.max(0, availableLiquidity + effectiveInflow - committedOutflows);
  const safeToSpendDaily = safeToSpendTotal / days;

  // Daily burn rate from historical moving average
  const dailyBurnRate = calculateMovingAverageDailySpend(transactions, wallets, exchangeRates, targetCode);

  // Liquidity Runway in days
  const effectiveDailyExpense = Math.max(dailyBurnRate, committedBudgetsInPeriod / days, 1);
  const runwayDays = Math.max(0, Math.round(availableLiquidity / effectiveDailyExpense));

  // Health Status determination
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (availableLiquidity < duePayablesInPeriod || runwayDays < 15) {
    healthStatus = 'critical';
  } else if (runwayDays < 30 || safeToSpendTotal < (availableLiquidity * 0.2)) {
    healthStatus = 'warning';
  }

  return {
    availableLiquidity,
    confirmedIncomeInPeriod,
    committedBudgetsInPeriod,
    duePayablesInPeriod,
    simulatedReceivablesInPeriod,
    safeToSpendTotal,
    safeToSpendDaily,
    dailyBurnRate,
    runwayDays,
    healthStatus,
    currencyCode: targetCode,
    currencySymbol: targetSymbol,
  };
}

/**
 * Generates day-by-day cashflow trajectory
 */
export function generateCashflowTrajectory(
  options: CashflowSimulationOptions
): CashflowDayPoint[] {
  const {
    days,
    wallets,
    transactions,
    recurringRules,
    debts,
    budgets,
    exchangeRates,
    baseCurrency,
    filterCurrencyCode,
    whatIfExpenseAmount = 0,
    includeReceivablesInWhatIf = false
  } = options;

  const targetCode = filterCurrencyCode || baseCurrency.code;
  const metrics = calculateSafeToSpend(options);

  // Starting liquidity on Day 0
  let currentBalance = metrics.availableLiquidity - (whatIfExpenseAmount > 0 ? whatIfExpenseAmount : 0);

  // Pre-index recurring rules by next occurrence
  const activeRules = recurringRules.filter(r => r.isActive);

  // Pre-index debts by due date
  const activeDebts = debts.filter(d => !d.isPaid && d.dueDate);

  const trajectory: CashflowDayPoint[] = [];
  const now = new Date();

  // Baseline baseline discretionary daily burn (if no recurring rules cover today)
  const baselineDailyBurn = Math.max(0, metrics.dailyBurnRate * 0.6); // 60% discretionary, remaining covered by rules/budgets

  const arabicDayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  for (let i = 1; i <= days; i++) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dayStr = formatLocalDateOnly(dayDate);
    const dayOfWeek = arabicDayNames[dayDate.getDay()];

    const opening = currentBalance;
    let dayIncome = 0;
    let dayExpense = baselineDailyBurn;
    const events: CashflowDayPoint['events'] = [];

    if (baselineDailyBurn > 0) {
      events.push({
        title: 'المتوسط اليومي للمصاريف المعتادة',
        amount: baselineDailyBurn,
        type: 'expense',
        currency: targetCode
      });
    }

    // Check recurring rules scheduled for this date
    activeRules.forEach(rule => {
      // Basic frequency matching
      let isMatch = false;
      const { day: ruleDay } = parseDateOnly(rule.startDate);
      if (rule.frequency === 'daily') isMatch = true;
      else if (rule.frequency === 'weekly' && dayDate.getDay() === new Date(rule.startDate).getDay()) isMatch = true;
      else if (rule.frequency === 'monthly' && dayDate.getDate() === Math.min(ruleDay, new Date(dayDate.getFullYear(), dayDate.getMonth() + 1, 0).getDate())) isMatch = true;

      if (isMatch) {
        const amt = convertCurrency(rule.amount, rule.currency || targetCode, targetCode, exchangeRates);
        if (rule.type === 'income') {
          dayIncome += amt;
          events.push({
            title: rule.description || 'دخل دوري مجدول',
            amount: amt,
            type: 'income',
            currency: rule.currency || targetCode
          });
        } else if (rule.type === 'expense') {
          dayExpense += amt;
          events.push({
            title: rule.description || 'مصروف دوري مجدول',
            amount: amt,
            type: 'expense',
            currency: rule.currency || targetCode
          });
        }
      }
    });

    // Check debts due on this day
    activeDebts.forEach(d => {
      if (d.dueDate === dayStr) {
        const remaining = Math.max(0, (d.amount || d.originalAmount || 0) - (d.paidAmount || 0));
        const amt = convertCurrency(remaining, d.currency || targetCode, targetCode, exchangeRates);

        if (d.type === 'on_me') {
          dayExpense += amt;
          events.push({
            title: `استحقاق دين لـ "${d.personName}"`,
            amount: amt,
            type: 'debt_payable',
            currency: d.currency || targetCode
          });
        } else if (d.type === 'to_me' && includeReceivablesInWhatIf) {
          dayIncome += amt;
          events.push({
            title: `محاكاة تحصيل دين من "${d.personName}"`,
            amount: amt,
            type: 'debt_receivable',
            currency: d.currency || targetCode
          });
        }
      }
    });

    const netChange = dayIncome - dayExpense;
    currentBalance = opening + netChange;

    trajectory.push({
      date: dayStr,
      dayIndex: i,
      dayNameAr: dayOfWeek,
      openingBalance: opening,
      projectedIncome: dayIncome,
      projectedExpense: dayExpense,
      netChange,
      closingBalance: currentBalance,
      events
    });
  }

  return trajectory;
}
