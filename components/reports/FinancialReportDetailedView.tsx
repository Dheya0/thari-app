import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';

interface DetailedViewProps {
  model: ReportModel;
}

export const FinancialReportDetailedView: React.FC<DetailedViewProps> = ({ model }) => {
  const { scope, kpis, transactions, currencyBreakdown, expenseCategories, incomeCategories } = model;
  const baseCurrency = scope.baseCurrency;

  return (
    <div className="space-y-6">
      {/* 1. Scope Profile Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نطاق الكشف</span>
          <p className="text-xs font-black text-slate-900 truncate">{scope.walletNameAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">العملة المعيارية</span>
          <p className="text-xs font-black text-amber-700 truncate">
            {scope.currencyFilter
              ? `${scope.currencyMetadata?.nameAr} (${scope.currencyMetadata?.code})`
              : `متعدد العملات (تقييم بـ ${baseCurrency.code})`}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">الفترة الزمنية</span>
          <p className="text-xs font-black text-slate-900 truncate">{scope.periodLabelAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">إجمالي القيود</span>
          <p className="text-xs font-black text-slate-900">{transactions.length} قيد محاسبي</p>
        </div>
      </div>

      {/* 2. Ledger Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">إجمالي المقبوضات (دائن)</span>
          <p className="text-base font-black text-emerald-950 dir-ltr text-right mt-1">
            +{Math.round(kpis.totalIncome).toLocaleString()} <span className="text-[10px] font-bold">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9.5px] text-emerald-700 font-semibold">{kpis.incomeCount} قيد</span>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
          <span className="text-[10px] font-bold text-rose-800 uppercase block">إجمالي المنصرفات (مدين)</span>
          <p className="text-base font-black text-rose-950 dir-ltr text-right mt-1">
            -{Math.round(kpis.totalExpense).toLocaleString()} <span className="text-[10px] font-bold">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9.5px] text-rose-700 font-semibold">{kpis.expenseCount + kpis.transferCount} قيد</span>
        </div>

        <div className="bg-slate-100 border border-slate-300 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-700 uppercase block">صافي حركة الفترة</span>
          <p className={`text-base font-black dir-ltr text-right mt-1 ${kpis.netSavings >= 0 ? 'text-slate-950' : 'text-rose-950'}`}>
            {kpis.netSavings >= 0 ? '+' : ''}{Math.round(kpis.netSavings).toLocaleString()} <span className="text-[10px] font-bold">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9.5px] text-slate-500 font-semibold">معدل الادخار: {kpis.savingsRatePercent}%</span>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">الرصيد الختامي</span>
          <p className="text-base font-black text-amber-400 dir-ltr text-right mt-1">
            {Math.round(kpis.closingBalance).toLocaleString()} <span className="text-[10px] font-bold text-slate-300">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9.5px] text-slate-400 font-semibold">
            {kpis.openingBalance !== 0 ? `افتتاحي: ${Math.round(kpis.openingBalance).toLocaleString()} ${baseCurrency.symbol}` : 'رصيد محتسب'}
          </span>
        </div>
      </div>

      {/* 3. Detailed Transactions Ledger Table */}
      <div>
        <div className="flex justify-between items-center mb-2.5 break-avoid">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              سجل المعاملات والقيود المحاسبية التفصيلية
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            تم إدراج {transactions.length} قيد محاسبي
          </span>
        </div>

        <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xs">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white break-avoid border-b border-slate-800 text-[10px]">
                <th className="py-3 px-2 text-center font-black w-10">#</th>
                <th className="py-3 px-3 text-right font-black w-24">التاريخ</th>
                <th className="py-3 px-3 text-right font-black w-28">التصنيف</th>
                <th className="py-3 px-3 text-right font-black w-24">المحفظة</th>
                <th className="py-3 px-3 text-right font-black">البيان / تفاصيل القيد</th>
                <th className="py-3 px-2.5 text-center font-black w-18">العملة</th>
                <th className="py-3 px-3 text-left font-black w-30">المبلغ الأصلي</th>
                <th className="py-3 px-3 text-left font-black w-32">المعادل ({baseCurrency.code})</th>
                <th className="py-3 px-3 text-left font-black w-28">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    لا توجد قيود مسجلة تطابق محددات التصفية
                  </td>
                </tr>
              ) : (
                transactions.map((t, i) => {
                  const isIncome = t.type === 'income';

                  return (
                    <tr
                      key={t.id || i}
                      className={`break-inside-avoid page-break-inside-avoid ${
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-400 text-[10px]">
                        {t.index}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 font-medium text-slate-600 text-[10.5px] whitespace-nowrap">
                        {t.date}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: t.categoryColor }}
                          />
                          <span className="font-bold text-slate-900 truncate text-[11px]">{t.categoryName}</span>
                        </div>
                      </td>

                      {/* Wallet */}
                      <td className="py-2.5 px-3 font-semibold text-slate-700 truncate max-w-[90px] text-[11px]">
                        {t.walletName}
                      </td>

                      {/* Note / Statement Description */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[220px]">
                        <div className="truncate">
                          {t.note || <span className="text-slate-400 italic">بدون ملاحظات</span>}
                        </div>
                        {(t.conversionNote || (t.foreignAmount && t.exchangeRate)) && (
                          <div className="text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300/80 mt-1 inline-flex items-center gap-1 max-w-full truncate" title={t.conversionNote}>
                            <span className="shrink-0">💱</span>
                            <span className="truncate">{t.conversionNote || `عملية: ${t.foreignAmount} ${t.foreignCurrency} بسعر ${t.exchangeRate}`}</span>
                            <span className="text-[8px] font-black text-amber-900 bg-amber-200/80 px-1 rounded shrink-0">🔒 موثق</span>
                          </div>
                        )}
                      </td>

                      {/* Currency Badge */}
                      <td className="py-2.5 px-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-[9px]">
                          {t.currencyCode}
                        </span>
                      </td>

                      {/* Original Amount */}
                      <td
                        className={`py-2.5 px-3 text-left font-bold dir-ltr whitespace-nowrap text-[11px] ${
                          isIncome ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        <div>
                          {isIncome ? '+' : '-'}{t.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                          <span className="text-[9px] font-semibold text-slate-500">{t.currencySymbol}</span>
                        </div>
                        {t.isCrossCurrencyWithWallet && t.walletDeductionAmount !== undefined && (
                          <div className="text-[8.5px] font-normal text-amber-700 dir-rtl text-right mt-0.5">
                            المقيد بالمحفظة: {t.walletDeductionAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t.walletCurrencyCode}
                          </div>
                        )}
                      </td>

                      {/* Converted Target Amount */}
                      <td className="py-2.5 px-3 text-left font-black text-slate-950 dir-ltr whitespace-nowrap text-[11px]">
                        {Math.round(t.convertedAmount).toLocaleString()}{' '}
                        <span className="text-[9px] font-bold text-amber-700">{baseCurrency.symbol}</span>
                      </td>

                      {/* Running Balance */}
                      <td className="py-2.5 px-3 text-left font-bold text-slate-700 dir-ltr whitespace-nowrap text-[10.5px]">
                        {t.runningBalance !== undefined ? (
                          <>
                            {Math.round(t.runningBalance).toLocaleString()}{' '}
                            <span className="text-[8.5px] font-normal text-slate-400">{baseCurrency.symbol}</span>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black border-t-2 border-slate-400 break-avoid text-xs">
                <td colSpan={6} className="py-3 px-3.5 text-right text-slate-900 font-black">
                  إجمالي صافي حركة القيود المعروضة في هذا الكشف ({transactions.length} قيد)
                </td>
                <td colSpan={3} className="py-3 px-3.5 text-left text-slate-950 text-sm font-black dir-ltr">
                  {kpis.netSavings >= 0 ? '+' : ''}{Math.round(kpis.netSavings).toLocaleString()}{' '}
                  <span className="text-xs text-amber-700 font-bold">{baseCurrency.symbol}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
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
                <span className="text-slate-950 dir-ltr">
                  {Math.round(cat.totalAmount).toLocaleString()} {baseCurrency.symbol}{' '}
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
                <span className="text-slate-950 dir-ltr">
                  {Math.round(cat.totalAmount).toLocaleString()} {baseCurrency.symbol}{' '}
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
