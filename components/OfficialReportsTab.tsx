import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  FileSpreadsheet, 
  Share2, 
  Calendar, 
  Wallet as WalletIcon, 
  Coins, 
  Copy, 
  CheckCheck, 
  Eye, 
  BookOpen, 
  PieChart, 
  ArrowRight,
  Sparkles,
  Download
} from 'lucide-react';
import { Category, Currency, Transaction, Wallet, Budget, Debt, SavingsGoal } from '../types';
import { ReportModel, ReportType } from '../services/reports/reportTypes';
import { generateFinancialReportSync } from '../services/reports/reportService';
import { formatLocalDateOnly } from '../utils/formatters';
import { printOrShareFinancialReport, buildReportTextSummary } from '../services/reports/reportExportService';
import { FinancialReportDocument } from './reports/FinancialReportDocument';

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

export const OfficialReportsTab: React.FC<OfficialReportsTabProps> = ({
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
  onPrint,
  onExportExcel
}) => {
  const [reportType, setReportType] = useState<ReportType>('detailed');
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>(() => wallets.map(w => w.id));
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [valuationCurrency, setValuationCurrency] = useState<string>(() => currentCurrency?.code || 'SAR');
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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
    try {
      const summaryText = buildReportTextSummary(reportModel);
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      showToast('تم نسخ ملخص كشف الحساب لمشاركتها عبر واتساب');
      setTimeout(() => setCopiedSummary(false), 3000);
    } catch (e) {
      console.warn('Copy summary error:', e);
    }
  };

  return (
    <div className="space-y-6 pb-28 md:pb-8 max-w-6xl mx-auto">
      {/* 1. Header and Quick Export Action Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#11161C] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>كشف الحساب والتقارير المالية الرسمية</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/30 font-bold">
                Official Statement Suite
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              كشف حساب بنكي رسمي أنيق باللون الأبيض ولمسات ذهبية، مع تصدير مباشر لـ PDF و Excel
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all active:scale-95"
            title="نسخ ملخص نصي لواتساب"
          >
            {copiedSummary ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[#D9B978]" />}
            <span className="hidden sm:inline">{copiedSummary ? 'تم النسخ!' : 'نسخ لواتساب'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-[#171D24] hover:bg-[#1E252E] border border-white/10 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-[#D9B978] hover:bg-[#D9B978]/90 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#D9B978]/20 transition-all active:scale-95"
          >
            <Printer size={15} />
            <span>{isProcessing ? 'جاري التجهيز...' : 'طباعة / PDF (A4)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Scope Bar */}
      <div className="bg-[#11161C]/80 p-4 rounded-2xl border border-white/10 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Report Type Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
              نوع التقرير المالي:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setReportType('detailed')}
                className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  reportType === 'detailed'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                كشف حساب بنكي
              </button>
              <button
                type="button"
                onClick={() => setReportType('summary')}
                className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
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
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setDatePreset('all')}
                className={`p-1.5 rounded-lg text-[11px] font-bold transition-all border text-center ${
                  datePreset === 'all'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400'
                }`}
              >
                كامل السجل
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('this_month')}
                className={`p-1.5 rounded-lg text-[11px] font-bold transition-all border text-center ${
                  datePreset === 'this_month'
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#171D24] border-white/5 text-slate-400'
                }`}
              >
                هذا الشهر
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('last_month')}
                className={`p-1.5 rounded-lg text-[11px] font-bold transition-all border text-center ${
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
                onClick={() => setSelectedCurrencyCode(null)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
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
                  onClick={() => setSelectedCurrencyCode(c)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
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
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400">نطاق المحافظ:</span>
            {wallets.map((w) => {
              const isSelected = isAllWalletsSelected || selectedWalletIds.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleToggleWallet(w.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-[#D9B978]/15 border-[#D9B978]/50 text-[#D9B978]'
                      : 'bg-white/5 border-white/5 text-slate-500'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: w.color || '#D9B978' }}
                  />
                  <span>{w.name}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-bold text-slate-400">
            {reportModel.transactions.length} قيد محاسبي معروض
          </span>
        </div>
      </div>

      {/* 3. Official Bank Statement Embedded Document View */}
      <div className="rounded-2xl border border-slate-300 overflow-hidden shadow-2xl bg-white">
        <FinancialReportDocument model={reportModel} />
      </div>
    </div>
  );
};
