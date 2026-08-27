/**
 * THARI Financial Application — Core Balance & Ledger Engine
 * Single Source of Truth for financial calculations, multi-wallet balance tracking,
 * multi-currency ledger calculation, cross-currency spending, transfer consistency, and mathematical audits.
 */

import { Transaction, Wallet, Currency, Debt } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';
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
    // Financing flows are not operating income/expense
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

  // Calculate percentage change in net performance
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
 * Calculate precise balance for each wallet independently.
 * Accurately converts transaction amounts to the wallet's native currency
 * when a transaction is recorded in a different currency (e.g. spending $100 from a Yemeni wallet).
 */
export function calculateWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[],
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): Record<string, WalletBalanceSummary> {
  const activeTxs = getActiveTransactions(transactions);
  const result: Record<string, WalletBalanceSummary> = {};

  (wallets || []).forEach(w => {
    result[w.id] = {
      walletId: w.id,
      walletName: w.name,
      currencyCode: w.currencyCode,
      openingBalance: Number(w.openingBalance) || 0,
      totalIncome: 0,
      totalExpense: 0,
      transfersOut: 0,
      transfersIn: 0,
      adjustments: 0,
      currentBalance: Number(w.openingBalance) || 0,
    };
  });

  activeTxs.forEach(tx => {
    const rawAmount = Number(tx.amount) || 0;
    if (rawAmount === 0) return;
    const amount = Math.abs(rawAmount);

    // 1. Source wallet deduction / credit
    const sourceSummary = result[tx.walletId];
    if (sourceSummary) {
      const walletCurrency = sourceSummary.currencyCode;
      const txCurrency = tx.currency || walletCurrency;

      // Accurately convert the transaction amount to the wallet's native currency
      const amountInWalletCurrency = (txCurrency === walletCurrency)
        ? amount
        : convertCurrency(amount, txCurrency, walletCurrency, exchangeRates);

      if (tx.type === 'income') {
        sourceSummary.totalIncome = safeAdd(sourceSummary.totalIncome, amountInWalletCurrency);
        sourceSummary.currentBalance = safeAdd(sourceSummary.currentBalance, amountInWalletCurrency);
      } else if (tx.type === 'expense' || tx.type === 'transfer_to_goal') {
        sourceSummary.totalExpense = safeAdd(sourceSummary.totalExpense, amountInWalletCurrency);
        sourceSummary.currentBalance = safeSub(sourceSummary.currentBalance, amountInWalletCurrency);
      } else if (tx.type === 'transfer') {
        sourceSummary.transfersOut = safeAdd(sourceSummary.transfersOut, amountInWalletCurrency);
        sourceSummary.currentBalance = safeSub(sourceSummary.currentBalance, amountInWalletCurrency);
      } else if (tx.type === 'adjustment') {
        sourceSummary.adjustments = safeAdd(sourceSummary.adjustments, amountInWalletCurrency);
        sourceSummary.currentBalance = safeAdd(sourceSummary.currentBalance, amountInWalletCurrency);
      }
    }

    // 2. Destination wallet credit (for internal transfers)
    if (tx.type === 'transfer' && tx.destinationWalletId) {
      const destSummary = result[tx.destinationWalletId];
      if (destSummary) {
        const destCurrency = destSummary.currencyCode;
        const txCurrency = tx.currency || destCurrency;

        // Use destinationAmount if explicitly provided; otherwise convert using exchange rates
        const receivedAmount = (tx.destinationAmount !== undefined && tx.destinationAmount !== null && tx.destinationAmount > 0)
          ? Number(tx.destinationAmount)
          : (txCurrency === destCurrency ? amount : convertCurrency(amount, txCurrency, destCurrency, exchangeRates));

        destSummary.transfersIn = safeAdd(destSummary.transfersIn, receivedAmount);
        destSummary.currentBalance = safeAdd(destSummary.currentBalance, receivedAmount);
      }
    }
  });

  return result;
}

