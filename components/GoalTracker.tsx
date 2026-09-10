import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Target, Plus, Star, Compass, X, Trash2, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Goal, Wallet, Transaction } from '../types';
import { parseArabicNumber, formatFinancialNumber, sanitizeNumericInput } from '../utils/formatters';
import { getTranslation, LanguageKey } from '../utils/translations';
import { safeDiv, safeMul, safeAdd, safeSub } from '../utils/mathPrecision';
import { useBackNavigation } from '../utils/backNavigation';
import { NativeHaptics } from '../services/nativeServices';

interface GoalTrackerProps {
  goals: Goal[];
  wallets: Wallet[];
  transactions: Transaction[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoalAmount: (id: string, amount: number) => void;
  onDeleteGoal?: (id: string) => void;
  currencySymbol: string;
  language?: LanguageKey;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({ 
  goals, 
  wallets, 
  transactions, 
  onAddGoal, 
  onUpdateGoalAmount,
  onDeleteGoal,
  currencySymbol, 
  language = 'ar' 
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(wallets[0]?.id || '');
  
  // Deposit modal state
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  
  useBackNavigation(() => {
    if (depositGoalId) {
      setDepositGoalId(null);
      setDepositAmount('');
      return true;
    }
    if (showAdd) {
      setShowAdd(false);
      return true;
    }
    return false;
  }, showAdd || Boolean(depositGoalId), 15);

  const activeDepositGoal = goals.find(g => g.id === depositGoalId);

  const handleDepositSubmit = () => {
    if (!depositGoalId || !depositAmount) return;
    const num = parseArabicNumber(depositAmount);
    if (isNaN(num) || num <= 0) return;
    NativeHaptics.notification('SUCCESS').catch(() => {});
    onUpdateGoalAmount(depositGoalId, num);
    setDepositGoalId(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6 pb-24 animate-fade text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Target size={14} className="text-[#D9B978]" /> {t.goalsTitle}
        </h3>
        <button 
          onClick={() => {
            NativeHaptics.impact('LIGHT').catch(() => {});
            setShowAdd(true);
          }} 
          className="p-2.5 bg-[#D9B978]/10 hover:bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/20 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <Plus size={16} />
          <span>{isRtl ? 'هدف جديد' : 'New Goal'}</span>
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
          const remainingAmt = Math.max(0, safeSub(targetAmt, currentAmt));
          const localAdviceText = isRtl
            ? `متبقي ${formatFinancialNumber(remainingAmt)} ${currencySymbol} لتحقيق هدفك بالكامل.`
            : `${formatFinancialNumber(remainingAmt)} ${currencySymbol} remaining to achieve your goal.`;

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
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold font-numeric ${isCompleted ? 'text-[#8EB9A7]' : 'text-[#D9B978]'}`}>{formatFinancialNumber(Math.round(progress))}%</span>
                  {onDeleteGoal && (
                    <button
                      type="button"
                      onClick={() => {
                        NativeHaptics.impact('MEDIUM').catch(() => {});
                        onDeleteGoal(goal.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-[#C98387] rounded-lg hover:bg-white/5 transition-colors"
                      title={isRtl ? 'حذف الهدف' : 'Delete Goal'}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider font-numeric">
                  <span>{t.achieved}: {formatFinancialNumber(goal.currentAmount)} {currencySymbol}</span>
                  <span>{t.targetAmount}: {formatFinancialNumber(goal.targetAmount)} {currencySymbol}</span>
                </div>
                <div className="h-2.5 bg-[#0A0D10] rounded-full overflow-hidden border border-white/5">
                   <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-[#8EB9A7]' : 'bg-[#D9B978]'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Action buttons on goal */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                {!isCompleted ? (
                  <button
                    type="button"
                    onClick={() => {
                      NativeHaptics.impact('LIGHT').catch(() => {});
                      setDepositGoalId(goal.id);
                      setDepositAmount('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#D9B978]/10 hover:bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <ArrowUpRight size={14} />
                    <span>{isRtl ? '+ إيداع في الهدف' : '+ Deposit into Goal'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#8EB9A7]">
                    <CheckCircle2 size={16} />
                    <span>{isRtl ? 'تم تحقيق الهدف بنجاح!' : 'Goal Achieved!'}</span>
                  </div>
                )}
              </div>

              {!isCompleted && (
                <div className="bg-[#0A0D10] rounded-2xl p-3.5 border border-[#D9B978]/20 relative group">
                  <div className="flex items-center justify-between mb-1.5">
                     <span className="text-[9px] font-bold text-[#D9B978] uppercase tracking-wider flex items-center gap-1.5">
                        <Compass size={12} /> {t.goalAdviceTitle}
                     </span>
                  </div>
                  <p className="text-xs font-normal text-slate-300 leading-relaxed font-numeric">
                    {localAdviceText}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {showAdd && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-start justify-center p-3 sm:p-4 pt-2 sm:pt-4 animate-fade no-print overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div 
            className="bg-[#11161C] w-full max-w-md mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl relative flex flex-col min-h-0 border border-white/10 animate-slide-up overflow-hidden" 
            style={{ maxHeight: 'calc(var(--vh, 100dvh) - 1rem)' }}
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-bold text-[#F4F1EA]">{t.newGoal}</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"><X size={18} /></button>
            </div>
            <div 
              className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 pr-1 pl-1 overscroll-contain"
              style={{ paddingBottom: 'calc(var(--keyboard-inset, 0px) + 2rem)' }}
            >
               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{t.goalDreamPrompt}</label>
                 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.goalDreamPlaceholder} className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-medium text-xs border border-white/10 outline-none focus:border-[#D9B978]/50 transition-colors" />
               </div>
               
               <div className="grid grid-cols-2 gap-3 sm:gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 text-center block">{t.targetAmount}</label>
                     <input type="text" inputMode="decimal" value={target} onChange={e => setTarget(sanitizeNumericInput(e.target.value))} placeholder="0.00" className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-bold text-xs border border-white/10 outline-none focus:border-[#D9B978]/50 text-center transition-colors font-numeric" />
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
                   NativeHaptics.notification('SUCCESS').catch(() => {});
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

      {/* Deposit to Goal Modal */}
      {depositGoalId && activeDepositGoal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-start justify-center p-3 sm:p-4 pt-2 sm:pt-4 animate-fade no-print overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) { setDepositGoalId(null); setDepositAmount(''); } }}
        >
          <div 
            className="bg-[#11161C] w-full max-w-md mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl relative flex flex-col min-h-0 border border-white/10 animate-slide-up overflow-hidden" 
            style={{ maxHeight: 'calc(var(--vh, 100dvh) - 1rem)' }}
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#F4F1EA]">{isRtl ? 'إيداع في الهدف' : 'Deposit into Goal'}</h3>
                <p className="text-xs text-[#D9B978] mt-0.5">{activeDepositGoal.name}</p>
              </div>
              <button onClick={() => { setDepositGoalId(null); setDepositAmount(''); }} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 bg-[#0A0D10] rounded-2xl border border-white/5 flex justify-between items-center text-xs">
                <span className="text-slate-400">{isRtl ? 'المحقق حالياً' : 'Current Progress'}</span>
                <span className="font-bold text-[#F4F1EA] font-numeric">{formatFinancialNumber(activeDepositGoal.currentAmount)} / {formatFinancialNumber(activeDepositGoal.targetAmount)} {currencySymbol}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{isRtl ? 'مبلغ الإيداع' : 'Deposit Amount'}</label>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  autoFocus
                  value={depositAmount} 
                  onChange={e => setDepositAmount(sanitizeNumericInput(e.target.value))} 
                  placeholder="0.00" 
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-bold text-sm border border-white/10 outline-none focus:border-[#D9B978]/50 text-center transition-colors font-numeric" 
                />
              </div>

              <button 
                onClick={handleDepositSubmit}
                disabled={!depositAmount || parseArabicNumber(depositAmount) <= 0}
                className="w-full mt-2 py-3.5 sm:py-4 bg-[#D9B978] hover:bg-[#E5C98D] disabled:opacity-40 text-[#0A0D10] font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#D9B978]/20 active:scale-95 transition-all"
              >
                {isRtl ? 'تأكيد الإيداع' : 'Confirm Deposit'}
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