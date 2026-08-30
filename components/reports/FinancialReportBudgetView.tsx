import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';

interface BudgetViewProps {
  model: ReportModel;
}

export const FinancialReportBudgetView: React.FC<BudgetViewProps> = ({ model }) => {
  const { scope, kpis, budgets = [], expenseCategories } = model;
  const baseCurrency = scope.baseCurrency;

  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const totalVariance = totalBudgeted - totalSpent;
  const overallUsedPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
  const overBudgetCount = budgets.filter(b => b.isOverBudget).length;

  return (
    <div className="space-y-6">
      {/* 1. Scope Profile Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نطاق التقرير</span>
          <p className="text-xs font-black text-slate-900 truncate">{scope.walletNameAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">العملة المعيارية</span>
          <p className="text-xs font-black text-amber-700 truncate">{baseCurrency.nameAr} ({baseCurrency.code})</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">الفترة الزمنية</span>
          <p className="text-xs font-black text-slate-900 truncate">{scope.periodLabelAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">التصنيفات المشمولة</span>
          <p className="text-xs font-black text-slate-900">{budgets.length} تصنيف مالي</p>
        </div>
      </div>

      {/* 2. Budget Executive Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3">
        <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-slate-600 uppercase block">إجمالي الميزانية المعتمدة</span>
          <p className="text-base font-black text-slate-950 dir-ltr text-right mt-1">
            {Math.round(totalBudgeted).toLocaleString()} <span className="text-[10px] font-bold">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9px] text-slate-500 font-semibold">{budgets.filter(b => b.budgetAmount > 0).length} تصنيفات محددة</span>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-rose-800 uppercase block">إجمالي المصروف الفعلي</span>
          <p className="text-base font-black text-rose-950 dir-ltr text-right mt-1">
            {Math.round(totalSpent).toLocaleString()} <span className="text-[10px] font-bold">{baseCurrency.symbol}</span>
          </p>
          <span className="text-[9px] text-rose-700 font-semibold">{kpis.expenseCount} حركة صرف</span>
        </div>

        <div className={`border rounded-xl p-3.5 ${totalVariance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-300'}`}>
          <span className={`text-[10px] font-bold uppercase block ${totalVariance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
            {totalVariance >= 0 ? 'الوفر المتبقي بالميزانية' : 'عجز تجاوز الميزانية'}
          </span>
          <p className={`text-base font-black dir-ltr text-right mt-1 ${totalVariance >= 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
            {totalVariance >= 0 ? '+' : ''}{Math.round(totalVariance).toLocaleString()} <span className="text-[10px] font-bold">{baseCurrency.symbol}</span>
          </p>
          <span className={`text-[9px] font-semibold ${totalVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            استهلاك: {overallUsedPercent}%
          </span>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">مؤشر الانضباط المالي</span>
          <p className="text-base font-black text-amber-400 dir-ltr text-right mt-1">
            {overBudgetCount === 0 ? 'انضباط ممتاز 100%' : `${overBudgetCount} تصنيف متجاوز`}
          </p>
          <span className="text-[9px] text-slate-300 font-semibold">
            {overBudgetCount === 0 ? 'جميع البنود ضمن الحد' : 'يتطلب ترشيد الصرف'}
          </span>
        </div>
      </div>

      {/* 3. Budget vs Actual Comparison Table */}
      <div>
        <div className="flex justify-between items-center mb-2.5 break-avoid">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              جدول مطابقة الميزانيات المعتمدة مقابل الإنفاق الفعلي
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            مقيّم بعملة: {baseCurrency.nameAr}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xs">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white break-avoid border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3 text-right font-black w-36">التصنيف</th>
                <th className="py-3 px-3 text-left font-black w-28">الميزانية المعتمدة</th>
                <th className="py-3 px-3 text-left font-black w-28">الإنفاق الفعلي</th>
                <th className="py-3 px-3 text-left font-black w-28">الفارق (الوفر/العجز)</th>
                <th className="py-3 px-3 text-center font-black w-36">نسبة الاستهلاك</th>
                <th className="py-3 px-3 text-center font-black w-28">حالة البند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    لا توجد بيانات إنفاق أو ميزانيات مسجلة لهذه الفترة.
                  </td>
                </tr>
              ) : (
                budgets.map((b, idx) => {
                  const isOver = b.isOverBudget;
                  const pct = Math.min(100, Math.max(0, b.percentageUsed));
                  return (
                    <tr
                      key={b.categoryId || idx}
                      className={`break-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} ${
                        isOver ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: b.categoryColor || '#f43f5e' }}
                          />
                          <span>{b.categoryName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-slate-700 dir-ltr">
                        {b.budgetAmount > 0 ? `${Math.round(b.budgetAmount).toLocaleString()} ${baseCurrency.symbol}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-rose-700 dir-ltr">
                        {Math.round(b.spentAmount).toLocaleString()} {baseCurrency.symbol}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold dir-ltr">
                        {b.budgetAmount > 0 ? (
                          <span className={b.remainingAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {b.remainingAmount >= 0 ? '+' : ''}{Math.round(b.remainingAmount).toLocaleString()} {baseCurrency.symbol}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {b.budgetAmount > 0 ? (
                          <div className="w-full max-w-[140px] mx-auto space-y-1">
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isOver ? 'bg-rose-600' : b.percentageUsed >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono font-bold ${
                              isOver ? 'text-rose-700' : 'text-slate-600'
                            }`}>
                              {b.percentageUsed}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">غير محدد</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOver
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : b.percentageUsed >= 80
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : b.budgetAmount > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {b.statusLabelAr}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {budgets.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black break-avoid border-t-2 border-slate-800 text-[11px]">
                  <td className="py-3 px-3">الإجمالي العام للميزانيات</td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr">
                    {Math.round(totalBudgeted).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr text-rose-300">
                    {Math.round(totalSpent).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr text-amber-300">
                    {totalVariance >= 0 ? '+' : ''}{Math.round(totalVariance).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">{overallUsedPercent}%</td>
                  <td className="py-3 px-3 text-center">
                    {overBudgetCount === 0 ? 'مكتمل بنجاح' : `${overBudgetCount} عجز`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
