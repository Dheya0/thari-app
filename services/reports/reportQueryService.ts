import { Transaction } from '../../types';
import { normalizeCurrencyCode } from './currencyMetadata';
import { ReportQueryParams } from './reportTypes';

export interface QueryResult {
  activeTransactions: Transaction[];
  priorTransactions: Transaction[];
  isSingleCurrency: boolean;
  filteredCurrencyCode: string | null;
  filteredWalletId: string | null;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Filters and normalizes transactions based on query params
 */
export function queryReportTransactions(
  transactions: Transaction[],
  params: ReportQueryParams
): QueryResult {
  const { walletId, currencyCode, startDate, endDate } = params;

  const normalizedCurrencyFilter = currencyCode ? normalizeCurrencyCode(currencyCode) : null;
  const isSingleCurrency = !!normalizedCurrencyFilter;

  // 1. Filter by Wallet & Currency first
  let scopedTransactions = transactions.map(t => ({
    ...t,
    currency: normalizeCurrencyCode(t.currency),
  }));

  if (walletId) {
    scopedTransactions = scopedTransactions.filter(t => t.walletId === walletId);
  }

  if (normalizedCurrencyFilter) {
    scopedTransactions = scopedTransactions.filter(t => t.currency === normalizedCurrencyFilter);
  }

  // 2. Separate into period transactions and prior transactions (for Opening Balance calculation)
  let activeTransactions: Transaction[] = [];
  let priorTransactions: Transaction[] = [];

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
    filteredWalletId: walletId || null,
    startDate: startDate || null,
    endDate: endDate || null,
  };
}
