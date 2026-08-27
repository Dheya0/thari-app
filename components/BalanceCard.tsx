import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Sparkles, TrendingUp, Plane, Coins, Layers } from 'lucide-react';
import { DEFAULT_CURRENCIES } from '../constants';

interface BalanceCardProps {
  totalBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  symbol?: string;
  balances?: Record<string, number>;
  expenseBreakdown?: Record<string, number>; // Breakdown of expenses per currency
  isTravelMode?: boolean;
  showSeparateCurrencies?: boolean;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ 
  totalBalance = 0, 
  totalIncome = 0, 
  totalExpense = 0, 
  symbol = 'ر.س', 
  balances = {}, 
  expenseBreakdown = {}, 
  isTravelMode,
  showSeparateCurrencies 
}) => {
  const [viewMode, setViewMode] = useState<'consolidated' | 'separated'>(showSeparateCurrencies ? 'separated' : 'consolidated');

  const currencyEntries = Object.entries(balances || {});
  const safeTotalBalance = typeof totalBalance === 'number' && !isNaN(totalBalance) ? totalBalance : 0;
  const safeTotalIncome = typeof totalIncome === 'number' && !isNaN(totalIncome) ? totalIncome : 0;
  const safeTotalExpense = typeof totalExpense === 'number' && !isNaN(totalExpense) ? totalExpense : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden group perspective-1000 w-full"
    >
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl md:rounded-3xl p-5 sm:p-6 shadow-xl border border-white/10 overflow-hidden transition-all duration-300 w-full">
        
        {/* Card Top Header & View Switcher */}
        <div className="flex justify-between items-start mb-4 relative z-10 gap-2">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full shrink-0 ${isTravelMode ? 'bg-purple-500' : 'bg-amber-500'} animate-pulse`}></div>
               <p className={`text-[11px] font-black ${isTravelMode ? 'text-purple-400' : 'text-amber-500'} uppercase tracking-wider truncate`}>
                 {isTravelMode ? 'وضع السفر (عملات منفصلة)' : 'المركز المالي والرصيد'}
               </p>
            </div>

            {/* Big Balance Display */}
            <div className="flex items-baseline gap-1.5 overflow-hidden">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight truncate">
                {safeTotalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </h2>
              <span className="text-sm sm:text-lg text-slate-400 font-bold shrink-0">{symbol}</span>
            </div>
          </div>

          {/* Toggle Button for Consolidated vs Separated View */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('consolidated')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                  viewMode === 'consolidated' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض الرصيد المجمع"
              >
                <Layers size={11} />
                <span>مدمج</span>
              </button>
              <button
                onClick={() => setViewMode('separated')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                  viewMode === 'separated' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض العملات المنفصلة"
              >
                <Coins size={11} />
                <span>مفصول</span>
              </button>
            </div>

            <div className={`w-10 h-10 sm:w-11 sm:h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center ${isTravelMode ? 'text-purple-400' : 'text-amber-500'} shadow-lg`}>
              {isTravelMode ? <Plane className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Separated Mode or Pockets Strip */}
        {currencyEntries.length > 0 && (
          <div className="mb-5 relative z-10">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Coins size={12} className="text-amber-400" />
                {viewMode === 'separated' ? 'الأرصدة الفعلية المنفصلة بكل عملة' : 'جيوب المحفظة (العملات المستقلة)'}
              </p>
              <span className="text-[9px] font-bold text-slate-500">{currencyEntries.length} عملات مسجلة</span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5">
              {currencyEntries.map(([code, amount]) => {
                const val = amount as number;
                const cObj = DEFAULT_CURRENCIES.find(c => c.code === code);
                const cSymbol = cObj?.symbol || code;
                const isNegative = val < 0;

                return (
                  <div 
                    key={code} 
                    className={`shrink-0 px-3.5 py-2.5 rounded-2xl border flex flex-col items-start min-w-[105px] transition-all hover:scale-[1.02] ${
                      isNegative 
                        ? 'bg-rose-500/10 border-rose-500/30' 
                        : 'bg-slate-950/80 border-white/10 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-black text-amber-400 tracking-wider">{code}</span>
                      <span className="text-[9px] font-bold text-slate-400">{cSymbol}</span>
                    </div>
                    <span className={`text-sm sm:text-base font-black dir-ltr ${isNegative ? 'text-rose-400' : 'text-white'}`}>
                      {(Number(val) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Total Inflows & Outflows Deck */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 relative z-10">
          <div className="bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/5 flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> التدفقات (الواردات)
            </span>
            <p className="text-base sm:text-lg font-black text-white dir-ltr text-right">
              +{safeTotalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] font-bold text-slate-400">{symbol}</span>
            </p>
          </div>
          
          <div className="bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/5 flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> الالتزامات (المصروفات)
            </span>
            <p className="text-base sm:text-lg font-black text-white dir-ltr text-right">
              -{safeTotalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] font-bold text-slate-400">{symbol}</span>
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default BalanceCard;
