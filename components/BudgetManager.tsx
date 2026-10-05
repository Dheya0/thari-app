import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Target, TriangleAlert, Award, TrendingUp, Sparkles, AlertCircle, Coins, ShieldCheck, Play, Trash2, Calendar, Wallet as WalletIcon, Filter } from 'lucide-react';
import { Budget, Category, Transaction, Wallet } from '../types';
import { getLocalizedCurrency, getTranslation, LanguageKey } from '../utils/translations';
import { parseArabicNumber, formatFinancialNumber, sanitizeNumericInput } from '../utils/formatters';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';
import { NativeHaptics } from '../services/nativeServices';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  wallets?: Wallet[];
  selectedWalletId?: string | null;
  onSetBudget: (catId: string, amount: number) => void;
  onDeleteBudget?: (catId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  currencySymbol: string;
  currencyCode?: string;
  exchangeRates?: Record<string, number>;
  language?: LanguageKey;
}

type BudgetPeriod = 'current_month' | 'last_month' | 'all_time';

const BudgetManager: React.FC<BudgetManagerProps> = ({ 
  budgets, 
  categories, 
  transactions, 
  wallets = [],
  selectedWalletId,
  onSetBudget, 
  onDeleteBudget,
  onShowToast,
  currencySymbol,
  currencyCode = 'SAR',
  exchangeRates = DEFAULT_EXCHANGE_RATES,
  language = 'ar'
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const isEn = language === 'en';
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [periodFilter, setPeriodFilter] = useState<BudgetPeriod>('current_month');
  const [activeWalletFilter, setActiveWalletFilter] = useState<string>(selectedWalletId || 'all');

  const locCurr = useMemo(() => {
    return getLocalizedCurrency(currencyCode, undefined, currencySymbol, language);
  }, [currencyCode, currencySymbol, language]);
  const resolvedSymbol = locCurr.symbol;

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Filter active operating transactions by period & wallet
  const activeTxs = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYearMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return (transactions || []).filter(tx => {
      if (tx.isDeleted || tx.isFinancing) return false;
      
      // Wallet filter
      if (activeWalletFilter !== 'all' && tx.walletId !== activeWalletFilter) {
        return false;
      }

      // Period filter
      if (periodFilter === 'current_month') {
        return tx.date && tx.date.startsWith(currentYearMonth);
      } else if (periodFilter === 'last_month') {
        return tx.date && tx.date.startsWith(lastYearMonth);
      }
      return true; // all_time
    });
  }, [transactions, periodFilter, activeWalletFilter]);

  // 1. Calculate General Financial KPIs & Abundance Score (تنمية العوائد والادخار)
  const abundanceData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    activeTxs.forEach(t => {
      const conv = convertCurrency(Number(t.amount) || 0, t.currency || currencyCode, currencyCode, exchangeRates);
      if (t.type === 'income') {
        totalIncome = safeAdd(totalIncome, conv);
      } else if (t.type === 'expense') {
        totalExpense = safeAdd(totalExpense, conv);
      }
    });
    
    // Calculate investments or savings allocation
    const savings = Math.max(0, safeSub(totalIncome, totalExpense));
    const savingsRate = totalIncome > 0 ? safeMul(safeDiv(savings, totalIncome), 100) : 0;
    
    // Abundance score out of 100
    const savingsScore = Math.min(40, (savingsRate / 30) * 40);
    
    let activeBudgetsExceeded = 0;
    budgets.forEach(b => {
      let spent = 0;
      activeTxs
        .filter(t => t.categoryId === b.categoryId && t.type === 'expense')
        .forEach(t => {
          const conv = convertCurrency(Number(t.amount) || 0, t.currency || currencyCode, currencyCode, exchangeRates);
          spent = safeAdd(spent, conv);
        });
      if (spent > b.amount) activeBudgetsExceeded++;
    });

    const adherenceScore = Math.max(0, 30 - (activeBudgetsExceeded * 10));
    const investmentScore = totalIncome > 0 ? 30 : 15;

    const finalAbundanceScore = Math.round(savingsScore + adherenceScore + investmentScore);
    const burnRate = totalExpense;

    return {
      savings,
      savingsRate,
      abundanceScore: finalAbundanceScore,
      burnRate,
      activeBudgetsExceeded
    };
  }, [activeTxs, budgets, currencyCode, exchangeRates]);

  const budgetStats = useMemo(() => {
    return budgets.map(b => {
      const category = categories.find(c => c.id === b.categoryId);
      let spent = 0;
      activeTxs
        .filter(t => t.categoryId === b.categoryId && t.type === 'expense')
        .forEach(t => {
          const conv = convertCurrency(Number(t.amount) || 0, t.currency || currencyCode, currencyCode, exchangeRates);
          spent = safeAdd(spent, conv);
        });
      const percentage = b.amount > 0 ? safeMul(safeDiv(spent, b.amount), 100) : 0;
      
      return { ...b, category, spent: roundToCurrency(spent), percentage };
    });
  }, [budgets, categories, activeTxs, currencyCode, exchangeRates]);

  // Categories exceeding 80% limit threshold
  const categoriesOver80 = useMemo(() => {
    return budgetStats.filter(b => b.percentage >= 80 && b.amount > 0);
  }, [budgetStats]);

  // Ref to track notified 80%+ categories to prevent repeated spam toasts
  const notifiedCategoriesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    categoriesOver80.forEach(b => {
      const catName = b.category?.name || (isEn ? 'Category' : 'فئة إدراج');
      const roundedPct = Math.round(b.percentage);
      const key = `${b.categoryId}_${roundedPct}_${b.spent}`;
      
      if (!notifiedCategoriesRef.current.has(key)) {
        notifiedCategoriesRef.current.add(key);
        if (onShowToast) {
          const isExceeded = b.percentage >= 100;
          const msg = isEn
            ? `Budget Warning: "${catName}" has reached ${formatFinancialNumber(roundedPct)}% of limit (${formatFinancialNumber(b.spent)} / ${formatFinancialNumber(b.amount)} ${resolvedSymbol})`
            : `تحذير ميزانية: فئة "${catName}" تجاوزت ${formatFinancialNumber(roundedPct)}% من الحد المالي (${formatFinancialNumber(b.spent)} / ${formatFinancialNumber(b.amount)} ${resolvedSymbol})`;
          onShowToast(msg, isExceeded ? 'error' : 'info');
        }
      }
    });
  }, [categoriesOver80, onShowToast, isEn, resolvedSymbol]);

  return (
    <div className="space-y-6 pb-24 animate-luxury-pop text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Period and Wallet Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11161C] p-3.5 rounded-2xl border border-white/10 shadow-sm">
        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-[#0A0D10] p-1 rounded-xl border border-white/5">
          <Calendar size={14} className="text-[#D9B978] mr-1.5 ml-1" />
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              setPeriodFilter('current_month');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodFilter === 'current_month' ? 'bg-[#D9B978] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isEn ? 'Current Month' : 'الشهر الحالي'}
          </button>
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              setPeriodFilter('last_month');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodFilter === 'last_month' ? 'bg-[#D9B978] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isEn ? 'Last Month' : 'الشهر السابق'}
          </button>
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              setPeriodFilter('all_time');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodFilter === 'all_time' ? 'bg-[#D9B978] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isEn ? 'All Time' : 'كل الفترات'}
          </button>
        </div>

        {/* Wallet Selector */}
        {wallets.length > 0 && (
          <div className="flex items-center gap-2">
            <WalletIcon size={14} className="text-[#8EB9A7]" />
            <select
              value={activeWalletFilter}
              onChange={e => {
                NativeHaptics.selection().catch(() => {});
                setActiveWalletFilter(e.target.value);
              }}
              className="bg-[#0A0D10] border border-white/10 text-white text-xs font-bold py-2 px-3 rounded-xl outline-none focus:border-[#8EB9A7]/50 transition-colors"
            >
              <option value="all">{isEn ? 'All Accounts' : 'جميع الحسابات والمحافظ'}</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.currencyCode})</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Abundance & Investment Reward Score Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171D24] via-[#11161C] to-[#0A0D10] p-5 sm:p-7 rounded-2xl md:rounded-3xl shadow-2xl text-white group border border-white/10">
         <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D9B978]/15 via-transparent to-transparent pointer-events-none" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D9B978]/10 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D9B978] border border-[#D9B978]/20">
                <Award size={13} />
                <span>أداء عقلية الوفرة والنماء وعكس التقشف</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#F4F1EA] leading-tight">مؤشر نقاط الوفرة الفعالة</h3>
              <p className="text-xs text-slate-300 max-w-lg font-medium leading-relaxed">
                ترتكز عقلية القيادة والنمو على توسيع قنوات الدخل وتوجيه التدفقات النقدية نحو الأصول المدرة للأرباح والاستثمارات وليس فقط الحد الصارم والتقشف.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center bg-[#0A0D10]/70 backdrop-blur-xl border border-white/10 px-6 py-5 rounded-2xl min-w-[140px] text-center self-center md:self-auto shadow-inner">
              <div className="relative flex items-center justify-center">
                <span className="text-4xl font-extrabold text-[#D9B978]">{abundanceData.abundanceScore}</span>
                <span className="text-[11px] text-slate-400 font-bold mr-1">/100</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">مستوى الكفاءة</p>
              <span className="text-xs text-[#8EB9A7] mt-0.5 font-bold">
                {abundanceData.abundanceScore > 80 ? 'قائد وفرة ذكي' : abundanceData.abundanceScore > 50 ? 'متوازن ومستقر' : 'مكافح نامٍ'}
              </span>
            </div>
         </div>
      </div>

      {/* Burn Rate and Runway Tracker widgets */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#C98387]/15 text-[#C98387] flex items-center justify-center shrink-0 border border-[#C98387]/20">
              <TriangleAlert size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">معدل الحرق المالي</p>
              <p className="text-xs font-bold text-[#F4F1EA]">إجمالي الصرف الجاري</p>
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#F4F1EA] leading-tight font-numeric">
            {formatFinancialNumber(abundanceData.burnRate)} <span className="text-xs text-slate-400 font-normal">{currencySymbol}</span>
          </div>
        </div>

        <div className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#8EB9A7]/15 text-[#8EB9A7] flex items-center justify-center shrink-0 border border-[#8EB9A7]/20">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">معدل الوفرة والادخار</p>
              <p className="text-xs font-bold text-[#F4F1EA]">المدخرات المحققة</p>
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#8EB9A7] leading-tight font-numeric">
            +{formatFinancialNumber(Math.round(abundanceData.savingsRate))}%
          </div>
        </div>
      </div>

      {/* Target Setting Form */}
      <div className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 mb-1 px-1">
          <Target size={18} className="text-[#D9B978]" />
          <h4 className="text-xs font-bold text-[#F4F1EA] uppercase tracking-wider">ضبط حدود التشغيل الاحتياطية لتصنيف محدد</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select 
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 outline-none text-[#F4F1EA] font-medium text-xs focus:border-[#D9B978]/50 transition-colors"
          >
            <option value="" className="bg-[#11161C] text-slate-300">انقر هنا لاختيار التصنيف الجاري</option>
            {expenseCategories.map(c => (
              <option key={c.id} value={c.id} className="bg-[#11161C] text-[#F4F1EA]">{c.name}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
               <input 
                type="text"
                inputMode="decimal"
                placeholder="الحد المقترح للصرف"
                value={amount}
                onChange={e => setAmount(sanitizeNumericInput(e.target.value))}
                className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 outline-none text-[#F4F1EA] font-bold text-xs focus:border-[#D9B978]/50 transition-colors font-numeric"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">{resolvedSymbol}</span>
            </div>
            <button 
              onClick={() => {
                if (selectedCat && amount) {
                  NativeHaptics.notification('SUCCESS').catch(() => {});
                  onSetBudget(selectedCat, parseArabicNumber(amount));
                  setAmount('');
                  setSelectedCat('');
                }
              }}
              className="bg-[#D9B978] hover:bg-[#E5C98D] text-[#0A0D10] px-5 font-bold text-xs rounded-xl active:scale-95 transition-all shadow-md shadow-[#D9B978]/20 shrink-0"
            >
              {isRtl ? 'حفظ وتطبيق' : 'Save & Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Warning Banner for Categories Exceeding 80% Limit */}
      {categoriesOver80.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#171D24] to-[#171D24] border border-amber-500/40 text-amber-200 shadow-xl space-y-3 animate-fade">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/30">
              <AlertCircle size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                {isEn ? 'Spending Warning: Categories Exceeded 80% Limit' : 'تحذير إنفاق: تصنيفات تجاوزت 80% من سقف الميزانية'}
              </h4>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {isRtl 
                  ? `تنبيه مبكر: يوجد ${categoriesOver80.length} تصنيف تجاوز نسبة 80% من الحد المالي المعتمد.`
                  : `Early alert: ${categoriesOver80.length} categories exceeded 80% of defined budget limit.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/20">
            {categoriesOver80.map(b => (
              <div 
                key={b.categoryId}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-2 font-numeric shadow-xs ${
                  b.percentage >= 100 
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300' 
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                }`}
              >
                <span>{b.category?.name || 'تصنيف'}</span>
                <span className="font-numeric">
                  {formatFinancialNumber(b.spent)} / {formatFinancialNumber(b.amount)} {resolvedSymbol}
                </span>
                <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[10px]">
                  {formatFinancialNumber(Math.round(b.percentage))}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Budgets with high design fidelity */}
      <div className="space-y-4">
        <h4 className="font-bold text-[#F4F1EA] px-2 text-xs uppercase tracking-widest text-slate-400">{isRtl ? 'رصد حدود الإنفاق والتشغيل الحالية بالبوابات' : 'Current Spending Limits'}</h4>
        
        {budgetStats.length === 0 && (
          <div className="text-center py-12 bg-[#11161C]/50 rounded-2xl border-2 border-dashed border-white/5">
            <p className="text-slate-400 font-medium text-xs">{isRtl ? 'لا توجد حدود إنفاق تشغيلية محددة حالياً.' : 'No active budget limits set.'}</p>
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-2">
          {budgetStats.map(b => {
            const isExceeded = b.percentage >= 100;
            const isOver80 = b.percentage >= 80;
            const isWarning = isOver80 && !isExceeded;

            return (
              <div key={b.categoryId} className={`bg-[#11161C] p-4 sm:p-5 rounded-2xl space-y-4 border transition-all ${
                isExceeded ? 'border-rose-500/50 bg-rose-500/5 shadow-md shadow-rose-500/5' : isWarning ? 'border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/5' : 'border-white/10 hover:border-white/20'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500/20 text-rose-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-[#0A0D10] text-[#D9B978] border border-white/5'
                      }`}
                    >
                      {isExceeded ? <TriangleAlert size={18} className="animate-pulse" /> : isWarning ? <AlertCircle size={18} className="animate-pulse" /> : <Target size={18} />}
                    </div>
                    <div>
                      <span className="font-bold text-[#F4F1EA] text-sm block leading-none mb-1">{b.category?.name}</span>
                      {isExceeded && <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">{isRtl ? 'تجاوز لسقف الميزانية المعتمد (100%+)' : 'Budget Limit Exceeded (100%+)'}</span>}
                      {isWarning && <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">{isRtl ? 'تحذير: تجاوز 80% من الميزانية!' : 'Warning: Exceeded 80% Limit!'}</span>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-start sm:text-end leading-none font-numeric">
                       <p className="text-xs font-bold text-[#F4F1EA]">
                        {formatFinancialNumber(b.spent)} / {formatFinancialNumber(b.amount)} <span className="text-[10px] text-slate-400">{resolvedSymbol}</span>
                      </p>
                      <p className={`text-[11px] font-medium mt-1.5 ${isExceeded ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-400'}`}>
                        {isExceeded ? (isRtl ? 'سقف مستهلك بالكامل' : 'Limit exceeded') : (isRtl ? `تبقي ${formatFinancialNumber(safeSub(b.amount, b.spent))} ${resolvedSymbol}` : `Remaining ${formatFinancialNumber(safeSub(b.amount, b.spent))} ${resolvedSymbol}`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        NativeHaptics.impact('MEDIUM').catch(() => {});
                        if (onDeleteBudget) {
                          onDeleteBudget(b.categoryId);
                        } else {
                          onSetBudget(b.categoryId, 0);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-[#C98387] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title={isRtl ? 'إزالة حد الميزانية' : 'Remove budget limit'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between font-numeric">
                    <div>
                      <span className={`text-[10px] font-bold inline-block py-1 px-2.5 rounded-lg ${
                        isExceeded ? 'bg-rose-500 text-slate-950 font-black' : isWarning ? 'bg-amber-400 text-slate-950 font-black' : 'bg-[#8EB9A7] text-[#0A0D10]'
                      }`}>
                        {formatFinancialNumber(Math.round(b.percentage))}% مستخدم
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-[#0A0D10] border border-white/5">
                    <div 
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-[#8EB9A7]'
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
