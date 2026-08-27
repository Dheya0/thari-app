import { Debt, DebtPayment, DebtStatus } from '../types';

export interface DebtCalculation {
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progressPercent: number;
  status: DebtStatus;
  statusLabel: string;
  statusColor: 'emerald' | 'amber' | 'rose' | 'blue';
  isOverdue: boolean;
  daysDiff?: number;
  paymentsCount: number;
}

export interface PersonDebtSummary {
  personName: string;
  personPhone?: string;
  personTag?: 'individual' | 'friend' | 'family' | 'customer' | 'supplier';
  totalOwedToMeOriginal: number;
  totalOwedToMePaid: number;
  totalOwedToMeRemaining: number;
  totalIOweOriginal: number;
  totalIOwePaid: number;
  totalIOweRemaining: number;
  netBalance: number; // remaining to_me - remaining on_me
  netStatus: 'receivable' | 'payable' | 'settled';
  debts: Debt[];
  allPayments: DebtPayment[];
  activeDebtsCount: number;
  settledDebtsCount: number;
}

export interface OverallDebtStats {
  totalIOweRemaining: number;
  totalOwedToMeRemaining: number;
  totalOriginalIOwe: number;
  totalOriginalOwedToMe: number;
  totalPaidIOwe: number;
  totalPaidOwedToMe: number;
  activeCount: number;
  overdueCount: number;
  settledCount: number;
  partialCount: number;
  uniquePersonsCount: number;
}

/**
 * Calculates remaining balance for a debt
 */
export const getDebtRemaining = (debt: Debt): number => {
  const original = debt.originalAmount || debt.amount || 0;
  const paid = debt.paidAmount || 0;
  return Math.max(0, original - paid);
};

/**
 * Returns full calculations and interpreted financial state for a single debt
 */
export const getDebtCalculations = (debt: Debt, language: 'ar' | 'en' = 'ar'): DebtCalculation => {
  const originalAmount = debt.originalAmount || debt.amount || 0;
  const paidAmount = debt.paidAmount || 0;
  const remainingAmount = Math.max(0, originalAmount - paidAmount);
  const progressPercent = originalAmount > 0 
    ? Math.min(100, Math.max(0, (paidAmount / originalAmount) * 100))
    : 0;
  
  const paymentsCount = debt.payments?.length || (paidAmount > 0 ? 1 : 0);

  // Check if fully settled
  if (remainingAmount <= 0.001 || debt.isPaid || progressPercent >= 99.99) {
    return {
      originalAmount,
      paidAmount,
      remainingAmount: 0,
      progressPercent: 100,
      status: 'settled',
      statusLabel: language === 'en' ? 'Fully Settled' : 'مسدد بالكامل',
      statusColor: 'emerald',
      isOverdue: false,
      paymentsCount,
    };
  }

  // Check overdue
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = !!(debt.dueDate && debt.dueDate < today);

  if (isOverdue && debt.dueDate) {
    const dueTime = new Date(debt.dueDate).getTime();
    const nowTime = new Date(today).getTime();
    const daysDiff = Math.max(1, Math.ceil((nowTime - dueTime) / (1000 * 60 * 60 * 24)));
    return {
      originalAmount,
      paidAmount,
      remainingAmount,
      progressPercent,
      status: 'overdue',
      statusLabel: language === 'en' ? `Overdue (${daysDiff} d)` : `متأخر (${daysDiff} يوم)`,
      statusColor: 'rose',
      isOverdue: true,
      daysDiff,
      paymentsCount,
    };
  }

  // Partial or active
  if (paidAmount > 0) {
    return {
      originalAmount,
      paidAmount,
      remainingAmount,
      progressPercent,
      status: 'partial',
      statusLabel: language === 'en' ? 'Partially Paid' : 'مسدد جزئياً',
      statusColor: 'amber',
      isOverdue: false,
      paymentsCount,
    };
  }

  return {
    originalAmount,
    paidAmount,
    remainingAmount,
    progressPercent: 0,
    status: 'active',
    statusLabel: language === 'en' ? 'Active & Due' : 'قائم ومستحق',
    statusColor: 'blue',
    isOverdue: false,
    paymentsCount,
  };
};

/**
 * Aggregates debts by Person / Contact to produce a clean statement of account
 */
