import React, { useMemo } from 'react';
import { AlertTriangle, Clock, ChevronLeft, Bell, TrendingUp, ZapOff } from 'lucide-react';
import { Budget, Transaction, Debt, Subscription } from '../types';

interface SmartAlertsProps {
  budgets: Budget[];
  transactions: Transaction[];
  debts: Debt[];
  subscriptions: Subscription[];
  categories: any[];
}

export const FinancialAlerts: React.FC<SmartAlertsProps> = ({ budgets, transactions, debts, subscriptions, categories }) => {
  const alerts = useMemo(() => {
    const list: { id: string, type: 'warning' | 'critical' | 'info', message: string, icon: any }[] = [];

    // 1. Spending Spike Detection
    const thisWeekExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      const now = new Date();
      return t.type === 'expense' && (now.getTime() - d.getTime()) < (7 * 24 * 60 * 60 * 1000);
    }).reduce((s, t) => s + t.amount, 0);

    const prevWeekExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      return t.type === 'expense' && diff >= (7 * 24 * 60 * 60 * 1000) && diff < (14 * 24 * 60 * 60 * 1000);
    }).reduce((s, t) => s + t.amount, 0);

    if (prevWeekExpenses > 0 && thisWeekExpenses > prevWeekExpenses * 1.25) {
      const increase = Math.round(((thisWeekExpenses - prevWeekExpenses) / prevWeekExpenses) * 100);
      list.push({
        id: 'anomaly-spike',
        type: 'warning',
        message: `معدل الصرف هذا الأسبوع أعلى من المعتاد بنسبة ${increase}%`,
        icon: TrendingUp
      });
    }

    // 2. Budget Alerts
    budgets.forEach(b => {
      const categoryName = categories.find(c => c.id === b.categoryId)?.name || 'تصنيف';
      const spent = transactions
        .filter(t => t.categoryId === b.categoryId && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = (spent / b.amount) * 100;
      if (percent >= 100) {
        list.push({ id: `b-${b.categoryId}`, type: 'critical', message: `تجاوزت ميزانية ${categoryName}`, icon: AlertTriangle });
      }
    });

    // 3. Debt Due Dates & Overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    debts.filter(d => !d.isPaid && d.dueDate).forEach(d => {
      const due = new Date(d.dueDate!);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isToMe = d.type === 'to_me';
      
      if (diffDays < 0) {
        list.push({
          id: `debt-overdue-${d.id}`,
          type: 'critical',
          message: isToMe 
            ? `تأخر سداد دين "${d.personName}" بمقدار ${Math.abs(diffDays)} يوم` 
            : `تجاوز موعد سداد دينك لـ "${d.personName}" بمقدار ${Math.abs(diffDays)} يوم`,
          icon: AlertTriangle
        });
      } else if (diffDays === 0) {
        list.push({
          id: `debt-today-${d.id}`,
          type: 'warning',
          message: isToMe 
            ? `اليوم موعد استحقاق دين "${d.personName}"` 
            : `اليوم موعد سداد دينك لـ "${d.personName}"`,
          icon: Clock
        });
      } else if (diffDays <= 4) {
        list.push({
          id: `debt-soon-${d.id}`,
          type: 'info',
          message: isToMe 
            ? `موعد استحقاق دين "${d.personName}" خلال ${diffDays} أيام` 
            : `موعد سداد دين "${d.personName}" خلال ${diffDays} أيام`,
          icon: Clock
        });
      }
    });

    // 4. Subscription Verification
    subscriptions.forEach(s => {
      const d = new Date(s.nextBillingDate);
      if (d < today) {
        list.push({ id: `s-expired-${s.id}`, type: 'warning', message: `اشتراك "${s.name}" قد يحتاج للتجديد أو المراجعة`, icon: ZapOff });
      }
    });

    return list;
  }, [budgets, transactions, debts, subscriptions, categories]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Bell size={13} className="text-[#D9B978]" />
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">التنبيهات المالية</h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className={`min-w-[85%] sm:min-w-[280px] p-3.5 rounded-2xl border flex items-center gap-3 backdrop-blur-md ${
              alert.type === 'critical' ? 'bg-[#C98387]/10 border-[#C98387]/25' : 
              alert.type === 'warning' ? 'bg-[#D9B978]/10 border-[#D9B978]/25' : 
              'bg-[#759BC8]/10 border-[#759BC8]/25'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
               alert.type === 'critical' ? 'bg-[#C98387] text-slate-950 font-bold' : 
               alert.type === 'warning' ? 'bg-[#D9B978] text-slate-950 font-bold' : 
               'bg-[#759BC8] text-slate-950 font-bold'
            }`}>
              <alert.icon size={15} />
            </div>
            <p className={`text-xs font-medium flex-1 leading-snug ${
               alert.type === 'critical' ? 'text-[#C98387]' : 
               alert.type === 'warning' ? 'text-[#D9B978]' : 
               'text-[#759BC8]'
            }`}>
              {alert.message}
            </p>
            <ChevronLeft size={14} className="opacity-30 shrink-0 text-slate-400" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancialAlerts;
