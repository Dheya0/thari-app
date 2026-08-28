/**
 * THARI Financial Application — Comprehensive Data Integrity & Diagnostics Service
 * Runs deep multi-point integrity checks on local ledger state, detects inconsistencies,
 * validates accounting invariants, and provides one-click auto-repair tools.
 */

import { AppState, Transaction, Wallet, Category, RecurringRule } from '../types';
import { calculateWalletBalances, runBalanceEngineAudit, diagnoseWalletBalanceDiscrepancies, BalanceReconciliationDiagnosticResult } from './balanceEngine';

export interface IntegrityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'wallet' | 'transaction' | 'transfer' | 'category' | 'recurring' | 'currency' | 'backup';
  title: string;
  description: string;
  affectedIds: string[];
  canAutoFix: boolean;
}

export interface RepairAuditLogEntry {
  id: string;
  timestamp: string;
  issueId: string;
  category: string;
  entityType: 'transaction' | 'wallet' | 'category' | 'recurring';
  entityId: string;
  oldValue: any;
  newValue: any;
  reason: string;
  repairId: string;
}

export interface DiagnosticsReport {
  timestamp: string;
  status: 'HEALTHY' | 'WARNINGS' | 'CRITICAL';
  totalTransactions: number;
  activeTransactions: number;
  trashCount: number;
  walletsCount: number;
  categoriesCount: number;
  recurringRulesCount: number;
  engineAuditPassed: boolean;
  engineAuditResults: any[];
  balanceReconciliation?: BalanceReconciliationDiagnosticResult;
  issues: IntegrityIssue[];
  auditLogs?: RepairAuditLogEntry[];
}