export const groupDebtsByPerson = (debts: Debt[]): PersonDebtSummary[] => {
  const map = new Map<string, Debt[]>();

  for (const d of debts) {
    const key = (d.personName || 'بدون اسم').trim();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(d);
  }

  const summaries: PersonDebtSummary[] = [];

  for (const [personName, personDebts] of map.entries()) {
    let totalOwedToMeOriginal = 0;
    let totalOwedToMePaid = 0;
    let totalOwedToMeRemaining = 0;

    let totalIOweOriginal = 0;
    let totalIOwePaid = 0;
    let totalIOweRemaining = 0;

    let activeDebtsCount = 0;
    let settledDebtsCount = 0;
    const allPayments: DebtPayment[] = [];

    const firstWithPhone = personDebts.find(d => d.personPhone);
    const firstWithTag = personDebts.find(d => d.personTag);

    for (const d of personDebts) {
      const calc = getDebtCalculations(d);
      if (calc.status === 'settled') {
        settledDebtsCount++;
      } else {
        activeDebtsCount++;
      }

      if (d.type === 'to_me') {
        totalOwedToMeOriginal += calc.originalAmount;
        totalOwedToMePaid += calc.paidAmount;
        totalOwedToMeRemaining += calc.remainingAmount;
      } else {
        totalIOweOriginal += calc.originalAmount;
        totalIOwePaid += calc.paidAmount;
        totalIOweRemaining += calc.remainingAmount;
      }

      if (d.payments && d.payments.length > 0) {
        allPayments.push(...d.payments);
      }
    }

    // Sort payments newest first
    allPayments.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    const netBalance = totalOwedToMeRemaining - totalIOweRemaining;
    let netStatus: 'receivable' | 'payable' | 'settled' = 'settled';
    if (netBalance > 0.01) {
      netStatus = 'receivable'; // You are owed net
    } else if (netBalance < -0.01) {
      netStatus = 'payable'; // You owe net
    }

    summaries.push({
      personName,
      personPhone: firstWithPhone?.personPhone,
      personTag: firstWithTag?.personTag,
      totalOwedToMeOriginal,
      totalOwedToMePaid,
      totalOwedToMeRemaining,
      totalIOweOriginal,
      totalIOwePaid,
      totalIOweRemaining,
      netBalance,
      netStatus,
      debts: personDebts.sort((a, b) => (a.isPaid === b.isPaid ? (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : a.isPaid ? 1 : -1)),
      allPayments,
      activeDebtsCount,
      settledDebtsCount,
    });
  }

  // Sort: persons with active balances first, then alphabetically
  return summaries.sort((a, b) => {
    const aHasActive = (a.totalOwedToMeRemaining + a.totalIOweRemaining) > 0;
    const bHasActive = (b.totalOwedToMeRemaining + b.totalIOweRemaining) > 0;
    if (aHasActive && !bHasActive) return -1;
    if (!aHasActive && bHasActive) return 1;
    return Math.abs(b.netBalance) - Math.abs(a.netBalance);
  });
};

/**
 * Returns overall global statistics for all debts
 */
export const getOverallDebtStats = (debts: Debt[]): OverallDebtStats => {
  let totalIOweRemaining = 0;
  let totalOwedToMeRemaining = 0;
  let totalOriginalIOwe = 0;
  let totalOriginalOwedToMe = 0;
  let totalPaidIOwe = 0;
  let totalPaidOwedToMe = 0;
  let activeCount = 0;
  let overdueCount = 0;
  let settledCount = 0;
  let partialCount = 0;

  const personsSet = new Set<string>();

  for (const d of debts) {
    if (d.personName) personsSet.add(d.personName.trim());
    const calc = getDebtCalculations(d);

    if (calc.status === 'settled') {
      settledCount++;
    } else if (calc.status === 'overdue') {
      overdueCount++;
      activeCount++;
    } else if (calc.status === 'partial') {
      partialCount++;
      activeCount++;
    } else {
      activeCount++;
    }

    if (d.type === 'on_me') {
      totalOriginalIOwe += calc.originalAmount;
      totalPaidIOwe += calc.paidAmount;
      totalIOweRemaining += calc.remainingAmount;
    } else {
      totalOriginalOwedToMe += calc.originalAmount;
      totalPaidOwedToMe += calc.paidAmount;
      totalOwedToMeRemaining += calc.remainingAmount;
    }
  }

  return {
    totalIOweRemaining,
    totalOwedToMeRemaining,
    totalOriginalIOwe,
    totalOriginalOwedToMe,
    totalPaidIOwe,
    totalPaidOwedToMe,
    activeCount,
    overdueCount,
    settledCount,
    partialCount,
    uniquePersonsCount: personsSet.size,
  };
};
