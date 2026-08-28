import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, Activity, CheckCircle2, AlertTriangle, 
  Wrench, RefreshCw, Scale, AlertCircle 
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
    title: 'فحص تكامل البيانات والتدقيق المحاسبي',
    subtitle: 'تحقق فوري من سلامة الأرصدة، العمليات، والمعادلات المحاسبية',
    healthyStatus: 'النظام المحاسبي وقواعد البيانات في حالة ممتازة وسليمة 100%',
    warningsStatus: 'تم رصد بعض الملاحظات البسيطة القابلة للمعالجة',
    errorsStatus: 'يوجد عدم تطابق هيكلي يتطلب إصلاحاً تلقائياً',
    recheckBtn: 'إعادة الفحص',
    totalTransactions: 'إجمالي العمليات',
    activeSub: 'نشطة',
    trashCount: 'سلة المحذوفات',
    trashSub: 'مؤمنة بالحذف المرحلي',
    walletsCount: 'المحافظ المسجلة',
    walletsSub: 'محافظ نشطة',
    recurringCount: 'القواعد المجدولة',
    recurringSub: 'دورية',
    reconciliationSuite: 'مطابقة الأرصدة مع سجل العمليات (Balance & History Reconciliation)',
    reconciliationPassed: 'مطابقة تامة 100%',
    reconciliationFailed: 'تم رصد تباين',
    invariantsSuite: 'اختبارات الثبات المحاسبي (Accounting Invariants Suite)',
    suitePassed: 'ناجحة بالكامل (8/8)',
    suiteFailed: 'فشلت بعض الاختبارات',
    issuesHeader: 'الملاحظات المرصودة',
    autoFixable: 'قابل للإصلاح التلقائي',
    repairReportHeader: 'تقرير المعالجة التلقائية:',
    repairDefaultSuccess: 'تمت إعادة مزامنة أرصدة المحافظ وتأكيد التكامل الهيكلي بنجاح.',
    lastAudit: 'آخر فحص:',
    repairBtn: 'إصلاح ومزامنة الأرصدة تلقائياً',
    fixingBtn: 'جاري الإصلاح...',
  },
  en: {
    title: 'System Diagnostics & Accounting Audit',
    subtitle: 'Real-time verification of wallet balances, ledger entries & accounting formulas',
    healthyStatus: 'Accounting system and databases are healthy and 100% consistent',
    warningsStatus: 'Minor recoverable discrepancies or warnings detected',
    errorsStatus: 'Structural ledger mismatch found requiring automated repair',
    recheckBtn: 'Re-run Audit',
    totalTransactions: 'Total Transactions',
    activeSub: 'Active',
    trashCount: 'Recycle Bin',
    trashSub: 'Protected with soft-delete',
    walletsCount: 'Registered Wallets',
    walletsSub: 'Active accounts',
    recurringCount: 'Scheduled Rules',
    recurringSub: 'Recurring',
    reconciliationSuite: 'Balance & Transaction History Reconciliation',
    reconciliationPassed: '100% Consistent',
    reconciliationFailed: 'Discrepancy Detected',
    invariantsSuite: 'Accounting Invariants Test Suite',
    suitePassed: 'All Passed (8/8)',
    suiteFailed: 'Tests Failed',
    issuesHeader: 'Detected Observations',
    autoFixable: 'Auto-repairable',
    repairReportHeader: 'Auto-repair Report:',
    repairDefaultSuccess: 'Wallet balances were successfully resynced and structural integrity verified.',
    lastAudit: 'Last Audit:',
    repairBtn: 'Auto-Repair & Sync Balances',
    fixingBtn: 'Repairing...',
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

  const isRTL = language === 'ar';
  const t = STRINGS[language] || STRINGS.ar;

  const runAudit = () => {
    const res = runFullSystemDiagnostics(state);
    setReport(res);
  };

  useEffect(() => {
    if (isOpen) {
      runAudit();
      setRepairSummary(null);
    }
  }, [isOpen, state]);

  if (!isOpen || !report) return null;

  const handleAutoRepair = () => {
    setIsFixing(true);
    setTimeout(() => {
      const { repairedState, summary } = autoRepairState(state);
      onApplyRepairedState(repairedState);
      setRepairSummary(summary.length > 0 ? summary : [t.repairDefaultSuccess]);
      setIsFixing(false);
      runAudit();
    }, 400);
  };

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D10]/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#11161C] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#F4F1EA] text-start"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0A0D10]/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              report.status === 'HEALTHY'
                ? 'bg-[#8EB9A7]/10 text-[#8EB9A7] border-[#8EB9A7]/20'
                : report.status === 'WARNINGS'
                ? 'bg-[#D9B978]/10 text-[#D9B978] border-[#D9B978]/20'
                : 'bg-[#C98387]/10 text-[#C98387] border-[#C98387]/20'
            }`}>
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F4F1EA]">{t.title}</h2>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-[#F4F1EA] rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`px-5 py-3 border-b flex items-center justify-between gap-2 ${
          report.status === 'HEALTHY'
            ? 'bg-[#8EB9A7]/10 border-[#8EB9A7]/20 text-[#8EB9A7]'
            : report.status === 'WARNINGS'
            ? 'bg-[#D9B978]/10 border-[#D9B978]/20 text-[#D9B978]'
            : 'bg-[#C98387]/10 border-[#C98387]/20 text-[#C98387]'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold truncate">
            {report.status === 'HEALTHY' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
            <span className="truncate">
              {report.status === 'HEALTHY'
                ? t.healthyStatus
                : report.status === 'WARNINGS'
                ? t.warningsStatus
                : t.errorsStatus}
            </span>
          </div>
          <button
            onClick={runAudit}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-1 border border-white/10 shrink-0"
          >
            <RefreshCw size={12} />
            <span>{t.recheckBtn}</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-slate-400">{t.totalTransactions}</div>
              <div className="text-base font-bold text-[#F4F1EA] font-mono">{report.totalTransactions}</div>
              <div className="text-[10px] text-slate-500">{t.activeSub}: {report.activeTransactions}</div>
            </div>
            <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-slate-400">{t.trashCount}</div>
              <div className="text-base font-bold text-[#C98387] font-mono">{report.trashCount}</div>
              <div className="text-[10px] text-slate-500">{t.trashSub}</div>
            </div>
            <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-slate-400">{t.walletsCount}</div>
              <div className="text-base font-bold text-[#D9B978] font-mono">{report.walletsCount}</div>
              <div className="text-[10px] text-slate-500">{t.walletsSub}</div>
            </div>
            <div className="bg-[#0A0D10]/50 border border-white/5 p-3 rounded-2xl text-center">
              <div className="text-[11px] text-slate-400">{t.recurringCount}</div>
              <div className="text-base font-bold text-[#759BC8] font-mono">{report.recurringRulesCount}</div>
              <div className="text-[10px] text-slate-500">{t.recurringSub}</div>
            </div>
          </div>

          {/* Engine Accounting Invariants Verification */}
          <div className="bg-[#0A0D10]/40 border border-white/5 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Scale size={16} className="text-[#D9B978]" />
                <span>{t.invariantsSuite}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                report.engineAuditPassed ? 'bg-[#8EB9A7]/15 text-[#8EB9A7] border border-[#8EB9A7]/30' : 'bg-[#C98387]/15 text-[#C98387] border border-[#C98387]/30'
              }`}>
                {report.engineAuditPassed ? t.suitePassed : t.suiteFailed}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {report.engineAuditResults.map((testItem, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#171D24] border border-white/5">
                  <span className="text-slate-300 font-medium">{testItem.testName}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-slate-400">{testItem.actual}</span>
                    {testItem.passed ? (
                      <CheckCircle2 size={13} className="text-[#8EB9A7] shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-[#C98387] shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance vs Transaction History Reconciliation Block */}
          {report.balanceReconciliation && (
            <div className="bg-[#0A0D10]/40 border border-white/5 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <CheckCircle2 size={16} className={report.balanceReconciliation.isConsistent ? 'text-[#8EB9A7]' : 'text-[#C98387]'} />
                  <span>{t.reconciliationSuite}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  report.balanceReconciliation.isConsistent ? 'bg-[#8EB9A7]/15 text-[#8EB9A7] border border-[#8EB9A7]/30' : 'bg-[#C98387]/15 text-[#C98387] border border-[#C98387]/30'
                }`}>
                  {report.balanceReconciliation.isConsistent ? t.reconciliationPassed : t.reconciliationFailed}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {report.balanceReconciliation.walletReports.map((wReport) => (
                  <div key={wReport.walletId} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-[#171D24] border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium">{wReport.walletName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({wReport.currencyCode})</span>
                      {wReport.crossCurrencyTransactionsCount > 0 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-[#D9B978]">
                          {wReport.crossCurrencyTransactionsCount} {language === 'ar' ? 'عمليات متعددة العملات' : 'cross-currency txs'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-300">
                        {wReport.calculatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {wReport.currencyCode}
                      </span>
                      {wReport.isConsistent ? (
                        <CheckCircle2 size={13} className="text-[#8EB9A7] shrink-0" />
                      ) : (
                        <span className="text-[#C98387] text-[10px] font-bold">
                          Δ {wReport.discrepancy}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues List */}
          {report.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.issuesHeader}</div>
              <div className="space-y-2">
                {report.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1 ${
                      issue.type === 'error'
                        ? 'bg-[#C98387]/10 border-[#C98387]/30 text-[#C98387]'
                        : 'bg-[#D9B978]/10 border-[#D9B978]/30 text-[#D9B978]'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{issue.title}</span>
                      {issue.canAutoFix && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A0D10] border border-current font-normal">
                          {t.autoFixable}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{issue.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repair Result Message */}
          {repairSummary && (
            <div className="p-3 bg-[#8EB9A7]/10 border border-[#8EB9A7]/30 rounded-2xl text-xs text-[#8EB9A7] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                <span>{t.repairReportHeader}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#8EB9A7]/90">
                {repairSummary.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#0A0D10]/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {t.lastAudit} {new Date(report.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoRepair}
              disabled={isFixing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Wrench size={14} />
              <span>{isFixing ? t.fixingBtn : t.repairBtn}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
