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
  ReportCurrencyLedgerGroup,
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
  ReportSelectedWalletItem,
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
 * Builds a complete, mathematically pristine ReportModel from data sources and query parameters
 * Supporting multi-wallet subsets, currency segregation, and clean arithmetic.
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

  const language = params.language || 'ar';
  const {
    activeTransactions,
    priorTransactions,
    isSingleCurrency,
    filteredCurrencyCode,
    filteredWalletId,
    filteredWalletIds,
    isAllWallets,
    startDate,
    endDate,
  } = queryResult;

  // 1. Identify Selected Wallets in Scope
  const selectedWallets: Wallet[] = (!filteredWalletIds || isAllWallets)
    ? wallets
    : wallets.filter(w => filteredWalletIds.includes(w.id));

  const selectedWalletIdsSet = new Set(selectedWallets.map(w => w.id));

  const selectedWalletsScopeItems: ReportSelectedWalletItem[] = selectedWallets.map(w => ({
    id: w.id,
    name: w.name,
    currencyCode: normalizeCurrencyCode(w.currencyCode),
    color: w.color || '#3b82f6',
  }));

  // 2. Discover All Distinct Operating Currencies in Scope
  const currenciesInScopeSet = new Set<string>();
  if (filteredCurrencyCode) {
    currenciesInScopeSet.add(normalizeCurrencyCode(filteredCurrencyCode));
  } else {
    selectedWallets.forEach(w => currenciesInScopeSet.add(normalizeCurrencyCode(w.currencyCode)));
    activeTransactions.forEach(t => currenciesInScopeSet.add(normalizeCurrencyCode(t.currency)));
    priorTransactions.forEach(t => currenciesInScopeSet.add(normalizeCurrencyCode(t.currency)));
  }

  // Fallback if no wallets or transactions exist
  if (currenciesInScopeSet.size === 0) {
    currenciesInScopeSet.add(normalizeCurrencyCode(baseCurrencyCode || 'SAR'));
  }

  const distinctCurrencyCodes = Array.from(currenciesInScopeSet);
  const currenciesInScope = distinctCurrencyCodes.map(code => {
    const meta = getCurrencyMetadata(code);
    return {
      code,
      nameAr: meta.nameAr,
      nameEn: meta.nameEn,
      symbol: meta.symbol,
    };
  });

  // 3. Resolve Target Valuation Base Currency
  // If user filtered by a single currency, lock to it.
  // If all chosen wallets and transactions use ONE identical currency (e.g., both wallets are USD), lock to that currency with zero conversion distortion!
  // Otherwise, respect user's targetCurrencyCode preference or active baseCurrencyCode.
  let targetCurrencyCode: string;
  if (filteredCurrencyCode) {
    targetCurrencyCode = normalizeCurrencyCode(filteredCurrencyCode);
  } else if (distinctCurrencyCodes.length === 1) {
    targetCurrencyCode = distinctCurrencyCodes[0];
  } else {
    targetCurrencyCode = normalizeCurrencyCode(params.targetCurrencyCode || baseCurrencyCode || 'SAR');
  }

  const baseCurrencyMeta = getCurrencyMetadata(targetCurrencyCode);
  const singleCurrencyMeta = isSingleCurrency ? getCurrencyMetadata(filteredCurrencyCode) : (
    distinctCurrencyCodes.length === 1 ? getCurrencyMetadata(distinctCurrencyCodes[0]) : undefined
  );

  // 4. Compose Scope Period and Wallet Labels
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

  let walletNameAr = `كافة المحافظ المالية (${wallets.length})`;
  let walletNameEn = `All Wallets (${wallets.length})`;
  if (!isAllWallets && selectedWallets.length > 0) {
    if (selectedWallets.length === 1) {
      walletNameAr = selectedWallets[0].name;
      walletNameEn = selectedWallets[0].name;
    } else {
      walletNameAr = `${selectedWallets.length} محافظ (${selectedWallets.map(w => w.name).join('، ')})`;
      walletNameEn = `${selectedWallets.length} Wallets (${selectedWallets.map(w => w.name).join(', ')})`;
    }
  }

  const scope: ReportScopeInfo = {
    walletId: filteredWalletId,
    walletIds: filteredWalletIds,
    selectedWallets: selectedWalletsScopeItems,
    isAllWallets,
    currenciesInScope,
    walletNameAr,
    walletNameEn,
    currencyFilter: filteredCurrencyCode,
    isAllCurrencies: !isSingleCurrency && distinctCurrencyCodes.length > 1,
    currencyMetadata: singleCurrencyMeta,
    startDate,
    endDate,
    periodLabelAr,
    periodLabelEn,
    baseCurrency: baseCurrencyMeta,
  };

  // 5. Calculate Pristine Opening Balances Per Currency
  // Each currency starts from the sum of initial balances of selected wallets using that currency,
  // plus prior transactions affecting that currency.
  const currencyOpeningMap: Record<string, number> = {};
  distinctCurrencyCodes.forEach(c => {
    currencyOpeningMap[c] = 0;
  });

  selectedWallets.forEach(w => {
    const wCurr = normalizeCurrencyCode(w.currencyCode);
    const initialBal = Number(w.openingBalance) || 0;
    if (currencyOpeningMap[wCurr] !== undefined) {
      currencyOpeningMap[wCurr] = safeAdd(currencyOpeningMap[wCurr], initialBal);
    } else {
      currencyOpeningMap[wCurr] = initialBal;
    }
  });

  priorTransactions.forEach(t => {
    const tCurr = normalizeCurrencyCode(t.currency);
    const rawAmt = Number(t.amount) || 0;
    if (rawAmt === 0) return;
    const amount = Math.abs(rawAmt);

    if (currencyOpeningMap[tCurr] === undefined) {
      currencyOpeningMap[tCurr] = 0;
    }

    if (t.type === 'income') {
      currencyOpeningMap[tCurr] = safeAdd(currencyOpeningMap[tCurr], amount);
    } else if (t.type === 'expense' || t.type === 'transfer_to_goal') {
      currencyOpeningMap[tCurr] = safeSub(currencyOpeningMap[tCurr], amount);
    } else if (t.type === 'transfer') {
      const srcIn = t.walletId ? selectedWalletIdsSet.has(t.walletId) : false;
      const destIn = t.destinationWalletId ? selectedWalletIdsSet.has(t.destinationWalletId) : false;

      if (srcIn && !destIn) {
        // Outflow from scope
        currencyOpeningMap[tCurr] = safeSub(currencyOpeningMap[tCurr], amount);
      } else if (!srcIn && destIn) {
        // Inflow to scope
        const destAmt = (t.destinationAmount !== undefined && t.destinationAmount !== null && t.destinationAmount > 0)
          ? Number(t.destinationAmount)
          : amount;
        currencyOpeningMap[tCurr] = safeAdd(currencyOpeningMap[tCurr], destAmt);
      }
    }
  });

  // 6. Aggregate Active Period Operations Mathematically Per Currency
  const currencyMathMap: Record<string, { opening: number; income: number; expense: number; count: number }> = {};
  distinctCurrencyCodes.forEach(c => {
    currencyMathMap[c] = {
      opening: currencyOpeningMap[c] || 0,
      income: 0,
      expense: 0,
      count: 0,
    };
  });

  let incomeCount = 0;
  let expenseCount = 0;
  let transferCount = 0;

  activeTransactions.forEach(t => {
    const tCurr = normalizeCurrencyCode(t.currency);
    if (!currencyMathMap[tCurr]) {
      currencyMathMap[tCurr] = {
        opening: currencyOpeningMap[tCurr] || 0,
        income: 0,
        expense: 0,
        count: 0,
      };
    }
    currencyMathMap[tCurr].count += 1;
    const rawAmt = Number(t.amount) || 0;
    const amount = Math.abs(rawAmt);

    if (t.type === 'income') {
      currencyMathMap[tCurr].income = safeAdd(currencyMathMap[tCurr].income, amount);
      incomeCount += 1;
    } else if (t.type === 'expense') {
      currencyMathMap[tCurr].expense = safeAdd(currencyMathMap[tCurr].expense, amount);
      expenseCount += 1;
    } else if (t.type === 'transfer_to_goal') {
      currencyMathMap[tCurr].expense = safeAdd(currencyMathMap[tCurr].expense, amount);
      transferCount += 1;
    } else if (t.type === 'transfer') {
      const srcIn = t.walletId ? selectedWalletIdsSet.has(t.walletId) : false;
      const destIn = t.destinationWalletId ? selectedWalletIdsSet.has(t.destinationWalletId) : false;

      if (srcIn && !destIn) {
        currencyMathMap[tCurr].expense = safeAdd(currencyMathMap[tCurr].expense, amount);
        transferCount += 1;
      } else if (!srcIn && destIn) {
        const destAmt = (t.destinationAmount !== undefined && t.destinationAmount !== null && t.destinationAmount > 0)
          ? Number(t.destinationAmount)
          : amount;
        currencyMathMap[tCurr].income = safeAdd(currencyMathMap[tCurr].income, destAmt);
        transferCount += 1;
      } else {
        // Internal transfer between selected wallets
        transferCount += 1;
      }
    }
  });

  // 7. Build Currency Breakdown Array with Full Arithmetic Precision
  const currencyBreakdown: ReportCurrencyBreakdown[] = Object.keys(currencyMathMap).map(currCode => {
    const data = currencyMathMap[currCode];
    const meta = getCurrencyMetadata(currCode);
    const net = safeSub(data.income, data.expense);
    const closing = safeAdd(data.opening, net);

    const isSameAsBase = currCode === targetCurrencyCode;
    const convertedNet = isSameAsBase
      ? net
      : convertCurrency(net, currCode, targetCurrencyCode, exchangeRates);
    const convertedClosing = isSameAsBase
      ? closing
      : convertCurrency(closing, currCode, targetCurrencyCode, exchangeRates);
    const rate = isSameAsBase
      ? 1
      : convertCurrency(1, currCode, targetCurrencyCode, exchangeRates);

    return {
      code: currCode,
      metadata: meta,
      openingBalance: data.opening,
      income: data.income,
      expense: data.expense,
      net,
      closingBalance: closing,
      transactionCount: data.count,
      convertedNetToBase: convertedNet,
      convertedClosingToBase: convertedClosing,
      exchangeRateToBase: rate,
    };
  }).sort((a, b) => b.transactionCount - a.transactionCount);

  // 8. Unified KPI Totals Converted to Target Valuation Currency
  let unifiedOpening = 0;
  let unifiedIncome = 0;
  let unifiedExpense = 0;

  currencyBreakdown.forEach(cb => {
    const convOpen = cb.code === targetCurrencyCode
      ? cb.openingBalance
      : convertCurrency(cb.openingBalance, cb.code, targetCurrencyCode, exchangeRates);
    const convInc = cb.code === targetCurrencyCode
      ? cb.income
      : convertCurrency(cb.income, cb.code, targetCurrencyCode, exchangeRates);
    const convExp = cb.code === targetCurrencyCode
      ? cb.expense
      : convertCurrency(cb.expense, cb.code, targetCurrencyCode, exchangeRates);

    unifiedOpening = safeAdd(unifiedOpening, convOpen);
    unifiedIncome = safeAdd(unifiedIncome, convInc);
    unifiedExpense = safeAdd(unifiedExpense, convExp);
  });

  const netSavings = safeSub(unifiedIncome, unifiedExpense);
  const closingBalance = safeAdd(unifiedOpening, netSavings);
  const savingsRatePercent = unifiedIncome > 0
    ? Math.max(0, safeMul(safeDiv(netSavings, unifiedIncome), 100))
    : 0;
  const expenseRatioPercent = unifiedIncome > 0
    ? safeMul(safeDiv(unifiedExpense, unifiedIncome), 100)
    : (unifiedExpense > 0 ? 100 : 0);

  // 9. Category Analysis (Expense & Income)
  const expenseCategoryMap: Record<string, { amount: number; count: number }> = {};
  const incomeCategoryMap: Record<string, { amount: number; count: number }> = {};

  activeTransactions.forEach(t => {
    const rawAmt = Number(t.amount) || 0;
    const amount = Math.abs(rawAmt);
    const tCurr = normalizeCurrencyCode(t.currency);

    const converted = tCurr === targetCurrencyCode
      ? amount
      : convertCurrency(amount, tCurr, targetCurrencyCode, exchangeRates);

    const catId = t.categoryId || 'other';

    if (t.type === 'expense' || t.type === 'transfer_to_goal') {
      if (!expenseCategoryMap[catId]) expenseCategoryMap[catId] = { amount: 0, count: 0 };
      expenseCategoryMap[catId].amount = safeAdd(expenseCategoryMap[catId].amount, converted);
      expenseCategoryMap[catId].count += 1;
    } else if (t.type === 'income') {
      if (!incomeCategoryMap[catId]) incomeCategoryMap[catId] = { amount: 0, count: 0 };
      incomeCategoryMap[catId].amount = safeAdd(incomeCategoryMap[catId].amount, converted);
      incomeCategoryMap[catId].count += 1;
    }
  });

  const expenseCategories: ReportCategorySummary[] = Object.keys(expenseCategoryMap).map(catId => {
    const cat = categories.find(c => c.id === catId);
    const data = expenseCategoryMap[catId];
    return {
      id: catId,
      name: cat?.name || (catId === 'transfer_to_goal' ? 'تحويل للأهداف والادخار' : 'مصروفات أخرى'),
      icon: cat?.icon || 'Package',
      color: cat?.color || '#f43f5e',
      type: 'expense' as const,
      totalAmount: data.amount,
      transactionCount: data.count,
      percentageOfTotal: unifiedExpense > 0 ? (data.amount / unifiedExpense) * 100 : 0,
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  const incomeCategories: ReportCategorySummary[] = Object.keys(incomeCategoryMap).map(catId => {
    const cat = categories.find(c => c.id === catId);
    const data = incomeCategoryMap[catId];
    return {
      id: catId,
      name: cat?.name || 'مصادر دخل أخرى',
      icon: cat?.icon || 'TrendingUp',
      color: cat?.color || '#10b981',
      type: 'income' as const,
      totalAmount: data.amount,
      transactionCount: data.count,
      percentageOfTotal: unifiedIncome > 0 ? (data.amount / unifiedIncome) * 100 : 0,
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  // 10. Selected Wallets Summary
  const walletEngineBalances = calculateWalletBalances(wallets, transactions, exchangeRates);
  let totalWealthConverted = 0;

  const walletSummaries: ReportWalletSummary[] = selectedWallets.map(w => {
    const summary = walletEngineBalances[w.id];
    const rawBalance = summary ? summary.currentBalance : (Number(w.openingBalance) || 0);
    const convertedBalance = convertCurrency(rawBalance, w.currencyCode, targetCurrencyCode, exchangeRates);

    totalWealthConverted = safeAdd(totalWealthConverted, Math.max(0, convertedBalance));

    return {
      id: w.id,
      name: w.name,
      currencyCode: normalizeCurrencyCode(w.currencyCode),
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

  // 11. Currency-Segregated Ledgers with Dedicated Native Running Balances
  // Group transactions by currency and calculate running balances purely within that currency stream
  const currencyLedgers: ReportCurrencyLedgerGroup[] = [];

  // Group active transactions by currency
  const txByCurrencyMap: Record<string, Transaction[]> = {};
  distinctCurrencyCodes.forEach(code => {
    txByCurrencyMap[code] = [];
  });

  activeTransactions.forEach(t => {
    const tCurr = normalizeCurrencyCode(t.currency);
    if (!txByCurrencyMap[tCurr]) txByCurrencyMap[tCurr] = [];
    txByCurrencyMap[tCurr].push(t);
  });

  // Also build overall unified ledger
  const sortedAscAll = [...activeTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningUnifiedBal = unifiedOpening;

  // Map to format a transaction entry
  const createLedgerEntry = (
    t: Transaction,
    idx: number,
    currencyRunningBal?: number,
    unifiedRunningBal?: number
  ): ReportLedgerEntry => {
    const tCurr = normalizeCurrencyCode(t.currency);
    const currMeta = getCurrencyMetadata(tCurr);
    const cat = categories.find(c => c.id === t.categoryId);
    const wallet = wallets.find(w => w.id === t.walletId);

    const converted = tCurr === targetCurrencyCode
      ? t.amount
      : convertCurrency(t.amount, tCurr, targetCurrencyCode, exchangeRates);

    const d = new Date(t.date);
    const formattedDateAr = !isNaN(d.getTime())
      ? d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
      : t.date;
    const formattedDateEn = !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : t.date;

    const typeLabelAr = t.type === 'income' ? 'إيراد' : (t.type === 'transfer_to_goal' ? 'تحويل لهدف' : (t.type === 'transfer' ? 'تحويل' : 'مصروف'));
    const typeLabelEn = t.type === 'income' ? 'Income' : (t.type === 'transfer_to_goal' ? 'Goal Transfer' : (t.type === 'transfer' ? 'Transfer' : 'Expense'));

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
      categoryName: cat?.name || (t.type === 'transfer_to_goal' ? 'تحويل للأهداف' : (t.type === 'transfer' ? 'تحويل بنكي' : 'عام')),
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
      runningBalance: unifiedRunningBal,
      currencyRunningBalance: currencyRunningBal,
    };
  };

  // Build unified transactions array
  const unifiedEntriesAsc: ReportLedgerEntry[] = sortedAscAll.map((t, idx) => {
    const tCurr = normalizeCurrencyCode(t.currency);
    const converted = tCurr === targetCurrencyCode
      ? t.amount
      : convertCurrency(t.amount, tCurr, targetCurrencyCode, exchangeRates);

    if (t.type === 'income') {
      runningUnifiedBal = safeAdd(runningUnifiedBal, converted);
    } else {
      runningUnifiedBal = safeSub(runningUnifiedBal, converted);
    }

    return createLedgerEntry(t, idx, undefined, runningUnifiedBal);
  });

  const transactionsList: ReportLedgerEntry[] = [...unifiedEntriesAsc].reverse();

  // For each currency, generate dedicated ledger with exact running balances
  distinctCurrencyCodes.forEach(code => {
    const txs = txByCurrencyMap[code] || [];
    const meta = getCurrencyMetadata(code);
    const opening = currencyMathMap[code]?.opening || 0;
    const mathData = currencyMathMap[code] || { income: 0, expense: 0, opening: 0, count: 0 };

    // Sort ascending for running balance calculation
    const ascTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currRunBal = opening;

    const groupEntriesAsc: ReportLedgerEntry[] = ascTxs.map((t, idx) => {
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.type === 'income') {
        currRunBal = safeAdd(currRunBal, amt);
      } else if (t.type === 'expense' || t.type === 'transfer_to_goal') {
        currRunBal = safeSub(currRunBal, amt);
      } else if (t.type === 'transfer') {
        const srcIn = t.walletId ? selectedWalletIdsSet.has(t.walletId) : false;
        const destIn = t.destinationWalletId ? selectedWalletIdsSet.has(t.destinationWalletId) : false;
        if (srcIn && !destIn) {
          currRunBal = safeSub(currRunBal, amt);
        } else if (!srcIn && destIn) {
          const destAmt = (t.destinationAmount !== undefined && t.destinationAmount !== null && t.destinationAmount > 0)
            ? Number(t.destinationAmount)
            : amt;
          currRunBal = safeAdd(currRunBal, destAmt);
        }
      }

      return createLedgerEntry(t, idx, currRunBal, undefined);
    });

    // Reverse to newest first for display
    const groupEntriesDesc = [...groupEntriesAsc].reverse();

    currencyLedgers.push({
      currencyCode: code,
      metadata: meta,
      openingBalance: opening,
      totalIncome: mathData.income,
      totalExpense: mathData.expense,
      netAmount: safeSub(mathData.income, mathData.expense),
      closingBalance: safeAdd(opening, safeSub(mathData.income, mathData.expense)),
      transactions: groupEntriesDesc,
    });
  });

  // Sort currencyLedgers so currency with most transactions appears first
  currencyLedgers.sort((a, b) => b.transactions.length - a.transactions.length);

  // 12. KPIs Object
  const kpis: ReportKPIs = {
    totalIncome: unifiedIncome,
    totalExpense: unifiedExpense,
    netSavings,
    savingsRatePercent: Math.round(savingsRatePercent * 10) / 10,
    expenseRatioPercent: Math.round(expenseRatioPercent * 10) / 10,
    incomeCount,
    expenseCount,
    transferCount,
    totalTransactions: activeTransactions.length,
    avgIncomePerTx: incomeCount > 0 ? unifiedIncome / incomeCount : 0,
    avgExpensePerTx: (expenseCount + transferCount) > 0 ? unifiedExpense / (expenseCount + transferCount) : 0,
    openingBalance: unifiedOpening,
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

  // 13. Budget Performance Summary (for 'category' / 'budget_expense' report template)
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

  // 14. Debts & Liabilities Summary (for 'debts' report template)
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

  // 15. Goals & Savings Progress
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

  // 16. Report Metadata & Security Fingerprint
  const now = new Date();
  const reportId = generateReportId(now);
  const fingerprint = computeReportFingerprint(
    `${reportId}:${activeTransactions.length}:${Math.round(unifiedIncome)}:${Math.round(unifiedExpense)}:${now.toISOString()}`
  );

  const qrPayload = buildQRPayload({
    reportId,
    reportType: params.type,
    currencyScope: filteredCurrencyCode || 'ALL',
    walletScope: filteredWalletIds ? filteredWalletIds.join(',') : 'ALL',
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

  // 17. Integrity Validation
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  if (isNaN(unifiedIncome) || isNaN(unifiedExpense)) {
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
    currencyLedgers,
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
