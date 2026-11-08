import {
  ReportModel,
  ReportType,
  ReportLedgerEntry,
  ReportBudgetSummary,
  ReportDebtItem,
  ReportGoalItem,
  ReportWalletLedgerGroup,
} from './reportTypes';

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
 * Builds a clean, spacious, wallet-segregated printable HTML document styled for A4 PDF rendering.
 * - Zero QR codes, zero cryptographic hashes, zero English technical boilerplate.
 * - Every metric and value is placed in its own block <div> or <td> cell (no sibling inline <span> tags)
 *   so html2canvas and browser print engines render Arabic words and lines with 100% clarity and zero overlap.
 * - Divides multi-wallet reports by Wallet (قسم مستقل لكل محفظة) for effortless auditing and review.
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
    walletLedgers = [],
    transactions = [],
    budgets = [],
    debts,
    goals,
  } = model;

  const baseSymbol = scope.baseCurrency?.symbol || 'SAR';
  const baseCode = scope.baseCurrency?.code || 'SAR';

  const typeTitles: Record<ReportType, string> = {
    summary: 'الملخص المالي التنفيذي الشامل',
    detailed: 'كشف حساب العمليات والقيود التفصيلي (مقسم حسب المحافظ)',
    category: 'تقرير الميزانية ومطابقة الإنفاق الفعلي',
    wealth: 'تقرير صافي الثروة وتوزيع المحافظ والعملات',
    debts: 'كشف الديون والالتزامات المالية',
    savings_goals: 'تقرير الأهداف المالية ومتابعة المدخرات',
  };

  const reportTitleAr = typeTitles[reportType] || typeTitles.summary;

  const periodText = scope.periodLabelAr || (
    scope.startDate && scope.endDate
      ? `من ${scope.startDate} إلى ${scope.endDate}`
      : 'كافة الفترات المسجلة'
  );

  const walletsScopeText = (scope.selectedWallets && scope.selectedWallets.length > 0)
    ? (scope.isAllWallets
        ? `كافة المحافظ المالية (${scope.selectedWallets.length} محافظ)`
        : scope.selectedWallets.map(w => w.name).join(' ، '))
    : (scope.walletNameAr || 'كافة المحافظ المالية');

  const currenciesScopeText = (scope.currenciesInScope && scope.currenciesInScope.length > 0)
    ? scope.currenciesInScope.map(c => `${c.nameAr} (${c.code})`).join(' ، ')
    : baseCode;

  // --- Main Header (Page 1) ---
  const renderMainHeader = (pageNum: number, totalPages: number) => `
    <div style="margin-bottom: 14px;">
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #0f172a; padding-bottom: 10px; table-layout: fixed;">
        <tr>
          <td style="width: 64%; text-align: right; vertical-align: middle; padding: 0 0 10px 10px;">
            <div style="font-size: 12px; font-weight: 700; color: #b45309; line-height: 18px; margin-bottom: 3px;">
              تطبيق ثَـــري للإدارة المالية الذكية
            </div>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; line-height: 26px;">
              ${esc(reportTitleAr)}
            </div>
          </td>
          <td style="width: 36%; text-align: left; vertical-align: middle; padding: 0 0 10px 0;">
            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
              <tr>
                <td style="padding: 8px 12px; text-align: right;">
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 17px;">
                    الحساب: ${esc(account.name)}
                  </div>
                  <div style="font-size: 10px; font-weight: 500; color: #475569; line-height: 16px; margin-top: 2px;">
                    تاريخ الإصدار: ${esc(metadata.generatedAtFormattedAr)}
                  </div>
                  <div style="font-size: 10px; font-weight: 700; color: #b45309; line-height: 15px; margin-top: 2px;">
                    صفحة ${pageNum} من ${totalPages}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Running Header (Pages 2+) ---
  const renderRunningHeader = (pageNum: number, totalPages: number) => `
    <div style="margin-bottom: 12px;">
      <table style="width: 100%; border-collapse: collapse; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 8px; table-layout: fixed;">
        <tr>
          <td style="width: 68%; text-align: right; vertical-align: middle; padding-bottom: 6px;">
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 20px;">
              ثَـــري • ${esc(reportTitleAr)} (تابع)
            </div>
          </td>
          <td style="width: 32%; text-align: left; vertical-align: middle; padding-bottom: 6px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #334155; line-height: 18px;">
              الحساب: ${esc(account.name)} • صفحة ${pageNum} من ${totalPages}
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  // --- Scope Grid (Page 1) ---
  const renderScopeGrid = () => `
    <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #cbd5e1; margin-bottom: 12px; table-layout: fixed;">
      <tr>
        <td style="width: 30%; padding: 8px 10px; text-align: right; vertical-align: top; border-left: 1px solid #cbd5e1;">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748b; line-height: 15px; margin-bottom: 3px;">
            نطاق المحافظ المشمولة
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 17px;">
            ${esc(walletsScopeText)}
          </div>
        </td>
        <td style="width: 26%; padding: 8px 10px; text-align: right; vertical-align: top; border-left: 1px solid #cbd5e1;">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748b; line-height: 15px; margin-bottom: 3px;">
            العملات المعتمدة
          </div>
          <div style="font-size: 10.5px; font-weight: 700; color: #065f46; line-height: 17px;">
            ${esc(currenciesScopeText)}
          </div>
        </td>
        <td style="width: 24%; padding: 8px 10px; text-align: right; vertical-align: top; border-left: 1px solid #cbd5e1;">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748b; line-height: 15px; margin-bottom: 3px;">
            الفترة الزمنية
          </div>
          <div style="font-size: 10.5px; font-weight: 700; color: #0f172a; line-height: 17px;">
            ${esc(periodText)}
          </div>
        </td>
        <td style="width: 20%; padding: 8px 10px; text-align: right; vertical-align: top;">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748b; line-height: 15px; margin-bottom: 3px;">
            إجمالي العمليات
          </div>
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; line-height: 17px;">
            ${transactions.length} عملية مسجلة
          </div>
        </td>
      </tr>
    </table>
  `;

  // --- Overall KPI Row (Page 1) ---
  const renderOverallKpiRow = () => `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; table-layout: fixed;">
      <tr>
        <td style="width: 25%; padding: 0 0 0 6px;">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-top: 3px solid #d97706; padding: 8px 10px; text-align: right;">
            <div style="font-size: 9.5px; font-weight: 700; color: #475569; line-height: 15px; margin-bottom: 3px;">
              الرصيد الافتتاحي العام
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 19px;">
              ${formatNum(kpis.openingBalance)} ${esc(baseSymbol)}
            </div>
          </div>
        </td>
        <td style="width: 25%; padding: 0 3px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-top: 3px solid #16a34a; padding: 8px 10px; text-align: right;">
            <div style="font-size: 9.5px; font-weight: 700; color: #166534; line-height: 15px; margin-bottom: 3px;">
              إجمالي المقبوضات (الوارد)
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #15803d; line-height: 19px;">
              +${formatNum(kpis.totalIncome)} ${esc(baseSymbol)}
            </div>
          </div>
        </td>
        <td style="width: 25%; padding: 0 3px;">
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-top: 3px solid #e11d48; padding: 8px 10px; text-align: right;">
            <div style="font-size: 9.5px; font-weight: 700; color: #9f1239; line-height: 15px; margin-bottom: 3px;">
              إجمالي المنصرفات (الصادر)
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #be123c; line-height: 19px;">
              -${formatNum(kpis.totalExpense)} ${esc(baseSymbol)}
            </div>
          </div>
        </td>
        <td style="width: 25%; padding: 0 6px 0 0;">
          <div style="background: #0f172a; border: 1px solid #0f172a; border-top: 3px solid #fbbf24; padding: 8px 10px; text-align: right;">
            <div style="font-size: 9.5px; font-weight: 700; color: #cbd5e1; line-height: 15px; margin-bottom: 3px;">
              الرصيد الختامي الموحد
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #fbbf24; line-height: 19px;">
              ${formatNum(kpis.closingBalance)} ${esc(baseSymbol)}
            </div>
          </div>
        </td>
      </tr>
    </table>
  `;

  // --- Multi-Wallet Overview Summary Table (Shows each wallet's Opening, Inflow, Outflow, Closing) ---
  const renderWalletsOverviewTable = (groups: ReportWalletLedgerGroup[]) => {
    if (!groups || groups.length === 0) return '';
    return `
      <div style="margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 20px; margin-bottom: 6px;">
          ملخص أرصدة وحركة المحافظ المالية (تفصيل كل محفظة على حدة لسهولة المراجعة)
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 22%; text-align: right;">اسم المحفظة</th>
              <th style="width: 10%; text-align: center;">العملة</th>
              <th style="width: 15%; text-align: right;">الرصيد الافتتاحي</th>
              <th style="width: 15%; text-align: right; color: #86efac;">إجمالي الوارد (+)</th>
              <th style="width: 15%; text-align: right; color: #fca5a5;">إجمالي المنصرف (-)</th>
              <th style="width: 15%; text-align: right; color: #fde68a;">الرصيد الختامي (=)</th>
              <th style="width: 8%; text-align: center;">العمليات</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(w => {
              const sym = w.metadata?.symbol || w.currencyCode;
              return `
                <tr>
                  <td style="text-align: right; font-weight: 800; color: #0f172a;">${esc(w.walletName)}</td>
                  <td style="text-align: center; font-weight: 700; color: #475569;">${esc(w.currencyCode)}</td>
                  <td style="text-align: right; font-weight: 700; color: #334155;">${formatNum(w.openingBalance)} ${esc(sym)}</td>
                  <td style="text-align: right; font-weight: 800; color: #15803d;">+${formatNum(w.totalIncome)} ${esc(sym)}</td>
                  <td style="text-align: right; font-weight: 800; color: #be123c;">-${formatNum(w.totalExpense)} ${esc(sym)}</td>
                  <td style="text-align: right; font-weight: 800; color: #0f172a; background: #fffbeb;">${formatNum(w.closingBalance)} ${esc(sym)}</td>
                  <td style="text-align: center; font-weight: 700; color: #475569;">${w.transactions.length}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // --- Page Footer ---
  const renderPageFooter = (pageNum: number, totalPages: number) => `
    <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 8px; table-layout: fixed;">
      <tr>
        <td style="text-align: right; vertical-align: middle; font-size: 9.5px; font-weight: 700; color: #64748b; line-height: 16px; width: 70%;">
          تطبيق ثـري للإدارة المالية الذكية • ${esc(reportTitleAr)}
        </td>
        <td style="text-align: left; vertical-align: middle; font-size: 9.5px; font-weight: 800; color: #0f172a; line-height: 16px; width: 30%;">
          صفحة ${pageNum} من ${totalPages}
        </td>
      </tr>
    </table>
  `;

  // --- 7-Column Wallet Statement Table Header (Spacious & Uncrowded) ---
  const renderWalletLedgerTableHeader = (sym: string) => `
    <thead>
      <tr style="border-bottom: 2px solid #d97706;">
        <th style="width: 6%; text-align: center; background: #0f172a; color: #ffffff; padding: 9px 6px; font-size: 11px;">م</th>
        <th style="width: 14%; text-align: center; background: #0f172a; color: #ffffff; padding: 9px 6px; font-size: 11px;">التاريخ</th>
        <th style="width: 34%; text-align: right; background: #0f172a; color: #ffffff; padding: 9px 10px; font-size: 11px;">البيان وتفاصيل العملية</th>
        <th style="width: 14%; text-align: right; background: #0f172a; color: #ffffff; padding: 9px 8px; font-size: 11px;">التصنيف</th>
        <th style="width: 10%; text-align: right; background: #0f172a; color: #fca5a5; padding: 9px 8px; font-size: 11px;">منصرف (-)</th>
        <th style="width: 10%; text-align: right; background: #0f172a; color: #86efac; padding: 9px 8px; font-size: 11px;">وارد (+)</th>
        <th style="width: 12%; text-align: right; background: #0f172a; color: #fde68a; padding: 9px 8px; font-size: 11px;">الرصيد (${esc(sym)})</th>
      </tr>
    </thead>
  `;

  const renderWalletLedgerTableRow = (tx: ReportLedgerEntry, idx: number) => {
    const isInflow = tx.walletEntryDirection
      ? tx.walletEntryDirection === 'inflow'
      : tx.type === 'income';
    const isOutflow = !isInflow;
    const effectiveBal = tx.walletRunningBalance !== undefined
      ? tx.walletRunningBalance
      : (tx.currencyRunningBalance !== undefined ? tx.currencyRunningBalance : tx.runningBalance);

    return `
      <tr>
        <td style="text-align: center; color: #475569; font-size: 10.5px; padding: 8px 6px; font-weight: 700;">
          ${idx + 1}
        </td>
        <td style="text-align: center; font-size: 10.5px; color: #1e293b; white-space: nowrap; padding: 8px 6px; font-weight: 700;">
          ${esc(tx.date)}
        </td>
        <td style="text-align: right; color: #0f172a; padding: 8px 10px;">
          <div style="font-size: 11px; line-height: 18px; font-weight: 700; color: #0f172a;">
            ${esc(tx.note || tx.categoryName)}
          </div>
          ${tx.conversionNote ? `
            <div style="font-size: 9.5px; color: #b45309; line-height: 15px; margin-top: 2px; font-weight: 600;">
              ${esc(tx.conversionNote)}
            </div>
          ` : ''}
        </td>
        <td style="text-align: right; font-weight: 700; color: #334155; font-size: 10.5px; padding: 8px 8px;">
          ${esc(tx.categoryName)}
        </td>
        <td style="text-align: right; font-weight: 800; color: #be123c; white-space: nowrap; font-size: 11px; padding: 8px 8px;">
          ${isOutflow ? `-${formatNum(tx.originalAmount)}` : '-'}
        </td>
        <td style="text-align: right; font-weight: 800; color: #15803d; white-space: nowrap; font-size: 11px; padding: 8px 8px;">
          ${isInflow ? `+${formatNum(tx.originalAmount)}` : '-'}
        </td>
        <td style="text-align: right; font-weight: 800; color: #0f172a; white-space: nowrap; font-size: 11px; background: #fffbeb; padding: 8px 8px;">
          ${effectiveBal !== undefined ? formatNum(effectiveBal) : '-'}
        </td>
      </tr>
    `;
  };

  const pagesHTML: string[] = [];

  // ==========================================
  // 1. Detailed Ledger Report (Divided by Wallet for Easy Review)
  // ==========================================
  if (reportType === 'detailed') {
    const effectiveWalletGroups: ReportWalletLedgerGroup[] = (walletLedgers && walletLedgers.length > 0)
      ? walletLedgers
      : [{
          walletId: 'all',
          walletName: scope.walletNameAr || 'كافة المحافظ',
          walletColor: '#d97706',
          currencyCode: baseCode,
          metadata: scope.baseCurrency,
          openingBalance: kpis.openingBalance,
          totalIncome: kpis.totalIncome,
          totalExpense: kpis.totalExpense,
          netAmount: kpis.netSavings,
          closingBalance: kpis.closingBalance,
          convertedClosingToBase: kpis.closingBalance,
          transactions: transactions,
        }];

    interface PrintWalletSection {
      walletId: string;
      walletName: string;
      currencyCode: string;
      sym: string;
      openingBal: number;
      income: number;
      expense: number;
      closingBal: number;
      totalWalletTxs: number;
      isContinuation: boolean;
      chunk: ReportLedgerEntry[];
      startIndex: number;
    }

    const sectionsByPage: PrintWalletSection[][] = [];
    let currentPageSections: PrintWalletSection[] = [];

    // Calculate how much space Page 1 has after Scope, KPIs, and (if multi-wallet) the Wallets Overview table
    const overviewTableWeight = effectiveWalletGroups.length > 1 ? (effectiveWalletGroups.length + 2) : 0;
    let currentPageWeight = overviewTableWeight;
    const PAGE_1_MAX_WEIGHT = 11;
    const PAGE_N_MAX_WEIGHT = 14;

    effectiveWalletGroups.forEach(wGroup => {
      const wTxs = wGroup.transactions || [];
      const sym = wGroup.metadata?.symbol || wGroup.currencyCode;
      let txIdx = 0;

      if (wTxs.length === 0) {
        const currentMax = sectionsByPage.length === 0 ? PAGE_1_MAX_WEIGHT : PAGE_N_MAX_WEIGHT;
        if (currentPageWeight + 3 > currentMax && currentPageSections.length > 0) {
          sectionsByPage.push(currentPageSections);
          currentPageSections = [];
          currentPageWeight = 0;
        }
        currentPageSections.push({
          walletId: wGroup.walletId,
          walletName: wGroup.walletName,
          currencyCode: wGroup.currencyCode,
          sym,
          openingBal: wGroup.openingBalance,
          income: wGroup.totalIncome,
          expense: wGroup.totalExpense,
          closingBal: wGroup.closingBalance,
          totalWalletTxs: 0,
          isContinuation: false,
          chunk: [],
          startIndex: 0,
        });
        currentPageWeight += 3;
        return;
      }

      let isFirstChunkOfWallet = true;
      while (txIdx < wTxs.length) {
        const currentMax = sectionsByPage.length === 0 ? PAGE_1_MAX_WEIGHT : PAGE_N_MAX_WEIGHT;
        const availableSpace = currentMax - currentPageWeight;

        // If we cannot fit the wallet header + at least 2 rows on the current page, start a new page
        if (availableSpace < 4 && currentPageSections.length > 0) {
          sectionsByPage.push(currentPageSections);
          currentPageSections = [];
          currentPageWeight = 0;
        }

        const effectiveMax = sectionsByPage.length === 0 ? PAGE_1_MAX_WEIGHT : PAGE_N_MAX_WEIGHT;
        const effectiveAvailable = effectiveMax - currentPageWeight;
        const rowsToTake = Math.min(Math.max(2, effectiveAvailable - 2), wTxs.length - txIdx);
        const chunk = wTxs.slice(txIdx, txIdx + rowsToTake);

        currentPageSections.push({
          walletId: wGroup.walletId,
          walletName: wGroup.walletName,
          currencyCode: wGroup.currencyCode,
          sym,
          openingBal: wGroup.openingBalance,
          income: wGroup.totalIncome,
          expense: wGroup.totalExpense,
          closingBal: wGroup.closingBalance,
          totalWalletTxs: wTxs.length,
          isContinuation: !isFirstChunkOfWallet,
          chunk,
          startIndex: txIdx,
        });

        currentPageWeight += (chunk.length + 2.5);
        txIdx += rowsToTake;
        isFirstChunkOfWallet = false;

        if (currentPageWeight >= effectiveMax) {
          sectionsByPage.push(currentPageSections);
          currentPageSections = [];
          currentPageWeight = 0;
        }
      }
    });

    if (currentPageSections.length > 0) {
      sectionsByPage.push(currentPageSections);
    }

    const totalPages = Math.max(1, sectionsByPage.length);

    sectionsByPage.forEach((pageSections, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;

      const topHeader = isFirst
        ? renderMainHeader(pageNum, totalPages)
        : renderRunningHeader(pageNum, totalPages);

      const topElements = isFirst
        ? `
          ${renderScopeGrid()}
          ${renderOverallKpiRow()}
          ${effectiveWalletGroups.length > 1 ? renderWalletsOverviewTable(effectiveWalletGroups) : ''}
        `
        : '';

      const sectionsHTML = pageSections.map(sec => {
        const walletBannerTitle = sec.isContinuation
          ? `محفظة: ${esc(sec.walletName)} (${esc(sec.currencyCode)}) - تابع كشف المحفظة`
          : `كشف حساب محفظة: ${esc(sec.walletName)} (${esc(sec.currencyCode)}) • ${sec.totalWalletTxs} عملية`;

        // 5-Column Wallet Summary Banner (Each metric in its own <td> cell to prevent any text collision)
        const walletHeaderHTML = `
          <table style="width: 100%; border-collapse: collapse; background: #f1f5f9; border: 1.5px solid #94a3b8; margin: 10px 0 4px 0; table-layout: fixed;">
            <tr>
              <td style="width: 32%; padding: 7px 10px; text-align: right; vertical-align: middle; border-left: 1px solid #cbd5e1; background: #e2e8f0;">
                <div style="font-size: 9px; font-weight: 700; color: #475569; line-height: 14px;">اسم المحفظة والعملة</div>
                <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 18px;">${walletBannerTitle}</div>
              </td>
              <td style="width: 17%; padding: 7px 8px; text-align: right; vertical-align: middle; border-left: 1px solid #cbd5e1;">
                <div style="font-size: 9px; font-weight: 700; color: #64748b; line-height: 14px;">الرصيد الافتتاحي</div>
                <div style="font-size: 11px; font-weight: 800; color: #0f172a; line-height: 17px;">${formatNum(sec.openingBal)} ${esc(sec.sym)}</div>
              </td>
              <td style="width: 17%; padding: 7px 8px; text-align: right; vertical-align: middle; border-left: 1px solid #cbd5e1;">
                <div style="font-size: 9px; font-weight: 700; color: #166534; line-height: 14px;">إجمالي الوارد (+)</div>
                <div style="font-size: 11px; font-weight: 800; color: #15803d; line-height: 17px;">+${formatNum(sec.income)} ${esc(sec.sym)}</div>
              </td>
              <td style="width: 17%; padding: 7px 8px; text-align: right; vertical-align: middle; border-left: 1px solid #cbd5e1;">
                <div style="font-size: 9px; font-weight: 700; color: #9f1239; line-height: 14px;">إجمالي المنصرف (-)</div>
                <div style="font-size: 11px; font-weight: 800; color: #be123c; line-height: 17px;">-${formatNum(sec.expense)} ${esc(sec.sym)}</div>
              </td>
              <td style="width: 17%; padding: 7px 8px; text-align: right; vertical-align: middle; background: #fffbeb;">
                <div style="font-size: 9px; font-weight: 700; color: #92400e; line-height: 14px;">الرصيد الختامي (=)</div>
                <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 17px;">${formatNum(sec.closingBal)} ${esc(sec.sym)}</div>
              </td>
            </tr>
          </table>
        `;

        const rowsHTML = sec.chunk.map((tx, idx) =>
          renderWalletLedgerTableRow(tx, sec.startIndex + idx)
        ).join('');

        return `
          <div style="margin-bottom: 12px;">
            ${walletHeaderHTML}
            <table class="report-table">
              ${renderWalletLedgerTableHeader(sec.sym)}
              <tbody>
                ${rowsHTML || `<tr><td colspan="7" style="text-align: center; padding: 14px; color: #64748b; font-weight: 700;">لا توجد عمليات مسجلة في هذه المحفظة خلال الفترة المحددة</td></tr>`}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      const pageContent = `
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            ${sectionsHTML}
          </div>
          <div class="page-footer-container">
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

    const bCap = 14;
    const bChunks: ReportBudgetSummary[][] = [];
    if (budgetList.length <= bCap) {
      bChunks.push(budgetList);
    } else {
      for (let i = 0; i < budgetList.length; i += bCap) {
        bChunks.push(budgetList.slice(i, i + bCap));
      }
    }

    const totalPages = Math.max(1, bChunks.length);

    bChunks.forEach((chunk, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;
      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);

      const topElements = isFirst ? `
        ${renderScopeGrid()}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed;">
          <tr>
            <td style="width: 25%; padding: 0 0 0 6px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #475569; line-height: 15px;">الميزانية المعتمدة</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 19px; margin-top: 2px;">${formatNum(totalBudgeted)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
              <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #9f1239; line-height: 15px;">الإنفاق الفعلي</div>
                <div style="font-size: 13px; font-weight: 800; color: #be123c; line-height: 19px; margin-top: 2px;">-${formatNum(kpis.totalExpense)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 25%; padding: 0 3px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #166534; line-height: 15px;">المتبقي من الميزانية</div>
                <div style="font-size: 13px; font-weight: 800; color: #15803d; line-height: 19px; margin-top: 2px;">${formatNum(totalRemainingBudget)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 25%; padding: 0 6px 0 0;">
              <div style="background: #0f172a; border: 1px solid #0f172a; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #cbd5e1; line-height: 15px;">نسبة الاستهلاك</div>
                <div style="font-size: 13px; font-weight: 800; color: #fbbf24; line-height: 19px; margin-top: 2px;">${budgetUtilizationRate.toFixed(1)}%</div>
              </div>
            </td>
          </tr>
        </table>
      ` : '';

      const rowsHTML = chunk.map((b) => `
        <tr>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">${esc(b.categoryName)}</td>
          <td style="text-align: right; font-weight: 700;">${formatNum(b.budgetAmount)} ${esc(baseSymbol)}</td>
          <td style="text-align: right; font-weight: 800; color: #be123c;">${formatNum(b.spentAmount)} ${esc(baseSymbol)}</td>
          <td style="text-align: right; font-weight: 800; color: ${b.remainingAmount < 0 ? '#be123c' : '#15803d'};">${formatNum(b.remainingAmount)} ${esc(baseSymbol)}</td>
          <td style="text-align: center; font-weight: 800;">${b.percentageUsed.toFixed(1)}%</td>
          <td style="text-align: center; font-weight: 700; color: ${b.isOverBudget ? '#be123c' : '#15803d'};">${esc(b.statusLabelAr)}</td>
        </tr>
      `).join('');

      pagesHTML.push(`
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 24%; text-align: right;">التصنيف المالي</th>
                  <th style="width: 17%; text-align: right;">الميزانية المعتمدة</th>
                  <th style="width: 17%; text-align: right;">الإنفاق الفعلي</th>
                  <th style="width: 17%; text-align: right;">المتبقي</th>
                  <th style="width: 11%; text-align: center;">الاستهلاك</th>
                  <th style="width: 14%; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="6" style="text-align: center; padding: 16px; color: #64748b;">لا توجد ميزانيات مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="page-footer-container">
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `);
    });
  }

  // ==========================================
  // 3. Debts & Liabilities Statement
  // ==========================================
  else if (reportType === 'debts') {
    const debtItems: ReportDebtItem[] = debts?.items || [];
    const dCap = 14;
    const dChunks: ReportDebtItem[][] = [];
    if (debtItems.length <= dCap) {
      dChunks.push(debtItems);
    } else {
      for (let i = 0; i < debtItems.length; i += dCap) {
        dChunks.push(debtItems.slice(i, i + dCap));
      }
    }

    const totalPages = Math.max(1, dChunks.length);

    dChunks.forEach((chunk, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;
      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);

      const topElements = isFirst ? `
        ${renderScopeGrid()}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed;">
          <tr>
            <td style="width: 33.33%; padding: 0 0 0 6px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #166534; line-height: 15px;">مستحقات لك (ديون لي)</div>
                <div style="font-size: 13px; font-weight: 800; color: #15803d; line-height: 19px; margin-top: 2px;">+${formatNum(debts?.totalReceivable)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 0 3px;">
              <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #9f1239; line-height: 15px;">التزامات عليك (ديون علي)</div>
                <div style="font-size: 13px; font-weight: 800; color: #be123c; line-height: 19px; margin-top: 2px;">-${formatNum(debts?.totalPayable)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 0 6px 0 0;">
              <div style="background: #0f172a; border: 1px solid #0f172a; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #cbd5e1; line-height: 15px;">صافي موقف الديون</div>
                <div style="font-size: 13px; font-weight: 800; color: #fbbf24; line-height: 19px; margin-top: 2px;">${formatNum(debts?.netDebtPosition)} ${esc(baseSymbol)}</div>
              </div>
            </td>
          </tr>
        </table>
      ` : '';

      const rowsHTML = chunk.map((d) => `
        <tr>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">${esc(d.personName)}</td>
          <td style="text-align: center; font-weight: 700; color: ${d.type === 'to_me' ? '#15803d' : '#be123c'};">${esc(d.typeLabelAr)}</td>
          <td style="text-align: right; font-weight: 700;">${formatNum(d.originalAmount)} ${esc(d.currency)}</td>
          <td style="text-align: right; font-weight: 700; color: #15803d;">${formatNum(d.paidAmount)} ${esc(d.currency)}</td>
          <td style="text-align: right; font-weight: 800; color: #be123c;">${formatNum(d.remainingAmount)} ${esc(d.currency)}</td>
          <td style="text-align: center; font-size: 10px;">${esc(d.dueDate || '-')}</td>
          <td style="text-align: center; font-weight: 700;">${esc(d.statusLabelAr)}</td>
        </tr>
      `).join('');

      pagesHTML.push(`
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 22%; text-align: right;">الطرف / الاسم</th>
                  <th style="width: 14%; text-align: center;">نوع الدين</th>
                  <th style="width: 16%; text-align: right;">المبلغ الأصلي</th>
                  <th style="width: 15%; text-align: right;">المسدد</th>
                  <th style="width: 15%; text-align: right;">المتبقي</th>
                  <th style="width: 9%; text-align: center;">الاستحقاق</th>
                  <th style="width: 9%; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="7" style="text-align: center; padding: 16px; color: #64748b;">لا توجد ديون مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="page-footer-container">
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `);
    });
  }

  // ==========================================
  // 4. Goals & Savings Progress Report
  // ==========================================
  else if (reportType === 'savings_goals') {
    const goalItems: ReportGoalItem[] = goals?.items || [];
    const gCap = 14;
    const gChunks: ReportGoalItem[][] = [];
    if (goalItems.length <= gCap) {
      gChunks.push(goalItems);
    } else {
      for (let i = 0; i < goalItems.length; i += gCap) {
        gChunks.push(goalItems.slice(i, i + gCap));
      }
    }

    const totalPages = Math.max(1, gChunks.length);

    gChunks.forEach((chunk, pIdx) => {
      const pageNum = pIdx + 1;
      const isFirst = pageNum === 1;
      const topHeader = isFirst ? renderMainHeader(pageNum, totalPages) : renderRunningHeader(pageNum, totalPages);

      const topElements = isFirst ? `
        ${renderScopeGrid()}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed;">
          <tr>
            <td style="width: 33.33%; padding: 0 0 0 6px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #166534; line-height: 15px;">إجمالي المدخر الفعلي</div>
                <div style="font-size: 13px; font-weight: 800; color: #15803d; line-height: 19px; margin-top: 2px;">${formatNum(goals?.totalSavedAmount)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 0 3px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #475569; line-height: 15px;">إجمالي المستهدف المالي</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 19px; margin-top: 2px;">${formatNum(goals?.totalTargetAmount)} ${esc(baseSymbol)}</div>
              </div>
            </td>
            <td style="width: 33.33%; padding: 0 6px 0 0;">
              <div style="background: #0f172a; border: 1px solid #0f172a; padding: 8px 10px; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; color: #cbd5e1; line-height: 15px;">نسبة الإنجاز العامة</div>
                <div style="font-size: 13px; font-weight: 800; color: #fbbf24; line-height: 19px; margin-top: 2px;">${(goals?.overallProgressPercent || 0).toFixed(1)}%</div>
              </div>
            </td>
          </tr>
        </table>
      ` : '';

      const rowsHTML = chunk.map((g) => `
        <tr>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">${esc(g.name)}</td>
          <td style="text-align: right; font-weight: 700;">${formatNum(g.convertedTarget)} ${esc(baseSymbol)}</td>
          <td style="text-align: right; font-weight: 800; color: #15803d;">${formatNum(g.convertedCurrent)} ${esc(baseSymbol)}</td>
          <td style="text-align: right; font-weight: 700;">${formatNum(g.remainingAmount)} ${esc(baseSymbol)}</td>
          <td style="text-align: center; font-weight: 800;">${g.progressPercent.toFixed(1)}%</td>
          <td style="text-align: center; font-size: 10px;">${esc(g.deadline || '-')}</td>
          <td style="text-align: center; font-weight: 700; color: ${g.isCompleted ? '#15803d' : '#b45309'};">${g.isCompleted ? 'مكتمل' : 'قيد الإنجاز'}</td>
        </tr>
      `).join('');

      pagesHTML.push(`
        <div class="report-page">
          <div style="width: 100%;">
            ${topHeader}
            ${topElements}
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 24%; text-align: right;">اسم الهدف المالي</th>
                  <th style="width: 16%; text-align: right;">المستهدف</th>
                  <th style="width: 16%; text-align: right;">المدخر الحالي</th>
                  <th style="width: 16%; text-align: right;">المتبقي</th>
                  <th style="width: 10%; text-align: center;">الإنجاز</th>
                  <th style="width: 9%; text-align: center;">التاريخ</th>
                  <th style="width: 9%; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML || `<tr><td colspan="7" style="text-align: center; padding: 16px; color: #64748b;">لا توجد أهداف مسجلة</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="page-footer-container">
            ${renderPageFooter(pageNum, totalPages)}
          </div>
        </div>
      `);
    });
  }

  // ==========================================
  // 5. Wealth & Multi-Currency Portfolio
  // ==========================================
  else if (reportType === 'wealth') {
    pagesHTML.push(`
      <div class="report-page">
        <div style="width: 100%;">
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          ${renderOverallKpiRow()}
          ${renderWalletsOverviewTable(walletLedgers)}

          <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 20px; margin: 12px 0 6px 0;">
            توزيع السيولة والأرصدة حسب العملات
          </div>
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 22%; text-align: right;">العملة</th>
                <th style="width: 10%; text-align: center;">الرمز</th>
                <th style="width: 14%; text-align: right;">الرصيد الافتتاحي</th>
                <th style="width: 14%; text-align: right; color: #86efac;">إجمالي الوارد (+)</th>
                <th style="width: 14%; text-align: right; color: #fca5a5;">إجمالي المنصرف (-)</th>
                <th style="width: 14%; text-align: right; color: #fde68a;">الرصيد الختامي</th>
                <th style="width: 12%; text-align: right;">المعادل (${esc(baseSymbol)})</th>
              </tr>
            </thead>
            <tbody>
              ${currencyBreakdown.map((cb) => `
                <tr>
                  <td style="text-align: right; font-weight: 800;">${esc(cb.metadata?.nameAr || cb.code)}</td>
                  <td style="text-align: center; font-weight: 700;">${esc(cb.code)}</td>
                  <td style="text-align: right; font-weight: 700;">${formatNum(cb.openingBalance)}</td>
                  <td style="text-align: right; font-weight: 800; color: #15803d;">+${formatNum(cb.income)}</td>
                  <td style="text-align: right; font-weight: 800; color: #be123c;">-${formatNum(cb.expense)}</td>
                  <td style="text-align: right; font-weight: 800; background: #fffbeb;">${formatNum(cb.closingBalance)}</td>
                  <td style="text-align: right; font-weight: 800; color: #b45309;">${formatNum(cb.convertedClosingToBase || cb.convertedNetToBase)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="page-footer-container">
          ${renderPageFooter(1, 1)}
        </div>
      </div>
    `);
  }

  // ==========================================
  // 6. Executive Financial Summary Report (Includes Wallet-by-Wallet Breakdown)
  // ==========================================
  else {
    const topExpenses = expenseCategories.slice(0, 6);

    pagesHTML.push(`
      <div class="report-page">
        <div style="width: 100%;">
          ${renderMainHeader(1, 1)}
          ${renderScopeGrid()}
          ${renderOverallKpiRow()}

          <!-- Wallet-by-Wallet Breakdown Table for Easy Review -->
          ${renderWalletsOverviewTable(walletLedgers)}

          <!-- Multi-Currency Matrix -->
          ${currencyBreakdown.length > 0 ? `
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 20px; margin: 10px 0 6px 0;">
              ملخص الأرصدة والعمليات حسب العملات
            </div>
            <table class="report-table" style="margin-bottom: 12px;">
              <thead>
                <tr>
                  <th style="width: 22%; text-align: right;">العملة</th>
                  <th style="width: 15%; text-align: right;">الرصيد الافتتاحي</th>
                  <th style="width: 16%; text-align: right; color: #86efac;">+ المقبوضات</th>
                  <th style="width: 16%; text-align: right; color: #fca5a5;">- المنصرفات</th>
                  <th style="width: 15%; text-align: right;">= الصافي</th>
                  <th style="width: 16%; text-align: right; color: #fde68a;">الرصيد الختامي</th>
                </tr>
              </thead>
              <tbody>
                ${currencyBreakdown.map((cb) => `
                  <tr>
                    <td style="text-align: right; font-weight: 800;">${esc(cb.metadata?.nameAr || cb.code)} (${esc(cb.code)})</td>
                    <td style="text-align: right; font-weight: 700;">${formatNum(cb.openingBalance)} ${esc(cb.metadata?.symbol || '')}</td>
                    <td style="text-align: right; font-weight: 800; color: #15803d;">+${formatNum(cb.income)} ${esc(cb.metadata?.symbol || '')}</td>
                    <td style="text-align: right; font-weight: 800; color: #be123c;">-${formatNum(cb.expense)} ${esc(cb.metadata?.symbol || '')}</td>
                    <td style="text-align: right; font-weight: 800;">${cb.net >= 0 ? '+' : ''}${formatNum(cb.net)} ${esc(cb.metadata?.symbol || '')}</td>
                    <td style="text-align: right; font-weight: 800; background: #fffbeb;">${formatNum(cb.closingBalance)} ${esc(cb.metadata?.symbol || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <!-- Top Expense Categories Table -->
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; line-height: 20px; margin: 10px 0 6px 0;">
            أبرز بنود وتصنيفات المصروفات
          </div>
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 45%; text-align: right;">اسم التصنيف</th>
                <th style="width: 20%; text-align: center;">عدد العمليات</th>
                <th style="width: 20%; text-align: right;">إجمالي المبلغ</th>
                <th style="width: 15%; text-align: center;">النسبة</th>
              </tr>
            </thead>
            <tbody>
              ${topExpenses.map((c) => `
                <tr>
                  <td style="text-align: right; font-weight: 800;">${esc(c.name)}</td>
                  <td style="text-align: center; font-weight: 700;">${c.transactionCount}</td>
                  <td style="text-align: right; font-weight: 800; color: #be123c;">${formatNum(c.totalAmount)} ${esc(baseSymbol)}</td>
                  <td style="text-align: center; font-weight: 700;">${Math.round(c.percentageOfTotal || 0)}%</td>
                </tr>
              `).join('')}
              ${topExpenses.length === 0 ? `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">لا توجد مصروفات مسجلة</td></tr>` : ''}
            </tbody>
          </table>
        </div>

        <div class="page-footer-container">
          ${renderPageFooter(1, 1)}
        </div>
      </div>
    `);
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير ثري المالي</title>
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
    html, body, .report-page, .report-page * {
      font-family: 'Tajawal', 'Readex Pro', 'Segoe UI', Tahoma, Arial, sans-serif !important;
      letter-spacing: 0px !important;
      word-spacing: 1px !important;
      -webkit-font-smoothing: antialiased;
    }
    html, body {
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      margin: 0;
      padding: 0;
      width: 794px;
      font-size: 11px;
      line-height: 18px;
    }
    .report-page {
      width: 794px;
      min-height: 1122px;
      height: 1122px;
      max-height: 1122px;
      padding: 28px 32px 24px 32px;
      margin: 0 auto;
      background: #ffffff;
      color: #0f172a;
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
      bottom: 22px;
      left: 32px;
      right: 32px;
    }
    @media print {
      html, body {
        width: 100% !important;
        background: #ffffff !important;
      }
      .report-page {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        padding: 8mm 8mm !important;
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
      .page-footer-container {
        position: static !important;
        margin-top: 12px !important;
      }
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      line-height: 18px;
      margin-bottom: 10px;
      table-layout: fixed;
    }
    table.report-table thead {
      display: table-header-group;
    }
    table.report-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      line-height: 18px;
      padding: 9px 8px;
      border: 1px solid #334155;
      white-space: nowrap;
    }
    table.report-table td {
      padding: 8px 8px;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      vertical-align: middle;
      font-size: 10.5px;
      line-height: 18px;
      word-break: break-word;
      white-space: normal;
    }
    table.report-table tbody tr:nth-child(even) td {
      background-color: #f8fafc;
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
      iframe.style.width = '794px';
      iframe.style.height = '1122px';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      iframe.style.pointerEvents = 'none';
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
          }, 1200);
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
 * Renders inside an isolated 794px A4 iframe so mobile screen widths (375px) and dark-mode app styles
 * never squash columns or interfere with Arabic typography.
 */
export async function generatePdfBlobFromModel(model: ReportModel): Promise<Blob> {
  const htmlContent = buildPrintableReportHTML(model);

  const iframe = document.createElement('iframe');
  iframe.id = 'thari-pdf-iframe-' + Date.now();
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-9999px';
  iframe.style.width = '794px';
  iframe.style.height = '1122px';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#ffffff';
  iframe.style.zIndex = '-9999';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Could not initialize PDF rendering frame');
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for fonts in both parent document and iframe document
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn('Parent fonts ready check error:', e);
      }
    }
    if ((iframeDoc as any).fonts && (iframeDoc as any).fonts.ready) {
      try {
        await (iframeDoc as any).fonts.ready;
      } catch (e) {
        console.warn('Iframe fonts ready check error:', e);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 350));

    const pageElements = Array.from(iframeDoc.querySelectorAll('.report-page')) as HTMLElement[];
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

    const elementsToRender = pageElements.length > 0 ? pageElements : [iframeDoc.body];

    for (let i = 0; i < elementsToRender.length; i++) {
      const el = elementsToRender[i];

      const canvas = await html2canvas(el, {
        scale: 2.0,
        useCORS: true,
        logging: false,
        width: 794,
        height: 1122,
        windowWidth: 794,
        windowHeight: 1122,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      canvas.width = 0;
      canvas.height = 0;
    }

    return pdf.output('blob');
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
