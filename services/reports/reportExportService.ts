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
export async function exportAndShareReportCSV(csvContent: string, fileName?: string): Promise<void> {
  const actualFileName = fileName || `THARI_Report_${new Date().toISOString().split('T')[0]}.csv`;
  await exportAndShareNativeFile(csvContent, actualFileName, 'text/csv;charset=utf-8;', 'تقرير ثري المالي (Excel CSV)');
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
  }
}

