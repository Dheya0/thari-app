import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';
import { formatCurrencyAmount } from '../../services/reports/currencyMetadata';

interface SummaryViewProps {
  model: ReportModel;
}

export const FinancialReportSummaryView: React.FC<SummaryViewProps> = ({ model }) => {
  const { scope, kpis, currencyBreakdown, expenseCategories, incomeCategories, walletSummaries } = model;
  const baseCurrency = scope.baseCurrency;
  const isSurplus = kpis.netSavings >= 0;

  return (
    <div className="space-y-6">
      {/* 1. Scope & Profile Information Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نطاق المحفظة</span>
          <p className="text-xs font-black text-slate-900 truncate">{scope.walletNameAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نطاق العملة</span>
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
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">إجمالي الحركات</span>
          <p className="text-xs font-black text-slate-900">{kpis.totalTransactions} حركة مسجلة</p>
        </div>
      </div>

      {/* 2. Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4">
        {/* Total Inflow */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">إجمالي الواردات (المقبوضات)</span>
            <span className="text-[10px] font-bold bg-emerald-100/90 text-emerald-900 px-2 py-0.5 rounded-md">
              {kpis.incomeCount} حركة
            </span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black text-emerald-950 dir-ltr text-right">
              +{Math.round(kpis.totalIncome).toLocaleString()} <span className="text-sm font-bold text-emerald-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-emerald-700 font-medium mt-1">
              متوسط الحركة: {Math.round(kpis.avgIncomePerTx).toLocaleString()} {baseCurrency.symbol}
            </p>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">إجمالي المنصرفات (المصروفات)</span>
            <span className="text-[10px] font-bold bg-rose-100/90 text-rose-900 px-2 py-0.5 rounded-md">
              {kpis.expenseCount + kpis.transferCount} حركة
            </span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black text-rose-950 dir-ltr text-right">
              -{Math.round(kpis.totalExpense).toLocaleString()} <span className="text-sm font-bold text-rose-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-rose-700 font-medium mt-1">
              متوسط الحركة: {Math.round(kpis.avgExpensePerTx).toLocaleString()} {baseCurrency.symbol}
            </p>
          </div>
        </div>

        {/* Net Flow / Savings */}
        <div className={`border rounded-2xl p-4.5 flex flex-col justify-between ${
          isSurplus ? 'bg-amber-50/70 border-amber-200/80' : 'bg-rose-50/90 border-rose-300'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isSurplus ? 'text-amber-900' : 'text-rose-900'}`}>
              صافي الفائض / العجز المالي
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              isSurplus ? 'bg-amber-200/70 text-amber-950' : 'bg-rose-200 text-rose-950'
            }`}>
              {isSurplus ? `ادخار ${kpis.savingsRatePercent}%` : 'عجز مالي'}
            </span>
          </div>
          <div className="mt-1">
            <div className={`text-2xl font-black dir-ltr text-right ${isSurplus ? 'text-amber-950' : 'text-rose-950'}`}>
              {isSurplus ? '+' : ''}{Math.round(kpis.netSavings).toLocaleString()} <span className="text-sm font-bold text-slate-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-slate-600 font-medium mt-1">
              نسبة الإنفاق للدخل: {kpis.expenseRatioPercent}%
            </p>
          </div>
        </div>
      </div>

      {/* 3. Opening & Closing Balances (If applicable) */}
      {(kpis.openingBalance !== 0 || scope.startDate) && (
        <div className="grid grid-cols-2 gap-3 bg-slate-900 text-white p-3.5 rounded-2xl">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-300 font-medium">الرصيد الافتتاحي قبل بداية الفترة:</span>
            <span className="text-sm font-black dir-ltr text-amber-400">
              {Math.round(kpis.openingBalance).toLocaleString()} {baseCurrency.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between px-2 border-r border-slate-700">
            <span className="text-xs text-slate-300 font-medium">الرصيد الختامي بنهاية الفترة:</span>
            <span className="text-sm font-black dir-ltr text-emerald-400">
              {Math.round(kpis.closingBalance).toLocaleString()} {baseCurrency.symbol}
            </span>
          </div>
        </div>
      )}

      {/* 4. Multi-Currency Breakdown Matrix (Only if multiple currencies exist or multi-currency report) */}
      {currencyBreakdown.length > 0 && (
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 break-inside-avoid">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                تحليل وتوزيع العملات (Multi-Currency Breakdown)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              {currencyBreakdown.length} {currencyBreakdown.length === 1 ? 'عملة' : 'عملات'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 font-bold border-b border-slate-200 text-[10px]">
                  <th className="py-2 text-right font-black">العملة والمنطقة</th>
                  <th className="py-2 text-center font-black">عدد الحركات</th>
                  <th className="py-2 text-left font-black">إجمالي المقبوضات</th>
                  <th className="py-2 text-left font-black">إجمالي المنصرفات</th>
                  <th className="py-2 text-left font-black">الصافي بالعملة</th>
                  <th className="py-2 text-left font-black">المعادل بـ ({baseCurrency.code})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currencyBreakdown.map((cb) => {
                  const isNetPositive = cb.net >= 0;
                  return (
                    <tr key={cb.code} className="hover:bg-white/60">
                      <td className="py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/80 font-mono text-[9px] font-bold">
                            {cb.code}
                          </span>
                          <span className="truncate">{cb.metadata.nameAr}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-medium text-slate-600">
                        {cb.transactionCount}
                      </td>
                      <td className="py-2.5 text-left font-bold text-emerald-700 dir-ltr">
                        +{Math.round(cb.income).toLocaleString()} {cb.metadata.symbol}
                      </td>
                      <td className="py-2.5 text-left font-bold text-rose-700 dir-ltr">
                        -{Math.round(cb.expense).toLocaleString()} {cb.metadata.symbol}
                      </td>
                      <td className={`py-2.5 text-left font-black dir-ltr ${isNetPositive ? 'text-slate-900' : 'text-rose-900'}`}>
                        {isNetPositive ? '+' : ''}{Math.round(cb.net).toLocaleString()} {cb.metadata.symbol}
                      </td>
                      <td className="py-2.5 text-left font-black text-amber-900 dir-ltr">
                        {Math.round(cb.convertedNetToBase).toLocaleString()} {baseCurrency.symbol}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Categorical Breakdown (Expenses & Income Side-by-Side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 break-inside-avoid">
        {/* Top Expense Categories */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
            <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider">
              أعلى تصنيفات الإنفاق
            </span>
            <span className="text-[9.5px] font-bold text-slate-500">{expenseCategories.length} تصنيفات</span>
          </div>

          {expenseCategories.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">لا توجد مصروفات مسجلة في هذا النطاق</p>
          ) : (
            <div className="space-y-3">
              {expenseCategories.slice(0, 6).map((cat) => {
                const pct = Math.round(cat.percentageOfTotal);
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-800 truncate">{cat.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">({cat.transactionCount})</span>
                      </div>
                      <span className="text-slate-950 dir-ltr">
                        {Math.round(cat.totalAmount).toLocaleString()} {baseCurrency.symbol}{' '}
                        <span className="text-slate-400 font-normal text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cat.color || '#f43f5e' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Income Sources */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
            <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">
              تحليل مصادر الدخل والواردات
            </span>
            <span className="text-[9.5px] font-bold text-slate-500">{incomeCategories.length} مصادر</span>
          </div>

          {incomeCategories.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">لا توجد مصادر دخل مسجلة في هذا النطاق</p>
          ) : (
            <div className="space-y-3">
              {incomeCategories.slice(0, 6).map((cat) => {
                const pct = Math.round(cat.percentageOfTotal);
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-800 truncate">{cat.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">({cat.transactionCount})</span>
                      </div>
                      <span className="text-slate-950 dir-ltr">
                        {Math.round(cat.totalAmount).toLocaleString()} {baseCurrency.symbol}{' '}
                        <span className="text-slate-400 font-normal text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cat.color || '#10b981' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Wallet Allocation Distribution */}
      {walletSummaries.length > 1 && !scope.walletId && (
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 break-inside-avoid">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
              توزيع الأرصدة عبر المحافظ المالية
            </span>
            <span className="text-[9.5px] font-bold text-slate-500">{walletSummaries.length} محافظ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3">
            {walletSummaries.map((w) => (
              <div key={w.id} className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block truncate">{w.name}</span>
                <p className="text-xs font-black text-slate-900 dir-ltr text-right mt-1">
                  {Math.round(w.rawBalance).toLocaleString()} <span className="text-[9px] font-bold text-slate-500">{w.currencyCode}</span>
                </p>
                <p className="text-[9.5px] font-bold text-amber-700 dir-ltr text-right mt-0.5">
                  ≈ {Math.round(w.convertedBalance).toLocaleString()} {baseCurrency.symbol} ({w.percentageOfTotalWealth.toFixed(1)}%)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
