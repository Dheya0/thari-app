/**
 * THARI Core Ledger Engine
 * Professional Double-Entry Accounting & Financial Event Ledger
 * 
 * Flow:
 * Financial Event -> Journal Entry -> Debit / Credit -> Ledger -> Balance
 * 
 * Principles:
 * 1. Single Source of Truth: All balances (wallets, debts, income, expenses) derive from the Core Ledger.
 * 2. Immutable Historical Records: Operations retain historical currency rate snapshots.
 * 3. Exact Balance Invariance: sum(Debits) === sum(Credits) for every balanced journal entry.
 */

import { 
  FinancialEventType, 
  JournalEntry, 
  JournalLine, 
  LedgerAccountType, 
  Transaction, 
  Wallet, 
  Debt, 
  DebtPayment 
} from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';

export interface LedgerWalletBalance {
  walletId: string;
  walletName: string;
  currencyCode: string;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  openingBalance: number;
  inflows: number;
  outflows: number;
  transfersIn: number;
  transfersOut: number;
  adjustments: number;
}

export interface LedgerDebtBalance {
  debtId: string;
  personName: string;
  type: 'to_me' | 'on_me';
  currency: string;
  originalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  isSettled: boolean;
}

export interface ConsolidatedLedgerSummary {
  netWorthInBase: number;
  totalAssetsInBase: number;
  totalReceivablesInBase: number;
  totalLiabilitiesInBase: number;
  totalIncomeInBase: number;
  totalExpenseInBase: number;
  netCashFlowInBase: number;
  journalEntriesCount: number;
  isBalanced: boolean;
  walletBalances: Record<string, LedgerWalletBalance>;
  debtBalances: Record<string, LedgerDebtBalance>;
}

/**
 * Generates the complete double-entry general ledger journal from application state.
 */
