import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, FileText, Repeat, Trash2, Scale, Briefcase, 
  ArrowLeft, ArrowRight, Sparkles, Coins, LayoutDashboard, Calendar
} from 'lucide-react';

interface ToolsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringRulesCount: number;
  trashCount: number;
  onOpenReports: () => void;
  onOpenRecurring: () => void;
  onOpenTrash: () => void;
  onOpenDiagnostics: () => void;
  onOpenZakat?: () => void;
  onOpenBudgets?: () => void;
  onOpenGoals?: () => void;
  onOpenSubscriptions?: () => void;
  language?: 'ar' | 'en';
}

const STRINGS = {
  ar: {
    title: 'مركز الأدوات والميزات',
    subtitle: 'إدارة متقدمة للتقارير والعمليات والتدقيق المحاسبي',
    close: 'إغلاق',
    activeBadge: 'نشطة',
    opsBadge: 'عملية',
    tools: {
      reports: {
        title: 'التقارير المالية والطباعة',
        desc: 'تصدير تقارير محاسبية شاملة بصيغة PDF و Excel و CSV'
      },
      recurring: {
        title: 'العمليات الدورية والمجدولة',
        desc: 'أتمتة المصاريف والرواتب والاشتراكات المتكررة تلقائياً'
      },
      zakat: {
        title: 'محفظة وحاسبة الزكاة الشرعية',
        desc: 'حساب زكاة المال وعروض التجارة والذهب وتتبع سجل الإخراج'
      },
      budgets: {
        title: 'الميزانيات والإنفاق الذكي',
        desc: 'تحديد سقوف المصاريف لكل تصنيف وتنبيهات ترشيد الاستهلاك'
      },
      goals: {
        title: 'الأهداف المالية والمدخرات',
        desc: 'تتبع خطط التوفير وصناديق الطوارئ ونسب الإنجاز'
      },
      subscriptions: {
        title: 'الاشتراكات والفواتير الدورية',
        desc: 'متابعة مواعيد التجديد وتكلفة الاشتراكات الشهرية والسنوية'
      },
      trash: {
        title: 'سلة المحذوفات والاسترجاع',
        desc: 'استرجاع العمليات المحذوفة بأمان وتفادي الحذف العرضي'
      },
      diagnostics: {
        title: 'فحص تكامل البيانات والتدقيق',
        desc: 'مطابقة ميزان المحافظ والتحقق من العمليات المعزولة والنزاهة'
      }
    }
  },
  en: {
    title: 'Tools & Features Hub',
    subtitle: 'Advanced management for reports, operations & financial audit',
    close: 'Close',
    activeBadge: 'active',
    opsBadge: 'records',
    tools: {
      reports: {
        title: 'Financial Reports & Export',
        desc: 'Comprehensive accounting exports in PDF, Excel & CSV formats'
      },
      recurring: {
        title: 'Recurring & Scheduled Rules',
        desc: 'Automate repetitive expenses, salaries & recurring bills'
      },
      zakat: {
        title: 'Zakat & Purification Calculator',
        desc: 'Calculate Zakat on liquid assets, gold, and commercial goods'
      },
      budgets: {
        title: 'Budgets & Smart Limits',
        desc: 'Set expense ceilings per category with smart spending tracking'
      },
      goals: {
        title: 'Financial Goals & Savings',
        desc: 'Track target funds, emergency reserves, and milestones'
      },
      subscriptions: {
        title: 'Subscriptions & Recurring Bills',
        desc: 'Monitor recurring service renewal dates and monthly commitments'
      },
      trash: {
        title: 'Recycle Bin & Data Recovery',
        desc: 'Safely restore deleted records & prevent accidental data loss'
      },
      diagnostics: {
        title: 'System Diagnostics & Audit',
        desc: 'Reconcile wallet balances, verify invariants & inspect ledger integrity'
      }
    }
  }
};

