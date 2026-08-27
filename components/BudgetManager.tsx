import React, { useState, useMemo } from 'react';
import { Target, TriangleAlert, Award, TrendingUp, Sparkles, AlertCircle, Coins, ShieldCheck, Play } from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { getLocalizedCurrency, getTranslation, LanguageKey } from '../utils/translations';
import { parseArabicNumber } from '../utils/formatters';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  onSetBudget: (catId: string, amount: number) => void;
  currencySymbol: string;
  currencyCode?: string;
  language?: LanguageKey;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({ 
  budgets, 
  categories, 
  transactions, 
  onSetBudget, 
  currencySymbol,
  currencyCode = 'SAR',
  language = 'ar'
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');

  const locCurr = useMemo(() => {
    return getLocalizedCurrency(currencyCode, undefined, currencySymbol, language);
  }, [currencyCode, currencySymbol, language]);
  const resolvedSymbol = locCurr.symbol;

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // 1. Calculate General Financial KPIs & Abundance Score (تنمية العوائد والادخار)
  const abundanceData = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate investments or savings allocation (e.g. transactions categorized as investment or savings)
    // For general tracking, we treat (Total Income - Total Expense) as general savings allocation
    const savings = Math.max(0, totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    
    // Abundance score out of 100
    // +40 points: savings rate (up to 30% savings rate yields max points)
    // +30 points: having active strategic investment allocations
    // +30 points: maintaining budget limits
    const savingsScore = Math.min(40, (savingsRate / 30) * 40);
    
    let activeBudgetsExceeded = 0;
    budgets.forEach(b => {
      const spent = transactions
        .filter(t => t.categoryId === b.categoryId && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      if (spent > b.amount) activeBudgetsExceeded++;
    });

    const adherenceScore = Math.max(0, 30 - (activeBudgetsExceeded * 10));
    const investmentScore = totalIncome > 0 ? 30 : 15; // default base points represent focus on development

    const finalAbundanceScore = Math.round(savingsScore + adherenceScore + investmentScore);
    
    // Burn Rate (معدل الحرق المالي)
    const burnRate = totalExpense;

    return {
      savings,
      savingsRate,
      abundanceScore: finalAbundanceScore,
      burnRate,
      activeBudgetsExceeded
    };
  }, [transactions, budgets]);

  const budgetStats = budgets.map(b => {
    const category = categories.find(c => c.id === b.categoryId);
    const spent = transactions
      .filter(t => t.categoryId === b.categoryId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const percentage = Math.min((spent / b.amount) * 100, 100);
    
    return { ...b, category, spent, percentage };
  });

  return (
    <div className="space-y-6 pb-24 animate-luxury-pop">
      
      {/* Abundance & Investment Reward Score Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-5 sm:p-7 rounded-2xl md:rounded-[2.5rem] shadow-2xl text-white group border border-indigo-500/20">
         <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/30 to-transparent pointer-events-none"></div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-200">
                <Award size={12} />
                أداء عقلية الوفرة والنماء وعكس التقشف
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">مؤشر نقاط الوفرة الفعالة</h3>
              <p className="text-xs text-indigo-200 max-w-lg font-bold leading-relaxed">
                ترتكز عقلية القيادة والنمو على توسيع قنوات الدخل وتوجيه التدفقات النقدية نحو الأصول المدرة للأرباح والاستثمارات وليس فقط الحد الصارم والتقشف.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-xl border border-white/5 px-6 py-6 rounded-2xl min-w-[140px] text-center self-center md:self-auto">
              <div className="relative flex items-center justify-center">
                <span className="text-4xl font-extrabold text-indigo-400">{abundanceData.abundanceScore}</span>
                <span className="text-[10px] text-slate-400 font-bold mr-1">/100</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">مستوى الكفاءة</p>
              <span className="text-[11px] text-indigo-200 mt-0.5 font-bold">
                {abundanceData.abundanceScore > 80 ? 'قائد وفرة ذكي' : abundanceData.abundanceScore > 50 ? 'متوازن ومستقر' : 'مكافح نامٍ'}
              </span>
            </div>
         </div>
      </div>

      {/* Burn Rate and Runway Tracker widgets */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/45 border border-white/5 p-4 sm:p-5 rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <TriangleAlert size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mb-1">معدل الحرق المالي</p>
              <p className="text-xs font-black text-white">إجمالي الصرف الجاري</p>
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-white leading-tight">
            {abundanceData.burnRate.toLocaleString()} <span className="text-xs text-slate-400 font-bold">{currencySymbol}</span>
          </div>
        </div>

        <div className="bg-slate-900/45 border border-white/5 p-4 sm:p-5 rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mb-1">معدل الوفرة والادخار</p>
              <p className="text-xs font-black text-white">المدخرات المحققة</p>
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 leading-tight">
            +{Math.round(abundanceData.savingsRate)}%
          </div>
        </div>
      </div>

      {/* Target Setting Form */}
      <div className="bg-slate-900 border border-white/5 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 mb-1 px-1">
          <Target size={18} className="text-indigo-400" />
          <h4 className="text-xs font-black text-white uppercase tracking-wider">ضبط حدود التشغيل الاحتياطية لتصنيف محدد</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select 
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/5 outline-none text-white font-bold text-xs"
          >
            <option value="" className="text-slate-900">انقر هنا لاختيار التصنيف الجاري</option>
            {expenseCategories.map(c => (
              <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
               <input 
                type="number"
                placeholder="الحد الشرعي المقترح للصرف"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/5 outline-none text-white font-black text-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">{resolvedSymbol}</span>
            </div>
            <button 
              onClick={() => {
                if (selectedCat && amount) {
                  onSetBudget(selectedCat, parseArabicNumber(amount));
                  setAmount('');
                  setSelectedCat('');
                }
              }}
              className="bg-indigo-500 hover:bg-indigo-600 text-slate-950 px-5 font-black text-xs rounded-xl active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/20"
            >
              {isRtl ? 'حفظ وتطبيق' : 'Save & Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Monitoring Budgets with high design fidelity */}
      <div className="space-y-4">
        <h4 className="font-black text-white px-2 text-xs uppercase tracking-widest text-slate-500">{isRtl ? 'رصد حدود الإنفاق والتشغيل الحالية بالبوابات' : 'Current Spending Limits'}</h4>
        
        {budgetStats.length === 0 && (
          <div className="text-center py-12 bg-slate-900/20 rounded-2xl border-2 border-dashed border-white/5">
            <p className="text-slate-500 font-bold text-xs">{isRtl ? 'لا توجد حدود إنفاق تشغيلية محددة حالياً.' : 'No active budget limits set.'}</p>
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-2">
          {budgetStats.map(b => {
            const isCritical = b.percentage >= 90;
            const isWarning = b.percentage >= 75 && b.percentage < 90;

            return (
              <div key={b.categoryId} className={`bg-slate-900/40 p-4 sm:p-5 rounded-2xl space-y-4 border transition-all ${isCritical ? 'border-rose-500/20 bg-rose-500/5' : 'border-white/5'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`p-3 rounded-xl transition-all duration-300 ${isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-950 text-slate-400'}`}
                    >
                      {isCritical ? <TriangleAlert size={18} className="animate-pulse" /> : <Target size={18} />}
                    </div>
                    <div>
                      <span className="font-black text-white text-sm block leading-none mb-1">{b.category?.name}</span>
                      {isCritical && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{isRtl ? 'تجاوز لسقف الميزانية المعتمد!' : 'Budget Limit Exceeded!'}</span>}
                      {isWarning && !isCritical && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{isRtl ? 'تنبيه بالاقتراب من السقف' : 'Approaching Budget Limit'}</span>}
                    </div>
                  </div>
                  <div className="text-start sm:text-end leading-none">
                     <p className="text-xs font-black text-white">
                      {b.spent.toLocaleString()} / {b.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{resolvedSymbol}</span>
                    </p>
                    <p className={`text-[11px] font-bold mt-1.5 ${isCritical ? 'text-rose-500' : 'text-slate-400'}`}>
                      {isCritical ? (isRtl ? 'سقف مستهلك' : 'Limit exceeded') : (isRtl ? `تبقي ${(b.amount - b.spent).toLocaleString()} ${resolvedSymbol}` : `Remaining ${(b.amount - b.spent).toLocaleString()} ${resolvedSymbol}`)}
                    </p>
                  </div>
                </div>

                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className={`text-[10px] font-black inline-block py-1 px-2 rounded-lg ${isCritical ? 'bg-rose-500 text-slate-950' : isWarning ? 'bg-amber-500 text-slate-900' : 'bg-emerald-500 text-slate-950'}`}>
                        {Math.round(b.percentage)}% مستخدم
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-950 border border-white/5">
                    <div 
                      style={{ width: `${b.percentage}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${
                        isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BudgetManager;
