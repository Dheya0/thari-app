import { Transaction, Category, Wallet, Currency } from '../types';
import { generateFinancialReportSync } from '../services/reports/reportService';
import { 
  buildModernExcelWorkbook, 
  buildExcelReportHTML, 
  exportAndShareXlsxFile, 
  exportAndShareNativeFile, 
  printOrShareFinancialReport 
} from '../services/reports/reportExportService';
import { formatLocalDateOnly } from './formatters';
import * as XLSX from 'xlsx';

export const generateAndSharePDF = async (
  transactionsOrElementId: any,
  fileNameOrCategories?: any,
  wallets?: Wallet[],
  currency?: Currency,
  exchangeRates?: Record<string, number>
) => {
  if (Array.isArray(transactionsOrElementId)) {
    const model = generateFinancialReportSync({
      transactions: transactionsOrElementId,
      categories: Array.isArray(fileNameOrCategories) ? fileNameOrCategories : [],
      wallets: wallets || [],
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
    await printOrShareFinancialReport(model, 'print');
  } else {
    window.print();
  }
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
  fileName?: string,
  model?: any
) => {
  const actualName = fileName ? fileName.replace(/\.(csv|xls)$/, '.xlsx') : `THARI_Report_${formatLocalDateOnly(new Date())}.xlsx`;
  if (model) {
    const wb = buildModernExcelWorkbook(model);
    await exportAndShareXlsxFile(wb, actualName, 'تقرير ثري المالي (Excel XLSX)');
    return;
  }
  // If only string content was provided (CSV or HTML table), parse into modern XLSX
  try {
    let wb: XLSX.WorkBook;
    if (content.includes('<html') || content.includes('<table')) {
      wb = XLSX.read(content, { type: 'string' });
    } else {
      const rows = content.split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'البيانات المالية');
    }
    await exportAndShareXlsxFile(wb, actualName, 'تقرير ثري المالي (Excel XLSX)');
  } catch (err) {
    console.error('Error parsing content for modern XLSX:', err);
    // Fallback directly to CSV with utf-8 BOM
    const csvName = fileName ? fileName.replace(/\.xls$/, '.csv') : `THARI_Report_${formatLocalDateOnly(new Date())}.csv`;
    await exportAndShareNativeFile('\uFEFF' + content, csvName, 'text/csv;charset=utf-8;', 'تقرير ثري المالي (CSV)');
  }
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

  const wb = buildModernExcelWorkbook(model);
  const fileName = `Thari_Transactions_${formatLocalDateOnly(new Date())}.xlsx`;
  await exportAndShareXlsxFile(wb, fileName, 'سجل معاملات ثـري (Excel XLSX)');
};