export function runFullSystemDiagnostics(state: AppState): DiagnosticsReport {
  const issues: IntegrityIssue[] = [];
  const transactions = state.transactions || [];
  const trash = state.trashTransactions || [];
  const wallets = state.wallets || [];
  const categories = state.categories || [];
  const recurringRules = state.recurringRules || [];
  const currencies = state.currencies || [];
  const exchangeRates = state.exchangeRates || {};

  const walletIds = new Set(wallets.map(w => w.id));
  const categoryIds = new Set(categories.map(c => c.id));
  const currencyCodes = new Set(currencies.map(c => c.code));

  // 1. Duplicate Transaction UUID Check
  const txIdMap = new Map<string, number>();
  transactions.forEach(t => {
    txIdMap.set(t.id, (txIdMap.get(t.id) || 0) + 1);
  });
  const duplicateTxIds = Array.from(txIdMap.entries())
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);

  if (duplicateTxIds.length > 0) {
    issues.push({
      id: 'dup-tx-ids',
      type: 'error',
      category: 'transaction',
      title: 'تكرار في معرفات العمليات (Duplicate UUIDs)',
      description: `تم العثور على ${duplicateTxIds.length} عملية لها نفس المعرف الفريد.`,
      affectedIds: duplicateTxIds,
      canAutoFix: true,
    });
  }

  // 2. Broken Wallet References
  const orphanWalletTxIds: string[] = [];
  transactions.forEach(t => {
    if (!walletIds.has(t.walletId)) {
      orphanWalletTxIds.push(t.id);
    }
  });

  if (orphanWalletTxIds.length > 0) {
    issues.push({
      id: 'orphan-wallet-tx',
      type: 'error',
      category: 'wallet',
      title: 'عمليات تشير لمحفظة محذوفة أو مفقودة',
      description: `يوجد ${orphanWalletTxIds.length} عملية مسجلة بمحفظة غير موجودة في النظام.`,
      affectedIds: orphanWalletTxIds,
      canAutoFix: true,
    });
  }

  // 3. Broken Transfer Links
  const brokenTransferIds: string[] = [];
  transactions.forEach(t => {
    if (t.type === 'transfer') {
      if (!t.destinationWalletId || !walletIds.has(t.destinationWalletId) || t.destinationWalletId === t.walletId) {
        brokenTransferIds.push(t.id);
      }
    }
  });

  if (brokenTransferIds.length > 0) {
    issues.push({
      id: 'broken-transfers',
      type: 'error',
      category: 'transfer',
      title: 'عمليات تحويل بينية غير صالحة',
      description: `يوجد ${brokenTransferIds.length} عملية تحويل تفتقد لمحفظة وجهة صالحة أو تحول إلى نفس المحفظة.`,
      affectedIds: brokenTransferIds,
      canAutoFix: false,
    });
  }

  // 4. Orphaned Categories
  const orphanCategoryTxIds: string[] = [];
  transactions.forEach(t => {
    if (t.type !== 'transfer' && t.categoryId && !categoryIds.has(t.categoryId)) {
      orphanCategoryTxIds.push(t.id);
    }
  });

  if (orphanCategoryTxIds.length > 0) {
    issues.push({
      id: 'orphan-categories',
      type: 'warning',
      category: 'category',
      title: 'عمليات مرتبطة بتصنيفات غير موجودة',
      description: `يوجد ${orphanCategoryTxIds.length} عملية مرتبطة بتصنيف محذوف أو غير معرف.`,
      affectedIds: orphanCategoryTxIds,
      canAutoFix: true,
    });
  }

  // 5. Unconfigured Currency / Exchange Rate Check
  const unconfiguredCurrencyCodes = new Set<string>();
  transactions.forEach(t => {
    if (!currencyCodes.has(t.currency) && t.currency) {
      unconfiguredCurrencyCodes.add(t.currency);
    }
    if (exchangeRates[t.currency] === undefined && t.currency !== 'SAR') {
      unconfiguredCurrencyCodes.add(t.currency);
    }
  });

  if (unconfiguredCurrencyCodes.size > 0) {
    issues.push({
      id: 'missing-rates',
      type: 'warning',
      category: 'currency',
      title: 'عملات بدون أسعار صرف معرفة',
      description: `العملات التالية تستخدم في العمليات بدون سعر صرف مسجل: ${Array.from(unconfiguredCurrencyCodes).join(', ')}`,
      affectedIds: Array.from(unconfiguredCurrencyCodes),
      canAutoFix: false,
    });
  }

  // 6. Recurring Rules Validation
  const brokenRules: string[] = [];
  recurringRules.forEach(r => {
    if (!walletIds.has(r.walletId)) {
      brokenRules.push(r.id);
    }
  });

  if (brokenRules.length > 0) {
    issues.push({
      id: 'broken-recurring-rules',
      type: 'warning',
      category: 'recurring',
      title: 'قواعد دورية مرتبطة بمحافظ مفقودة',
      description: `يوجد ${brokenRules.length} قاعدة متكررة مرتبطة بمحافظ غير موجودة.`,
      affectedIds: brokenRules,
      canAutoFix: true,
    });
  }

  // 7. Wallet Balance vs Transaction History Discrepancy & Currency Drift Check
  const balanceReconciliation = diagnoseWalletBalanceDiscrepancies(wallets, transactions, exchangeRates, 0.005);
  if (!balanceReconciliation.isConsistent) {
    const discrepantWallets = balanceReconciliation.walletReports.filter(r => !r.isConsistent);
    issues.push({
      id: 'balance-history-discrepancy',
      type: 'error',
      category: 'wallet',
      title: 'تباين بين الرصيد المحسوب وسجل العمليات الفعلي',
      description: `تم رصد تباين في ${discrepantWallets.length} محفظة بإجمالي فروقات تقدر بـ ${balanceReconciliation.totalDiscrepancyBase} ر.س. تم تسجيل تفاصيل التدقيق في AuditLogs.`,
      affectedIds: discrepantWallets.map(w => w.walletId),
      canAutoFix: true,
    });
  } else if (balanceReconciliation.hasConversionDrifts) {
    const driftWallets = balanceReconciliation.walletReports.filter(r => r.hasCurrencyConversionDrift);
    issues.push({
      id: 'currency-conversion-drift',
      type: 'warning',
      category: 'currency',
      title: 'فروقات طفيفة ناتجة عن تحويل العملات',
      description: `يوجد فروقات كسور طفيفة ناتجة عن تقلب أسعار الصرف في ${driftWallets.length} محفظة. تم توثيقها في AuditLogs.`,
      affectedIds: driftWallets.map(w => w.walletId),
      canAutoFix: true,
    });
  }

  // 8. Balance Engine Invariant Verification (Synthetic Mathematical Simulation)
  const engineAudit = runBalanceEngineAudit();

  let status: 'HEALTHY' | 'WARNINGS' | 'CRITICAL' = 'HEALTHY';
  if (issues.some(i => i.type === 'error') || !engineAudit.allPassed) {
    status = 'CRITICAL';
  } else if (issues.some(i => i.type === 'warning')) {
    status = 'WARNINGS';
  }

  return {
    timestamp: new Date().toISOString(),
    status,
    totalTransactions: transactions.length,
    activeTransactions: transactions.filter(t => !t.isDeleted).length,
    trashCount: trash.length,
    walletsCount: wallets.length,
    categoriesCount: categories.length,
    recurringRulesCount: recurringRules.length,
    engineAuditPassed: engineAudit.allPassed,
    engineAuditResults: engineAudit.testResults,
    balanceReconciliation,
    issues,
  };
}

export interface AutoRepairOptions {
  allowStructuralWalletReassignment?: boolean;
  allowCategoryReassignment?: boolean;
}

/**
 * Execute automatic repair for recoverable issues with immutable audit logging
 * SAFETY GATE:
 * - NEVER alters transaction 'amount', 'currency', or 'type' automatically (STRICT FINANCIAL IMMUTABILITY).
 * - Wallet reassignments are guarded and logged with old/new state.
 * - Every repair entry includes repairId, targetId, oldValue, newValue, reason, timestamp.
 */
