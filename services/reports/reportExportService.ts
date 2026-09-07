import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ReportModel, ReportType } from './reportTypes';
import { formatLocalDateOnly } from '../../utils/formatters';

function escapeCSV(val: any): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a structured, multi-section CSV file for Excel supporting all 6 report types
 */
export function buildExcelReportCSV(model: ReportModel): string {
  const {
    metadata,
    reportType,
    account,
    scope,
    kpis,
    currencyBreakdown,
    expenseCategories,
    incomeCategories,
    walletSummaries,
    transactions,
    budgets = [],
    debts,
    goals,
  } = model;

  const lines: string[] = [];
  const baseSymbol = scope.baseCurrency.symbol;
  const isSummary = reportType === 'summary';

  const typeTitles: Record<ReportType, string> = {
    summary: 'الملخص المالي التنفيذي العام',
    detailed: 'كشف القيود والمعاملات المحاسبي التفصيلي',
    category: 'تقرير تحليل الميزانية ومطابقة الإنفاق الفعلي',
    wealth: 'تقرير صافي الثروة وتوزيع المحافظ والعملات',
    debts: 'كشف الذمم والديون والالتزامات المالية',
    savings_goals: 'تقرير الأهداف المالية ومتابعة المدخرات',
  };

  const reportTitleAr = typeTitles[reportType] || 'تقرير ثري المالي';

  // Section 1: Official Header & Metadata
  lines.push(`========================================================================================================`);
  lines.push(`تطبيق ثـري المالي - ${reportTitleAr} | THARI Financial Report`);
  lines.push(`========================================================================================================`);
  lines.push(`معرف التقرير (Report ID),${escapeCSV(metadata.reportId)},البصمة الرقمية (Fingerprint),${escapeCSV(metadata.fingerprint)}`);
  lines.push(`صاحب الحساب,${escapeCSV(account.name)},نوع الحساب,${escapeCSV(account.accountTypeAr)},تاريخ وتوقيت الإصدار,${escapeCSV(`${metadata.generatedAtFormattedAr} - ${metadata.generatedTimeFormattedAr}`)}`);
  lines.push(`نطاق التقرير,${escapeCSV(scope.walletNameAr)},العملة المحددة,${escapeCSV(scope.currencyFilter ? `${scope.currencyMetadata?.nameAr} (${scope.currencyMetadata?.code})` : `متعدد العملات (تقييم بـ ${scope.baseCurrency.code})`)},الفترة الزمنية,${escapeCSV(scope.periodLabelAr)}`);
  lines.push(`--------------------------------------------------------------------------------------------------------`);

  // Section 2: Executive KPI Matrix
  lines.push(`المؤشرات المالية الرئيسية:`);
  lines.push(`الرصيد الافتتاحي للفترة,${Math.round(kpis.openingBalance).toLocaleString()} ${baseSymbol}`);
  lines.push(`إجمالي الواردات (المقبوضات),+${Math.round(kpis.totalIncome).toLocaleString()} ${baseSymbol},عدد عمليات الدخل,${kpis.incomeCount} حركة`);
  lines.push(`إجمالي المنصرفات (المصروفات),-${Math.round(kpis.totalExpense).toLocaleString()} ${baseSymbol},عدد عمليات الصرف,${kpis.expenseCount + kpis.transferCount} حركة`);
  lines.push(`صافي الفائض / العجز المالي,${Math.round(kpis.netSavings).toLocaleString()} ${baseSymbol},معدل الادخار,${kpis.savingsRatePercent}%`);
  lines.push(`الرصيد الختامي للفترة,${Math.round(kpis.closingBalance).toLocaleString()} ${baseSymbol},إجمالي عدد الحركات,${kpis.totalTransactions} حركة`);
  lines.push(`--------------------------------------------------------------------------------------------------------`);

  // Section 3: Specialized Data depending on ReportType

  // 3A: Budgets & Category Analysis
  if (reportType === 'category' || budgets.length > 0) {
    if (budgets.length > 0) {
      lines.push(`جدول متابعة الميزانيات المحددة والإنفاق الفعلي:`);
      lines.push(`التصنيف,الميزانية المعتمدة (${baseSymbol}),الإنفاق الفعلي (${baseSymbol}),المتبقي (${baseSymbol}),نسبة الاستهلاك,الحالة`);
      budgets.forEach(b => {
        lines.push(
          `${escapeCSV(b.categoryName)},${Math.round(b.budgetAmount).toLocaleString()},${Math.round(b.spentAmount).toLocaleString()},${Math.round(b.remainingAmount).toLocaleString()},${b.percentageUsed.toFixed(1)}%,${escapeCSV(b.statusLabelAr)}`
        );
      });
      lines.push(`--------------------------------------------------------------------------------------------------------`);
    }
  }

  // 3B: Debts & Liabilities Statement
  if (reportType === 'debts' || (debts && debts.items.length > 0)) {
    if (debts) {
      lines.push(`ملخص الذمم والديون:`);
      lines.push(`إجمالي ديون لي (مستحقات),+${Math.round(debts.totalReceivable).toLocaleString()} ${baseSymbol},إجمالي ديون علي (التزامات),-${Math.round(debts.totalPayable).toLocaleString()} ${baseSymbol},صافي الموقف,${Math.round(debts.netDebtPosition).toLocaleString()} ${baseSymbol}`);
      lines.push(`كشف القيود والذمم:`);
      lines.push(`الطرف / الاسم,النوع,المبلغ الأصلي,المدفوع / المسدد,المتبقي بالعملة,المعادل بـ (${baseSymbol}),تاريخ الإنشاء,تاريخ الاستحقاق,الحالة,ملاحظات`);
      debts.items.forEach(d => {
        lines.push(
          `${escapeCSV(d.personName)},${escapeCSV(d.typeLabelAr)},${Math.round(d.originalAmount).toLocaleString()} ${d.currency},${Math.round(d.paidAmount).toLocaleString()} ${d.currency},${Math.round(d.remainingAmount).toLocaleString()} ${d.currency},${Math.round(d.convertedRemaining).toLocaleString()} ${baseSymbol},${escapeCSV(d.createdAt || '-')},${escapeCSV(d.dueDate || '-')},${escapeCSV(d.statusLabelAr)},${escapeCSV(d.note || '-')}`
        );
      });
      lines.push(`--------------------------------------------------------------------------------------------------------`);
    }
  }

  // 3C: Savings Goals Progress
  if (reportType === 'savings_goals' || (goals && goals.items.length > 0)) {
    if (goals) {
      lines.push(`ملخص الأهداف والمدخرات:`);
      lines.push(`إجمالي المستهدف,+${Math.round(goals.totalTargetAmount).toLocaleString()} ${baseSymbol},إجمالي المجموع الفعلي,${Math.round(goals.totalSavedAmount).toLocaleString()} ${baseSymbol},نسبة الإنجاز العامة,${goals.overallProgressPercent.toFixed(1)}%`);
      lines.push(`تفاصيل الأهداف المالية:`);
      lines.push(`اسم الهدف,المبلغ المستهدف (${baseSymbol}),المدخر الحالي (${baseSymbol}),المتبقي للهدف (${baseSymbol}),نسبة الإنجاز,تاريخ الهدف,الحالة`);
      goals.items.forEach(g => {
        lines.push(
          `${escapeCSV(g.name)},${Math.round(g.convertedTarget).toLocaleString()},${Math.round(g.convertedCurrent).toLocaleString()},${Math.round(g.remainingAmount).toLocaleString()},${g.progressPercent.toFixed(1)}%,${escapeCSV(g.deadline || '-')},${g.isCompleted ? 'مكتمل' : 'قيد التجميع'}`
        );
      });
      lines.push(`--------------------------------------------------------------------------------------------------------`);
    }
  }

  // Section 4: Multi-Currency Breakdown
  if (currencyBreakdown.length > 0) {
    lines.push(`تحليل وتوزيع العملات (Multi-Currency Breakdown):`);
    lines.push(`رمز العملة,اسم العملة,الرمز,عدد الحركات,إجمالي المقبوضات,إجمالي المنصرفات,الصافي بالعملة,القيمة المعادلة (${scope.baseCurrency.code}),سعر الصرف التقديري`);
    currencyBreakdown.forEach(cb => {
      lines.push(
        `${escapeCSV(cb.code)},${escapeCSV(cb.metadata.nameAr)},${escapeCSV(cb.metadata.symbol)},${cb.transactionCount},+${Math.round(cb.income).toLocaleString()} ${cb.metadata.symbol},-${Math.round(cb.expense).toLocaleString()} ${cb.metadata.symbol},${Math.round(cb.net).toLocaleString()} ${cb.metadata.symbol},${Math.round(cb.convertedNetToBase).toLocaleString()} ${baseSymbol},1 ${cb.code} = ${cb.exchangeRateToBase.toFixed(4)} ${scope.baseCurrency.code}`
      );
    });
    lines.push(`--------------------------------------------------------------------------------------------------------`);
  }

  // Section 5: Wallet Allocation
  if (walletSummaries.length > 0) {
    lines.push(`توزيع أرصدة المحافظ المالية:`);
    lines.push(`اسم المحفظة,العملة الأساسية,الرصيد الفعلي,الرصيد المعادل (${scope.baseCurrency.code}),الحصة من إجمالي الثروة`);
    walletSummaries.forEach(w => {
      lines.push(
        `${escapeCSV(w.name)},${escapeCSV(w.currencyCode)},${Math.round(w.rawBalance).toLocaleString()} ${w.currencyCode},${Math.round(w.convertedBalance).toLocaleString()} ${baseSymbol},${w.percentageOfTotalWealth.toFixed(1)}%`
      );
    });
    lines.push(`--------------------------------------------------------------------------------------------------------`);
  }

  // Section 6: Expense & Income Categories
  if (expenseCategories.length > 0) {
    lines.push(`تحليل المصروفات حسب التصنيف:`);
    lines.push(`اسم التصنيف,المبلغ المعادل (${scope.baseCurrency.code}),النسبة من إجمالي المصروفات,عدد العمليات`);
    expenseCategories.forEach(cat => {
      lines.push(
        `${escapeCSV(cat.name)},${Math.round(cat.totalAmount).toLocaleString()} ${baseSymbol},${cat.percentageOfTotal.toFixed(1)}%,${cat.transactionCount}`
      );
    });
    lines.push(`--------------------------------------------------------------------------------------------------------`);
  }

  if (incomeCategories.length > 0) {
    lines.push(`تحليل مصادر الدخل:`);
    lines.push(`اسم المصدر / التصنيف,المبلغ المعادل (${scope.baseCurrency.code}),النسبة من إجمالي الدخل,عدد العمليات`);
    incomeCategories.forEach(cat => {
      lines.push(
        `${escapeCSV(cat.name)},${Math.round(cat.totalAmount).toLocaleString()} ${baseSymbol},${cat.percentageOfTotal.toFixed(1)}%,${cat.transactionCount}`
      );
    });
    lines.push(`--------------------------------------------------------------------------------------------------------`);
  }

  // Section 7: Transactions Ledger
  if (reportType === 'detailed' || reportType === 'summary') {
    const displayTxs = isSummary ? transactions.slice(0, 15) : transactions;
    lines.push(`جدول القيود المحاسبية والمعاملات المسجلة (${displayTxs.length} حركة معروضة):`);
    lines.push(`رقم القيد,التاريخ,نوع الحركة,التصنيف,المحفظة,المبلغ بالعملة الأصلية,العملة الأصلية,المقيد/المخصوم بالمحفظة,المعادل بـ (${scope.baseCurrency.code}),الرصيد التراكمي,البيان / تفاصيل القيد`);

    displayTxs.forEach(t => {
      const sign = t.type === 'income' ? '+' : '-';
      const walletDeductionStr = t.isCrossCurrencyWithWallet && t.walletDeductionAmount !== undefined
        ? `${sign}${t.walletDeductionAmount.toLocaleString()} ${t.walletCurrencyCode}`
        : `${sign}${t.originalAmount.toLocaleString()} ${t.currencyCode}`;

      lines.push(
        `${t.index},${escapeCSV(t.date)},${escapeCSV(t.typeLabelAr)},${escapeCSV(t.categoryName)},${escapeCSV(t.walletName)},${sign}${t.originalAmount.toLocaleString()},${escapeCSV(t.currencyCode)},${escapeCSV(walletDeductionStr)},${Math.round(t.convertedAmount).toLocaleString()} ${baseSymbol},${t.runningBalance !== undefined ? Math.round(t.runningBalance).toLocaleString() + ' ' + baseSymbol : '-'},${escapeCSV(t.note || '-')}`
      );
    });
    lines.push(`--------------------------------------------------------------------------------------------------------`);
  }

  lines.push(`تنويه تقني,تم استخراج هذا التقرير المالي آلياً عبر تطبيق ثـري. البيانات محفوظة محلياً ومشفرة بالكامل على جهاز المستخدم.`);
  lines.push(`رمز التحقق,${escapeCSV(metadata.fingerprint)} | QR-ENCODED`);
  lines.push(`========================================================================================================`);

  return '\ufeff' + lines.join('\n');
}

