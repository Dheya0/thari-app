import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Calendar,
  Wallet as WalletIcon,
  Coins,
  CheckCircle2,
  X,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Category, Currency, Transaction, Wallet } from '../../types';
import { ReportModel, ReportType } from '../../services/reports/reportTypes';
import { generateFinancialReportSync } from '../../services/reports/reportService';
import { buildExcelReportCSV, buildExcelReportHTML, exportAndShareReportCSV, exportAndShareNativeFile } from '../../services/reports/reportExportService';
import { FinancialReportDocument } from './FinancialReportDocument';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  currencies: Currency[];
  currentCurrency: Currency;
  userName?: string;
  exchangeRates?: Record<string, number>;
  initialType?: ReportType;
  initialWalletId?: string | null;
  initialCurrencyCode?: string | null;
  onTriggerPrint?: (type: ReportType, walletId?: string | null, currencyFilter?: string | null, startDate?: string | null, endDate?: string | null) => void;
}

type DateRangePreset = 'all' | 'this_month' | 'last_month' | 'last_90_days' | 'custom';

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  wallets,
  currencies,
  currentCurrency,
  userName = 'مستخدم ثري',
  exchangeRates = {},
  initialType = 'detailed',
  initialWalletId = null,
  initialCurrencyCode = null,
  onTriggerPrint,
}) => {
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(initialWalletId);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(initialCurrencyCode);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Calculate actual startDate and endDate based on preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (datePreset === 'this_month') {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end };
    }
    if (datePreset === 'last_month') {
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      return { startDate: start, endDate: end };
    }
    if (datePreset === 'last_90_days') {
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return {
        startDate: ninetyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    }
    if (datePreset === 'custom') {
      return {
        startDate: customStartDate || null,
        endDate: customEndDate || null,
      };
    }
    return { startDate: null, endDate: null };
  }, [datePreset, customStartDate, customEndDate]);

  // Generate current preview model
  const reportModel: ReportModel = useMemo(() => {
    return generateFinancialReportSync({
      transactions,
      categories,
      wallets,
      userName,
      baseCurrencyCode: currentCurrency?.code || 'SAR',
      exchangeRates,
      params: {
        type: reportType,
        walletId: selectedWalletId,
        currencyCode: selectedCurrencyCode,
        startDate,
        endDate,
        targetCurrencyCode: currentCurrency?.code || 'SAR',
      },
    });
  }, [
    transactions,
    categories,
    wallets,
    userName,
    currentCurrency?.code,
    exchangeRates,
    reportType,
    selectedWalletId,
    selectedCurrencyCode,
    startDate,
    endDate,
  ]);

  // Print handler
  const handlePrint = () => {
    if (onTriggerPrint) {
      onTriggerPrint(reportType, selectedWalletId, selectedCurrencyCode, startDate, endDate);
    } else {
      window.print();
    }
    onClose();
  };

  // Excel Spreadsheet (.xls) Export handler
  const handleExportExcel = async () => {
    const htmlContent = buildExcelReportHTML(reportModel);
    const fileName = `THARI_${reportType === 'summary' ? 'Summary' : 'Ledger'}_${new Date().toISOString().split('T')[0]}.xls`;
    await exportAndShareNativeFile(htmlContent, fileName, 'application/vnd.ms-excel;charset=utf-8;', 'تقرير ثري المالي (Excel)');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto no-print">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-[#11161C] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-[#F4F1EA]"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-[#0A0D10]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D9B978]/10 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F4F1EA]">إصدار التقارير المالية وكشوف الحساب</h3>
              <p className="text-[11px] text-slate-400 font-medium">تطبيق ثـري • وثائق مالية تفصيلية وموجزة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {/* 1. Report Type Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. نوع التقرير المالي
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReportType('summary')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  reportType === 'summary'
                    ? 'bg-[#D9B978]/10 border-[#D9B978] shadow-md text-[#F4F1EA]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-[#D9B978]">ملخص تنفيذي</span>
                  {reportType === 'summary' && <CheckCircle2 size={16} className="text-[#D9B978]" />}
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  مؤشرات عامة، تحليل التدفق، توزيع الأرصدة والعملات بدون جدول القيود الطويل.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('detailed')}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  reportType === 'detailed'
                    ? 'bg-[#D9B978]/10 border-[#D9B978] shadow-md text-[#F4F1EA]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-[#D9B978]">كشف قيود تفصيلي</span>
                  {reportType === 'detailed' && <CheckCircle2 size={16} className="text-[#D9B978]" />}
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  كشف حساب محاسبي كامل يشمل جدول جميع المعاملات والقيود والرصيد التراكمي.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Currency Scope Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. نطاق العملة
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                {selectedCurrencyCode ? 'تصفية لعملة واحدة محددة' : 'تقرير متعدد العملات'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCurrencyCode(null)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-right ${
                  selectedCurrencyCode === null
                    ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                }`}
              >
                كافة العملات (Multi-Currency)
              </button>

              {currencies.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCurrencyCode(c.code)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-right ${
                    selectedCurrencyCode === c.code
                      ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                      : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                  }`}
                >
                  {c.name} ({c.code})
                </button>
              ))}
            </div>
          </div>

          {/* 3. Wallet Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              3. نطاق المحفظة المالية
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedWalletId(null)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-right ${
                  selectedWalletId === null
                    ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                }`}
              >
                كافة المحافظ ({wallets.length})
              </button>

              {wallets.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWalletId(w.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-right ${
                    selectedWalletId === w.id
                      ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                      : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                  }`}
                >
                  {w.name} ({w.currencyCode})
                </button>
              ))}
            </div>
          </div>

          {/* 4. Date Range Scope */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              4. الفترة الزمنية
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'كافة الفترات' },
                { id: 'this_month', label: 'الشهر الحالي' },
                { id: 'last_month', label: 'الشهر السابق' },
                { id: 'last_90_days', label: 'آخر 90 يوم' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id as DateRangePreset)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    datePreset === p.id
                      ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                      : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Dates Option Button */}
            <button
              type="button"
              onClick={() => setDatePreset('custom')}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                datePreset === 'custom'
                  ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                  : 'bg-[#0A0D10]/40 border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              تحديد فترة مخصصة (من تاريخ - إلى تاريخ)
            </button>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#0A0D10]/60 rounded-2xl border border-white/5 mt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">من تاريخ</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-[#171D24] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] outline-none focus:border-[#D9B978]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-[#171D24] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] outline-none focus:border-[#D9B978]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Scope Summary Preview Box */}
          <div className="p-3.5 bg-[#0A0D10]/80 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#D9B978] uppercase tracking-widest block">
                ملخص التقرير المجهز
              </span>
              <p className="text-xs font-bold text-slate-200">
                {reportModel.transactions.length} حركة مسجلة • إجمالي الوارد: +{Math.round(reportModel.kpis.totalIncome).toLocaleString()} {currentCurrency.symbol}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors border border-white/10"
            >
              <Eye size={14} className="text-[#D9B978]" />
              <span>{showPreview ? 'إخفاء المعاينة' : 'معاينة مباشرة'}</span>
            </button>
          </div>

          {/* Live In-App Preview Container */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border border-[#D9B978]/30 bg-white"
              >
                <div className="max-h-96 overflow-y-auto p-4 scale-95 origin-top text-slate-900">
                  <FinancialReportDocument model={reportModel} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0D10]/70 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#D9B978]/20 active:scale-98 transition-all"
          >
            <Printer size={16} />
            <span>طباعة وحفظ كـ PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex-1 py-3 px-4 bg-[#171D24] hover:bg-[#1E252E] text-[#F4F1EA] font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all"
          >
            <FileSpreadsheet size={16} className="text-[#8EB9A7]" />
            <span>تصدير كـ Excel (CSV)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
