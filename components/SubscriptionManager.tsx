
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Plus, X, Calendar, RefreshCw, Trash2, Zap, Clock } from 'lucide-react';
import { Subscription, Category } from '../types';
import { getIcon } from '../constants';
import { getLocalizedCurrency, getTranslation, LanguageKey } from '../utils/translations';
import { parseArabicNumber } from '../utils/formatters';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  categories: Category[];
  onAdd: (sub: Omit<Subscription, 'id'>) => void;
  onRemove: (id: string) => void;
  currencySymbol: string;
  currencyCode?: string;
  language?: LanguageKey;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ 
  subscriptions, 
  categories, 
  onAdd, 
  onRemove, 
  currencySymbol,
  currencyCode = 'SAR',
  language = 'ar'
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [nextBilling, setNextBilling] = useState('');

  const locCurr = useMemo(() => {
    return getLocalizedCurrency(currencyCode, undefined, currencySymbol, language);
  }, [currencyCode, currencySymbol, language]);
  const resolvedSymbol = locCurr.symbol;

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    return sum + (sub.period === 'monthly' ? sub.amount : sub.amount / 12);
  }, 0);

  return (
    <div className="space-y-6 pb-24 animate-fade text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-br from-[#171D24] via-[#11161C] to-[#0A0D10] p-6 sm:p-8 rounded-2xl md:rounded-3xl text-white shadow-2xl relative overflow-hidden group border border-white/10">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D9B978]/15 via-transparent to-transparent pointer-events-none" />
        <Zap className="absolute -right-4 -top-4 text-white/[0.03] group-hover:scale-125 transition-transform duration-1000" size={120} />
        <div className="relative z-10 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D9B978]">{t.totalMonthlyCommitment}</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F4F1EA] tracking-tight">{totalMonthly.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} <span className="text-xl text-[#D9B978]">{resolvedSymbol}</span></h2>
          <p className="text-xs text-slate-400 font-medium">{t.subscriptionsAnnualNote}</p>
        </div>
      </div>

      <button 
        onClick={() => setShowAdd(true)}
        className="w-full py-4 sm:py-4.5 bg-[#11161C] hover:bg-[#171D24] border border-[#D9B978]/30 hover:border-[#D9B978]/60 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-[#D9B978] active:scale-[0.98] transition-all shadow-md"
      >
        <Plus size={18} /> <span>{t.addNewSubscription}</span>
      </button>

      <div className="space-y-3">
        {subscriptions.map((sub) => {
          const cat = categories.find(c => c.id === sub.categoryId);
          return (
            <div key={sub.id} className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center justify-between group hover:border-[#D9B978]/30 transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0A0D10] border border-white/10 text-[#D9B978] group-hover:border-[#D9B978]/40 transition-colors">
                  {getIcon(cat?.icon || 'CreditCard', 22)}
                </div>
                <div>
                  <h4 className="font-bold text-[#F4F1EA] text-sm sm:text-base">{sub.name}</h4>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <RefreshCw size={10} /> {sub.period === 'monthly' ? t.monthly : t.yearly}
                     </p>
                     {sub.nextBillingDate && (
                         <p className="text-[10px] font-medium text-[#759BC8] flex items-center gap-1">
                            <Clock size={10} /> {sub.nextBillingDate}
                         </p>
                     )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-start sm:text-end">
                  <p className="text-base sm:text-lg font-bold text-[#F4F1EA]">{sub.amount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} <span className="text-xs text-slate-400 font-normal">{resolvedSymbol}</span></p>
                </div>
                <button onClick={() => onRemove(sub.id)} className="p-2 text-slate-500 hover:text-[#C98387] rounded-xl hover:bg-white/5 transition-colors" title={t.delete}>
                  <Trash2 size={16} />
                </button>
              </div>
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
            className="bg-[#11161C] w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/10 animate-slide-up max-h-[88dvh] sm:max-h-[88vh] flex flex-col min-h-0 overflow-hidden my-auto" 
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
             <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-white/10">
                <h3 className="text-base sm:text-lg font-bold text-[#F4F1EA]">{t.addNewSubscription}</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all"><X size={18} /></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 pr-1 pl-1 pb-1 overscroll-contain">
                <div className="space-y-1">
                   <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.subNamePlaceholder} className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-medium text-xs focus:border-[#D9B978]/50 outline-none transition-colors" />
                </div>
                <div className="flex gap-3 sm:gap-4">
                   <div className="relative flex-1">
                     <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-bold text-xs focus:border-[#D9B978]/50 outline-none transition-colors" />
                     <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400`}>{resolvedSymbol}</span>
                   </div>
                   <select value={period} onChange={e => setPeriod(e.target.value as any)} className="bg-[#0A0D10] border border-white/10 text-[#F4F1EA] p-3.5 rounded-xl font-medium outline-none text-xs focus:border-[#D9B978]/50 transition-colors">
                     <option value="monthly">{t.monthly}</option>
                     <option value="yearly">{t.yearly}</option>
                   </select>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">{t.nextRenewalDate}</label>
                        <input type="date" value={nextBilling} onChange={e => setNextBilling(e.target.value)} className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-slate-300 font-medium outline-none text-xs focus:border-[#D9B978]/50 transition-colors" />
                    </div>
                </div>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-medium outline-none text-xs focus:border-[#D9B978]/50 transition-colors">
                   <option value="">{t.selectCategory}</option>
                   {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => {
                  if (name && amount && categoryId) {
                    onAdd({ name, amount: parseArabicNumber(amount), period, categoryId, nextBillingDate: nextBilling, isActive: true });
                    setShowAdd(false);
                    setName(''); setAmount(''); setNextBilling('');
                  }
                }} className="w-full mt-4 py-3.5 sm:py-4 bg-[#D9B978] hover:bg-[#E5C98D] text-[#0A0D10] font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#D9B978]/20 active:scale-95 transition-all">{t.saveSubscription}</button>
             </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SubscriptionManager;
