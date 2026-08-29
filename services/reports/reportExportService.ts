import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ReportModel } from './reportTypes';

function escapeCSV(val: any): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a structured, multi-section CSV file for Excel
 */
export function buildExcelReportCSV(model: ReportModel): string {
  const { metadata, reportType, account, scope, kpis, currencyBreakdown, expenseCategories, incomeCategories, walletSummaries, transactions } = model;
  const lines: string[] = [];

  const baseSymbol = scope.baseCurrency.symbol;
  const isSummary = reportType === 'summary';

  // Section 1: Official Header & Metadata
  lines.push(`========================================================================================================`);
  lines.push(`تطبيق ثـري المالي - ${isSummary ? 'الملخص المالي التنفيذي' : 'كشف القيود والمعاملات المالية التفصيلي'} | THARI Financial Report`);
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

  // Section 3: Multi-Currency Breakdown (Only if multi-currency or breakdown exists)
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

  // Section 4: Wallet Allocation
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

  // Section 5: Expense Categories Breakdown
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

  // Section 6: Income Sources Breakdown
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
  lines.push(`تنويه تقني,تم استخراج هذا التقرير المالي آلياً عبر تطبيق ثـري. البيانات محفوظة محلياً ومشفرة بالكامل على جهاز المستخدم.`);
  lines.push(`رمز التحقق,${escapeCSV(metadata.fingerprint)} | QR-ENCODED`);
  lines.push(`========================================================================================================`);

  return '\ufeff' + lines.join('\n');
}

/**
 * Builds a gorgeous, highly structured professional multi-table HTML spreadsheet (.xls) for Microsoft Excel & Google Sheets
 */
