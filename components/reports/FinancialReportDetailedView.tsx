import React, { useState } from 'react';
import { Layers, ListFilter, Coins } from 'lucide-react';
import { ReportModel, ReportLedgerEntry, ReportCurrencyLedgerGroup } from '../../services/reports/reportTypes';

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
    expenseCategories,
    incomeCategories,
  } = model;

  const baseCurrency = scope.baseCurrency;
  const isMultiCurrency = currencyBreakdown.length > 1;

  // View mode switcher: 'grouped' (default) vs 'unified'
  const [viewMode, setViewMode] = useState<'grouped' | 'unified'>('grouped');

  // Helper to render an authentic bank statement ledger table
  const renderLedgerTable = (
    txList: ReportLedgerEntry[],
    currencyCode?: string,
    runningBalanceField: 'currencyRunningBalance' | 'runningBalance' = 'currencyRunningBalance'
  ) => {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs print:overflow-visible print:border print:border-slate-300 print:rounded-none print:shadow-none">
        <table className="w-full table-fixed text-xs border-collapse print:text-[8.5px]">
          <thead className="print:table-header-group">
            <tr className="bg-slate-900 text-white break-avoid border-b-2 border-[#D9B978] text-[10px] print:text-[8px] print:bg-slate-900 print:text-white">
              <th className="py-2.5 px-1.5 text-center font-black w-[4%] print:w-[4%]">#</th>
              <th className="py-2.5 px-2 text-center font-black w-[11%] print:w-[11%]">التاريخ</th>
              <th className="py-2.5 px-2.5 text-right font-black w-[27%] print:w-[28%]">البيان / تفاصيل القيد</th>
              <th className="py-2.5 px-2 text-right font-black w-[12%] print:w-[12%]">التصنيف</th>
              <th className="py-2.5 px-2 text-right font-black w-[11%] print:w-[11%]">المحفظة</th>
              <th className="py-2.5 px-1.5 text-center font-black w-[5%] print:w-[5%]">العملة</th>
              <th className="py-2.5 px-2 text-left font-black w-[10%] print:w-[10%] text-rose-300">مدين (-)</th>
              <th className="py-2.5 px-2 text-left font-black w-[10%] print:w-[10%] text-emerald-300">دائن (+)</th>
              <th className="py-2.5 px-2 text-left font-black w-[10%] print:w-[10%] text-[#F3E5AB]">
                الرصيد
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {txList.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
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
                    className={`break-inside-avoid page-break-inside-avoid transition-colors hover:bg-amber-50/20 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2 px-1.5 print:py-1 print:px-0.5 text-center font-mono font-semibold text-slate-400 text-[10px] print:text-[8px] align-middle">
                      {t.index}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-2 print:py-1 print:px-1 font-medium text-slate-600 text-[10px] print:text-[8px] whitespace-nowrap text-center align-middle font-mono">
                      {t.date}
                    </td>

                    {/* Note / Statement Description (Full, Breathable, Natural Wrap) */}
                    <td className="py-2 px-2.5 print:py-1 print:px-1.5 text-slate-800 text-[11px] print:text-[8.5px] align-middle">
                      <div className="font-medium leading-relaxed break-words">
                        {t.note || <span className="text-slate-400 italic font-normal">قيد محاسبي مسجل ({t.categoryName})</span>}
                      </div>
                      {(t.conversionNote || (t.foreignAmount && t.exchangeRate)) && (
                        <div className="text-[8.5px] print:text-[7px] font-bold text-amber-900 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-300 mt-1 inline-flex items-center gap-1 max-w-full">
                          <span className="shrink-0 text-amber-600">💱</span>
                          <span className="break-words">{t.conversionNote || `عملية: ${t.foreignAmount} ${t.foreignCurrency} بسعر ${t.exchangeRate}`}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-2 px-2 print:py-1 print:px-1.5 align-middle">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: t.categoryColor }}
                        />
                        <span className="font-semibold text-slate-700 truncate text-[10.5px] print:text-[8px]">{t.categoryName}</span>
                      </div>
                    </td>

                    {/* Wallet */}
                    <td className="py-2 px-2 print:py-1 print:px-1.5 font-medium text-slate-600 truncate text-[10.5px] print:text-[8px] align-middle">
                      {t.walletName}
                    </td>

                    {/* Currency Badge */}
                    <td className="py-2 px-1.5 print:py-1 print:px-0.5 text-center align-middle">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono font-bold text-[9px] print:text-[7.5px]">
                        {t.currencyCode}
                      </span>
                    </td>

                    {/* Debit Column (مدين / منصرف / مسحوبات) */}
                    <td className="py-2 px-2 print:py-1 print:px-1 text-left font-mono font-bold tabular-nums text-[10.5px] print:text-[8px] align-middle text-rose-700 dir-ltr whitespace-nowrap">
                      {isExpense ? (
                        <div>
                          -{t.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          {t.isCrossCurrencyWithWallet && t.walletDeductionAmount !== undefined && (
                            <div className="text-[7.5px] print:text-[6.5px] font-normal text-amber-800 font-sans dir-rtl text-right">
                              المخصوم: {t.walletDeductionAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t.walletCurrencyCode}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* Credit Column (دائن / مقبوض / إيداعات) */}
                    <td className="py-2 px-2 print:py-1 print:px-1 text-left font-mono font-bold tabular-nums text-[10.5px] print:text-[8px] align-middle text-emerald-700 dir-ltr whitespace-nowrap">
                      {isIncome ? (
                        <div>
                          +{t.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* Running Balance Column (الرصيد التراكمي) */}
                    <td className="py-2 px-2 print:py-1 print:px-1 text-left font-mono font-black tabular-nums text-[11px] print:text-[8.5px] align-middle text-slate-900 bg-amber-50/40 print:bg-transparent dir-ltr whitespace-nowrap">
                      {runBal !== undefined ? (
                        <span>{Math.round(runBal).toLocaleString()}</span>
                      ) : (
                        '-'
                      )}
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
      {/* 1. Official Bank Statement Summary Metrics (Clean White & Gold) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2">
        {/* Opening Balance */}
        <div className="bg-white border border-amber-200/80 rounded-xl p-3.5 print:p-2.5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-400/80" />
          <span className="text-[10px] print:text-[8px] font-bold text-slate-500 uppercase block truncate">الرصيد الافتتاحي</span>
          <p className="text-base print:text-xs font-black text-slate-900 dir-ltr text-right mt-1 truncate tabular-nums font-mono">
            {Math.round(kpis.openingBalance).toLocaleString()} <span className="text-[10px] print:text-[8px] font-bold font-sans text-amber-700">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9px] print:text-[7.5px] text-slate-400 font-medium block truncate mt-0.5">رصيد بداية الفترة المسجلة</span>
        </div>

        {/* Total Credits / Inflows */}
        <div className="bg-white border border-emerald-200/90 rounded-xl p-3.5 print:p-2.5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
          <span className="text-[10px] print:text-[8px] font-bold text-emerald-800 uppercase block truncate">إجمالي الإيداعات (دائن)</span>
          <p className="text-base print:text-xs font-black text-emerald-700 dir-ltr text-right mt-1 truncate tabular-nums font-mono">
            +{Math.round(kpis.totalIncome).toLocaleString()} <span className="text-[10px] print:text-[8px] font-bold font-sans text-slate-500">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9px] print:text-[7.5px] text-emerald-700/80 font-bold block truncate mt-0.5">{kpis.incomeCount} قيد إيداع</span>
        </div>

        {/* Total Debits / Outflows */}
        <div className="bg-white border border-rose-200/90 rounded-xl p-3.5 print:p-2.5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
          <span className="text-[10px] print:text-[8px] font-bold text-rose-800 uppercase block truncate">إجمالي المسحوبات (مدين)</span>
          <p className="text-base print:text-xs font-black text-rose-700 dir-ltr text-right mt-1 truncate tabular-nums font-mono">
            -{Math.round(kpis.totalExpense).toLocaleString()} <span className="text-[10px] print:text-[8px] font-bold font-sans text-slate-500">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9px] print:text-[7.5px] text-rose-700/80 font-bold block truncate mt-0.5">{kpis.expenseCount + kpis.transferCount} قيد سحب</span>
        </div>

        {/* Closing Balance */}
        <div className="bg-white border border-slate-900 rounded-xl p-3.5 print:p-2.5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-[#D9B978]" />
          <span className="text-[10px] print:text-[8px] font-bold text-slate-700 uppercase block truncate">الرصيد الختامي الحالي</span>
          <p className="text-base print:text-xs font-black text-slate-950 dir-ltr text-right mt-1 truncate tabular-nums font-mono">
            {Math.round(kpis.closingBalance).toLocaleString()} <span className="text-[10px] print:text-[8px] font-bold font-sans text-amber-700">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9px] print:text-[7.5px] text-slate-500 font-bold block truncate mt-0.5">
            صافي الحركة: {kpis.netSavings >= 0 ? '+' : ''}{Math.round(kpis.netSavings).toLocaleString()} {baseCurrency.symbol}
          </span>
        </div>
      </div>

      {/* 3. Detailed Transactions Ledger Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2 break-avoid">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              سجل المعاملات والقيود المحاسبية التفصيلية
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle when multi-currency */}
            {isMultiCurrency && (
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-300 no-print">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    viewMode === 'grouped'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  فصل حسب العملات
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('unified')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    viewMode === 'unified'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  سجل زمني موحد
                </button>
              </div>
            )}

            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              إجمالي {transactions.length} قيد محاسبي
            </span>
          </div>
        </div>

        {/* Currency Grouped Mode (Default for multi-currency) */}
        {isMultiCurrency && viewMode === 'grouped' ? (
          <div className="space-y-6">
            {currencyLedgers.map((group) => {
              const netPos = group.netAmount >= 0;
              return (
                <div key={group.currencyCode} className="space-y-2 break-inside-avoid">
                  {/* Currency Group Header & Math Strip */}
                  <div className="bg-slate-100/90 print:bg-slate-50 p-3 print:p-2 rounded-xl border border-slate-300 flex flex-wrap justify-between items-center gap-2 print:gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-400 font-mono font-black text-xs print:text-[9.5px]">
                        {group.currencyCode}
                      </span>
                      <span className="text-xs print:text-[10px] font-black text-slate-900">
                        {group.metadata.nameAr}
                      </span>
                      <span className="text-[10px] print:text-[8px] text-slate-500 font-bold">
                        ({group.transactions.length} حركة مسجلة)
                      </span>
                    </div>

                    {/* Exact Accounting Arithmetic Bar for this Currency */}
                    <div className="flex items-center gap-2 sm:gap-3 print:gap-2 text-[11px] print:text-[8px] font-mono tabular-nums bg-white px-2.5 py-1 print:py-0.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] print:text-[7.5px] font-sans">افتتاحي: </span>
                        <span className="font-bold text-slate-700">{Math.round(group.openingBalance).toLocaleString()}</span>
                      </div>
                      <div className="text-emerald-700 font-bold">
                        <span className="text-[10px] print:text-[7.5px] font-sans">+ وارد: </span>
                        <span>+{Math.round(group.totalIncome).toLocaleString()}</span>
                      </div>
                      <div className="text-rose-700 font-bold">
                        <span className="text-[10px] print:text-[7.5px] font-sans">- منصرف: </span>
                        <span>-{Math.round(group.totalExpense).toLocaleString()}</span>
                      </div>
                      <div className="border-r border-slate-200 pr-2">
                        <span className="text-slate-400 text-[10px] print:text-[7.5px] font-sans">= ختامي: </span>
                        <span className="font-black text-slate-950">{Math.round(group.closingBalance).toLocaleString()} {group.metadata.symbol}</span>
                      </div>
                    </div>
                  </div>

                  {/* Currency Ledger Table with Independent Native Running Balance */}
                  {renderLedgerTable(group.transactions, group.currencyCode, 'currencyRunningBalance')}
                </div>
              );
            })}
          </div>
        ) : (
          /* Single Currency Mode or Unified Chronological View */
          <div>
            {renderLedgerTable(
              transactions,
              isMultiCurrency ? baseCurrency.code : (currencyBreakdown[0]?.code || baseCurrency.code),
              isMultiCurrency ? 'runningBalance' : 'currencyRunningBalance'
            )}
          </div>
        )}
      </div>

      {/* 4. Categorical Breakdown Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 break-inside-avoid">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200">
            <span className="text-[10.5px] font-black text-rose-800 uppercase">ملخص بنود الإنفاق في هذا الكشف</span>
            <span className="text-[9px] font-bold text-slate-500">{expenseCategories.length} بنود</span>
          </div>
          <div className="space-y-1.5">
            {expenseCategories.slice(0, 5).map(cat => (
              <div key={cat.id} className="flex justify-between text-xs font-bold">
                <span className="text-slate-800 truncate">{cat.name} ({cat.transactionCount})</span>
                <span className="text-slate-950 dir-ltr tabular-nums font-mono">
                  {Math.round(cat.totalAmount).toLocaleString()} <span className="font-sans">{baseCurrency.symbol}</span>{' '}
                  <span className="text-slate-400 font-normal text-[9.5px]">({Math.round(cat.percentageOfTotal)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200">
            <span className="text-[10.5px] font-black text-emerald-800 uppercase">ملخص مصادر الدخل في هذا الكشف</span>
            <span className="text-[9px] font-bold text-slate-500">{incomeCategories.length} بنود</span>
          </div>
          <div className="space-y-1.5">
            {incomeCategories.slice(0, 5).map(cat => (
              <div key={cat.id} className="flex justify-between text-xs font-bold">
                <span className="text-slate-800 truncate">{cat.name} ({cat.transactionCount})</span>
                <span className="text-slate-950 dir-ltr tabular-nums font-mono">
                  {Math.round(cat.totalAmount).toLocaleString()} <span className="font-sans">{baseCurrency.symbol}</span>{' '}
                  <span className="text-slate-400 font-normal text-[9.5px]">({Math.round(cat.percentageOfTotal)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
