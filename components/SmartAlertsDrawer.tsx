import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ShieldAlert, 
  TrendingDown, 
  Wallet as WalletIcon,
  PieChart,
  HandCoins,
  ChevronLeft
} from 'lucide-react';
import { Budget, Transaction, Debt, Wallet, Category, Currency } from '../types';
import { convertCurrency } from '../constants';

export interface SmartAlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'budget_breach' | 'budget_warning' | 'debt_overdue' | 'debt_due_today' | 'debt_due_soon' | 'wallet_low';
  title: string;
  message: string;
  actionType?: 'pay_debt' | 'adjust_budget' | 'view_wallet';
  targetId?: string;
  debt?: Debt;
  budgetId?: string;
  amount?: number;
  currencyCode?: string;
}

interface SmartAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Budget[];
  transactions: Transaction[];
  debts: Debt[];
  wallets: Wallet[];
  categories: Category[];
  currentCurrency: Currency;
  exchangeRates: Record<string, number>;
  dismissedAlertIds: string[];
  onDismissAlert: (alertId: string) => void;
  onOpenPayDebt?: (debt: Debt) => void;
  onOpenAdjustBudget?: (categoryId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export function computeSmartAlerts(
  budgets: Budget[],
  transactions: Transaction[],
  debts: Debt[],
  wallets: Wallet[],
  categories: Category[],
  currentCurrency: Currency,
  exchangeRates: Record<string, number>,
  dismissedIds: string[] = []
): SmartAlertItem[] {
  const list: SmartAlertItem[] = [];
  const dismissedSet = new Set(dismissedIds);

  // 1. Budget Alerts (70% visual is on progress bar, 85% and 100%+ trigger alerts here)
  budgets.forEach(b => {
    const categoryName = categories.find(c => c.id === b.categoryId)?.name || 'تصنيف';
    const spent = transactions
      .filter(t => t.categoryId === b.categoryId && t.type === 'expense' && !t.isDeleted)
      .reduce((sum, t) => sum + t.amount, 0);

    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const alertId100 = `b-breach-${b.categoryId}`;
    const alertId85 = `b-warn-${b.categoryId}`;

    if (percent >= 100 && !dismissedSet.has(alertId100)) {
      const overAmount = spent - b.amount;
      list.push({
        id: alertId100,
        type: 'critical',
        category: 'budget_breach',
        title: `تجاوز ميزانية ${categoryName}`,
        message: `تم استهلاك ${Math.round(percent)}% من السقف المحدد، بتجاوز قدره ${Math.round(overAmount).toLocaleString()} ${b.currencyCode || currentCurrency.code}.`,
        actionType: 'adjust_budget',
        targetId: b.categoryId,
        budgetId: b.categoryId,
        amount: overAmount,
        currencyCode: b.currencyCode || currentCurrency.code
      });
    } else if (percent >= 85 && percent < 100 && !dismissedSet.has(alertId85)) {
      list.push({
        id: alertId85,
        type: 'warning',
        category: 'budget_warning',
        title: `اقتراب نفاد ميزانية ${categoryName}`,
        message: `وصل الإنفاق إلى ${Math.round(percent)}% من السقف المعتمد. يرجى مراقبة المصروفات المتبقية.`,
        actionType: 'adjust_budget',
        targetId: b.categoryId,
        budgetId: b.categoryId
      });
    }
  });

  // 2. Debts Due Dates & Overdue Alerts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  debts.filter(d => !d.isPaid && d.dueDate).forEach(d => {
    const due = new Date(d.dueDate!);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isToMe = d.type === 'to_me';
    const debtId = `debt-${d.id}`;

    if (diffDays < 0) {
      const alertId = `${debtId}-overdue`;
      if (!dismissedSet.has(alertId)) {
        list.push({
          id: alertId,
          type: 'critical',
          category: 'debt_overdue',
          title: isToMe ? `تأخر سداد دين لك` : `دين متأخر عليك`,
          message: isToMe
            ? `تأخر "${d.personName}" في سداد المستحق بمقدار ${Math.abs(diffDays)} يوماً (${Math.round((d.amount || d.originalAmount || 0) - (d.paidAmount || 0)).toLocaleString()} ${d.currency}).`
            : `تجاوزت تاريخ استحقاق سداد دينك لـ "${d.personName}" بمقدار ${Math.abs(diffDays)} يوماً.`,
          actionType: isToMe ? undefined : 'pay_debt',
          debt: d,
          targetId: d.id
        });
      }
    } else if (diffDays === 0) {
      const alertId = `${debtId}-today`;
      if (!dismissedSet.has(alertId)) {
        list.push({
          id: alertId,
          type: 'warning',
          category: 'debt_due_today',
          title: isToMe ? `موعد استحقاق دين لك اليوم` : `موعد سداد دين عليك اليوم`,
          message: isToMe
            ? `اليوم موعد تحصيل دين "${d.personName}" بمبلغ ${Math.round((d.amount || d.originalAmount || 0) - (d.paidAmount || 0)).toLocaleString()} ${d.currency}.`
            : `اليوم موعد سداد دينك لـ "${d.personName}" بمبلغ ${Math.round((d.amount || d.originalAmount || 0) - (d.paidAmount || 0)).toLocaleString()} ${d.currency}.`,
          actionType: isToMe ? undefined : 'pay_debt',
          debt: d,
          targetId: d.id
        });
      }
    } else if (diffDays <= 3) {
      const alertId = `${debtId}-3days`;
      if (!dismissedSet.has(alertId)) {
        list.push({
          id: alertId,
          type: 'warning',
          category: 'debt_due_soon',
          title: isToMe ? `استحقاق دين لك خلال ${diffDays} أيام` : `استحقاق دين عليك خلال ${diffDays} أيام`,
          message: isToMe
            ? `موعد استحقاق دين "${d.personName}" خلال ${diffDays} أيام (${d.dueDate}).`
            : `موعد سداد دينك لـ "${d.personName}" خلال ${diffDays} أيام. تأكد من توفر الرصيد.`,
          actionType: isToMe ? undefined : 'pay_debt',
          debt: d,
          targetId: d.id
        });
      }
    } else if (diffDays <= 7) {
      const alertId = `${debtId}-7days`;
      if (!dismissedSet.has(alertId)) {
        list.push({
          id: alertId,
          type: 'info',
          category: 'debt_due_soon',
          title: `تذكير استحقاق قادم (خلال أسبوع)`,
          message: `دين "${d.personName}" مستحق بتاريخ ${d.dueDate} (${Math.round((d.amount || d.originalAmount || 0) - (d.paidAmount || 0)).toLocaleString()} ${d.currency}).`,
          actionType: isToMe ? undefined : 'pay_debt',
          debt: d,
          targetId: d.id
        });
      }
    }
  });

  // 3. Low Wallet Balance Alerts
  wallets.forEach(w => {
    const bal = w.currentBalance !== undefined ? w.currentBalance : (w.balance || 0);
    const alertId = `wallet-low-${w.id}`;
    if (bal <= 0 && !dismissedSet.has(alertId)) {
      list.push({
        id: alertId,
        type: 'critical',
        category: 'wallet_low',
        title: `نفاد رصيد محفظة ${w.name}`,
        message: `رصيد المحفظة حالياً (${Math.round(bal).toLocaleString()} ${w.currencyCode}). قد يؤدي ذلك لعجز عند سداد الالتزامات.`,
        actionType: 'view_wallet',
        targetId: w.id
      });
    }
  });

  return list;
}

