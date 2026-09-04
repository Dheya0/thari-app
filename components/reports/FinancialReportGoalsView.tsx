import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';

interface GoalsViewProps {
  model: ReportModel;
}

export const FinancialReportGoalsView: React.FC<GoalsViewProps> = ({ model }) => {
  const { scope, goals } = model;
  const baseCurrency = scope.baseCurrency;

  const totalTarget = goals?.totalTargetAmount || 0;
  const totalSaved = goals?.totalSavedAmount || 0;
  const overallProgress = goals?.overallProgressPercent || 0;
  const items = goals?.items || [];
  const completedCount = goals?.completedCount || 0;

  return (
    <div className="space-y-6">
      {/* 1. Scope Profile Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نوع الكشف</span>
          <p className="text-xs font-black text-slate-900 truncate">تقرير الأهداف والمدخرات المالية</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">العملة المعيارية</span>
          <p className="text-xs font-black text-amber-700 truncate">{baseCurrency.nameAr} ({baseCurrency.code})</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">تاريخ التقرير</span>
          <p className="text-xs font-black text-slate-900 truncate">{model.metadata.generatedAtFormattedAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">إجمالي الأهداف</span>
          <p className="text-xs font-black text-slate-900">{items.length} هدف استراتيجي</p>
        </div>
      </div>

      {/* 2. Goals Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4">
        {/* Total Target Amount */}
        <div className="bg-slate-900 text-white rounded-2xl p-4.5 flex flex-col justify-between border border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">إجمالي المبالغ المستهدفة للأهداف</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-400 dir-ltr text-right">
              {Math.round(totalTarget).toLocaleString()} <span className="text-sm font-bold text-slate-300">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium mt-1">
              القيمة الإجمالية المطلوبة لتحقيق كافة الخطط
            </p>
          </div>
        </div>

        {/* Total Saved Amount */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">إجمالي المدخرات المحققة فعلياً</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-950 dir-ltr text-right">
              +{Math.round(totalSaved).toLocaleString()} <span className="text-sm font-bold text-emerald-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-emerald-700 font-medium mt-1">
              مجموع المبالغ المحجوزة والمحولة للأهداف
            </p>
          </div>
        </div>

        {/* Completion Progress */}
        <div className="bg-[#D9B978]/10 border border-[#D9B978]/30 rounded-2xl p-4.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[#8A6D3B] uppercase tracking-wider">نسبة الإنجاز والتحقيق الكلية</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dir-ltr text-right">
              {overallProgress}% <span className="text-sm font-bold text-[#8A6D3B]">مكتمل</span>
            </div>
            <p className="text-[10.5px] text-slate-600 font-medium mt-1">
              تم إنجاز {completedCount} من أصل {items.length} أهداف بالكامل
            </p>
          </div>
        </div>
      </div>

      {/* 3. Goals Progress Table */}
      <div>
        <div className="flex justify-between items-center mb-2.5 break-avoid">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              سجل تقدم الأهداف المالية والمدخرات
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {items.length} أهداف مسجلة
          </span>
        </div>

        <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xs">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white break-avoid border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3 text-right font-black w-40">اسم الهدف المالي</th>
                <th className="py-3 px-3 text-left font-black w-28">المبلغ المستهدف</th>
                <th className="py-3 px-3 text-left font-black w-28">المحقق حالياً</th>
                <th className="py-3 px-3 text-left font-black w-28">المتبقي للإنجاز</th>
                <th className="py-3 px-3 text-center font-black w-36">مؤشر التقدم</th>
                <th className="py-3 px-3 text-center font-black w-24">الموعد المستهدف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    لا توجد أهداف مالية أو خطط ادخار مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                items.map((g, idx) => {
                  const pct = Math.min(100, Math.max(0, g.progressPercent));
                  return (
                    <tr key={g.id || idx} className={`break-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: g.color || '#10b981' }}
                          />
                          <span>{g.name}</span>
                          {g.isCompleted && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              مكتمل ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-slate-900 dir-ltr">
                        {Math.round(g.convertedTarget).toLocaleString()} <span className="text-[9.5px] text-slate-500 font-normal">{baseCurrency.symbol}</span>
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700 dir-ltr">
                        {Math.round(g.convertedCurrent).toLocaleString()} <span className="text-[9.5px] text-emerald-600 font-normal">{baseCurrency.symbol}</span>
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-slate-600 dir-ltr">
                        {Math.round(g.remainingAmount).toLocaleString()} <span className="text-[9.5px] text-slate-400 font-normal">{baseCurrency.symbol}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="w-full max-w-[140px] mx-auto space-y-1">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${g.isCompleted ? 'bg-emerald-600' : 'bg-[#D9B978]'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-600">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[10px] text-slate-600">
                        {g.deadline ? g.deadline.slice(0, 10) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black break-avoid border-t-2 border-slate-800 text-[11px]">
                  <td className="py-3 px-3">إجمالي الأهداف المالية</td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr">
                    {Math.round(totalTarget).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr text-emerald-400">
                    {Math.round(totalSaved).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr text-slate-300">
                    {Math.round(Math.max(0, totalTarget - totalSaved)).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-center font-mono" colSpan={2}>
                    إنجاز كلي {overallProgress}% ({completedCount} مكتمل)
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
