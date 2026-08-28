import React, { useMemo } from 'react';
import { Award, Shield, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Transaction, Budget, Debt } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';

interface ExecutiveInsightsProps {
  transactions: Transaction[];
  budgets: Budget[];
  debts: Debt[];
  totalBalance?: number;
  currencySymbol: string;
  currencyCode?: string;
  exchangeRates?: Record<string, number>;
}

const ExecutiveInsights: React.FC<ExecutiveInsightsProps> = ({ 
  transactions = [], 
  budgets = [], 
  debts = [], 
  totalBalance = 0, 
  currencySymbol = 'ر.س',
  currencyCode = 'SAR',
  exchangeRates = DEFAULT_EXCHANGE_RATES
}) => {
  const calculations = useMemo(() => {
    const safeTotalBalance = typeof totalBalance === 'number' && !isNaN(totalBalance) ? totalBalance : 0;
    const safeTransactions = (transactions || []).filter(t => !t.isDeleted && !t.isFinancing);
    const safeDebts = debts || [];

    // 30 days of transactions for active burn rate calculation
    const currentDate = new Date();
    const last30Days = safeTransactions.filter(t => {
      const transDate = new Date(t.date);
      const diffTime = Math.abs(currentDate.getTime() - transDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    });

    let totalIncome = 0;
    let totalExpense = 0;

    safeTransactions.forEach(t => {
      const conv = convertCurrency(Number(t.amount) || 0, t.currency || currencyCode, currencyCode, exchangeRates);
      if (t.type === 'income') {
        totalIncome = safeAdd(totalIncome, conv);
      } else if (t.type === 'expense' || t.type === 'transfer_to_goal') {
        totalExpense = safeAdd(totalExpense, conv);
      }
    });
    
    // Monthly burn rate (default to general average if no 30 days transactions exist)
    let burnRate30Days = 0;
    last30Days.forEach(t => {
      if (t.type === 'expense' || t.type === 'transfer_to_goal') {
        const conv = convertCurrency(Number(t.amount) || 0, t.currency || currencyCode, currencyCode, exchangeRates);
        burnRate30Days = safeAdd(burnRate30Days, conv);
      }
    });

    let burnRate = burnRate30Days;
    if (burnRate === 0) {
      burnRate = totalExpense > 0 ? (totalExpense / Math.max(1, Math.ceil(safeTransactions.length / 5))) : 0;
    }

    // Runway (شهور الأمان المالي)
    const runwayMonths = burnRate > 0 ? safeDiv(safeTotalBalance, burnRate) : Infinity;

    // Active Debts
    let activeDebts = 0;
    safeDebts.filter(d => !d.isPaid && d.type === 'on_me').forEach(d => {
      const remaining = Math.max(0, safeSub(Number(d.originalAmount || d.amount) || 0, Number(d.paidAmount) || 0));
      const conv = convertCurrency(remaining, d.currency || currencyCode, currencyCode, exchangeRates);
      activeDebts = safeAdd(activeDebts, conv);
    });

    // Savings rate
    const savingsRatio = totalIncome > 0 ? safeMul(safeDiv(safeSub(totalIncome, totalExpense), totalIncome), 100) : 0;

    return {
      burnRate: roundToCurrency(burnRate),
      runwayMonths,
      activeDebts: roundToCurrency(activeDebts),
      savingsRatio,
      totalIncome: roundToCurrency(totalIncome),
      totalExpense: roundToCurrency(totalExpense)
    };
  }, [transactions, debts, totalBalance, currencyCode, exchangeRates]);

  // Generate elegant Executive Briefing in Natural Language
  const briefing = useMemo(() => {
    const { runwayMonths, burnRate, activeDebts } = calculations;

    let title = "مستقر ومتنامٍ";
    let message = "";
    let actionItem = "";
    let statusColor = "text-[#D9B978]";

    if (runwayMonths === Infinity || runwayMonths > 12) {
      title = "سيولة فائقة المستوى وتدفق آمن";
      message = `الهيكل المالي الخاص بمشاريعك ومحافظك متين للغاية. الملاءة النقدية الحالية تغطي المصاريف التشغيلية ومعدل الصرف لـ ${runwayMonths === Infinity ? 'فترة غير محدودة' : Math.round(runwayMonths) + ' شهراً'} مقبلاً بأمان مالي كامل دون الحاجة لأي تمويل إضافي.`;
      actionItem = "ننصح بإنشاء قناة استثمارية دورية لتحويل جزء من الكاش الخامل في أصول تدر عوائد أو ملاذات آمنة لتعزيز رصيد النمو المالي.";
      statusColor = "text-[#D9B978]";
    } else if (runwayMonths >= 6 && runwayMonths <= 12) {
      title = "أمان نقد متوازن ومتحفظ";
      message = `رصيد الأمان والملاءة لديك كافٍ لتأمين نمط حياتك الحالي لمدة ${Math.round(runwayMonths)} أشهر. تدفقاتك الواردة جيدة، ومعدل الصرف يقع تحت السيطرة الفعالة والمنضبطة.`;
      actionItem = "بإمكانك التوسع ببطء في الاستثمارات قصيرة الأجل لرفع مؤشرات النمو مع ضمان وجود الوديعة التشغيلية ثابتة.";
      statusColor = "text-[#8EB9A7]";
    } else if (runwayMonths >= 3 && runwayMonths < 6) {
      title = "حركة سيولة معتدلة تتطلب اليقظة";
      message = `رصيد الأمان الحالي يكفي لـ ${Math.round(runwayMonths)} أشهر فقط من التشغيل المتواصل بمعدل الإنفاق الجاري البالغ ${Math.round(burnRate).toLocaleString()} ${currencySymbol} شهرياً. هناك بعض البنود والتزامات الديون المستحقة البالغة ${activeDebts.toLocaleString()} ${currencySymbol}.`;
      actionItem = "نقترح إعطاء الأولوية لتسوية الالتزامات قصيرة الأجل (الديون) لرفع هامش الملاءة، وإيقاف الاشتراكات والمدفوعات المتكررة الخاملة مؤقتاً.";
      statusColor = "text-[#759BC8]";
    } else {
      title = "معدل تشغيل نقد حرج";
      message = `يتضح من المؤشرات أن معدل الصرف المالي الشهري يقترب بشكل مباشر من حجم النقد السائل (يكفي لأقل من ${Math.ceil(Math.max(1, runwayMonths))} أشهر). الديون النشطة والالتزامات تضغط على هيكل الاحتياطي الإجمالي.`;
      actionItem = "ننصح فورياً بجدولة الديون، وإعادة هيكلة بنود الميزانية بشكل يحمي السيولة النقدية المطلقة، وتجميد الصرف غير المدر للدخل.";
      statusColor = "text-[#C98387]";
    }

    return { title, message, actionItem, statusColor };
  }, [calculations, currencySymbol]);

  return (
    <div className="relative group p-[1px] rounded-2xl md:rounded-[2rem] bg-white/[0.06] overflow-hidden">
      <div className="bg-[#171D24]/90 backdrop-blur-3xl p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-white/5 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#D9B978]/10 flex items-center justify-center text-[#D9B978] shrink-0">
              <Award size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">التقرير التحليلي وخط العمل المالي</p>
              <h3 className={`text-sm sm:text-base font-semibold ${briefing.statusColor} leading-snug`}>{briefing.title}</h3>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col justify-between sm:justify-start w-full sm:w-auto items-center sm:items-start border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">فترة الأمان المالي</span>
            <span className="text-lg sm:text-xl font-semibold text-[#F4F1EA] font-numeric">
              {calculations.runwayMonths === Infinity ? 'أمان دائم' : `~ ${Math.round(calculations.runwayMonths)} شهر`}
            </span>
          </div>
        </div>

        {/* Narrative Section described like visual letters */}
        <div className="space-y-4 text-xs leading-relaxed text-slate-300 border-t border-b border-white/5 py-4">
          <p className="text-justify font-normal text-slate-200">{briefing.message}</p>
          <div className="bg-[#D9B978]/10 p-3.5 rounded-xl border border-[#D9B978]/15 flex gap-2.5">
            <Shield size={16} className="text-[#D9B978] shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-[#D9B978] font-normal leading-relaxed">{briefing.actionItem}</p>
          </div>
        </div>

        {/* Summary Mini KPIs - Grid of 3 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#11161C] p-2.5 sm:p-3.5 rounded-xl border border-white/5 text-center flex flex-col justify-center min-h-[64px]">
            <span className="text-[9px] sm:text-xs text-slate-400 font-medium block mb-1">معدل الصرف</span>
            <span className="text-[11px] sm:text-xs font-semibold text-[#F4F1EA] truncate font-numeric">
              {Math.round(calculations.burnRate).toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-500 select-none">{currencySymbol}/شهرياً</span>
          </div>
          <div className="bg-[#11161C] p-2.5 sm:p-3.5 rounded-xl border border-white/5 text-center flex flex-col justify-center min-h-[64px]">
            <span className="text-[9px] sm:text-xs text-slate-400 font-medium block mb-1">نسبة الاحتفاظ</span>
            <span className="text-[11px] sm:text-xs font-semibold text-[#8EB9A7] truncate font-numeric">
              {calculations.savingsRatio > 0 ? `+${Math.round(calculations.savingsRatio)}%` : `${Math.round(calculations.savingsRatio)}%`}
            </span>
            <span className="text-[9px] text-slate-500 select-none">معدل الوفرة</span>
          </div>
          <div className="bg-[#11161C] p-2.5 sm:p-3.5 rounded-xl border border-white/5 text-center flex flex-col justify-center min-h-[64px]">
            <span className="text-[9px] sm:text-xs text-slate-400 font-medium block mb-1">الالتزامات المستحقة</span>
            <span className="text-[11px] sm:text-xs font-semibold text-[#C98387] truncate font-numeric">
              {calculations.activeDebts.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-500 select-none">{currencySymbol} مستحقة</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveInsights;
