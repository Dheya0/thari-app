import { CurrencyMetadata } from './currencyMetadata';
import { TransactionType } from '../../types';

export type ReportType = 'summary' | 'detailed';
export type ReportLanguage = 'ar' | 'en';

export interface ReportQueryParams {
  type: ReportType;
  reportType?: ReportType;
  walletId?: string | null;
  currencyCode?: string | null; // null or undefined means 'ALL_CURRENCIES'
  dateRangePreset?: string;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null;   // YYYY-MM-DD
  language?: ReportLanguage;
  targetCurrencyCode?: string; // Default base valuation currency (e.g. 'SAR')
}

export interface ReportAccountInfo {
  name: string;
  email?: string;
  accountTypeAr: string;
  accountTypeEn: string;
  totalWallets: number;
}

export interface ReportScopeInfo {
  walletId?: string | null;
  walletNameAr: string;
  walletNameEn: string;
  currencyFilter?: string | null; // null if all currencies
  isAllCurrencies: boolean;
  currencyMetadata?: CurrencyMetadata;
  startDate?: string | null;
  endDate?: string | null;
  periodLabelAr: string;
  periodLabelEn: string;
  baseCurrency: CurrencyMetadata;
}

export interface ReportKPIs {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRatePercent: number;
  expenseRatioPercent: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  totalTransactions: number;
  avgIncomePerTx: number;
  avgExpensePerTx: number;
  openingBalance: number;
  closingBalance: number;
  highestExpenseCategory?: {
    name: string;
    amount: number;
    percentage: number;
  };
  highestIncomeSource?: {
    name: string;
    amount: number;
    percentage: number;
  };
}

export interface ReportCurrencyBreakdown {
  code: string;
  metadata: CurrencyMetadata;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  convertedNetToBase: number;
  exchangeRateToBase: number;
}

export interface ReportCategorySummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  totalAmount: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export interface ReportWalletSummary {
  id: string;
  name: string;
  currencyCode: string;
  color: string;
  rawBalance: number;
  convertedBalance: number;
  percentageOfTotalWealth: number;
}

export interface ReportLedgerEntry {
  id: string;
  index: number;
  date: string;
  formattedDateAr: string;
  formattedDateEn: string;
  time?: string;
  type: TransactionType;
  typeLabelAr: string;
  typeLabelEn: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  walletId: string;
  walletName: string;
  walletCurrencyCode?: string;
  walletDeductionAmount?: number;
  isCrossCurrencyWithWallet?: boolean;
  exchangeRateToWallet?: number;
  note: string;
  foreignAmount?: number;
  foreignCurrency?: string;
  exchangeRate?: number;
  conversionNote?: string;
  originalAmount: number;
  currencyCode: string;
  currencySymbol: string;
  convertedAmount: number;
  baseCurrencyCode: string;
  baseCurrencySymbol: string;
  runningBalance?: number;
}

export interface ReportMetadataInfo {
  reportId: string;
  reportType?: ReportType;
  fingerprint: string;
  generatedAtISO: string;
  generatedAtFormattedAr: string;
  generatedAtFormattedEn: string;
  generatedTimeFormattedAr: string;
  generatedTimeFormattedEn: string;
  qrPayload: string;
  qrDataUrl?: string;
  appNameAr: string;
  appNameEn: string;
  language: ReportLanguage;
  version: string;
}

export interface ReportModel {
  metadata: ReportMetadataInfo;
  reportType: ReportType;
  account: ReportAccountInfo;
  scope: ReportScopeInfo;
  kpis: ReportKPIs;
  currencyBreakdown: ReportCurrencyBreakdown[];
  walletSummaries: ReportWalletSummary[];
  expenseCategories: ReportCategorySummary[];
  incomeCategories: ReportCategorySummary[];
  transactions: ReportLedgerEntry[];
  ledger?: ReportLedgerEntry[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}
