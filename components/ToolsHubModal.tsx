import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Repeat, Trash2, Scale, 
  ArrowLeft, ArrowRight, Sparkles, Coins, PieChart, Calendar, TrendingUp, PiggyBank
} from 'lucide-react';

interface ToolsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringRulesCount: number;
  trashCount: number;
  onOpenReports?: () => void;
  onOpenForecast?: () => void;
  onOpenRecurring: () => void;
  onOpenTrash: () => void;
  onOpenZakat?: () => void;
  onOpenBudgets?: () => void;
  onOpenGoals?: () => void;
  onOpenSubscriptions?: () => void;
  language?: 'ar' | 'en';
}

const STRINGS = {
  ar: {
    title: 'مركز الأدوات والخيارات المهمة',
    subtitle: 'وصول فوري وواضح لجميع أدوات التخطيط والميزانية والالتزامات',
    close: 'إغلاق',
    activeBadge: 'نشطة',
    opsBadge: 'عملية',
    tools: {
      forecast: {
        title: 'التخطيط والسيولة المستقبلية',
        desc: 'توقعات التدفقات النقدية والالتزامات القادمة واستقرار الرصيد'
      },
      recurring: {
        title: 'العمليات الدورية والمجدولة',
        desc: 'أتمتة المصاريف والرواتب والإيجارات المتكررة تلقائياً'
      },
      budgets: {
        title: 'الميزانيات والإنفاق الذكي',
        desc: 'تحديد سقوف المصاريف لكل تصنيف وتنبيهات ترشيد الاستهلاك'
      },
      goals: {
        title: 'الأهداف المالية والمدخرات',
        desc: 'تتبع خطط التوفير وصناديق الطوارئ ونسب الإنجاز'
      },
      zakat: {
        title: 'حاسبة الزكاة الشرعية',
        desc: 'حساب نصاب الزكاة بدقة للأرصدة النقدية والذهب والديون'
      },
      subscriptions: {
        title: 'الاشتراكات والفواتير الدورية',
        desc: 'متابعة مواعيد التجديد وتكلفة الاشتراكات الشهرية والسنوية'
      },
      trash: {
        title: 'سلة المحذوفات والاسترجاع',
        desc: 'استرجاع العمليات المحذوفة بأمان وتفادي الحذف العرضي'
      }
    }
  },
  en: {
    title: 'Important Tools & Features Hub',
    subtitle: 'Instant access to planning, budgets, savings & automation tools',
    close: 'Close',
    activeBadge: 'active',
    opsBadge: 'records',
    tools: {
      forecast: {
        title: 'Cashflow & Future Planning',
        desc: 'Track upcoming commitments, liquidity runway & balance stability'
      },
      recurring: {
        title: 'Recurring & Scheduled Rules',
        desc: 'Automate repetitive expenses, salaries & recurring bills'
      },
      budgets: {
        title: 'Budgets & Smart Limits',
        desc: 'Set expense ceilings per category with smart spending tracking'
      },
      goals: {
        title: 'Financial Goals & Savings',
        desc: 'Track target funds, emergency reserves, and milestones'
      },
      zakat: {
        title: 'Smart Zakat Calculator',
        desc: 'Calculate Zakat accurately across wallets, currencies & debts'
      },
      subscriptions: {
        title: 'Subscriptions & Recurring Bills',
        desc: 'Monitor recurring service renewal dates and monthly commitments'
      },
      trash: {
        title: 'Recycle Bin & Data Recovery',
        desc: 'Safely restore deleted records & prevent accidental data loss'
      }
    }
  }
};

