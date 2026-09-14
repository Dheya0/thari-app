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
 * Formats a currency amount safely for RTL rendering in html2canvas without glyph collision
 */
function renderAmountHTML(amount: number, symbol: string, sign = '', color = '#0f172a', isBold = true): string {
  return `
    <span style="display: inline-block; white-space: nowrap; color: ${color}; font-weight: ${isBold ? '900' : '700'};">
      <span dir="ltr" style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; display: inline-block;">${sign}${formatNum(amount)}</span>
      <span style="font-size: 8px; font-weight: 700; color: #64748b; margin-right: 2px;">${esc(symbol)}</span>
    </span>
  `;
}

/**
 * Builds a clean, bulletproof printable HTML document styled for A4 PDF rendering.
 * Uses strict Table layouts with fixed heights, integer pixel font sizes, and zero flex/float
 * to guarantee 100% crisp typography with zero character squashing and flawless table alignment.
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

  // --- Visual Brand Logo ---
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

  // --- Main Header (Page 1) ---
  const renderMainHeader = (pageNum: number, totalPages: number) => `
    <div style="margin-bottom: 8px;">
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 6px; table-layout: fixed;">
        <tr>
          <!-- Right: Logo & Branding -->
          <td style="text-align: right; vertical-align: middle; width: 55%;">
            <table style="border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; padding-left: 10px;">
                  ${renderBrandLogo(38)}
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <div style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 22px;">
                    ثَـــري <span style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 11px; font-weight: 900; color: #d97706; margin-right: 4px;">THARI</span>
                  </div>
                  <div style="font-size: 9.5px; font-weight: 700; color: #64748b; line-height: 15px; margin-top: 1px;">
                    منظومة إدارة الأصول والميزانيات المالية المعتمدة
                  </div>
                </td>
              </tr>
            </table>
          </td>

          <!-- Left: Report ID & Meta -->
          <td style="text-align: left; vertical-align: middle; width: 45%;">
            <table style="border-collapse: collapse; margin-right: auto; margin-left: 0;">
              <tr>
                <td style="text-align: left; vertical-align: middle; padding-left: 8px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8.5px; color: #475569; line-height: 14px;">
                  <div style="font-weight: 900; font-size: 9.5px; color: #0f172a;">${esc(metadata.reportId)}</div>
                  <div style="color: #64748b;">بصمة: ${esc(metadata.fingerprint.slice(0, 14))}...</div>
                  <div style="color: #94a3b8;">${esc(metadata.generatedAtFormattedAr)} • ${esc(metadata.generatedTimeFormattedAr)}</div>
                </td>
                <td style="vertical-align: middle;">
                  ${
                    metadata.qrDataUrl
                      ? `<img src="${metadata.qrDataUrl}" width="44" height="44" style="border-radius: 4px; border: 1px solid #cbd5e1; display: block;" alt="QR" />`
                      : `<div style="width: 44px; height: 44px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 8px; font-weight: bold; color: #64748b; line-height: 44px;">توثيق</div>`
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Title Sub-Bar -->
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <tr>
          <td style="text-align: right; vertical-align: middle; width: 65%;">
            <span style="display: inline-block; width: 6px; height: 6px; background: #d97706; border-radius: 50%; vertical-align: middle; margin-left: 6px;"></span>
            <span style="font-size: 12.5px; font-weight: 900; color: #0f172a; vertical-align: middle;">${esc(titleInfo.ar)}</span>
            <span style="font-size: 9.5px; font-weight: 700; color: #94a3b8; font-family: 'Plus Jakarta Sans', Arial, sans-serif; vertical-align: middle; margin-right: 6px;">${esc(titleInfo.en)}</span>
          </td>
          <td style="text-align: left; vertical-align: middle; width: 35%;">
            <span class="badge-account">حساب: <b>${esc(account.name)}</b></span>
            <span class="badge-page">صفحة ${pageNum} من ${totalPages}</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Running Header (Pages 2+) ---
  const renderRunningHeader = (pageNum: number, totalPages: number) => `
    <div style="border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <tr>
          <td style="text-align: right; vertical-align: middle; width: 60%;">
            ${renderBrandLogo(22)}
            <span style="font-size: 11px; font-weight: 900; color: #0f172a; vertical-align: middle; margin-right: 4px;">ثَـــري</span>
            <span style="font-size: 9px; font-weight: 900; color: #d97706; font-family: 'Plus Jakarta Sans', Arial, sans-serif; vertical-align: middle;">THARI</span>
            <span style="color: #cbd5e1; margin: 0 4px; vertical-align: middle;">|</span>
            <span style="font-size: 10.5px; font-weight: 800; color: #334155; vertical-align: middle;">${esc(titleInfo.ar)}</span>
            <span style="font-size: 8.5px; color: #64748b; vertical-align: middle;">(تابع)</span>
          </td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px; color: #64748b; width: 40%;">
            <span style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-weight: bold; color: #0f172a;">${esc(metadata.reportId)}</span>
            <span style="color: #cbd5e1; margin: 0 4px;">•</span>
            <span class="badge-account" style="padding: 2px 5px; font-size: 8px;">حساب: <b>${esc(account.name)}</b></span>
            <span class="badge-page" style="padding: 2px 5px; font-size: 8px;">صفحة ${pageNum} من ${totalPages}</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Scope Grid ---
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
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; line-height: 13px; margin-bottom: 2px;">النطاق الزمني والفترة</div>
            <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; line-height: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(periodVal)}</div>
          </td>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top; border-left: 1px solid #e2e8f0;">
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; line-height: 13px; margin-bottom: 2px;">عملة التقييم المعيارية</div>
            <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; line-height: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(currencyVal)}</div>
          </td>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top; border-left: 1px solid #e2e8f0;">
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; line-height: 13px; margin-bottom: 2px;">المحفظة / الحساب</div>
            <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; line-height: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(walletVal)}</div>
          </td>
          <td style="width: 25%; padding: 6px 8px; text-align: right; vertical-align: top;">
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; line-height: 13px; margin-bottom: 2px;">حالة الفرز والتدقيق</div>
            <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; line-height: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${transactions.length} قيد محاسبي</div>
          </td>
        </tr>
      </table>
    `;
  };

  // --- Official Verification Seal ---
  const renderOfficialSeal = () => `
    <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px; margin-bottom: 4px; table-layout: fixed;">
      <tr>
        <td style="text-align: right; vertical-align: middle; padding: 5px 8px; width: 65%;">
          <table style="border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle; padding-left: 6px;">
                <div style="width: 22px; height: 22px; border: 1.5px solid #d97706; border-radius: 50%; text-align: center; line-height: 20px; font-size: 11px; font-weight: 900; color: #d97706; background: #fffbeb;">✓</div>
              </td>
              <td style="vertical-align: middle; text-align: right;">
                <div style="font-weight: 800; color: #0f172a; font-size: 8.5px; line-height: 13px;">تم التوليد إلكترونياً وبشكل مشفر وموثق عبر تطبيق ثـري المالي</div>
                <div style="font-size: 7.5px; color: #64748b; line-height: 12px; margin-top: 1px;">جميع الحقوق محفوظة © ${new Date().getFullYear()} • بصمة التحقق: ${esc(metadata.fingerprint.slice(0, 24))}...</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align: left; vertical-align: middle; padding: 5px 8px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 7.5px; color: #475569; direction: ltr; line-height: 12px; width: 35%;">
          DOCUMENT AUTHENTICITY VALIDATED<br>
          SECURE AUDITED LEDGER #${esc(metadata.reportId)}
        </td>
      </tr>
    </table>
  `;

  // --- Page Footer ---
  const renderPageFooter = (pageNum: number, totalPages: number) => `
    <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; padding-top: 3px; margin-top: 3px; table-layout: fixed;">
      <tr>
        <td style="text-align: right; vertical-align: middle; font-size: 8px; color: #94a3b8; line-height: 12px; width: 70%;">
          <span>تطبيق ثـري المالي • ${esc(titleInfo.ar)}</span>
          <span style="color: #cbd5e1; margin: 0 4px;">•</span>
          <span>بصمة التوثيق: ${esc(metadata.fingerprint.slice(0, 16))}...</span>
        </td>
        <td style="text-align: left; vertical-align: middle; font-size: 8px; font-weight: 900; color: #0f172a; line-height: 12px; width: 30%;">
          صفحة ${pageNum} من ${totalPages}
        </td>
      </tr>
    </table>
  `;

  // --- 9-Column Detailed Ledger Table Header ---
  const renderDetailedTableHeader = () => `
    <thead>
      <tr>
        <th style="width: 26px; text-align: center;">#</th>
        <th style="width: 68px; text-align: center;">التاريخ</th>
        <th style="width: 85px; text-align: right;">التصنيف</th>
        <th style="width: 70px; text-align: right;">المحفظة</th>
        <th style="text-align: right;">البيان / تفاصيل القيد</th>
        <th style="width: 55px; text-align: center;">العملة</th>
        <th style="width: 80px; text-align: left;">المبلغ الأصلي</th>
        <th style="width: 90px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
        <th style="width: 85px; text-align: left;">الرصيد التراكمي</th>
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
        <td style="text-align: center; color: #64748b; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px;">${idx + 1}</td>
        <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px; color: #334155; white-space: nowrap;">${esc(tx.date)}</td>
        <td style="text-align: right; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${tx.categoryColor || '#94a3b8'}; vertical-align: middle; margin-left: 3px;"></span>
          <span style="vertical-align: middle;">${esc(tx.categoryName)}</span>
        </td>
        <td style="text-align: right; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(tx.walletName)}</td>
        <td style="text-align: right; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${esc(tx.note || tx.categoryName)}">
          ${esc(tx.note || tx.categoryName)}
        </td>
        <td style="text-align: center; vertical-align: middle;">
          <span style="display: inline-block; padding: 1px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 12px;">${esc(tx.currencyCode)}</span>
        </td>
        <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700; color: ${amtColor}; white-space: nowrap;">
          ${amtSign}${formatNum(tx.originalAmount)}
        </td>
        <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 900; color: #0f172a; white-space: nowrap;">
          ${amtSign}${formatNum(tx.convertedAmount)}
        </td>
        <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700; color: #334155; white-space: nowrap;">
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
    const page1Cap = 22;
    const middleCap = 28;

    const txChunks: ReportLedgerEntry[][] = [];

    if (transactions.length <= page1Cap) {
      txChunks.push(transactions);
    } else {
      let cur = 0;
      txChunks.push(transactions.slice(0, page1Cap));
      cur += page1Cap;

      while (cur < transactions.length) {
        txChunks.push(transactions.slice(cur, cur + middleCap));
        cur += middleCap;
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
          
          <!-- KPI Metrics Row -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
            <tr>
              <td style="width: 25%; padding: 0 3px 0 0;">
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: #166534; line-height: 13px; margin-bottom: 2px;">إجمالي المقبوضات (دائن)</div>
                  <div style="font-size: 12px; font-weight: 900; color: #15803d; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    +${formatNum(kpis.totalIncome)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 25%; padding: 0 3px;">
                <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: #9f1239; line-height: 13px; margin-bottom: 2px;">إجمالي المنصرفات (مدين)</div>
                  <div style="font-size: 12px; font-weight: 900; color: #be123c; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    -${formatNum(kpis.totalExpense)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 25%; padding: 0 3px;">
                <div style="background: ${kpis.netSavings >= 0 ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${kpis.netSavings >= 0 ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: ${kpis.netSavings >= 0 ? '#166534' : '#9f1239'}; line-height: 13px; margin-bottom: 2px;">صافي حركة الفترة</div>
                  <div style="font-size: 12px; font-weight: 900; color: ${kpis.netSavings >= 0 ? '#15803d' : '#be123c'}; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${kpis.netSavings >= 0 ? '+' : ''}${formatNum(kpis.netSavings)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 25%; padding: 0 0 0 3px;">
                <div style="background: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: #94a3b8; line-height: 13px; margin-bottom: 2px;">الرصيد الختامي</div>
                  <div style="font-size: 12px; font-weight: 900; color: #fbbf24; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${formatNum(kpis.closingBalance)} <span style="font-size: 8px; font-weight: bold; color: #cbd5e1;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">سجل المعاملات والقيود المحاسبية التفصيلية ${totalPages > 1 ? `(صفحة 1 من ${totalPages})` : ''}</span>
              </td>
              <td style="text-align: left; vertical-align: middle; font-size: 8.5px; font-weight: bold; color: #64748b;">
                إجمالي ${transactions.length} قيد محاسبي
              </td>
            </tr>
          </table>
        `;
      } else {
        topElements = `
          <table style="width: 100%; border-collapse: collapse; margin: 4px 0; table-layout: fixed;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">سجل المعاملات والقيود المحاسبية (تابع - صفحة ${pageNum} من ${totalPages})</span>
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
              <td colspan="5" style="text-align: right; padding: 6px 8px; color: #ffffff; border: 1px solid #1e293b;">
                ملخص إجمالي الحركات والتسوية الختامية للتقرير
              </td>
              <td style="text-align: center; color: #94a3b8; border: 1px solid #1e293b; font-size: 8px;">
                ${kpis.totalTransactions} قيد
              </td>
              <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #86efac; border: 1px solid #1e293b; font-size: 8.5px; white-space: nowrap;">
                +${formatNum(kpis.totalIncome)}
              </td>
              <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #fca5a5; border: 1px solid #1e293b; font-size: 8.5px; white-space: nowrap;">
                -${formatNum(kpis.totalExpense)}
              </td>
              <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #fde047; font-weight: 900; border: 1px solid #1e293b; font-size: 9px; white-space: nowrap;">
                ${formatNum(kpis.closingBalance)}
              </td>
            </tr>
          </tfoot>
        `;
      }

      const pageContent = `
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              ${renderDetailedTableHeader()}
              <tbody>
                ${rowsHTML || `<tr><td colspan="9" style="text-align: center; padding: 14px; color: #94a3b8;">لا توجد معاملات مسجلة في هذا النطاق</td></tr>`}
              </tbody>
              ${tableFooterHTML}
            </table>
          </div>

          <div class="page-footer-container">
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

    const bCap = 20;
    const bChunks: ReportBudgetSummary[][] = [];

    if (budgetList.length <= bCap) {
      bChunks.push(budgetList);
    } else {
      let cur = 0;
      while (cur < budgetList.length) {
        bChunks.push(budgetList.slice(cur, cur + bCap));
        cur += bCap;
      }
    }

    const totalPages = Math.max(1, bChunks.length);

    bChunks.forEach((chunk, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);

      let topElements = '';
      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          
          <!-- Budget KPI Matrix -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
            <tr>
              <td style="width: 25%; padding: 0 3px 0 0;">
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: #475569; line-height: 13px; margin-bottom: 2px;">الميزانية المعتمدة</div>
                  <div style="font-size: 12px; font-weight: 900; color: #0f172a; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${formatNum(totalBudgeted)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 25%; padding: 0 3px;">
                <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: #9f1239; line-height: 13px; margin-bottom: 2px;">الإنفاق الفعلي الإجمالي</div>
                  <div style="font-size: 12px; font-weight: 900; color: #be123c; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    -${formatNum(kpis.totalExpense)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 25%; padding: 0 3px;">
                <div style="background: ${totalRemainingBudget >= 0 ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${totalRemainingBudget >= 0 ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: ${totalRemainingBudget >= 0 ? '#166534' : '#9f1239'}; line-height: 13px; margin-bottom: 2px;">المتبقي من الميزانية</div>
                  <div style="font-size: 12px; font-weight: 900; color: ${totalRemainingBudget >= 0 ? '#15803d' : '#be123c'}; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${totalRemainingBudget >= 0 ? '+' : ''}${formatNum(totalRemainingBudget)} <span style="font-size: 8px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 25%; padding: 0 0 0 3px;">
                <div style="background: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 6px 4px; text-align: center;">
                  <div style="font-size: 8px; font-weight: 700; color: #94a3b8; line-height: 13px; margin-bottom: 2px;">معدل استهلاك الميزانية</div>
                  <div style="font-size: 12px; font-weight: 900; color: ${budgetUtilizationRate > 100 ? '#f87171' : '#fbbf24'}; line-height: 16px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${budgetUtilizationRate.toFixed(1)}%
                  </div>
                </div>
              </td>
            </tr>
          </table>
        `;
      }

      const rowsHTML = chunk.map((b) => {
        const isOver = b.isOverBudget;
        const statusColor = isOver ? '#be123c' : b.percentageUsed > 80 ? '#d97706' : '#15803d';
        const statusBg = isOver ? '#fff1f2' : b.percentageUsed > 80 ? '#fffbeb' : '#f0fdf4';

        return `
          <tr>
            <td style="text-align: right; font-weight: 700;">
              <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${b.categoryColor || '#94a3b8'}; vertical-align: middle; margin-left: 3px;"></span>
              <span style="vertical-align: middle;">${esc(b.categoryName)}</span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700;">${formatNum(b.budgetAmount)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800; color: #be123c;">${formatNum(b.spentAmount)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800; color: ${b.remainingAmount < 0 ? '#be123c' : '#15803d'};">
              ${b.remainingAmount < 0 ? '-' : '+'}${formatNum(Math.abs(b.remainingAmount))}
            </td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-weight: 800;">
              ${b.percentageUsed.toFixed(1)}%
            </td>
            <td style="text-align: center;">
              <span style="display: inline-block; padding: 1px 6px; font-size: 7.5px; font-weight: 800; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                ${esc(b.statusLabelAr)}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="text-align: right;">التصنيف المالي</th>
                  <th style="width: 95px; text-align: left;">الميزانية المعتمدة (${esc(baseSymbol)})</th>
                  <th style="width: 95px; text-align: left;">الإنفاق الفعلي (${esc(baseSymbol)})</th>
                  <th style="width: 95px; text-align: left;">المتبقي (${esc(baseSymbol)})</th>
                  <th style="width: 75px; text-align: center;">نسبة الاستهلاك</th>
                  <th style="width: 80px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="6" style="text-align: center; padding: 14px; color: #94a3b8;">لا توجد ميزانيات مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="page-footer-container">
            ${isLast ? renderOfficialSeal() : ''}
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `;

      pagesHTML.push(pageContent);
    });
  }

  // ==========================================
  // 3. Debts & Liabilities Statement
  // ==========================================
  else if (reportType === 'debts') {
    const debtItems: ReportDebtItem[] = debts?.items || [];
    const dCap = 18;
    const dChunks: ReportDebtItem[][] = [];

    if (debtItems.length <= dCap) {
      dChunks.push(debtItems);
    } else {
      let cur = 0;
      while (cur < debtItems.length) {
        dChunks.push(debtItems.slice(cur, cur + dCap));
        cur += dCap;
      }
    }

    const totalPages = Math.max(1, dChunks.length);

    dChunks.forEach((chunk, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);

      let topElements = '';
      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          
          <!-- Debt KPI Matrix -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
            <tr>
              <td style="width: 33.33%; padding: 0 3px 0 0;">
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #166534; line-height: 13px; margin-bottom: 2px;">مستحقات لك (ديون لي)</div>
                  <div style="font-size: 13px; font-weight: 900; color: #15803d; line-height: 17px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    +${formatNum(debts?.totalReceivable)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 33.33%; padding: 0 3px;">
                <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #9f1239; line-height: 13px; margin-bottom: 2px;">التزامات عليك (ديون علي)</div>
                  <div style="font-size: 13px; font-weight: 900; color: #be123c; line-height: 17px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    -${formatNum(debts?.totalPayable)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 33.33%; padding: 0 0 0 3px;">
                <div style="background: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #94a3b8; line-height: 13px; margin-bottom: 2px;">صافي المركز الائتماني</div>
                  <div style="font-size: 13px; font-weight: 900; color: ${(debts?.netDebtPosition || 0) >= 0 ? '#86efac' : '#f87171'}; line-height: 17px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${(debts?.netDebtPosition || 0) >= 0 ? '+' : ''}${formatNum(debts?.netDebtPosition)} <span style="font-size: 8.5px; font-weight: bold; color: #cbd5e1;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        `;
      }

      const rowsHTML = chunk.map((d) => {
        const isToMe = d.type === 'to_me';
        const typeColor = isToMe ? '#15803d' : '#be123c';
        const typeBg = isToMe ? '#f0fdf4' : '#fff1f2';

        return `
          <tr>
            <td style="text-align: right; font-weight: 700;">${esc(d.personName)}</td>
            <td style="text-align: center;">
              <span style="display: inline-block; padding: 1px 5px; font-size: 7.5px; font-weight: 800; border-radius: 4px; background: ${typeBg}; color: ${typeColor}; border: 1px solid ${typeColor}40;">
                ${esc(d.typeLabelAr)}
              </span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700;">${formatNum(d.originalAmount)} ${esc(d.currency)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700; color: #15803d;">${formatNum(d.paidAmount)} ${esc(d.currency)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800; color: ${typeColor};">${formatNum(d.remainingAmount)} ${esc(d.currency)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 900; color: #0f172a;">${formatNum(d.convertedRemaining)}</td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px;">${esc(d.dueDate || '-')}</td>
            <td style="text-align: center; font-size: 8px; font-weight: bold;">${esc(d.statusLabelAr)}</td>
          </tr>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="text-align: right;">الطرف / الاسم</th>
                  <th style="width: 70px; text-align: center;">نوع الدين</th>
                  <th style="width: 85px; text-align: left;">المبلغ الأصلي</th>
                  <th style="width: 80px; text-align: left;">المسدد</th>
                  <th style="width: 85px; text-align: left;">المتبقي بالعملة</th>
                  <th style="width: 90px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
                  <th style="width: 75px; text-align: center;">الاستحقاق</th>
                  <th style="width: 65px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="8" style="text-align: center; padding: 14px; color: #94a3b8;">لا توجد ديون أو التزامات مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="page-footer-container">
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
    const gCap = 18;
    const gChunks: ReportGoalItem[][] = [];

    if (goalItems.length <= gCap) {
      gChunks.push(goalItems);
    } else {
      let cur = 0;
      while (cur < goalItems.length) {
        gChunks.push(goalItems.slice(cur, cur + gCap));
        cur += gCap;
      }
    }

    const totalPages = Math.max(1, gChunks.length);

    gChunks.forEach((chunk, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);

      let topElements = '';
      if (isFirst) {
        topElements = `
          ${renderScopeGrid()}
          
          <!-- Goals KPI Matrix -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
            <tr>
              <td style="width: 33.33%; padding: 0 3px 0 0;">
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #166534; line-height: 13px; margin-bottom: 2px;">إجمالي المبالغ المحققة</div>
                  <div style="font-size: 13px; font-weight: 900; color: #15803d; line-height: 17px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${formatNum(goals?.totalSavedAmount)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 33.33%; padding: 0 3px;">
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #475569; line-height: 13px; margin-bottom: 2px;">إجمالي المستهدف المالي</div>
                  <div style="font-size: 13px; font-weight: 900; color: #0f172a; line-height: 17px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${formatNum(goals?.totalTargetAmount)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                </div>
              </td>
              <td style="width: 33.33%; padding: 0 0 0 3px;">
                <div style="background: #0f172a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #94a3b8; line-height: 13px; margin-bottom: 2px;">نسبة الإنجاز الإجمالية</div>
                  <div style="font-size: 13px; font-weight: 900; color: #fbbf24; line-height: 17px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${(goals?.overallProgressPercent || 0).toFixed(1)}%
                  </div>
                </div>
              </td>
            </tr>
          </table>
        `;
      }

      const rowsHTML = chunk.map((g) => {
        return `
          <tr>
            <td style="text-align: right; font-weight: 700;">
              <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${g.color || '#d97706'}; vertical-align: middle; margin-left: 3px;"></span>
              <span style="vertical-align: middle;">${esc(g.name)}</span>
            </td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700;">${formatNum(g.convertedTarget)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800; color: #15803d;">${formatNum(g.convertedCurrent)}</td>
            <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 700; color: #475569;">${formatNum(g.remainingAmount)}</td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-weight: 900; color: #0f172a;">${g.progressPercent.toFixed(1)}%</td>
            <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px;">${esc(g.deadline || '-')}</td>
            <td style="text-align: center;">
              <span style="display: inline-block; padding: 1px 6px; font-size: 7.5px; font-weight: 800; border-radius: 4px; background: ${g.isCompleted ? '#f0fdf4' : '#fffbeb'}; color: ${g.isCompleted ? '#15803d' : '#d97706'};">
                ${g.isCompleted ? 'مكتمل' : 'قيد الإنجاز'}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="text-align: right;">اسم الهدف المالي</th>
                  <th style="width: 95px; text-align: left;">المستهدف (${esc(baseSymbol)})</th>
                  <th style="width: 95px; text-align: left;">المدخر الحالي (${esc(baseSymbol)})</th>
                  <th style="width: 95px; text-align: left;">المتبقي للهدف (${esc(baseSymbol)})</th>
                  <th style="width: 75px; text-align: center;">نسبة الإنجاز</th>
                  <th style="width: 75px; text-align: center;">تاريخ الهدف</th>
                  <th style="width: 75px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="7" style="text-align: center; padding: 14px; color: #94a3b8;">لا توجد أهداف مالية مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="page-footer-container">
            ${isLast ? renderOfficialSeal() : ''}
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `;

      pagesHTML.push(pageContent);
    });
  }

  // ==========================================
  // 5. Wealth & Multi-Currency Portfolio
  // ==========================================
  else if (reportType === 'wealth') {
    const pageContent = `
      <div class="report-page">
        <div style="width: 100%;">
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          
          <!-- Wealth KPI Banner -->
          <table style="width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 8px; margin-bottom: 8px; color: #ffffff; table-layout: fixed;">
            <tr>
              <td style="width: 60%; padding: 8px 12px; text-align: right; vertical-align: middle;">
                <div style="font-size: 8.5px; color: #94a3b8; margin-bottom: 1px;">إجمالي صافي الثروة والأصول (Net Worth)</div>
                <div style="font-size: 16px; font-weight: 900; color: #fbbf24; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; text-align: right;">
                  ${formatNum(kpis.closingBalance)} <span style="font-size: 9px; font-weight: bold; color: #cbd5e1;">${esc(baseSymbol)}</span>
                </div>
              </td>
              <td style="width: 40%; padding: 8px 12px; text-align: left; vertical-align: middle; border-right: 1px solid #334155;">
                <div style="font-size: 8.5px; color: #94a3b8; margin-bottom: 1px;">عدد المحافظ المالية</div>
                <div style="font-size: 13px; font-weight: 800; color: #ffffff;">${walletSummaries.length} محافظ نقدية</div>
              </td>
            </tr>
          </table>

          <!-- Wallets Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">توزيع الأرصدة والمحافظ النقدية</span>
              </td>
            </tr>
          </table>
          <table class="report-table" style="margin-bottom: 8px;">
            <thead>
              <tr>
                <th style="text-align: right;">اسم المحفظة</th>
                <th style="width: 70px; text-align: center;">العملة</th>
                <th style="width: 110px; text-align: left;">الرصيد بالعملة الفعلية</th>
                <th style="width: 120px; text-align: left;">المعادل بـ (${esc(baseSymbol)})</th>
                <th style="width: 80px; text-align: center;">الحصة من الثروة</th>
              </tr>
            </thead>
            <tbody>
              ${walletSummaries.map((w) => `
                <tr>
                  <td style="text-align: right; font-weight: 700;">
                    <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${w.color || '#2563eb'}; vertical-align: middle; margin-left: 3px;"></span>
                    <span style="vertical-align: middle;">${esc(w.name)}</span>
                  </td>
                  <td style="text-align: center; font-weight: 800; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">${esc(w.currencyCode)}</td>
                  <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800;">${formatNum(w.rawBalance)}</td>
                  <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 900; color: #0f172a;">${formatNum(w.convertedBalance)}</td>
                  <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-weight: 800;">${w.percentageOfTotalWealth.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Multi-Currency Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed;">
            <tr>
              <td style="text-align: right; vertical-align: middle;">
                <span style="display: inline-block; width: 3px; height: 10px; background: #2563eb; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">توزيع السيولة حسب العملات الأجنبية</span>
              </td>
            </tr>
          </table>
          <table class="report-table">
            <thead>
              <tr>
                <th style="text-align: right;">العملة</th>
                <th style="width: 60px; text-align: center;">الرمز</th>
                <th style="width: 70px; text-align: center;">عدد الحركات</th>
                <th style="width: 90px; text-align: left;">إجمالي الوارد</th>
                <th style="width: 90px; text-align: left;">إجمالي المنصرف</th>
                <th style="width: 95px; text-align: left;">الصافي بالعملة</th>
                <th style="width: 105px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
              </tr>
            </thead>
            <tbody>
              ${currencyBreakdown.map((cb) => `
                <tr>
                  <td style="text-align: right; font-weight: 700;">${esc(cb.metadata?.nameAr || cb.code)}</td>
                  <td style="text-align: center; font-weight: 800; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">${esc(cb.code)}</td>
                  <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">${cb.transactionCount}</td>
                  <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #15803d;">+${formatNum(cb.income)}</td>
                  <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #be123c;">-${formatNum(cb.expense)}</td>
                  <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800;">${formatNum(cb.net)}</td>
                  <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(cb.convertedNetToBase)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="page-footer-container">
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
        <div style="width: 100%;">
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          
          <!-- Executive KPI Grid -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;">
            <tr>
              <td style="width: 33.33%; padding: 0 3px 0 0;">
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #166534; line-height: 13px; margin-bottom: 2px;">إجمالي المقبوضات (الوارد)</div>
                  <div style="font-size: 13.5px; font-weight: 900; color: #15803d; line-height: 18px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    +${formatNum(kpis.totalIncome)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                  <div style="font-size: 8px; color: #15803d; margin-top: 2px; line-height: 12px;">${kpis.incomeCount} قيد وارد</div>
                </div>
              </td>
              <td style="width: 33.33%; padding: 0 3px;">
                <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #9f1239; line-height: 13px; margin-bottom: 2px;">إجمالي المنصرفات (الصادر)</div>
                  <div style="font-size: 13.5px; font-weight: 900; color: #be123c; line-height: 18px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    -${formatNum(kpis.totalExpense)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                  <div style="font-size: 8px; color: #be123c; margin-top: 2px; line-height: 12px;">${kpis.expenseCount} قيد منصرف</div>
                </div>
              </td>
              <td style="width: 33.33%; padding: 0 0 0 3px;">
                <div style="background: ${isSurplus ? '#f0fdf4' : '#fff1f2'}; border: 1.5px solid ${isSurplus ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 8px 4px; text-align: center;">
                  <div style="font-size: 8.5px; font-weight: 700; color: ${isSurplus ? '#166534' : '#9f1239'}; line-height: 13px; margin-bottom: 2px;">${isSurplus ? 'صافي الفائض الدوري' : 'صافي العجز الدوري'}</div>
                  <div style="font-size: 13.5px; font-weight: 900; color: ${isSurplus ? '#15803d' : '#be123c'}; line-height: 18px; direction: ltr; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
                    ${isSurplus ? '+' : ''}${formatNum(kpis.netSavings)} <span style="font-size: 8.5px; font-weight: bold; color: #64748b;">${esc(baseSymbol)}</span>
                  </div>
                  <div style="font-size: 8px; color: #64748b; margin-top: 2px; line-height: 12px;">معدل الادخار: ${kpis.savingsRatePercent}%</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Opening & Closing Balances (Nested Table Layout - No Float) -->
          <table style="width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 8px; margin-bottom: 8px; color: #ffffff; table-layout: fixed;">
            <tr>
              <td style="width: 50%; padding: 6px 12px; border-left: 1px solid #334155;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                  <tr>
                    <td style="text-align: right; color: #94a3b8; font-size: 8.5px; padding: 0; border: none; background: transparent; width: 45%;">الرصيد الافتتاحي:</td>
                    <td style="text-align: left; font-size: 10.5px; font-weight: 900; color: #fde047; padding: 0; border: none; background: transparent; white-space: nowrap; width: 55%;">
                      <span dir="ltr" style="font-family: 'Plus Jakarta Sans', Arial, sans-serif;">${formatNum(kpis.openingBalance)}</span> <span style="font-size: 8px; color: #cbd5e1;">${esc(baseSymbol)}</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="width: 50%; padding: 6px 12px;">
                <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                  <tr>
                    <td style="text-align: right; color: #94a3b8; font-size: 8.5px; padding: 0; border: none; background: transparent; width: 45%;">الرصيد الختامي:</td>
                    <td style="text-align: left; font-size: 10.5px; font-weight: 900; color: #86efac; padding: 0; border: none; background: transparent; white-space: nowrap; width: 55%;">
                      <span dir="ltr" style="font-family: 'Plus Jakarta Sans', Arial, sans-serif;">${formatNum(kpis.closingBalance)}</span> <span style="font-size: 8px; color: #cbd5e1;">${esc(baseSymbol)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Multi-Currency Matrix -->
          ${currencyBreakdown.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed;">
              <tr>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="display: inline-block; width: 3px; height: 10px; background: #d97706; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                  <span style="font-size: 10.5px; font-weight: 800; color: #0f172a; vertical-align: middle;">مصفوفة توزيع العملات الأجنبية والأرصدة</span>
                </td>
              </tr>
            </table>
            <table class="report-table" style="margin-bottom: 8px;">
              <thead>
                <tr>
                  <th style="text-align: right;">العملة</th>
                  <th style="width: 55px; text-align: center;">الرمز</th>
                  <th style="width: 80px; text-align: left;">إجمالي الوارد</th>
                  <th style="width: 80px; text-align: left;">إجمالي المنصرف</th>
                  <th style="width: 85px; text-align: left;">الصافي بالعملة</th>
                  <th style="width: 95px; text-align: left;">المعادل (${esc(baseSymbol)})</th>
                </tr>
              </thead>
              <tbody>
                ${currencyBreakdown.map((cb) => `
                  <tr>
                    <td style="text-align: right; font-weight: 700;">${esc(cb.metadata?.nameAr || cb.code)}</td>
                    <td style="text-align: center; vertical-align: middle;">
                      <span style="display: inline-block; padding: 1px 5px; font-size: 7.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; color: #334155; line-height: 12px;">${esc(cb.code)}</span>
                    </td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #15803d;">+${formatNum(cb.income)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; color: #be123c;">-${formatNum(cb.expense)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800;">${formatNum(cb.net)}</td>
                    <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 900; color: #d97706;">${formatNum(cb.convertedNetToBase)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <!-- Two Column Breakdown -->
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6px;">
            <tr>
              <!-- Top Expenses -->
              <td style="width: 50%; vertical-align: top; padding: 0 4px 0 0;">
                <div style="font-size: 10px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 3px; height: 10px; background: #be123c; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                  أبرز بنود المنصرفات
                </div>
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
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${c.color || '#be123c'}; vertical-align: middle; margin-left: 3px;"></span>
                          <span style="vertical-align: middle;">${esc(c.name)}</span>
                        </td>
                        <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800; color: #be123c;">${formatNum(c.totalAmount)}</td>
                        <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px;">${Math.round(c.percentageOfTotal || 0)}%</td>
                      </tr>
                    `).join('')}
                    ${topExpenses.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 8px;">لا توجد منصرفات</td></tr>` : ''}
                  </tbody>
                </table>
              </td>

              <!-- Wallets Distribution -->
              <td style="width: 50%; vertical-align: top; padding: 0 0 0 4px;">
                <div style="font-size: 10px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 3px; height: 10px; background: #2563eb; border-radius: 2px; vertical-align: middle; margin-left: 4px;"></span>
                  توزيع أرصدة المحافظ
                </div>
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
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${w.color || '#2563eb'}; vertical-align: middle; margin-left: 3px;"></span>
                          <span style="vertical-align: middle;">${esc(w.name)}</span>
                        </td>
                        <td style="text-align: left; font-family: 'Plus Jakarta Sans', Arial, sans-serif; direction: ltr; font-weight: 800; color: #0f172a;">${formatNum(w.convertedBalance)}</td>
                        <td style="text-align: center; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 8px;">${Math.round(w.percentageOfTotalWealth || 0)}%</td>
                      </tr>
                    `).join('')}
                    ${walletSummaries.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 8px;">لا توجد محافظ</td></tr>` : ''}
                  </tbody>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <div class="page-footer-container">
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
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Readex+Pro:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body, .report-page, .report-page * {
      font-family: 'Tajawal', 'Readex Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Almarai", Tahoma, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      letter-spacing: 0px !important;
    }
    body {
      background: #f1f5f9;
      color: #0f172a;
      direction: rtl;
      margin: 0;
      padding: 0;
      font-size: 9px;
    }
    .report-page {
      width: 794px;
      min-height: 1122px;
      height: 1122px;
      max-height: 1122px;
      padding: 24px 28px 20px 28px;
      margin: 0 auto 12px auto;
      background: #ffffff;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      direction: rtl;
      text-align: right;
      page-break-after: always;
      break-after: page;
    }
    .report-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
      margin-bottom: 0;
    }
    .page-footer-container {
      position: absolute;
      bottom: 20px;
      left: 28px;
      right: 28px;
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
      font-weight: bold;
      color: #334155;
      background: #f8fafc;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      display: inline-block;
      line-height: 13px;
    }
    .badge-page {
      font-size: 8px;
      font-weight: 800;
      color: #ffffff;
      background: #0f172a;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-block;
      line-height: 13px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      line-height: 13px;
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
      font-size: 8.5px;
      line-height: 13px;
      padding: 5px 5px;
      border: 1px solid #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    table.report-table td {
      padding: 4px 5px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
      font-size: 8.5px;
      line-height: 13px;
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
      font-size: 8.5px;
      line-height: 13px;
      padding: 5px 5px;
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
 * Attaches the container with absolute coordinates at top: 0, left: 0 with zIndex: -1000,
 * ensuring the browser's hardware rasterizer fully computes Arabic font glyphs,
 * preventing any line squashing or text collision.
 */
export async function generatePdfBlobFromModel(model: ReportModel): Promise<Blob> {
  const htmlContent = buildPrintableReportHTML(model);
  const container = document.createElement('div');
  container.id = 'thari-pdf-container-' + Date.now();
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
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

    await new Promise((resolve) => setTimeout(resolve, 300));

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
        scale: 2.0,
        useCORS: true,
        logging: false,
        width: 794,
        height: 1122,
        windowWidth: 794,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

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