/**
 * Calculate multi-currency breakdowns and global consolidated figures.
 * Supports:
 * - Single Currency mode (pure currency calculations without mixing exchange rates)
 * - Multi-Currency mode (normalized valuation in base currency with transparent rate breakdowns)
 * - Wallet filtering
 * - Lifetime Cumulative Balance vs Period Flow separation for 100% accurate Net Worth
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

  // Apply wallet filtering if specified
  if (filterWalletId) {
    periodTxs = periodTxs.filter(
      t => t.walletId === filterWalletId || t.destinationWalletId === filterWalletId
    );
  }

  // Apply single currency filtering if specified
  const isSingleCurrency = Boolean(filterCurrencyCode && filterCurrencyCode !== 'ALL');
  if (isSingleCurrency && filterCurrencyCode) {
    periodTxs = periodTxs.filter(t => t.currency === filterCurrencyCode);
  }

  const activeWallets = filterWalletId 
    ? (wallets || []).filter(w => w.id === filterWalletId)
    : (wallets || []);

  // Calculate true lifetime cumulative balances for active wallets
  const walletSummaries = calculateWalletBalances(activeWallets, lifetimeTxs, exchangeRates);

  const currencyBalances: Record<string, number> = {};
  const expenseByCurrency: Record<string, number> = {};
  const incomeByCurrency: Record<string, number> = {};
  const transfersByCurrency: Record<string, number> = {};

  // Initialize currency balances from relevant wallets
  activeWallets.forEach(w => {
    if (!currencyBalances[w.currencyCode]) {
      currencyBalances[w.currencyCode] = 0;
    }
  });

  // Aggregate current balance per currency directly from wallet summaries
  Object.values(walletSummaries).forEach(summary => {
    currencyBalances[summary.currencyCode] = safeAdd(currencyBalances[summary.currencyCode] || 0, summary.currentBalance);
  });

  // Calculate Inflows, Outflows, and Internal Transfers for the given period
  let totalIncomeInBase = 0;
  let totalExpenseInBase = 0;
  let internalTransfersInBase = 0;

  periodTxs.forEach(tx => {
    // Exclude financing movements from operating P&L
    if (tx.isFinancing) return;
    const rawAmount = Number(tx.amount) || 0;
    if (rawAmount === 0) return;
    const amount = Math.abs(rawAmount);
    const txCurr = tx.currency || baseCurrencyCode;

    if (tx.type === 'income') {
      incomeByCurrency[txCurr] = safeAdd(incomeByCurrency[txCurr] || 0, amount);
      totalIncomeInBase = safeAdd(totalIncomeInBase, convertCurrency(amount, txCurr, baseCurrencyCode, exchangeRates));
    } else if (tx.type === 'expense' || tx.type === 'transfer_to_goal') {
      expenseByCurrency[txCurr] = safeAdd(expenseByCurrency[txCurr] || 0, amount);
      totalExpenseInBase = safeAdd(totalExpenseInBase, convertCurrency(amount, txCurr, baseCurrencyCode, exchangeRates));
    } else if (tx.type === 'transfer') {
      // Internal transfers are tracked separately and strictly NOT added to income or expense
      transfersByCurrency[txCurr] = safeAdd(transfersByCurrency[txCurr] || 0, amount);
      internalTransfersInBase = safeAdd(internalTransfersInBase, convertCurrency(amount, txCurr, baseCurrencyCode, exchangeRates));
    }
  });

  // Calculate Liquid Cash Available across wallets
  let availableLiquidityInBase = 0;
  if (isSingleCurrency && filterCurrencyCode) {
    availableLiquidityInBase = currencyBalances[filterCurrencyCode] || 0;
  } else {
    availableLiquidityInBase = Object.entries(currencyBalances).reduce((sum, [code, amount]) => {
      const normalizedAmount = isTravelCurrencyMode && amount === 0 && code !== baseCurrencyCode ? 0 : amount;
      return safeAdd(sum, convertCurrency(normalizedAmount, code, baseCurrencyCode, exchangeRates));
    }, 0);
  }

  // Calculate Debts (Receivables & Payables)
  let receivablesInBase = 0;
  let payablesInBase = 0;

  (debts || []).forEach(d => {
    if (d.isPaid || d.status === 'settled') return;
    const original = Number(d.originalAmount || d.amount) || 0;
    const paid = Number(d.paidAmount) || 0;
    const remaining = Math.max(0, safeSub(original, paid));
    if (remaining <= 0) return;
    const inBase = convertCurrency(remaining, d.currency || baseCurrencyCode, baseCurrencyCode, exchangeRates);
    if (d.type === 'to_me') {
      receivablesInBase = safeAdd(receivablesInBase, inBase);
    } else if (d.type === 'on_me') {
      payablesInBase = safeAdd(payablesInBase, inBase);
    }
  });

  // Net Worth = Liquid Cash + Receivables - Payables
  const netWorthInBase = safeSub(safeAdd(availableLiquidityInBase, receivablesInBase), payablesInBase);

  // Net Cash Flow strictly = Total Operating Income - Total Operating Expense (excluding transfers and financing)
  const netCashFlowInBase = safeSub(totalIncomeInBase, totalExpenseInBase);
  const savingsRate = totalIncomeInBase > 0 ? Math.max(0, Math.round((netCashFlowInBase / totalIncomeInBase) * 100)) : 0;

  // Calculate Date-Based Growth
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

  // Check 7: Liquidity vs Net Worth Separation with Debts
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
  // Rate: 1 USD = 3.75 SAR, 1 SAR = 430 YER_ADEN => 1 USD = 1612.5 YER_ADEN
  // 100 USD = 161,250 YER_ADEN. Opening: 500,000 YER_ADEN. Expected Remaining: 338,750 YER_ADEN.
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
  const expectedRemaining = 500000 - 161250; // 338,750
  const crossExpensePassed = Math.abs(crossBalances['w-yer-main'].currentBalance - expectedRemaining) < 0.01;
  testResults.push({
    testName: 'Cross-Currency Expense ($100 USD from Yemeni Wallet)',
    passed: crossExpensePassed,
    details: `100 USD expense from 500k YER wallet should leave 338,750 YER (1 USD = 1612.5 YER)`,
    expected: expectedRemaining,
    actual: crossBalances['w-yer-main'].currentBalance,
  });

  const allPassed = testResults.every(r => r.passed);
  return { allPassed, testResults };
}

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