export const ToolsHubModal: React.FC<ToolsHubModalProps> = ({
  isOpen,
  onClose,
  recurringRulesCount,
  trashCount,
  onOpenForecast,
  onOpenRecurring,
  onOpenTrash,
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
        className="fixed inset-0 z-[99999] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain no-print"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-[#0F141C] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.75)] text-start overflow-hidden flex flex-col my-auto max-h-[90vh] sm:max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shadow-sm">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">{t.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
              title={t.close}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tools Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-2.5 overscroll-contain">
            {/* Tool 1: Cashflow & Financial Planning */}
            {onOpenForecast && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenForecast(); }}
                className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-[#D9B978]/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center shrink-0 border border-[#D9B978]/30 group-hover:scale-105 transition-transform">
                    <TrendingUp size={22} strokeWidth={2.2} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-black text-white group-hover:text-[#D9B978] transition-colors">
                      {t.tools.forecast.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {t.tools.forecast.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={18} className="text-slate-400 group-hover:text-[#D9B978] transition-all shrink-0" />
              </button>
            )}

            {/* Tool 2: Budgets Manager */}
            {onOpenBudgets && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenBudgets(); }}
                className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-[#759BC8]/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#759BC8]/15 text-[#759BC8] flex items-center justify-center shrink-0 border border-[#759BC8]/30 group-hover:scale-105 transition-transform">
                    <PieChart size={22} strokeWidth={2.2} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-black text-white group-hover:text-[#759BC8] transition-colors">
                      {t.tools.budgets.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {t.tools.budgets.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={18} className="text-slate-400 group-hover:text-[#759BC8] transition-all shrink-0" />
              </button>
            )}

            {/* Tool 3: Goals & Savings */}
            {onOpenGoals && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenGoals(); }}
                className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-[#D9B978]/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center shrink-0 border border-[#D9B978]/30 group-hover:scale-105 transition-transform">
                    <PiggyBank size={22} strokeWidth={2.2} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-black text-white group-hover:text-[#D9B978] transition-colors">
                      {t.tools.goals.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {t.tools.goals.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={18} className="text-slate-400 group-hover:text-[#D9B978] transition-all shrink-0" />
              </button>
            )}

            {/* Tool 4: Recurring Rules */}
            <button
              type="button"
              onClick={() => { onClose(); onOpenRecurring(); }}
              className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-[#8EB9A7]/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#8EB9A7]/15 text-[#8EB9A7] flex items-center justify-center shrink-0 border border-[#8EB9A7]/30 group-hover:scale-105 transition-transform">
                  <Repeat size={22} strokeWidth={2.2} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white group-hover:text-[#8EB9A7] transition-colors">
                      {t.tools.recurring.title}
                    </h4>
                    {recurringRulesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#8EB9A7]/20 text-[#8EB9A7] border border-[#8EB9A7]/30">
                        {recurringRulesCount} {t.activeBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {t.tools.recurring.desc}
                  </p>
                </div>
              </div>
              <ArrowIcon size={18} className="text-slate-400 group-hover:text-[#8EB9A7] transition-all shrink-0" />
            </button>

            {/* Tool 5: Zakat Calculator */}
            {onOpenZakat && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenZakat(); }}
                className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-emerald-400/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                    <Scale size={22} strokeWidth={2.2} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                      {t.tools.zakat.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {t.tools.zakat.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={18} className="text-slate-400 group-hover:text-emerald-400 transition-all shrink-0" />
              </button>
            )}

            {/* Tool 6: Subscriptions */}
            {onOpenSubscriptions && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenSubscriptions(); }}
                className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-[#8EB9A7]/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#8EB9A7]/15 text-[#8EB9A7] flex items-center justify-center shrink-0 border border-[#8EB9A7]/30 group-hover:scale-105 transition-transform">
                    <Calendar size={22} strokeWidth={2.2} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-black text-white group-hover:text-[#8EB9A7] transition-colors">
                      {t.tools.subscriptions.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {t.tools.subscriptions.desc}
                    </p>
                  </div>
                </div>
                <ArrowIcon size={18} className="text-slate-400 group-hover:text-[#8EB9A7] transition-all shrink-0" />
              </button>
            )}

            {/* Tool 7: Trash Bin */}
            <button
              type="button"
              onClick={() => { onClose(); onOpenTrash(); }}
              className="w-full group p-4 rounded-2xl bg-[#151C25] hover:bg-[#1B2430] border border-white/10 hover:border-[#C98387]/50 transition-all text-start flex items-center justify-between gap-4 active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#C98387]/15 text-[#C98387] flex items-center justify-center shrink-0 border border-[#C98387]/30 group-hover:scale-105 transition-transform">
                  <Trash2 size={22} strokeWidth={2.2} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white group-hover:text-[#C98387] transition-colors">
                      {t.tools.trash.title}
                    </h4>
                    {trashCount > 0 && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#C98387]/20 text-[#C98387] border border-[#C98387]/30">
                        {trashCount} {t.opsBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {t.tools.trash.desc}
                  </p>
                </div>
              </div>
              <ArrowIcon size={18} className="text-slate-400 group-hover:text-[#C98387] transition-all shrink-0" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default ToolsHubModal;
