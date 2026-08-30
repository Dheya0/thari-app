import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';

interface DebtsViewProps {
  model: ReportModel;
}

export const FinancialReportDebtsView: React.FC<DebtsViewProps> = ({ model }) => {
  const { scope, debts } = model;
  const baseCurrency = scope.baseCurrency;

  const totalReceivable = debts?.totalReceivable || 0;
  const totalPayable = debts?.totalPayable || 0;
  const netDebtPosition = debts?.netDebtPosition || 0;
  const items = debts?.items || [];

  const receivables = items.filter(d => d.type === 'to_me');
  const payables = items.filter(d => d.type === 'on_me');

  return (
    <div className="space-y-6">
      {/* 1. Scope Profile Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نوع الكشف</span>
          <p className="text-xs font-black text-slate-900 truncate">كشف الديون والالتزامات المالية</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">العملة المعيارية</span>
          <p className="text-xs font-black text-amber-700 truncate">{baseCurrency.nameAr} ({baseCurrency.code})</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">تاريخ التوثيق</span>
          <p className="text-xs font-black text-slate-900 truncate">{model.metadata.generatedAtFormattedAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">إجمالي السجلات</span>
          <p className="text-xs font-black text-slate-900">{items.length} ذمة مسجلة</p>
        </div>
      </div>

      {/* 2. Debts Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4">
        {/* Receivables: ديون لي */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">مستحقات لي بذمة الغير (ديون لي)</span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
              {debts?.receivableCount || 0} ذمة
            </span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black text-emerald-950 dir-ltr text-right">
              +{Math.round(totalReceivable).toLocaleString()} <span className="text-sm font-bold text-emerald-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-emerald-700 font-medium mt-1">
              مبالغ قائمة مستحقة للتحصيل
            </p>
          </div>
        </div>

        {/* Payables: ديون علي */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">مطلوبات للغير عليّ (ديون عليّ)</span>
            <span className="text-[10px] font-bold bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md">
              {debts?.payableCount || 0} ذمة
            </span>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black text-rose-950 dir-ltr text-right">
              -{Math.round(totalPayable).toLocaleString()} <span className="text-sm font-bold text-rose-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-rose-700 font-medium mt-1">
              التزامات قائمة واجبة السداد
            </p>
          </div>
        </div>

        {/* Net Debt Position: صافي المركز المالي للديون */}
        <div className={`border rounded-2xl p-4.5 flex flex-col justify-between ${
          netDebtPosition >= 0 ? 'bg-blue-50/80 border-blue-200' : 'bg-amber-50/80 border-amber-200'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${netDebtPosition >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>
              صافي مركز الذمم المالية
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              netDebtPosition >= 0 ? 'bg-blue-100 text-blue-950' : 'bg-amber-100 text-amber-950'
            }`}>
              {netDebtPosition >= 0 ? 'مركز إيجابي (فائض)' : 'مركز سلبي (التزام)'}
            </span>
          </div>
          <div className="mt-1">
            <div className={`text-2xl font-black dir-ltr text-right ${netDebtPosition >= 0 ? 'text-blue-950' : 'text-amber-950'}`}>
              {netDebtPosition >= 0 ? '+' : ''}{Math.round(netDebtPosition).toLocaleString()} <span className="text-sm font-bold text-slate-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-slate-600 font-medium mt-1">
              مسدد: {debts?.settledCount || 0} | نشط: {debts?.activeCount || 0} | متأخر: {debts?.overdueCount || 0}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Debts Detailed Table */}
      <div>
        <div className="flex justify-between items-center mb-2.5 break-avoid">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              سجل تفاصيل الذمم والديون والمستحقات
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {items.length} سجل مسجل
          </span>
        </div>

        <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xs">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white break-avoid border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3 text-right font-black w-36">الطرف المقابل / الشخص</th>
                <th className="py-3 px-3 text-center font-black w-28">النوع والصفة</th>
                <th className="py-3 px-3 text-left font-black w-28">المبلغ الأصلي</th>
                <th className="py-3 px-3 text-left font-black w-24">المسدد</th>
                <th className="py-3 px-3 text-left font-black w-32">المتبقي ({baseCurrency.code})</th>
                <th className="py-3 px-3 text-center font-black w-24">تاريخ الاستحقاق</th>
                <th className="py-3 px-3 text-center font-black w-24">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    لا توجد ديون أو التزامات مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                items.map((d, idx) => {
                  const isToMe = d.type === 'to_me';
                  return (
                    <tr key={d.id || idx} className={`break-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div>
                          <span>{d.personName}</span>
                          {d.personPhone && (
                            <span className="block text-[9.5px] font-mono text-slate-400 font-normal">{d.personPhone}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isToMe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {d.typeLabelAr}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-slate-800 dir-ltr">
                        {Math.round(d.originalAmount).toLocaleString()} <span className="text-[9.5px] text-slate-500 font-normal">{d.currency}</span>
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700 dir-ltr">
                        {Math.round(d.paidAmount).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-black dir-ltr">
                        <span className={isToMe ? 'text-emerald-800' : 'text-rose-800'}>
                          {Math.round(d.convertedRemaining).toLocaleString()} {baseCurrency.symbol}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[10px] text-slate-600">
                        {d.dueDate ? d.dueDate.slice(0, 10) : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          d.status === 'settled'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : d.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : d.status === 'partial'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {d.statusLabelAr}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black break-avoid border-t-2 border-slate-800 text-[11px]">
                  <td className="py-3 px-3" colSpan={4}>صافي الالتزامات والمستحقات المتبقية</td>
                  <td className="py-3 px-3 text-left font-mono dir-ltr text-amber-400">
                    {netDebtPosition >= 0 ? '+' : ''}{Math.round(netDebtPosition).toLocaleString()} {baseCurrency.symbol}
                  </td>
                  <td className="py-3 px-3 text-center font-mono" colSpan={2}>
                    {receivables.length} مستحق | {payables.length} التزام
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
