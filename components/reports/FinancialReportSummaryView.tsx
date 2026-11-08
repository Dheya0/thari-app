import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';

interface SummaryViewProps {
  model: ReportModel;
}

export const FinancialReportSummaryView: React.FC<SummaryViewProps> = ({ model }) => {
  const { scope, kpis, currencyBreakdown, expenseCategories, incomeCategories, walletSummaries, walletLedgers = [] } = model;
  const baseCurrency = scope.baseCurrency;
  const isSurplus = kpis.netSavings >= 0;

  return (
    <div className="space-y-6">
      {/* 1. Executive KPI Grid (Unified Valuation in Base Currency) */}
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
            <div className="text-2xl font-black text-emerald-950 text-right tabular-nums">
              +{Math.round(kpis.totalIncome).toLocaleString()} {baseCurrency.symbol}
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
            <div className="text-2xl font-black text-rose-950 text-right tabular-nums">
              -{Math.round(kpis.totalExpense).toLocaleString()} {baseCurrency.symbol}
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
            <div className={`text-2xl font-black text-right tabular-nums ${isSurplus ? 'text-amber-950' : 'text-rose-950'}`}>
              {isSurplus ? '+' : ''}{Math.round(kpis.netSavings).toLocaleString()} {baseCurrency.symbol}
            </div>
            <p className="text-[10.5px] text-slate-600 font-medium mt-1">
              نسبة الإنفاق للدخل: {kpis.expenseRatioPercent}%
            </p>
          </div>
        </div>
      </div>

      {/* 2. Opening & Closing Balances (Unified Base Valuation) */}
      {(kpis.openingBalance !== 0 || scope.startDate) && (
        <div className="grid grid-cols-2 gap-3 bg-slate-900 text-white p-3.5 rounded-2xl">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-300 font-medium">الرصيد الافتتاحي قبل بداية الفترة:</span>
            <span className="text-sm font-black text-amber-400 tabular-nums">
              {Math.round(kpis.openingBalance).toLocaleString()} {baseCurrency.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between px-2 border-r border-slate-700">
            <span className="text-xs text-slate-300 font-medium">الرصيد الختامي بنهاية الفترة:</span>
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              {Math.round(kpis.closingBalance).toLocaleString()} {baseCurrency.symbol}
            </span>
          </div>
        </div>
      )}

      {/* 3. Multi-Wallet Breakdown Table (تفصيل أرصدة وحركة المحافظ المالية كل محفظة على حدة) */}
      {walletLedgers.length > 0 && (
        <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 break-inside-avoid shadow-2xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                ملخص أرصدة وحركة المحافظ المالية (مراجعة كل محفظة على حدة)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-0.5 rounded-lg">
              {walletLedgers.length} {walletLedgers.length === 1 ? 'محفظة' : 'محافظ'}
            </span>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black text-[11px]">
                  <th className="py-2.5 px-3 text-right rounded-tr-xl">المحفظة</th>
                  <th className="py-2.5 px-2.5 text-center">العملة</th>
                  <th className="py-2.5 px-3 text-right">الرصيد الافتتاحي</th>
                  <th className="py-2.5 px-3 text-right text-emerald-300">+ الوارد</th>
                  <th className="py-2.5 px-3 text-right text-rose-300">- المنصرف</th>
                  <th className="py-2.5 px-3 text-right text-amber-300">= الرصيد الختامي</th>
                  <th className="py-2.5 px-2.5 text-center rounded-tl-xl">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {walletLedgers.map((wl) => (
                  <tr key={wl.walletId} className="hover:bg-amber-50/25 transition-colors">
                    <td className="py-3 px-3 font-black text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: wl.walletColor || '#D9B978' }}
                        />
                        <span>{wl.walletName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 text-center font-bold text-slate-600 whitespace-nowrap">
                      {wl.currencyCode}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                      {Math.round(wl.openingBalance).toLocaleString()} {wl.metadata.symbol}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-700 tabular-nums whitespace-nowrap">
                      +{Math.round(wl.totalIncome).toLocaleString()} {wl.metadata.symbol}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-700 tabular-nums whitespace-nowrap">
                      -{Math.round(wl.totalExpense).toLocaleString()} {wl.metadata.symbol}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-950 bg-amber-50/60 tabular-nums whitespace-nowrap">
                      {Math.round(wl.closingBalance).toLocaleString()} {wl.metadata.symbol}
                    </td>
                    <td className="py-3 px-2.5 text-center font-bold text-slate-600 whitespace-nowrap">
                      {wl.transactions.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Elegant Accounting Operations Matrix Per Currency */}
      {currencyBreakdown.length > 0 && (
        <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 break-inside-avoid shadow-2xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                جدول العمليات الحسابية وتفصيل العملات
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              {currencyBreakdown.length} {currencyBreakdown.length === 1 ? 'عملة' : 'عملات'}
            </span>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-xs print:text-[10px] border-collapse">
              <thead className="print:table-header-group">
                <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-300 text-[11px] print:text-[8px]">
                  <th className="py-3 px-3.5 text-right">العملة</th>
                  <th className="py-3 px-3.5 text-right">الرصيد الافتتاحي</th>
                  <th className="py-3 px-3.5 text-right text-emerald-800">+ المقبوضات</th>
                  <th className="py-3 px-3.5 text-right text-rose-800">- المنصرفات</th>
                  <th className="py-3 px-3.5 text-right">= صافي الفترة</th>
                  <th className="py-3 px-3.5 text-right font-black text-slate-900">الرصيد الختامي</th>
                  {currencyBreakdown.length > 1 && (
                    <th className="py-3 px-3.5 text-right text-amber-900">المعادل بـ ({baseCurrency.code})</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {currencyBreakdown.map((cb) => {
                  const isNetPositive = cb.net >= 0;
                  return (
                    <tr key={cb.code} className="hover:bg-amber-50/20 transition-colors border-b border-slate-100">
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-[10px] font-black text-slate-800">
                            {cb.code}
                          </span>
                          <span className="truncate text-slate-800 font-bold text-xs">{cb.metadata.nameAr}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap text-xs">
                        {Math.round(cb.openingBalance).toLocaleString()} {cb.metadata.symbol}
                      </td>

                      <td className="py-3.5 px-3.5 text-right font-black text-emerald-700 tabular-nums whitespace-nowrap text-xs">
                        +{Math.round(cb.income).toLocaleString()} {cb.metadata.symbol}
                      </td>

                      <td className="py-3.5 px-3.5 text-right font-black text-rose-700 tabular-nums whitespace-nowrap text-xs">
                        -{Math.round(cb.expense).toLocaleString()} {cb.metadata.symbol}
                      </td>

                      <td className={`py-3.5 px-3.5 text-right font-black tabular-nums whitespace-nowrap text-xs ${
                        isNetPositive ? 'text-slate-900' : 'text-rose-900'
                      }`}>
                        {isNetPositive ? '+' : ''}{Math.round(cb.net).toLocaleString()} {cb.metadata.symbol}
                      </td>

                      <td className="py-3.5 px-3.5 text-right font-black text-slate-950 tabular-nums whitespace-nowrap bg-amber-50/50 text-xs">
                        {Math.round(cb.closingBalance).toLocaleString()} {cb.metadata.symbol}
                      </td>

                      {currencyBreakdown.length > 1 && (
                        <td className="py-3.5 px-3.5 text-right font-black text-amber-900 tabular-nums whitespace-nowrap text-xs">
                          {Math.round(cb.convertedClosingToBase).toLocaleString()} {baseCurrency.symbol}
                        </td>
                      )}
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
                      <span className="text-slate-950 tabular-nums">
                        {Math.round(cat.totalAmount).toLocaleString()} {baseCurrency.symbol} ({pct}%)
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
                      <span className="text-slate-950 tabular-nums">
                        {Math.round(cat.totalAmount).toLocaleString()} {baseCurrency.symbol} ({pct}%)
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
    </div>
  );
};
