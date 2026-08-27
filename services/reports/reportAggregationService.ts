import { Category, Transaction, Wallet } from '../../types';
import { convertCurrency } from '../../constants';
import {
  CurrencyMetadata,
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
  ReportCategorySummary,
  ReportCurrencyBreakdown,
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

  // 2. Calculate Opening Balance from prior transactions
  let openingBalance = 0;
  priorTransactions.forEach(t => {
    const converted = isSingleCurrency && t.currency === filteredCurrencyCode
      ? t.amount
      : convertCurrency(t.amount, t.currency, targetCurrencyCode, exchangeRates);

    if (t.type === 'income') {
      openingBalance += converted;
    } else {
      openingBalance -= converted;
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
      currencyGroupMap[tCurr].income += t.amount;
      totalIncome += converted;
      incomeCount += 1;
    } else if (t.type === 'expense') {
      currencyGroupMap[tCurr].expense += t.amount;
      totalExpense += converted;
      expenseCount += 1;
    } else if (t.type === 'transfer_to_goal') {
      currencyGroupMap[tCurr].expense += t.amount;
      totalExpense += converted;
      transferCount += 1;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const closingBalance = openingBalance + netSavings;
  const savingsRatePercent = totalIncome > 0 ? Math.max(0, (netSavings / totalIncome) * 100) : 0;
  const expenseRatioPercent = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : (totalExpense > 0 ? 100 : 0);

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

  // 6. Wallet Summary Breakdown
  let totalWealthConverted = 0;
  const walletSummaries: ReportWalletSummary[] = wallets
    .filter(w => !filteredWalletId || w.id === filteredWalletId)
    .map(w => {
      // Calculate wallet balance from all transactions for that wallet
      const walletTxs = transactions.filter(t => t.walletId === w.id);
      let rawBalance = 0;
      let convertedBalance = 0;

      walletTxs.forEach(t => {
        const sign = t.type === 'income' ? 1 : -1;
        rawBalance += t.amount * sign;
        const conv = convertCurrency(t.amount, t.currency, targetCurrencyCode, exchangeRates);
        convertedBalance += conv * sign;
      });

      totalWealthConverted += Math.max(0, convertedBalance);

      return {
        id: w.id,
        name: w.name,
        currencyCode: w.currencyCode,
        color: w.color || '#3b82f6',
        rawBalance,
        convertedBalance,
        percentageOfTotalWealth: 0, // Computed below
      };
    });

  walletSummaries.forEach(w => {
    w.percentageOfTotalWealth = totalWealthConverted > 0 && w.convertedBalance > 0
      ? (w.convertedBalance / totalWealthConverted) * 100
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

  // 9. Generate Report Metadata & Fingerprint
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

  // 10. Integrity Validation
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  if (isNaN(totalIncome) || isNaN(totalExpense)) {
    validationErrors.push('فشل التحقق الرياضي: وجود قيم غير رقمية في الإجماليات.');
  }
  if (activeTransactions.length === 0) {
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
    validation: {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: validationWarnings,
    },
  };
}
