import { Transaction, Category, Wallet, Currency } from '../types';
import { generateFinancialReportSync } from '../services/reports/reportService';
import { buildExcelReportHTML, exportAndShareNativeFile } from '../services/reports/reportExportService';

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

  return buildExcelReportHTML(model);
};

export const exportAndShareExecutiveCSV = async (
  content: string,
  fileName?: string
) => {
  const actualName = fileName ? fileName.replace(/\.csv$/, '.xls') : `THARI_Report_${new Date().toISOString().split('T')[0]}.xls`;
  await exportAndShareNativeFile(content, actualName, 'application/vnd.ms-excel;charset=utf-8;', 'تقرير ثري المالي (Excel)');
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

  const htmlContent = buildExcelReportHTML(model);
  const fileName = `Thari_Transactions_${new Date().toISOString().split('T')[0]}.xls`;
  await exportAndShareNativeFile(htmlContent, fileName, 'application/vnd.ms-excel;charset=utf-8;', 'تقرير ثري المالي (Excel)');
};
