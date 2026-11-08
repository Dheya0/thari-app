import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  Share2, 
  Copy, 
  CheckCheck, 
  Eye, 
  EyeOff,
  BookOpen, 
  ArrowUpRight,
  ArrowDownLeft,
  Wallet as WalletIcon,
  Layers
} from 'lucide-react';
import { Category, Currency, Transaction, Wallet, Budget, Debt, SavingsGoal } from '../types';
import { ReportModel, ReportType } from '../services/reports/reportTypes';
import { generateFinancialReportSync } from '../services/reports/reportService';
import { formatLocalDateOnly, formatFinancialNumber } from '../utils/formatters';
import { printOrShareFinancialReport, buildReportTextSummary } from '../services/reports/reportExportService';
import { FinancialReportDocument } from './reports/FinancialReportDocument';
import { NativeHaptics } from '../services/nativeServices';

interface OfficialReportsTabProps {
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
  onPrint?: (...args: any[]) => any;
  onExportExcel?: (...args: any[]) => any;
}

type DateRangePreset = 'all' | 'this_month' | 'last_month' | 'last_90_days' | 'custom';

const OfficialReportsTabComponent: React.FC<OfficialReportsTabProps> = ({
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
}) => {
  const [reportType, setReportType] = useState<ReportType>('detailed');
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>(() => wallets.map(w => w.id));
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [valuationCurrency] = useState<string>(() => currentCurrency?.code || 'SAR');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate] = useState<string>('');
  const [customEndDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [showPaperPreview, setShowPaperPreview] = useState<boolean>(false);

  // Is all wallets selected
  const isAllWalletsSelected = useMemo(() => {
    return selectedWalletIds.length === 0 || selectedWalletIds.length === wallets.length;
  }, [selectedWalletIds, wallets]);

  // Active wallets in scope
  const activeSelectedWallets = useMemo(() => {
    if (isAllWalletsSelected) return wallets;
    return wallets.filter(w => selectedWalletIds.includes(w.id));
  }, [isAllWalletsSelected, selectedWalletIds, wallets]);

  // Available currencies across selection
  const availableCurrenciesInSelection = useMemo(() => {
    return Array.from(new Set(activeSelectedWallets.map(w => w.currencyCode)));
  }, [activeSelectedWallets]);

  // Handle wallet toggle
  const handleToggleWallet = (walletId: string) => {
    NativeHaptics.selection().catch(() => {});
    if (isAllWalletsSelected) {
      setSelectedWalletIds([walletId]);
      return;
    }
    if (selectedWalletIds.includes(walletId)) {
      if (selectedWalletIds.length <= 1) {
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

  // Date range calculation
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
        endDate: formatLocalDateOnly(now)
      };
    }
    if (datePreset === 'custom') {
      return {
        startDate: customStartDate || null,
        endDate: customEndDate || null
      };
    }
    return { startDate: null, endDate: null };
  }, [datePreset, customStartDate, customEndDate]);

  // Effective valuation currency
  const effectiveValuationCurrency = useMemo(() => {
    if (selectedCurrencyCode) return selectedCurrencyCode;
    if (availableCurrenciesInSelection.length === 1) return availableCurrenciesInSelection[0];
    return valuationCurrency || currentCurrency?.code || 'SAR';
  }, [selectedCurrencyCode, availableCurrenciesInSelection, valuationCurrency, currentCurrency]);

  // Report Model Generation
  const reportModel: ReportModel = useMemo(() => {
    const singleWalletId = (selectedWalletIds.length === 1 && !isAllWalletsSelected)
      ? selectedWalletIds[0]
      : null;

    const baseCode = effectiveValuationCurrency;

    return generateFinancialReportSync({
      transactions,
      categories,
      wallets: activeSelectedWallets,
      budgets,
      debts,
      goals,
      userName,
      baseCurrencyCode: baseCode,
      exchangeRates,
      params: {
        type: reportType,
        reportType,
        walletId: singleWalletId,
        walletIds: isAllWalletsSelected ? undefined : selectedWalletIds,
        currencyCode: selectedCurrencyCode,
        startDate,
        endDate
      }
    });
  }, [
    transactions,
    categories,
    activeSelectedWallets,
    budgets,
    debts,
    goals,
    userName,
    effectiveValuationCurrency,
    exchangeRates,
    reportType,
    selectedWalletIds,
    isAllWalletsSelected,
    selectedCurrencyCode,
    startDate,
    endDate
  ]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handlePrint = async () => {
    if (isProcessing) return;
    NativeHaptics.impact('LIGHT').catch(() => {});
    setIsProcessing(true);
    try {
      await printOrShareFinancialReport(reportModel, 'print');
      showToast('تم فتح نافذة طباعة وتصدير كشف الحساب (PDF A4) بنجاح');
    } catch (e) {
      console.warn('Print error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (isProcessing) return;
    NativeHaptics.impact('LIGHT').catch(() => {});
    setIsProcessing(true);
    try {
      await printOrShareFinancialReport(reportModel, 'share');
      showToast('تم فتح نافذة المشاركة للمستند المالي بنجاح');
    } catch (e) {
      console.warn('Share error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExcel = async () => {
    if (isProcessing) return;
    NativeHaptics.impact('LIGHT').catch(() => {});
    setIsProcessing(true);
    try {
      await printOrShareFinancialReport(reportModel, 'excel');
      showToast('تم تصدير كشف الحساب إلى مصنف Excel (.xlsx) بنجاح');
    } catch (e) {
      console.warn('Excel export error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopySummary = async () => {
    NativeHaptics.selection().catch(() => {});
    try {
      const summaryText = buildReportTextSummary(reportModel);
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      showToast('تم نسخ ملخص كشف الحساب لمشاركته عبر واتساب');
      setTimeout(() => setCopiedSummary(false), 3000);
    } catch (e) {
      console.warn('Copy summary error:', e);
    }
  };

  const sym = reportModel.scope?.baseCurrency?.symbol || currentCurrency?.symbol || 'ر.س';

  return (
    <div className="space-y-5 pb-28 md:pb-8 max-w-5xl mx-auto">
      {feedbackToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg">
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 1. Filters & Scope Bar */}
      <div className="bg-[#11161C] p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4 shadow-lg">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                إصدار وتصدير كشف الحساب المالي
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                اختر النطاق والفترة ثم صدّر الكشف مباشرة بصيغة PDF A4 أو Excel بمسافات مريحة ومرتبة
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 text-[#D9B978] text-[11px] font-bold shrink-0">
            {reportModel.transactions.length} عملية
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Report Type Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              نوع التقرير المالي:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => { NativeHaptics.selection().catch(() => {}); setReportType('detailed'); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center active:scale-95 ${
                  reportType === 'detailed'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                كشف حساب تفصيلي
              </button>
              <button
                type="button"
                onClick={() => { NativeHaptics.selection().catch(() => {}); setReportType('summary'); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center active:scale-95 ${
                  reportType === 'summary'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                ملخص تنفيذي عام
              </button>
            </div>
          </div>

          {/* Date Range Presets */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              الفترة الزمنية للكشف:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => { NativeHaptics.selection().catch(() => {}); setDatePreset('all'); }}
                className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all border text-center active:scale-95 ${
                  datePreset === 'all'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400'
                }`}
              >
                كامل السجل
              </button>
              <button
                type="button"
                onClick={() => { NativeHaptics.selection().catch(() => {}); setDatePreset('this_month'); }}
                className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all border text-center active:scale-95 ${
                  datePreset === 'this_month'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400'
                }`}
              >
                هذا الشهر
              </button>
              <button
                type="button"
                onClick={() => { NativeHaptics.selection().catch(() => {}); setDatePreset('last_month'); }}
                className={`py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all border text-center active:scale-95 ${
                  datePreset === 'last_month'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400'
                }`}
              >
                الشهر الماضي
              </button>
            </div>
          </div>

          {/* Currency Isolation Scope */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              تصفية العملة:
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => { NativeHaptics.selection().catch(() => {}); setSelectedCurrencyCode(null); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border active:scale-95 ${
                  selectedCurrencyCode === null
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400'
                }`}
              >
                كافة العملات
              </button>
              {availableCurrenciesInSelection.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { NativeHaptics.selection().catch(() => {}); setSelectedCurrencyCode(c); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border active:scale-95 ${
                    selectedCurrencyCode === c
                      ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                      : 'bg-[#171D24] border-white/5 text-slate-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Wallets Badges Strip */}
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 me-1">المحافظ المشمولة:</span>
            {wallets.map((w) => {
              const isSelected = isAllWalletsSelected || selectedWalletIds.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleToggleWallet(w.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-[#D9B978]/15 border-[#D9B978]/50 text-[#D9B978]'
                      : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: w.color || '#D9B978' }}
                  />
                  <span>{w.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Clean Dark-Mode Executive Summary Cards (Replaces cramped raw A4 sheet on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#11161C] p-4 rounded-2xl border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>الرصيد الافتتاحي</span>
            <Layers size={14} className="text-slate-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-white font-numeric truncate">
            {formatFinancialNumber(reportModel.kpis.openingBalance)}
            <span className="text-[11px] font-normal text-slate-400 ms-1">{sym}</span>
          </div>
        </div>

        <div className="bg-[#11161C] p-4 rounded-2xl border border-emerald-500/20 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-400/90 text-[11px] font-bold">
            <span>إجمالي الإيداعات</span>
            <ArrowUpRight size={14} />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-numeric truncate">
            +{formatFinancialNumber(reportModel.kpis.totalIncome)}
            <span className="text-[11px] font-normal text-emerald-400/70 ms-1">{sym}</span>
          </div>
        </div>

        <div className="bg-[#11161C] p-4 rounded-2xl border border-rose-500/20 space-y-1.5">
          <div className="flex items-center justify-between text-rose-400/90 text-[11px] font-bold">
            <span>إجمالي المسحوبات</span>
            <ArrowDownLeft size={14} />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-400 font-numeric truncate">
            -{formatFinancialNumber(reportModel.kpis.totalExpense)}
            <span className="text-[11px] font-normal text-rose-400/70 ms-1">{sym}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#171D24] to-[#11161C] p-4 rounded-2xl border border-[#D9B978]/35 space-y-1.5">
          <div className="flex items-center justify-between text-[#D9B978] text-[11px] font-bold">
            <span>الرصيد الختامي الفعلي</span>
            <WalletIcon size={14} />
          </div>
          <div className="text-base sm:text-lg font-black text-[#D9B978] font-numeric truncate">
            {formatFinancialNumber(reportModel.kpis.closingBalance)}
            <span className="text-[11px] font-normal text-[#D9B978]/80 ms-1">{sym}</span>
          </div>
        </div>
      </div>

      {/* 3. Direct One-Tap Export & Action Hub */}
      <div className="bg-[#11161C] p-4 sm:p-5 rounded-3xl border border-white/10 space-y-3.5 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#C9A45C] to-[#E2C78C] hover:brightness-105 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#D9B978]/15 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Printer size={18} />
            <span>{isProcessing ? 'جاري تجهيز المستند...' : 'طباعة / حفظ كشف الحساب (PDF A4)'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#171D24] hover:bg-[#1E2630] border border-emerald-500/30 text-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <FileSpreadsheet size={18} />
            <span>تصدير جدول محاسبي (Excel .xlsx)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleShare}
            disabled={isProcessing}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 size={15} className="text-[#D9B978]" />
            <span>مشاركة الكشف</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            {copiedSummary ? <CheckCheck size={15} className="text-emerald-400" /> : <Copy size={15} className="text-[#D9B978]" />}
            <span>{copiedSummary ? 'تم النسخ!' : 'نسخ لواتساب'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              setShowPaperPreview(prev => !prev);
            }}
            className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            {showPaperPreview ? <EyeOff size={15} className="text-slate-400" /> : <Eye size={15} className="text-[#D9B978]" />}
            <span>{showPaperPreview ? 'إخفاء معاينة الورقة' : 'معاينة ورقة الطباعة (A4)'}</span>
          </button>
        </div>
      </div>

      {/* 4. Optional On-Demand Paper Document Preview */}
      {showPaperPreview && (
        <div className="rounded-2xl border border-slate-300 overflow-x-auto shadow-2xl bg-white">
          <FinancialReportDocument model={reportModel} />
        </div>
      )}
    </div>
  );
};

export const OfficialReportsTab = React.memo(OfficialReportsTabComponent);

