/**
 * THARI Financial Application — Core Balance & Ledger Engine
 * Single Source of Truth for financial calculations, multi-wallet balance tracking,
 * multi-currency ledger calculation, cross-currency spending, transfer consistency, and mathematical audits.
 */

import { Transaction, Wallet, Currency, Debt } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';
import { generateCoreLedger, calculateLedgerBalances, resolveHistoricalConversion } from './coreLedger';
export * from './coreLedger';

export interface WalletBalanceSummary {
  walletId: string;
  walletName: string;
  currencyCode: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  transfersOut: number;
  transfersIn: number;
  adjustments: number;
  currentBalance: number;
}

export interface ConsolidatedFinancialPosition {
  availableLiquidityInBase: number; // السيولة النقدية الفعلية المتاحة في المحافظ
  receivablesInBase: number;        // مستحقات لك عند الآخرين
  payablesInBase: number;           // التزامات عليك للآخرين
  netWorthInBase: number;           // صافي الثروة = السيولة + المستحقات - الالتزامات
  totalIncomeInBase: number;
  totalExpenseInBase: number;
  netCashFlowInBase: number;
  internalTransfersInBase: number;
  savingsRate: number;
  growthRate: number;               // نسبة النمو المقارنة بالفترة السابقة الفعلية
  growthComparisonText: string;     // نص توضيحي للمقارنة
  isSingleCurrency: boolean;
  activeCurrencyCode: string;
  currencyBalances: Record<string, number>;
  expenseByCurrency: Record<string, number>;
  incomeByCurrency: Record<string, number>;
  transfersByCurrency: Record<string, number>;
  walletSummaries: Record<string, WalletBalanceSummary>;
}

/**
 * Filter active (non-deleted) transactions
 */
export function getActiveTransactions(transactions: Transaction[]): Transaction[] {
  return (transactions || []).filter(t => !t.isDeleted);
}

/**
 * Calculate historical period growth by comparing transaction dates
 */
export function calculateDateBasedGrowth(
  transactions: Transaction[],
  baseCurrencyCode: string = 'SAR',
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): { rate: number; comparisonText: string; currentNet: number; previousNet: number } {
  const activeTxs = getActiveTransactions(transactions);
  if (activeTxs.length === 0) {
    return { rate: 0, comparisonText: 'لا توجد بيانات تاريخية كافية', currentNet: 0, previousNet: 0 };
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  let prevMonthIncome = 0;
  let prevMonthExpense = 0;

  activeTxs.forEach(tx => {
    if (tx.isFinancing) return;
    const rawAmount = Number(tx.amount) || 0;
    if (rawAmount === 0) return;
    const amount = Math.abs(rawAmount);
    const txCurr = tx.currency || baseCurrencyCode;
    const inBase = convertCurrency(amount, txCurr, baseCurrencyCode, exchangeRates);
    const txDate = new Date(tx.date);

    if (txDate >= currentMonthStart && txDate <= now) {
      if (tx.type === 'income') currentMonthIncome += inBase;
      else if (tx.type === 'expense') currentMonthExpense += inBase;
    } else if (txDate >= prevMonthStart && txDate <= prevMonthEnd) {
      if (tx.type === 'income') prevMonthIncome += inBase;
      else if (tx.type === 'expense') prevMonthExpense += inBase;
    }
  });

  const currentNet = currentMonthIncome - currentMonthExpense;
  const previousNet = prevMonthIncome - prevMonthExpense;

  if (prevMonthIncome === 0 && prevMonthExpense === 0) {
    return { 
      rate: currentNet > 0 ? 100 : 0, 
      comparisonText: 'أول شهر مسجل في السجل المالي',
      currentNet, 
      previousNet 
    };
  }

  if (previousNet === 0) {
    const rate = currentNet > 0 ? 100 : currentNet < 0 ? -100 : 0;
    return { 
      rate, 
      comparisonText: 'مقارنة بالشهر السابق (صافي صفر)',
      currentNet, 
      previousNet 
    };
  }

  const diff = currentNet - previousNet;
  const rate = Math.round((diff / Math.abs(previousNet)) * 100);
  const clampedRate = Math.min(Math.max(rate, -999), 999);

  return {
    rate: clampedRate,
    comparisonText: clampedRate >= 0 ? `+${clampedRate}% مقارنة بالشهر السابق` : `${clampedRate}% مقارنة بالشهر السابق`,
    currentNet,
    previousNet
  };
}

/**
 * Calculate precise balance for each wallet via Core Ledger (Single Source of Truth).
 */
export function calculateWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[],
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): Record<string, WalletBalanceSummary> {
  const activeTxs = getActiveTransactions(transactions);
  const ledger = generateCoreLedger(wallets, activeTxs, [], exchangeRates);
  const summary = calculateLedgerBalances(ledger, wallets, [], 'SAR', exchangeRates);
  
  const result: Record<string, WalletBalanceSummary> = {};
  Object.values(summary.walletBalances).forEach(wb => {
    result[wb.walletId] = {
      walletId: wb.walletId,
      walletName: wb.walletName,
      currencyCode: wb.currencyCode,
      openingBalance: wb.openingBalance,
      totalIncome: wb.inflows,
      totalExpense: wb.outflows,
      transfersOut: wb.transfersOut,
      transfersIn: wb.transfersIn,
      adjustments: wb.adjustments,
      currentBalance: wb.currentBalance
    };
  });
  return result;
}

