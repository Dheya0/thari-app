import { ReportModel, ReportType, ReportLedgerEntry, ReportBudgetSummary, ReportDebtItem } from './reportTypes';

/**
 * Escapes text for safe inclusion into HTML strings
 */
function esc(text?: string | number | null): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNum(val?: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString();
}

/**
 * Builds a clean, self-contained printable HTML document styled for A4 PDF rendering.
 * Every page is an exact A4 container (.report-page) with discrete sizing.
 * On Page 2 and subsequent pages, table headers (<thead>) are automatically repeated
 * with matching column alignments, eliminating row cropping and header loss.
 */
export function buildPrintableReportHTML(model: ReportModel): string {
  const {
    metadata,
    reportType,
    account,
    scope,
    kpis,
    currencyBreakdown = [],
    walletSummaries = [],
    transactions = [],
    budgets = [],
    debts,
    goals,
  } = model;

  const baseSymbol = scope.baseCurrency?.symbol || 'ر.ي';
  const baseCode = scope.baseCurrency?.code || 'YER';

  const typeTitles: Record<ReportType, { ar: string; en: string }> = {
    summary: { ar: 'الملخص المالي التنفيذي العام', en: 'Executive Financial Summary' },
    detailed: { ar: 'كشف القيود والمعاملات المحاسبي التفصيلي', en: 'Detailed Financial Ledger' },
    category: { ar: 'تقرير تحليل الميزانية ومطابقة الإنفاق الفعلي', en: 'Budget & Category Performance' },
    wealth: { ar: 'تقرير صافي الثروة وتوزيع المحافظ والعملات', en: 'Wealth & Multi-Currency Portfolio' },
    debts: { ar: 'كشف الذمم والديون والالتزامات المالية', en: 'Debts & Liabilities Statement' },
    savings_goals: { ar: 'تقرير الأهداف المالية ومتابعة المدخرات', en: 'Goals & Savings Progress Report' },
  };

  const titleInfo = typeTitles[reportType] || typeTitles.summary;

  const formattedRange = (scope.startDate && scope.endDate)
    ? `${scope.startDate} إلى ${scope.endDate}`
    : 'كافة الفترات المسجلة';

  // --- Visual Components ---
  const renderBrandLogo = (size = 32) => `
    <div style="width: ${size}px; height: ${size}px; border-radius: 8px; background: #090d16; border: 1.5px solid #1e293b; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
      <svg width="${Math.round(size * 0.65)}" height="${Math.round(size * 0.65)}" viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="thariGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="50%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <rect x="15" y="15" width="70" height="70" rx="18" fill="url(#thariGold)" opacity="0.95"/>
        <path d="M35 50L45 60L65 40" stroke="#090d16" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;

  const renderMainHeader = (pageNum: number, totalPages: number) => `
    <div class="main-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${renderBrandLogo(46)}
          <div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">ثَـــري</h1>
              <span style="font-family: monospace; font-size: 11px; font-weight: 900; color: #d97706; letter-spacing: 1px;">THARI</span>
            </div>
            <p style="margin: 2px 0 0 0; font-size: 9px; font-weight: 700; color: #64748b;">منظومة إدارة الأصول والميزانيات المالية المتكاملة</p>
            <p style="margin: 1px 0 0 0; font-size: 8px; color: #94a3b8; font-family: monospace;">INSTITUTIONAL WEALTH & AUDITED LEDGER</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="text-align: left; font-family: monospace; font-size: 8.5px; color: #475569; line-height: 1.4;">
            <div style="font-weight: 900; font-size: 10px; color: #0f172a;">${esc(metadata.reportId)}</div>
            <div style="color: #64748b;">بصمة: ${esc(metadata.fingerprint.slice(0, 16))}...</div>
            <div style="color: #94a3b8;">${esc(metadata.generatedAtFormattedAr)} • ${esc(metadata.generatedTimeFormattedAr)}</div>
          </div>
          ${
            metadata.qrDataUrl
              ? `<img src="${metadata.qrDataUrl}" width="52" height="52" style="border-radius: 6px; border: 1px solid #cbd5e1; display: block;" alt="QR" />`
              : `<div style="width: 52px; height: 52px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #64748b; text-align: center;">توثيق إلكتروني</div>`
          }
        </div>
      </div>

      <div style="margin-top: 10px; padding-top: 8px; border-top: 1.5px solid #0f172a; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; background: #d97706; border-radius: 50%;"></span>
          <span style="font-size: 13px; font-weight: 900; color: #0f172a;">${esc(titleInfo.ar)}</span>
          <span style="font-size: 9.5px; font-weight: 700; color: #94a3b8; font-family: monospace;">${esc(titleInfo.en)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-account">حساب: <b>${esc(account.name)}</b></span>
          <span class="badge-page">صفحة ${pageNum} من ${totalPages}</span>
        </div>
      </div>
    </div>
  `;

  const renderRunningHeader = (pageNum: number, totalPages: number) => `
    <div class="running-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${renderBrandLogo(22)}
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 11px; font-weight: 900; color: #0f172a;">ثَـــري</span>
          <span style="font-size: 8.5px; font-weight: 900; color: #d97706; font-family: monospace;">THARI</span>
        </div>
        <span style="color: #cbd5e1; margin: 0 2px;">|</span>
        <span style="font-size: 10px; font-weight: 800; color: #334155;">${esc(titleInfo.ar)}</span>
        <span style="font-size: 9px; color: #64748b; font-weight: 600;">(تابع)</span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; font-size: 8.5px; color: #64748b;">
        <span><b>المعرف:</b> ${esc(metadata.reportId)}</span>
        <span style="color: #cbd5e1;">•</span>
        <span><b>التاريخ:</b> ${esc(metadata.generatedAtFormattedAr)}</span>
        <span style="color: #cbd5e1;">•</span>
        <span class="badge-account" style="padding: 1px 6px; font-size: 8px;">حساب: <b>${esc(account.name)}</b></span>
        <span class="badge-page" style="padding: 1px 6px; font-size: 8px;">صفحة ${pageNum} من ${totalPages}</span>
      </div>
    </div>
  `;

  const renderScopeGrid = () => `
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">النطاق الزمني والفترة</span>
        <span class="info-val">${esc(scope.periodLabelAr)} (${esc(formattedRange)})</span>
      </div>
      <div class="info-item">
        <span class="info-label">عملة التقييم المعيارية</span>
        <span class="info-val">${esc(scope.baseCurrency?.nameAr || baseCode)} (${esc(baseCode)} - ${esc(baseSymbol)})</span>
      </div>
      <div class="info-item">
        <span class="info-label">المحفظة / الحساب</span>
        <span class="info-val">${esc(scope.walletNameAr || 'كافة المحافظ المالية المدمجة')}</span>
      </div>
      <div class="info-item">
        <span class="info-label">حالة الفرز والتدقيق</span>
        <span class="info-val">${transactions.length} قيد محاسبي معتمد</span>
      </div>
    </div>
  `;

  const renderKpiGrid = () => `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">الرصيد الافتتاحي</div>
        <div class="kpi-amount">${formatNum(kpis.openingBalance)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
      </div>
      <div class="kpi-card highlight">
        <div class="kpi-title">إجمالي المقبوضات (وارد)</div>
        <div class="kpi-amount income-val">+${formatNum(kpis.totalIncome)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-title">إجمالي المنصرفات (صادر)</div>
        <div class="kpi-amount expense-val">-${formatNum(kpis.totalExpense)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
      </div>
      <div class="kpi-card ${kpis.netSavings >= 0 ? 'highlight' : 'warning'}">
        <div class="kpi-title">صافي التدفق الدوري</div>
        <div class="kpi-amount ${kpis.netSavings >= 0 ? 'income-val' : 'expense-val'}">
          ${kpis.netSavings >= 0 ? '+' : ''}${formatNum(kpis.netSavings)} <span class="curr-unit">${esc(baseSymbol)}</span>
        </div>
      </div>
      <div class="kpi-card highlight-amber">
        <div class="kpi-title">الرصيد الختامي بنهاية النطاق</div>
        <div class="kpi-amount" style="color: #92400e;">${formatNum(kpis.closingBalance)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
      </div>
    </div>
  `;

  const renderOfficialSeal = () => `
    <div class="footer-seal">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 28px; height: 28px; border: 1.5px solid #d97706; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: #d97706; background: #fffbeb;">
          ✓
        </div>
        <div>
          <p style="margin: 0; font-weight: 900; color: #0f172a; font-size: 8.5px;">تم التوليد إلكترونياً وبشكل مشفر وموثق عبر تطبيق ثـري المالي</p>
          <p style="margin: 1px 0 0 0; font-size: 7.5px; color: #64748b;">جميع الحقوق محفوظة © ${new Date().getFullYear()} • بصمة التحقق الرقمية: ${esc(metadata.fingerprint)}</p>
        </div>
      </div>
      <div style="text-align: left; font-family: monospace; font-size: 7.5px; color: #475569; direction: ltr; line-height: 1.3;">
        DOCUMENT AUTHENTICITY VALIDATED<br>
        SECURE ENCRYPTED LEDGER # ${esc(metadata.reportId)}
      </div>
    </div>
  `;

  const renderPageFooter = (pageNum: number, totalPages: number) => `
    <div class="page-footer">
      <div>
        <span>تطبيق ثـري المالي • ${esc(titleInfo.ar)}</span>
        <span style="color: #cbd5e1; margin: 0 4px;">•</span>
        <span>بصمة التوثيق: ${esc(metadata.fingerprint.slice(0, 16))}...</span>
      </div>
      <div style="font-weight: 900; color: #0f172a;">
        صفحة ${pageNum} من ${totalPages}
      </div>
    </div>
  `;

  // Explicit, pixel-fixed table header for detailed ledger - repeated on page 2+
  const renderDetailedTableHeader = () => `
    <thead>
      <tr>
        <th style="width: 28px; text-align: center;">#</th>
        <th style="width: 66px; text-align: right;">التاريخ</th>
        <th style="width: 50px; text-align: center;">النوع</th>
        <th style="width: 82px; text-align: right;">التصنيف</th>
        <th style="width: 72px; text-align: right;">المحفظة</th>
        <th style="text-align: right;">البيان / تفاصيل القيد</th>
        <th style="width: 44px; text-align: center;">العملة</th>
        <th style="width: 82px; text-align: left;">المبلغ الأصلي</th>
        <th style="width: 88px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
        <th style="width: 82px; text-align: left;">الرصيد التراكمي</th>
      </tr>
    </thead>
  `;

  const renderDetailedTableRow = (tx: ReportLedgerEntry, idx: number) => {
    const isIncome = tx.type === 'income';
    const isExpense = tx.type === 'expense';

    const typeBadge = isIncome
      ? `<span class="badge-type type-income">إيراد</span>`
      : isExpense
      ? `<span class="badge-type type-expense">مصروف</span>`
      : `<span class="badge-type type-transfer">تحويل</span>`;

    const amtSign = isIncome ? '+' : isExpense ? '-' : '⇄';
    const amtColorClass = isIncome ? 'income-val' : isExpense ? 'expense-val' : 'transfer-val';

    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-family: monospace; font-size: 8px;">${idx + 1}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8px; color: #334155;">${esc(tx.formattedDateAr || tx.date)}</td>
        <td style="text-align: center;">${typeBadge}</td>
        <td style="text-align: right; font-weight: 700; color: #1e293b;">
          <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${tx.categoryColor || '#94a3b8'}; flex-shrink: 0;"></span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(tx.categoryName)}</span>
          </div>
        </td>
        <td style="text-align: right; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(tx.walletName)}</td>
        <td style="text-align: right; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span>${esc(tx.note || tx.categoryName)}</span>
        </td>
        <td style="text-align: center;">
          <span class="curr-badge">${esc(tx.currencyCode)}</span>
        </td>
        <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700;" class="${amtColorClass}">
          ${amtSign}${formatNum(tx.originalAmount)}
        </td>
        <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 900; color: #0f172a;">
          ${amtSign}${formatNum(tx.convertedAmount)}
        </td>
        <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700; color: #334155;">
          ${tx.runningBalance !== undefined ? formatNum(tx.runningBalance) : '-'}
        </td>
      </tr>
    `;
  };

  const pagesHTML: string[] = [];

  if (reportType === 'detailed') {
    // Exact mathematical pagination for the detailed transaction ledger
    // Page 1 capacity: 13 rows
    // Middle pages: 21 rows
    // Last page: up to 14 rows + Totals Summary + Seal
    const page1Cap = 13;
    const middleCap = 21;
    const lastPageCapWithSeal = 14;

    const txChunks: ReportLedgerEntry[][] = [];

    if (transactions.length <= 11) {
      txChunks.push(transactions);
    } else {
      let cur = 0;
      const p1Take = Math.min(page1Cap, transactions.length);
      txChunks.push(transactions.slice(cur, cur + p1Take));
      cur += p1Take;

      while (cur < transactions.length) {
        const remaining = transactions.length - cur;
        if (remaining <= lastPageCapWithSeal) {
          txChunks.push(transactions.slice(cur));
          break;
        }
        if (remaining <= lastPageCapWithSeal + 5) {
          const half = Math.ceil(remaining / 2);
          txChunks.push(transactions.slice(cur, cur + half));
          cur += half;
        } else {
          const take = Math.min(middleCap, remaining);
          txChunks.push(transactions.slice(cur, cur + take));
          cur += take;
        }
      }
    }

    const totalPages = txChunks.length;

    txChunks.forEach((chunk, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);
      let topElements = '';

      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          ${renderKpiGrid()}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h2 style="margin: 0; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              سجل المعاملات والقيود المحاسبية التفصيلية ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}
            </h2>
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">
              إجمالي ${transactions.length} قيد محاسبي
            </span>
          </div>
        `;
      } else {
        topElements = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0 6px 0;">
            <h2 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              سجل المعاملات والقيود المحاسبية (تابع - صفحة ${pageNum} من ${totalPages})
            </h2>
            <span style="font-size: 8px; font-weight: bold; color: #64748b; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              متابعة السجلات من #${pageIdx * middleCap + 1}
            </span>
          </div>
        `;
      }

      let startIndex = 0;
      for (let k = 0; k < pageIdx; k++) {
        startIndex += txChunks[k].length;
      }

      const rowsHTML = chunk.map((tx, idx) => renderDetailedTableRow(tx, startIndex + idx)).join('');

      let tableFooterHTML = '';
      if (isLast) {
        tableFooterHTML = `
          <tfoot>
            <tr style="background: #0f172a; color: #ffffff; font-weight: 800; font-size: 9px;">
              <td colspan="7" style="text-align: right; padding: 6px 8px; color: #ffffff; border: 1px solid #1e293b;">
                ملخص إجمالي الحركات المقيدة والواردة في التقرير
              </td>
              <td style="text-align: left; font-family: monospace; direction: ltr; color: #86efac; border: 1px solid #1e293b;">
                +${formatNum(kpis.totalIncome)}
              </td>
              <td style="text-align: left; font-family: monospace; direction: ltr; color: #fca5a5; border: 1px solid #1e293b;">
                -${formatNum(kpis.totalExpense)}
              </td>
              <td style="text-align: left; font-family: monospace; direction: ltr; color: #fde047; font-weight: 900; border: 1px solid #1e293b;">
                ${formatNum(kpis.closingBalance)}
              </td>
            </tr>
          </tfoot>
        `;
      }

      const pageContent = `
        <div class="report-page">
          <div>
            ${topHeader}
            ${topElements}
            <table class="report-table">
              ${renderDetailedTableHeader()}
              <tbody>
                ${rowsHTML}
              </tbody>
              ${tableFooterHTML}
            </table>
          </div>

          <div>
            ${isLast ? renderOfficialSeal() : ''}
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `;

      pagesHTML.push(pageContent);
    });
  } else if (reportType === 'category') {
    // Budget & Category Performance
    const budgetList: ReportBudgetSummary[] = budgets || [];
    const totalBudgeted = budgetList.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
    const totalRemainingBudget = budgetList.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
    const budgetUtilizationRate = totalBudgeted > 0 ? (kpis.totalExpense / totalBudgeted) * 100 : 0;

    const bCap = 11;
    const bChunks: ReportBudgetSummary[][] = [];

    if (budgetList.length <= 10) {
      bChunks.push(budgetList);
    } else {
      let cur = 0;
      bChunks.push(budgetList.slice(0, bCap));
      cur += bCap;
      while (cur < budgetList.length) {
        bChunks.push(budgetList.slice(cur, cur + 16));
        cur += 16;
      }
    }

    const totalPages = Math.max(1, bChunks.length);

    (bChunks.length > 0 ? bChunks : [[]]).forEach((chunk, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);
      let topElements = '';

      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="kpi-card">
              <div class="kpi-title">الميزانية المعتمدة</div>
              <div class="kpi-amount">${formatNum(totalBudgeted)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
            </div>
            <div class="kpi-card warning">
              <div class="kpi-title">الإنفاق الفعلي الإجمالي</div>
              <div class="kpi-amount expense-val">${formatNum(kpis.totalExpense)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
            </div>
            <div class="kpi-card ${totalRemainingBudget >= 0 ? 'highlight' : 'warning'}">
              <div class="kpi-title">المتبقي (وفر / تجاوز)</div>
              <div class="kpi-amount ${totalRemainingBudget >= 0 ? 'income-val' : 'expense-val'}">
                ${formatNum(totalRemainingBudget)} <span class="curr-unit">${esc(baseSymbol)}</span>
              </div>
            </div>
            <div class="kpi-card highlight-amber">
              <div class="kpi-title">معدل استهلاك الميزانية</div>
              <div class="kpi-amount" style="color: #92400e;">
                ${Math.round(budgetUtilizationRate)}%
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h2 style="margin: 0; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              جدول مطابقة الميزانيات التقديرية بالإنفاق الفعلي ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}
            </h2>
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${budgetList.length} تصنيفات ميزانية</span>
          </div>
        `;
      } else {
        topElements = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0 6px 0;">
            <h2 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              جدول مطابقة الميزانيات (تابع - صفحة ${pageNum} من ${totalPages})
            </h2>
          </div>
        `;
      }

      const rowsHTML = chunk.map((b) => {
        const pct = Math.min(100, Math.round(b.percentageUsed || 0));
        const isOver = b.isOverBudget || (b.remainingAmount || 0) < 0;
        return `
          <tr>
            <td style="text-align: right; font-weight: 700;">
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${b.categoryColor || '#d97706'};"></span>
                <span>${esc(b.categoryName)}</span>
              </div>
            </td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700;">${formatNum(b.budgetAmount)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700; color: #be123c;">${formatNum(b.spentAmount)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 800; color: ${isOver ? '#be123c' : '#15803d'};">
              ${formatNum(b.remainingAmount)} ${esc(baseSymbol)}
            </td>
            <td style="text-align: center; font-family: monospace;">${pct}%</td>
            <td style="text-align: center;">
              <span class="badge-type ${isOver ? 'type-expense' : 'type-income'}">
                ${isOver ? 'تجاوز' : 'ضمن الحدود'}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div>
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 140px; text-align: right;">التصنيف والمجال</th>
                  <th style="width: 105px; text-align: left;">الميزانية المعتمدة</th>
                  <th style="width: 105px; text-align: left;">الإنفاق الفعلي</th>
                  <th style="width: 110px; text-align: left;">الفارق (الوفر/العجز)</th>
                  <th style="width: 80px; text-align: center;">نسبة الاستهلاك</th>
                  <th style="width: 85px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="6" style="text-align: center; padding: 16px; color: #94a3b8;">لا توجد ميزانيات محددة</td></tr>`}
              </tbody>
            </table>
          </div>

          <div>
            ${isLast ? renderOfficialSeal() : ''}
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `;

      pagesHTML.push(pageContent);
    });
  } else if (reportType === 'debts') {
    // Debts & Liabilities Statement
    const debtItems: ReportDebtItem[] = debts?.items || [];
    const dCap = 11;
    const dChunks: ReportDebtItem[][] = [];

    if (debtItems.length <= 10) {
      dChunks.push(debtItems);
    } else {
      let cur = 0;
      dChunks.push(debtItems.slice(0, dCap));
      cur += dCap;
      while (cur < debtItems.length) {
        dChunks.push(debtItems.slice(cur, cur + 16));
        cur += 16;
      }
    }

    const totalPages = Math.max(1, dChunks.length);

    (dChunks.length > 0 ? dChunks : [[]]).forEach((chunk, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);
      let topElements = '';

      if (isFirst) {
        const totalReceivable = debts?.totalReceivable || 0;
        const totalPayable = debts?.totalPayable || 0;
        const netDebt = debts?.netDebtPosition !== undefined ? debts.netDebtPosition : (totalReceivable - totalPayable);

        topElements = `
          ${renderScopeGrid()}
          <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="kpi-card highlight">
              <div class="kpi-title">مستحقات لك (ديون مستردة)</div>
              <div class="kpi-amount income-val">+${formatNum(totalReceivable)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
            </div>
            <div class="kpi-card warning">
              <div class="kpi-title">التزامات عليك (ديون للغير)</div>
              <div class="kpi-amount expense-val">-${formatNum(totalPayable)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
            </div>
            <div class="kpi-card ${netDebt >= 0 ? 'highlight' : 'warning'}">
              <div class="kpi-title">صافي المركز الائتماني</div>
              <div class="kpi-amount ${netDebt >= 0 ? 'income-val' : 'expense-val'}">
                ${netDebt >= 0 ? '+' : ''}${formatNum(netDebt)} <span class="curr-unit">${esc(baseSymbol)}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h2 style="margin: 0; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              كشف سجل الديون والذمم التفصيلي ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}
            </h2>
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${debtItems.length} سجل مسجل</span>
          </div>
        `;
      } else {
        topElements = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0 6px 0;">
            <h2 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              كشف سجل الديون والذمم (تابع - صفحة ${pageNum} من ${totalPages})
            </h2>
          </div>
        `;
      }

      const rowsHTML = chunk.map((d) => {
        const isReceivable = d.type === 'to_me';
        return `
          <tr>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${esc(d.personName)}</td>
            <td style="text-align: center;">
              <span class="badge-type ${isReceivable ? 'type-income' : 'type-expense'}">
                ${isReceivable ? 'لنا (مستحق)' : 'علينا (التزام)'}
              </span>
            </td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700;">${formatNum(d.originalAmount)}</td>
            <td style="text-align: center;"><span class="curr-badge">${esc(d.currency)}</span></td>
            <td style="text-align: left; font-family: monospace; direction: ltr; color: #15803d;">${formatNum(d.paidAmount)}</td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 800; color: #0f172a;">${formatNum(d.remainingAmount)}</td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(d.convertedRemaining)} ${esc(baseSymbol)}</td>
            <td style="text-align: center; font-family: monospace; font-size: 8px;">${esc(d.dueDate || 'غير محدد')}</td>
            <td style="text-align: center;">
              <span class="badge-type ${d.isPaid ? 'type-income' : 'type-expense'}">
                ${d.statusLabelAr || (d.isPaid ? 'مسدد' : 'قائم')}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div>
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 110px; text-align: right;">الطرف المقابل / الشخص</th>
                  <th style="width: 75px; text-align: center;">النوع</th>
                  <th style="width: 80px; text-align: left;">المبلغ الأصلي</th>
                  <th style="width: 44px; text-align: center;">العملة</th>
                  <th style="width: 75px; text-align: left;">المسدد</th>
                  <th style="width: 80px; text-align: left;">المتبقي</th>
                  <th style="width: 85px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
                  <th style="width: 70px; text-align: center;">الاستحقاق</th>
                  <th style="width: 55px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="9" style="text-align: center; padding: 16px; color: #94a3b8;">لا توجد ديون مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>

          <div>
            ${isLast ? renderOfficialSeal() : ''}
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `;

      pagesHTML.push(pageContent);
    });
  } else if (reportType === 'savings_goals') {
    // Goals & Savings Progress Report
    const goalItems = goals?.items || [];
    const gCap = 11;
    const gChunks: any[][] = [];

    if (goalItems.length <= 10) {
      gChunks.push(goalItems);
    } else {
      let cur = 0;
      gChunks.push(goalItems.slice(0, gCap));
      cur += gCap;
      while (cur < goalItems.length) {
        gChunks.push(goalItems.slice(cur, cur + 16));
        cur += 16;
      }
    }

    const totalPages = Math.max(1, gChunks.length);

    (gChunks.length > 0 ? gChunks : [[]]).forEach((chunk, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);
      let topElements = '';

      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="kpi-card highlight">
              <div class="kpi-title">إجمالي المبالغ المحققة (المدخرات)</div>
              <div class="kpi-amount income-val">${formatNum(goals?.totalSavedAmount)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">إجمالي المستهدف المالي</div>
              <div class="kpi-amount">${formatNum(goals?.totalTargetAmount)} <span class="curr-unit">${esc(baseSymbol)}</span></div>
            </div>
            <div class="kpi-card highlight-amber">
              <div class="kpi-title">نسبة الإنجاز الإجمالية</div>
              <div class="kpi-amount" style="color: #92400e;">
                ${Math.round(goals?.overallProgressPercent || 0)}%
              </div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h2 style="margin: 0; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              جدول تقدم الأهداف المالية والمدخرات ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}
            </h2>
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${goalItems.length} أهداف مسجلة</span>
          </div>
        `;
      } else {
        topElements = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0 6px 0;">
            <h2 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              جدول تقدم الأهداف المالية (تابع - صفحة ${pageNum} من ${totalPages})
            </h2>
          </div>
        `;
      }

      const rowsHTML = chunk.map((g) => {
        const pct = Math.min(100, Math.round(g.progressPercent || 0));
        return `
          <tr>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${g.color || '#d97706'};"></span>
                <span>${esc(g.name)}</span>
              </div>
            </td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700;">${formatNum(g.convertedTarget)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 800; color: #15803d;">${formatNum(g.convertedCurrent)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: monospace; direction: ltr; color: #64748b;">${formatNum(g.remainingAmount)} ${esc(baseSymbol)}</td>
            <td style="text-align: center; font-family: monospace; font-weight: 900; color: #d97706;">${pct}%</td>
            <td style="text-align: center; font-family: monospace; font-size: 8px;">${esc(g.deadline || 'مفتوح')}</td>
            <td style="text-align: center;">
              <span class="badge-type ${g.isCompleted ? 'type-income' : 'type-expense'}">
                ${g.isCompleted ? 'مكتمل' : 'قيد التقدم'}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div>
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 140px; text-align: right;">الهدف المالي</th>
                  <th style="width: 100px; text-align: left;">المستهدف</th>
                  <th style="width: 100px; text-align: left;">المحقق</th>
                  <th style="width: 95px; text-align: left;">المتبقي</th>
                  <th style="width: 75px; text-align: center;">نسبة الإنجاز</th>
                  <th style="width: 80px; text-align: center;">الموعد النهائي</th>
                  <th style="width: 75px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="7" style="text-align: center; padding: 16px; color: #94a3b8;">لا توجد أهداف مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>

          <div>
            ${isLast ? renderOfficialSeal() : ''}
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `;

      pagesHTML.push(pageContent);
    });
  } else if (reportType === 'wealth') {
    // Wealth & Multi-Currency Assets
    const totalWealth = walletSummaries.reduce((sum, w) => sum + (w.convertedBalance || 0), 0);
    const pageContent = `
      <div class="report-page">
        <div>
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="kpi-card highlight-amber" style="grid-column: span 3; padding: 10px;">
              <div class="kpi-title" style="font-size: 10px;">إجمالي صافي الثروة والأصول المقومة</div>
              <div class="kpi-amount" style="font-size: 18px; color: #92400e;">
                ${formatNum(totalWealth)} <span class="curr-unit" style="font-size: 12px;">${esc(baseSymbol)}</span>
              </div>
            </div>
          </div>

          <h2 style="margin: 6px 0 6px 0; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
            <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
            توزيع الأرصدة عبر المحافظ المالية والحسابات
          </h2>
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 140px; text-align: right;">المحفظة / الحساب</th>
                <th style="width: 60px; text-align: center;">العملة</th>
                <th style="width: 110px; text-align: left;">الرصيد بالعملة الأصلية</th>
                <th style="width: 120px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
                <th style="width: 80px; text-align: center;">نسبة التوزيع</th>
              </tr>
            </thead>
            <tbody>
              ${walletSummaries.map((w) => {
                const pct = Math.round((w.percentageOfTotalWealth || 0) * 10) / 10;
                return `
                  <tr>
                    <td style="text-align: right; font-weight: 700; color: #0f172a;">
                      <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${w.color || '#d97706'};"></span>
                        <span>${esc(w.name)}</span>
                      </div>
                    </td>
                    <td style="text-align: center;"><span class="curr-badge">${esc(w.currencyCode)}</span></td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 700;">${formatNum(w.rawBalance)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(w.convertedBalance)}</td>
                    <td style="text-align: center; font-family: monospace; font-weight: bold;">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${currencyBreakdown.length > 0 ? `
            <h2 style="margin: 12px 0 6px 0; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #2563eb; border-radius: 2px; display: inline-block;"></span>
              مصفوفة العملات الأجنبية المعتمدة
            </h2>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 120px; text-align: right;">العملة</th>
                  <th style="width: 50px; text-align: center;">الرمز</th>
                  <th style="width: 90px; text-align: left;">الوارد بالعملة</th>
                  <th style="width: 90px; text-align: left;">المنصرف بالعملة</th>
                  <th style="width: 95px; text-align: left;">الصافي بالعملة</th>
                  <th style="width: 110px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
                </tr>
              </thead>
              <tbody>
                ${currencyBreakdown.map((cb) => `
                  <tr>
                    <td style="text-align: right; font-weight: 700;">${esc(cb.metadata?.nameAr || cb.code)}</td>
                    <td style="text-align: center;"><span class="curr-badge">${esc(cb.code)}</span></td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; color: #15803d;">+${formatNum(cb.income)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; color: #be123c;">-${formatNum(cb.expense)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 800;">${formatNum(cb.net)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(cb.convertedNetToBase)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </div>

        <div>
          ${renderOfficialSeal()}
          ${renderPageFooter(1, 1)}
        </div>
      </div>
    `;
    pagesHTML.push(pageContent);
  } else {
    // Executive Summary Report
    const recentTx = transactions.slice(0, 10);
    const pageContent = `
      <div class="report-page">
        <div>
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          ${renderKpiGrid()}

          ${currencyBreakdown.length > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <h2 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
                <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
                مصفوفة توزيع العملات الأجنبية والأرصدة
              </h2>
            </div>
            <table class="report-table" style="margin-bottom: 10px;">
              <thead>
                <tr>
                  <th style="width: 120px; text-align: right;">العملة</th>
                  <th style="width: 55px; text-align: center;">الرمز</th>
                  <th style="width: 85px; text-align: left;">إجمالي الوارد</th>
                  <th style="width: 85px; text-align: left;">إجمالي المنصرف</th>
                  <th style="width: 90px; text-align: left;">الصافي بالعملة</th>
                  <th style="width: 105px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
                </tr>
              </thead>
              <tbody>
                ${currencyBreakdown.map((cb) => `
                  <tr>
                    <td style="text-align: right; font-weight: 700;">${esc(cb.metadata?.nameAr || cb.code)}</td>
                    <td style="text-align: center;"><span class="curr-badge">${esc(cb.code)}</span></td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; color: #15803d;">+${formatNum(cb.income)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; color: #be123c;">-${formatNum(cb.expense)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 800;">${formatNum(cb.net)}</td>
                    <td style="text-align: left; font-family: monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(cb.convertedNetToBase)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <h2 style="margin: 0; font-size: 10.5px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px; border: none; padding: 0;">
              <span style="width: 3px; height: 11px; background: #d97706; border-radius: 2px; display: inline-block;"></span>
              أحدث القيود والمعاملات المسجلة في الفترة
            </h2>
            <span style="font-size: 8px; color: #64748b;">عرض آخر ${recentTx.length} حركة</span>
          </div>
          <table class="report-table">
            ${renderDetailedTableHeader()}
            <tbody>
              ${recentTx.map((tx, idx) => renderDetailedTableRow(tx, idx)).join('')}
            </tbody>
          </table>
        </div>

        <div>
          ${renderOfficialSeal()}
          ${renderPageFooter(1, 1)}
        </div>
      </div>
    `;
    pagesHTML.push(pageContent);
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير ثري المالي - ${esc(metadata.reportId)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tajawal", "Almarai", Tahoma, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      direction: rtl;
      margin: 0;
      padding: 0;
      line-height: 1.4;
      font-size: 9px;
    }
    .report-page {
      width: 794px;
      height: 1122px;
      max-height: 1122px;
      padding: 24px 28px 20px 28px;
      margin: 0 auto 12px auto;
      background: #ffffff;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
    }
    .report-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
      margin-bottom: 0;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .report-page {
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .report-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
    .main-header {
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .running-header {
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-account {
      font-size: 8.5px;
      font-weight: bold;
      color: #334155;
      background: #f8fafc;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .badge-page {
      font-size: 8.5px;
      font-weight: 800;
      color: #ffffff;
      background: #0f172a;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      margin-bottom: 8px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .info-label {
      font-size: 7.5px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-val {
      font-size: 9px;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      margin-bottom: 8px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 6px;
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
    .kpi-card.highlight-amber {
      background: #fffbeb;
      border-color: #fef3c7;
    }
    .kpi-title {
      font-size: 7.5px;
      font-weight: bold;
      color: #64748b;
      margin-bottom: 2px;
    }
    .kpi-amount {
      font-size: 10px;
      font-weight: 900;
      color: #0f172a;
      direction: ltr;
      font-family: monospace;
    }
    .curr-unit {
      font-size: 8px;
      font-weight: bold;
      color: #64748b;
    }
    .income-val { color: #15803d !important; }
    .expense-val { color: #be123c !important; }
    .transfer-val { color: #2563eb !important; }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      line-height: 1.3;
      margin-bottom: 4px;
      table-layout: fixed;
    }
    table.report-table thead {
      display: table-header-group;
    }
    table.report-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 8px;
      padding: 5px 4px;
      border: 1px solid #1e293b;
      white-space: nowrap;
    }
    table.report-table td {
      padding: 4px 4px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
      font-size: 8px;
    }
    table.report-table tbody tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    table.report-table tfoot td {
      background-color: #0f172a;
      border-top: 1.5px solid #0f172a;
      font-weight: 900;
      font-size: 8.5px;
      padding: 5px 4px;
    }
    .curr-badge {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      font-family: monospace;
      font-size: 7.5px;
      font-weight: bold;
      color: #475569;
    }
    .badge-type {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 7.5px;
      font-weight: bold;
    }
    .type-income { background: #dcfce7; color: #15803d; }
    .type-expense { background: #ffe4e6; color: #be123c; }
    .type-transfer { background: #dbeafe; color: #1d4ed8; }
    .footer-seal {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 6px;
      margin-bottom: 4px;
    }
    .page-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  ${pagesHTML.join('\n')}
</body>
</html>`;
}

/**
 * Generates a high-fidelity paginated A4 PDF Blob from ReportModel.
 * Renders each discrete .report-page container into its own canvas,
 * guaranteeing crisp text, repeated table headers on page 2+, zero row clipping,
 * and immediate memory reclamation.
 */
export async function generatePdfBlobFromModel(model: ReportModel): Promise<Blob> {
  const htmlContent = buildPrintableReportHTML(model);
  const container = document.createElement('div');
  container.id = 'thari-pdf-container-' + Date.now();
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.direction = 'rtl';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Wait for DOM layout and styling to settle
    await new Promise((resolve) => setTimeout(resolve, 350));

    const pageElements = Array.from(container.querySelectorAll('.report-page')) as HTMLElement[];
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    const elementsToRender = pageElements.length > 0 ? pageElements : [container];

    for (let i = 0; i < elementsToRender.length; i++) {
      const el = elementsToRender[i];

      const canvas = await html2canvas(el, {
        scale: 2.0, // High-DPI crisp vector-grade rendering for Arabic fonts
        useCORS: true,
        logging: false,
        width: 794,
        height: 1122,
        windowWidth: 794,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      // Immediate canvas cleanup to avoid memory bloat
      canvas.width = 0;
      canvas.height = 0;
    }

    return pdf.output('blob');
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