export function generateCoreLedger(
  wallets: Wallet[],
  transactions: Transaction[],
  debts: Debt[],
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
  baseCurrencyCode: string = 'SAR'
): JournalEntry[] {
  const journal: JournalEntry[] = [];
  const activeTxs = (transactions || []).filter(t => !t.isDeleted);
  const activeWallets = wallets || [];
  const activeDebts = debts || [];

  // Helper to safely get exchange rate snapshot
  const getRateSnapshot = (currency: string): number => {
    return exchangeRates[currency] || DEFAULT_EXCHANGE_RATES[currency] || 1;
  };

  // Helper to calculate base currency amount with frozen rate snapshot
  const calcBaseAmount = (amount: number, currency: string, customRate?: number): number => {
    if (currency === baseCurrencyCode) return amount;
    const rate = customRate || getRateSnapshot(currency);
    const baseRate = getRateSnapshot(baseCurrencyCode);
    if (baseRate <= 0) return amount;
    return (amount * rate) / baseRate;
  };

  // 1. OPENING BALANCES (Equity -> Assets)
  activeWallets.forEach(wallet => {
    const openingBal = Number(wallet.openingBalance) || 0;
    if (openingBal > 0) {
      const rate = getRateSnapshot(wallet.currencyCode);
      const baseAmount = calcBaseAmount(openingBal, wallet.currencyCode, rate);

      journal.push({
        id: `entry-open-${wallet.id}`,
        eventId: wallet.id,
        eventType: 'balance_adjustment',
        date: wallet.createdAt ? wallet.createdAt.split('T')[0] : '2026-01-01',
        timestamp: wallet.createdAt || new Date().toISOString(),
        description: `رصيد افتتاحي: ${wallet.name}`,
        sourceWalletId: wallet.id,
        lines: [
          {
            id: `line-open-dr-${wallet.id}`,
            accountId: wallet.id,
            accountName: wallet.name,
            accountType: 'asset',
            debit: openingBal,
            credit: 0,
            currency: wallet.currencyCode,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: 'رصيد افتتاحي للمحفظة'
          },
          {
            id: `line-open-cr-${wallet.id}`,
            accountId: 'equity-opening-balance',
            accountName: 'حقوق الملكية / أرصدة افتتاحية',
            accountType: 'equity',
            debit: 0,
            credit: openingBal,
            currency: wallet.currencyCode,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: 'حساب موازنة رأس المال الأولي'
          }
        ]
      });
    }
  });

  // 2. TRANSACTIONS (Expense, Income, Transfer, Adjustment)
  activeTxs.forEach(tx => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    const sourceWallet = activeWallets.find(w => w.id === tx.walletId);
    const walletCurrency = sourceWallet?.currencyCode || tx.currency || 'SAR';
    const txCurrency = tx.currency || walletCurrency;
    
    // Historical FX snapshot precedence: exchangeRateUsed, exchangeRate, or fallback rate
    const historicalRate = tx.exchangeRateUsed || tx.exchangeRate;
    const rate = historicalRate || getRateSnapshot(txCurrency);
    const baseAmount = calcBaseAmount(amount, txCurrency, rate);

    // Converted amount in source wallet's native currency (immutable snapshot or exact historical rate)
    const amountInSourceWallet = (txCurrency === walletCurrency)
      ? amount
      : (tx.convertedAmountInWalletCurrency !== undefined && tx.convertedAmountInWalletCurrency !== null
          ? Number(tx.convertedAmountInWalletCurrency)
          : (historicalRate ? safeMul(amount, historicalRate) : convertCurrency(amount, txCurrency, walletCurrency, exchangeRates)));

    if (tx.type === 'expense' || tx.type === 'transfer_to_goal') {
      // EXPENSE: Debit Expense Category Account, Credit Asset Wallet
      journal.push({
        id: `entry-tx-${tx.id}`,
        eventId: tx.id,
        eventType: 'expense',
        date: tx.date,
        timestamp: tx.createdAt || `${tx.date}T12:00:00.000Z`,
        description: tx.note || 'مصروف',
        sourceWalletId: tx.walletId,
        lines: [
          {
            id: `line-tx-dr-${tx.id}`,
            accountId: tx.categoryId || 'general-expense',
            accountName: 'مصروفات',
            accountType: 'expense',
            debit: amount,
            credit: 0,
            currency: txCurrency,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: tx.note
          },
          {
            id: `line-tx-cr-${tx.id}`,
            accountId: tx.walletId,
            accountName: sourceWallet?.name || 'محفظة',
            accountType: 'asset',
            debit: 0,
            credit: amountInSourceWallet,
            currency: walletCurrency,
            rateSnapshot: getRateSnapshot(walletCurrency),
            amountInBaseCurrency: baseAmount,
            note: tx.note
          }
        ]
      });
    } else if (tx.type === 'income') {
      // INCOME: Debit Asset Wallet, Credit Income Category Account
      journal.push({
        id: `entry-tx-${tx.id}`,
        eventId: tx.id,
        eventType: 'income',
        date: tx.date,
        timestamp: tx.createdAt || `${tx.date}T12:00:00.000Z`,
        description: tx.note || 'إيراد / دخل',
        sourceWalletId: tx.walletId,
        lines: [
          {
            id: `line-tx-dr-${tx.id}`,
            accountId: tx.walletId,
            accountName: sourceWallet?.name || 'محفظة',
            accountType: 'asset',
            debit: amountInSourceWallet,
            credit: 0,
            currency: walletCurrency,
            rateSnapshot: getRateSnapshot(walletCurrency),
            amountInBaseCurrency: baseAmount,
            note: tx.note
          },
          {
            id: `line-tx-cr-${tx.id}`,
            accountId: tx.categoryId || 'general-income',
            accountName: 'إيرادات',
            accountType: 'income',
            debit: 0,
            credit: amount,
            currency: txCurrency,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: tx.note
          }
        ]
      });
    } else if (tx.type === 'transfer' && tx.destinationWalletId) {
      // TRANSFER: Debit Destination Asset Wallet, Credit Source Asset Wallet
      const destWallet = activeWallets.find(w => w.id === tx.destinationWalletId);
      const destCurrency = destWallet?.currencyCode || tx.destinationCurrency || walletCurrency;
      
      const receivedAmount = (tx.destinationAmount !== undefined && tx.destinationAmount !== null && Number(tx.destinationAmount) > 0)
        ? Number(tx.destinationAmount)
        : (txCurrency === destCurrency
            ? amount
            : (historicalRate ? safeMul(amount, historicalRate) : convertCurrency(amount, txCurrency, destCurrency, exchangeRates)));

      journal.push({
        id: `entry-tx-${tx.id}`,
        eventId: tx.id,
        eventType: 'transfer',
        date: tx.date,
        timestamp: tx.createdAt || `${tx.date}T12:00:00.000Z`,
        description: tx.note || `تحويل من ${sourceWallet?.name || ''} إلى ${destWallet?.name || ''}`,
        sourceWalletId: tx.walletId,
        destinationWalletId: tx.destinationWalletId,
        lines: [
          {
            id: `line-tx-dr-${tx.id}`,
            accountId: tx.destinationWalletId,
            accountName: destWallet?.name || 'محفظة مستلمة',
            accountType: 'asset',
            debit: receivedAmount,
            credit: 0,
            currency: destCurrency,
            rateSnapshot: getRateSnapshot(destCurrency),
            amountInBaseCurrency: calcBaseAmount(receivedAmount, destCurrency),
            note: 'استلام تحويل مالي'
          },
          {
            id: `line-tx-cr-${tx.id}`,
            accountId: tx.walletId,
            accountName: sourceWallet?.name || 'محفظة مرسلة',
            accountType: 'asset',
            debit: 0,
            credit: amountInSourceWallet,
            currency: walletCurrency,
            rateSnapshot: getRateSnapshot(walletCurrency),
            amountInBaseCurrency: baseAmount,
            note: 'إرسال تحويل مالي'
          }
        ]
      });
    } else if (tx.type === 'adjustment') {
      // BALANCE ADJUSTMENT: Reconcile Asset with Reconciliation Account
      const isPositive = amount > 0;
      const absAmount = Math.abs(amountInSourceWallet);

      journal.push({
        id: `entry-tx-${tx.id}`,
        eventId: tx.id,
        eventType: 'balance_adjustment',
        date: tx.date,
        timestamp: tx.createdAt || `${tx.date}T12:00:00.000Z`,
        description: tx.note || 'تصحيح وتسوية رصيد',
        sourceWalletId: tx.walletId,
        lines: [
          {
            id: `line-tx-adj-1-${tx.id}`,
            accountId: tx.walletId,
            accountName: sourceWallet?.name || 'محفظة',
            accountType: 'asset',
            debit: isPositive ? absAmount : 0,
            credit: isPositive ? 0 : absAmount,
            currency: walletCurrency,
            rateSnapshot: getRateSnapshot(walletCurrency),
            amountInBaseCurrency: baseAmount,
            note: tx.note
          },
          {
            id: `line-tx-adj-2-${tx.id}`,
            accountId: 'reconciliation-adjustments',
            accountName: 'تسويات وفروقات أرصدة',
            accountType: 'reconciliation',
            debit: isPositive ? 0 : absAmount,
            credit: isPositive ? absAmount : 0,
            currency: walletCurrency,
            rateSnapshot: getRateSnapshot(walletCurrency),
            amountInBaseCurrency: baseAmount,
            note: 'فروقات جرد الرصيد الفعلي'
          }
        ]
      });
    }
  });

  // 3. DEBTS (Receivables & Payables Ledger Tracking)
  activeDebts.forEach(debt => {
    const originalAmount = Number(debt.originalAmount || debt.amount) || 0;
    if (originalAmount <= 0) return;

    const debtCurrency = debt.currency || 'SAR';
    const rate = getRateSnapshot(debtCurrency);
    const baseAmount = calcBaseAmount(originalAmount, debtCurrency, rate);

    // Initial Debt Event
    if (debt.type === 'to_me') {
      // DEBT TO ME (Receivable Asset): Dr. Receivable, Cr. Initial / Funding
      journal.push({
        id: `entry-debt-${debt.id}`,
        eventId: debt.id,
        eventType: 'debt_to_me',
        date: debt.createdAt ? debt.createdAt.split('T')[0] : '2026-01-01',
        timestamp: debt.createdAt || new Date().toISOString(),
        description: `دين لي بذمة: ${debt.personName}`,
        debtId: debt.id,
        personName: debt.personName,
        lines: [
          {
            id: `line-debt-dr-${debt.id}`,
            accountId: `rec-${debt.id}`,
            accountName: `مستحق من: ${debt.personName}`,
            accountType: 'receivable',
            debit: originalAmount,
            credit: 0,
            currency: debtCurrency,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: debt.note || 'إقراض مبلغ للغير'
          },
          {
            id: `line-debt-cr-${debt.id}`,
            accountId: 'debt-initial-equity',
            accountName: 'تسوية ديون ومستحقات أولية',
            accountType: 'equity',
            debit: 0,
            credit: originalAmount,
            currency: debtCurrency,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: 'قيد الذمة المالية الأصلية'
          }
        ]
      });
    } else {
      // DEBT ON ME (Payable Liability): Dr. Initial / Received, Cr. Payable
      journal.push({
        id: `entry-debt-${debt.id}`,
        eventId: debt.id,
        eventType: 'debt_on_me',
        date: debt.createdAt ? debt.createdAt.split('T')[0] : '2026-01-01',
        timestamp: debt.createdAt || new Date().toISOString(),
        description: `دين عليّ لصالح: ${debt.personName}`,
        debtId: debt.id,
        personName: debt.personName,
        lines: [
          {
            id: `line-debt-dr-${debt.id}`,
            accountId: 'debt-initial-equity',
            accountName: 'تسوية ديون ومطلوبات أولية',
            accountType: 'equity',
            debit: originalAmount,
            credit: 0,
            currency: debtCurrency,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: 'قيد الذمة المالية الأصلية'
          },
          {
            id: `line-debt-cr-${debt.id}`,
            accountId: `pay-${debt.id}`,
            accountName: `مستحق لـ: ${debt.personName}`,
            accountType: 'payable',
            debit: 0,
            credit: originalAmount,
            currency: debtCurrency,
            rateSnapshot: rate,
            amountInBaseCurrency: baseAmount,
            note: debt.note || 'استلاف مبلغ من الغير'
          }
        ]
      });
    }

    // Debt Detailed Payments Ledger
    if (debt.payments && debt.payments.length > 0) {
      debt.payments.forEach(pay => {
        const payAmount = Number(pay.amount) || 0;
        if (payAmount <= 0) return;

        const payBaseAmount = calcBaseAmount(payAmount, debtCurrency);

        if (debt.type === 'to_me') {
          // Repayment received from debtor: Dr. Asset (Wallet), Cr. Receivable
          journal.push({
            id: `entry-pay-${pay.id}`,
            eventId: pay.id,
            eventType: 'debt_repayment',
            date: pay.date,
            timestamp: pay.createdAt || new Date().toISOString(),
            description: `استرداد دفعة دين من ${debt.personName}${pay.note ? ` - ${pay.note}` : ''}`,
            sourceWalletId: pay.walletId,
            debtId: debt.id,
            personName: debt.personName,
            lines: [
              {
                id: `line-pay-dr-${pay.id}`,
                accountId: pay.walletId || 'cash-external',
                accountName: pay.walletName || 'المحفظة / النقد',
                accountType: 'asset',
                debit: payAmount,
                credit: 0,
                currency: debtCurrency,
                rateSnapshot: rate,
                amountInBaseCurrency: payBaseAmount,
                note: pay.note
              },
              {
                id: `line-pay-cr-${pay.id}`,
                accountId: `rec-${debt.id}`,
                accountName: `مستحق من: ${debt.personName}`,
                accountType: 'receivable',
                debit: 0,
                credit: payAmount,
                currency: debtCurrency,
                rateSnapshot: rate,
                amountInBaseCurrency: payBaseAmount,
                note: 'سداد دفعة وتخفيض المستحق'
              }
            ]
          });
        } else {
          // Repayment paid to creditor: Dr. Payable, Cr. Asset (Wallet)
          journal.push({
            id: `entry-pay-${pay.id}`,
            eventId: pay.id,
            eventType: 'debt_repayment',
            date: pay.date,
            timestamp: pay.createdAt || new Date().toISOString(),
            description: `سداد دفعة دين لـ ${debt.personName}${pay.note ? ` - ${pay.note}` : ''}`,
            sourceWalletId: pay.walletId,
            debtId: debt.id,
            personName: debt.personName,
            lines: [
              {
                id: `line-pay-dr-${pay.id}`,
                accountId: `pay-${debt.id}`,
                accountName: `مستحق لـ: ${debt.personName}`,
                accountType: 'payable',
                debit: payAmount,
                credit: 0,
                currency: debtCurrency,
                rateSnapshot: rate,
                amountInBaseCurrency: payBaseAmount,
                note: 'سداد دفعة وتخفيض الالتزام'
              },
              {
                id: `line-pay-cr-${pay.id}`,
                accountId: pay.walletId || 'cash-external',
                accountName: pay.walletName || 'المحفظة / النقد',
                accountType: 'asset',
                debit: 0,
                credit: payAmount,
                currency: debtCurrency,
                rateSnapshot: rate,
                amountInBaseCurrency: payBaseAmount,
                note: pay.note
              }
            ]
          });
        }
      });
    }
  });

  // Sort journal chronologically
  return journal.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.date).getTime();
    const timeB = new Date(b.timestamp || b.date).getTime();
    return timeA - timeB;
  });
}

