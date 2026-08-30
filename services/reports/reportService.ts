import { Budget, Category, Debt, Goal, Transaction, Wallet } from '../../types';
import { generateQRCodeDataUrl } from './reportFingerprint';
import { queryReportTransactions } from './reportQueryService';
import { buildReportModel } from './reportAggregationService';
import { ReportModel, ReportQueryParams } from './reportTypes';

export interface GenerateReportOptions {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  budgets?: Budget[];
  debts?: Debt[];
  goals?: Goal[];
  userName?: string;
  userEmail?: string;
  baseCurrencyCode?: string;
  exchangeRates?: Record<string, number>;
  params: ReportQueryParams;
}

/**
 * Main service method to produce a complete, validated ReportModel
 */
export async function generateFinancialReport(options: GenerateReportOptions): Promise<ReportModel> {
  const {
    transactions,
    categories,
    wallets,
    budgets,
    debts,
    goals,
    userName,
    userEmail,
    baseCurrencyCode,
    exchangeRates,
    params,
  } = options;

  // 1. Query & Filter
  const queryResult = queryReportTransactions(transactions, params);

  // 2. Build Aggregation Model
  const model = buildReportModel({
    transactions,
    categories,
    wallets,
    budgets,
    debts,
    goals,
    userName,
    userEmail,
    baseCurrencyCode,
    exchangeRates,
    params,
    queryResult,
  });

  // 3. Generate QR Code image async
  try {
    const qrDataUrl = await generateQRCodeDataUrl(model.metadata.qrPayload);
    model.metadata.qrDataUrl = qrDataUrl;
  } catch (e) {
    console.error('Failed to generate QR code in report service:', e);
  }

  return model;
}

/**
 * Synchronous variant when QR Code is rendered client-side dynamically
 */
export function generateFinancialReportSync(options: GenerateReportOptions): ReportModel {
  const {
    transactions,
    categories,
    wallets,
    budgets,
    debts,
    goals,
    userName,
    userEmail,
    baseCurrencyCode,
    exchangeRates,
    params,
  } = options;

  const queryResult = queryReportTransactions(transactions, params);

  return buildReportModel({
    transactions,
    categories,
    wallets,
    budgets,
    debts,
    goals,
    userName,
    userEmail,
    baseCurrencyCode,
    exchangeRates,
    params,
    queryResult,
  });
}
