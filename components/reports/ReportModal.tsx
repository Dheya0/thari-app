import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Scale,
  Target,
  PieChart,
  BookOpen,
} from 'lucide-react';
import { Category, Currency, Transaction, Wallet, Budget, Debt, SavingsGoal } from '../../types';
import { ReportModel, ReportType } from '../../services/reports/reportTypes';
import { generateFinancialReportSync } from '../../services/reports/reportService';
import { formatLocalDateOnly } from '../../utils/formatters';
import {
  buildExcelReportCSV,
  buildExcelReportHTML,
  buildPrintableReportHTML,
  exportAndShareNativeFile,
  printOrShareFinancialReport,
} from '../../services/reports/reportExportService';
import { FinancialReportDocument } from './FinancialReportDocument';
import { useBackNavigation } from '../../utils/backNavigation';

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
  budgets?: Budget[];
  debts?: Debt[];
  goals?: SavingsGoal[];
  initialType?: ReportType;
  initialWalletId?: string | null;
  initialCurrencyCode?: string | null;
  onTriggerPrint?: (
    type: ReportType,
    walletId?: string | null,
    currencyFilter?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ) => void;
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
  budgets = [],
  debts = [],
  goals = [],
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

  // Calculate actual startDate and endDate based on preset using strictly local dates
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (datePreset === 'this_month') {
      const start = formatLocalDateOnly(new Date(y, m, 1));
      const end = formatLocalDateOnly(new Date(y, m + 1, 0));
      return { startDate: start, endDate: end };
    }
    if (datePreset === 'last_month') {
      const start = formatLocalDateOnly(new Date(y, m - 1, 1));
      const end = formatLocalDateOnly(new Date(y, m, 0));
      return { startDate: start, endDate: end };
    }
    if (datePreset === 'last_90_days') {
      const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
      return {
        startDate: formatLocalDateOnly(ninetyDaysAgo),
        endDate: formatLocalDateOnly(now),
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
      budgets,
      debts,
      goals,
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
    budgets,
    debts,
    goals,
    reportType,
    selectedWalletId,
    selectedCurrencyCode,
    startDate,
    endDate,
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  // Print / PDF handler (guaranteed ONE print job per user action)
  const handlePrint = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      await printOrShareFinancialReport(reportModel, 'print');
    } catch (e) {
      console.warn('Print handler error:', e);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Register in unified back navigation stack
  useBackNavigation(() => {
    if (showPreview) {
      setShowPreview(false);
      return true;
    }
    onClose();
    return true;
  }, isOpen, 15);

  // Dedicated share handler for mobile/iPhone & Android
  const handleShareReport = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      await printOrShareFinancialReport(reportModel, 'share');
    } catch (e) {
      console.warn('Share handler error:', e);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Excel Spreadsheet (.xls) Export handler
  const handleExportExcel = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      await printOrShareFinancialReport(reportModel, 'excel');
    } catch (e) {
      console.warn('Excel export error:', e);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const REPORT_TYPE_OPTIONS: Array<{
    type: ReportType;
    title: string;
    desc: string;
    icon: any;
    color: string;
  }> = [
    {
      type: 'summary',
      title: 'ملخص تنفيذي',
      desc: 'مؤشرات عامة، تحليل التدفق، وتوزيع الأرصدة والعملات.',
      icon: PieChart,
      color: '#D9B978',
    },
    {
      type: 'detailed',
      title: 'كشف قيود تفصيلي',
      desc: 'كشف حساب محاسبي كامل يشمل جدول جميع المعاملات والرصيد التراكمي.',
      icon: BookOpen,
      color: '#759BC8',
    },
    {
      type: 'category',
      title: 'الميزانيات والإنفاق',
      desc: 'مطابقة الإنفاق الفعلي مع الميزانيات المعتمدة ونسب الاستهلاك.',
      icon: Layers,
      color: '#8EB9A7',
    },
    {
      type: 'wealth',
      title: 'توزيع الثروة والمحافظ',
      desc: 'صافي الأصول وتوزيع المحافظ النقدية وتفصيل العملات الأجنبية.',
      icon: Coins,
      color: '#C5A25D',
    },
    {
      type: 'debts',
      title: 'الديون والالتزامات',
      desc: 'كشف المستحقات والالتزامات المالية وحالات السداد والاستحقاق.',
      icon: Scale,
      color: '#C98387',
    },
    {
      type: 'savings_goals',
      title: 'الأهداف والمدخرات',
      desc: 'متابعة الخطط والمدخرات المحققة ونسب إنجاز الأهداف.',
      icon: Target,
      color: '#6E9FA4',
    },
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (showPreview) {
            setShowPreview(false);
          } else {
            onClose();
          }
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full ${showPreview ? 'max-w-4xl' : 'max-w-2xl'} bg-[#11161C] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[88dvh] sm:max-h-[88vh] text-[#F4F1EA] transition-all duration-200`}
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-[#0A0D10]/90 shrink-0">
          <div className="flex items-center gap-3">
            {showPreview ? (
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-[#D9B978]/15 border border-[#D9B978]/30 text-[#D9B978] active:scale-90 transition-all font-bold text-xs"
                aria-label="الرجوع لخيارات التقرير"
                title="الرجوع لخيارات التقرير"
              >
                <ArrowRight size={18} />
                <span>الخيارات</span>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#D9B978]/10 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
                <FileText size={20} />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-[#F4F1EA]">
                {showPreview ? 'معاينة المستند المالي المباشرة' : 'إصدار التقارير المالية وكشوف الحساب'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {showPreview ? 'مستند عالي الدقة جاهز للطباعة والمشاركة والتحميل' : 'تطبيق ثـري • وثائق مالية تفصيلية وموجزة'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (showPreview) {
                setShowPreview(false);
              } else {
                onClose();
              }
            }}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {showPreview ? (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/60 custom-scrollbar overscroll-contain">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between bg-[#171D24] p-3 px-4 rounded-2xl border border-[#D9B978]/30 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200">
                    معاينة المستند المالي التفاعلي • دقة عالية ومطابقة معيارية
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#D9B978] text-xs font-bold transition-all border border-[#D9B978]/30 active:scale-95"
                >
                  <ArrowRight size={14} />
                  <span>تعديل الفلاتر</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xl bg-white">
                <FinancialReportDocument model={reportModel} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar overscroll-contain">
            {/* 1. Report Type Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. نوع التقرير المالي المطلوب
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REPORT_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = reportType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setReportType(opt.type)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#D9B978]/15 border-[#D9B978] shadow-md text-[#F4F1EA]'
                        : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${opt.color}20`, color: opt.color }}
                        >
                          <Icon size={14} />
                        </div>
                        <span className="text-xs font-black text-[#F4F1EA]">{opt.title}</span>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-[#D9B978]" />}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Currency Scope Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. نطاق العملة
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                {selectedCurrencyCode ? 'تصفية لعملة واحدة محددة' : 'تقرير شامل متعدد العملات'}
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
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-right flex items-center justify-between ${
                    selectedWalletId === w.id
                      ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                      : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                  }`}
                >
                  <span className="truncate">{w.name}</span>
                  <span className="text-[10px] opacity-70 ml-1">({w.currencyCode})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Date Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              4. الفترة الزمنية
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDatePreset('all')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  datePreset === 'all'
                    ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                }`}
              >
                كامل السجل
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('this_month')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  datePreset === 'this_month'
                    ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                }`}
              >
                هذا الشهر
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('last_month')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  datePreset === 'last_month'
                    ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                }`}
              >
                الشهر الماضي
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('last_90_days')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  datePreset === 'last_90_days'
                    ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                }`}
              >
                آخر 90 يوماً
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDatePreset(datePreset === 'custom' ? 'all' : 'custom')}
              className={`w-full mt-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                datePreset === 'custom'
                  ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                  : 'bg-[#0A0D10]/40 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
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
          <div className="p-4 bg-[#0A0D10]/80 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#D9B978] uppercase tracking-widest block">
                ملخص التقرير المجهز
              </span>
              <p className="text-xs font-bold text-slate-200">
                {reportModel.transactions.length} حركة مسجلة • إجمالي الوارد: +
                {Math.round(reportModel.kpis.totalIncome).toLocaleString()} {currentCurrency.symbol}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D9B978]/15 hover:bg-[#D9B978]/25 text-[#D9B978] text-xs font-black transition-all border border-[#D9B978]/40 shadow-sm active:scale-95"
            >
              <Eye size={16} />
              <span>معاينة المستند</span>
            </button>
          </div>
        </div>
        )}

        {/* Footer Actions with Safe-Area Insets */}
        <div className="p-4 sm:p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,16px))] border-t border-white/10 bg-[#0A0D10]/95 shrink-0 flex flex-wrap sm:flex-nowrap gap-2.5">
          {showPreview ? (
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="py-3.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all shrink-0"
            >
              <ArrowRight size={16} />
              <span>تعديل الخيارات</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="py-3.5 px-4 bg-white/5 hover:bg-white/10 text-[#D9B978] font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 border border-[#D9B978]/30 active:scale-98 transition-all shrink-0"
            >
              <Eye size={16} />
              <span>معاينة حية</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={isProcessing}
            className={`flex-1 py-3.5 px-3 bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#D9B978]/20 active:scale-98 transition-all ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Printer size={16} className={isProcessing ? 'animate-spin' : ''} />
            <span>{isProcessing ? 'جاري المعالجة...' : 'طباعة / PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareReport}
            disabled={isProcessing}
            className={`flex-1 py-3.5 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition-all ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <FileText size={16} className={isProcessing ? 'animate-spin' : ''} />
            <span>{isProcessing ? 'جاري التصدير...' : 'مشاركة التقرير'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isProcessing}
            className={`py-3.5 px-4 bg-[#171D24] hover:bg-[#1E252E] text-[#F4F1EA] font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all shrink-0 ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <FileSpreadsheet size={16} className={`text-[#8EB9A7] ${isProcessing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isProcessing ? 'جاري التصدير...' : 'تصدير Excel'}</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
