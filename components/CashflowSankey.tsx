import React, { useMemo, useState } from 'react';
import { TrendingUp, ArrowRight, Wallet, TrendingDown, ArrowDownLeft, Shield, Sparkles } from 'lucide-react';
import { Transaction, Category } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';

interface CashflowSankeyProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  currencyCode?: string;
  exchangeRates?: Record<string, number>;
}

const CashflowSankey: React.FC<CashflowSankeyProps> = ({ 
  transactions, 
  categories, 
  currencySymbol,
  currencyCode = 'SAR',
  exchangeRates = DEFAULT_EXCHANGE_RATES
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const stats = useMemo(() => {
    // Filter active operating transactions
    const activeTxs = (transactions || []).filter(t => !t.isDeleted && !t.isFinancing);

    // 1. Calculate Income and Expense sources
    const incomeSourceMap: Record<string, { name: string; amount: number; percentage: number }> = {};
    const expenseSourceMap: Record<string, { name: string; amount: number; percentage: number }> = {};
    
    let totalIncome = 0;
    let totalExpense = 0;

    activeTxs.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : (t.type === 'income' ? 'دخل عام' : 'مصروف عام');
      const convertedAmt = convertCurrency(Number(t.amount) || 0, t.currency || currencyCode, currencyCode, exchangeRates);
      
      if (t.type === 'income') {
        totalIncome = safeAdd(totalIncome, convertedAmt);
        if (!incomeSourceMap[catName]) {
          incomeSourceMap[catName] = { name: catName, amount: 0, percentage: 0 };
        }
        incomeSourceMap[catName].amount = safeAdd(incomeSourceMap[catName].amount, convertedAmt);
      } else if (t.type === 'expense' || t.type === 'transfer_to_goal') {
        totalExpense = safeAdd(totalExpense, convertedAmt);
        if (!expenseSourceMap[catName]) {
          expenseSourceMap[catName] = { name: catName, amount: 0, percentage: 0 };
        }
        expenseSourceMap[catName].amount = safeAdd(expenseSourceMap[catName].amount, convertedAmt);
      }
    });

    const incomeSources = Object.values(incomeSourceMap).map(item => ({
      ...item,
      amount: roundToCurrency(item.amount),
      percentage: totalIncome > 0 ? (item.amount / totalIncome) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    const expenseSources = Object.values(expenseSourceMap).map(item => ({
      ...item,
      amount: roundToCurrency(item.amount),
      percentage: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    const netWorthGrowth = Math.max(0, safeSub(totalIncome, totalExpense));
    const savingsRatio = totalIncome > 0 ? safeMul(safeDiv(netWorthGrowth, totalIncome), 100) : 0;

    return {
      totalIncome: roundToCurrency(totalIncome),
      totalExpense: roundToCurrency(totalExpense),
      incomeSources,
      expenseSources,
      netWorthGrowth: roundToCurrency(netWorthGrowth),
      savingsRatio
    };
  }, [transactions, categories, currencyCode, exchangeRates]);

  if (stats.totalIncome === 0) {
    return (
      <div className="bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 rounded-2xl md:rounded-[2.5rem] border border-white/5 text-center space-y-3 py-10">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <ArrowDownLeft size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black text-white">مخطط تدفق السيولة التنفيذي</h4>
          <p className="text-xs text-slate-400 font-bold mt-1">يرجى تسجيل عمليات الدخل والمصاريف لمشاهدة التوزيع التفاعلي للسيولة.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-3xl p-5 sm:p-6 rounded-2xl md:rounded-[2.5rem] border border-white/5 space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-500 shrink-0" />
            هندسة التدفقات النقدية (Sankey Velocity)
          </h4>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold">بوابة رصد التدفقات الواردة، وقنوات الحفظ، ونقاط التصريف</p>
        </div>
        <div className="bg-[#171D24] px-2.5 py-1 rounded-xl border border-white/5 text-[10px] font-medium text-[#D9B978] shrink-0">
          تحليل مباشر
        </div>
      </div>

      {/* Responsive Layout: Desktoop horizontal view (md:grid), Mobile vertical flow (md:hidden) */}
      
      {/* Horizontal Desktop Sankey Grid */}
      <div className="hidden md:grid grid-cols-12 gap-1 relative min-h-[300px]">
        
        {/* Step 1: Sources of Income (Left Col / Column 1) */}
        <div className="col-span-4 flex flex-col justify-center space-y-4 pr-1">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right mb-1">المصادر الواردة</div>
          
          {stats.incomeSources.slice(0, 4).map((source, idx) => (
            <div 
              key={idx}
              onMouseEnter={() => setActiveNode(`inc-${idx}`)}
              onMouseLeave={() => setActiveNode(null)}
              className={`p-3 rounded-2xl border transition-all text-right cursor-pointer relative group ${activeNode === `inc-${idx}` ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg' : 'bg-slate-900 border-white/5 hover:border-white/10'}`}
            >
              <div className="flex items-center justify-between gap-1.5 flex-row-reverse">
                <span className="text-[10px] font-black text-slate-300 truncate w-24 block">{source.name}</span>
                <span className="text-[10px] font-bold text-emerald-500">+{Math.round(source.percentage)}%</span>
              </div>
              <div className="text-xs font-black text-white mt-1">
                {source.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-500 font-bold">{currencySymbol}</span>
              </div>
              
              {/* Pulse light */}
              <span className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-60"></span>
            </div>
          ))}

          {stats.incomeSources.length > 4 && (
            <p className="text-[9px] text-slate-500 text-right font-bold">+{stats.incomeSources.length - 4} مصادر دخل أخرى</p>
          )}
        </div>

        {/* Step 2: Intermediate Flows & Links (Column 2) */}
        <div className="col-span-4 flex flex-col justify-center items-center relative py-6">
          
          {/* SVG Connector Lines mimicking Sankey ribbons */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0">
            {/* Center flowing to growth or to expenses */}
            <path 
              d="M 10,120 Q 50,80 100,50" 
              fill="none" 
              stroke={activeNode && activeNode.startsWith('inc') ? 'url(#active-grad-emerald)' : '#10b981'} 
              strokeWidth={activeNode && activeNode.startsWith('inc') ? '3' : '1.5'} 
              className="transition-all duration-300"
            />
            <path 
              d="M 10,120 Q 50,150 100,200" 
              fill="none" 
              stroke={activeNode && activeNode.startsWith('exp') ? 'url(#active-grad-rose)' : '#f43f5e'} 
              strokeWidth={activeNode && activeNode.startsWith('exp') ? '3' : '1.5'} 
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="active-grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="active-grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Channel Hub Node */}
          <div className="z-10 bg-slate-900 border border-slate-700 p-5 rounded-[2.5rem] text-center max-w-[120px] shadow-2xl relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
              <Wallet size={18} />
            </div>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">إجمالي الدخل</p>
            <p className="text-sm font-black text-white mt-1">
              {stats.totalIncome.toLocaleString()}
            </p>
            <span className="text-[10px] text-amber-500 font-bold">{currencySymbol}</span>
          </div>

          {/* Savings Ratio Indicator */}
          <div className="mt-4 z-10 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-400">الوفرة: {Math.round(stats.savingsRatio)}%</span>
          </div>
        </div>

        {/* Step 3: Channels / Uses (Right Col / Column 3) */}
        <div className="col-span-4 flex flex-col justify-center space-y-4 pl-1">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left mb-1">تحديد المصير والإنفاق</div>
          
          {/* Net growth - Saved asset */}
          <div 
            onMouseEnter={() => setActiveNode('growth')}
            onMouseLeave={() => setActiveNode(null)}
            className={`p-3 rounded-2xl border transition-all text-left cursor-pointer relative group ${activeNode === 'growth' ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg' : 'bg-slate-900 border-white/5'}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-indigo-400">نمو الأصول والوفرة</span>
              <Shield size={12} className="text-indigo-400" />
            </div>
            <p className="text-xs font-black text-white mt-1">
              {stats.netWorthGrowth.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-500 font-bold">{currencySymbol}</span>
            </p>
            <div className="w-full bg-indigo-950 h-1 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-indigo-400" 
                style={{ width: `${stats.savingsRatio}%` }}
              ></div>
            </div>
          </div>

          {/* Expense categories */}
          {stats.expenseSources.slice(0, 3).map((expense, idx) => (
            <div 
              key={idx}
              onMouseEnter={() => setActiveNode(`exp-${idx}`)}
              onMouseLeave={() => setActiveNode(null)}
              className={`p-3 rounded-2xl border transition-all text-left cursor-pointer relative group ${activeNode === `exp-${idx}` ? 'bg-rose-500/10 border-rose-500/40 shadow-lg' : 'bg-slate-900 border-white/5 hover:border-white/10'}`}
            >
              <div className="flex items-center justify-between gap-1 text-right">
                <span className="text-[10px] font-black text-slate-300 truncate w-24 block">{expense.name}</span>
                <span className="text-[10px] font-bold text-rose-500">-{Math.round(expense.percentage)}%</span>
              </div>
              <div className="text-xs font-black text-white mt-1">
                {expense.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-500 font-bold">{currencySymbol}</span>
              </div>

              {/* Pulse light */}
              <span className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 opacity-60"></span>
            </div>
          ))}

          {stats.expenseSources.length > 3 && (
            <p className="text-[9px] text-slate-500 text-left font-bold">+{stats.expenseSources.length - 3} تصنيفات مصاريف متبقية</p>
          )}
        </div>

      </div>

      {/* Vertical Mobile Flow: Stacks beautifully on small screens */}
      <div className="md:hidden space-y-5">
        {/* Mobile Part 1: Sources */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-right">أبرز المصادر الواردة</div>
          <div className="grid grid-cols-2 gap-2">
            {stats.incomeSources.slice(0, 4).map((source, idx) => (
              <div key={idx} className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-right">
                <div className="flex justify-between items-center text-[10px] text-slate-400 gap-1 flex-row-reverse">
                  <span className="truncate font-black">{source.name}</span>
                  <span className="text-emerald-500 font-extrabold shrink-0">+{Math.round(source.percentage)}%</span>
                </div>
                <div className="text-xs font-black text-white mt-1">
                  {source.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-500">{currencySymbol}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Connecting Node */}
        <div className="flex flex-col items-center justify-center -my-3 relative">
          <div className="w-0.5 h-4 bg-gradient-to-b from-emerald-500 to-amber-500 opacity-30"></div>
          <div className="bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl text-center shadow-lg min-w-[150px]">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase">إجمالي الدخل الجاري</p>
            <p className="text-sm font-black text-white mt-0.5">
              {stats.totalIncome.toLocaleString()} <span className="text-xs text-amber-500 font-bold">{currencySymbol}</span>
            </p>
          </div>
          <div className="w-0.5 h-4 bg-gradient-to-b from-amber-500 to-rose-500 opacity-30"></div>
        </div>

        {/* Mobile Part 3: Uses & Destiny */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-right">توزيع التدفقات والادخار</div>
          
          {/* Net Worth growth */}
          <div className="bg-slate-900 border border-indigo-500/20 p-3 rounded-xl text-right">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-extrabold text-indigo-400">نمو الأصول والوفرة الجارية</span>
              <span className="text-[10px] font-black text-indigo-300">الوفرة: {Math.round(stats.savingsRatio)}%</span>
            </div>
            <p className="text-xs font-black text-white mt-1">
              {stats.netWorthGrowth.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-500 font-bold">{currencySymbol}</span>
            </p>
            <div className="w-full bg-indigo-950 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${stats.savingsRatio}%` }}></div>
            </div>
          </div>

          {/* Expense categories */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {stats.expenseSources.slice(0, 4).map((expense, idx) => (
              <div key={idx} className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-right">
                <div className="flex justify-between items-center text-[10px] text-slate-400 gap-1 flex-row-reverse">
                  <span className="truncate font-black">{expense.name}</span>
                  <span className="text-rose-400 font-extrabold shrink-0">-{Math.round(expense.percentage)}%</span>
                </div>
                <div className="text-xs font-black text-white mt-1">
                  {expense.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[9px] text-slate-500">{currencySymbol}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advisory Insight Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
          <Sparkles size={14} />
        </div>
        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-bold text-justify">
          {stats.savingsRatio > 35 
            ? `صافي الوفرة الناتجة عن الحركة المحفظية تبلغ ${Math.round(stats.savingsRatio)}%، وهو مستوى ممتاز يستدعي توجيه الأموال فوراً نحو فئات الاستثمار والذهب للتصدي لتحديات تآكل القيمة المباشرة وتضخيم الثروة بشكل أسرع.`
            : `تبلغ نسبة التدفق الحر المحتفظ به ${Math.round(stats.savingsRatio)}%، نقترح مراجعة البنود الدورية الملتزمة، والحرص على حسم الاشتراكات غير المستغلة لتعزيز رصيد الأمان وبناء المحفظة الاستثمارية الاستكشافية المتقنة.`
          }
        </p>
      </div>

    </div>
  );
};

export default CashflowSankey;
