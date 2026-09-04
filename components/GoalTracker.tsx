import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Target, Plus, Star, Compass, X } from 'lucide-react';
import { Goal, Wallet, Transaction } from '../types';
import { parseArabicNumber } from '../utils/formatters';
import { getTranslation, LanguageKey } from '../utils/translations';
import { safeDiv, safeMul } from '../utils/mathPrecision';
import { useBackNavigation } from '../utils/backNavigation';

interface GoalTrackerProps {
  goals: Goal[];
  wallets: Wallet[];
  transactions: Transaction[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoalAmount: (id: string, amount: number) => void;
  currencySymbol: string;
  language?: LanguageKey;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ 
  goals, 
  wallets, 
  transactions, 
  onAddGoal, 
  currencySymbol, 
  language = 'ar' 
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(wallets[0]?.id || '');
  
  useBackNavigation(() => {
    if (showAdd) {
      setShowAdd(false);
      return true;
    }
    return false;
  }, showAdd, 15);

  return (
    <div className="space-y-6 pb-24 animate-fade text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Target size={14} className="text-[#D9B978]" /> {t.goalsTitle}
        </h3>
        <button onClick={() => setShowAdd(true)} className="p-2.5 bg-[#D9B978]/10 hover:bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/20 rounded-xl active:scale-95 transition-all">
          <Plus size={16} />
        </button>
      </div>

      <div className="grid gap-4 sm:gap-5">
        {goals.length === 0 && (
          <div className="bg-[#11161C] p-8 sm:p-10 rounded-3xl border border-dashed border-white/10 text-center space-y-3">
            <div className="w-14 h-14 bg-[#0A0D10] border border-white/5 rounded-2xl flex items-center justify-center mx-auto text-[#D9B978]">
               <Star size={26} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.noGoalsYet}</p>
          </div>
        )}

        {goals.map((goal) => {
          const currentAmt = Number(goal.currentAmount) || 0;
          const targetAmt = Number(goal.targetAmount) || 0;
          const progress = targetAmt > 0 ? Math.min(100, Math.max(0, safeMul(safeDiv(currentAmt, targetAmt), 100))) : 0;
          const isCompleted = progress >= 100;
          const linkedWallet = wallets.find(w => w.id === goal.walletId);
          const remainingAmt = Math.max(0, targetAmt - currentAmt);
          const localAdviceText = isRtl
            ? `متبقي ${remainingAmt.toLocaleString('ar-SA')} ${currencySymbol} لتحقيق هدفك بالكامل.`
            : `${remainingAmt.toLocaleString()} ${currencySymbol} remaining to achieve your goal.`;

          return (
            <div key={goal.id} className={`bg-[#11161C] p-5 sm:p-6 rounded-3xl border space-y-4 transition-all shadow-sm ${isCompleted ? 'border-[#8EB9A7]/40 bg-[#8EB9A7]/5' : 'border-white/10 hover:border-white/20'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${isCompleted ? 'bg-[#8EB9A7] text-[#0A0D10]' : 'bg-[#D9B978]/15 text-[#D9B978] border border-[#D9B978]/20'}`}>
                    <Star size={20} fill={isCompleted ? "currentColor" : "none"} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#F4F1EA] text-base">{goal.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        {linkedWallet && <div className="w-2 h-2 rounded-full" style={{backgroundColor: linkedWallet.color}} />}
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{linkedWallet?.name || t.generalWallet}</p>
                    </div>
                  </div>
                </div>
                <div className="text-start sm:text-end">
                  <span className={`text-lg font-bold ${isCompleted ? 'text-[#8EB9A7]' : 'text-[#D9B978]'}`}>{Math.round(progress)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{t.achieved}: {goal.currentAmount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} {currencySymbol}</span>
                  <span>{t.targetAmount}: {goal.targetAmount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} {currencySymbol}</span>
                </div>
                <div className="h-2.5 bg-[#0A0D10] rounded-full overflow-hidden border border-white/5">
                   <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-[#8EB9A7]' : 'bg-[#D9B978]'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              {!isCompleted && (
                <div className="bg-[#0A0D10] rounded-2xl p-3.5 border border-[#D9B978]/20 relative group">
                  <div className="flex items-center justify-between mb-1.5">
                     <span className="text-[9px] font-bold text-[#D9B978] uppercase tracking-wider flex items-center gap-1.5">
                        <Compass size={12} /> {t.goalAdviceTitle}
                     </span>
                  </div>
                  <p className="text-xs font-normal text-slate-300 leading-relaxed">
                    {localAdviceText}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fade no-print overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div 
            className="bg-[#11161C] w-full max-w-md mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[88dvh] sm:max-h-[88vh] flex flex-col min-h-0 border border-white/10 animate-slide-up overflow-hidden my-auto" 
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-bold text-[#F4F1EA]">{t.newGoal}</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 pr-1 pl-1 pb-1 overscroll-contain">
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{t.goalDreamPrompt}</label>
                 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.goalDreamPlaceholder} className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-medium text-xs border border-white/10 outline-none focus:border-[#D9B978]/50 transition-colors" />
               </div>
               
               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 text-center block">{t.targetAmount}</label>
                     <input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00" className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-bold text-xs border border-white/10 outline-none focus:border-[#D9B978]/50 text-center transition-colors" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 text-center block">{t.linkToWallet}</label>
                     <select value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)} className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-xs text-[#F4F1EA] font-medium border border-white/10 outline-none focus:border-[#D9B978]/50 transition-colors">
                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                     </select>
                   </div>
               </div>

               <button onClick={() => {
                 if (name && target) {
                   onAddGoal({ name, targetAmount: parseArabicNumber(target), currentAmount: 0, color: '#D9B978', icon: 'Star', walletId: selectedWallet });
                   setShowAdd(false); setName(''); setTarget('');
                 }
               }} className="w-full mt-4 py-3.5 sm:py-4 bg-[#D9B978] hover:bg-[#E5C98D] text-[#0A0D10] font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#D9B978]/20 active:scale-95 transition-all">
                 {t.createGoalNow}
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GoalTracker;