/**
 * Generates an authentic, modern Microsoft Excel (.xlsx) workbook (Office Open XML / 2016-365 format)
 * with dedicated multi-sheet structure, numeric cell types, and RTL orientation.
 */
export async function buildModernExcelWorkbook(model: ReportModel): Promise<any> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const {
    metadata,
    reportType,
    account,
    scope,
    kpis,
    currencyBreakdown,
    expenseCategories,
    incomeCategories,
    walletSummaries,
    transactions,
    budgets = [],
    debts,
    goals,
  } = model;

  const baseSymbol = scope.baseCurrency.symbol;
  const typeTitles: Record<ReportType, string> = {
    summary: 'الملخص المالي التنفيذي العام',
    detailed: 'كشف القيود والمعاملات المحاسبي التفصيلي',
    category: 'تقرير تحليل الميزانية ومطابقة الإنفاق الفعلي',
    wealth: 'تقرير صافي الثروة وتوزيع المحافظ والعملات',
    debts: 'كشف الذمم والديون والالتزامات المالية',
    savings_goals: 'تقرير الأهداف المالية ومتابعة المدخرات',
  };
  const reportTitleAr = typeTitles[reportType] || 'تقرير ثري المالي';

  // --- 1. ورقة الملخص التنفيذي والمؤشرات ---
  const summaryAoa: any[][] = [
    ['تطبيق ثـري المالي - ' + reportTitleAr + ' (THARI Financial Report)'],
    [],
    ['معرف التقرير', metadata.reportId, 'البصمة الرقمية', metadata.fingerprint],
    ['صاحب الحساب', `${account.name} (${account.accountTypeAr})`, 'تاريخ الإصدار', `${metadata.generatedAtFormattedAr} - ${metadata.generatedTimeFormattedAr}`],
    ['نطاق التقرير', scope.walletNameAr, 'العملة المرجعية', scope.baseCurrency.code],
    ['الفترة الزمنية', scope.periodLabelAr, 'العملة المحددة', scope.currencyFilter || 'كافة العملات'],
    [],
    ['المؤشرات المالية الرئيسية', 'القيمة', 'العملة / تفاصيل'],
    ['الرصيد الافتتاحي للفترة', Math.round(kpis.openingBalance), baseSymbol],
    ['إجمالي الواردات (المقبوضات)', Math.round(kpis.totalIncome), `${baseSymbol} (${kpis.incomeCount} حركة)`],
    ['إجمالي المنصرفات (المصروفات)', Math.round(kpis.totalExpense), `${baseSymbol} (${kpis.expenseCount} حركة)`],
    ['صافي الفائض / العجز المالي', Math.round(kpis.netSavings), baseSymbol],
    ['معدل الادخار', `${kpis.savingsRatePercent}%`, ''],
    ['الرصيد الختامي للفترة', Math.round(kpis.closingBalance), baseSymbol],
    ['إجمالي عدد الحركات المسجلة', kpis.totalTransactions, 'حركة'],
  ];

  if (currencyBreakdown && currencyBreakdown.length > 0) {
    summaryAoa.push([]);
    summaryAoa.push(['توزيع السيولة حسب العملات', 'الرصيد الفعلي', 'المعادل بـ ' + scope.baseCurrency.code, 'عدد العمليات']);
    currencyBreakdown.forEach(c => {
      summaryAoa.push([
        c.metadata?.nameAr || c.code,
        c.net,
        Math.round(c.convertedNetToBase),
        `${c.transactionCount} حركة`
      ]);
    });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 24 }, { wch: 28 }];
  wsSummary['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص التنفيذي');

  // --- 2. ورقة القيود والمعاملات المحاسبية ---
  if (transactions && transactions.length > 0) {
    const txAoa: any[][] = [
      ['رقم القيد', 'التاريخ', 'الوقت', 'نوع الحركة', 'التصنيف', 'المحفظة', 'المبلغ بالعملة الأصلية', 'العملة الأصلية', 'المقيد بالمحفظة', 'المعادل بالأساسية', 'عملة التقييم', 'الرصيد التراكمي', 'البيان والملاحظات']
    ];

    transactions.forEach(t => {
      const sign = t.type === 'income' ? '+' : '-';
      const walletDeductionStr = t.isCrossCurrencyWithWallet && t.walletDeductionAmount !== undefined
        ? `${sign}${t.walletDeductionAmount.toLocaleString()} ${t.walletCurrencyCode}`
        : `${sign}${t.originalAmount.toLocaleString()} ${t.currencyCode}`;

      txAoa.push([
        t.index,
        t.date,
        t.time || '',
        t.typeLabelAr,
        t.categoryName,
        t.walletName,
        t.originalAmount,
        t.currencyCode,
        walletDeductionStr,
        Math.round(t.convertedAmount),
        scope.baseCurrency.code,
        t.runningBalance !== undefined ? Math.round(t.runningBalance) : '',
        t.note || ''
      ]);
    });

    const wsTx = XLSX.utils.aoa_to_sheet(txAoa);
    wsTx['!cols'] = [
      { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 18 },
      { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 18 }, { wch: 35 }
    ];
    wsTx['!views'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, wsTx, 'سجل العمليات');
  }

  // --- 3. ورقة تحليل التصنيفات والميزانيات ---
  const catAoa: any[][] = [];
  if (expenseCategories && expenseCategories.length > 0) {
    catAoa.push(['تحليل مصروفات التصنيفات', 'المبلغ المعادل (' + scope.baseCurrency.code + ')', 'النسبة من الإجمالي', 'عدد العمليات']);
    expenseCategories.forEach(c => {
      catAoa.push([c.name, Math.round(c.totalAmount), `${c.percentageOfTotal.toFixed(1)}%`, c.transactionCount]);
    });
    catAoa.push([]);
  }

  if (incomeCategories && incomeCategories.length > 0) {
    catAoa.push(['تحليل مصادر الدخل', 'المبلغ المعادل (' + scope.baseCurrency.code + ')', 'النسبة من الإجمالي', 'عدد العمليات']);
    incomeCategories.forEach(c => {
      catAoa.push([c.name, Math.round(c.totalAmount), `${c.percentageOfTotal.toFixed(1)}%`, c.transactionCount]);
    });
    catAoa.push([]);
  }

  if (budgets && budgets.length > 0) {
    catAoa.push(['جدول متابعة الميزانيات المعتمدة', 'الميزانية المحددة', 'المنصرف الفعلي', 'المتبقي', 'نسبة الاستهلاك', 'الحالة']);
    budgets.forEach(b => {
      catAoa.push([
        b.categoryName,
        Math.round(b.budgetAmount),
        Math.round(b.spentAmount),
        Math.round(b.remainingAmount),
        `${b.percentageUsed.toFixed(1)}%`,
        b.statusLabelAr
      ]);
    });
  }

  if (catAoa.length > 0) {
    const wsCat = XLSX.utils.aoa_to_sheet(catAoa);
    wsCat['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 }];
    wsCat['!views'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, wsCat, 'التصنيفات والميزانيات');
  }

  // --- 4. ورقة كشف الذمم والديون إن وجدت ---
  if (debts && debts.items && debts.items.length > 0) {
    const debtAoa: any[][] = [
      ['ملخص الذمم والديون'],
      ['إجمالي مستحقات لي', Math.round(debts.totalReceivable), baseSymbol],
      ['إجمالي التزامات علي', Math.round(debts.totalPayable), baseSymbol],
      ['صافي الموقف المالي للديون', Math.round(debts.netDebtPosition), baseSymbol],
      [],
      ['الطرف / الاسم', 'النوع', 'المبلغ الأصلي', 'العملة', 'المسدد', 'المتبقي', 'المعادل بـ ' + scope.baseCurrency.code, 'تاريخ الإنشاء', 'تاريخ الاستحقاق', 'الحالة', 'ملاحظات']
    ];

    debts.items.forEach(d => {
      debtAoa.push([
        d.personName,
        d.typeLabelAr,
        d.originalAmount,
        d.currency,
        d.paidAmount,
        d.remainingAmount,
        Math.round(d.convertedRemaining),
        d.createdAt || '',
        d.dueDate || '',
        d.statusLabelAr,
        d.note || ''
      ]);
    });

    const wsDebt = XLSX.utils.aoa_to_sheet(debtAoa);
    wsDebt['!cols'] = [
      { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 },
      { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 }
    ];
    wsDebt['!views'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, wsDebt, 'كشف الديون والذمم');
  }

  // --- 5. ورقة الأهداف المالية إن وجدت ---
  if (goals?.items && goals.items.length > 0) {
    const goalAoa: any[][] = [
      ['اسم الهدف المالي', 'المبلغ المستهدف', 'المبلغ المحقق', 'المتبقي', 'نسبة الإنجاز', 'الحالة']
    ];
    goals.items.forEach(g => {
      const target = g.targetAmount || 0;
      const current = g.currentAmount || 0;
      const pct = g.progressPercent ?? (target > 0 ? (current / target) * 100 : 0);
      goalAoa.push([
        g.name,
        target,
        current,
        Math.max(0, target - current),
        `${pct.toFixed(1)}%`,
        g.isCompleted || pct >= 100 ? 'مكتمل' : 'قيد الإنجاز'
      ]);
    });

    const wsGoals = XLSX.utils.aoa_to_sheet(goalAoa);
    wsGoals['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    wsGoals['!views'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, wsGoals, 'الأهداف المالية');
  }

  return wb;
}

/**
 * Builds a structured multi-table HTML spreadsheet (.xls) for legacy compatibility
 */
export function buildExcelReportHTML(model: ReportModel): string {
  const {
    metadata,
    reportType,
    account,
    scope,
    kpis,
    currencyBreakdown,
    expenseCategories,
    incomeCategories,
    walletSummaries,
    transactions,
    budgets = [],
    debts,
    goals,
  } = model;

  const baseSymbol = scope.baseCurrency.symbol;
  const isSummary = reportType === 'summary';

  const typeTitles: Record<ReportType, string> = {
    summary: 'الملخص المالي التنفيذي العام',
    detailed: 'كشف القيود والمعاملات المحاسبي التفصيلي',
    category: 'تقرير تحليل الميزانية ومطابقة الإنفاق الفعلي',
    wealth: 'تقرير صافي الثروة وتوزيع المحافظ والعملات',
    debts: 'كشف الذمم والديون والالتزامات المالية',
    savings_goals: 'تقرير الأهداف المالية ومتابعة المدخرات',
  };

  const reportTitleAr = typeTitles[reportType] || 'تقرير ثري المالي';

  return `
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>تقرير ثري المالي - ${metadata.reportId}</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; direction: rtl; color: #1e293b; padding: 20px; background: #ffffff; }
  h1 { color: #1e3a8a; font-size: 16pt; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 15px; }
  h2 { color: #334155; font-size: 12pt; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
  th { background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 8px 10px; border: 1px solid #475569; text-align: right; }
  td { padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a; }
  tr:nth-child(even) { background-color: #f8fafc; }
  .meta-table td { font-weight: bold; background: #f1f5f9; width: 25%; }
  .meta-table td.val { font-weight: normal; background: #ffffff; width: 25%; }
</style>
</head>
<body>
  <h1>تطبيق ثـري المالي - ${reportTitleAr}</h1>
  
  <table class="meta-table">
    <tr>
      <td>معرف التقرير:</td>
      <td class="val">${metadata.reportId}</td>
      <td>البصمة الرقمية:</td>
      <td class="val">${metadata.fingerprint}</td>
    </tr>
    <tr>
      <td>صاحب الحساب:</td>
      <td class="val">${account.name} (${account.accountTypeAr})</td>
      <td>تاريخ الإصدار:</td>
      <td class="val">${metadata.generatedAtFormattedAr} - ${metadata.generatedTimeFormattedAr}</td>
    </tr>
    <tr>
      <td>نطاق التقرير:</td>
      <td class="val">${scope.walletNameAr}</td>
      <td>العملة الأساسية:</td>
      <td class="val">${scope.baseCurrency.code} (${scope.baseCurrency.symbol})</td>
    </tr>
    <tr>
      <td>فترة التقرير:</td>
      <td class="val" colspan="3">${scope.periodLabelAr}</td>
    </tr>
  </table>

  <h2>المؤشرات المالية الرئيسية (KPIs)</h2>
  <table>
    <tr>
      <th>المؤشر المالي</th>
      <th>القيمة</th>
      <th>مؤشر فرعي / تفاصيل</th>
      <th>العدد</th>
    </tr>
    <tr>
      <td><b>الرصيد الافتتاحي للفترة</b></td>
      <td>${Math.round(kpis.openingBalance).toLocaleString()} ${baseSymbol}</td>
      <td>بداية الفترة الزمنية المحددة</td>
      <td>-</td>
    </tr>
    <tr>
      <td><b>إجمالي الواردات (المقبوضات)</b></td>
      <td style="color: #047857; font-weight: bold;">+${Math.round(kpis.totalIncome).toLocaleString()} ${baseSymbol}</td>
      <td>إجمالي المقبوضات المحققة</td>
      <td>${kpis.incomeCount} حركة</td>
    </tr>
    <tr>
      <td><b>إجمالي المنصرفات (المصروفات)</b></td>
      <td style="color: #be123c; font-weight: bold;">-${Math.round(kpis.totalExpense).toLocaleString()} ${baseSymbol}</td>
      <td>إجمالي المصروفات والتحويلات</td>
      <td>${kpis.expenseCount + kpis.transferCount} حركة</td>
    </tr>
    <tr>
      <td><b>صافي الفائض / العجز المالي</b></td>
      <td style="font-weight: bold; color: ${kpis.netSavings >= 0 ? '#047857' : '#be123c'};">${Math.round(kpis.netSavings).toLocaleString()} ${baseSymbol}</td>
      <td>معدل الادخار: ${kpis.savingsRatePercent}%</td>
      <td>-</td>
    </tr>
    <tr>
      <td><b>الرصيد الختامي للفترة</b></td>
      <td style="font-weight: bold;">${Math.round(kpis.closingBalance).toLocaleString()} ${baseSymbol}</td>
      <td>إجمالي الحركات في التقرير</td>
      <td>${kpis.totalTransactions} حركة</td>
    </tr>
  </table>

  ${budgets.length > 0 ? `
  <h2>جدول مطابقة الميزانيات المحددة والإنفاق الفعلي</h2>
  <table>
    <tr>
      <th>التصنيف</th>
      <th>الميزانية المعتمدة</th>
      <th>الإنفاق الفعلي</th>
      <th>المتبقي</th>
      <th>نسبة الاستهلاك</th>
      <th>الحالة</th>
    </tr>
    ${budgets.map(b => `
    <tr>
      <td><b>${b.categoryName}</b></td>
      <td>${Math.round(b.budgetAmount).toLocaleString()} ${baseSymbol}</td>
      <td style="color: ${b.isOverBudget ? '#be123c' : '#0f172a'}; font-weight: bold;">${Math.round(b.spentAmount).toLocaleString()} ${baseSymbol}</td>
      <td style="color: ${b.remainingAmount < 0 ? '#be123c' : '#047857'}; font-weight: bold;">${Math.round(b.remainingAmount).toLocaleString()} ${baseSymbol}</td>
      <td>${b.percentageUsed.toFixed(1)}%</td>
      <td>${b.statusLabelAr}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${debts && debts.items.length > 0 ? `
  <h2>كشف الذمم والديون والالتزامات المالية</h2>
  <table>
    <tr>
      <th>الطرف / الشخص</th>
      <th>نوع الذمة</th>
      <th>المبلغ الأصلي</th>
      <th>المسدد</th>
      <th>المتبقي بالعملة</th>
      <th>المعادل (${baseSymbol})</th>
      <th>تاريخ الاستحقاق</th>
      <th>الحالة</th>
    </tr>
    ${debts.items.map(d => `
    <tr>
      <td><b>${d.personName}</b></td>
      <td style="color: ${d.type === 'to_me' ? '#047857' : '#be123c'}; font-weight: bold;">${d.typeLabelAr}</td>
      <td>${Math.round(d.originalAmount).toLocaleString()} ${d.currency}</td>
      <td>${Math.round(d.paidAmount).toLocaleString()} ${d.currency}</td>
      <td style="font-weight: bold;">${Math.round(d.remainingAmount).toLocaleString()} ${d.currency}</td>
      <td><b>${Math.round(d.convertedRemaining).toLocaleString()} ${baseSymbol}</b></td>
      <td>${d.dueDate || '-'}</td>
      <td>${d.statusLabelAr}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${goals && goals.items.length > 0 ? `
  <h2>تقرير الأهداف المالية ومتابعة المدخرات</h2>
  <table>
    <tr>
      <th>اسم الهدف</th>
      <th>المستهدف (${baseSymbol})</th>
      <th>المدخر الفعلي (${baseSymbol})</th>
      <th>المتبقي للهدف (${baseSymbol})</th>
      <th>نسبة الإنجاز</th>
      <th>تاريخ الهدف</th>
      <th>الحالة</th>
    </tr>
    ${goals.items.map(g => `
    <tr>
      <td><b>${g.name}</b></td>
      <td>${Math.round(g.convertedTarget).toLocaleString()} ${baseSymbol}</td>
      <td style="color: #047857; font-weight: bold;">${Math.round(g.convertedCurrent).toLocaleString()} ${baseSymbol}</td>
      <td>${Math.round(g.remainingAmount).toLocaleString()} ${baseSymbol}</td>
      <td><b>${g.progressPercent.toFixed(1)}%</b></td>
      <td>${g.deadline || '-'}</td>
      <td>${g.isCompleted ? 'مكتمل' : 'قيد التجميع'}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${currencyBreakdown.length > 0 ? `
  <h2>تحليل وتوزيع العملات (Multi-Currency Breakdown)</h2>
  <table>
    <tr>
      <th>رمز العملة</th>
      <th>اسم العملة</th>
      <th>الرمز</th>
      <th>عدد الحركات</th>
      <th>المقبوضات</th>
      <th>المنصرفات</th>
      <th>الصافي بالعملة</th>
      <th>المعادل بـ (${scope.baseCurrency.code})</th>
      <th>سعر الصرف التقديري</th>
    </tr>
    ${currencyBreakdown.map(cb => `
    <tr>
      <td><b>${cb.code}</b></td>
      <td>${cb.metadata.nameAr}</td>
      <td>${cb.metadata.symbol}</td>
      <td>${cb.transactionCount}</td>
      <td style="color: #047857;">+${Math.round(cb.income).toLocaleString()}</td>
      <td style="color: #be123c;">-${Math.round(cb.expense).toLocaleString()}</td>
      <td>${Math.round(cb.net).toLocaleString()} ${cb.metadata.symbol}</td>
      <td><b>${Math.round(cb.convertedNetToBase).toLocaleString()} ${baseSymbol}</b></td>
      <td>1 ${cb.code} = ${cb.exchangeRateToBase.toFixed(4)} ${scope.baseCurrency.code}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${walletSummaries.length > 0 ? `
  <h2>توزيع أرصدة المحافظ المالية</h2>
  <table>
    <tr>
      <th>اسم المحفظة</th>
      <th>العملة الأساسية</th>
      <th>الرصيد الفعلي</th>
      <th>الرصيد المعادل بـ (${scope.baseCurrency.code})</th>
      <th>الحصة من إجمالي الثروة</th>
    </tr>
    ${walletSummaries.map(w => `
    <tr>
      <td><b>${w.name}</b></td>
      <td>${w.currencyCode}</td>
      <td>${Math.round(w.rawBalance).toLocaleString()} ${w.currencyCode}</td>
      <td><b>${Math.round(w.convertedBalance).toLocaleString()} ${baseSymbol}</b></td>
      <td>${w.percentageOfTotalWealth.toFixed(1)}%</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${expenseCategories.length > 0 ? `
  <h2>تحليل المصروفات حسب التصنيف</h2>
  <table>
    <tr>
      <th>اسم التصنيف</th>
      <th>المبلغ المعادل بـ (${scope.baseCurrency.code})</th>
      <th>النسبة من إجمالي المصروفات</th>
      <th>عدد العمليات</th>
    </tr>
    ${expenseCategories.map(cat => `
    <tr>
      <td><b>${cat.name}</b></td>
      <td>${Math.round(cat.totalAmount).toLocaleString()} ${baseSymbol}</td>
      <td>${cat.percentageOfTotal.toFixed(1)}%</td>
      <td>${cat.transactionCount}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${incomeCategories.length > 0 ? `
  <h2>تحليل مصادر الدخل</h2>
  <table>
    <tr>
      <th>اسم المصدر / التصنيف</th>
      <th>المبلغ المعادل بـ (${scope.baseCurrency.code})</th>
      <th>النسبة من إجمالي الدخل</th>
      <th>عدد العمليات</th>
    </tr>
    ${incomeCategories.map(cat => `
    <tr>
      <td><b>${cat.name}</b></td>
      <td>${Math.round(cat.totalAmount).toLocaleString()} ${baseSymbol}</td>
      <td>${cat.percentageOfTotal.toFixed(1)}%</td>
      <td>${cat.transactionCount}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${(reportType === 'detailed' || reportType === 'summary') && transactions.length > 0 ? `
  <h2>جدول القيود المحاسبية والمعاملات المسجلة (${(isSummary ? transactions.slice(0, 15) : transactions).length} حركة)</h2>
  <table>
    <tr>
      <th>#</th>
      <th>التاريخ</th>
      <th>نوع الحركة</th>
      <th>التصنيف</th>
      <th>المحفظة</th>
      <th>المبلغ الأصلي</th>
      <th>العملة</th>
      <th>المقيد بالحساب</th>
      <th>المعادل بـ (${scope.baseCurrency.code})</th>
      <th>الرصيد التراكمي</th>
      <th>البيان / التفاصيل</th>
    </tr>
    ${(isSummary ? transactions.slice(0, 15) : transactions).map(t => {
      const sign = t.type === 'income' ? '+' : '-';
      const walletDeductionStr = t.isCrossCurrencyWithWallet && t.walletDeductionAmount !== undefined
        ? `${sign}${t.walletDeductionAmount.toLocaleString()} ${t.walletCurrencyCode}`
        : `${sign}${t.originalAmount.toLocaleString()} ${t.currencyCode}`;
      return `
      <tr>
        <td>${t.index}</td>
        <td>${t.date}</td>
        <td style="color: ${t.type === 'income' ? '#047857' : t.type === 'expense' ? '#be123c' : '#2563eb'}; font-weight: bold;">${t.typeLabelAr}</td>
        <td>${t.categoryName}</td>
        <td>${t.walletName}</td>
        <td style="font-weight: bold; color: ${t.type === 'income' ? '#047857' : '#be123c'};">${sign}${t.originalAmount.toLocaleString()}</td>
        <td>${t.currencyCode}</td>
        <td>${walletDeductionStr}</td>
        <td><b>${Math.round(t.convertedAmount).toLocaleString()} ${baseSymbol}</b></td>
        <td>${t.runningBalance !== undefined ? Math.round(t.runningBalance).toLocaleString() + ' ' + baseSymbol : '-'}</td>
        <td>${t.note || '-'}</td>
      </tr>
      `;
    }).join('')}
  </table>
  ` : ''}

  <br>
  <p style="font-size: 9pt; color: #64748b; text-align: center;">
    تنويه: تم تصدير هذا التقرير المالي آلياً بصيغة Excel المتكاملة من تطبيق ثـري المالي. جميع البيانات مشفرة ومحفوظة محلياً على جهازك. | بصمة التحقق: ${metadata.fingerprint}
  </p>
</body>
</html>
  `;
}

/**
 * Builds a clean, self-contained printable HTML document styled for A4 PDF rendering.
 */
import { buildPrintableReportHTML, generatePdfBlobFromModel } from "./reportPrintService";
export { buildPrintableReportHTML, generatePdfBlobFromModel };

let isExportingActive = false;

/**
 * Universally triggers print/PDF generation or share for any financial report model across iPhone, Android, and Desktop
 */
export async function printOrShareFinancialReport(
  model: ReportModel,
  preferredAction: 'print' | 'share' | 'excel' = 'print'
): Promise<void> {
  if (isExportingActive) return;
  isExportingActive = true;

  try {
    const dateStr = formatLocalDateOnly(new Date());
    const typeKey = model.reportType || 'summary';

    if (preferredAction === 'excel') {
      const workbook = await buildModernExcelWorkbook(model);
      const fileName = `THARI_${typeKey.toUpperCase()}_${dateStr}.xlsx`;
      await exportAndShareXlsxFile(
        workbook,
        fileName,
        'تقرير ثري المالي (Excel XLSX)'
      );
      return;
    }

    // Generate real PDF blob for print or share actions (fully guarded operation)
    const pdfBlob = await generatePdfBlobFromModel(model);
    const fileName = `THARI_Report_${typeKey.toUpperCase()}_${dateStr}.pdf`;
    const dialogTitle = preferredAction === 'share' ? 'مشاركة التقرير المالي (PDF)' : 'حفظ وطباعة التقرير المالي (PDF)';

    await exportAndSharePdfFile(pdfBlob, fileName, dialogTitle);
  } catch (err) {
    const errName = (err as Error)?.name;
    const errMsg = (err as Error)?.message || '';
    if (errName === 'AbortError' || errMsg.includes('cancel') || errMsg.includes('abort')) {
      return; // User cancelled
    }
    console.warn('Report export/share error:', err);
  } finally {
    isExportingActive = false;
  }
}

/**
 * Universally shares or downloads PDF files across iOS/Android Native (Capacitor Filesystem & Share Sheet),
 * Web Share API with files, and standard browser downloads.
 */
export async function exportAndSharePdfFile(
  pdfBlob: Blob,
  fileName: string,
  dialogTitle: string
): Promise<void> {
  const mimeType = 'application/pdf';

  // 1. Native iOS / Android Platform (Capacitor Filesystem + Share Sheet)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      });

      await Share.share({
        title: dialogTitle,
        url: result.uri,
        dialogTitle: dialogTitle,
      });
      return; // Success -> stop completely (no fallback)
    } catch (e) {
      const errName = (e as Error).name;
      const errMsg = (e as Error).message || '';
      if (errName === 'AbortError' || errMsg.includes('cancel') || errMsg.includes('abort')) {
        return; // User cancelled share sheet -> stop
      }
      console.warn('Native PDF Filesystem/Share failed:', e);
    }
  }

  // 2. Web Share API with files (iPhone Safari / Android Chrome PWA)
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([pdfBlob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: dialogTitle,
          text: dialogTitle,
          files: [file],
        });
        return; // Success -> stop completely
      }
    } catch (err) {
      const errName = (err as Error).name;
      if (errName === 'AbortError' || (err as Error).message?.includes('cancel')) {
        return; // User cancelled share dialog -> stop
      }
      console.warn('Web Share API PDF failed, falling back to download:', err);
    }
  }

  // 3. Web Browser / Fallback Download Handler
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('PDF download fallback error:', err);
  }
}

/**
 * Universally writes and shares modern Excel (.xlsx) workbooks across Native iOS/Android
 * (Capacitor Filesystem & Native Share Sheet), Web Share API with files, and browser downloads.
 */
export async function exportAndShareXlsxFile(
  workbook: any,
  fileName: string,
  dialogTitle = 'تصدير كشف حساب Excel (XLSX)'
): Promise<void> {
  const XLSX = await import('xlsx');
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // 1. Native iOS / Android Platform (Capacitor Filesystem + Share Sheet)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      });

      await Share.share({
        title: dialogTitle,
        url: result.uri,
        dialogTitle: dialogTitle,
      });
      return;
    } catch (e) {
      const errName = (e as Error).name;
      const errMsg = (e as Error).message || '';
      if (errName === 'AbortError' || errMsg.includes('cancel') || errMsg.includes('abort')) {
        return;
      }
      console.warn('Native XLSX Filesystem/Share failed, falling back:', e);
    }
  }

  // 2. Web Share API with files (iOS Safari / Android Chrome)
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], { type: mimeType });

  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: dialogTitle,
          text: dialogTitle,
          files: [file],
        });
        return;
      }
    } catch (err) {
      const errName = (err as Error).name;
      if (errName === 'AbortError' || (err as Error).message?.includes('cancel')) {
        return;
      }
      console.warn('Web Share API XLSX failed, falling back to download:', err);
    }
  }

  // 3. Web Browser Download Trigger
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('XLSX download fallback error:', err);
  }
}

/**
 * Universally writes and shares files across Native iOS/Android (Capacitor Filesystem & Share Sheet)
 * and Web Browser downloads (specifically for Excel .xls files).
 */
export async function exportAndShareNativeFile(
  fileContent: string,
  fileName: string,
  mimeType = 'application/json',
  dialogTitle = 'تصدير ومشاركة ملف ثري'
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: fileContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: dialogTitle,
        url: result.uri,
        dialogTitle: dialogTitle,
      });
      return;
    } catch (e) {
      const errName = (e as Error).name;
      const errMsg = (e as Error).message || '';
      if (errName === 'AbortError' || errMsg.includes('cancel') || errMsg.includes('abort')) {
        return;
      }
      console.warn('Native Filesystem/Share failed:', e);
    }
  }

  if (navigator.share && navigator.canShare) {
    try {
      const blob = new Blob([fileContent], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: dialogTitle,
          text: dialogTitle,
          files: [file],
        });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError' || (err as Error).message?.includes('cancel')) {
        return;
      }
    }
  }

  try {
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('Export download error:', err);
  }
}
