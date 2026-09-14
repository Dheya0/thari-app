import { ReportModel, ReportType, ReportLedgerEntry, ReportBudgetSummary, ReportDebtItem, ReportGoalItem } from './reportTypes';

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
  return Math.round(val).toLocaleString('en-US');
}

/**
 * Builds a clean, bulletproof printable HTML document styled for A4 PDF rendering.
 * Uses strict Table and Block layouts (avoiding nested Flexbox/Grid which cause html2canvas overlap bugs)
 * guaranteeing 100% crisp typography, perfect spacing, and zero text collision.
 */
export function buildPrintableReportHTML(model: ReportModel): string {
  const {
    metadata,
    reportType,
    account,
    scope,
    kpis,
    currencyBreakdown = [],
    expenseCategories = [],
    walletSummaries = [],
    transactions = [],
    budgets = [],
    debts,
    goals,
  } = model;

  const baseSymbol = scope.baseCurrency?.symbol || 'SAR';
  const baseCode = scope.baseCurrency?.code || 'SAR';

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

  // --- Visual Brand Logo (Pure Vector SVG) ---
  const renderBrandLogo = (size = 36) => `
    <div style="width: ${size}px; height: ${size}px; border-radius: 8px; background: #090d16; border: 1.5px solid #1e293b; display: inline-block; vertical-align: middle; text-align: center; line-height: ${size}px;">
      <svg width="${Math.round(size * 0.65)}" height="${Math.round(size * 0.65)}" viewBox="0 0 100 100" fill="none" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="thariGoldLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="50%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <rect x="15" y="15" width="70" height="70" rx="18" fill="url(#thariGoldLogo)" opacity="0.95"/>
        <path d="M35 50L45 60L65 40" stroke="#090d16" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;

  // --- Main Header (Table layout for 100% overlap-free capture) ---
  const renderMainHeader = (pageNum: number, totalPages: number) => `
    <div style="margin-bottom: 8px;">
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 6px;">
        <tr>
          <!-- Right Column: Logo & Branding -->
          <td style="text-align: right; vertical-align: middle; width: 60%;">
            <table style="border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; padding-left: 10px;">
                  ${renderBrandLogo(38)}
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <div style="font-size: 19px; font-weight: 900; color: #0f172a; line-height: 1.2;">
                    ثَـــري <span style="font-family: 'Plus Jakarta Sans', monospace; font-size: 11px; font-weight: 900; color: #d97706; margin-right: 4px;">THARI</span>
                  </div>
                  <div style="font-size: 9px; font-weight: 700; color: #64748b; line-height: 1.4; margin-top: 2px;">
                    منظومة إدارة الأصول والميزانيات المالية المتكاملة
                  </div>
                </td>
              </tr>
            </table>
          </td>

          <!-- Left Column: Report ID & Meta -->
          <td style="text-align: left; vertical-align: middle; width: 40%;">
            <table style="border-collapse: collapse; margin-right: auto;">
              <tr>
                <td style="text-align: left; vertical-align: middle; padding-left: 8px; font-family: 'Plus Jakarta Sans', monospace; font-size: 8px; color: #475569; line-height: 1.4;">
                  <div style="font-weight: 900; font-size: 9.5px; color: #0f172a;">${esc(metadata.reportId)}</div>
                  <div style="color: #64748b;">بصمة: ${esc(metadata.fingerprint.slice(0, 16))}...</div>
                  <div style="color: #94a3b8;">${esc(metadata.generatedAtFormattedAr)}</div>
                </td>
                <td style="vertical-align: middle;">
                  ${
                    metadata.qrDataUrl
                      ? `<img src="${metadata.qrDataUrl}" width="46" height="46" style="border-radius: 4px; border: 1px solid #cbd5e1; display: block;" alt="QR" />`
                      : `<div style="width: 46px; height: 46px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 7.5px; font-weight: bold; color: #64748b; line-height: 46px;">توثيق</div>`
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Title Sub-Bar -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: right; vertical-align: middle;">
            <span style="display: inline-block; width: 6px; height: 6px; background: #d97706; border-radius: 50%; vertical-align: middle; margin-left: 6px;"></span>
            <span style="font-size: 12.5px; font-weight: 900; color: #0f172a; vertical-align: middle;">${esc(titleInfo.ar)}</span>
            <span style="font-size: 9px; font-weight: 700; color: #94a3b8; font-family: 'Plus Jakarta Sans', monospace; vertical-align: middle; margin-right: 6px;">${esc(titleInfo.en)}</span>
          </td>
          <td style="text-align: left; vertical-align: middle;">
            <span class="badge-account">حساب: <b>${esc(account.name)}</b></span>
            <span class="badge-page">صفحة ${pageNum} من ${totalPages}</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Running Header for Multi-Page Reports ---
  const renderRunningHeader = (pageNum: number, totalPages: number) => `
    <div style="border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: right; vertical-align: middle;">
            ${renderBrandLogo(20)}
            <span style="font-size: 11px; font-weight: 900; color: #0f172a; vertical-align: middle; margin-right: 4px;">ثَـــري</span>
            <span style="font-size: 8px; font-weight: 900; color: #d97706; font-family: 'Plus Jakarta Sans', monospace; vertical-align: middle;">THARI</span>
            <span style="color: #cbd5e1; margin: 0 4px; vertical-align: middle;">|</span>
            <span style="font-size: 9.5px; font-weight: 800; color: #334155; vertical-align: middle;">${esc(titleInfo.ar)}</span>
            <span style="font-size: 8.5px; color: #64748b; vertical-align: middle;">(تابع)</span>
          </td>
          <td style="text-align: left; vertical-align: middle; font-size: 8px; color: #64748b;">
            <span style="font-family: 'Plus Jakarta Sans', monospace; font-weight: bold; color: #0f172a;">${esc(metadata.reportId)}</span>
            <span style="color: #cbd5e1; margin: 0 3px;">•</span>
            <span class="badge-account" style="padding: 1px 5px; font-size: 7.5px;">حساب: <b>${esc(account.name)}</b></span>
            <span class="badge-page" style="padding: 1px 5px; font-size: 7.5px;">صفحة ${pageNum} من ${totalPages}</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Scope Grid (Strict Table Layout) ---
  const renderScopeGrid = () => {
    const periodVal = scope.periodLabelAr
      ? (formattedRange !== 'كافة الفترات المسجلة' ? `${scope.periodLabelAr} (${formattedRange})` : scope.periodLabelAr)
      : formattedRange;

    const currencyVal = scope.currencyFilter
      ? (scope.currencyMetadata?.nameAr || scope.currencyMetadata?.code || baseCode)
      : `متعدد العملات (${scope.baseCurrency?.nameAr || baseCode})`;

    const walletVal = scope.walletNameAr || 'كافة المحافظ المالية';

    return `
      <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; table-layout: fixed;">
        <tr>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top; border-left: 1px solid #e2e8f0;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; line-height: 1.4; margin-bottom: 2px;">النطاق الزمني والفترة</div>
            <div style="font-size: 9px; font-weight: 800; color: #0f172a; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(periodVal)}</div>
          </td>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top; border-left: 1px solid #e2e8f0;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; line-height: 1.4; margin-bottom: 2px;">عملة التقييم المعيارية</div>
            <div style="font-size: 9px; font-weight: 800; color: #0f172a; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(currencyVal)}</div>
          </td>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top; border-left: 1px solid #e2e8f0;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; line-height: 1.4; margin-bottom: 2px;">المحفظة / الحساب</div>
            <div style="font-size: 9px; font-weight: 800; color: #0f172a; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(walletVal)}</div>
          </td>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; line-height: 1.4; margin-bottom: 2px;">حالة الفرز والتدقيق</div>
            <div style="font-size: 9px; font-weight: 800; color: #0f172a; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${transactions.length} قيد محاسبي</div>
          </td>
        </tr>
      </table>
    `;
  };

  // --- Official Seal (Table Layout) ---
  const renderOfficialSeal = () => `
    <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px; margin-bottom: 4px;">
      <tr>
        <td style="text-align: right; vertical-align: middle; padding: 5px 8px;">
          <table style="border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle; padding-left: 8px;">
                <div style="width: 22px; height: 22px; border: 1.5px solid #d97706; border-radius: 50%; text-align: center; line-height: 20px; font-size: 11px; font-weight: 900; color: #d97706; background: #fffbeb;">✓</div>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <div style="font-weight: 800; color: #0f172a; font-size: 8px; line-height: 1.3;">تم التوليد إلكترونياً وبشكل مشفر وموثق عبر تطبيق ثـري المالي</div>
                <div style="font-size: 7px; color: #64748b; line-height: 1.3; margin-top: 1px;">جميع الحقوق محفوظة © ${new Date().getFullYear()} • بصمة التحقق: ${esc(metadata.fingerprint.slice(0, 24))}...</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align: left; vertical-align: middle; padding: 5px 8px; font-family: 'Plus Jakarta Sans', monospace; font-size: 7px; color: #475569; direction: ltr; line-height: 1.3;">
          DOCUMENT AUTHENTICITY VALIDATED<br>
          SECURE AUDITED LEDGER #${esc(metadata.reportId)}
        </td>
      </tr>
    </table>
  `;

  // --- Page Footer ---
  const renderPageFooter = (pageNum: number, totalPages: number) => `
    <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 3px; margin-top: 2px;">
      <tr>
        <td style="text-align: right; vertical-align: middle; font-size: 7.5px; color: #94a3b8; line-height: 1.4;">
          <span>تطبيق ثـري المالي • ${esc(titleInfo.ar)}</span>
          <span style="color: #cbd5e1; margin: 0 4px;">•</span>
          <span>بصمة التوثيق: ${esc(metadata.fingerprint.slice(0, 16))}...</span>
        </td>
        <td style="text-align: left; vertical-align: middle; font-size: 7.5px; font-weight: 900; color: #0f172a; line-height: 1.4;">
          صفحة ${pageNum} من ${totalPages}
        </td>
      </tr>
    </table>
  `;

  // --- 9-Column Detailed Ledger Table Header ---
  const renderDetailedTableHeader = () => `
    <thead>
      <tr>
        <th style="width: 28px; text-align: center;">#</th>
        <th style="width: 72px; text-align: center;">التاريخ</th>
        <th style="width: 95px; text-align: right;">التصنيف</th>
        <th style="width: 80px; text-align: right;">المحفظة</th>
        <th style="text-align: right;">البيان / تفاصيل القيد</th>
        <th style="width: 50px; text-align: center;">العملة</th>
        <th style="width: 85px; text-align: left;">المبلغ الأصلي</th>
        <th style="width: 90px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
        <th style="width: 90px; text-align: left;">الرصيد التراكمي</th>
      </tr>
    </thead>
  `;

  const renderDetailedTableRow = (tx: ReportLedgerEntry, idx: number) => {
    const isIncome = tx.type === 'income';
    const isExpense = tx.type === 'expense';
    const amtSign = isIncome ? '+' : isExpense ? '-' : '⇄';
    const amtColor = isIncome ? '#15803d' : isExpense ? '#be123c' : '#2563eb';

    return `
      <tr>
        <td style="text-align: center; color: #64748b; font-family: 'Plus Jakarta Sans', monospace; font-size: 8px;">${idx + 1}</td>
        <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-size: 8px; color: #334155; white-space: nowrap;">${esc(tx.date)}</td>
        <td style="text-align: right; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${tx.categoryColor || '#94a3b8'}; vertical-align: middle; margin-left: 4px;"></span>
          <span style="vertical-align: middle;">${esc(tx.categoryName)}</span>
        </td>
        <td style="text-align: right; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(tx.walletName)}</td>
        <td style="text-align: right; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${esc(tx.note || tx.categoryName)}">
          ${esc(tx.note || tx.categoryName)}
        </td>
        <td style="text-align: center; vertical-align: middle;">
          <span style="display: inline-block; padding: 2px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', monospace; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 1.2;">${esc(tx.currencyCode)}</span>
        </td>
        <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700; color: ${amtColor}; white-space: nowrap;">
          ${amtSign}${formatNum(tx.originalAmount)}
        </td>
        <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 900; color: #0f172a; white-space: nowrap;">
          ${amtSign}${formatNum(tx.convertedAmount)}
        </td>
        <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700; color: #334155; white-space: nowrap;">
          ${tx.runningBalance !== undefined ? formatNum(tx.runningBalance) : '-'}
        </td>
      </tr>
    `;
  };

  const pagesHTML: string[] = [];

  // ==========================================
  // 1. Detailed Ledger Report
  // ==========================================
  if (reportType === 'detailed') {
    const page1Cap = 11;
    const middleCap = 19;
    const lastPageCapWithSeal = 13;

    const txChunks: ReportLedgerEntry[][] = [];

    if (transactions.length <= 10) {
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
        if (remaining <= lastPageCapWithSeal + 4) {
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

    const totalPages = Math.max(1, txChunks.length);

    (txChunks.length > 0 ? txChunks : [[]]).forEach((chunk, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);
      let topElements = '';

      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          
          <!-- KPI Metrics Row (Table Layout) -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 8px; margin-right: -6px; margin-left: -6px; table-layout: fixed;">
            <tr>
              <td style="width: 25%; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #166534; line-height: 1.3; margin-bottom: 3px;">إجمالي المقبوضات (دائن)</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #15803d; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  +${formatNum(kpis.totalIncome)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 25%; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #9f1239; line-height: 1.3; margin-bottom: 3px;">إجمالي المنصرفات (مدين)</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #be123c; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  -${formatNum(kpis.totalExpense)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 25%; background: ${kpis.netSavings >= 0 ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${kpis.netSavings >= 0 ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: ${kpis.netSavings >= 0 ? '#166534' : '#9f1239'}; line-height: 1.3; margin-bottom: 3px;">صافي حركة الفترة</div>
                <div style="font-size: 11.5px; font-weight: 900; color: ${kpis.netSavings >= 0 ? '#15803d' : '#be123c'}; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${kpis.netSavings >= 0 ? '+' : ''}${formatNum(kpis.netSavings)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 25%; background: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #94a3b8; line-height: 1.3; margin-bottom: 3px;">الرصيد الختامي</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #fbbf24; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(kpis.closingBalance)} <span style="font-size: 8px; font-weight: bold; color: #cbd5e1;">${esc(baseSymbol)}</span>
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">سجل المعاملات والقيود المحاسبية التفصيلية ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}</span>
              </td>
              <td style="text-align: left; vertical-align: middle; font-size: 8px; font-weight: bold; color: #64748b;">
                إجمالي ${transactions.length} قيد محاسبي
              </td>
            </tr>
          </table>
        `;
      } else {
        topElements = `
          <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">سجل المعاملات والقيود المحاسبية (تابع - صفحة ${pageNum} من ${totalPages})</span>
              </td>
            </tr>
          </table>
        `;
      }

      let startIndex = 0;
      for (let k = 0; k < pageIdx; k++) {
        startIndex += (txChunks[k] ? txChunks[k].length : 0);
      }

      const rowsHTML = chunk.map((tx, idx) => renderDetailedTableRow(tx, startIndex + idx)).join('');

      let tableFooterHTML = '';
      if (isLast) {
        tableFooterHTML = `
          <tfoot>
            <tr style="background: #0f172a; color: #ffffff; font-weight: 800; font-size: 8.5px;">
              <td colspan="6" style="text-align: right; padding: 6px 6px; color: #ffffff; border: 1px solid #1e293b;">
                ملخص إجمالي الحركات المقيدة والواردة في التقرير
              </td>
              <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #86efac; border: 1px solid #1e293b;">
                +${formatNum(kpis.totalIncome)}
              </td>
              <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #fca5a5; border: 1px solid #1e293b;">
                -${formatNum(kpis.totalExpense)}
              </td>
              <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #fde047; font-weight: 900; border: 1px solid #1e293b;">
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
                ${rowsHTML || `<tr><td colspan="9" style="text-align: center; padding: 16px; color: #94a3b8;">لا توجد معاملات مسجلة في هذا النطاق</td></tr>`}
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
  }

  // ==========================================
  // 2. Budget & Category Performance Report
  // ==========================================
  else if (reportType === 'category') {
    const budgetList: ReportBudgetSummary[] = budgets || [];
    const totalBudgeted = budgetList.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
    const totalRemainingBudget = budgetList.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
    const budgetUtilizationRate = totalBudgeted > 0 ? (kpis.totalExpense / totalBudgeted) * 100 : 0;

    const bCap = 12;
    const bChunks: ReportBudgetSummary[][] = [];

    if (budgetList.length <= 11) {
      bChunks.push(budgetList);
    } else {
      let cur = 0;
      bChunks.push(budgetList.slice(0, bCap));
      cur += bCap;
      while (cur < budgetList.length) {
        bChunks.push(budgetList.slice(cur, cur + 18));
        cur += 18;
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
          
          <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 8px; margin-right: -6px; margin-left: -6px; table-layout: fixed;">
            <tr>
              <td style="width: 25%; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #64748b; line-height: 1.3; margin-bottom: 3px;">الميزانية المعتمدة</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #0f172a; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(totalBudgeted)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 25%; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #9f1239; line-height: 1.3; margin-bottom: 3px;">الإنفاق الفعلي الإجمالي</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #be123c; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(kpis.totalExpense)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 25%; background: ${totalRemainingBudget >= 0 ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${totalRemainingBudget >= 0 ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: ${totalRemainingBudget >= 0 ? '#166534' : '#9f1239'}; line-height: 1.3; margin-bottom: 3px;">المتبقي (وفر / عجز)</div>
                <div style="font-size: 11.5px; font-weight: 900; color: ${totalRemainingBudget >= 0 ? '#15803d' : '#be123c'}; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(totalRemainingBudget)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 25%; background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #92400e; line-height: 1.3; margin-bottom: 3px;">معدل استهلاك الميزانية</div>
                <div style="font-size: 11.5px; font-weight: 900; color: #b45309; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${Math.round(budgetUtilizationRate)}%
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">جدول مطابقة الميزانيات التقديرية بالإنفاق الفعلي ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}</span>
              </td>
              <td style="text-align: left; vertical-align: middle; font-size: 8px; font-weight: bold; color: #64748b;">
                ${budgetList.length} تصنيف ميزانية
              </td>
            </tr>
          </table>
        `;
      } else {
        topElements = `
          <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">جدول مطابقة الميزانيات (تابع - صفحة ${pageNum} من ${totalPages})</span>
              </td>
            </tr>
          </table>
        `;
      }

      const rowsHTML = chunk.map((b) => {
        const pct = Math.min(100, Math.round(b.percentageUsed || 0));
        const isOver = b.isOverBudget || (b.remainingAmount || 0) < 0;
        return `
          <tr>
            <td style="text-align: right; font-weight: 700;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${b.categoryColor || '#d97706'}; vertical-align: middle; margin-left: 4px;"></span>
              <span style="vertical-align: middle;">${esc(b.categoryName)}</span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700;">${formatNum(b.budgetAmount)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700; color: #be123c;">${formatNum(b.spentAmount)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800; color: ${isOver ? '#be123c' : '#15803d'};">
              ${formatNum(b.remainingAmount)} ${esc(baseSymbol)}
            </td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-weight: bold;">${pct}%</td>
            <td style="text-align: center; vertical-align: middle;">
              <span style="display: inline-block; padding: 2px 6px; font-size: 7.5px; font-weight: 800; border-radius: 4px; line-height: 1.2; background: ${isOver ? '#ffe4e6' : '#dcfce7'}; color: ${isOver ? '#be123c' : '#15803d'};">
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
                  <th style="width: 110px; text-align: left;">الميزانية المعتمدة</th>
                  <th style="width: 110px; text-align: left;">الإنفاق الفعلي</th>
                  <th style="width: 110px; text-align: left;">الفارق (الوفر/العجز)</th>
                  <th style="width: 75px; text-align: center;">نسبة الاستهلاك</th>
                  <th style="width: 85px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="6" style="text-align: center; padding: 16px; color: #94a3b8;">لا توجد ميزانيات مسجلة</td></tr>`}
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
  }

  // ==========================================
  // 3. Debts & Liabilities Report
  // ==========================================
  else if (reportType === 'debts') {
    const debtItems: ReportDebtItem[] = debts?.items || [];
    const dCap = 12;
    const dChunks: ReportDebtItem[][] = [];

    if (debtItems.length <= 11) {
      dChunks.push(debtItems);
    } else {
      let cur = 0;
      dChunks.push(debtItems.slice(0, dCap));
      cur += dCap;
      while (cur < debtItems.length) {
        dChunks.push(debtItems.slice(cur, cur + 18));
        cur += 18;
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
          
          <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 8px; margin-right: -6px; margin-left: -6px; table-layout: fixed;">
            <tr>
              <td style="width: 33.33%; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #166534; line-height: 1.3; margin-bottom: 3px;">مستحقات لك (لنا)</div>
                <div style="font-size: 12px; font-weight: 900; color: #15803d; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  +${formatNum(totalReceivable)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 33.33%; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #9f1239; line-height: 1.3; margin-bottom: 3px;">التزامات عليك (علينا)</div>
                <div style="font-size: 12px; font-weight: 900; color: #be123c; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  -${formatNum(totalPayable)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 33.33%; background: ${netDebt >= 0 ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${netDebt >= 0 ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: ${netDebt >= 0 ? '#166534' : '#9f1239'}; line-height: 1.3; margin-bottom: 3px;">صافي المركز الائتماني</div>
                <div style="font-size: 12px; font-weight: 900; color: ${netDebt >= 0 ? '#15803d' : '#be123c'}; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${netDebt >= 0 ? '+' : ''}${formatNum(netDebt)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">كشف سجل الديون والذمم التفصيلي ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}</span>
              </td>
              <td style="text-align: left; vertical-align: middle; font-size: 8px; font-weight: bold; color: #64748b;">
                ${debtItems.length} ذمة مسجلة
              </td>
            </tr>
          </table>
        `;
      } else {
        topElements = `
          <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">كشف سجل الديون والذمم (تابع - صفحة ${pageNum} من ${totalPages})</span>
              </td>
            </tr>
          </table>
        `;
      }

      const rowsHTML = chunk.map((d) => {
        const isReceivable = d.type === 'to_me';
        return `
          <tr>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">${esc(d.personName)}</td>
            <td style="text-align: center; vertical-align: middle;">
              <span style="display: inline-block; padding: 2px 6px; font-size: 7.5px; font-weight: 800; border-radius: 4px; line-height: 1.2; background: ${isReceivable ? '#dcfce7' : '#ffe4e6'}; color: ${isReceivable ? '#15803d' : '#be123c'};">
                ${isReceivable ? 'لنا (مستحق)' : 'علينا (التزام)'}
              </span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700;">${formatNum(d.originalAmount)}</td>
            <td style="text-align: center; vertical-align: middle;">
              <span style="display: inline-block; padding: 2px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', monospace; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 1.2;">${esc(d.currency)}</span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #15803d;">${formatNum(d.paidAmount)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800; color: #0f172a;">${formatNum(d.remainingAmount)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(d.convertedRemaining)} ${esc(baseSymbol)}</td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-size: 8px;">${esc(d.dueDate || 'غير محدد')}</td>
            <td style="text-align: center; vertical-align: middle;">
              <span style="display: inline-block; padding: 2px 6px; font-size: 7.5px; font-weight: 800; border-radius: 4px; line-height: 1.2; background: ${d.isPaid ? '#dcfce7' : '#fff1f2'}; color: ${d.isPaid ? '#15803d' : '#be123c'};">
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
                  <th style="width: 120px; text-align: right;">الطرف المقابل / الشخص</th>
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
                ${rowsHTML || `<tr><td colspan="9" style="text-align: center; padding: 16px; color: #94a3b8;">لا توجد ديون أو التزامات مسجلة</td></tr>`}
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
  }

  // ==========================================
  // 4. Goals & Savings Progress Report
  // ==========================================
  else if (reportType === 'savings_goals') {
    const goalItems: ReportGoalItem[] = goals?.items || [];
    const gCap = 12;
    const gChunks: ReportGoalItem[][] = [];

    if (goalItems.length <= 11) {
      gChunks.push(goalItems);
    } else {
      let cur = 0;
      gChunks.push(goalItems.slice(0, gCap));
      cur += gCap;
      while (cur < goalItems.length) {
        gChunks.push(goalItems.slice(cur, cur + 18));
        cur += 18;
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
          
          <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 8px; margin-right: -6px; margin-left: -6px; table-layout: fixed;">
            <tr>
              <td style="width: 33.33%; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #166534; line-height: 1.3; margin-bottom: 3px;">إجمالي المبالغ المحققة (المدخرات)</div>
                <div style="font-size: 12px; font-weight: 900; color: #15803d; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(goals?.totalSavedAmount)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 33.33%; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #64748b; line-height: 1.3; margin-bottom: 3px;">إجمالي المستهدف المالي</div>
                <div style="font-size: 12px; font-weight: 900; color: #0f172a; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(goals?.totalTargetAmount)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 33.33%; background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #92400e; line-height: 1.3; margin-bottom: 3px;">نسبة الإنجاز الإجمالية</div>
                <div style="font-size: 12px; font-weight: 900; color: #b45309; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${Math.round(goals?.overallProgressPercent || 0)}%
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">جدول تقدم الأهداف المالية والمدخرات ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}</span>
              </td>
              <td style="text-align: left; vertical-align: middle; font-size: 8px; font-weight: bold; color: #64748b;">
                ${goalItems.length} أهداف مسجلة
              </td>
            </tr>
          </table>
        `;
      } else {
        topElements = `
          <table style="width: 100%; border-collapse: collapse; margin: 4px 0;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">جدول تقدم الأهداف المالية (تابع - صفحة ${pageNum} من ${totalPages})</span>
              </td>
            </tr>
          </table>
        `;
      }

      const rowsHTML = chunk.map((g) => {
        const pct = Math.min(100, Math.round(g.progressPercent || 0));
        return `
          <tr>
            <td style="text-align: right; font-weight: 700; color: #0f172a;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${g.color || '#d97706'}; vertical-align: middle; margin-left: 4px;"></span>
              <span style="vertical-align: middle;">${esc(g.name)}</span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700;">${formatNum(g.convertedTarget)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800; color: #15803d;">${formatNum(g.convertedCurrent)} ${esc(baseSymbol)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #64748b;">${formatNum(g.remainingAmount)} ${esc(baseSymbol)}</td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-weight: 900; color: #d97706;">${pct}%</td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-size: 8px;">${esc(g.deadline || 'مفتوح')}</td>
            <td style="text-align: center; vertical-align: middle;">
              <span style="display: inline-block; padding: 2px 6px; font-size: 7.5px; font-weight: 800; border-radius: 4px; line-height: 1.2; background: ${g.isCompleted ? '#dcfce7' : '#fffbeb'}; color: ${g.isCompleted ? '#15803d' : '#b45309'};">
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
                  <th style="width: 105px; text-align: left;">المستهدف</th>
                  <th style="width: 105px; text-align: left;">المحقق</th>
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
  }

  // ==========================================
  // 5. Wealth & Multi-Currency Portfolio Report
  // ==========================================
  else if (reportType === 'wealth') {
    const totalWealth = walletSummaries.reduce((sum, w) => sum + (w.convertedBalance || 0), 0);
    const pageContent = `
      <div class="report-page">
        <div>
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          
          <table style="width: 100%; border-collapse: collapse; background: #fffbeb; border: 1.5px solid #fef3c7; border-radius: 8px; margin-bottom: 8px; padding: 8px; text-align: center;">
            <tr>
              <td style="padding: 8px; text-align: center;">
                <div style="font-size: 8.5px; font-weight: 700; color: #92400e; line-height: 1.4; margin-bottom: 2px;">إجمالي صافي الثروة والأصول المقومة</div>
                <div style="font-size: 18px; font-weight: 900; color: #b45309; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${formatNum(totalWealth)} <span style="font-size: 11px; font-weight: bold; color: #92400e;">${esc(baseSymbol)}</span>
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">توزيع الأرصدة عبر المحافظ المالية والحسابات</span>
              </td>
            </tr>
          </table>

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
                      <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${w.color || '#d97706'}; vertical-align: middle; margin-left: 4px;"></span>
                      <span style="vertical-align: middle;">${esc(w.name)}</span>
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                      <span style="display: inline-block; padding: 2px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', monospace; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 1.2;">${esc(w.currencyCode)}</span>
                    </td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 700;">${formatNum(w.rawBalance)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(w.convertedBalance)}</td>
                    <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-weight: bold;">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${currencyBreakdown.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin: 8px 0 4px 0;">
              <tr>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="display: inline-block; width: 3px; height: 10px; background: #2563eb; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                  <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">مصفوفة العملات الأجنبية المعتمدة</span>
                </td>
              </tr>
            </table>

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
                    <td style="text-align: center; vertical-align: middle;">
                      <span style="display: inline-block; padding: 2px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', monospace; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 1.2;">${esc(cb.code)}</span>
                    </td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #15803d;">+${formatNum(cb.income)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #be123c;">-${formatNum(cb.expense)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800;">${formatNum(cb.net)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(cb.convertedNetToBase)}</td>
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
  }

  // ==========================================
  // 6. Executive Financial Summary Report
  // ==========================================
  else {
    const isSurplus = kpis.netSavings >= 0;
    const topExpenses = expenseCategories.slice(0, 5);

    const pageContent = `
      <div class="report-page">
        <div>
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          
          <!-- Executive 3-Card KPI Row -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 8px; margin-right: -6px; margin-left: -6px; table-layout: fixed;">
            <tr>
              <td style="width: 33.33%; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #166534; line-height: 1.3; margin-bottom: 3px;">إجمالي المقبوضات (الوارد)</div>
                <div style="font-size: 13px; font-weight: 900; color: #15803d; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  +${formatNum(kpis.totalIncome)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
                <div style="font-size: 7.5px; color: #15803d; margin-top: 2px;">${kpis.incomeCount} قيد وارد</div>
              </td>
              <td style="width: 33.33%; background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: #9f1239; line-height: 1.3; margin-bottom: 3px;">إجمالي المنصرفات (الصادر)</div>
                <div style="font-size: 13px; font-weight: 900; color: #be123c; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  -${formatNum(kpis.totalExpense)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
                <div style="font-size: 7.5px; color: #be123c; margin-top: 2px;">${kpis.expenseCount} قيد منصرف</div>
              </td>
              <td style="width: 33.33%; background: ${isSurplus ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${isSurplus ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 6px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 7.5px; font-weight: 700; color: ${isSurplus ? '#166534' : '#9f1239'}; line-height: 1.3; margin-bottom: 3px;">${isSurplus ? 'صافي الفائض الدوري' : 'صافي العجز الدوري'}</div>
                <div style="font-size: 13px; font-weight: 900; color: ${isSurplus ? '#15803d' : '#be123c'}; line-height: 1.3; direction: ltr; font-family: 'Plus Jakarta Sans', monospace;">
                  ${isSurplus ? '+' : ''}${formatNum(kpis.netSavings)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                </div>
                <div style="font-size: 7.5px; color: #64748b; margin-top: 2px;">معدل الادخار: ${kpis.savingsRatePercent}%</div>
              </td>
            </tr>
          </table>

          <!-- Opening & Closing Strip (Table Layout) -->
          <table style="width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 6px; margin-bottom: 8px; color: #ffffff;">
            <tr>
              <td style="width: 50%; padding: 5px 10px; text-align: right; vertical-align: middle; border-left: 1px solid #334155;">
                <span style="font-size: 8px; color: #94a3b8;">الرصيد الافتتاحي:</span>
                <span style="font-size: 9.5px; font-weight: 900; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #fde047; margin-right: 6px;">${formatNum(kpis.openingBalance)} ${esc(baseSymbol)}</span>
              </td>
              <td style="width: 50%; padding: 5px 10px; text-align: left; vertical-align: middle;">
                <span style="font-size: 8px; color: #94a3b8;">الرصيد الختامي:</span>
                <span style="font-size: 9.5px; font-weight: 900; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #86efac; margin-right: 6px;">${formatNum(kpis.closingBalance)} ${esc(baseSymbol)}</span>
              </td>
            </tr>
          </table>

          <!-- Currency Matrix (if multi-currency) -->
          ${currencyBreakdown.length > 0 ? `
            <div style="margin-bottom: 6px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
                <tr>
                  <td style="text-align: right; vertical-align: middle;">
                    <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                    <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">مصفوفة توزيع العملات الأجنبية والأرصدة</span>
                  </td>
                </tr>
              </table>
              <table class="report-table">
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
                      <td style="text-align: center; vertical-align: middle;">
                        <span style="display: inline-block; padding: 2px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', monospace; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 1.2;">${esc(cb.code)}</span>
                      </td>
                      <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #15803d;">+${formatNum(cb.income)}</td>
                      <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; color: #be123c;">-${formatNum(cb.expense)}</td>
                      <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800;">${formatNum(cb.net)}</td>
                      <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(cb.convertedNetToBase)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <!-- Two-Column Section: Top Expenses & Wallets (Table Layout) -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-right: -8px; margin-left: -8px; table-layout: fixed;">
            <tr>
              <!-- Top Expenses Column -->
              <td style="width: 50%; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
                  <tr>
                    <td style="text-align: right; vertical-align: middle;">
                      <span style="display: inline-block; width: 3px; height: 10px; background: #be123c; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                      <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">أبرز بنود المنصرفات</span>
                    </td>
                  </tr>
                </table>
                <table class="report-table">
                  <thead>
                    <tr>
                      <th style="text-align: right;">التصنيف</th>
                      <th style="width: 75px; text-align: left;">المبلغ</th>
                      <th style="width: 45px; text-align: center;">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topExpenses.map((c) => `
                      <tr>
                        <td style="text-align: right; font-weight: 700;">
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${c.color || '#be123c'}; vertical-align: middle; margin-left: 4px;"></span>
                          <span style="vertical-align: middle;">${esc(c.name)}</span>
                        </td>
                        <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800; color: #be123c;">${formatNum(c.totalAmount)}</td>
                        <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-size: 7.5px;">${Math.round(c.percentageOfTotal || 0)}%</td>
                      </tr>
                    `).join('')}
                    ${topExpenses.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">لا توجد منصرفات</td></tr>` : ''}
                  </tbody>
                </table>
              </td>

              <!-- Wallets Distribution Column -->
              <td style="width: 50%; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
                  <tr>
                    <td style="text-align: right; vertical-align: middle;">
                      <span style="display: inline-block; width: 3px; height: 10px; background: #2563eb; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                      <span style="font-size: 10px; font-weight: 800; color: #0f172a; vertical-align: middle;">توزيع أرصدة المحافظ</span>
                    </td>
                  </tr>
                </table>
                <table class="report-table">
                  <thead>
                    <tr>
                      <th style="text-align: right;">المحفظة</th>
                      <th style="width: 75px; text-align: left;">الرصيد</th>
                      <th style="width: 45px; text-align: center;">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${walletSummaries.slice(0, 5).map((w) => `
                      <tr>
                        <td style="text-align: right; font-weight: 700;">
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${w.color || '#2563eb'}; vertical-align: middle; margin-left: 4px;"></span>
                          <span style="vertical-align: middle;">${esc(w.name)}</span>
                        </td>
                        <td style="text-align: left; font-family: 'Plus Jakarta Sans', monospace; direction: ltr; font-weight: 800; color: #0f172a;">${formatNum(w.convertedBalance)}</td>
                        <td style="text-align: center; font-family: 'Plus Jakarta Sans', monospace; font-size: 7.5px;">${Math.round(w.percentageOfTotalWealth || 0)}%</td>
                      </tr>
                    `).join('')}
                    ${walletSummaries.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">لا توجد محافظ</td></tr>` : ''}
                  </tbody>
                </table>
              </td>
            </tr>
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
    *, *:before, *:after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body, table, th, td, div, span, p {
      font-family: 'Readex Pro', 'Tajawal', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      letter-spacing: 0 !important;
      line-height: 1.45;
    }
    body {
      background: #f1f5f9;
      color: #0f172a;
      direction: rtl;
      margin: 0;
      padding: 0;
      font-size: 8.5px;
    }
    .report-page {
      width: 794px;
      height: 1122px;
      max-height: 1122px;
      padding: 22px 26px 18px 26px;
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
      direction: rtl;
      text-align: right;
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
    .badge-account {
      font-size: 8px;
      line-height: 1.3;
      font-weight: bold;
      color: #334155;
      background: #f8fafc;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      display: inline-block;
      vertical-align: middle;
    }
    .badge-page {
      font-size: 8px;
      line-height: 1.3;
      font-weight: 800;
      color: #ffffff;
      background: #0f172a;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 4px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
      line-height: 1.35;
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
      line-height: 1.35;
      padding: 5px 4px;
      border: 1px solid #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    table.report-table td {
      padding: 4.5px 4px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
      font-size: 8px;
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    table.report-table tbody tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    table.report-table tfoot td {
      background-color: #0f172a;
      border-top: 1.5px solid #0f172a;
      font-weight: 900;
      font-size: 8px;
      line-height: 1.35;
      padding: 5px 4px;
    }
  </style>
</head>
<body>
  ${pagesHTML.join('\n')}
</body>
</html>`;
}

/**
 * Triggers clean browser printing via an off-screen iframe
 */
export function printHtmlViaIframe(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve(false);
        return;
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      const handlePrint = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print call error:', e);
          }
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            resolve(true);
          }, 1000);
        }, 350);
      };

      if (iframe.contentWindow?.document.readyState === 'complete') {
        handlePrint();
      } else {
        iframe.onload = handlePrint;
      }
    } catch (e) {
      console.warn('printHtmlViaIframe error:', e);
      resolve(false);
    }
  });
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
  container.style.top = '0';
  container.style.left = '-99999px'; // Fully offscreen but opacity: 1 for crisp canvas capture
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.direction = 'rtl';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Wait for fonts & images layout
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn('Fonts ready check error:', e);
      }
    }

    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 250));

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