export function autoRepairState(state: AppState, options: AutoRepairOptions = {}): {
  repairedState: AppState;
  repairedCount: number;
  summary: string[];
  auditLogs: RepairAuditLogEntry[];
} {
  let repairedCount = 0;
  const summary: string[] = [];
  const auditLogs: RepairAuditLogEntry[] = [];
  const repairSessionId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let transactions = [...(state.transactions || [])];
  const wallets = [...(state.wallets || [])];
  const categories = [...(state.categories || [])];
  const defaultWalletId = wallets[0]?.id || 'default-wallet';
  const defaultCategoryId = categories[0]?.id || '1';

  // 1. Fix duplicate IDs (Safe non-financial structural fix)
  const seenIds = new Set<string>();
  transactions = transactions.map((t, idx) => {
    if (seenIds.has(t.id)) {
      repairedCount++;
      const newId = `tx-fixed-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const reason = `إصلاح تكرار معرف العملية: ${t.id} -> ${newId} (مع الحفاظ على المبلغ والنوع والعملة)`;
      summary.push(reason);
      auditLogs.push({
        id: `log-${Date.now()}-${repairedCount}`,
        timestamp: new Date().toISOString(),
        issueId: 'dup-tx-ids',
        category: 'transaction',
        entityType: 'transaction',
        entityId: t.id,
        oldValue: { id: t.id, amount: t.amount, currency: t.currency },
        newValue: { id: newId, amount: t.amount, currency: t.currency },
        reason,
        repairId: repairSessionId,
      });
      seenIds.add(newId);
      return { ...t, id: newId };
    }
    seenIds.add(t.id);
    return t;
  });

  // 2. Fix orphan wallet references (guarded by Safety Gate)
  const validWalletIds = new Set(wallets.map(w => w.id));
  if (options.allowStructuralWalletReassignment !== false) {
    transactions = transactions.map(t => {
      if (!validWalletIds.has(t.walletId)) {
        repairedCount++;
        const reason = `إعادة ربط العملية ${t.id} بالمحفظة الافتراضية ${defaultWalletId}`;
        summary.push(reason);
        auditLogs.push({
          id: `log-${Date.now()}-${repairedCount}`,
          timestamp: new Date().toISOString(),
          issueId: 'orphan-wallet-tx',
          category: 'wallet',
          entityType: 'transaction',
          entityId: t.id,
          oldValue: { walletId: t.walletId, amount: t.amount },
          newValue: { walletId: defaultWalletId, amount: t.amount },
          reason,
          repairId: repairSessionId,
        });
        return { ...t, walletId: defaultWalletId };
      }
      return t;
    });
  }

  // 3. Fix orphan category references
  const validCategoryIds = new Set(categories.map(c => c.id));
  if (options.allowCategoryReassignment !== false) {
    transactions = transactions.map(t => {
      if (t.type !== 'transfer' && (!t.categoryId || !validCategoryIds.has(t.categoryId))) {
        repairedCount++;
        const reason = `إعادة تعيين تصنيف العملية ${t.id} للتصنيف الافتراضي ${defaultCategoryId}`;
        summary.push(reason);
        auditLogs.push({
          id: `log-${Date.now()}-${repairedCount}`,
          timestamp: new Date().toISOString(),
          issueId: 'orphan-categories',
          category: 'category',
          entityType: 'transaction',
          entityId: t.id,
          oldValue: { categoryId: t.categoryId },
          newValue: { categoryId: defaultCategoryId },
          reason,
          repairId: repairSessionId,
        });
        return { ...t, categoryId: defaultCategoryId };
      }
      return t;
    });
  }

  // 4. Update cached wallet balances to strictly match calculated ledger balances (no arbitrary numbers)
  const calculatedBalances = calculateWalletBalances(wallets, transactions);
  const updatedWallets = wallets.map(w => {
    const calculated = calculatedBalances[w.id];
    const newBal = calculated ? calculated.currentBalance : w.openingBalance || 0;
    if (w.currentBalance !== newBal) {
      auditLogs.push({
        id: `log-bal-${Date.now()}-${w.id}`,
        timestamp: new Date().toISOString(),
        issueId: 'wallet-balance-resync',
        category: 'wallet',
        entityType: 'wallet',
        entityId: w.id,
        oldValue: { currentBalance: w.currentBalance },
        newValue: { currentBalance: newBal },
        reason: `مزامنة الرصيد الدفتري التراكمي للمحفظة ${w.name}`,
        repairId: repairSessionId,
      });
    }
    return {
      ...w,
      currentBalance: newBal,
    };
  });

  const repairedState: AppState = {
    ...state,
    transactions,
    wallets: updatedWallets,
  };

  return {
    repairedState,
    repairedCount,
    summary,
    auditLogs,
  };
}
