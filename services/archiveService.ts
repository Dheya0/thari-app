/**
 * ============================================================================
 * THARI SMART FISCAL ARCHIVING & 10-YEAR DATA ENGINE
 * ============================================================================
 * Moves closed/previous fiscal years into high-capacity Cold Storage (IndexedDB),
 * while preserving 100% mathematical integrity of current wallet balances via
 * exact accumulated Opening Balance Offsets (أرصدة افتتاحية مدورة).
 *
 * Result:
 * - App remains as fast and lightweight as day 1 even after 10 years of heavy use.
 * - RAM footprint drops dramatically by unloading historical transactions from React state.
 * - Historical records remain fully accessible, searchable, and exportable on demand.
 * ============================================================================
 */

import { AppState, Transaction, Wallet, ArchivedYearSummary } from '../types';
import { idbSet, idbGet, idbDelete, STORES } from './storage/ultraStorageEngine';

export interface ArchivedYearPayload {
  year: number;
  transactions: Transaction[];
  walletImpactMap: Record<string, number>;
  totalIncome: number;
  totalExpense: number;
  archivedAt: string;
}

/**
 * Returns a list of years that have completed and are eligible for archiving.
 * Completed years are any years strictly prior to the current active year.
 */
export function getEligibleArchiveYears(transactions: Transaction[]): number[] {
  const currentYear = new Date().getFullYear();
  const yearsSet = new Set<number>();

  for (const tx of transactions) {
    if (!tx.date || tx.isDeleted) continue;
    try {
      const year = new Date(tx.date).getFullYear();
      if (!isNaN(year) && year < currentYear) {
        yearsSet.add(year);
      }
    } catch {}
  }

  return Array.from(yearsSet).sort((a, b) => b - a);
}

/**
 * Archives all transactions for a given completed fiscal year.
 * Calculates exact per-wallet net movements and rolls them into wallet opening balances.
 */
export async function archiveFiscalYear(
  currentState: AppState,
  yearToArchive: number
): Promise<{ updatedState: AppState; summary: ArchivedYearSummary }> {
  const transactionsToArchive: Transaction[] = [];
  const remainingTransactions: Transaction[] = [];

  for (const tx of currentState.transactions) {
    if (!tx.date) {
      remainingTransactions.push(tx);
      continue;
    }
    const txYear = new Date(tx.date).getFullYear();
    if (txYear === yearToArchive) {
      transactionsToArchive.push(tx);
    } else {
      remainingTransactions.push(tx);
    }
  }

  if (transactionsToArchive.length === 0) {
    throw new Error(`لا توجد أي معاملات لسنة ${yearToArchive} للأرشفة.`);
  }

  // Calculate exact wallet net cashflow impact
  const walletImpactMap: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactionsToArchive) {
    if (tx.isDeleted) continue;

    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amount;
      if (tx.walletId) {
        walletImpactMap[tx.walletId] = (walletImpactMap[tx.walletId] || 0) + amount;
      }
    } else if (tx.type === 'expense') {
      totalExpense += amount;
      if (tx.walletId) {
        walletImpactMap[tx.walletId] = (walletImpactMap[tx.walletId] || 0) - amount;
      }
    } else if (tx.type === 'transfer') {
      if (tx.walletId) {
        walletImpactMap[tx.walletId] = (walletImpactMap[tx.walletId] || 0) - amount;
      }
      const destId = tx.destinationWalletId;
      if (destId) {
        const destAmount = Number(tx.destinationAmount) || amount;
        walletImpactMap[destId] = (walletImpactMap[destId] || 0) + destAmount;
      }
    }
  }

  // Prepare archive payload
  const archiveKey = `archive_year_${yearToArchive}`;
  const archivePayload: ArchivedYearPayload = {
    year: yearToArchive,
    transactions: transactionsToArchive,
    walletImpactMap,
    totalIncome,
    totalExpense,
    archivedAt: new Date().toISOString(),
  };

  // 1. Write to high-capacity cold storage (IndexedDB)
  await idbSet(STORES.ARCHIVE, archiveKey, archivePayload);

  // 2. Roll wallet opening balances forward so current balances remain 100% accurate
  const updatedWallets: Wallet[] = currentState.wallets.map(w => {
    const impact = walletImpactMap[w.id] || 0;
    const currentOpening = Number(w.openingBalance) || 0;
    return {
      ...w,
      openingBalance: currentOpening + impact,
    };
  });

  const summary: ArchivedYearSummary = {
    year: yearToArchive,
    transactionCount: transactionsToArchive.length,
    totalIncome,
    totalExpense,
    walletBalancesSnapshot: walletImpactMap,
    archivedAt: archivePayload.archivedAt,
  };

  const existingSummaries = currentState.archivedYears ? [...currentState.archivedYears] : [];
  const filteredSummaries = existingSummaries.filter(s => s.year !== yearToArchive);
  filteredSummaries.push(summary);
  filteredSummaries.sort((a, b) => b.year - a.year);

  const newTotalArchivedCount = (currentState.archivedTransactionsCount || 0) + transactionsToArchive.length;

  const updatedState: AppState = {
    ...currentState,
    transactions: remainingTransactions,
    wallets: updatedWallets,
    archivedYears: filteredSummaries,
    archivedTransactionsCount: newTotalArchivedCount,
  };

  return { updatedState, summary };
}

/**
 * Retrieves archived transactions for a specific year from cold storage.
 */
export async function getArchivedYearTransactions(year: number): Promise<Transaction[]> {
  const archiveKey = `archive_year_${year}`;
  const payload = await idbGet<ArchivedYearPayload>(STORES.ARCHIVE, archiveKey);
  return payload && payload.transactions ? payload.transactions : [];
}

/**
 * Searches across archived transactions.
 */
export async function searchArchivedTransactions(year: number, query: string): Promise<Transaction[]> {
  const txs = await getArchivedYearTransactions(year);
  if (!query || !query.trim()) return txs;

  const q = query.trim().toLowerCase();
  return txs.filter(tx => {
    return (
      (tx.note || '').toLowerCase().includes(q) ||
      (tx.date || '').includes(q) ||
      (tx.amount || '').toString().includes(q)
    );
  });
}

/**
 * Restores (unarchives) an archived fiscal year back into the active ledger.
 */
export async function unarchiveFiscalYear(
  currentState: AppState,
  yearToRestore: number
): Promise<AppState> {
  const archiveKey = `archive_year_${yearToRestore}`;
  const payload = await idbGet<ArchivedYearPayload>(STORES.ARCHIVE, archiveKey);

  if (!payload || !payload.transactions) {
    throw new Error(`لم يتم العثور على أرشيف سنة ${yearToRestore}`);
  }

  // Roll back the opening balances
  const walletImpactMap = payload.walletImpactMap || {};
  const restoredWallets: Wallet[] = currentState.wallets.map(w => {
    const impact = walletImpactMap[w.id] || 0;
    const currentOpening = Number(w.openingBalance) || 0;
    return {
      ...w,
      openingBalance: currentOpening - impact,
    };
  });

  // Re-merge transactions
  const mergedTransactions = [...currentState.transactions, ...payload.transactions];

  // Remove archive record
  await idbDelete(STORES.ARCHIVE, archiveKey);

  const updatedSummaries = (currentState.archivedYears || []).filter(s => s.year !== yearToRestore);
  const updatedArchivedCount = Math.max(0, (currentState.archivedTransactionsCount || 0) - payload.transactions.length);

  return {
    ...currentState,
    transactions: mergedTransactions,
    wallets: restoredWallets,
    archivedYears: updatedSummaries,
    archivedTransactionsCount: updatedArchivedCount,
  };
}
