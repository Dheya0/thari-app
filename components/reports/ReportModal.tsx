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
  Circle,
  Check,
  X,
  Eye,
  Layers,
  ArrowRight,
  ShieldCheck,
  Scale,
  Target,
  PieChart,
  BookOpen,
  SlidersHorizontal,
  Copy,
  Share2,
  ZoomIn,
  ZoomOut,
  CheckCheck,
} from 'lucide-react';
import { Category, Currency, Transaction, Wallet, Budget, Debt, SavingsGoal } from '../../types';
import { ReportModel, ReportType } from '../../services/reports/reportTypes';
import { generateFinancialReportSync } from '../../services/reports/reportService';
import { formatLocalDateOnly } from '../../utils/formatters';
import {
  buildExcelReportCSV,
  buildExcelReportHTML,
  buildPrintableReportHTML,
  buildReportTextSummary,
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

  // Multi-wallet selection state: array of selected wallet IDs
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>(() => {
    if (initialWalletId) return [initialWalletId];
    return wallets.map(w => w.id);
  });

  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(initialCurrencyCode);
  const [valuationCurrency, setValuationCurrency] = useState<string>(() => {
    return currentCurrency?.code || 'SAR';
  });
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Check if all wallets are selected
  const isAllWalletsSelected = useMemo(() => {
    return selectedWalletIds.length === 0 || selectedWalletIds.length === wallets.length;
  }, [selectedWalletIds, wallets]);

  // Active wallets object in scope
  const activeSelectedWallets = useMemo(() => {
    if (isAllWalletsSelected) return wallets;
    return wallets.filter(w => selectedWalletIds.includes(w.id));
  }, [isAllWalletsSelected, selectedWalletIds, wallets]);

  // Available currencies across selected wallets
  const availableCurrenciesInSelection = useMemo(() => {
    const codes = Array.from(new Set(activeSelectedWallets.map(w => w.currencyCode)));
    return codes;
  }, [activeSelectedWallets]);

  // Wallet selection toggle handler
  const handleToggleWallet = (walletId: string) => {
    if (isAllWalletsSelected) {
      // If currently all are selected, clicking one isolates to that specific wallet
      setSelectedWalletIds([walletId]);
      return;
    }

    if (selectedWalletIds.includes(walletId)) {
      if (selectedWalletIds.length <= 1) {
        // Can't unselect the last wallet, revert to all wallets
        setSelectedWalletIds(wallets.map(w => w.id));
      } else {
        setSelectedWalletIds(selectedWalletIds.filter(id => id !== walletId));
      }
    } else {
      const next = [...selectedWalletIds, walletId];
      if (next.length === wallets.length) {
        setSelectedWalletIds(wallets.map(w => w.id));
      } else {
        setSelectedWalletIds(next);
      }
    }
  };

  const handleSelectAllWallets = () => {
    setSelectedWalletIds(wallets.map(w => w.id));
  };

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

  // Automatically adapt valuation currency if all selected wallets share one currency
  const effectiveValuationCurrency = useMemo(() => {
    if (selectedCurrencyCode) return selectedCurrencyCode;
    if (availableCurrenciesInSelection.length === 1) return availableCurrenciesInSelection[0];
    return valuationCurrency || currentCurrency?.code || 'SAR';
  }, [selectedCurrencyCode, availableCurrenciesInSelection, valuationCurrency, currentCurrency]);

  // Generate current report model
  const reportModel: ReportModel = useMemo(() => {
    const targetWalletIds = isAllWalletsSelected ? null : selectedWalletIds;
    const targetSingleWalletId = (!isAllWalletsSelected && selectedWalletIds.length === 1)
      ? selectedWalletIds[0]
      : null;

    return generateFinancialReportSync({
      transactions,
      categories,
      wallets,
      userName,
      baseCurrencyCode: effectiveValuationCurrency,
      exchangeRates,
      budgets,
      debts,
      goals,
      params: {
        type: reportType,
        walletIds: targetWalletIds,
        walletId: targetSingleWalletId,
        currencyCode: selectedCurrencyCode,
        startDate,
        endDate,
        targetCurrencyCode: effectiveValuationCurrency,
      },
    });
  }, [
    transactions,
    categories,
    wallets,
    userName,
    effectiveValuationCurrency,
    exchangeRates,
    budgets,
    debts,
    goals,
    reportType,
    isAllWalletsSelected,
    selectedWalletIds,
    selectedCurrencyCode,
    startDate,
    endDate,
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => {
      setFeedbackToast((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

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
      showFeedback('تم فتح نافذة الطباعة / تجهيز ملف PDF بنجاح');
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
      showFeedback('تم فتح نافذة المشاركة وتجهيز ملف التقرير (PDF) بنجاح');
    } catch (e) {
      console.warn('Share handler error:', e);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Excel Spreadsheet (.xlsx) Export handler
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
      showFeedback('تم إنشاء وتصدير مصنف Excel (.xlsx) بنجاح بكافة التفاصيل');
    } catch (e) {
      console.warn('Excel export error:', e);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Quick Executive Text Summary Copy Handler (WhatsApp, Telegram, Notes)
  const handleCopySummary = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const summaryText = buildReportTextSummary(reportModel);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = summaryText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSummary(true);
      showFeedback('تم نسخ ملخص التقرير المالي للحافظة بنجاح! جاهز للصق في واتساب أو أي تطبيق');
      setTimeout(() => setCopiedSummary(false), 3000);
    } catch (err) {
      console.warn('Failed to copy summary:', err);
      showFeedback('تعذر النسخ التلقائي، يرجى المحاولة مرة أخرى', 'info');
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
      desc: 'كشف حساب محاسبي كامل يشمل جدول جميع المعاملات مفصولة بالعملات.',
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
                {showPreview ? 'مستند عالي الدقة جاهز للطباعة والمشاركة والتحميل' : 'تطبيق ثـري • دعم متعدد المحافظ وفصل العملات حسابياً'}
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
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Preview Control Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#171D24] p-3 px-4 rounded-2xl border border-[#D9B978]/30 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-200">
                    معاينة المستند المالي التفاعلي • جاهز للطباعة والمشاركة
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom controls */}
                  <div className="hidden sm:inline-flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.max(60, previewZoom - 15))}
                      className="p-1.5 hover:text-[#D9B978] transition-colors"
                      title="تصغير المعاينة"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="px-1.5 font-mono font-bold text-[11px] text-slate-300">
                      {previewZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(Math.min(120, previewZoom + 15))}
                      className="p-1.5 hover:text-[#D9B978] transition-colors"
                      title="تكبير المعاينة"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold transition-all border border-white/10 active:scale-95"
                    title="نسخ ملخص نصي لواتساب أو الملاحظات"
                  >
                    {copiedSummary ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[#D9B978]" />}
                    <span className="hidden sm:inline">{copiedSummary ? 'تم النسخ!' : 'نسخ الملخص'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D9B978]/15 hover:bg-[#D9B978]/25 text-[#D9B978] text-xs font-bold transition-all border border-[#D9B978]/30 active:scale-95"
                  >
                    <ArrowRight size={14} />
                    <span>تعديل الفلاتر</span>
                  </button>
                </div>
              </div>

              <div 
                className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xl bg-white origin-top transition-transform duration-200"
                style={{ transform: previewZoom !== 100 ? `scale(${previewZoom / 100})` : undefined }}
              >
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

            {/* 2. Wallet Multi-Selection Scope */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <WalletIcon size={14} className="text-[#D9B978]" />
                  <span>2. نطاق المحافظ المالية (تحديد متعدد مرن)</span>
                </label>
                <span className="text-[11px] font-bold text-[#D9B978] bg-[#D9B978]/10 px-2 py-0.5 rounded-lg border border-[#D9B978]/20">
                  {isAllWalletsSelected
                    ? `كافة المحافظ (${wallets.length} من ${wallets.length})`
                    : `تم اختيار ${selectedWalletIds.length} من أصل ${wallets.length} محافظ`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Select All Quick Button */}
                <button
                  type="button"
                  onClick={handleSelectAllWallets}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-right flex items-center justify-between sm:col-span-2 ${
                    isAllWalletsSelected
                      ? 'bg-[#D9B978]/15 border-[#D9B978] text-[#D9B978]'
                      : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      isAllWalletsSelected ? 'bg-[#D9B978] border-[#D9B978] text-[#0A0D10]' : 'border-slate-600'
                    }`}>
                      {isAllWalletsSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span>تضمين كافة المحافظ المالية ({wallets.length})</span>
                  </div>
                  <span className="text-[10px] opacity-75">شامل لكافة الحسابات</span>
                </button>

                {/* Individual Wallet Selection Cards */}
                {wallets.map((w) => {
                  const isSelected = isAllWalletsSelected || selectedWalletIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleToggleWallet(w.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all truncate text-right flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#D9B978]/10 border-[#D9B978]/70 text-[#F4F1EA] shadow-xs'
                          : 'bg-[#0A0D10]/40 border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-[#D9B978] border-[#D9B978] text-[#0A0D10]' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: w.color || '#D9B978' }}
                        />
                        <span className="truncate">{w.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 shrink-0 border border-white/5">
                        {w.currencyCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Currency Filter & Base Valuation Scope */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} className="text-[#8EB9A7]" />
                  <span>3. نطاق العملات والتقييم الحسابي</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {selectedCurrencyCode
                    ? `تصفية لعملة واحدة (${selectedCurrencyCode})`
                    : `فصل العملات (${availableCurrenciesInSelection.join(' + ')})`}
                </span>
              </div>

              {/* Currency Filter Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCurrencyCode(null)}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all truncate text-center ${
                    selectedCurrencyCode === null
                      ? 'bg-[#8EB9A7]/20 border-[#8EB9A7] text-[#8EB9A7]'
                      : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                  }`}
                >
                  كافة عملات المحافظ
                </button>

                {availableCurrenciesInSelection.map((currCode) => {
                  const matched = currencies.find(c => c.code === currCode);
                  const isSelected = selectedCurrencyCode === currCode;
                  return (
                    <button
                      key={currCode}
                      type="button"
                      onClick={() => setSelectedCurrencyCode(currCode)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all truncate text-center ${
                        isSelected
                          ? 'bg-[#8EB9A7]/20 border-[#8EB9A7] text-[#8EB9A7]'
                          : 'bg-[#0A0D10]/60 border-white/5 text-slate-400 hover:text-[#F4F1EA]'
                      }`}
                    >
                      {matched ? matched.name : currCode} ({currCode})
                    </button>
                  );
                })}
              </div>

              {/* Unified Base Valuation Currency (When multiple currencies exist) */}
              {!selectedCurrencyCode && availableCurrenciesInSelection.length > 1 && (
                <div className="p-3 rounded-2xl bg-[#0A0D10]/80 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-300">
                      عملة التقييم المعياري للإجمالي الموحد:
                    </span>
                    <span className="text-[10px] text-amber-400/90 font-medium">
                      (لن يتم إجبار أي قيد على التحويل لريال يمني إلا إذا اخترت ذلك)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {currencies.map((c) => (
                      <button
                        key={`val-${c.code}`}
                        type="button"
                        onClick={() => setValuationCurrency(c.code)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all text-center truncate ${
                          valuationCurrency === c.code
                            ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                            : 'bg-[#171D24] border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {c.name} ({c.code})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableCurrenciesInSelection.length === 1 && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>
                    جميع المحافظ المختارة تعمل بعملة موحدة ({availableCurrenciesInSelection[0]}). التقرير سيصدر بالعملة الأصلية بدون أي تحويلات.
                  </span>
                </div>
              )}
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

            {/* 5. Quick Share & Instant Copy */}
            <div className="p-3.5 bg-[#0A0D10]/80 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  5. مشاركة سريعة ونسخ مباشر
                </span>
                <span className="text-[10px] text-[#D9B978] font-bold">
                  واتساب • تليجرام • الرسائل
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="p-2.5 rounded-xl border border-white/10 bg-[#171D24] hover:bg-[#1E252E] text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
                >
                  {copiedSummary ? <CheckCheck size={15} className="text-emerald-400" /> : <Copy size={15} className="text-[#D9B978]" />}
                  <span>{copiedSummary ? 'تم نسخ الملخص!' : 'نسخ ملخص واتساب'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareReport}
                  disabled={isProcessing}
                  className="p-2.5 rounded-xl border border-white/10 bg-[#171D24] hover:bg-[#1E252E] text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
                >
                  <Share2 size={15} className="text-[#759BC8]" />
                  <span>مشاركة ملف PDF</span>
                </button>
              </div>
            </div>

            {/* Scope Summary Preview Box */}
            <div className="p-4 bg-[#0A0D10]/80 rounded-2xl border border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#D9B978] uppercase tracking-widest block">
                  ملخص نطاق التقرير المجهز
                </span>
                <p className="text-xs font-bold text-slate-200">
                  {reportModel.transactions.length} حركة مسجلة • {activeSelectedWallets.length} محافظ • {availableCurrenciesInSelection.join('، ')}
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

        {/* Real-time Feedback Banner */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 bg-emerald-500/15 border-t border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 overflow-hidden"
            >
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>{feedbackToast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

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
            onClick={handleCopySummary}
            className="py-3.5 px-3 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all shrink-0"
            title="نسخ ملخص نصي لواتساب"
          >
            {copiedSummary ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} className="text-[#D9B978]" />}
            <span className="hidden sm:inline">{copiedSummary ? 'تم النسخ' : 'نسخ الملخص'}</span>
          </button>

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
            className={`flex-1 py-3.5 px-3 bg-[#759BC8] hover:bg-[#688DB9] text-[#0A0D10] font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#759BC8]/20 active:scale-98 transition-all ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Share2 size={16} className={isProcessing ? 'animate-spin' : ''} />
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
