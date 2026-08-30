import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';

interface WealthViewProps {
  model: ReportModel;
}

export const FinancialReportWealthView: React.FC<WealthViewProps> = ({ model }) => {
  const { scope, walletSummaries, currencyBreakdown, kpis } = model;
  const baseCurrency = scope.baseCurrency;

  const totalWealth = walletSummaries.reduce((sum, w) => sum + Math.max(0, w.convertedBalance || 0), 0);
  const totalRawCurrencies = currencyBreakdown.length;

  return (
    <div className="space-y-6">
      {/* 1. Scope Profile Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">نطاق المحافظ</span>
          <p className="text-xs font-black text-slate-900 truncate">{scope.walletNameAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">العملة المعيارية للتقييم</span>
          <p className="text-xs font-black text-amber-700 truncate">{baseCurrency.nameAr} ({baseCurrency.code})</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">تاريخ التقييم</span>
          <p className="text-xs font-black text-slate-900 truncate">{model.metadata.generatedAtFormattedAr}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">تنوع العملات</span>
          <p className="text-xs font-black text-slate-900">{totalRawCurrencies} عملات نشطة</p>
        </div>
      </div>

      {/* 2. Executive Wealth Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white rounded-2xl p-4.5 flex flex-col justify-between border border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">إجمالي صافي الثروة والأصول النقدية</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-400 dir-ltr text-right">
              {Math.round(totalWealth).toLocaleString()} <span className="text-sm font-bold text-slate-300">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium mt-1">
              مجموع السيولة بكافة المحافظ المحسوبة بالسعر الفعلي
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">عدد الحسابات والمحافظ النشطة</span>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-950 dir-ltr text-right">
              {walletSummaries.length} <span className="text-sm font-bold text-emerald-800">محفظة</span>
            </div>
            <p className="text-[10.5px] text-emerald-700 font-medium mt-1">
              توزيع الحسابات البنكية والنقدية والإلكترونية
            </p>
          </div>
        </div>

        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">صافي التدفق المالي التراكمي</span>
          <div className="mt-2">
            <div className={`text-2xl font-black dir-ltr text-right ${kpis.netSavings >= 0 ? 'text-blue-950' : 'text-rose-950'}`}>
              {kpis.netSavings >= 0 ? '+' : ''}{Math.round(kpis.netSavings).toLocaleString()} <span className="text-sm font-bold text-blue-800">{baseCurrency.symbol}</span>
            </div>
            <p className="text-[10.5px] text-blue-700 font-medium mt-1">
              نسبة الادخار الكلية: {kpis.savingsRatePercent}%
            </p>
          </div>
        </div>
      </div>

      {/* 3. Wallets and Accounts Breakdown Table */}
      <div>
        <div className="flex justify-between items-center mb-2.5 break-avoid">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              بيان أرصدة المحافظ والحسابات المالية وتوزيع الأصول
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {walletSummaries.length} محفظة مسجلة
          </span>
        </div>

        <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xs">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-white break-avoid border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3 text-right font-black w-36">المحفظة / الحساب</th>
                <th className="py-3 px-3 text-center font-black w-24">العملة الأساسية</th>
                <th className="py-3 px-3 text-left font-black w-32">الرصيد بالعملة الأصلية</th>
                <th className="py-3 px-3 text-left font-black w-36">المعادل بالعملة المعيارية ({baseCurrency.code})</th>
                <th className="py-3 px-3 text-center font-black w-36">نسبة التوزيع من الثروة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {walletSummaries.map((w, idx) => {
                const pct = Math.round(w.percentageOfTotalWealth * 10) / 10;
                return (
                  <tr key={w.id || idx} className={`break-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: w.color || '#3b82f6' }}
                        />
                        <span>{w.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {w.currencyCode}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-slate-900 dir-ltr">
                      {Math.round(w.rawBalance).toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">{w.currencyCode}</span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-amber-800 dir-ltr">
                      {Math.round(w.convertedBalance).toLocaleString()} <span className="text-[10px] text-slate-600 font-bold">{baseCurrency.symbol}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="w-full max-w-[140px] mx-auto space-y-1">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-black break-avoid border-t-2 border-slate-800 text-[11px]">
                <td className="py-3 px-3" colSpan={3}>إجمالي صافي الأصول المقومة</td>
                <td className="py-3 px-3 text-left font-mono dir-ltr text-amber-400">
                  {Math.round(totalWealth).toLocaleString()} {baseCurrency.symbol}
                </td>
                <td className="py-3 px-3 text-center font-mono">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Multi-Currency Portfolio Matrix */}
      {currencyBreakdown.length > 0 && (
        <div className="break-avoid">
          <div className="flex justify-between items-center mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                مصفوفة العملات الأجنبية وأسعار الصرف المعتمدة
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 font-mono">Multi-Currency Exposure</span>
          </div>

          <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xs">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white break-avoid text-[10px]">
                  <th className="py-2.5 px-3 text-right font-black">العملة والمنطقة</th>
                  <th className="py-2.5 px-3 text-center font-black">الرمز</th>
                  <th className="py-2.5 px-3 text-left font-black">إجمالي المقبوضات</th>
                  <th className="py-2.5 px-3 text-left font-black">إجمالي المصروفات</th>
                  <th className="py-2.5 px-3 text-left font-black">الصافي بالعملة الأصلية</th>
                  <th className="py-2.5 px-3 text-left font-black">المعادل بـ ({baseCurrency.code})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currencyBreakdown.map((cb, idx) => (
                  <tr key={cb.code || idx} className={`break-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {cb.metadata.nameAr} <span className="text-[10px] text-slate-400 font-mono">({cb.code})</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                      {cb.metadata.symbol}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-700 dir-ltr">
                      +{Math.round(cb.income).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-700 dir-ltr">
                      -{Math.round(cb.expense).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold dir-ltr">
                      <span className={cb.net >= 0 ? 'text-slate-900' : 'text-rose-700'}>
                        {cb.net >= 0 ? '+' : ''}{Math.round(cb.net).toLocaleString()} {cb.metadata.symbol}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-black text-amber-800 dir-ltr">
                      {cb.convertedNetToBase >= 0 ? '+' : ''}{Math.round(cb.convertedNetToBase).toLocaleString()} {baseCurrency.symbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
