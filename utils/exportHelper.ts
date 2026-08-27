import { Transaction, Category, Wallet, Currency } from '../types';
import { generateFinancialReportSync } from '../services/reports/reportService';
import { buildExcelReportCSV, exportAndShareReportCSV } from '../services/reports/reportExportService';

export const generateAndSharePDF = async (
  elementId: string,
  fileName: string
) => {
  window.print();
};

export const buildExecutiveCSVContent = ({
  transactions,
  categories,
  wallets,
  userName = 'مستخدم ثري',
  currency,
  exchangeRates = {},
  type = 'detailed',
  filterWalletId = null,
  filterCurrency = null,
  startDate = null,
  endDate = null,
}: {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  userName?: string;
  currency: Currency;
  exchangeRates?: Record<string, number>;
  type?: 'summary' | 'detailed';
  filterWalletId?: string | null;
  filterCurrency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): string => {
  const model = generateFinancialReportSync({
    transactions,
    categories,
    wallets,
    userName,
    baseCurrencyCode: currency?.code || 'SAR',
    exchangeRates,
    params: {
      type,
      walletId: filterWalletId,
      currencyCode: filterCurrency,
      startDate,
      endDate,
      targetCurrencyCode: currency?.code || 'SAR',
    },
  });

  return buildExcelReportCSV(model);
};

export const exportAndShareExecutiveCSV = async (
  csvContent: string,
  fileName?: string
) => {
  await exportAndShareReportCSV(csvContent, fileName);
};

export const generateAndShareCSV = async (
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  currency?: Currency,
  exchangeRates?: Record<string, number>
) => {
  const model = generateFinancialReportSync({
    transactions,
    categories,
    wallets,
    userName: 'مستخدم ثري',
    baseCurrencyCode: currency?.code || 'SAR',
    exchangeRates: exchangeRates || {},
    params: {
      type: 'detailed',
      walletId: null,
      currencyCode: null,
      targetCurrencyCode: currency?.code || 'SAR',
    },
  });

  const csvContent = buildExcelReportCSV(model);
  const fileName = `Thari_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
  await exportAndShareReportCSV(csvContent, fileName);
};
