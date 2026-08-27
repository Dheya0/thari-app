import React, { useState } from 'react';
import { Target, Plus, Star, Compass, Loader2, X } from 'lucide-react';
import { Goal, Wallet, Transaction } from '../types';
import { getGoalAdvice } from '../services/geminiService';
import { parseArabicNumber } from '../utils/formatters';
import { getTranslation, LanguageKey } from '../utils/translations';

interface GoalTrackerProps {
  goals: Goal[];
  wallets: Wallet[];
  transactions: Transaction[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoalAmount: (id: string, amount: number) => void;
  currencySymbol: string;
  apiKey?: string;
  language?: LanguageKey;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ 
  goals, 
  wallets, 
  transactions, 
  onAddGoal, 
  currencySymbol, 
  apiKey,
  language = 'ar' 
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(wallets[0]?.id || '');
  
  const [goalAdvices, setGoalAdvices] = useState<Record<string, {text: string, loading: boolean}>>({});

  const fetchAdvice = async (goal: Goal) => {
    setGoalAdvices(prev => ({ ...prev, [goal.id]: { text: '', loading: true } }));
    const advice = await getGoalAdvice(goal, transactions, currencySymbol, apiKey);
    setGoalAdvices(prev => ({ ...prev, [goal.id]: { text: advice || '', loading: false } }));
  };

  return (
    <div className="space-y-6 pb-24 animate-fade text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Target size={14} /> {t.goalsTitle}
        </h3>
        <button onClick={() => setShowAdd(true)} className="p-2 bg-amber-500/10 text-amber-500 rounded-xl active:scale-90 transition-all">
          <Plus size={18} />
        </button>
      </div>

      <div className="grid gap-6">
        {goals.length === 0 && (
          <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-dashed border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-600">
               <Star size={32} />
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t.noGoalsYet}</p>
          </div>
        )}

        {goals.map((goal) => {
          const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const isCompleted = progress >= 100;
          const linkedWallet = wallets.find(w => w.id === goal.walletId);
          const advice = goalAdvices[goal.id];

          return (
            <div key={goal.id} className={`bg-slate-900/60 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/5 space-y-5 transition-all hover:bg-slate-900/80 ${isCompleted ? 'border-emerald-500/30' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isCompleted ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500/10 text-amber-500'}`}>
                    <Star size={24} fill={isCompleted ? "currentColor" : "none"} />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg">{goal.name}</h4>
                    <div className="flex items-center gap-2">
                        {linkedWallet && <div className="w-2 h-2 rounded-full" style={{backgroundColor: linkedWallet.color}} />}
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{linkedWallet?.name || t.generalWallet}</p>
                    </div>
                  </div>
                </div>
                <div className="text-start sm:text-end">
                  <span className={`text-xl font-black ${isCompleted ? 'text-emerald-500' : 'text-white'}`}>{Math.round(progress)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <span>{t.achieved}: {goal.currentAmount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} {currencySymbol}</span>
                  <span>{t.targetAmount}: {goal.targetAmount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} {currencySymbol}</span>
                </div>
                <div className="h-3 bg-slate-950 rounded-full overflow-hidden p-[2px]">
                   <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              {!isCompleted && (
                <div className="bg-[#D9B978]/5 rounded-2xl p-4 border border-[#D9B978]/15 relative group">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[9px] font-black text-[#D9B978] uppercase tracking-widest flex items-center gap-1.5">
                        <Compass size={13} /> {t.goalAdviceTitle}
                     </span>
                     <button 
                        onClick={() => fetchAdvice(goal)} 
                        className="text-[8px] font-black text-slate-500 hover:text-[#D9B978] transition-colors"
                        disabled={advice?.loading}
                    >
                        {advice?.loading ? <Loader2 size={10} className="animate-spin" /> : t.updateAdvice}
                     </button>
                  </div>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed min-h-[1.5em]">
                    {advice?.text || t.goalAdvisorDefault}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-4 animate-fade no-print overflow-hidden">
          <div className="bg-slate-900 w-full max-w-md mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[85vh] sm:max-h-[88vh] flex flex-col min-h-0 border border-white/10 animate-slide-up overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-4 shrink-0 pb-2 border-b border-white/5">
              <h3 className="text-lg sm:text-xl font-bold text-white">{t.newGoal}</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 pr-1 pl-1 pb-1">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{t.goalDreamPrompt}</label>
                 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.goalDreamPlaceholder} className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 text-white font-bold border-none outline-none focus:ring-1 focus:ring-amber-500 shadow-inner" />
               </div>
               
               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 text-center block">{t.targetAmount}</label>
                     <input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00" className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 text-white font-black border-none outline-none focus:ring-1 focus:ring-amber-500 text-center" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 text-center block">{t.linkToWallet}</label>
                     <select value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)} className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 text-sm text-white font-bold border-none outline-none focus:ring-1 focus:ring-amber-500">
                        {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                     </select>
                   </div>
               </div>

               <button onClick={() => {
                 if (name && target) {
                   onAddGoal({ name, targetAmount: parseArabicNumber(target), currentAmount: 0, color: '#f59e0b', icon: 'Star', walletId: selectedWallet });
                   setShowAdd(false); setName(''); setTarget('');
                 }
               }} className="w-full mt-4 py-5 bg-amber-500 text-slate-950 font-black rounded-[2rem] text-lg shadow-[0_15px_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all">
                 {t.createGoalNow}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalTracker;