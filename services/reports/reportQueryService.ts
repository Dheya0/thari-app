import { Transaction, Wallet } from '../../types';
import { normalizeCurrencyCode } from './currencyMetadata';
import { ReportQueryParams } from './reportTypes';

export interface QueryResult {
  activeTransactions: Transaction[];
  priorTransactions: Transaction[];
  isSingleCurrency: boolean;
  filteredCurrencyCode: string | null;
  filteredWalletId: string | null;
  filteredWalletIds: string[] | null;
  isAllWallets: boolean;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Filters and normalizes transactions based on query params supporting arbitrary multi-wallet selection
 */
export function queryReportTransactions(
  transactions: Transaction[],
  params: ReportQueryParams,
  allWallets: Wallet[] = []
): QueryResult {
  const { walletId, walletIds, currencyCode, startDate, endDate } = params;

  // Resolve target wallet IDs
  let resolvedWalletIds: string[] | null = null;
  let isAllWallets = true;

  if (walletIds && Array.isArray(walletIds) && walletIds.length > 0) {
    if (walletIds.includes('ALL') || (allWallets.length > 0 && walletIds.length === allWallets.length)) {
      resolvedWalletIds = null;
      isAllWallets = true;
    } else {
      resolvedWalletIds = walletIds.filter(id => id && id !== 'ALL');
      isAllWallets = resolvedWalletIds.length === 0;
      if (resolvedWalletIds.length === 0) resolvedWalletIds = null;
    }
  } else if (walletId && walletId !== 'ALL') {
    resolvedWalletIds = [walletId];
    isAllWallets = false;
  }

  const normalizedCurrencyFilter = currencyCode ? normalizeCurrencyCode(currencyCode) : null;
  const isSingleCurrency = !!normalizedCurrencyFilter;

  // 1. Filter by Wallets & Currency first
  let scopedTransactions = transactions.map(t => ({
    ...t,
    currency: normalizeCurrencyCode(t.currency),
  }));

  if (resolvedWalletIds && resolvedWalletIds.length > 0) {
    const idSet = new Set(resolvedWalletIds);
    scopedTransactions = scopedTransactions.filter(
      t => (t.walletId && idSet.has(t.walletId)) || (t.destinationWalletId && idSet.has(t.destinationWalletId))
    );
  }

  if (normalizedCurrencyFilter) {
    scopedTransactions = scopedTransactions.filter(t => t.currency === normalizedCurrencyFilter);
  }

  // 2. Separate into period transactions and prior transactions (for Opening Balance calculation)
  const activeTransactions: Transaction[] = [];
  const priorTransactions: Transaction[] = [];

  const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

  scopedTransactions.forEach(t => {
    const txDate = new Date(t.date).getTime();

    if (startTimestamp && txDate < startTimestamp) {
      priorTransactions.push(t);
    } else if (endTimestamp && txDate > endTimestamp) {
      // Future or out of bounds transaction - ignored for current report
    } else {
      activeTransactions.push(t);
    }
  });

  // Sort active transactions chronologically (Newest first for ledger display)
  activeTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    activeTransactions,
    priorTransactions,
    isSingleCurrency,
    filteredCurrencyCode: normalizedCurrencyFilter,
    filteredWalletId: resolvedWalletIds && resolvedWalletIds.length === 1 ? resolvedWalletIds[0] : (walletId || null),
    filteredWalletIds: resolvedWalletIds,
    isAllWallets,
    startDate: startDate || null,
    endDate: endDate || null,
  };
}
