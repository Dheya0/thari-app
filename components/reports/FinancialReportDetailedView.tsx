import React, { useState } from 'react';
import { ReportModel, ReportLedgerEntry } from '../../services/reports/reportTypes';

interface DetailedViewProps {
  model: ReportModel;
}

export const FinancialReportDetailedView: React.FC<DetailedViewProps> = ({ model }) => {
  const {
    scope,
    kpis,
    transactions,
    currencyBreakdown,
    currencyLedgers = [],
    walletLedgers = [],
    expenseCategories,
    incomeCategories,
  } = model;

  const baseCurrency = scope.baseCurrency;
  const isMultiCurrency = currencyBreakdown.length > 1;
  const hasMultipleWallets = walletLedgers.length > 1;

  // View mode switcher: 'wallets' (default so reports divide by wallets for easy review), 'currencies', or 'unified'
  const [viewMode, setViewMode] = useState<'wallets' | 'currencies' | 'unified'>('wallets');

  // Helper to render a spacious, uncrowded 7-column wallet ledger table
  const renderWalletTable = (txList: ReportLedgerEntry[], sym: string) => {
    return (
      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs print:overflow-visible print:rounded-none print:shadow-none">
        <table className="w-full table-fixed text-xs border-collapse print:text-[10.5px]">
          <thead className="print:table-header-group">
            <tr className="bg-slate-900 text-white border-b-2 border-[#D9B978]">
              <th className="py-3 px-2 text-center font-black w-[6%] border border-slate-700">م</th>
              <th className="py-3 px-2.5 text-center font-black w-[14%] border border-slate-700">التاريخ</th>
              <th className="py-3 px-3.5 text-right font-black w-[34%] border border-slate-700">البيان وتفاصيل العملية</th>
              <th className="py-3 px-3 text-right font-black w-[14%] border border-slate-700">التصنيف</th>
              <th className="py-3 px-2.5 text-right font-black w-[10%] text-rose-300 border border-slate-700">منصرف (-)</th>
              <th className="py-3 px-2.5 text-right font-black w-[10%] text-emerald-300 border border-slate-700">وارد (+)</th>
              <th className="py-3 px-2.5 text-right font-black w-[12%] text-[#F3E5AB] border border-slate-700">
                الرصيد ({sym})
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {txList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-bold text-xs">
                  لا توجد عمليات مسجلة في هذه المحفظة خلال الفترة المحددة
                </td>
              </tr>
            ) : (
              txList.map((t, i) => {
                const isInflow = t.walletEntryDirection
                  ? t.walletEntryDirection === 'inflow'
                  : t.type === 'income';
                const isOutflow = !isInflow;
                const runBal = t.walletRunningBalance !== undefined
                  ? t.walletRunningBalance
                  : (t.currencyRunningBalance !== undefined ? t.currencyRunningBalance : t.runningBalance);

                return (
                  <tr
                    key={t.id || i}
                    className={`break-inside-avoid page-break-inside-avoid ${
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-2 border border-slate-200 text-center font-bold text-slate-600 text-xs align-middle">
                      {i + 1}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 font-bold text-slate-800 text-xs whitespace-nowrap text-center align-middle">
                      {t.date}
                    </td>
                    <td className="py-3 px-3.5 border border-slate-200 text-slate-900 text-xs align-middle">
                      <div className="font-bold leading-relaxed break-words text-slate-900">
                        {t.note || t.categoryName}
                      </div>
                      {t.conversionNote && (
                        <div className="text-[10px] font-bold text-amber-800 mt-1 break-words">
                          {t.conversionNote}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 border border-slate-200 font-bold text-slate-800 text-xs align-middle break-words">
                      {t.categoryName}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 text-right font-black tabular-nums text-xs align-middle text-rose-700 whitespace-nowrap">
                      {isOutflow ? `-${Math.round(t.originalAmount).toLocaleString('en-US')}` : '-'}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 text-right font-black tabular-nums text-xs align-middle text-emerald-700 whitespace-nowrap">
                      {isInflow ? `+${Math.round(t.originalAmount).toLocaleString('en-US')}` : '-'}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 text-right font-black tabular-nums text-xs align-middle text-slate-950 bg-amber-50/50 whitespace-nowrap">
                      {runBal !== undefined ? Math.round(runBal).toLocaleString('en-US') : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper to render 8-column table when viewing unified or by-currency
  const renderGeneralLedgerTable = (
    txList: ReportLedgerEntry[],
    runningBalanceField: 'currencyRunningBalance' | 'runningBalance' = 'currencyRunningBalance'
  ) => {
    return (
      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs print:overflow-visible">
        <table className="w-full table-fixed text-xs border-collapse print:text-[10.5px]">
          <thead className="print:table-header-group">
            <tr className="bg-slate-900 text-white border-b-2 border-[#D9B978]">
              <th className="py-3 px-2 text-center font-black w-[5%] border border-slate-700">م</th>
              <th className="py-3 px-2.5 text-center font-black w-[12%] border border-slate-700">التاريخ</th>
              <th className="py-3 px-3.5 text-right font-black w-[28%] border border-slate-700">البيان والتفاصيل</th>
              <th className="py-3 px-3 text-right font-black w-[13%] border border-slate-700">التصنيف</th>
              <th className="py-3 px-3 text-right font-black w-[13%] border border-slate-700">المحفظة</th>
              <th className="py-3 px-2.5 text-right font-black w-[9%] text-rose-300 border border-slate-700">منصرف (-)</th>
              <th className="py-3 px-2.5 text-right font-black w-[9%] text-emerald-300 border border-slate-700">وارد (+)</th>
              <th className="py-3 px-2.5 text-right font-black w-[11%] text-[#F3E5AB] border border-slate-700">الرصيد</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {txList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400 font-bold text-xs">
                  لا توجد قيود مسجلة تطابق محددات التصفية
                </td>
              </tr>
            ) : (
              txList.map((t, i) => {
                const isIncome = t.type === 'income';
                const isExpense = t.type === 'expense' || t.type === 'transfer';
                const runBal = runningBalanceField === 'currencyRunningBalance'
                  ? (t.currencyRunningBalance !== undefined ? t.currencyRunningBalance : t.runningBalance)
                  : t.runningBalance;

                return (
                  <tr
                    key={t.id || i}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                  >
                    <td className="py-3 px-2 border border-slate-200 text-center font-bold text-slate-600 text-xs">
                      {t.index}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 font-bold text-slate-800 text-xs text-center whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-3 px-3.5 border border-slate-200 text-slate-900 text-xs font-bold break-words">
                      {t.note || t.categoryName}
                    </td>
                    <td className="py-3 px-3 border border-slate-200 font-bold text-slate-800 text-xs break-words">
                      {t.categoryName}
                    </td>
                    <td className="py-3 px-3 border border-slate-200 font-bold text-slate-700 text-xs break-words">
                      {t.walletName} ({t.currencyCode})
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 text-right font-black text-xs text-rose-700 whitespace-nowrap">
                      {isExpense ? `-${Math.round(t.originalAmount).toLocaleString('en-US')}` : '-'}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 text-right font-black text-xs text-emerald-700 whitespace-nowrap">
                      {isIncome ? `+${Math.round(t.originalAmount).toLocaleString('en-US')}` : '-'}
                    </td>
                    <td className="py-3 px-2.5 border border-slate-200 text-right font-black text-xs text-slate-950 bg-amber-50/50 whitespace-nowrap">
                      {runBal !== undefined ? Math.round(runBal).toLocaleString('en-US') : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Overall KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-300 border-t-4 border-t-amber-500 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-slate-600">الرصيد الافتتاحي العام</div>
          <div className="text-base font-black text-slate-950 mt-1">
            {Math.round(kpis.openingBalance).toLocaleString('en-US')} {baseCurrency.symbol}
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 border-t-4 border-t-emerald-600 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-emerald-800">إجمالي المقبوضات (وارد)</div>
          <div className="text-base font-black text-emerald-700 mt-1">
            +{Math.round(kpis.totalIncome).toLocaleString('en-US')} {baseCurrency.symbol}
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200 border-t-4 border-t-rose-600 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-rose-800">إجمالي المنصرفات (صادر)</div>
          <div className="text-base font-black text-rose-700 mt-1">
            -{Math.round(kpis.totalExpense).toLocaleString('en-US')} {baseCurrency.symbol}
          </div>
        </div>

        <div className="bg-slate-900 text-white border border-slate-900 border-t-4 border-t-amber-400 rounded-xl p-3.5">
          <div className="text-[11px] font-bold text-slate-300">الرصيد الختامي الموحد</div>
          <div className="text-base font-black text-amber-400 mt-1">
            {Math.round(kpis.closingBalance).toLocaleString('en-US')} {baseCurrency.symbol}
          </div>
        </div>
      </div>

      {/* 2. Multi-Wallet Summary Table (Shown when >1 wallet is in scope) */}
      {hasMultipleWallets && (
        <div className="bg-slate-50 rounded-xl border border-slate-300 p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900">
              ملخص أرصدة وحركة المحافظ المشمولة بالتقرير (كل محفظة على حدة)
            </h4>
            <span className="text-[11px] font-bold text-slate-600">
              {walletLedgers.length} محافظ مالية
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 text-right font-bold border border-slate-700">اسم المحفظة</th>
                  <th className="py-2.5 px-3 text-center font-bold border border-slate-700">العملة</th>
                  <th className="py-2.5 px-3 text-right font-bold border border-slate-700">الرصيد الافتتاحي</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-300 border border-slate-700">إجمالي الوارد (+)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-rose-300 border border-slate-700">إجمالي المنصرف (-)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-amber-300 border border-slate-700">الرصيد الختامي (=)</th>
                  <th className="py-2.5 px-3 text-center font-bold border border-slate-700">العمليات</th>
                </tr>
              </thead>
              <tbody>
                {walletLedgers.map((w, idx) => {
                  const sym = w.metadata?.symbol || w.currencyCode;
                  return (
                    <tr key={w.walletId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2.5 px-3 border border-slate-200 font-black text-slate-900">{w.walletName}</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-bold text-slate-600">{w.currencyCode}</td>
                      <td className="py-2.5 px-3 border border-slate-200 font-bold text-slate-800">{Math.round(w.openingBalance).toLocaleString('en-US')} {sym}</td>
                      <td className="py-2.5 px-3 border border-slate-200 font-black text-emerald-700">+{Math.round(w.totalIncome).toLocaleString('en-US')} {sym}</td>
                      <td className="py-2.5 px-3 border border-slate-200 font-black text-rose-700">-{Math.round(w.totalExpense).toLocaleString('en-US')} {sym}</td>
                      <td className="py-2.5 px-3 border border-slate-200 font-black text-slate-950 bg-amber-50/60">{Math.round(w.closingBalance).toLocaleString('en-US')} {sym}</td>
                      <td className="py-2.5 px-3 border border-slate-200 text-center font-bold text-slate-700">{w.transactions.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Detailed Transactions Ledger Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900">
              كشوف الحساب التفصيلية (مقسمة حسب المحافظ لسهولة المراجعة)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-300 no-print">
              <button
                type="button"
                onClick={() => setViewMode('wallets')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'wallets'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تقسيم حسب المحافظ
              </button>
              {isMultiCurrency && (
                <button
                  type="button"
                  onClick={() => setViewMode('currencies')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    viewMode === 'currencies'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  حسب العملات
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  viewMode === 'unified'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سجل موحد
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
              إجمالي {transactions.length} عملية
            </span>
          </div>
        </div>

        {/* Mode 1 (Default): Wallet-Segregated Sections */}
        {viewMode === 'wallets' && walletLedgers.length > 0 ? (
          <div className="space-y-6">
            {walletLedgers.map((wGroup) => {
              const sym = wGroup.metadata?.symbol || wGroup.currencyCode;
              return (
                <div key={wGroup.walletId} className="space-y-2 break-inside-avoid">
                  {/* 5-Column Wallet Summary Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 bg-slate-100 border border-slate-300 rounded-xl overflow-hidden text-xs">
                    <div className="p-3 bg-slate-200/80 border-b sm:border-b-0 sm:border-l border-slate-300 col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold text-slate-600">المحفظة والعملة</div>
                      <div className="font-black text-slate-950 text-xs mt-0.5">
                        {wGroup.walletName} ({wGroup.currencyCode})
                      </div>
                    </div>
                    <div className="p-3 border-b sm:border-b-0 border-l border-slate-300">
                      <div className="text-[10px] font-bold text-slate-500">الرصيد الافتتاحي</div>
                      <div className="font-black text-slate-900 mt-0.5">
                        {Math.round(wGroup.openingBalance).toLocaleString('en-US')} {sym}
                      </div>
                    </div>
                    <div className="p-3 border-b sm:border-b-0 sm:border-l border-slate-300">
                      <div className="text-[10px] font-bold text-emerald-800">إجمالي الوارد (+)</div>
                      <div className="font-black text-emerald-700 mt-0.5">
                        +{Math.round(wGroup.totalIncome).toLocaleString('en-US')} {sym}
                      </div>
                    </div>
                    <div className="p-3 border-l border-slate-300">
                      <div className="text-[10px] font-bold text-rose-800">إجمالي المنصرف (-)</div>
                      <div className="font-black text-rose-700 mt-0.5">
                        -{Math.round(wGroup.totalExpense).toLocaleString('en-US')} {sym}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50/80">
                      <div className="text-[10px] font-bold text-amber-900">الرصيد الختامي (=)</div>
                      <div className="font-black text-slate-950 mt-0.5">
                        {Math.round(wGroup.closingBalance).toLocaleString('en-US')} {sym}
                      </div>
                    </div>
                  </div>

                  {/* Wallet Transactions Table */}
                  {renderWalletTable(wGroup.transactions, sym)}
                </div>
              );
            })}
          </div>
        ) : viewMode === 'currencies' && currencyLedgers.length > 0 ? (
          <div className="space-y-6">
            {currencyLedgers.map((group) => (
              <div key={group.currencyCode} className="space-y-2 break-inside-avoid">
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 flex flex-wrap justify-between items-center gap-2 text-xs">
                  <div className="font-black text-slate-900">
                    {group.metadata.nameAr} ({group.currencyCode}) • {group.transactions.length} عملية
                  </div>
                  <div className="font-bold text-slate-800">
                    افتتاحي: {Math.round(group.openingBalance).toLocaleString('en-US')} | وارد: +{Math.round(group.totalIncome).toLocaleString('en-US')} | منصرف: -{Math.round(group.totalExpense).toLocaleString('en-US')} | الختامي: {Math.round(group.closingBalance).toLocaleString('en-US')} {group.metadata.symbol}
                  </div>
                </div>
                {renderGeneralLedgerTable(group.transactions, 'currencyRunningBalance')}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {renderGeneralLedgerTable(
              transactions,
              isMultiCurrency ? 'runningBalance' : 'currencyRunningBalance'
            )}
          </div>
        )}
      </div>

      {/* 4. Categorical Breakdown Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 break-inside-avoid">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
          <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-200">
            <span className="text-xs font-black text-rose-800">ملخص بنود الإنفاق في هذا الكشف</span>
            <span className="text-[11px] font-bold text-slate-600">{expenseCategories.length} بنود</span>
          </div>
          <div className="space-y-2">
            {expenseCategories.slice(0, 5).map(cat => (
              <div key={cat.id} className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">{cat.name} ({cat.transactionCount})</span>
                <span className="text-slate-950">
                  {Math.round(cat.totalAmount).toLocaleString('en-US')} {baseCurrency.symbol} ({Math.round(cat.percentageOfTotal)}%)
                </span>
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-2">لا توجد مصروفات مسجلة</div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
          <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-200">
            <span className="text-xs font-black text-emerald-800">ملخص مصادر الدخل في هذا الكشف</span>
            <span className="text-[11px] font-bold text-slate-600">{incomeCategories.length} بنود</span>
          </div>
          <div className="space-y-2">
            {incomeCategories.slice(0, 5).map(cat => (
              <div key={cat.id} className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">{cat.name} ({cat.transactionCount})</span>
                <span className="text-slate-950">
                  {Math.round(cat.totalAmount).toLocaleString('en-US')} {baseCurrency.symbol} ({Math.round(cat.percentageOfTotal)}%)
                </span>
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-2">لا توجد إيرادات مسجلة</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