/**
 * Calculate multi-currency breakdowns and global consolidated figures via Core Ledger.
 */
export function calculateConsolidatedPosition(
  transactions: Transaction[],
  wallets: Wallet[],
  baseCurrencyCode: string = 'SAR',
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
  filterWalletId?: string | null,
  filterCurrencyCode?: string | null,
  allTransactionsForBalance?: Transaction[],
  debts: Debt[] = [],
  travelMode: boolean = false,
  showSeparateCurrencies: boolean = false
): ConsolidatedFinancialPosition {
  const isTravelCurrencyMode = Boolean(travelMode || showSeparateCurrencies);

  let periodTxs = getActiveTransactions(transactions);
  const lifetimeTxs = getActiveTransactions(allTransactionsForBalance || transactions);

  if (filterWalletId) {
    periodTxs = periodTxs.filter(
      t => t.walletId === filterWalletId || t.destinationWalletId === filterWalletId
    );
  }

  const isSingleCurrency = Boolean(filterCurrencyCode && filterCurrencyCode !== 'ALL');
  if (isSingleCurrency && filterCurrencyCode) {
    periodTxs = periodTxs.filter(t => t.currency === filterCurrencyCode);
  }

  const activeWallets = filterWalletId 
    ? (wallets || []).filter(w => w.id === filterWalletId)
    : (wallets || []);

  const activeDebts = debts || [];

  // Core Ledger generation as Single Financial Truth
  const lifetimeLedger = generateCoreLedger(wallets, lifetimeTxs, activeDebts, exchangeRates, baseCurrencyCode);
  const ledgerSummary = calculateLedgerBalances(lifetimeLedger, wallets, activeDebts, baseCurrencyCode, exchangeRates);

  const walletSummaries: Record<string, WalletBalanceSummary> = {};
  Object.values(ledgerSummary.walletBalances).forEach(wb => {
    if (!filterWalletId || wb.walletId === filterWalletId) {
      walletSummaries[wb.walletId] = {
        walletId: wb.walletId,
        walletName: wb.walletName,
        currencyCode: wb.currencyCode,
        openingBalance: wb.openingBalance,
        totalIncome: wb.inflows,
        totalExpense: wb.outflows,
        transfersOut: wb.transfersOut,
        transfersIn: wb.transfersIn,
        adjustments: wb.adjustments,
        currentBalance: wb.currentBalance
      };
    }
  });

  const currencyBalances: Record<string, number> = {};
  activeWallets.forEach(w => {
    if (!currencyBalances[w.currencyCode]) {
      currencyBalances[w.currencyCode] = 0;
    }
  });
  Object.values(walletSummaries).forEach(summary => {
    currencyBalances[summary.currencyCode] = safeAdd(currencyBalances[summary.currencyCode] || 0, summary.currentBalance);
  });

  const periodLedger = generateCoreLedger(wallets, periodTxs, [], exchangeRates, baseCurrencyCode);
  const periodSummary = calculateLedgerBalances(periodLedger, wallets, [], baseCurrencyCode, exchangeRates);

  const expenseByCurrency: Record<string, number> = {};
  const incomeByCurrency: Record<string, number> = {};
  const transfersByCurrency: Record<string, number> = {};

  periodTxs.forEach(tx => {
    if (tx.isFinancing) return;
    const rawAmount = Number(tx.amount) || 0;
    if (rawAmount === 0) return;
    const amount = Math.abs(rawAmount);
    const txCurr = tx.currency || baseCurrencyCode;

    if (tx.type === 'income') {
      incomeByCurrency[txCurr] = safeAdd(incomeByCurrency[txCurr] || 0, amount);
    } else if (tx.type === 'expense' || tx.type === 'transfer_to_goal') {
      expenseByCurrency[txCurr] = safeAdd(expenseByCurrency[txCurr] || 0, amount);
    } else if (tx.type === 'transfer') {
      transfersByCurrency[txCurr] = safeAdd(transfersByCurrency[txCurr] || 0, amount);
    }
  });

  const totalIncomeInBase = periodSummary.totalIncomeInBase;
  const totalExpenseInBase = periodSummary.totalExpenseInBase;

  let internalTransfersInBase = 0;
  periodTxs.forEach(tx => {
    if (tx.type === 'transfer') {
      const rawAmount = Number(tx.amount) || 0;
      const txCurr = tx.currency || baseCurrencyCode;
      internalTransfersInBase = safeAdd(internalTransfersInBase, convertCurrency(Math.abs(rawAmount), txCurr, baseCurrencyCode, exchangeRates));
    }
  });

  let availableLiquidityInBase = 0;
  if (isSingleCurrency && filterCurrencyCode) {
    availableLiquidityInBase = currencyBalances[filterCurrencyCode] || 0;
  } else {
    availableLiquidityInBase = Object.entries(currencyBalances).reduce((sum, [code, amount]) => {
      const normalizedAmount = isTravelCurrencyMode && amount === 0 && code !== baseCurrencyCode ? 0 : amount;
      return safeAdd(sum, convertCurrency(normalizedAmount, code, baseCurrencyCode, exchangeRates));
    }, 0);
  }

  const receivablesInBase = ledgerSummary.totalReceivablesInBase;
  const payablesInBase = ledgerSummary.totalLiabilitiesInBase;
  const netWorthInBase = ledgerSummary.netWorthInBase;

  const netCashFlowInBase = safeSub(totalIncomeInBase, totalExpenseInBase);
  const savingsRate = totalIncomeInBase > 0 ? Math.max(0, Math.round((netCashFlowInBase / totalIncomeInBase) * 100)) : 0;
  const growthData = calculateDateBasedGrowth(lifetimeTxs, baseCurrencyCode, exchangeRates);

  return {
    availableLiquidityInBase,
    receivablesInBase,
    payablesInBase,
    netWorthInBase,
    totalIncomeInBase,
    totalExpenseInBase,
    netCashFlowInBase,
    internalTransfersInBase,
    savingsRate,
    growthRate: growthData.rate,
    growthComparisonText: growthData.comparisonText,
    isSingleCurrency,
    activeCurrencyCode: isSingleCurrency && filterCurrencyCode ? filterCurrencyCode : baseCurrencyCode,
    currencyBalances,
    expenseByCurrency,
    incomeByCurrency,
    transfersByCurrency,
    walletSummaries,
  };
}