export const SmartAlertsDrawer: React.FC<SmartAlertsDrawerProps> = ({
  isOpen,
  onClose,
  budgets,
  transactions,
  debts,
  wallets,
  categories,
  currentCurrency,
  exchangeRates,
  dismissedAlertIds,
  onDismissAlert,
  onOpenPayDebt,
  onOpenAdjustBudget,
  onNavigateToTab
}) => {
  const alerts = useMemo(() => {
    return computeSmartAlerts(
      budgets,
      transactions,
      debts,
      wallets,
      categories,
      currentCurrency,
      exchangeRates,
      dismissedAlertIds
    );
  }, [budgets, transactions, debts, wallets, categories, currentCurrency, exchangeRates, dismissedAlertIds]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#11161C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>مركز التنبيهات الذكية</span>
                {alerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold">
                    {alerts.length} تنبيه
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                متابعة استباقية لحدود الميزانيات، استحقاقات الديون، والسيولة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-sm font-black text-white">أمورك المالية في وضع آمن ومستقر!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                لا توجد أي تجاوزات في الميزانيات أو ديون متأخرة أو تنبيهات سيولة في الوقت الحالي.
              </p>
            </div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all ${
                  alert.type === 'critical'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : alert.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {alert.type === 'critical' ? (
                        <AlertTriangle size={18} className="text-rose-400" />
                      ) : (
                        <Clock size={18} className="text-amber-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white leading-tight">
                        {alert.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDismissAlert(alert.id)}
                    className="text-slate-400 hover:text-white p-1 shrink-0"
                    title="تجاهل التنبيه"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Direct Action Buttons */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onDismissAlert(alert.id)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 transition-colors"
                  >
                    تأكيد واطلاع
                  </button>

                  {alert.actionType === 'pay_debt' && alert.debt && onOpenPayDebt && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPayDebt(alert.debt!);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#D9B978] hover:bg-[#D9B978]/90 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <HandCoins size={12} />
                      <span>تسجيل تسديد الآن</span>
                    </button>
                  )}

                  {alert.actionType === 'adjust_budget' && onOpenAdjustBudget && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (alert.budgetId) onOpenAdjustBudget(alert.budgetId);
                        if (onNavigateToTab) onNavigateToTab('budgets');
                      }}
                      className="px-3 py-1 rounded-lg bg-[#D9B978] hover:bg-[#D9B978]/90 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <PieChart size={12} />
                      <span>تعديل الميزانية</span>
                    </button>
                  )}

                  {alert.actionType === 'view_wallet' && onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToTab('dashboard');
                      }}
                      className="px-3 py-1 rounded-lg bg-[#D9B978] hover:bg-[#D9B978]/90 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <WalletIcon size={12} />
                      <span>عرض المحفظة</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 text-center">
          <p className="text-[10px] text-slate-400">
            تطبيق ثـري المالي • التنبيهات تعمل آلياً وفق القواعد المحاسبية المحفوظة محلياً على جهازك
          </p>
        </div>
      </motion.div>
    </div>
  );
};