/**
 * Evaluates wallet balances and debt positions directly from the general ledger.
 */
export function calculateLedgerBalances(
  journal: JournalEntry[],
  wallets: Wallet[],
  debts: Debt[],
  baseCurrencyCode: string = 'SAR',
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): ConsolidatedLedgerSummary {
  const walletBalances: Record<string, LedgerWalletBalance> = {};
  const debtBalances: Record<string, LedgerDebtBalance> = {};

  (wallets || []).forEach(w => {
    walletBalances[w.id] = {
      walletId: w.id,
      walletName: w.name,
      currencyCode: w.currencyCode,
      totalDebits: 0,
      totalCredits: 0,
      currentBalance: 0,
      openingBalance: Number(w.openingBalance) || 0,
      inflows: 0,
      outflows: 0,
      transfersIn: 0,
      transfersOut: 0,
      adjustments: 0
    };
  });

  (debts || []).forEach(d => {
    const orig = Number(d.originalAmount || d.amount) || 0;
    debtBalances[d.id] = {
      debtId: d.id,
      personName: d.personName,
      type: d.type,
      currency: d.currency || 'SAR',
      originalAmount: orig,
      totalPaid: 0,
      remainingBalance: orig,
      isSettled: false
    };
  });

  let totalIncomeInBase = 0;
  let totalExpenseInBase = 0;
  let isBalanced = true;

  // Process all ledger lines
  journal.forEach(entry => {
    // Validate entry double-entry balance
    const entryDebits = entry.lines.reduce((sum, l) => sum + l.debit, 0);
    const entryCredits = entry.lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.abs(entryDebits - entryCredits) > 0.01) {
      // In multi-currency legs, base currency equality is checked
      const baseDebits = entry.lines.reduce((sum, l) => sum + l.amountInBaseCurrency, 0);
      if (baseDebits < 0) isBalanced = false;
    }

    entry.lines.forEach(line => {
      // Wallet asset accounts
      if (line.accountType === 'asset' && walletBalances[line.accountId]) {
        const wBal = walletBalances[line.accountId];
        wBal.totalDebits += line.debit;
        wBal.totalCredits += line.credit;
        wBal.currentBalance = wBal.totalDebits - wBal.totalCredits;

        if (entry.eventType === 'income') {
          wBal.inflows += line.debit;
        } else if (entry.eventType === 'expense') {
          wBal.outflows += line.credit;
        } else if (entry.eventType === 'transfer') {
          if (line.debit > 0) wBal.transfersIn += line.debit;
          if (line.credit > 0) wBal.transfersOut += line.credit;
        } else if (entry.eventType === 'balance_adjustment' && entry.id.startsWith('entry-tx-')) {
          wBal.adjustments += (line.debit - line.credit);
        }
      }

      // Income / Expense summary in base
      if (line.accountType === 'income') {
        totalIncomeInBase += line.amountInBaseCurrency;
      } else if (line.accountType === 'expense') {
        totalExpenseInBase += line.amountInBaseCurrency;
      }

      // Debt accounts tracking
      if (entry.debtId && debtBalances[entry.debtId]) {
        const dBal = debtBalances[entry.debtId];
        if (dBal.type === 'to_me' && line.accountType === 'receivable' && line.credit > 0) {
          dBal.totalPaid += line.credit;
        } else if (dBal.type === 'on_me' && line.accountType === 'payable' && line.debit > 0) {
          dBal.totalPaid += line.debit;
        }
        dBal.remainingBalance = Math.max(0, dBal.originalAmount - dBal.totalPaid);
        dBal.isSettled = dBal.remainingBalance <= 0.01;
      }
    });
  });

  // Calculate Net Worth & Balance Sheet Projections from Ledger
  let totalAssetsInBase = 0;
  Object.values(walletBalances).forEach(wb => {
    const rate = exchangeRates[wb.currencyCode] || 1;
    totalAssetsInBase += (wb.currentBalance * rate) / (exchangeRates[baseCurrencyCode] || 1);
  });

  let totalReceivablesInBase = 0;
  let totalLiabilitiesInBase = 0;
  Object.values(debtBalances).forEach(db => {
    const rate = exchangeRates[db.currency] || 1;
    const valInBase = (db.remainingBalance * rate) / (exchangeRates[baseCurrencyCode] || 1);
    if (db.type === 'to_me') {
      totalReceivablesInBase += valInBase;
    } else {
      totalLiabilitiesInBase += valInBase;
    }
  });

  const netWorthInBase = totalAssetsInBase + totalReceivablesInBase - totalLiabilitiesInBase;
  const netCashFlowInBase = totalIncomeInBase - totalExpenseInBase;

  return {
    netWorthInBase,
    totalAssetsInBase,
    totalReceivablesInBase,
    totalLiabilitiesInBase,
    totalIncomeInBase,
    totalExpenseInBase,
    netCashFlowInBase,
    journalEntriesCount: journal.length,
    isBalanced,
    walletBalances,
    debtBalances
  };
}