/**
 * Self-Testing Mathematical Audit Suite for the Balance Engine & Core Ledger.
 * Verifies core accounting invariants, debt lifecycle, FX handling, and cross-currency spending accuracy.
 */
export function runBalanceEngineAudit(): {
  allPassed: boolean;
  testResults: {
    testName: string;
    passed: boolean;
    details: string;
    expected: any;
    actual: any;
  }[];
} {
  const testResults: {
    testName: string;
    passed: boolean;
    details: string;
    expected: any;
    actual: any;
  }[] = [];

  // Scenario 1: Standard Invariant (Income 100k, Expense 30k, Transfer 20k)
  const testWallets: Wallet[] = [
    { id: 'w-a', name: 'Wallet A', currencyCode: 'YER_ADEN', color: '#10b981', openingBalance: 0 },
    { id: 'w-b', name: 'Wallet B', currencyCode: 'YER_ADEN', color: '#3b82f6', openingBalance: 0 },
  ];

  const testTransactions: Transaction[] = [
    {
      id: 'tx-1',
      walletId: 'w-a',
      type: 'income',
      amount: 100000,
      currency: 'YER_ADEN',
      categoryId: '1',
      date: '2026-08-01',
      note: 'Salary',
      frequency: 'once',
    },
    {
      id: 'tx-2',
      walletId: 'w-a',
      type: 'expense',
      amount: 30000,
      currency: 'YER_ADEN',
      categoryId: '2',
      date: '2026-08-02',
      note: 'Groceries',
      frequency: 'once',
    },
    {
      id: 'tx-3',
      walletId: 'w-a',
      destinationWalletId: 'w-b',
      type: 'transfer',
      amount: 20000,
      currency: 'YER_ADEN',
      categoryId: '',
      date: '2026-08-03',
      note: 'Transfer A->B',
      frequency: 'once',
    },
  ];

  const walletBalances = calculateWalletBalances(testWallets, testTransactions);
  const position = calculateConsolidatedPosition(
    testTransactions,
    testWallets,
    'YER_ADEN',
    DEFAULT_EXCHANGE_RATES,
    null,
    'YER_ADEN'
  );

  // Check 1: Wallet A Balance = 100k - 30k - 20k = 50,000
  const walletAPassed = walletBalances['w-a']?.currentBalance === 50000;
  testResults.push({
    testName: 'Wallet A Balance (Income 100k - Exp 30k - TransferOut 20k)',
    passed: walletAPassed,
    details: `Wallet A Balance should be 50,000 YER`,
    expected: 50000,
    actual: walletBalances['w-a']?.currentBalance,
  });

  // Check 2: Wallet B Balance = +20k from transfer
  const walletBPassed = walletBalances['w-b']?.currentBalance === 20000;
  testResults.push({
    testName: 'Wallet B Balance (TransferIn +20k)',
    passed: walletBPassed,
    details: `Wallet B Balance should be 20,000 YER`,
    expected: 20000,
    actual: walletBalances['w-b']?.currentBalance,
  });

  // Check 3: Total Income = 100k
  const incomePassed = position.totalIncomeInBase === 100000;
  testResults.push({
    testName: 'Total Income Invariance',
    passed: incomePassed,
    details: `Total Income must be exactly 100,000 YER`,
    expected: 100000,
    actual: position.totalIncomeInBase,
  });

  // Check 4: Total Expense = 30k
  const expensePassed = position.totalExpenseInBase === 30000;
  testResults.push({
    testName: 'Total Expense Invariance (Transfers NOT counted as expense)',
    passed: expensePassed,
    details: `Total Expense must be exactly 30,000 YER`,
    expected: 30000,
    actual: position.totalExpenseInBase,
  });

  // Check 5: Internal Transfer = 20k
  const transferPassed = position.internalTransfersInBase === 20000;
  testResults.push({
    testName: 'Internal Transfer Tracking',
    passed: transferPassed,
    details: `Internal Transfers must be recognized as 20,000 YER`,
    expected: 20000,
    actual: position.internalTransfersInBase,
  });

  // Check 6: Net Cash Flow = 70k
  const netCashFlowPassed = position.netCashFlowInBase === 70000;
  testResults.push({
    testName: 'Net Cash Flow (Income 100k - Expense 30k)',
    passed: netCashFlowPassed,
    details: `Net Cash Flow must be exactly 70,000 YER`,
    expected: 70000,
    actual: position.netCashFlowInBase,
  });

  // Check 7: Ledger Invariant (Total Debits === Total Credits for every Journal Entry)
  const generatedJournal = generateCoreLedger(testWallets, testTransactions, [], DEFAULT_EXCHANGE_RATES, 'YER_ADEN');
  const allEntriesBalanced = generatedJournal.every(entry => {
    const dr = entry.lines.reduce((s, l) => s + l.amountInBaseCurrency, 0);
    const cr = entry.lines.reduce((s, l) => s + l.credit, 0); // or amountInBaseCurrency
    const drBase = entry.lines.reduce((s, l) => s + l.amountInBaseCurrency, 0);
    // For each entry, sum(debits in base) should equal sum(credits in base)
    const debitsSum = entry.lines.reduce((s, l) => s + (l.debit > 0 ? l.amountInBaseCurrency : 0), 0);
    const creditsSum = entry.lines.reduce((s, l) => s + (l.credit > 0 ? l.amountInBaseCurrency : 0), 0);
    return Math.abs(debitsSum - creditsSum) < 0.01;
  });
  testResults.push({
    testName: 'Ledger Invariant (Total Debit === Total Credit in Base Currency)',
    passed: allEntriesBalanced,
    details: `Every journal entry must balance perfectly: sum(Debits) === sum(Credits)`,
    expected: true,
    actual: allEntriesBalanced,
  });

  // Check 8: Transaction-to-Ledger Invariant (1 Transaction -> 1 corresponding ledger event)
  const txToLedgerMapValid = testTransactions.every(tx => {
    return generatedJournal.some(e => e.eventId === tx.id);
  });
  testResults.push({
    testName: 'Transaction-to-Ledger Invariant (1 Tx -> 1 Ledger Event)',
    passed: txToLedgerMapValid,
    details: `Every valid transaction must have a corresponding journal entry event`,
    expected: true,
    actual: txToLedgerMapValid,
  });

  // Check 9: Liquidity vs Net Worth Separation with Debts
  const testDebts: Debt[] = [
    {
      id: 'd-test-1',
      personName: 'خالد',
      amount: 15000,
      originalAmount: 15000,
      paidAmount: 5000,
      type: 'to_me', // 10,000 remaining receivable
      currency: 'YER_ADEN',
      createdAt: '2026-08-01',
      isPaid: false,
      note: 'سلف لخالد'
    },
    {
      id: 'd-test-2',
      personName: 'شركة التوريد',
      amount: 25000,
      originalAmount: 25000,
      paidAmount: 0,
      type: 'on_me', // 25,000 remaining payable
      currency: 'YER_ADEN',
      createdAt: '2026-08-01',
      isPaid: false,
      note: 'مشتريات آجلة'
    }
  ];

  const debtPosition = calculateConsolidatedPosition(
    testTransactions,
    testWallets,
    'YER_ADEN',
    DEFAULT_EXCHANGE_RATES,
    null,
    'YER_ADEN',
    testTransactions,
    testDebts
  );

  // Available Liquidity = Wallet A (50k) + Wallet B (20k) = 70,000 YER
  const liquidityPassed = debtPosition.availableLiquidityInBase === 70000;
  testResults.push({
    testName: 'Pure Available Liquidity vs Net Worth Separation',
    passed: liquidityPassed,
    details: `Available liquidity must represent actual cash (70k YER), not mixed with debts`,
    expected: 70000,
    actual: debtPosition.availableLiquidityInBase
  });

  // Net Worth = 70,000 (Liquid) + 10,000 (Receivables) - 25,000 (Payables) = 55,000 YER
  const netWorthWithDebtsPassed = debtPosition.netWorthInBase === 55000;
  testResults.push({
    testName: 'Net Worth Invariant with Receivables and Payables',
    passed: netWorthWithDebtsPassed,
    details: `Net Worth = 70k Cash + 10k Receivables - 25k Payables = 55,000 YER`,
    expected: 55000,
    actual: debtPosition.netWorthInBase
  });

  // Scenario 2: Cross-Currency Expense from Yemeni Wallet ($100 USD spent from YER_ADEN wallet)
  // Rate: 100 USD = 157,600 YER_ADEN (1 USD = 1576 YER_ADEN)
  // 100 USD = 157,600 YER_ADEN. Opening: 500,000 YER_ADEN. Expected Remaining: 342,400 YER_ADEN.
  const crossWallets: Wallet[] = [
    { id: 'w-yer-main', name: 'محفظة يمنية', currencyCode: 'YER_ADEN', color: '#10b981', openingBalance: 500000 },
  ];
  const crossTx: Transaction[] = [
    {
      id: 'tx-cross-1',
      walletId: 'w-yer-main',
      type: 'expense',
      amount: 100,
      currency: 'USD',
      categoryId: '1',
      date: '2026-08-05',
      note: 'Online USD Expense from Yemeni Wallet',
      frequency: 'once',
    }
  ];

  const crossBalances = calculateWalletBalances(crossWallets, crossTx, DEFAULT_EXCHANGE_RATES);
  const expectedRemaining = 500000 - 157600; // 342,400
  const crossExpensePassed = Math.abs(crossBalances['w-yer-main'].currentBalance - expectedRemaining) < 0.01;
  testResults.push({
    testName: 'Cross-Currency Expense ($100 USD from Yemeni Wallet)',
    passed: crossExpensePassed,
    details: `100 USD expense from 500k YER wallet should leave 342,400 YER (100 USD = 157,600 YER)`,
    expected: expectedRemaining,
    actual: crossBalances['w-yer-main'].currentBalance,
  });

  // Scenario 3: Diagnostic tool testing (Calculated Balance vs Transaction History consistency & AuditLogs)
  const diagnosticReport = diagnoseWalletBalanceDiscrepancies(crossWallets, crossTx, DEFAULT_EXCHANGE_RATES, 0.005, true);
  const diagnosticPassed = diagnosticReport.isConsistent && diagnosticReport.walletReports[0]?.isConsistent;
  testResults.push({
    testName: 'Diagnostic Reconciliation & AuditLogs Check',
    passed: diagnosticPassed,
    details: `Calculated balance must reconcile with raw transaction history and log into AuditLogs`,
    expected: true,
    actual: diagnosticPassed,
  });

  // Scenario 4: Historical FX Snapshot Immutability Test (Changing current exchange rates later must not alter historical result)
  const historicalTx: Transaction[] = [
    {
      id: 'tx-hist-1',
      walletId: 'w-yer-main',
      type: 'expense',
      amount: 100,
      currency: 'USD',
      exchangeRateUsed: 1576,
      convertedAmountInWalletCurrency: 157600,
      categoryId: '1',
      date: '2026-08-01',
      note: 'Historical 100 USD -> 157,600 YER_ADEN',
      frequency: 'once'
    }
  ];
  // Mutate current exchange rates dramatically
  const mutatedRates = { ...DEFAULT_EXCHANGE_RATES, USD: 3000, YER_ADEN: 1 };
  const balBeforeRateChange = calculateWalletBalances(crossWallets, historicalTx, DEFAULT_EXCHANGE_RATES);
  const balAfterRateChange = calculateWalletBalances(crossWallets, historicalTx, mutatedRates);
  const fxImmutablePassed = balBeforeRateChange['w-yer-main'].currentBalance === balAfterRateChange['w-yer-main'].currentBalance;
  testResults.push({
    testName: 'Historical FX Snapshot Immutability (Changing current rates does not affect historical Tx)',
    passed: fxImmutablePassed,
    details: `Historical transaction value must remain identical regardless of subsequent market rate changes`,
    expected: true,
    actual: fxImmutablePassed,
  });

  // Scenario 5: Cross-Currency Transfer Invariant (Source decreases by actual source, Destination increases by destinationAmount, Income = 0, Expense = 0)
  const transferWallets: Wallet[] = [
    { id: 'w-usd', name: 'USD Wallet', currencyCode: 'USD', color: '#3b82f6', openingBalance: 1000 },
    { id: 'w-sar', name: 'SAR Wallet', currencyCode: 'SAR', color: '#10b981', openingBalance: 1000 }
  ];
  const transferTx: Transaction[] = [
    {
      id: 'tx-xfer-1',
      walletId: 'w-usd',
      destinationWalletId: 'w-sar',
      type: 'transfer',
      amount: 100,
      currency: 'USD',
      destinationCurrency: 'SAR',
      destinationAmount: 385,
      exchangeRateUsed: 3.85,
      categoryId: 'transfer',
      date: '2026-08-02',
      note: 'Transfer 100 USD -> 385 SAR',
      frequency: 'once'
    }
  ];
  const xferBalances = calculateWalletBalances(transferWallets, transferTx, DEFAULT_EXCHANGE_RATES);
  const xferPosition = calculateConsolidatedPosition(transferTx, transferWallets, 'SAR', DEFAULT_EXCHANGE_RATES, null, 'SAR');
  const xferUsdPassed = xferBalances['w-usd'].currentBalance === 900; // 1000 - 100
  const xferSarPassed = xferBalances['w-sar'].currentBalance === 1385; // 1000 + 385
  const xferZeroIncomeExpense = xferPosition.totalIncomeInBase === 0 && xferPosition.totalExpenseInBase === 0;
  const xferTestPassed = xferUsdPassed && xferSarPassed && xferZeroIncomeExpense;

  testResults.push({
    testName: 'Cross-Currency Transfer Invariant (Source -100 USD, Dest +385 SAR, Income=0, Expense=0)',
    passed: xferTestPassed,
    details: `USD wallet decreases by 100, SAR wallet increases by 385, with zero impact on income/expense`,
    expected: true,
    actual: xferTestPassed,
  });

  const allPassed = testResults.every(r => r.passed);
  return { allPassed, testResults };
}