export function buildExcelReportHTML(model: ReportModel): string {
  const { metadata, reportType, account, scope, kpis, currencyBreakdown, expenseCategories, incomeCategories, walletSummaries, transactions } = model;
  const baseSymbol = scope.baseCurrency.symbol;
  const isSummary = reportType === 'summary';
  const displayTxs = isSummary ? transactions.slice(0, 15) : transactions;

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
  <h1>تطبيق ثـري المالي - ${isSummary ? 'الملخص المالي التنفيذي' : 'كشف القيود والمعاملات التفصيلي'}</h1>
  
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

  <h2>جدول القيود المحاسبية والمعاملات المسجلة (${displayTxs.length} حركة)</h2>
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
    ${displayTxs.map(t => {
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

  <br>
  <p style="font-size: 9pt; color: #64748b; text-align: center;">
    تنويه: تم تصدير هذا التقرير المالي آلياً بصيغة Excel المتكاملة من تطبيق ثـري المالي. جميع البيانات مشفرة ومحفوظة محلياً على جهازك. | بصمة التحقق: ${metadata.fingerprint}
  </p>
</body>
</html>
  `;
}

/**
 * Exports CSV content to device download or native share
 */
/**
 * Exports CSV content to device download or native share
 */
export async function exportAndShareReportCSV(csvContent: string, fileName?: string): Promise<void> {
  const actualFileName = fileName || `THARI_Report_${new Date().toISOString().split('T')[0]}.csv`;
  await exportAndShareNativeFile(csvContent, actualFileName, 'text/csv;charset=utf-8;', 'تقرير ثري المالي (Excel CSV)');
}

/**
 * Builds a comprehensive, self-contained printable HTML document styled for A4/Letter PDF print
 * and iOS/Android mobile viewing and printing.
 */
export function buildPrintableReportHTML(model: ReportModel, autoPrint = false): string {
  const { metadata, reportType, account, scope, kpis, currencyBreakdown, expenseCategories, incomeCategories, walletSummaries, transactions } = model;
  const baseSymbol = scope.baseCurrency.symbol;
  const isSummary = reportType === 'summary';
  const displayTxs = isSummary ? transactions.slice(0, 15) : transactions;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>تقرير ثري المالي - ${metadata.reportId}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, Tahoma, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      direction: rtl;
      margin: 0;
      padding: 15px;
      line-height: 1.5;
      font-size: 12px;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .action-bar {
      position: sticky;
      top: 10px;
      z-index: 100;
      max-width: 900px;
      margin: 0 auto 15px auto;
      background: #0f172a;
      padding: 12px 18px;
      border-radius: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    }
    .action-bar button {
      background: #d97706;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .action-bar button.secondary {
      background: #334155;
      color: #f1f5f9;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 15px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      font-weight: bold;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 10.5px;
      color: #475569;
      text-align: left;
      direction: ltr;
      font-family: monospace;
    }
    .meta-box b {
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: bold;
      background: #f1f5f9;
      color: #334155;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 22px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .info-label {
      font-size: 10px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-val {
      font-size: 12.5px;
      font-weight: bold;
      color: #0f172a;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-bottom: 22px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .kpi-card.highlight {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .kpi-card.warning {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .kpi-card.amber {
      background: #fffbeb;
      border-color: #fef3c7;
    }
    .kpi-title {
      font-size: 10px;
      font-weight: bold;
      color: #64748b;
      margin-bottom: 5px;
    }
    .kpi-amount {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
    }
    .income-val { color: #15803d; }
    .expense-val { color: #be123c; }
    h2 {
      font-size: 13.5px;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 22px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    h2::before {
      content: "";
      width: 4px;
      height: 14px;
      background: #d97706;
      border-radius: 2px;
      display: inline-block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 11px;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: bold;
      padding: 8px 10px;
      text-align: right;
      border: 1px solid #334155;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      text-align: right;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .footer-seal {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
      page-break-inside: avoid;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .report-container {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <span style="color: #f8fafc; font-size: 12px; font-weight: bold;">وثيقة تقرير ثري المالي (جاهزة للطباعة والحفظ)</span>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print();">
        <span>🖨️ طباعة المستند / PDF</span>
      </button>
      <button class="secondary" onclick="if(navigator.share){navigator.share({title:'تقرير ثري', url: window.location.href}).catch(()=>{});}">
        <span>📤 مشاركة</span>
      </button>
    </div>
  </div>

  <div class="report-container">
    <div class="header">
      <div>
        <h1 class="brand-title">
          <span>ثَـــري</span>
          <span style="color: #d97706; font-size: 14px; font-family: monospace;">THARI</span>
        </h1>
        <p class="brand-sub">منظومة إدارة الأصول والميزانيات المالية المتكاملة</p>
        <p style="font-size: 9.5px; color: #94a3b8; margin: 2px 0 0 0;">Institutional Financial Suite & Wealth Management</p>
      </div>

      <div class="meta-box">
        <div><b>ID:</b> ${metadata.reportId}</div>
        <div><b>FP:</b> ${metadata.fingerprint.slice(0, 16)}...</div>
        <div><b>DATE:</b> ${metadata.generatedAtFormattedAr}</div>
        <div><b>TIME:</b> ${metadata.generatedTimeFormattedAr}</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <div>
        <span class="badge" style="background: #fef3c7; color: #92400e; font-size: 11px; padding: 4px 10px;">
          ${isSummary ? 'الملخص المالي التنفيذي (Executive Summary)' : 'كشف القيود والمعاملات المحاسبي (Detailed Ledger)'}
        </span>
      </div>
      <div style="font-weight: bold; font-size: 11px; color: #334155;">
        الحساب: <span style="color: #0f172a; font-weight: 900;">${account.name}</span> (${account.accountTypeAr})
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">نطاق التقرير</span>
        <span class="info-val">${scope.walletNameAr}</span>
      </div>
      <div class="info-item">
        <span class="info-label">العملة الأساسية</span>
        <span class="info-val">${scope.baseCurrency.code} (${scope.baseCurrency.symbol})</span>
      </div>
      <div class="info-item">
        <span class="info-label">فترة التقرير</span>
        <span class="info-val">${scope.periodLabelAr}</span>
      </div>
      <div class="info-item">
        <span class="info-label">إجمالي الحركات المشمولة</span>
        <span class="info-val">${kpis.totalTransactions} حركة مالية</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">الرصيد الافتتاحي</div>
        <div class="kpi-amount">${Math.round(kpis.openingBalance).toLocaleString()} ${baseSymbol}</div>
      </div>
      <div class="kpi-card highlight">
        <div class="kpi-title">إجمالي المقبوضات (+)</div>
        <div class="kpi-amount income-val">+${Math.round(kpis.totalIncome).toLocaleString()} ${baseSymbol}</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-title">إجمالي المصروفات (-)</div>
        <div class="kpi-amount expense-val">-${Math.round(kpis.totalExpense).toLocaleString()} ${baseSymbol}</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-title">صافي الفائض / العجز</div>
        <div class="kpi-amount" style="color: ${kpis.netSavings >= 0 ? '#15803d' : '#be123c'};">
          ${Math.round(kpis.netSavings).toLocaleString()} ${baseSymbol}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">الرصيد الختامي</div>
        <div class="kpi-amount">${Math.round(kpis.closingBalance).toLocaleString()} ${baseSymbol}</div>
      </div>
    </div>

    ${currencyBreakdown.length > 0 ? `
    <h2>تحليل وتوزيع العملات</h2>
    <table>
      <thead>
        <tr>
          <th>العملة</th>
          <th>اسم العملة</th>
          <th>عدد الحركات</th>
          <th>المقبوضات</th>
          <th>المنصرفات</th>
          <th>الصافي الفعلي</th>
          <th>المعادل بـ (${scope.baseCurrency.code})</th>
        </tr>
      </thead>
      <tbody>
        ${currencyBreakdown.map(cb => `
        <tr>
          <td><b>${cb.code}</b></td>
          <td>${cb.metadata.nameAr}</td>
          <td>${cb.transactionCount}</td>
          <td style="color: #15803d;">+${Math.round(cb.income).toLocaleString()} ${cb.metadata.symbol}</td>
          <td style="color: #be123c;">-${Math.round(cb.expense).toLocaleString()} ${cb.metadata.symbol}</td>
          <td style="font-weight: bold;">${Math.round(cb.net).toLocaleString()} ${cb.metadata.symbol}</td>
          <td><b>${Math.round(cb.convertedNetToBase).toLocaleString()} ${baseSymbol}</b></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${walletSummaries.length > 0 ? `
    <h2>توزيع أرصدة المحافظ</h2>
    <table>
      <thead>
        <tr>
          <th>المحفظة</th>
          <th>العملة</th>
          <th>الرصيد الفعلي</th>
          <th>الرصيد المعادل بـ (${scope.baseCurrency.code})</th>
          <th>الحصة من إجمالي الثروة</th>
        </tr>
      </thead>
      <tbody>
        ${walletSummaries.map(w => `
        <tr>
          <td><b>${w.name}</b></td>
          <td>${w.currencyCode}</td>
          <td>${Math.round(w.rawBalance).toLocaleString()} ${w.currencyCode}</td>
          <td><b>${Math.round(w.convertedBalance).toLocaleString()} ${baseSymbol}</b></td>
          <td>${w.percentageOfTotalWealth.toFixed(1)}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <h2>جدول القيود والمعاملات المسجلة (${displayTxs.length} حركة)</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>التاريخ</th>
          <th>النوع</th>
          <th>التصنيف</th>
          <th>المحفظة</th>
          <th>المبلغ</th>
          <th>العملة</th>
          <th>المعادل (${scope.baseCurrency.code})</th>
          <th>الرصيد التراكمي</th>
          <th>البيان</th>
        </tr>
      </thead>
      <tbody>
        ${displayTxs.map(t => {
          const sign = t.type === 'income' ? '+' : '-';
          return `
          <tr>
            <td>${t.index}</td>
            <td>${t.date}</td>
            <td style="font-weight: bold; color: ${t.type === 'income' ? '#15803d' : t.type === 'expense' ? '#be123c' : '#2563eb'};">${t.typeLabelAr}</td>
            <td>${t.categoryName}</td>
            <td>${t.walletName}</td>
            <td style="font-weight: bold; color: ${t.type === 'income' ? '#15803d' : '#be123c'};">${sign}${t.originalAmount.toLocaleString()}</td>
            <td>${t.currencyCode}</td>
            <td><b>${Math.round(t.convertedAmount).toLocaleString()} ${baseSymbol}</b></td>
            <td>${t.runningBalance !== undefined ? Math.round(t.runningBalance).toLocaleString() + ' ' + baseSymbol : '-'}</td>
            <td>${t.note || '-'}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="footer-seal">
      <div>
        <p style="margin: 0; font-weight: bold; color: #0f172a;">تم التوليد إلكترونياً وبشكل مشفر عبر تطبيق ثـري المالي</p>
        <p style="margin: 2px 0 0 0;">جميع الحقوق محفوظة © ${new Date().getFullYear()} • بصمة التحقق: ${metadata.fingerprint}</p>
      </div>
      <div style="text-align: left; font-family: monospace; font-size: 9px; color: #475569;">
        DOCUMENT AUTHENTICITY VALIDATED<br>
        SECURE LOCAL-STORAGE LEDGER
      </div>
    </div>
  </div>

  ${autoPrint ? `
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 400);
    });
  </script>
  ` : ''}
</body>
</html>`;
}

/**
 * Universally triggers print or share for any financial report model across iPhone, Android, and Desktop
 */
export async function printOrShareFinancialReport(
  model: ReportModel,
  preferredAction: 'print' | 'share' | 'excel' = 'print'
): Promise<void> {
  const isSummary = model.reportType === 'summary';
  const dateStr = new Date().toISOString().split('T')[0];

  if (preferredAction === 'excel') {
    const htmlContent = buildExcelReportHTML(model);
    const fileName = `THARI_${isSummary ? 'Summary' : 'Ledger'}_${dateStr}.xls`;
    await exportAndShareNativeFile(htmlContent, fileName, 'application/vnd.ms-excel;charset=utf-8;', 'تقرير ثري المالي (Excel)');
    return;
  }

  const printableHtml = buildPrintableReportHTML(model, preferredAction === 'print');
  const fileName = `THARI_Report_${isSummary ? 'Summary' : 'Detailed'}_${dateStr}.html`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 768);

  if (preferredAction === 'share' || isMobile) {
    // Attempt native file share (creates AirPrint and Save to Files on iOS)
    await exportAndShareNativeFile(
      printableHtml,
      fileName,
      'text/html;charset=utf-8;',
      preferredAction === 'print' ? 'طباعة وحفظ التقرير المالي كـ PDF' : 'مشاركة التقرير المالي'
    );
    return;
  }

  // Desktop Print Action: Open clean printable window
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn('Desktop popup print failed, fallback to main print:', e);
          window.print();
        }
      }, 500);
      return;
    }
  } catch (err) {
    console.warn('Popup print error:', err);
  }

  // Ultimate desktop fallback
  window.print();
}


/**
 * Universally writes and shares files across Native iOS/Android (Capacitor Filesystem & Share Sheet)
 * and Web Browser downloads.
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
      console.warn('Native Filesystem/Share failed, attempting fallback download:', e);
    }
  }

  // Check if Web Share API with Files is supported (ideal for iPhone Safari & Android Chrome)
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
      if ((err as Error).name !== 'AbortError') {
        console.warn('Web Share API failed, using download fallback:', err);
      } else {
        return; // User cancelled share dialog
      }
    }
  }

  // Web Browser / Fallback Download Handler
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
    // Ultimate fallback: open data URI in new tab
    try {
      const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(fileContent)}`;
      window.open(dataUri, '_blank');
    } catch (e2) {
      console.error('Data URI open error:', e2);
    }
  }
}

