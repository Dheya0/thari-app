import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, AlertTriangle, 
  Wrench, RefreshCw, Scale, AlertCircle,
  ShieldCheck, ChevronDown, ChevronUp, ArrowRightLeft,
  Wallet, Layers, Sparkles, Database, Check
} from 'lucide-react';
import { AppState } from '../types';
import { runFullSystemDiagnostics, autoRepairState, DiagnosticsReport } from '../services/diagnosticsService';

interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onApplyRepairedState: (repairedState: AppState) => void;
  language?: 'ar' | 'en';
}

const STRINGS = {
  ar: {
    title: 'فحص وتدقيق الحسابات والبيانات',
    subtitle: 'فحص شامل وفوري للدفاتر المحاسبية ومطابقة الأرصدة وسجلات المعاملات',
    healthyVerdict: 'دفاترك وحساباتك المالية متزنة وسليمة 100%',
    warningVerdict: 'تم رصد ملاحظات محاسبية تتطلب المزامنة',
    errorVerdict: 'يوجد تباين في الأرصدة يحتاج لإعادة وزن الدفاتر',
    certifiedBadge: 'معتمدة ومطابقة محاسبياً',
    issuesBadge: 'ملاحظات مسجلة',
    recheckBtn: 'إعادة الفحص',
    statTxs: 'العمليات المفحوصة',
    statTxsSub: 'حركة مدققة بدقة',
    statWallets: 'المحافظ والحسابات',
    statWalletsSub: 'أرصدة بنكية ونقدية',
    statDebts: 'سجلات الديون',
    statDebtsSub: 'التزامات وسدادات',
    statSecurity: 'سلامة البيانات',
    statSecuritySub: 'بيانات سليمة ومحفوظة',
    statSecurityGood: '100% سليم',
    statSecurityIssues: 'تحتاج معالجة',
    pillarsHeader: 'محاور التدقيق والفحص المحاسبي:',
    discrepanciesHeader: 'الفروقات المرصودة في الأرصدة:',
    discrepancyDiff: 'فارق:',
    recordedBal: 'الرصيد المسجل:',
    calculatedBal: 'الرصيد المحسوب من العمليات:',
    repairFixNotice: 'عند النقر على إصلاح ومزامنة، يتم تحديث الرصيد ليتطابق مع الحركات الدفترية فوراً ودون تعديل أي عملية.',
    repairReportHeader: 'تمت المعالجة والمزامنة بنجاح!',
    repairDefaultSuccess: 'تمت مزامنة أرصدة المحافظ وإعادة وزن الدفاتر المحاسبية بنجاح.',
    lastAudit: 'آخر فحص:',
    repairBtn: 'إصلاح ومزامنة الأرصدة تلقائياً',
    repairingBtn: 'جاري المزامنة والإصلاح...',
    techDetailsToggle: 'عرض تفاصيل الاختبارات المحاسبية المتقدمة',
    techDetailsHide: 'إخفاء التفاصيل المتقدمة',
    invariantsSuite: 'نتائج معادلات المحرك المحاسبي المزدوج (Debit = Credit)',
    detailedIssuesHeader: 'سجل الملاحظات الفنية:',
    closeBtn: 'إغلاق',
  },
  en: {
    title: 'Financial Audit & System Diagnostics',
    subtitle: 'Comprehensive immediate audit verifying ledger consistency and wallet balances',
    healthyVerdict: 'Your financial books are 100% balanced & healthy',
    warningVerdict: 'Accounting observations detected requiring attention',
    errorVerdict: 'Balance discrepancies found requiring ledger resync',
    certifiedBadge: 'Accounting Certified',
    issuesBadge: 'observations detected',
    recheckBtn: 'Re-run Audit',
    statTxs: 'Audited Transactions',
    statTxsSub: 'verified records',
    statWallets: 'Wallets & Accounts',
    statWalletsSub: 'bank & cash accounts',
    statDebts: 'Debt Ledgers',
    statDebtsSub: 'dues & settlements',
    statSecurity: 'Data Integrity',
    statSecuritySub: 'stored & secure',
    statSecurityGood: '100% Intact',
    statSecurityIssues: 'Needs Attention',
    pillarsHeader: 'Audit Pillars Checked:',
    discrepanciesHeader: 'Detected Balance Discrepancies:',
    discrepancyDiff: 'Difference:',
    recordedBal: 'Recorded Balance:',
    calculatedBal: 'Calculated from Ledger:',
    repairFixNotice: 'Clicking Auto-Repair reconciles recorded balances to match your transaction history without altering any transaction details.',
    repairReportHeader: 'Auto-Repair & Sync Completed Successfully!',
    repairDefaultSuccess: 'Wallet balances were successfully resynced and ledger integrity verified.',
    lastAudit: 'Last Audit:',
    repairBtn: 'Auto-Repair & Sync Balances',
    repairingBtn: 'Syncing & Repairing...',
    techDetailsToggle: 'Show Advanced Technical Audit Details',
    techDetailsHide: 'Hide Advanced Details',
    invariantsSuite: 'Double-Entry Accounting Engine Invariants (Debit = Credit)',
    detailedIssuesHeader: 'Detailed Technical Log:',
    closeBtn: 'Close',
  }
};

export const SystemDiagnosticsModal: React.FC<SystemDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  state,
  onApplyRepairedState,
  language = 'ar',
}) => {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [repairSummary, setRepairSummary] = useState<string[] | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  const isRTL = language === 'ar';
  const t = STRINGS[language] || STRINGS.ar;

  // Practical, authentic audit execution without fake simulation delays
  const runAudit = useCallback((currentState: AppState) => {
    setIsRefreshing(true);
    try {
      const res = runFullSystemDiagnostics(currentState);
      setReport(res);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRepairSummary(null);
      runAudit(state);
    }
  }, [isOpen, state, runAudit]);

  const handleAutoRepair = () => {
    setIsFixing(true);
    try {
      const { repairedState, summary } = autoRepairState(state, {
        language: isRTL ? 'ar' : 'en',
      });
      onApplyRepairedState(repairedState);
      setRepairSummary(summary.length > 0 ? summary : [t.repairDefaultSuccess]);
      // Immediately run fresh diagnostics on repaired state
      const freshReport = runFullSystemDiagnostics(repairedState);
      setReport(freshReport);
    } finally {
      setIsFixing(false);
    }
  };

  if (!isOpen) return null;

  const getVerdictTitle = () => {
    if (!report) return '';
    if (report.status === 'HEALTHY') return t.healthyVerdict;
    if (report.status === 'WARNINGS') return t.warningVerdict;
    return t.errorVerdict;
  };

  const content = (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-[#0A0D10]/85 backdrop-blur-md overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="bg-[#11161C] border border-white/10 rounded-3xl w-full max-w-2xl my-auto max-h-[88dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-[#F4F1EA] text-start"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0A0D10]/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border shrink-0 ${
              !report || report.status === 'HEALTHY'
                ? 'bg-[#8EB9A7]/10 text-[#8EB9A7] border-[#8EB9A7]/25'
                : report.status === 'WARNINGS'
                ? 'bg-[#D9B978]/10 text-[#D9B978] border-[#D9B978]/25'
                : 'bg-[#C98387]/10 text-[#C98387] border-[#C98387]/25'
            }`}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#F4F1EA] leading-snug">{t.title}</h2>
              <p className="text-xs text-slate-400 leading-normal">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => runAudit(state)}
              disabled={isRefreshing || isFixing}
              title={t.recheckBtn}
              className="p-2 text-slate-400 hover:text-[#D9B978] rounded-xl hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-[#D9B978]' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-[#F4F1EA] rounded-xl hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {report && (
            <div className="space-y-4">
              {/* Main Human-Friendly Verdict Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                report.status === 'HEALTHY'
                  ? 'bg-gradient-to-br from-[#8EB9A7]/15 to-[#8EB9A7]/5 border-[#8EB9A7]/30'
                  : report.status === 'WARNINGS'
                  ? 'bg-gradient-to-br from-[#D9B978]/15 to-[#D9B978]/5 border-[#D9B978]/30'
                  : 'bg-gradient-to-br from-[#C98387]/15 to-[#C98387]/5 border-[#C98387]/30'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    report.status === 'HEALTHY'
                      ? 'bg-[#8EB9A7]/20 text-[#8EB9A7]'
                      : report.status === 'WARNINGS'
                      ? 'bg-[#D9B978]/20 text-[#D9B978]'
                      : 'bg-[#C98387]/20 text-[#C98387]'
                  }`}>
                    {report.status === 'HEALTHY' ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className={`text-sm sm:text-base font-bold ${
                        report.status === 'HEALTHY'
                          ? 'text-[#8EB9A7]'
                          : report.status === 'WARNINGS'
                          ? 'text-[#D9B978]'
                          : 'text-[#C98387]'
                      }`}>
                        {getVerdictTitle()}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        report.status === 'HEALTHY'
                          ? 'bg-[#8EB9A7]/10 text-[#8EB9A7] border-[#8EB9A7]/30'
                          : report.status === 'WARNINGS'
                          ? 'bg-[#D9B978]/10 text-[#D9B978] border-[#D9B978]/30'
                          : 'bg-[#C98387]/10 text-[#C98387] border-[#C98387]/30'
                      }`}>
                        {report.status === 'HEALTHY' 
                          ? t.certifiedBadge 
                          : `${report.issues.length} ${t.issuesBadge}`}
                      </span>
                    </div>

                    {/* Clear, understandable executive summary in active language */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isRTL ? report.executiveSummaryAr : report.executiveSummaryEn}
                    </p>

                    {/* Direct Auto Repair Button if actionable issues exist */}
                    {report.status !== 'HEALTHY' && report.issues.some(i => i.canAutoFix) && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleAutoRepair}
                          disabled={isFixing}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <Wrench size={13} />
                          <span>{isFixing ? t.repairingBtn : t.repairBtn}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stat Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">{t.statTxs}</span>
                    <Layers size={13} className="text-slate-500" />
                  </div>
                  <div className="text-base font-bold text-[#F4F1EA] font-mono">{report.totalTransactions}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{report.activeTransactions} {t.statTxsSub}</div>
                </div>

                <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">{t.statWallets}</span>
                    <Wallet size={13} className="text-slate-500" />
                  </div>
                  <div className="text-base font-bold text-[#D9B978] font-mono">{report.walletsCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.statWalletsSub}</div>
                </div>

                <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">{t.statDebts}</span>
                    <ArrowRightLeft size={13} className="text-slate-500" />
                  </div>
                  <div className="text-base font-bold text-[#8EB9A7] font-mono">{report.debtsCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.statDebtsSub}</div>
                </div>

                <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">{t.statSecurity}</span>
                    <Database size={13} className="text-slate-500" />
                  </div>
                  <div className={`text-xs font-bold mt-1 ${report.status === 'HEALTHY' ? 'text-[#8EB9A7]' : 'text-[#D9B978]'}`}>
                    {report.status === 'HEALTHY' ? t.statSecurityGood : t.statSecurityIssues}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.statSecuritySub}</div>
                </div>
              </div>

              {/* Discrepant Wallets Box (If Any Detected) */}
              {report.discrepantWallets && report.discrepantWallets.length > 0 && (
                <div className="bg-[#C98387]/10 border border-[#C98387]/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#C98387]">
                    <AlertTriangle size={15} />
                    <span>{t.discrepanciesHeader}</span>
                  </div>

                  <div className="space-y-2">
                    {report.discrepantWallets.map(dw => (
                      <div key={dw.walletId} className="bg-[#171D24] p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-200">{dw.walletName} ({dw.currencyCode})</span>
                          <span className="text-[#C98387] font-mono">
                            {t.discrepancyDiff} {dw.discrepancy > 0 ? `+${dw.discrepancy.toLocaleString()}` : dw.discrepancy.toLocaleString()} {dw.currencyCode}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                          <div>{t.recordedBal} <span className="font-mono text-slate-300">{dw.recordedBalance.toLocaleString()} {dw.currencyCode}</span></div>
                          <div>{t.calculatedBal} <span className="font-mono text-[#8EB9A7]">{dw.calculatedBalance.toLocaleString()} {dw.currencyCode}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    💡 {t.repairFixNotice}
                  </p>
                </div>
              )}

              {/* Audit Pillars - What did we check? */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#D9B978]" />
                  <span>{t.pillarsHeader}</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {report.pillars.map((pillar) => (
                    <div
                      key={pillar.id}
                      className="bg-[#0A0D10]/40 border border-white/5 hover:border-white/10 rounded-2xl p-3.5 transition-colors flex items-start gap-3"
                    >
                      <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                        pillar.status === 'pass'
                          ? 'bg-[#8EB9A7]/15 text-[#8EB9A7]'
                          : 'bg-[#D9B978]/15 text-[#D9B978]'
                      }`}>
                        {pillar.status === 'pass' ? <Check size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#F4F1EA]">
                            {isRTL ? pillar.titleAr : pillar.titleEn}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            pillar.status === 'pass'
                              ? 'bg-[#8EB9A7]/10 text-[#8EB9A7] border-[#8EB9A7]/20'
                              : 'bg-[#D9B978]/10 text-[#D9B978] border-[#D9B978]/20'
                          }`}>
                            {isRTL ? pillar.badgeAr : pillar.badgeEn}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {isRTL ? pillar.descriptionAr : pillar.descriptionEn}
                        </p>
                        {isRTL && pillar.detailsAr && (
                          <p className="text-[10px] text-slate-500">
                            {pillar.detailsAr}
                          </p>
                        )}
                        {!isRTL && pillar.detailsEn && (
                          <p className="text-[10px] text-slate-500">
                            {pillar.detailsEn}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repair Summary Notice (If user clicked auto repair) */}
              {repairSummary && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-[#8EB9A7]/10 border border-[#8EB9A7]/30 rounded-2xl text-xs text-[#8EB9A7] space-y-2"
                >
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 size={16} />
                    <span>{t.repairReportHeader}</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[#8EB9A7]/95 pr-1">
                    {repairSummary.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#8EB9A7] font-bold mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Collapsible Advanced Technical Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-[#D9B978]" />
                    <span>{showTechDetails ? t.techDetailsHide : t.techDetailsToggle}</span>
                  </div>
                  {showTechDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showTechDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-3 bg-[#0A0D10]/60 p-4 rounded-2xl border border-white/5 text-xs"
                  >
                    <div className="font-bold text-slate-300">{t.invariantsSuite}</div>
                    <div className="space-y-1.5">
                      {report.engineAuditResults.map((testItem, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#171D24] border border-white/5">
                          <span className="text-slate-300 font-medium text-[11px]">{testItem.testName}</span>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-slate-400">{String(testItem.actual)}</span>
                            {testItem.passed ? (
                              <CheckCircle2 size={13} className="text-[#8EB9A7] shrink-0" />
                            ) : (
                              <AlertCircle size={13} className="text-[#C98387] shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Detailed Technical Issues Listing (Bilingual) */}
                    {report.issues.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <div className="font-bold text-slate-400 text-[11px]">{t.detailedIssuesHeader}</div>
                        {report.issues.map(iss => (
                          <div key={iss.id} className="p-2 rounded-lg bg-white/5 text-[11px] space-y-0.5">
                            <div className="font-bold text-[#D9B978]">{isRTL ? iss.titleAr : iss.titleEn}</div>
                            <div className="text-slate-400">{isRTL ? iss.descriptionAr : iss.descriptionEn}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0A0D10]/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 truncate">
            {report && (
              <span>
                {t.lastAudit} {new Date(report.timestamp).toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report && report.issues.some(i => i.canAutoFix) && (
              <button
                type="button"
                onClick={handleAutoRepair}
                disabled={isFixing || isRefreshing}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Wrench size={13} />
                <span>{isFixing ? t.repairingBtn : t.repairBtn}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-[#F4F1EA] transition-colors"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default SystemDiagnosticsModal;
