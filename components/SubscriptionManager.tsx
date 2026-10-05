import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  CreditCard, 
  Plus, 
  X, 
  Calendar, 
  RefreshCw, 
  Trash2, 
  Zap, 
  Clock, 
  Wallet as WalletIcon, 
  CheckCircle2, 
  ArrowUpRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Subscription, Category, Wallet } from '../types';
import { getIcon } from '../constants';
import { getLocalizedCurrency, getTranslation, LanguageKey } from '../utils/translations';
import { parseArabicNumber, formatFinancialNumber, sanitizeNumericInput } from '../utils/formatters';
import { useBackNavigation } from '../utils/backNavigation';
import { NativeHaptics } from '../services/nativeServices';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  categories: Category[];
  wallets: Wallet[];
  selectedWalletId?: string | null;
  onAdd: (sub: Omit<Subscription, 'id'>, recordInitialPayment?: boolean) => void;
  onRemove: (id: string) => void;
  onPaySubscription?: (sub: Subscription, walletId: string) => void;
  onUpdateSubscription?: (id: string, updates: Partial<Subscription>) => void;
  currencySymbol: string;
  currencyCode?: string;
  language?: LanguageKey;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ 
  subscriptions, 
  categories, 
  wallets = [],
  selectedWalletId,
  onAdd, 
  onRemove, 
  onPaySubscription,
  onUpdateSubscription,
  currencySymbol,
  currencyCode = 'SAR',
  language = 'ar'
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';
  const isEn = language === 'en';

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState(selectedWalletId || wallets[0]?.id || '');
  const [nextBilling, setNextBilling] = useState('');
  const [recordInitialPayment, setRecordInitialPayment] = useState(true);

  // Edit subscription state
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPeriod, setEditPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editWalletId, setEditWalletId] = useState('');
  const [editNextBilling, setEditNextBilling] = useState('');

  // Payment confirmation modal state
  const [payingSub, setPayingSub] = useState<Subscription | null>(null);
  const [payingWalletId, setPayingWalletId] = useState<string>('');

  useBackNavigation(() => {
    if (payingSub) {
      setPayingSub(null);
      return true;
    }
    if (editingSub) {
      setEditingSub(null);
      return true;
    }
    if (showAdd) {
      setShowAdd(false);
      return true;
    }
    return false;
  }, showAdd || Boolean(payingSub) || Boolean(editingSub), 15);

  const locCurr = useMemo(() => {
    return getLocalizedCurrency(currencyCode, undefined, currencySymbol, language);
  }, [currencyCode, currencySymbol, language]);
  const resolvedSymbol = locCurr.symbol;

  const totalMonthly = useMemo(() => {
    return subscriptions.reduce((sum, sub) => {
      const amt = Number(sub.amount) || 0;
      return sum + (sub.period === 'monthly' ? amt : amt / 12);
    }, 0);
  }, [subscriptions]);

  const totalYearly = totalMonthly * 12;

  const handleOpenPay = (sub: Subscription) => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    setPayingSub(sub);
    setPayingWalletId(sub.walletId || selectedWalletId || wallets[0]?.id || '');
  };

  const handleConfirmPayment = () => {
    if (!payingSub || !payingWalletId || !onPaySubscription) return;
    NativeHaptics.notification('SUCCESS').catch(() => {});
    onPaySubscription(payingSub, payingWalletId);
    setPayingSub(null);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade text-start font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Financial Metrics */}
      <div className="bg-gradient-to-br from-[#171D24] via-[#11161C] to-[#0A0D10] p-6 sm:p-8 rounded-2xl md:rounded-3xl text-white shadow-2xl relative overflow-hidden group border border-white/10">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D9B978]/15 via-transparent to-transparent pointer-events-none" />
        <Zap className="absolute -right-4 -top-4 text-white/[0.03] group-hover:scale-125 transition-transform duration-1000" size={120} />
        
        <div className="relative z-10 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D9B978]">
              {t.totalMonthlyCommitment}
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F4F1EA] tracking-tight font-numeric">
                {formatFinancialNumber(totalMonthly)}
              </h2>
              <span className="text-xl text-[#D9B978] font-bold">{resolvedSymbol}</span>
              <span className="text-xs text-slate-400 font-normal">/ {isEn ? 'month' : 'شهرياً'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium">
                {isEn ? 'Annual Projected Cost' : 'التكلفة السنوية المقدرة'}
              </span>
              <p className="text-sm sm:text-base font-bold text-white font-numeric">
                {formatFinancialNumber(totalYearly)} <span className="text-xs text-slate-400 font-normal">{resolvedSymbol}</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium">
                {isEn ? 'Active Subscriptions' : 'الاشتراكات النشطة'}
              </span>
              <p className="text-sm sm:text-base font-bold text-[#8EB9A7] font-numeric">
                {subscriptions.length} {isEn ? 'services' : 'خدمات مسجلة'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Subscription Trigger Button */}
      <button 
        type="button"
        onClick={() => {
          NativeHaptics.impact('LIGHT').catch(() => {});
          setWalletId(selectedWalletId || wallets[0]?.id || '');
          setShowAdd(true);
        }}
        className="w-full py-4 bg-[#11161C] hover:bg-[#171D24] border border-[#D9B978]/40 hover:border-[#D9B978]/70 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-[#D9B978] active:scale-[0.98] transition-all shadow-md cursor-pointer"
      >
        <Plus size={18} />
        <span>{t.addNewSubscription}</span>
      </button>

      {/* Subscriptions List */}
      <div className="space-y-3">
        {subscriptions.length === 0 && (
          <div className="bg-[#11161C] p-8 sm:p-10 rounded-3xl border border-dashed border-white/10 text-center space-y-3">
            <div className="w-14 h-14 bg-[#0A0D10] border border-white/5 rounded-2xl flex items-center justify-center mx-auto text-[#D9B978]">
              <CreditCard size={26} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isEn ? 'No subscriptions recorded yet' : 'لا توجد اشتراكات دورية مسجلة بعد'}
            </p>
          </div>
        )}

        {subscriptions.map((sub) => {
          const cat = categories.find(c => c.id === sub.categoryId);
          const linkedWallet = wallets.find(w => w.id === sub.walletId);
          const walletCurr = linkedWallet ? getLocalizedCurrency(linkedWallet.currencyCode, linkedWallet.currencyCode, undefined, language) : locCurr;

          return (
            <div 
              key={sub.id} 
              className="bg-[#11161C] border border-white/10 hover:border-[#D9B978]/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm group"
            >
              {/* Left / Info Section */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#0A0D10] border border-white/10 text-[#D9B978] group-hover:border-[#D9B978]/40 shrink-0 transition-colors shadow-sm">
                  {getIcon(cat?.icon || 'CreditCard', 22)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[#F4F1EA] text-base truncate">{sub.name}</h4>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <RefreshCw size={11} className="text-[#D9B978]" /> 
                      {sub.period === 'monthly' ? t.monthly : t.yearly}
                    </span>
                    
                    {/* Linked Wallet Badge */}
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <WalletIcon size={12} className="text-[#8EB9A7]" />
                      <span className="truncate max-w-[120px]">{linkedWallet?.name || (isEn ? 'General' : 'بدون تحديد محفظة')}</span>
                    </span>

                    {sub.nextBillingDate && (
                      <span className="flex items-center gap-1 font-numeric text-[#759BC8]">
                        <Clock size={11} /> {sub.nextBillingDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right / Price & Payment Trigger Section */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <div className="text-start sm:text-end font-numeric">
                  <p className="text-base sm:text-lg font-bold text-[#F4F1EA]">
                    {formatFinancialNumber(sub.amount)}{' '}
                    <span className="text-xs text-slate-400 font-normal">{walletCurr.symbol || resolvedSymbol}</span>
                  </p>
                  {sub.lastPaymentDate && (
                    <span className="text-[10px] text-slate-500 block font-normal">
                      {isEn ? 'Last paid:' : 'آخر سداد:'} {sub.lastPaymentDate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Pay / Renew Button */}
                  {onPaySubscription && (
                    <button
                      type="button"
                      onClick={() => handleOpenPay(sub)}
                      className="px-3 py-2 rounded-xl bg-[#8EB9A7]/15 hover:bg-[#8EB9A7] text-[#8EB9A7] hover:text-slate-950 border border-[#8EB9A7]/40 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                      title={isEn ? 'Pay and record transaction now' : 'سداد واقتطاع المبلغ من المحفظة الآن'}
                    >
                      <CheckCircle2 size={14} />
                      <span className="hidden sm:inline">{isEn ? 'Pay Now' : 'سداد الآن'}</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      NativeHaptics.impact('MEDIUM').catch(() => {});
                      onRemove(sub.id);
                    }} 
                    className="p-2 text-slate-500 hover:text-[#C98387] rounded-xl hover:bg-white/5 transition-colors cursor-pointer" 
                    title={t.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subscription Modal */}
      {showAdd && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-start justify-center p-3 sm:p-4 pt-2 sm:pt-4 animate-fade no-print overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div 
            className="bg-[#11161C] w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/10 animate-slide-up flex flex-col min-h-0 overflow-hidden" 
            style={{ maxHeight: 'calc(var(--vh, 100dvh) - 1rem)' }}
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-bold text-[#F4F1EA]">{t.addNewSubscription}</h3>
              <button 
                type="button"
                onClick={() => setShowAdd(false)} 
                className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div 
              className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 pr-1 pl-1 overscroll-contain"
              style={{ paddingBottom: 'calc(var(--keyboard-inset, 0px) + 2rem)' }}
            >
              {/* Subscription Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  {isEn ? 'Subscription / Service Name' : 'اسم الخدمة أو الاشتراك'}
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder={t.subNamePlaceholder || 'مثلاً: نتفلكس، اشتراك نادي، باقة إنترنت'} 
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-medium text-xs focus:border-[#D9B978]/50 outline-none transition-colors" 
                />
              </div>

              {/* Amount and Frequency */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    {isEn ? 'Amount' : 'المبلغ'}
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      inputMode="decimal" 
                      value={amount} 
                      onChange={e => setAmount(sanitizeNumericInput(e.target.value))} 
                      placeholder="0.00" 
                      className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-bold text-xs focus:border-[#D9B978]/50 outline-none transition-colors font-numeric" 
                    />
                    <span className={`absolute ${isRtl ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400`}>
                      {resolvedSymbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    {isEn ? 'Renewal Period' : 'دورة التجديد'}
                  </label>
                  <select 
                    value={period} 
                    onChange={e => setPeriod(e.target.value as any)} 
                    className="w-full bg-[#0A0D10] border border-white/10 text-[#F4F1EA] p-3.5 rounded-xl font-medium outline-none text-xs focus:border-[#D9B978]/50 transition-colors"
                  >
                    <option value="monthly">{t.monthly}</option>
                    <option value="yearly">{t.yearly}</option>
                  </select>
                </div>
              </div>

              {/* Linked Wallet Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <WalletIcon size={12} className="text-[#8EB9A7]" />
                  <span>{isEn ? 'Deduct from Account / Wallet' : 'المحفظة / الحساب المسدد منه'}</span>
                </label>
                <select 
                  value={walletId} 
                  onChange={e => setWalletId(e.target.value)} 
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-medium outline-none text-xs focus:border-[#8EB9A7]/50 transition-colors"
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.currencyCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Renewal Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                  {t.nextRenewalDate}
                </label>
                <input 
                  type="date" 
                  value={nextBilling} 
                  onChange={e => setNextBilling(e.target.value)} 
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-slate-300 font-medium outline-none text-xs focus:border-[#D9B978]/50 transition-colors" 
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                  {t.selectCategory}
                </label>
                <select 
                  value={categoryId} 
                  onChange={e => setCategoryId(e.target.value)} 
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-medium outline-none text-xs focus:border-[#D9B978]/50 transition-colors"
                >
                  <option value="">{t.selectCategory}</option>
                  {categories.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (name && amount && categoryId) {
                    NativeHaptics.notification('SUCCESS').catch(() => {});
                    const chosenWallet = wallets.find(w => w.id === walletId);
                    onAdd({ 
                      name, 
                      amount: parseArabicNumber(amount), 
                      period, 
                      categoryId, 
                      walletId: walletId || undefined,
                      currency: chosenWallet?.currencyCode || currencyCode,
                      nextBillingDate: nextBilling, 
                      isActive: true 
                    });
                    setShowAdd(false);
                    setName(''); 
                    setAmount(''); 
                    setNextBilling('');
                  }
                }} 
                disabled={!name || !amount || !categoryId}
                className="w-full mt-4 py-3.5 sm:py-4 bg-[#D9B978] hover:bg-[#E5C98D] disabled:opacity-40 text-[#0A0D10] font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#D9B978]/20 active:scale-95 transition-all cursor-pointer"
              >
                {t.saveSubscription}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Pay / Renew Confirmation Modal */}
      {payingSub && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-start justify-center p-3 sm:p-4 pt-4 sm:pt-6 animate-fade no-print overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setPayingSub(null); }}
        >
          <div 
            className="bg-[#11161C] w-full max-w-md mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#8EB9A7]/40 animate-slide-up flex flex-col space-y-4"
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#8EB9A7]/15 text-[#8EB9A7] flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEn ? 'Confirm Subscription Payment' : 'تأكيد سداد وقيد الاشتراك'}
                  </h3>
                  <p className="text-xs text-[#D9B978] mt-0.5">{payingSub.name}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPayingSub(null)} 
                className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0D10] border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{isEn ? 'Amount to Deduct' : 'المبلغ المراد اقتطاعه:'}</span>
                <span className="text-base font-bold text-[#8EB9A7] font-numeric">
                  {formatFinancialNumber(payingSub.amount)} {resolvedSymbol}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{isEn ? 'Billing Frequency' : 'دورة الاشتراك:'}</span>
                <span className="font-medium text-white">{payingSub.period === 'monthly' ? t.monthly : t.yearly}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <WalletIcon size={12} className="text-[#8EB9A7]" />
                <span>{isEn ? 'Select Account to Charge' : 'المحفظة / الحساب المراد الخصم منه'}</span>
              </label>
              <select
                value={payingWalletId}
                onChange={e => setPayingWalletId(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#0A0D10] border border-white/10 text-white font-medium outline-none text-xs focus:border-[#8EB9A7]/50"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.currencyCode})</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full py-3.5 bg-[#8EB9A7] hover:bg-[#7ea997] text-slate-950 font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-[#8EB9A7]/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{isEn ? 'Confirm & Deduct from Wallet' : 'تأكيد السداد والخصم من المحفظة'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SubscriptionManager;