export interface BalanceAuditLogEntry {
  id: string;
  timestamp: string;
  walletId: string;
  walletName: string;
  currencyCode: string;
  calculatedBalance: number;
  transactionHistoryBalance: number;
  discrepancy: number; // Math.abs(calculatedBalance - transactionHistoryBalance)
  hasDiscrepancy: boolean;
  severity: 'info' | 'warning' | 'error';
  reason: string;
  resolution?: string;
  details: {
    openingBalance: number;
    totalInflowHistory: number;
    totalOutflowHistory: number;
    totalTransferInHistory: number;
    totalTransferOutHistory: number;
    totalAdjustmentHistory: number;
    crossCurrencyTxCount: number;
    conversionDriftAmount: number;
    totalTransactionsAnalyzed: number;
    crossCurrencyTransactions: Array<{
      txId: string;
      date: string;
      type: string;
      originalAmount: number;
      originalCurrency: string;
      convertedAmountInWalletCurrency: number;
      rateUsed?: number;
    }>;
  };
}

export interface WalletBalanceDiagnosticReport {
  walletId: string;
  walletName: string;
  currencyCode: string;
  calculatedBalance: number;
  transactionHistoryBalance: number;
  discrepancy: number;
  isConsistent: boolean;
  hasCurrencyConversionDrift: boolean;
  conversionDriftAmount: number;
  crossCurrencyTransactionsCount: number;
  totalTransactionsCount: number;
  status: 'CONSISTENT' | 'MINOR_DRIFT' | 'DISCREPANCY';
  auditLogId?: string;
}

