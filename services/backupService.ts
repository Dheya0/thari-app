/**
 * THARI Financial Application — Backup & Restore Service
 * Creates structured, verified backup packages with integrity checksums,
 * schema versioning, and validation before restoring.
 */

import { AppState, Transaction, Wallet, Debt, Budget, Category } from '../types';

export const CURRENT_BACKUP_VERSION = 4;

export interface BackupPackage {
  format: 'THARI_BACKUP';
  version: number;
  createdAt: string;
  checksum: string;
  summary: {
    transactionsCount: number;
    walletsCount: number;
    debtsCount: number;
    budgetsCount: number;
    categoriesCount: number;
    userName: string;
    currencyCode: string;
  };
  payload: Partial<AppState>;
}

export interface RestorePreview {
  isValid: boolean;
  version: number;
  createdAt: string;
  errorMessage?: string;
  summary: {
    transactionsCount: number;
    walletsCount: number;
    debtsCount: number;
    budgetsCount: number;
    categoriesCount: number;
    userName: string;
    currencyCode: string;
  };
  payload: Partial<AppState>;
}

/**
 * Generate a simple hash checksum for backup verification
 */
export function calculateChecksum(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
    hash |= 0;
  }
  return 'chk_' + Math.abs(hash).toString(16);
}

/**
 * Create a structured backup package from current state
 */
export function createBackupPackage(state: AppState): BackupPackage {
  // Strip sensitive runtime state like lock status or plain PIN
  const cleanState: Partial<AppState> = {
    accounts: state.accounts,
    activeAccountId: state.activeAccountId,
    userName: state.userName,
    userEmail: state.userEmail,
    transactions: state.transactions,
    trashTransactions: state.trashTransactions,
    recurringRules: state.recurringRules,
    subscriptions: state.subscriptions,
    categories: state.categories,
    wallets: state.wallets,
    goals: state.goals,
    debts: state.debts,
    budgets: state.budgets,
    currency: state.currency,
    currencies: state.currencies,
    exchangeRates: state.exchangeRates,
    isDarkMode: state.isDarkMode,
    isBiometricEnabled: state.isBiometricEnabled,
    requireBiometricOnOpen: state.requireBiometricOnOpen,
    isTravelMode: state.isTravelMode,
    showSeparateCurrencies: state.showSeparateCurrencies,
    autoLockTime: state.autoLockTime,
    autoBackupFrequency: state.autoBackupFrequency,
  };

  const payloadString = JSON.stringify(cleanState);
  const checksum = calculateChecksum(payloadString);

  return {
    format: 'THARI_BACKUP',
    version: CURRENT_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    checksum,
    summary: {
      transactionsCount: (state.transactions || []).length,
      walletsCount: (state.wallets || []).length,
      debtsCount: (state.debts || []).length,
      budgetsCount: (state.budgets || []).length,
      categoriesCount: (state.categories || []).length,
      userName: state.userName || 'مستخدم ثري',
      currencyCode: state.currency?.code || 'SAR',
    },
    payload: cleanState,
  };
}

/**
 * Parse and validate a backup string before restoring
 */
export function validateAndInspectBackup(rawJson: string): RestorePreview {
  try {
    const parsed = JSON.parse(rawJson);

    // 1. Check if it's the new standard THARI_BACKUP format
    if (parsed && parsed.format === 'THARI_BACKUP' && parsed.payload) {
      const payloadString = JSON.stringify(parsed.payload);
      const computedChecksum = calculateChecksum(payloadString);

      if (parsed.checksum && parsed.checksum !== computedChecksum) {
        return {
          isValid: false,
          version: parsed.version || 0,
          createdAt: parsed.createdAt || '',
          errorMessage: 'فشل التحقق من صحة الملف: محتوى النسخة الاحتياطية قد يكون تالفاً أو معدلاً.',
          summary: parsed.summary || { transactionsCount: 0, walletsCount: 0, debtsCount: 0, budgetsCount: 0, categoriesCount: 0, userName: '', currencyCode: '' },
          payload: parsed.payload,
        };
      }

      return {
        isValid: true,
        version: parsed.version || CURRENT_BACKUP_VERSION,
        createdAt: parsed.createdAt || new Date().toISOString(),
        summary: parsed.summary || {
          transactionsCount: (parsed.payload.transactions || []).length,
          walletsCount: (parsed.payload.wallets || []).length,
          debtsCount: (parsed.payload.debts || []).length,
          budgetsCount: (parsed.payload.budgets || []).length,
          categoriesCount: (parsed.payload.categories || []).length,
          userName: parsed.payload.userName || '',
          currencyCode: parsed.payload.currency?.code || 'SAR',
        },
        payload: parsed.payload,
      };
    }

    // 2. Legacy backup format support (Direct AppState dump)
    if (parsed && typeof parsed === 'object') {
      const txs = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      const wallets = Array.isArray(parsed.wallets) ? parsed.wallets : [];
      const debts = Array.isArray(parsed.debts) ? parsed.debts : [];
      const budgets = Array.isArray(parsed.budgets) ? parsed.budgets : [];
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];

      return {
        isValid: true,
        version: 1, // Legacy
        createdAt: parsed.lastBackupDate || new Date().toISOString(),
        summary: {
          transactionsCount: txs.length,
          walletsCount: wallets.length,
          debtsCount: debts.length,
          budgetsCount: budgets.length,
          categoriesCount: categories.length,
          userName: parsed.userName || 'مستخدم ثري',
          currencyCode: parsed.currency?.code || 'SAR',
        },
        payload: parsed,
      };
    }

    return {
      isValid: false,
      version: 0,
      createdAt: '',
      errorMessage: 'صيغة ملف النسخة الاحتياطية غير معروفة أو تالفة.',
      summary: { transactionsCount: 0, walletsCount: 0, debtsCount: 0, budgetsCount: 0, categoriesCount: 0, userName: '', currencyCode: '' },
      payload: {},
    };
  } catch (e: any) {
    return {
      isValid: false,
      version: 0,
      createdAt: '',
      errorMessage: `تعذر قراءة ملف النسخة: ${e.message || 'خطأ في معالجة JSON'}`,
      summary: { transactionsCount: 0, walletsCount: 0, debtsCount: 0, budgetsCount: 0, categoriesCount: 0, userName: '', currencyCode: '' },
      payload: {},
    };
  }
}

/**
 * Merge restored payload into current state
 */
export function mergeRestoredState(currentState: AppState, restoredPayload: Partial<AppState>): AppState {
  const existingTxIds = new Set(currentState.transactions.map(t => t.id));
  const newTxs = (restoredPayload.transactions || []).filter(t => !existingTxIds.has(t.id));

  const existingWalletIds = new Set(currentState.wallets.map(w => w.id));
  const newWallets = (restoredPayload.wallets || []).filter(w => !existingWalletIds.has(w.id));

  const existingDebtIds = new Set(currentState.debts.map(d => d.id));
  const newDebts = (restoredPayload.debts || []).filter(d => !existingDebtIds.has(d.id));

  return {
    ...currentState,
    transactions: [...newTxs, ...currentState.transactions],
    wallets: [...currentState.wallets, ...newWallets],
    debts: [...currentState.debts, ...newDebts],
    budgets: restoredPayload.budgets && restoredPayload.budgets.length > 0 ? restoredPayload.budgets : currentState.budgets,
    categories: restoredPayload.categories && restoredPayload.categories.length > 0 ? restoredPayload.categories : currentState.categories,
    lastBackupDate: new Date().toISOString(),
  };
}