export const ToolsHubModal: React.FC<ToolsHubModalProps> = ({
  isOpen,
  onClose,
  recurringRulesCount,
  trashCount,
  onOpenReports,
  onOpenRecurring,
  onOpenTrash,
  onOpenDiagnostics,
  onOpenZakat,
  onOpenBudgets,
  onOpenGoals,
  onOpenSubscriptions,
  language = 'ar',
}) => {
  if (!isOpen) return null;

  const isRTL = language === 'ar';
  const t = STRINGS[language] || STRINGS.ar;
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const content = (
    <AnimatePresence>
      <div 
        dir={isRTL ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade no-print overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-[#0F141C] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] text-start overflow-hidden flex flex-col my-auto max-h-[88dvh] sm:max-h-[88vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D9B978]/10 border border-[#D9B978]/20 flex items-center justify-center text-[#D9B978]">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{t.title}</h3>
                <p className="text-xs text-slate-400">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
              title={t.close}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tools Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-3 overscroll-contain">
            {/* Tool 1: Financial Reports */}
            <button
              onClick={() => { onClose(); onOpenReports(); }}
              className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#D9B978]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center shrink-0 border border-[#D9B978]/20 group-hover:scale-105 transition-transform">
                  <FileText size={22} />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#D9B978] transition-colors">
                    {t.tools.reports.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {t.tools.reports.desc}
                  </p>
                </div>
              </div>
              <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
            </button>

            {/* Tool 2: Recurring Rules */}
            <button
              onClick={() => { onClose(); onOpenRecurring(); }}
              className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#8EB9A7]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#8EB9A7]/10 text-[#8EB9A7] flex items-center justify-center shrink-0 border border-[#8EB9A7]/20 group-hover:scale-105 transition-transform">
                  <Repeat size={22} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#8EB9A7] transition-colors">
                      {t.tools.recurring.title}
                    </h4>
                    {recurringRulesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8EB9A7]/20 text-[#8EB9A7] border border-[#8EB9A7]/30">
                        {recurringRulesCount} {t.activeBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {t.tools.recurring.desc}
                  </p>
                </div>
              </div>
              <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
            </button>

            {/* Tool: Zakat Calculator */}
            {onOpenZakat && (
              <button
                onClick={() => { onClose(); onOpenZakat(); }}
                className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#D9B978]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center shrink-0 border border-[#D9B978]/20 group-hover:scale-105 transition-transform">
                    <Scale size={22} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#D9B978] transition-colors">
                      {t.tools.zakat.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {t.tools.zakat.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Tool: Budgets Manager */}
            {onOpenBudgets && (
              <button
                onClick={() => { onClose(); onOpenBudgets(); }}
                className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#759BC8]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#759BC8]/10 text-[#759BC8] flex items-center justify-center shrink-0 border border-[#759BC8]/20 group-hover:scale-105 transition-transform">
                    <LayoutDashboard size={22} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#759BC8] transition-colors">
                      {t.tools.budgets.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {t.tools.budgets.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Tool: Goals & Savings */}
            {onOpenGoals && (
              <button
                onClick={() => { onClose(); onOpenGoals(); }}
                className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#D9B978]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center shrink-0 border border-[#D9B978]/20 group-hover:scale-105 transition-transform">
                    <Coins size={22} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#D9B978] transition-colors">
                      {t.tools.goals.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {t.tools.goals.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Tool: Subscriptions */}
            {onOpenSubscriptions && (
              <button
                onClick={() => { onClose(); onOpenSubscriptions(); }}
                className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#8EB9A7]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#8EB9A7]/10 text-[#8EB9A7] flex items-center justify-center shrink-0 border border-[#8EB9A7]/20 group-hover:scale-105 transition-transform">
                    <Calendar size={22} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#8EB9A7] transition-colors">
                      {t.tools.subscriptions.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {t.tools.subscriptions.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
              </button>
            )}

            {/* Tool: Trash Bin */}
            <button
              onClick={() => { onClose(); onOpenTrash(); }}
              className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#C98387]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#C98387]/10 text-[#C98387] flex items-center justify-center shrink-0 border border-[#C98387]/20 group-hover:scale-105 transition-transform">
                  <Trash2 size={22} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white group-hover:text-[#C98387] transition-colors">
                      {t.tools.trash.title}
                    </h4>
                    {trashCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C98387]/20 text-[#C98387] border border-[#C98387]/30">
                        {trashCount} {t.opsBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {t.tools.trash.desc}
                  </p>
                </div>
              </div>
              <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
            </button>

            {/* Tool: System Diagnostics & Accounting Audit */}
            <button
              onClick={() => { onClose(); onOpenDiagnostics(); }}
              className="w-full group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-[#759BC8]/30 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#759BC8]/10 text-[#759BC8] flex items-center justify-center shrink-0 border border-[#759BC8]/20 group-hover:scale-105 transition-transform">
                  <Scale size={22} />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#759BC8] transition-colors">
                    {t.tools.diagnostics.title}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {t.tools.diagnostics.desc}
                  </p>
                </div>
              </div>
              <ArrowIcon size={16} className="text-slate-500 group-hover:text-white transition-all shrink-0 group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default ToolsHubModal;
