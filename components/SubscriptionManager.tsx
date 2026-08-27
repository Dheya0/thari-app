
import React, { useState, useMemo } from 'react';
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
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <Zap className="absolute -right-4 -top-4 text-white/10 group-hover:scale-150 transition-transform duration-1000" size={120} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">{t.totalMonthlyCommitment}</p>
          <h2 className="text-4xl font-black mb-1">{totalMonthly.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} <span className="text-xl opacity-50">{resolvedSymbol}</span></h2>
          <p className="text-[10px] font-bold opacity-60 italic">{t.subscriptionsAnnualNote}</p>
        </div>
      </div>

      <button 
        onClick={() => setShowAdd(true)}
        className="w-full py-5 bg-slate-900 border border-slate-800 rounded-[2rem] flex items-center justify-center gap-3 font-black text-amber-500 active:scale-95 transition-all shadow-lg"
      >
        <Plus size={20} /> {t.addNewSubscription}
      </button>

      <div className="space-y-4">
        {subscriptions.map((sub) => {
          const cat = categories.find(c => c.id === sub.categoryId);
          return (
            <div key={sub.id} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-5 rounded-[2.5rem] flex items-center justify-between group hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-amber-500 transition-colors">
                  {getIcon(cat?.icon || 'CreditCard', 24)}
                </div>
                <div>
                  <h4 className="font-black text-white">{sub.name}</h4>
                  <div className="flex flex-col gap-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <RefreshCw size={10} /> {sub.period === 'monthly' ? t.monthly : t.yearly}
                     </p>
                     {sub.nextBillingDate && (
                         <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                            <Clock size={10} /> {sub.nextBillingDate}
                         </p>
                     )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-start sm:text-end">
                  <p className="text-lg font-black text-white">{sub.amount.toLocaleString(isRtl ? 'ar-SA' : 'en-US')} <span className="text-[10px] opacity-30">{resolvedSymbol}</span></p>
                </div>
                <button onClick={() => onRemove(sub.id)} className="p-3 text-slate-700 hover:text-rose-500 transition-colors" title={t.delete}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade no-print overflow-hidden">
          <div className="bg-slate-900 w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/10 animate-slide-up max-h-[85vh] sm:max-h-[88vh] flex flex-col min-h-0 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
             <div className="flex justify-between items-center mb-4 shrink-0 pb-2 border-b border-white/5">
                <h3 className="text-lg sm:text-xl font-bold text-white">{t.addNewSubscription}</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all"><X size={18} /></button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 pr-1 pl-1 pb-1">
                <div className="space-y-1">
                   <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.subNamePlaceholder} className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-sm" />
                </div>
                <div className="flex gap-3 sm:gap-4">
                   <div className="relative flex-1">
                     <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-sm" />
                     <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500`}>{resolvedSymbol}</span>
                   </div>
                   <select value={period} onChange={e => setPeriod(e.target.value as any)} className="bg-slate-950 border border-slate-800 text-white p-4 sm:p-5 rounded-2xl font-bold outline-none text-sm">
                     <option value="monthly">{t.monthly}</option>
                     <option value="yearly">{t.yearly}</option>
                   </select>
                </div>
                <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 px-2 uppercase tracking-widest">{t.nextRenewalDate}</label>
                        <input type="date" value={nextBilling} onChange={e => setNextBilling(e.target.value)} className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 font-bold outline-none text-sm" />
                    </div>
                </div>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold outline-none text-sm">
                   <option value="">{t.selectCategory}</option>
                   {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => {
                  if (name && amount && categoryId) {
                    onAdd({ name, amount: parseArabicNumber(amount), period, categoryId, nextBillingDate: nextBilling, isActive: true });
                    setShowAdd(false);
                    setName(''); setAmount(''); setNextBilling('');
                  }
                }} className="w-full mt-4 py-4 sm:py-5 bg-amber-500 text-slate-950 font-black rounded-[2rem] text-sm sm:text-base shadow-[0_15px_30px_rgba(245,158,11,0.3)] active:scale-95 transition-all">{t.saveSubscription}</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
