import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';
import { FinancialReportSummaryView } from './FinancialReportSummaryView';
import { FinancialReportDetailedView } from './FinancialReportDetailedView';
import { FinancialReportBudgetView } from './FinancialReportBudgetView';
import { FinancialReportWealthView } from './FinancialReportWealthView';
import { FinancialReportDebtsView } from './FinancialReportDebtsView';
import { FinancialReportGoalsView } from './FinancialReportGoalsView';
import { ReportScopeHeader } from './ReportScopeHeader';
import { Logo } from '../Logo';

interface ReportDocumentProps {
  model: ReportModel;
  id?: string;
}

export const FinancialReportDocument: React.FC<ReportDocumentProps> = ({
  model,
  id = 'financial-report-print-area',
}) => {
  const { metadata, reportType, account } = model;

  const getReportTitle = () => {
    switch (reportType) {
      case 'detailed':
        return 'كشف حساب العمليات والقيود التفصيلي';
      case 'category':
        return 'تقرير الميزانية ومطابقة الإنفاق الفعلي';
      case 'wealth':
        return 'تقرير صافي الثروة وتوزيع المحافظ والعملات';
      case 'debts':
        return 'كشف الديون والالتزامات المالية';
      case 'savings_goals':
        return 'تقرير الأهداف المالية والمدخرات';
      case 'summary':
      default:
        return 'التقرير المالي التنفيذي الشامل';
    }
  };

  const reportTitle = getReportTitle();

  const renderReportContent = () => {
    switch (reportType) {
      case 'detailed':
        return <FinancialReportDetailedView model={model} />;
      case 'category':
        return <FinancialReportBudgetView model={model} />;
      case 'wealth':
        return <FinancialReportWealthView model={model} />;
      case 'debts':
        return <FinancialReportDebtsView model={model} />;
      case 'savings_goals':
        return <FinancialReportGoalsView model={model} />;
      case 'summary':
      default:
        return <FinancialReportSummaryView model={model} />;
    }
  };

  return (
    <div
      id={id}
      dir="rtl"
      className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-5xl mx-auto print:p-0 print:max-w-none print:w-full print:m-0 print:border-none shadow-xl print:shadow-none border border-slate-200 print:text-black antialiased"
      style={{ minHeight: '100%' }}
    >
      {/* 1. Clean Header Section */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6 print:pb-3.5 print:mb-5">
        <div className="flex flex-wrap justify-between items-center gap-4">
          {/* Logo and Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center p-2 border border-slate-800 shadow-xs print:w-10 print:h-10 print:rounded-xl">
              <Logo size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight print:text-lg">ثَـــري</h1>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {reportTitle}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-1 print:text-[10px]">
                صاحب الحساب: <span className="font-black text-slate-900">{account.name}</span>
              </p>
            </div>
          </div>

          {/* Clean Date & Currency Info */}
          <div className="text-left text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 print:text-[10px]">
            <p className="font-bold text-slate-800">
              تاريخ الإصدار: <span className="font-mono font-black text-slate-950">{metadata.generatedAtFormattedAr}</span>
            </p>
            <p className="text-slate-500 mt-0.5">
              العملة الأساسية: <span className="font-black text-amber-700">{model.scope.baseCurrency.nameAr} ({model.scope.baseCurrency.symbol})</span>
            </p>
          </div>
        </div>

        {/* Distinct Scope Badges Bar (Selected Wallets, Currencies, Period) */}
        <ReportScopeHeader
          scope={model.scope}
          totalTransactions={model.kpis.totalTransactions}
          className="mt-4 print:mt-3 print:p-3"
        />
      </div>

      {/* 2. Main Content View */}
      {renderReportContent()}

      {/* 3. Simple, Clean Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] print:text-[9px] text-slate-500 font-bold break-inside-avoid">
        <span>تطبيق ثـري للإدارة المالية الذكية • كشف مالي مستخرج محلياً</span>
        <span className="font-mono">{metadata.generatedAtFormattedAr}</span>
      </div>
    </div>
  );
};
