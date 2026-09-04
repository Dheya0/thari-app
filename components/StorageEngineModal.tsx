import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  HardDrive,
  Zap,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Cpu,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { AppState, Transaction, ArchivedYearSummary } from '../types';
import { getStorageMetrics, StorageMetrics } from '../services/storage/ultraStorageEngine';
import {
  getEligibleArchiveYears,
  archiveFiscalYear,
  unarchiveFiscalYear,
  searchArchivedTransactions
} from '../services/archiveService';

interface StorageEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onUpdateState: (newState: AppState) => void;
  currencySymbol: string;
  language?: 'ar' | 'en';
}

export const StorageEngineModal: React.FC<StorageEngineModalProps> = ({
  isOpen,
  onClose,
  appState,
  onUpdateState,
  currencySymbol,
  language = 'ar'
}) => {
  const isAr = language === 'ar';
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [archivingYear, setArchivingYear] = useState<number | null>(null);
  const [unarchivingYear, setUnarchivingYear] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Archive viewer modal/state
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [viewedArchivedTxs, setViewedArchivedTxs] = useState<Transaction[]>([]);
  const [isLoadingArchiveTxs, setIsLoadingArchiveTxs] = useState(false);

  // Refresh metrics when opened
  const loadMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const activeCount = (appState.transactions || []).filter(t => !t.isDeleted).length;
      const archivedCount = appState.archivedTransactionsCount || 0;
      const archivedYears = (appState.archivedYears || []).length;
      const data = await getStorageMetrics(activeCount, archivedCount, archivedYears);
      setMetrics(data);
    } catch (err) {
      console.warn('Failed to load storage metrics', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
      setActionMessage(null);
    }
  }, [isOpen, appState.transactions, appState.archivedTransactionsCount]);

  const eligibleYears = useMemo(() => {
    return getEligibleArchiveYears(appState.transactions || []);
  }, [appState.transactions]);

  // Handle Archiving a Fiscal Year
  const handleArchiveYear = async (year: number) => {
    setArchivingYear(year);
    setActionMessage(null);
    try {
      const { updatedState, summary } = await archiveFiscalYear(appState, year);
      onUpdateState(updatedState);
      setActionMessage({
        type: 'success',
        text: isAr
          ? `تمت أرشفة وتدوير سنة ${year} بنجاح! تم حفظ ${summary.transactionCount.toLocaleString()} عملية في الأرشيف البارد وضبط الأرصدة الافتتاحية للمحافظ بدقة متناهية.`
          : `Fiscal year ${year} archived successfully! ${summary.transactionCount.toLocaleString()} operations moved to cold storage with opening balances rolled forward.`
      });
      await loadMetrics();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (isAr ? 'فشلت عملية الأرشفة' : 'Failed to archive fiscal year')
      });
    } finally {
      setArchivingYear(null);
    }
  };

  // Handle Unarchiving a Fiscal Year
  const handleUnarchiveYear = async (year: number) => {
    if (!window.confirm(isAr
      ? `هل أنت متأكد من استعادة عمليات سنة ${year} إلى السجل النشط؟`
      : `Are you sure you want to restore transactions of ${year} to the active ledger?`)) {
      return;
    }

    setUnarchivingYear(year);
    setActionMessage(null);
    try {
      const updatedState = await unarchiveFiscalYear(appState, year);
      onUpdateState(updatedState);
      setActionMessage({
        type: 'success',
        text: isAr
          ? `تمت استعادة عمليات سنة ${year} إلى السجل النشط وتعديل الأرصدة الافتتاحية بنجاح.`
          : `Year ${year} restored to active ledger successfully.`
      });
      if (expandedYear === year) {
        setExpandedYear(null);
        setViewedArchivedTxs([]);
      }
      await loadMetrics();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || (isAr ? 'فشلت عملية الاستعادة' : 'Failed to restore archive')
      });
    } finally {
      setUnarchivingYear(null);
    }
  };

  // View archived transactions
  const handleToggleExpandYear = async (year: number) => {
    if (expandedYear === year) {
      setExpandedYear(null);
      setViewedArchivedTxs([]);
      return;
    }
    setExpandedYear(year);
    setIsLoadingArchiveTxs(true);
    try {
      const txs = await searchArchivedTransactions(year, archiveSearchQuery);
      setViewedArchivedTxs(txs);
    } catch {
      setViewedArchivedTxs([]);
    } finally {
      setIsLoadingArchiveTxs(false);
    }
  };

  const handleSearchArchive = async (query: string) => {
    setArchiveSearchQuery(query);
    if (!expandedYear) return;
    setIsLoadingArchiveTxs(true);
    try {
      const txs = await searchArchivedTransactions(expandedYear, query);
      setViewedArchivedTxs(txs);
    } catch {
      setViewedArchivedTxs([]);
    } finally {
      setIsLoadingArchiveTxs(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div
        id="storage-engine-modal-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="storage-engine-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  {isAr ? 'محرك الأداء والتخزين الفائق (10+ سنوات)' : 'Ultra Scale & High-Capacity Engine'}
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    IndexedDB
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'بنية تحتية محلية فائقة السرعة تدعم مئات الآلاف من العمليات بدون حدود السعة القديمة'
                    : 'High-speed local storage infrastructure engineered for 200k+ transactions without limits'}
                </p>
              </div>
            </div>

            <button
              id="close-storage-modal-btn"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Feedback Alert */}
            {actionMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {actionMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs sm:text-sm font-medium leading-relaxed">
                  {actionMessage.text}
                </div>
              </motion.div>
            )}

            {/* Performance Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Storage Tier */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    {isAr ? 'محرك التخزين الفعّال' : 'Active Engine'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-base font-bold text-white truncate">
                  {metrics?.activeEngine || 'IndexedDB Vault'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isAr ? 'مشفر محلياً بـ AES-256-GCM' : 'Encrypted with AES-256-GCM'}
                </div>
              </div>

              {/* Memory & Quota */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    {isAr ? 'السعة المستخدمة' : 'Storage Used'}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {metrics ? formatBytes(metrics.storageUsedBytes) : '...'}
                  </span>
                </div>
                <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-700/40">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(3, Math.min(100, (metrics?.usagePercentage || 0.1)))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{isAr ? 'متاح:' : 'Available:'} {metrics ? formatBytes(metrics.storageQuotaBytes) : 'GBs+'}</span>
                  <span>{metrics ? `${metrics.usagePercentage}%` : '0%'}</span>
                </div>
              </div>

              {/* Transactions Count */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {isAr ? 'سعة المعاملات' : 'Transactions'}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">{isAr ? 'غير محدود' : 'Unlimited'}</span>
                </div>
                <div className="text-base font-bold text-white flex items-baseline gap-2">
                  <span>{((appState.transactions || []).length).toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-normal">{isAr ? 'نشطة' : 'active'}</span>
                  {!!appState.archivedTransactionsCount && (
                    <span className="text-xs text-amber-400 font-normal">
                      + {(appState.archivedTransactionsCount).toLocaleString()} {isAr ? 'مؤرشفة' : 'archived'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isAr ? 'تصفح فوري 60 إطار/ثانية' : 'Instant 60fps responsiveness'}
                </div>
              </div>
            </div>

            {/* Why this is immune to 200k slowdowns */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/50 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <div className="font-bold text-white text-sm">
                  {isAr ? 'كيف يضمن التطبيق العمل لـ 10 سنوات بدون أي بطء؟' : 'How does this ensure 10+ years of zero lag?'}
                </div>
                <p>
                  {isAr
                    ? '1. تم استبدال سعة 5MB القديمة بقاعدة IndexedDB غير المحدودة (مئات الميجابايت)، مع تزامن فوري في نظام ملفات الآيفون والأندرويد.'
                    : '1. The 5MB legacy limit is replaced with native IndexedDB (Gigabyte-scale capacity) plus native iOS/Android sandboxed filesystem storage.'}
                </p>
                <p>
                  {isAr
                    ? '2. تدوير السنوات المالية: يمكنك أرشفة السنوات المنتهية إلى الأرشيف البارد، حيث يتم ترحيل صافي حركاتها كأرصدة افتتاحية دقيقة في محافظك، لتبقى واجهة اليوم خفيفة وسلسة مهما كبرت العمليات.'
                    : '2. Fiscal Year Roll-forward: Archive older years to cold storage while preserving exact wallet opening balances, keeping the active UI as snappy as day one.'}
                </p>
              </div>
            </div>

            {/* Section: Eligible Years for Archiving */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-400" />
                  {isAr ? 'أرشفة وتدوير السنوات المالية السابقة' : 'Fiscal Year Archiving & Roll-Forward'}
                </h3>
                <span className="text-xs text-slate-400">
                  {isAr ? 'يحافظ على سرعة الإدخال والتصفح' : 'Maximizes device responsiveness'}
                </span>
              </div>

              {eligibleYears.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center text-xs text-slate-400">
                  {isAr
                    ? 'لا توجد سنوات سابقة مكتملة تتطلب الأرشفة حالياً. جميع العمليات مسجلة ضمن السنة المالية الجارية.'
                    : 'No past completed fiscal years to archive. All transactions belong to the current active year.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {eligibleYears.map(year => {
                    const count = appState.transactions.filter(
                      t => !t.isDeleted && new Date(t.date).getFullYear() === year
                    ).length;

                    return (
                      <div
                        key={year}
                        className="p-3.5 sm:p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{isAr ? `السنة المالية ${year}` : `Fiscal Year ${year}`}</span>
                            <span className="px-2 py-0.5 text-[11px] rounded bg-slate-700 text-slate-300 font-mono">
                              {count.toLocaleString()} {isAr ? 'عملية' : 'ops'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {isAr
                              ? 'سيتم ترحيل أرصدتها بدقة إلى الرصيد الافتتاحي لمحافظك ونقل العمليات إلى الأرشيف البارد.'
                              : 'Will roll balances into wallet opening balance and move records to cold storage.'}
                          </p>
                        </div>

                        <button
                          id={`archive-year-${year}-btn`}
                          onClick={() => handleArchiveYear(year)}
                          disabled={archivingYear === year}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
                        >
                          <Archive className="w-4 h-4" />
                          <span>
                            {archivingYear === year
                              ? (isAr ? 'جارِ الأرشفة...' : 'Archiving...')
                              : (isAr ? `أرشفة وتدوير سنة ${year}` : `Archive ${year}`)}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section: Historical Archives Explorer */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  {isAr ? 'سجل الأرشيف التاريخي للسنوات السابقة' : 'Historical Fiscal Archives'}
                </h3>
                <span className="text-xs text-slate-400">
                  {isAr
                    ? `${(appState.archivedYears || []).length} سنوات مؤرشفة`
                    : `${(appState.archivedYears || []).length} archived years`}
                </span>
              </div>

              {(!appState.archivedYears || appState.archivedYears.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center text-xs text-slate-400">
                  {isAr
                    ? 'الأرشيف البارد فارغ حالياً. عند أرشفة أي سنة منتهية ستظهر هنا لتصفحها والبحث فيها وتصديرها عند الحاجة.'
                    : 'Cold storage archive is empty. Archived years will appear here for search and exploration.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {appState.archivedYears.map(summary => {
                    const isExpanded = expandedYear === summary.year;

                    return (
                      <div
                        key={summary.year}
                        className="rounded-xl bg-slate-800/60 border border-slate-700/60 overflow-hidden"
                      >
                        {/* Summary Header */}
                        <div
                          className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
                          onClick={() => handleToggleExpandYear(summary.year)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                              {summary.year}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{isAr ? `أرشيف سنة ${summary.year}` : `Year ${summary.year} Archive`}</span>
                                <span className="text-xs text-slate-400 font-normal">
                                  ({summary.transactionCount.toLocaleString()} {isAr ? 'عملية' : 'ops'})
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <TrendingUp className="w-3 h-3" />
                                  {summary.totalIncome.toLocaleString()} {currencySymbol}
                                </span>
                                <span className="flex items-center gap-1 text-rose-400">
                                  <TrendingDown className="w-3 h-3" />
                                  {summary.totalExpense.toLocaleString()} {currencySymbol}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              id={`restore-year-${summary.year}-btn`}
                              onClick={e => {
                                e.stopPropagation();
                                handleUnarchiveYear(summary.year);
                              }}
                              disabled={unarchivingYear === summary.year}
                              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                              title={isAr ? 'استعادة السنة إلى السجل النشط' : 'Restore to active ledger'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isAr ? 'استعادة للسجل النشط' : 'Restore'}</span>
                            </button>

                            <div className="p-1.5 text-slate-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Search & Records Viewer */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-700/60 bg-slate-900/60 space-y-3">
                            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-700/60 rounded-xl px-3 py-2">
                              <Search className="w-4 h-4 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={archiveSearchQuery}
                                onChange={e => handleSearchArchive(e.target.value)}
                                placeholder={isAr ? 'ابحث في ملاحظات أو مبالغ عمليات هذا الأرشيف...' : 'Search archived notes or amounts...'}
                                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                              />
                              {archiveSearchQuery && (
                                <button
                                  onClick={() => handleSearchArchive('')}
                                  className="text-slate-400 hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {isLoadingArchiveTxs ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                {isAr ? 'جارِ قراءة العمليات من الأرشيف البارد...' : 'Reading from cold storage...'}
                              </div>
                            ) : viewedArchivedTxs.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                {isAr ? 'لا توجد نتائج مطابقة لبحثك في هذا الأرشيف.' : 'No matching records in this archive.'}
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {viewedArchivedTxs.slice(0, 100).map(tx => (
                                  <div
                                    key={tx.id}
                                    className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                                        {tx.note || (isAr ? 'بدون وصف' : 'No description')}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-mono">
                                        {tx.date}
                                      </div>
                                    </div>
                                    <div className="font-mono font-bold text-slate-100">
                                      <span
                                        className={
                                          tx.type === 'income'
                                            ? 'text-emerald-400'
                                            : tx.type === 'expense'
                                            ? 'text-rose-400'
                                            : 'text-cyan-400'
                                        }
                                      >
                                        {tx.type === 'expense' ? '-' : '+'}
                                        {tx.amount.toLocaleString()} {tx.currency || currencySymbol}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {viewedArchivedTxs.length > 100 && (
                                  <div className="text-center text-[11px] text-slate-500 pt-1 font-mono">
                                    {isAr
                                      ? `يتم عرض أول 100 عملية من أصل ${viewedArchivedTxs.length.toLocaleString()}`
                                      : `Showing first 100 of ${viewedArchivedTxs.length.toLocaleString()} items`}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'بياناتك مشفرة ومحفوظة بنسبة 100% محلياً على جهازك' : '100% locally encrypted on your device'}</span>
            </div>
            <button
              id="close-storage-modal-footer-btn"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
export default StorageEngineModal;
