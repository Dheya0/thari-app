import { Budget, Category, Debt, Goal, Transaction, Wallet } from '../../types';
import { convertCurrency } from '../../constants';
import { calculateWalletBalances } from '../balanceEngine';
import { safeAdd, safeSub, safeMul, safeDiv } from '../../utils/mathPrecision';
import {
  formatCurrencyAmount,
  getCurrencyMetadata,
  normalizeCurrencyCode,
} from './currencyMetadata';
import {
  computeReportFingerprint,
  generateReportId,
  buildQRPayload,
} from './reportFingerprint';
import { QueryResult } from './reportQueryService';
import {
  ReportBudgetSummary,
  ReportCategorySummary,
  ReportCurrencyBreakdown,
  ReportDebtItem,
  ReportDebtSummary,
  ReportGoalItem,
  ReportGoalSummary,
  ReportKPIs,
  ReportLedgerEntry,
  ReportMetadataInfo,
  ReportModel,
  ReportQueryParams,
  ReportScopeInfo,
  ReportWalletSummary,
} from './reportTypes';

export interface AggregationContext {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  budgets?: Budget[];
  debts?: Debt[];
  goals?: Goal[];
  userName?: string;
  userEmail?: string;
  baseCurrencyCode?: string;
  exchangeRates?: Record<string, number>;
  params: ReportQueryParams;
  queryResult: QueryResult;
}

/**
 * Builds a complete ReportModel from data sources and query parameters
 */
