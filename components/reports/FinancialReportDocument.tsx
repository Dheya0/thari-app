import React from 'react';
import { ReportModel } from '../../services/reports/reportTypes';
import { FinancialReportSummaryView } from './FinancialReportSummaryView';
import { FinancialReportDetailedView } from './FinancialReportDetailedView';
import { FinancialReportBudgetView } from './FinancialReportBudgetView';
import { FinancialReportWealthView } from './FinancialReportWealthView';
import { FinancialReportDebtsView } from './FinancialReportDebtsView';
import { FinancialReportGoalsView } from './FinancialReportGoalsView';
import { ReportQRCode } from './ReportQRCode';
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
        return {
          ar: 'كشف القيود والمعاملات المالية التفصيلي',
          en: '(Financial Transaction Ledger)',
        };
      case 'category':
        return {
          ar: 'تقرير تحليل الميزانية ومطابقة الإنفاق الفعلي',
          en: '(Budget Performance & Category Analysis)',
        };
      case 'wealth':
        return {
          ar: 'تقرير صافي الثروة وتوزيع المحافظ والعملات',
          en: '(Wealth & Multi-Currency Asset Allocation)',
        };
      case 'debts':
        return {
          ar: 'كشف الذمم والديون والالتزامات المالية',
          en: '(Debts & Liabilities Statement)',
        };
      case 'savings_goals':
        return {
          ar: 'تقرير الأهداف المالية ومتابعة المدخرات',
          en: '(Goals & Savings Progress Report)',
        };
      case 'summary':
      default:
        return {
          ar: 'الملخص المالي التنفيذي العام',
          en: '(Executive Financial Summary)',
        };
    }
  };

  const titleInfo = getReportTitle();

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
      className="bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-5xl mx-auto print:p-4 print:max-w-none print:w-full print:m-0 print:border-none shadow-xl print:shadow-none border border-slate-200 print:text-black antialiased"
      style={{ minHeight: '100%' }}
    >
      {/* 1. Header Section */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6">
        <div className="flex justify-between items-start gap-4">
          
          {/* Logo and Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center p-2 border border-slate-800 shadow-md">
              <Logo size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-950 tracking-tight">ثَـــري</h1>
                <span className="text-sm font-bold text-amber-600 font-mono">THARI</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                منظومة إدارة الأصول والميزانيات المالية المتكاملة
              </p>
              <p className="text-[9px] font-medium text-slate-400">
                Institutional Financial Suite & Wealth Management
              </p>
            </div>
          </div>

          {/* Document Reference, Verification & QR Code */}
          <div className="flex items-center gap-4">
            <div className="text-left font-mono text-[10px] text-slate-600 hidden sm:block print:block">
              <p className="font-black text-slate-950 text-xs">{metadata.reportId}</p>
              <p className="text-slate-500 mt-0.5">بصمة: {metadata.fingerprint}</p>
              <p className="text-slate-400 mt-0.5">{metadata.generatedAtFormattedAr}</p>
              <p className="text-slate-400">{metadata.generatedTimeFormattedAr}</p>
            </div>
            <ReportQRCode
              payload={metadata.qrPayload}
              size={64}
              reportId={metadata.reportId}
              dataUrl={metadata.qrDataUrl}
            />
          </div>

        </div>

        {/* Document Title Banner */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-base sm:text-lg font-black text-slate-950">
              {titleInfo.ar}
            </h2>
            <span className="text-xs font-bold text-slate-400 font-mono">
              {titleInfo.en}
            </span>
          </div>

          <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            حساب: <span className="font-black text-slate-900">{account.name}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content View */}
      {renderReportContent()}

      {/* 3. Institutional Footer & Security Endorsement */}
      <div className="mt-10 pt-6 border-t-2 border-slate-900 break-inside-avoid">
        <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 items-center mb-4">
          
          {/* Electronic System Endorsement */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider mb-1">الاعتماد التقني للوثيقة</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-950 flex items-center justify-center text-amber-400 font-black text-xs">
                ثـ
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-900">تطبيق ثـري المالي</p>
                <p className="text-[8px] font-bold text-amber-700">تشفير محلي آمن ومطابق للمصادقة</p>
              </div>
            </div>
          </div>

          {/* Barcode & Security Hash Generator */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex gap-0.5 h-5 items-center my-1 opacity-70">
              <div className="w-1 h-full bg-slate-900" />
              <div className="w-0.5 h-full bg-slate-900" />
              <div className="w-1.5 h-full bg-slate-900" />
              <div className="w-0.5 h-full bg-slate-900" />
              <div className="w-2 h-full bg-slate-900" />
              <div className="w-0.5 h-full bg-slate-900" />
              <div className="w-1.5 h-full bg-slate-900" />
              <div className="w-1 h-full bg-slate-900" />
              <div className="w-0.5 h-full bg-slate-900" />
              <div className="w-2 h-full bg-slate-900" />
            </div>
            <p className="text-[7.5px] font-mono font-black text-slate-500">HASH: {metadata.fingerprint}</p>
          </div>

          {/* Application Information */}
          <div className="text-right sm:text-left print:text-left">
            <p className="text-xs font-black text-slate-900">ثَـــري • Thari Financial Suite</p>
            <p className="text-[8.5px] text-slate-500 font-medium">المنظومة التنفيذية لإدارة الأصول والميزانيات</p>
            <p className="text-[8px] text-slate-400 font-mono mt-0.5">ISSUED: {metadata.generatedAtISO.split('T')[0]}</p>
          </div>

        </div>

        <div className="text-center bg-slate-950 text-slate-400 p-2.5 rounded-xl text-[9px] font-bold border border-slate-800">
          تم استخراج هذا المستند المالي آلياً عبر تطبيق ثري. البيانات محفوظة محلياً ومشفرة ولا يتم مشاركتها خارج جهاز المستخدم.
        </div>
      </div>
    </div>
  );
};