export interface BalanceReconciliationDiagnosticResult {
  timestamp: string;
  isConsistent: boolean;
  totalWalletsAudited: number;
  consistentWalletsCount: number;
  discrepantWalletsCount: number;
  totalDiscrepancyBase: number;
  hasConversionDrifts: boolean;
  walletReports: WalletBalanceDiagnosticReport[];
  auditLogs: BalanceAuditLogEntry[];
  summaryMessage: string;
}

/**
 * Global audit log repository for balance discrepancy diagnostics
 */
export const AuditLogs: BalanceAuditLogEntry[] = [];

/**
 * Get a copy of current AuditLogs entries
 */
export function getAuditLogs(): BalanceAuditLogEntry[] {
  return [...AuditLogs];
}

/**
 * Records an entry into the system AuditLogs
 */
export function recordAuditLog(
  entry: Omit<BalanceAuditLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): BalanceAuditLogEntry {
  const newLog: BalanceAuditLogEntry = {
    id: entry.id || `audit-bal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    ...entry,
  };
  AuditLogs.unshift(newLog);
  if (AuditLogs.length > 300) {
    AuditLogs.length = 300; // retain up to 300 entries in rolling memory
  }
  return newLog;
}

/**
 * Clears recorded audit logs
 */
export function clearAuditLogs(): void {
  AuditLogs.length = 0;
}

/**
 * Diagnostic tool: Deep comparison between Calculated Balance and Transaction History.
 * 
 * Objectives:
 * 1. Independently calculates ledger balances from raw transaction history.
 * 2. Compares against the balance engine's calculated balance.
 * 3. Identifies and quantifies cumulative discrepancies arising from multi-currency conversions and rate rounding.
 * 4. Automatically registers any discrepancies and drifts into AuditLogs.
 */
export function diagnoseWalletBalanceDiscrepancies(
  wallets: Wallet[],
  transactions: Transaction[],
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
  tolerance: number = 0.005,
  logAllChecks: boolean = false
): BalanceReconciliationDiagnosticResult {
  const activeTxs = getActiveTransactions(transactions);
  const activeWallets = wallets || [];
  const walletReports: WalletBalanceDiagnosticReport[] = [];
  const generatedLogs: BalanceAuditLogEntry[] = [];

  // Calculate standard calculated balances from the engine
  const calculatedSummaries = calculateWalletBalances(activeWallets, activeTxs, exchangeRates);

  let totalDiscrepancyBase = 0;
  let hasGlobalConversionDrift = false;

  activeWallets.forEach(wallet => {
    const calculatedBal = calculatedSummaries[wallet.id]?.currentBalance ?? (Number(wallet.openingBalance) || 0);
    const openingBalance = Number(wallet.openingBalance) || 0;
    const walletCurrency = wallet.currencyCode || 'SAR';

    let rawHistoryBalance = openingBalance;
    let totalInflows = 0;
    let totalOutflows = 0;
    let totalTransfersIn = 0;
    let totalTransfersOut = 0;
    let totalAdjustments = 0;
    let crossCurrencyTxCount = 0;
    let conversionDriftSum = 0;
    const crossCurrencyTxs: Array<{
      txId: string;
      date: string;
      type: string;
      originalAmount: number;
      originalCurrency: string;
      convertedAmountInWalletCurrency: number;
      rateUsed?: number;
    }> = [];

    // Analyze each transaction impacting this wallet
    activeTxs.forEach(tx => {
      const rawAmount = Number(tx.amount) || 0;
      if (rawAmount === 0) return;
      const amount = Math.abs(rawAmount);

      // Impact on Source Wallet
      if (tx.walletId === wallet.id) {
        const txCurrency = tx.currency || walletCurrency;
        const isCrossCurrency = txCurrency !== walletCurrency;

        let convertedInWallet = amount;
        if (isCrossCurrency) {
          crossCurrencyTxCount++;
          const conversion = resolveHistoricalConversion(tx, walletCurrency, exchangeRates);
          convertedInWallet = conversion.amountInWallet;

          const dynamicallyConverted = convertCurrency(amount, txCurrency, walletCurrency, exchangeRates);
          const drift = conversion.isLegacy ? Math.abs(safeSub(dynamicallyConverted, convertedInWallet)) : 0;
          conversionDriftSum = safeAdd(conversionDriftSum, drift);

          crossCurrencyTxs.push({
            txId: tx.id,
            date: tx.date,
            type: tx.type,
            originalAmount: amount,
            originalCurrency: txCurrency,
            convertedAmountInWalletCurrency: roundToCurrency(convertedInWallet),
            rateUsed: tx.exchangeRateUsed || conversion.effectiveRate,
          });
        }

        if (tx.type === 'income') {
          totalInflows = safeAdd(totalInflows, convertedInWallet);
          rawHistoryBalance = safeAdd(rawHistoryBalance, convertedInWallet);
        } else if (tx.type === 'expense' || tx.type === 'transfer_to_goal') {
          totalOutflows = safeAdd(totalOutflows, convertedInWallet);
          rawHistoryBalance = safeSub(rawHistoryBalance, convertedInWallet);
        } else if (tx.type === 'transfer') {
          totalTransfersOut = safeAdd(totalTransfersOut, convertedInWallet);
          rawHistoryBalance = safeSub(rawHistoryBalance, convertedInWallet);
        } else if (tx.type === 'adjustment') {
          totalAdjustments = safeAdd(totalAdjustments, convertedInWallet);
          rawHistoryBalance = safeAdd(rawHistoryBalance, convertedInWallet);
        }
      }

      // Impact on Destination Wallet (Internal Transfer In)
      if (tx.destinationWalletId === wallet.id && tx.type === 'transfer') {
        const txCurrency = tx.currency || walletCurrency;
        const isCrossCurrency = txCurrency !== walletCurrency;

        let receivedAmount = amount;
        if (tx.destinationAmount !== undefined && tx.destinationAmount !== null && Number(tx.destinationAmount) > 0) {
          receivedAmount = Number(tx.destinationAmount);
        } else if (isCrossCurrency) {
          const destConversion = resolveHistoricalConversion(tx, walletCurrency, exchangeRates);
          receivedAmount = destConversion.destinationAmount;
        }

        if (isCrossCurrency) {
          crossCurrencyTxCount++;
          crossCurrencyTxs.push({
            txId: tx.id,
            date: tx.date,
            type: 'transfer_in',
            originalAmount: amount,
            originalCurrency: txCurrency,
            convertedAmountInWalletCurrency: roundToCurrency(receivedAmount),
            rateUsed: tx.exchangeRateUsed,
          });
        }

        totalTransfersIn = safeAdd(totalTransfersIn, receivedAmount);
        rawHistoryBalance = safeAdd(rawHistoryBalance, receivedAmount);
      }
    });

    const roundedCalculated = roundToCurrency(calculatedBal);
    const roundedHistory = roundToCurrency(rawHistoryBalance);
    const discrepancy = roundToCurrency(Math.abs(safeSub(roundedCalculated, roundedHistory)));
    const hasDiscrepancy = discrepancy > tolerance;
    const hasDrift = conversionDriftSum > tolerance;

    if (hasDrift) {
      hasGlobalConversionDrift = true;
    }

    if (hasDiscrepancy) {
      const inBaseDiscrepancy = convertCurrency(discrepancy, walletCurrency, 'SAR', exchangeRates);
      totalDiscrepancyBase = safeAdd(totalDiscrepancyBase, inBaseDiscrepancy);
    }

    let status: 'CONSISTENT' | 'MINOR_DRIFT' | 'DISCREPANCY' = 'CONSISTENT';
    if (hasDiscrepancy) {
      status = 'DISCREPANCY';
    } else if (hasDrift) {
      status = 'MINOR_DRIFT';
    }

    let auditLogId: string | undefined;

    // Record into AuditLogs if discrepancy is found or drift detected or full logging requested
    if (hasDiscrepancy || hasDrift || logAllChecks) {
      const severity: 'info' | 'warning' | 'error' = hasDiscrepancy
        ? (discrepancy >= 1.0 ? 'error' : 'warning')
        : (hasDrift ? 'warning' : 'info');

      let reason = 'تطابق كامل وتام بين الرصيد المحسوب وسجل المعاملات';
      let resolution = 'لا يوجد أي إجراء مطلوب';

      if (hasDiscrepancy) {
        reason = `تم رصد تباين بقيمة ${discrepancy} ${walletCurrency} بين الرصيد المحسوب (${roundedCalculated}) وسجل المعاملات الفعلي (${roundedHistory})`;
        resolution = hasDrift 
          ? 'يوصى بتحديث وتثبيت أسعار الصرف التاريخية للعمليات متعددة العملات ومزامنة الرصيد'
          : 'يوصى بإعادة مزامنة الرصيد الافتتاحي وتدقيق العمليات المرتبطة بالمحفظة';
      } else if (hasDrift) {
        reason = `تم رصد فروقات تحويل عملات تراكمية ضئيلة بقيمة ${roundToCurrency(conversionDriftSum)} ${walletCurrency} ناتجة عن تقلبات أسعار الصرف`;
        resolution = 'تثبيت أسعار الصرف التاريخية في حقل exchangeRateUsed لكل عملية';
      }

      const logEntry = recordAuditLog({
        walletId: wallet.id,
        walletName: wallet.name,
        currencyCode: walletCurrency,
        calculatedBalance: roundedCalculated,
        transactionHistoryBalance: roundedHistory,
        discrepancy,
        hasDiscrepancy,
        severity,
        reason,
        resolution,
        details: {
          openingBalance,
          totalInflowHistory: roundToCurrency(totalInflows),
          totalOutflowHistory: roundToCurrency(totalOutflows),
          totalTransferInHistory: roundToCurrency(totalTransfersIn),
          totalTransferOutHistory: roundToCurrency(totalTransfersOut),
          totalAdjustmentHistory: roundToCurrency(totalAdjustments),
          crossCurrencyTxCount,
          conversionDriftAmount: roundToCurrency(conversionDriftSum),
          totalTransactionsAnalyzed: activeTxs.length,
          crossCurrencyTransactions: crossCurrencyTxs,
        },
      });

      auditLogId = logEntry.id;
      generatedLogs.push(logEntry);
    }

    walletReports.push({
      walletId: wallet.id,
      walletName: wallet.name,
      currencyCode: walletCurrency,
      calculatedBalance: roundedCalculated,
      transactionHistoryBalance: roundedHistory,
      discrepancy,
      isConsistent: !hasDiscrepancy,
      hasCurrencyConversionDrift: hasDrift,
      conversionDriftAmount: roundToCurrency(conversionDriftSum),
      crossCurrencyTransactionsCount: crossCurrencyTxCount,
      totalTransactionsCount: activeTxs.length,
      status,
      auditLogId,
    });
  });

  const discrepantCount = walletReports.filter(r => !r.isConsistent).length;
  const consistentCount = walletReports.length - discrepantCount;
  const isOverallConsistent = discrepantCount === 0;

  const summaryMessage = isOverallConsistent
    ? `تم فحص جميع المحافظ (${activeWallets.length}): الأرصدة المحسوبة مطابقة تماماً لسجل المعاملات الفعلي بدون أي فروقات تراكمية.`
    : `تم رصد عدم تطابق في ${discrepantCount} محفظة بإجمالي فروقات تقديرية تعادل ${roundToCurrency(totalDiscrepancyBase)} SAR. تم تسجيل التفاصيل في AuditLogs.`;

  return {
    timestamp: new Date().toISOString(),
    isConsistent: isOverallConsistent,
    totalWalletsAudited: activeWallets.length,
    consistentWalletsCount: consistentCount,
    discrepantWalletsCount: discrepantCount,
    totalDiscrepancyBase: roundToCurrency(totalDiscrepancyBase),
    hasConversionDrifts: hasGlobalConversionDrift,
    walletReports,
    auditLogs: generatedLogs,
    summaryMessage,
  };
}

/**
 * Direct alias for diagnoseWalletBalanceDiscrepancies
 */
export const compareCalculatedBalanceWithHistory = diagnoseWalletBalanceDiscrepancies;

/**
 * Validate transaction integrity before saving
 */
export function validateTransactionData(tx: Partial<Transaction>): { isValid: boolean; error?: string } {
  if (!tx.amount || isNaN(tx.amount) || Number(tx.amount) <= 0) {
    return { isValid: false, error: 'يجب أن يكون المبلغ رقماً موجباً أكبر من صفر' };
  }
  if (!tx.walletId) {
    return { isValid: false, error: 'يرجى اختيار المحفظة' };
  }
  if (!tx.type) {
    return { isValid: false, error: 'يرجى تحديد نوع العملية' };
  }
  if (tx.type === 'transfer') {
    if (!tx.destinationWalletId) {
      return { isValid: false, error: 'يرجى تحديد المحفظة المستلمة للتحويل' };
    }
    if (tx.destinationWalletId === tx.walletId) {
      return { isValid: false, error: 'لا يمكن التحويل إلى نفس المحفظة المصدر' };
    }
  } else {
    if (!tx.categoryId) {
      return { isValid: false, error: 'يرجى تحديد تصنيف العملية' };
    }
  }
  if (!tx.date) {
    return { isValid: false, error: 'يرجى تحديد تاريخ العملية' };
  }
  return { isValid: true };
}