export function buildReportModel(context: AggregationContext): ReportModel {
  const {
    transactions,
    categories,
    wallets,
    budgets = [],
    debts = [],
    goals = [],
    userName = 'مستخدم ثري',
    userEmail,
    baseCurrencyCode = 'SAR',
    exchangeRates = {},
    params,
    queryResult,
  } = context;

  const targetCurrencyCode = normalizeCurrencyCode(params.targetCurrencyCode || baseCurrencyCode);
  const baseCurrencyMeta = getCurrencyMetadata(targetCurrencyCode);
  const language = params.language || 'ar';

  const { activeTransactions, priorTransactions, isSingleCurrency, filteredCurrencyCode, filteredWalletId, startDate, endDate } = queryResult;

  // 1. Calculate Scope Details
  const activeWallet = filteredWalletId ? wallets.find(w => w.id === filteredWalletId) : null;
  const singleCurrencyMeta = isSingleCurrency ? getCurrencyMetadata(filteredCurrencyCode) : undefined;

  let periodLabelAr = 'شامل كافة الحركات المسجلة';
  let periodLabelEn = 'All Time Recorded Transactions';
  if (startDate && endDate) {
    periodLabelAr = `من ${startDate} إلى ${endDate}`;
    periodLabelEn = `From ${startDate} to ${endDate}`;
  } else if (startDate) {
    periodLabelAr = `من ${startDate} فصاعداً`;
    periodLabelEn = `From ${startDate} onwards`;
  } else if (endDate) {
    periodLabelAr = `حتى ${endDate}`;
    periodLabelEn = `Up to ${endDate}`;
  }

  const scope: ReportScopeInfo = {
    walletId: filteredWalletId,
    walletNameAr: activeWallet ? activeWallet.name : 'كافة المحافظ المالية',
    walletNameEn: activeWallet ? activeWallet.name : 'All Wallets',
    currencyFilter: filteredCurrencyCode,
    isAllCurrencies: !isSingleCurrency,
    currencyMetadata: singleCurrencyMeta,
    startDate,
    endDate,
    periodLabelAr,
    periodLabelEn,
    baseCurrency: baseCurrencyMeta,
  };

  // 2. Calculate Opening Balance from prior transactions and initial wallet balances
  let openingBalance = 0;

  if (filteredWalletId) {
    const w = wallets.find(wal => wal.id === filteredWalletId);
    if (w) {
      const initialBal = Number(w.openingBalance) || 0;
      openingBalance = isSingleCurrency && w.currencyCode === filteredCurrencyCode
        ? initialBal
        : convertCurrency(initialBal, w.currencyCode, targetCurrencyCode, exchangeRates);
    }
  } else {
    wallets.forEach(w => {
      const initialBal = Number(w.openingBalance) || 0;
      const conv = isSingleCurrency && w.currencyCode === filteredCurrencyCode
        ? initialBal
        : (isSingleCurrency ? 0 : convertCurrency(initialBal, w.currencyCode, targetCurrencyCode, exchangeRates));
      openingBalance = safeAdd(openingBalance, conv);
    });
  }

  priorTransactions.forEach(t => {
    const rawAmt = Number(t.amount) || 0;
    if (rawAmt === 0) return;
    const amount = Math.abs(rawAmt);

    const converted = isSingleCurrency && t.currency === filteredCurrencyCode
      ? amount
      : convertCurrency(amount, t.currency, targetCurrencyCode, exchangeRates);

    if (filteredWalletId) {
      if (t.type === 'income') {
        openingBalance = safeAdd(openingBalance, converted);
      } else if (t.type === 'expense' || t.type === 'transfer_to_goal') {
        openingBalance = safeSub(openingBalance, converted);
      } else if (t.type === 'transfer') {
        if (t.walletId === filteredWalletId) {
          openingBalance = safeSub(openingBalance, converted);
        } else if (t.destinationWalletId === filteredWalletId) {
          const destAmt = (t.destinationAmount !== undefined && t.destinationAmount !== null && t.destinationAmount > 0)
            ? Number(t.destinationAmount)
            : amount;
          const destConverted = isSingleCurrency && t.currency === filteredCurrencyCode
            ? destAmt
            : convertCurrency(destAmt, t.currency || targetCurrencyCode, targetCurrencyCode, exchangeRates);
          openingBalance = safeAdd(openingBalance, destConverted);
        }
      }
    } else {
      if (t.type === 'income') {
        openingBalance = safeAdd(openingBalance, converted);
      } else if (t.type === 'expense' || t.type === 'transfer_to_goal') {
        openingBalance = safeSub(openingBalance, converted);
      }
    }
  });

  // 3. Process Active Period Transactions & Currency Breakdown
  const currencyGroupMap: Record<string, { income: number; expense: number; count: number }> = {};
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let transferCount = 0;

  activeTransactions.forEach(t => {
    const tCurr = normalizeCurrencyCode(t.currency);
    if (!currencyGroupMap[tCurr]) {
      currencyGroupMap[tCurr] = { income: 0, expense: 0, count: 0 };
    }
    currencyGroupMap[tCurr].count += 1;

    // Converted to target currency
    const converted = isSingleCurrency && t.currency === filteredCurrencyCode
      ? t.amount
      : convertCurrency(t.amount, t.currency, targetCurrencyCode, exchangeRates);

    if (t.type === 'income') {
      currencyGroupMap[tCurr].income = safeAdd(currencyGroupMap[tCurr].income, t.amount);
      totalIncome = safeAdd(totalIncome, converted);
      incomeCount += 1;
    } else if (t.type === 'expense') {
      currencyGroupMap[tCurr].expense = safeAdd(currencyGroupMap[tCurr].expense, t.amount);
      totalExpense = safeAdd(totalExpense, converted);
      expenseCount += 1;
    } else if (t.type === 'transfer_to_goal') {
      currencyGroupMap[tCurr].expense = safeAdd(currencyGroupMap[tCurr].expense, t.amount);
      totalExpense = safeAdd(totalExpense, converted);
      transferCount += 1;
    }
  });

  const netSavings = safeSub(totalIncome, totalExpense);
  const closingBalance = safeAdd(openingBalance, netSavings);
  const savingsRatePercent = totalIncome > 0 ? Math.max(0, safeMul(safeDiv(netSavings, totalIncome), 100)) : 0;
  const expenseRatioPercent = totalIncome > 0 ? safeMul(safeDiv(totalExpense, totalIncome), 100) : (totalExpense > 0 ? 100 : 0);

  // 4. Currency Breakdown Array
  const currencyBreakdown: ReportCurrencyBreakdown[] = Object.keys(currencyGroupMap).map(currCode => {
    const data = currencyGroupMap[currCode];
    const meta = getCurrencyMetadata(currCode);
    const net = data.income - data.expense;
    const convertedNet = isSingleCurrency && currCode === filteredCurrencyCode
      ? net
      : convertCurrency(net, currCode, targetCurrencyCode, exchangeRates);

    const rate = convertCurrency(1, currCode, targetCurrencyCode, exchangeRates);

    return {
      code: currCode,
      metadata: meta,
      income: data.income,
      expense: data.expense,
      net,
      transactionCount: data.count,
      convertedNetToBase: convertedNet,
      exchangeRateToBase: rate,
    };
  }).sort((a, b) => b.transactionCount - a.transactionCount);

  // 5. Category Analysis (Expense & Income)
  const expenseCategoryMap: Record<string, { amount: number; count: number }> = {};
  const incomeCategoryMap: Record<string, { amount: number; count: number }> = {};

  activeTransactions.forEach(t => {
    const converted = isSingleCurrency && t.currency === filteredCurrencyCode
      ? t.amount
      : convertCurrency(t.amount, t.currency, targetCurrencyCode, exchangeRates);

    const catId = t.categoryId || 'other';

    if (t.type === 'expense' || t.type === 'transfer_to_goal') {
      if (!expenseCategoryMap[catId]) expenseCategoryMap[catId] = { amount: 0, count: 0 };
      expenseCategoryMap[catId].amount += converted;
      expenseCategoryMap[catId].count += 1;
    } else if (t.type === 'income') {
      if (!incomeCategoryMap[catId]) incomeCategoryMap[catId] = { amount: 0, count: 0 };
      incomeCategoryMap[catId].amount += converted;
      incomeCategoryMap[catId].count += 1;
    }
  });

  const expenseCategories: ReportCategorySummary[] = Object.keys(expenseCategoryMap).map(catId => {
    const cat = categories.find(c => c.id === catId);
    const data = expenseCategoryMap[catId];
    const catType: 'income' | 'expense' = 'expense';
    return {
      id: catId,
      name: cat?.name || (catId === 'transfer_to_goal' ? 'تحويل للأهداف والادخار' : 'مصروفات أخرى'),
      icon: cat?.icon || 'Package',
      color: cat?.color || '#f43f5e',
      type: catType,
      totalAmount: data.amount,
      transactionCount: data.count,
      percentageOfTotal: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  const incomeCategories: ReportCategorySummary[] = Object.keys(incomeCategoryMap).map(catId => {
    const cat = categories.find(c => c.id === catId);
    const data = incomeCategoryMap[catId];
    const catType: 'income' | 'expense' = 'income';
    return {
      id: catId,
      name: cat?.name || 'مصادر دخل أخرى',
      icon: cat?.icon || 'TrendingUp',
      color: cat?.color || '#10b981',
      type: catType,
      totalAmount: data.amount,
      transactionCount: data.count,
      percentageOfTotal: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  // 6. Wallet Summary Breakdown (derived strictly from Single Source of Truth calculateWalletBalances)
  const walletEngineBalances = calculateWalletBalances(wallets, transactions, exchangeRates);
  let totalWealthConverted = 0;

  const walletSummaries: ReportWalletSummary[] = wallets
    .filter(w => !filteredWalletId || w.id === filteredWalletId)
    .map(w => {
      const summary = walletEngineBalances[w.id];
      const rawBalance = summary ? summary.currentBalance : (Number(w.openingBalance) || 0);
      const convertedBalance = convertCurrency(rawBalance, w.currencyCode, targetCurrencyCode, exchangeRates);

      totalWealthConverted = safeAdd(totalWealthConverted, Math.max(0, convertedBalance));

      return {
        id: w.id,
        name: w.name,
        currencyCode: w.currencyCode,
        color: w.color || '#3b82f6',
        rawBalance,
        convertedBalance,
        percentageOfTotalWealth: 0,
      };
    });

  walletSummaries.forEach(w => {
    w.percentageOfTotalWealth = totalWealthConverted > 0 && w.convertedBalance > 0
      ? safeMul(safeDiv(w.convertedBalance, totalWealthConverted), 100)
      : 0;
  });

  // 7. Chronological Ledger with Running Balances (Detailed Entries)
  // For running balance calculation: Sort ascending (oldest first), compute running balance, then reverse back to newest first
  const sortedAsc = [...activeTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningBal = openingBalance;

  const ledgerAsc: ReportLedgerEntry[] = sortedAsc.map((t, idx) => {
    const tCurr = normalizeCurrencyCode(t.currency);
    const currMeta = getCurrencyMetadata(tCurr);
    const cat = categories.find(c => c.id === t.categoryId);
    const wallet = wallets.find(w => w.id === t.walletId);

    const converted = isSingleCurrency && t.currency === filteredCurrencyCode
      ? t.amount
      : convertCurrency(t.amount, t.currency, targetCurrencyCode, exchangeRates);

    if (t.type === 'income') {
      runningBal += converted;
    } else {
      runningBal -= converted;
    }

    const d = new Date(t.date);
    const formattedDateAr = !isNaN(d.getTime())
      ? d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
      : t.date;
    const formattedDateEn = !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : t.date;

    const typeLabelAr = t.type === 'income' ? 'إيراد' : (t.type === 'transfer_to_goal' ? 'تحويل لهدف' : 'مصروف');
    const typeLabelEn = t.type === 'income' ? 'Income' : (t.type === 'transfer_to_goal' ? 'Goal Transfer' : 'Expense');

    const walletCurr = wallet ? normalizeCurrencyCode(wallet.currencyCode) : targetCurrencyCode;
    const isCrossWithWallet = Boolean(wallet && tCurr !== walletCurr && t.type !== 'transfer');
    const walletDeduction = isCrossWithWallet
      ? (t.convertedAmountInWalletCurrency || convertCurrency(t.amount, tCurr, walletCurr, exchangeRates))
      : t.amount;
    const rateToWallet = isCrossWithWallet
      ? (t.exchangeRateUsed || convertCurrency(1, tCurr, walletCurr, exchangeRates))
      : 1;

    return {
      id: t.id || `tx-${idx}`,
      index: idx + 1,
      date: t.date,
      formattedDateAr,
      formattedDateEn,
      type: t.type,
      typeLabelAr,
      typeLabelEn,
      categoryId: t.categoryId || 'other',
      categoryName: cat?.name || (t.type === 'transfer_to_goal' ? 'تحويل للأهداف' : 'عام'),
      categoryColor: cat?.color || (t.type === 'income' ? '#10b981' : '#f43f5e'),
      categoryIcon: cat?.icon || 'Tag',
      walletId: t.walletId,
      walletName: wallet?.name || '-',
      walletCurrencyCode: walletCurr,
      walletDeductionAmount: walletDeduction,
      isCrossCurrencyWithWallet: isCrossWithWallet,
      exchangeRateToWallet: rateToWallet,
      note: t.note || '',
      foreignAmount: t.foreignAmount,
      foreignCurrency: t.foreignCurrency,
      exchangeRate: t.exchangeRate,
      conversionNote: t.conversionNote,
      originalAmount: t.amount,
      currencyCode: tCurr,
      currencySymbol: currMeta.symbol,
      convertedAmount: converted,
      baseCurrencyCode: targetCurrencyCode,
      baseCurrencySymbol: baseCurrencyMeta.symbol,
      runningBalance: runningBal,
    };
  });

  // Default display order: Newest first
  const transactionsList: ReportLedgerEntry[] = ledgerAsc.reverse();

  // 8. KPIs Aggregation
  const kpis: ReportKPIs = {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRatePercent: Math.round(savingsRatePercent * 10) / 10,
    expenseRatioPercent: Math.round(expenseRatioPercent * 10) / 10,
    incomeCount,
    expenseCount,
    transferCount,
    totalTransactions: activeTransactions.length,
    avgIncomePerTx: incomeCount > 0 ? totalIncome / incomeCount : 0,
    avgExpensePerTx: (expenseCount + transferCount) > 0 ? totalExpense / (expenseCount + transferCount) : 0,
    openingBalance,
    closingBalance,
    highestExpenseCategory: expenseCategories[0] ? {
      name: expenseCategories[0].name,
      amount: expenseCategories[0].totalAmount,
      percentage: Math.round(expenseCategories[0].percentageOfTotal),
    } : undefined,
    highestIncomeSource: incomeCategories[0] ? {
      name: incomeCategories[0].name,
      amount: incomeCategories[0].totalAmount,
      percentage: Math.round(incomeCategories[0].percentageOfTotal),
    } : undefined,
  };

  // 9. Budget Performance Summary (for 'category' / 'budget_expense' report template)
  const budgetSummaries: ReportBudgetSummary[] = categories
    .filter(cat => cat.type === 'expense')
    .map(cat => {
      const b = budgets.find(bg => bg.categoryId === cat.id);
      const rawBudget = b ? Number(b.amount) || 0 : 0;
      const budgetAmount = b
        ? convertCurrency(rawBudget, b.currencyCode || targetCurrencyCode, targetCurrencyCode, exchangeRates)
        : 0;
      const spentAmount = expenseCategoryMap[cat.id]?.amount || 0;
      const remainingAmount = safeSub(budgetAmount, spentAmount);
      const percentageUsed = budgetAmount > 0 ? safeMul(safeDiv(spentAmount, budgetAmount), 100) : 0;
      const isOverBudget = budgetAmount > 0 && spentAmount > budgetAmount;

      let statusLabelAr = 'بدون ميزانية محددة';
      if (budgetAmount > 0) {
        if (isOverBudget) {
          statusLabelAr = 'تجاوز الميزانية';
        } else if (percentageUsed >= 80) {
          statusLabelAr = 'قارب على النفاذ (تحذير)';
        } else {
          statusLabelAr = 'ضمن النطاق السليم';
        }
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon || 'Tag',
        categoryColor: cat.color || '#f43f5e',
        budgetAmount,
        spentAmount,
        remainingAmount,
        percentageUsed: Math.round(percentageUsed * 10) / 10,
        isOverBudget,
        statusLabelAr,
      };
    })
    .filter(b => b.budgetAmount > 0 || b.spentAmount > 0)
    .sort((a, b) => b.spentAmount - a.spentAmount);

  // 10. Debts & Liabilities Summary (for 'debts' report template)
  const nowTime = new Date().getTime();
  let totalReceivable = 0;
  let totalPayable = 0;
  let receivableCount = 0;
  let payableCount = 0;
  let settledCount = 0;
  let activeCount = 0;
  let overdueCount = 0;

  const debtItems: ReportDebtItem[] = debts.map(d => {
    const origAmt = Number(d.amount) || 0;
    const paidAmt = Number(d.paidAmount) || 0;
    const remAmt = Math.max(0, origAmt - paidAmt);
    const convertedRem = convertCurrency(remAmt, d.currency || targetCurrencyCode, targetCurrencyCode, exchangeRates);

    const isSettled = d.isPaid || remAmt <= 0;
    const isOverdue = !isSettled && d.dueDate && new Date(d.dueDate).getTime() < nowTime;

    let debtStatus: 'active' | 'partial' | 'settled' | 'overdue' = 'active';
    let statusLabelAr = 'قائم وفعال';

    if (isSettled) {
      debtStatus = 'settled';
      statusLabelAr = 'مسدد بالكامل';
      settledCount += 1;
    } else if (isOverdue) {
      debtStatus = 'overdue';
      statusLabelAr = 'متأخر عن السداد';
      overdueCount += 1;
    } else if (paidAmt > 0) {
      debtStatus = 'partial';
      statusLabelAr = 'سداد جزئي';
      activeCount += 1;
    } else {
      activeCount += 1;
    }

    if (d.type === 'to_me') {
      receivableCount += 1;
      if (!isSettled) totalReceivable = safeAdd(totalReceivable, convertedRem);
    } else {
      payableCount += 1;
      if (!isSettled) totalPayable = safeAdd(totalPayable, convertedRem);
    }

    return {
      id: d.id,
      personName: d.personName,
      personPhone: d.personPhone,
      type: d.type,
      typeLabelAr: d.type === 'to_me' ? 'دين لي (مستحق)' : 'دين عليّ (التزام)',
      originalAmount: origAmt,
      paidAmount: paidAmt,
      remainingAmount: remAmt,
      convertedRemaining: convertedRem,
      currency: d.currency || targetCurrencyCode,
      createdAt: d.createdAt,
      dueDate: d.dueDate,
      isPaid: isSettled,
      status: debtStatus,
      statusLabelAr,
      note: d.note || '',
      paymentCount: d.payments ? d.payments.length : 0,
    };
  }).sort((a, b) => (b.isPaid ? -1 : 1) - (a.isPaid ? -1 : 1) || b.remainingAmount - a.remainingAmount);

  const debtsSummary: ReportDebtSummary = {
    totalReceivable,
    totalPayable,
    netDebtPosition: safeSub(totalReceivable, totalPayable),
    receivableCount,
    payableCount,
    settledCount,
    activeCount,
    overdueCount,
    items: debtItems,
  };

  // 11. Goals & Savings Progress (for 'savings_goals' report template)
  let totalGoalTarget = 0;
  let totalGoalSaved = 0;
  let completedGoalsCount = 0;

  const goalItems: ReportGoalItem[] = goals.map(g => {
    const targetAmt = Number(g.targetAmount) || 0;
    const currAmt = Number(g.currentAmount) || 0;
    const convertedTarget = convertCurrency(targetAmt, targetCurrencyCode, targetCurrencyCode, exchangeRates);
    const convertedCurr = convertCurrency(currAmt, targetCurrencyCode, targetCurrencyCode, exchangeRates);
    const progressPercent = targetAmt > 0 ? Math.min(100, Math.round((currAmt / targetAmt) * 100)) : 0;
    const remainingAmount = Math.max(0, targetAmt - currAmt);
    const isCompleted = currAmt >= targetAmt;

    totalGoalTarget = safeAdd(totalGoalTarget, convertedTarget);
    totalGoalSaved = safeAdd(totalGoalSaved, convertedCurr);
    if (isCompleted) completedGoalsCount += 1;

    return {
      id: g.id,
      name: g.name,
      targetAmount: targetAmt,
      currentAmount: currAmt,
      convertedTarget,
      convertedCurrent: convertedCurr,
      progressPercent,
      remainingAmount,
      deadline: g.deadline || g.targetDate,
      icon: g.icon || 'Target',
      color: g.color || '#10b981',
      isCompleted,
    };
  }).sort((a, b) => b.progressPercent - a.progressPercent);

  const goalsSummary: ReportGoalSummary = {
    totalTargetAmount: totalGoalTarget,
    totalSavedAmount: totalGoalSaved,
    overallProgressPercent: totalGoalTarget > 0 ? Math.min(100, Math.round((totalGoalSaved / totalGoalTarget) * 100)) : 0,
    goalsCount: goals.length,
    completedCount: completedGoalsCount,
    items: goalItems,
  };

  // 12. Generate Report Metadata & Fingerprint
  const now = new Date();
  const reportId = generateReportId(now);
  const fingerprint = computeReportFingerprint(
    `${reportId}:${activeTransactions.length}:${Math.round(totalIncome)}:${Math.round(totalExpense)}:${now.toISOString()}`
  );

  const qrPayload = buildQRPayload({
    reportId,
    reportType: params.type,
    currencyScope: filteredCurrencyCode || 'ALL',
    walletScope: filteredWalletId || 'ALL',
    txCount: activeTransactions.length,
    generatedAtISO: now.toISOString(),
    fingerprint,
  });

  const metadata: ReportMetadataInfo = {
    reportId,
    reportType: params.type || params.reportType || 'summary',
    fingerprint,
    generatedAtISO: now.toISOString(),
    generatedAtFormattedAr: now.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    generatedAtFormattedEn: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    generatedTimeFormattedAr: now.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    generatedTimeFormattedEn: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    qrPayload,
    appNameAr: 'ثـــري | THARI',
    appNameEn: 'THARI Financial Suite',
    language,
    version: '2.5.0',
  };

  // 13. Integrity Validation
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  if (isNaN(totalIncome) || isNaN(totalExpense)) {
    validationErrors.push('فشل التحقق الرياضي: وجود قيم غير رقمية في الإجماليات.');
  }
  if (activeTransactions.length === 0 && (params.type === 'summary' || params.type === 'detailed')) {
    validationWarnings.push('لا توجد حركات مسجلة تطابق معايير التصفية المختارة.');
  }

  const effectiveReportType = params.type || params.reportType || 'summary';

  return {
    metadata,
    reportType: effectiveReportType,
    account: {
      name: userName,
      email: userEmail,
      accountTypeAr: 'حساب مالي شخصي',
      accountTypeEn: 'Personal Financial Account',
      totalWallets: wallets.length,
    },
    scope,
    kpis,
    currencyBreakdown,
    walletSummaries,
    expenseCategories,
    incomeCategories,
    transactions: transactionsList,
    ledger: transactionsList,
    budgets: budgetSummaries,
    debts: debtsSummary,
    goals: goalsSummary,
    validation: {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
    },
  };
}
