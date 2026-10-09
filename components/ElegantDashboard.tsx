import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  ChevronLeft, 
  ChevronRight,
  ArrowUp, 
  ArrowDown,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Wallet as WalletIcon,
  Layers,
  Coins,
  X,
  Check,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Wallet, Transaction, Category, Currency, Debt } from '../types';
import { convertCurrency } from '../constants';
import { calculateDateBasedGrowth, calculateWalletBalances } from '../services/balanceEngine';
import { getTranslation, getLocalizedCurrency } from '../utils/translations';
import { SwipeableRow } from './SwipeableRow';
import { formatFinancialNumber } from '../utils/formatters';
import { safeAdd, safeSub } from '../utils/mathPrecision';

export { formatFinancialNumber };

interface ElegantDashboardProps {
  userName: string;
  netWorth: number;
  availableBalance: number;
  debtsOwedToMe: number;
  debtsIOwe: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  currency: Currency;
  currencies: Currency[];
  wallets: Wallet[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  exchangeRates: Record<string, number>;
  selectedWalletId: string | null;
  onSelectWallet: (id: string | null) => void;
  onChangeCurrency: (currency: Currency) => void;
  onOpenCurrencySelector?: () => void;
  onOpenNewTransaction: (type?: 'expense' | 'income' | 'transfer' | 'adjustment') => void;
  onOpenDebts: (filter?: 'all' | 'to_me' | 'on_me' | 'active' | 'settled' | 'overdue') => void;
  onOpenAllTransactions: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  language?: 'ar' | 'en';
  isTravelMode?: boolean;
  showSeparateCurrencies?: boolean;
  onToggleSeparateCurrencies?: (enabled: boolean) => void;
}

export const getGreeting = (lang: 'ar' | 'en' = 'ar'): { text: string; sub: string } => {
  const hour = new Date().getHours();
  if (lang === 'en') {
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', sub: 'Overview of your financial center & cashflow' };
    if (hour >= 12 && hour < 17) return { text: 'Good Day', sub: 'Wallets performance & daily updates' };
    if (hour >= 17 && hour < 22) return { text: 'Good Evening', sub: 'Financial activity summary & daily harvest' };
    return { text: 'Good Night', sub: 'Assets and liabilities stability summary' };
  } else {
    if (hour >= 5 && hour < 12) return { text: 'صباح الخير', sub: 'نظرة عامة على مركزك المالي وسلامة تدفقاتك' };
    if (hour >= 12 && hour < 17) return { text: 'طاب يومك', sub: 'نظرة عامة على أداء المحافظ ومستجدات اليوم' };
    if (hour >= 17 && hour < 22) return { text: 'مساء الخير', sub: 'ملخص الحركة المالية وحصاد اليوم' };
    return { text: 'مساء النور', sub: 'ملخص استقرار الأصول والالتزامات المالية' };
  }
};

export const ElegantDashboard: React.FC<ElegantDashboardProps> = ({
  userName,
  netWorth,
  availableBalance,
  debtsOwedToMe,
  debtsIOwe,
  monthlyIncome,
  monthlyExpense,
  monthlyNet,
  currency,
  currencies,
  wallets,
  transactions,
  categories,
  debts,
  exchangeRates,
  selectedWalletId,
  onSelectWallet,
  onChangeCurrency,
  onOpenCurrencySelector,
  onOpenNewTransaction,
  onOpenDebts,
  onOpenAllTransactions,
  onEditTransaction,
  onDeleteTransaction,
  language = 'ar',
  isTravelMode = false,
  showSeparateCurrencies = false,
  onToggleSeparateCurrencies
}) => {
  const lang = language || 'ar';
  const t = getTranslation(lang);
  const greeting = getGreeting(lang);
  const isEn = lang === 'en';

  const growthInfo = useMemo(() => {
    return calculateDateBasedGrowth(transactions, currency.code, exchangeRates);
  }, [transactions, currency.code, exchangeRates]);

  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    try {
      return localStorage.getItem('thari_hide_balances') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideBalances = () => {
    setHideBalances(prev => {
      const next = !prev;
      try {
        localStorage.setItem('thari_hide_balances', String(next));
      } catch {}
      if (typeof window !== 'undefined' && window.navigator.vibrate) {
        window.navigator.vibrate(15);
      }
      return next;
    });
  };

  const displayFinancialValue = (val: number, useCompact = false): string => {
    if (hideBalances) return '••••••';
    return formatFinancialNumber(val, useCompact);
  };

  // Precise Core Ledger Balances per Wallet (with debt repayments integrated)
  const calculatedBalances = useMemo(() => {
    return calculateWalletBalances(wallets, transactions, exchangeRates, debts);
  }, [wallets, transactions, exchangeRates, debts]);

  // Total balance per currency code across all wallets
  const currencyBalances = useMemo(() => {
    const map: Record<string, number> = {};
    wallets.forEach(w => {
      const summary = calculatedBalances[w.id];
      const bal = summary ? summary.currentBalance : (Number(w.openingBalance) || 0);
      map[w.currencyCode] = safeAdd(map[w.currencyCode] || 0, bal);
    });
    return map;
  }, [wallets, calculatedBalances]);

  const currencyEntries = useMemo(() => {
    return Object.entries(currencyBalances);
  }, [currencyBalances]);

  // Selected Wallet resolution
  const selectedWallet = useMemo(() => {
    if (!selectedWalletId) return null;
    return wallets.find(w => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  const selectedWalletSummary = useMemo(() => {
    if (!selectedWallet) return null;
    return calculatedBalances[selectedWallet.id] || null;
  }, [selectedWallet, calculatedBalances]);

  const selectedWalletNativeBalance = useMemo(() => {
    if (!selectedWallet) return 0;
    if (selectedWalletSummary) return selectedWalletSummary.currentBalance;
    return Number(selectedWallet.openingBalance) || 0;
  }, [selectedWallet, selectedWalletSummary]);

  const selectedWalletCurrencyObj = useMemo(() => {
    if (!selectedWallet) return currency;
    const loc = getLocalizedCurrency(selectedWallet.currencyCode, selectedWallet.currencyCode, undefined, lang);
    return currencies.find(c => c.code === selectedWallet.currencyCode) || {
      code: selectedWallet.currencyCode,
      symbol: loc.symbol || selectedWallet.currencyCode,
      name: loc.name || selectedWallet.currencyCode
    };
  }, [selectedWallet, currencies, currency, lang]);

  const selectedWalletBalanceInBase = useMemo(() => {
    if (!selectedWallet) return 0;
    return convertCurrency(selectedWalletNativeBalance, selectedWallet.currencyCode, currency.code, exchangeRates);
  }, [selectedWallet, selectedWalletNativeBalance, currency.code, exchangeRates]);

  const selectedWalletInflows = useMemo(() => {
    if (!selectedWalletSummary) return 0;
    return safeAdd(selectedWalletSummary.totalIncome, selectedWalletSummary.transfersIn);
  }, [selectedWalletSummary]);

  const selectedWalletOutflows = useMemo(() => {
    if (!selectedWalletSummary) return 0;
    return safeAdd(selectedWalletSummary.totalExpense, selectedWalletSummary.transfersOut);
  }, [selectedWalletSummary]);

  const selectedWalletNetMovement = useMemo(() => {
    return safeSub(selectedWalletInflows, selectedWalletOutflows);
  }, [selectedWalletInflows, selectedWalletOutflows]);

  // Toggle for Consolidated (مجموع) vs Separated (منفصل) Currency View
  const [currencyViewMode, setCurrencyViewMode] = useState<'consolidated' | 'separated'>(() => {
    try {
      const saved = localStorage.getItem('thari_currency_view_mode');
      if (saved === 'separated' || saved === 'consolidated') return saved;
    } catch {}
    return showSeparateCurrencies ? 'separated' : 'consolidated';
  });

  const handleToggleCurrencyViewMode = (mode: 'consolidated' | 'separated') => {
    setCurrencyViewMode(mode);
    try {
      localStorage.setItem('thari_currency_view_mode', mode);
    } catch {}
    if (onToggleSeparateCurrencies) {
      onToggleSeparateCurrencies(mode === 'separated');
    }
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const walletRows = useMemo(() => {
    return wallets.map(wallet => {
      const summary = calculatedBalances[wallet.id];
      const balance = summary ? summary.currentBalance : (Number(wallet.openingBalance) || 0);

      const loc = getLocalizedCurrency(wallet.currencyCode, wallet.currencyCode, undefined, lang);
      const walletCurr = currencies.find(c => c.code === wallet.currencyCode) || {
        code: wallet.currencyCode,
        symbol: loc.symbol || wallet.currencyCode,
        name: loc.name || wallet.currencyCode
      };

      const inBase = convertCurrency(balance, wallet.currencyCode, currency.code, exchangeRates);

      return {
        ...wallet,
        nativeBalance: balance,
        balanceInBase: inBase,
        currencyObj: walletCurr,
      };
    });
  }, [wallets, calculatedBalances, currencies, currency, exchangeRates, lang]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .filter(tx => !tx.isDeleted)
      .filter(tx => !selectedWalletId || tx.walletId === selectedWalletId || tx.destinationWalletId === selectedWalletId)
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const cmp = dateB.localeCompare(dateA);
        if (cmp !== 0) return cmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      })
      .slice(0, 6);
  }, [transactions, selectedWalletId]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 sm:space-y-9 pb-16 font-sans selection:bg-[#D9B978]/20">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: QUIET GREETING & STATUS
      ───────────────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-b border-white/[0.04] pb-5">
        <div className="space-y-1">
          <span className="text-xs font-medium tracking-wide text-[#D9B978] block">
            {greeting.text}، {userName || (isEn ? 'Thari User' : 'مستخدم ثري')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F1EA]">
            {t.comprehensiveFinancialCenter}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-normal">
            {new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date())}
          </span>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. WEALTH HERO: SEPARATION BETWEEN WALLETS & CURRENCIES
      ───────────────────────────────────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#171D24] to-[#11161C] border border-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.25)] space-y-6"
      >
        {/* Selected Wallet Filter Active Notification Banner */}
        {selectedWallet && (
          <div className="flex items-center justify-between bg-gradient-to-r from-[#8EB9A7]/20 via-[#171D24] to-[#171D24] border border-[#8EB9A7]/50 px-4 py-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md ring-2 ring-[#8EB9A7]/40" 
                style={{ backgroundColor: selectedWallet.color || '#8EB9A7' }} 
              />
              <div className="truncate">
                <span className="text-[11px] font-black text-[#8EB9A7] uppercase tracking-wider block">
                  {isEn ? 'Active Single-Wallet View' : 'عرض المحفظة المحددة فقط'}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {selectedWallet.name} <span className="text-xs font-normal text-slate-300">({selectedWalletCurrencyObj.name})</span>
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectWallet(null)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#8EB9A7] text-white hover:text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shrink-0 shadow-sm cursor-pointer"
              title={isEn ? 'Show All Wallets' : 'عرض كافة المحافظ وإلغاء التحديد'}
            >
              <span>{isEn ? 'All Wallets' : 'كافة المحافظ'}</span>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {/* Card Subheader: Title, Currency Switcher (if All Wallets), and Eye Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {selectedWallet 
                  ? (isEn ? `Wallet Balance: ${selectedWallet.name}` : `رصيد المحفظة: ${selectedWallet.name}`)
                  : (currencyViewMode === 'separated' && currencyEntries.length > 1
                      ? (isEn ? 'Independent Currencies' : 'العملات المنفصلة')
                      : t.netWorth)}
              </span>
              <button
                type="button"
                onClick={toggleHideBalances}
                className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-[#D9B978] transition-colors flex items-center gap-1 text-[11px] touch-manipulation cursor-pointer"
                title={hideBalances ? (isEn ? 'Show figures' : 'إظهار الأرقام') : (isEn ? 'Hide figures' : 'إخفاء الأرقام')}
                aria-label={hideBalances ? 'إظهار الأرقام' : 'إخفاء الأرقام'}
              >
                {hideBalances ? <EyeOff size={13} className="text-[#D9B978]" /> : <Eye size={13} />}
                <span className="text-[10px] hidden sm:inline">{hideBalances ? (isEn ? 'Hidden' : 'مخفي') : (isEn ? 'Hide' : 'إخفاء')}</span>
              </button>
            </div>

            {/* Mode Controls: Consolidated vs Separated (when All Wallets) */}
            {!selectedWallet && currencyEntries.length > 1 && (
              <div className="flex items-center bg-[#0D1217] p-1 rounded-xl border border-white/10 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleToggleCurrencyViewMode('consolidated')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currencyViewMode === 'consolidated'
                      ? 'bg-[#D9B978] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isEn ? 'Consolidated total converted to base currency' : 'عرض المجموع الموحد محولاً للعملة الأساسية'}
                >
                  <Layers size={12} />
                  <span>{isEn ? 'Aggregated' : 'مجموع موحد'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCurrencyViewMode('separated')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currencyViewMode === 'separated'
                      ? 'bg-[#D9B978] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={isEn ? 'Separated balances per currency without mixing' : 'فصل العملات المستقلة دون جمع غير متجانس'}
                >
                  <Coins size={12} />
                  <span>{isEn ? 'Separated' : 'فصل العملات'}</span>
                </button>
              </div>
            )}

            {!selectedWallet && growthInfo.rate !== 0 && (
              <div className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                growthInfo.rate > 0 
                  ? 'text-[#8EB9A7] bg-[#8EB9A7]/10' 
                  : 'text-[#C98387] bg-[#C98387]/10'
              }`}>
                {growthInfo.rate > 0 ? <ArrowUp size={12} strokeWidth={2.2} /> : <ArrowDown size={12} strokeWidth={2.2} />}
                <span dir="ltr">{Math.abs(growthInfo.rate)}%</span>
                <span className="text-[10px] font-normal opacity-80">{growthInfo.comparisonText}</span>
              </div>
            )}
          </div>

          {/* DISPLAY CASE 1: SPECIFIC WALLET IS SELECTED */}
          {selectedWallet ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
                <span className={`font-light tracking-tight ${selectedWalletNativeBalance < 0 ? 'text-[#C98387]' : 'text-[#F4F1EA]'} font-numeric break-all text-4xl sm:text-5xl md:text-6xl`}>
                  {displayFinancialValue(selectedWalletNativeBalance)}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#D9B978]">
                  {selectedWalletCurrencyObj.symbol}
                </span>
              </div>
              {selectedWalletCurrencyObj.code !== currency.code && (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-slate-400 font-numeric">
                    ≈ {displayFinancialValue(selectedWalletBalanceInBase)} {currency.symbol} <span className="text-[10px] text-slate-500">({isEn ? 'converted equivalent at current rate' : 'المعادل بالعملة الأساسية'})</span>
                  </p>
                  {onOpenCurrencySelector && (
                    <button
                      type="button"
                      onClick={onOpenCurrencySelector}
                      className="text-[11px] font-bold text-[#D9B978] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Coins size={12} />
                      <span>{isEn ? `Change Base (${currency.code})` : `تغيير الأساس (${currency.code})`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : currencyViewMode === 'separated' && currencyEntries.length > 1 ? (
            /* DISPLAY CASE 2: SEPARATED CURRENCIES VIEW (STRICT NON-MIXING) */
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Coins size={14} className="text-amber-400" />
                  {isEn ? 'Strict Currency Separation Active (No Mixed Totals)' : 'وضع فصل العملات مفعّل: الأرصدة مستقلة تماماً دون جمع غير متجانس'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCurrencyViewMode('consolidated')}
                  className="text-[11px] text-amber-200 underline hover:text-white"
                >
                  {isEn ? 'View Converted Total' : 'عرض المجموع المحول'}
                </button>
              </div>

              {/* Currency Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currencyEntries.map(([code, amt]) => {
                  const loc = getLocalizedCurrency(code, code, undefined, lang);
                  const isNeg = amt < 0;
                  const walletCount = wallets.filter(w => w.currencyCode === code).length;

                  return (
                    <div 
                      key={code} 
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-[#D9B978]/40 transition-all flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center font-bold text-xs shadow-xs">
                            {loc.symbol}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white tracking-wide">{loc.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">{code}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-medium">
                          {walletCount} {isEn ? 'wallets' : 'محافظ'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">
                          {isEn ? 'Current Balance' : 'الرصيد الفعلي'}
                        </span>
                        <div className={`text-xl sm:text-2xl font-bold font-numeric tracking-tight ${isNeg ? 'text-[#C98387]' : 'text-[#8EB9A7]'}`}>
                          {displayFinancialValue(amt)} <span className="text-xs font-normal text-slate-400 ms-1">{loc.symbol}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* DISPLAY CASE 3: CONSOLIDATED GLOBAL TOTAL */
            <div className="space-y-3 pt-1">
              <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
                <span className={`font-light tracking-tight text-[#F4F1EA] font-numeric break-all ${
                  String(Math.round(Math.abs(netWorth || 0))).length > 12
                    ? 'text-2xl sm:text-3xl md:text-4xl'
                    : String(Math.round(Math.abs(netWorth || 0))).length > 8
                    ? 'text-3xl sm:text-4xl md:text-5xl'
                    : 'text-4xl sm:text-5xl md:text-6xl'
                }`}>
                  {displayFinancialValue(netWorth)}
                </span>
                {onOpenCurrencySelector ? (
                  <button
                    type="button"
                    onClick={onOpenCurrencySelector}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-[#D9B978]/15 hover:bg-[#D9B978]/25 border border-[#D9B978]/40 hover:border-[#D9B978] text-[#D9B978] transition-all text-xs font-bold active:scale-95 cursor-pointer shadow-xs group"
                    title={isEn ? `Change base currency (${currency.code})` : `تغيير العملة الأساسية للتطبيق (${currency.code})`}
                  >
                    <span className="text-xl sm:text-2xl font-black">{currency.symbol}</span>
                    <span className="text-xs font-mono opacity-80">{currency.code}</span>
                    <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                  </button>
                ) : (
                  <span className="text-lg sm:text-2xl font-normal text-[#D9B978]">
                    {currency.symbol}
                  </span>
                )}
              </div>

              {/* Currency Pockets Ribbon (when multiple currencies exist in consolidated view) */}
              {currencyEntries.length > 1 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Coins size={12} className="text-[#D9B978]" />
                      {isEn ? 'Currency Pockets (Live Breakdown)' : 'جيوب العملات الفعلية (الأرصدة الأصلية)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleCurrencyViewMode('separated')}
                      className="text-[10px] font-bold text-[#D9B978] hover:underline"
                    >
                      {isEn ? 'Expand All' : 'فصل كبطاقات'}
                    </button>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {currencyEntries.map(([code, amt]) => {
                      const loc = getLocalizedCurrency(code, code, undefined, lang);
                      const isNeg = amt < 0;
                      return (
                        <div
                          key={code}
                          className="shrink-0 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-[#D9B978]/40 transition-all flex items-center gap-2.5 min-w-[110px]"
                        >
                          <span className="w-5 h-5 rounded-md bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center font-bold text-[10px]">
                            {loc.symbol}
                          </span>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">{code}</span>
                            <span className={`text-xs font-bold font-numeric block ${isNeg ? 'text-[#C98387]' : 'text-white'}`}>
                              {displayFinancialValue(amt, true)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Triad Balance Metrics: Adapts based on whether single wallet is selected or all wallets */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-5 border-t border-white/[0.05]">
          
          {selectedWallet ? (
            /* Selected Wallet Metrics: Inflows, Outflows, Net Movement */
            <>
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-1">
                <span className="text-[11px] sm:text-xs font-normal text-slate-400 block truncate">
                  {isEn ? 'Total Inflows' : 'إجمالي الواردات'}
                </span>
                <p className="text-base sm:text-xl font-medium text-[#8EB9A7] font-numeric tracking-tight truncate">
                  {displayFinancialValue(selectedWalletInflows)}
                  <span className="text-[10px] sm:text-xs text-[#8EB9A7]/70 ms-1 font-normal">{selectedWalletCurrencyObj.symbol}</span>
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-1">
                <span className="text-[11px] sm:text-xs font-normal text-slate-400 block truncate">
                  {isEn ? 'Total Outflows' : 'إجمالي المصروفات'}
                </span>
                <p className="text-base sm:text-xl font-medium text-[#C98387] font-numeric tracking-tight truncate">
                  {displayFinancialValue(selectedWalletOutflows)}
                  <span className="text-[10px] sm:text-xs text-[#C98387]/70 ms-1 font-normal">{selectedWalletCurrencyObj.symbol}</span>
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-1">
                <span className="text-[11px] sm:text-xs font-normal text-slate-400 block truncate">
                  {isEn ? 'Net Movement' : 'صافي الحركة'}
                </span>
                <p className={`text-base sm:text-xl font-medium font-numeric tracking-tight truncate ${selectedWalletNetMovement >= 0 ? 'text-[#D9B978]' : 'text-[#C98387]'}`}>
                  {selectedWalletNetMovement >= 0 ? '+' : ''}{displayFinancialValue(selectedWalletNetMovement)}
                  <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-normal">{selectedWalletCurrencyObj.symbol}</span>
                </p>
              </div>
            </>
          ) : (
            /* All Wallets Global Triad: Available, Debts Owed to Me, Debts I Owe */
            <>
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-1">
                <span className="text-[11px] sm:text-xs font-normal text-slate-400 block truncate">
                  {t.availableNow}
                </span>
                <p className="text-base sm:text-xl font-medium text-[#F4F1EA] font-numeric tracking-tight truncate">
                  {displayFinancialValue(availableBalance)}
                  <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-normal">{currency.symbol}</span>
                </p>
              </div>

              <button 
                type="button"
                onClick={() => onOpenDebts('to_me')}
                className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] hover:bg-[#8EB9A7]/5 border border-white/[0.03] hover:border-[#8EB9A7]/20 text-start space-y-1 group transition-all duration-200 active:scale-[0.98] min-h-[48px] cursor-pointer"
              >
                <span className="text-[11px] sm:text-xs font-normal text-slate-400 group-hover:text-[#8EB9A7] transition-colors block truncate">
                  {t.youOweOthers}
                </span>
                <p className="text-base sm:text-xl font-medium text-[#8EB9A7] font-numeric tracking-tight truncate">
                  {displayFinancialValue(debtsOwedToMe)}
                  <span className="text-[10px] sm:text-xs text-[#8EB9A7]/70 ms-1 font-normal">{currency.symbol}</span>
                </p>
              </button>

              <button 
                type="button"
                onClick={() => onOpenDebts('on_me')}
                className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] hover:bg-[#C98387]/5 border border-white/[0.03] hover:border-[#C98387]/20 text-start space-y-1 group transition-all duration-200 active:scale-[0.98] min-h-[48px] cursor-pointer"
              >
                <span className="text-[11px] sm:text-xs font-normal text-slate-400 group-hover:text-[#C98387] transition-colors block truncate">
                  {t.othersOweYou}
                </span>
                <p className="text-base sm:text-xl font-medium text-[#C98387] font-numeric tracking-tight truncate">
                  {displayFinancialValue(debtsIOwe)}
                  <span className="text-[10px] sm:text-xs text-[#C98387]/70 ms-1 font-normal">{currency.symbol}</span>
                </p>
              </button>
            </>
          )}

        </div>
      </motion.section>

      {/* ─────────────────────────────────────────────────────────────
          3. ACTION BAR: CLEAN DIRECT TRIGGERS (THUMB ZONE OPTIMIZED)
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={() => onOpenNewTransaction('expense')}
          className="flex items-center justify-center gap-2 py-4 px-3.5 rounded-2xl bg-[#171D24]/90 hover:bg-[#C98387]/15 border border-white/[0.06] hover:border-[#C98387]/30 text-white/90 hover:text-[#C98387] transition-all duration-200 active:scale-95 active:opacity-80 group text-xs sm:text-sm font-medium shadow-sm min-h-[50px] cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#C98387]/15 flex items-center justify-center text-[#C98387] group-hover:scale-110 transition-transform">
            <ArrowDownLeft size={14} strokeWidth={2.2} />
          </div>
          <span className="truncate">{t.expenses}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenNewTransaction('income')}
          className="flex items-center justify-center gap-2 py-4 px-3.5 rounded-2xl bg-[#171D24]/90 hover:bg-[#8EB9A7]/15 border border-white/[0.06] hover:border-[#8EB9A7]/30 text-white/90 hover:text-[#8EB9A7] transition-all duration-200 active:scale-95 active:opacity-80 group text-xs sm:text-sm font-medium shadow-sm min-h-[50px] cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#8EB9A7]/15 flex items-center justify-center text-[#8EB9A7] group-hover:scale-110 transition-transform">
            <ArrowUpRight size={14} strokeWidth={2.2} />
          </div>
          <span className="truncate">{t.income}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenNewTransaction('transfer')}
          className="flex items-center justify-center gap-2 py-4 px-3.5 rounded-2xl bg-[#171D24]/90 hover:bg-[#759BC8]/15 border border-white/[0.06] hover:border-[#759BC8]/30 text-white/90 hover:text-[#759BC8] transition-all duration-200 active:scale-95 active:opacity-80 group text-xs sm:text-sm font-medium shadow-sm min-h-[50px] cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#759BC8]/15 flex items-center justify-center text-[#759BC8] group-hover:scale-110 transition-transform">
            <ArrowLeftRight size={14} strokeWidth={2.2} />
          </div>
          <span className="truncate">{t.transfer}</span>
        </button>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. WALLETS SECTION (INTERACTIVE SEPARATION & ISOLATION)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.walletsManagement}
            </h2>
            <span className="text-[10px] text-slate-500 font-medium">({wallets.length})</span>
          </div>
          {selectedWalletId && (
            <button
              type="button"
              onClick={() => onSelectWallet(null)}
              className="text-xs text-[#D9B978] hover:underline p-1 min-h-[36px] flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>{t.allWallets}</span>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="divide-y divide-white/[0.04] border-y border-white/[0.05]">
          {walletRows.map(w => {
            const isSelected = selectedWalletId === w.id;
            return (
              <button
                type="button"
                key={w.id}
                onClick={() => onSelectWallet(isSelected ? null : w.id)}
                className={`w-full flex items-center justify-between py-4 px-3.5 hover:bg-white/[0.03] transition-all duration-200 active:scale-[0.99] rounded-2xl text-start min-h-[54px] cursor-pointer ${
                  isSelected 
                    ? 'bg-gradient-to-r from-[#8EB9A7]/15 via-[#171D24] to-[#171D24] border border-[#8EB9A7] ring-1 ring-[#8EB9A7]/40 shadow-sm' 
                    : ''
                }`}
                title={isSelected ? (isEn ? 'Click to show all wallets' : 'انقر لإلغاء التحديد وعرض كافة المحافظ') : (isEn ? 'Click to isolate this wallet' : 'انقر لفصل وعرض هذه المحفظة فقط')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/10" 
                    style={{ backgroundColor: w.color || '#D9B978' }} 
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#F4F1EA] block truncate">
                        {w.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-[#8EB9A7] text-slate-950 font-black px-2 py-0.5 rounded-full shrink-0">
                          {isEn ? 'Active' : 'محددة'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {w.currencyObj.name} ({w.currencyCode})
                    </span>
                  </div>
                </div>

                <div className="text-end shrink-0 ms-3">
                  <div className={`text-sm sm:text-base font-bold font-numeric tracking-tight ${w.nativeBalance < 0 ? 'text-[#C98387]' : 'text-[#8EB9A7]'}`}>
                    {displayFinancialValue(w.nativeBalance, true)}
                    <span className="text-xs text-slate-400 ms-1.5 font-normal">
                      {w.currencyObj.symbol}
                    </span>
                  </div>
                  {w.currencyCode !== currency.code && (
                    <span className={`text-[10px] block font-numeric ${w.balanceInBase < 0 ? 'text-[#C98387]' : 'text-slate-400'}`}>
                      ≈ {displayFinancialValue(w.balanceInBase, true)} {currency.symbol}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. THIS MONTH SUMMARY (SCOPED BY WALLET IF FILTERED)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.monthlyIncome.replace('الدخل الشهري', 'هذا الشهر')}
            </h2>
            {selectedWallet && (
              <span className="text-[10px] text-[#8EB9A7] bg-[#8EB9A7]/10 px-2 py-0.5 rounded-full font-bold">
                {selectedWallet.name}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', { month: 'long', year: 'numeric' }).format(new Date())}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 py-4 px-4 sm:px-6 rounded-2xl bg-[#171D24]/60 border border-white/[0.05]">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-normal">{t.income}</span>
            <div className="text-sm sm:text-base font-semibold text-[#8EB9A7] font-numeric tracking-tight">
              {displayFinancialValue(monthlyIncome, true)}
              <span className="text-[10px] sm:text-xs text-[#8EB9A7]/80 ms-1 font-normal">
                {selectedWallet ? selectedWalletCurrencyObj.symbol : currency.symbol}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-normal">{t.expenses}</span>
            <div className="text-sm sm:text-base font-semibold text-[#C98387] font-numeric tracking-tight">
              {displayFinancialValue(monthlyExpense, true)}
              <span className="text-[10px] sm:text-xs text-[#C98387]/80 ms-1 font-normal">
                {selectedWallet ? selectedWalletCurrencyObj.symbol : currency.symbol}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-normal">{t.net}</span>
            <div className={`text-sm sm:text-base font-semibold font-numeric tracking-tight ${
              monthlyNet >= 0 ? 'text-[#D9B978]' : 'text-[#C98387]'
            }`}>
              {hideBalances ? '••••••' : (monthlyNet >= 0 ? '+' : '') + formatFinancialNumber(monthlyNet, true)}
              <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-normal">
                {selectedWallet ? selectedWalletCurrencyObj.symbol : currency.symbol}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. RECENT TRANSACTIONS (SCOPED TO SELECTED WALLET)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.recentTransactions}
            </h2>
            {selectedWallet && (
              <span className="text-[10px] text-slate-400 font-normal">({selectedWallet.name})</span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAllTransactions}
            className="text-xs text-[#D9B978] hover:text-[#D9B978]/80 transition-colors flex items-center gap-1 font-medium p-1 min-h-[36px] cursor-pointer"
          >
            <span>{t.viewAll}</span>
            {isEn ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-slate-400">{t.noTransactionsYet}</p>
            <button
              type="button"
              onClick={() => onOpenNewTransaction('expense')}
              className="mt-3 text-xs font-medium text-[#D9B978] hover:underline min-h-[44px] inline-flex items-center cursor-pointer"
            >
              {isEn ? 'Record first financial movement' : 'تسجيل أول حركة مالية'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map(tx => {
              const category = categories.find(c => c.id === tx.categoryId);
              const wallet = wallets.find(w => w.id === tx.walletId);
              const isExpense = tx.type === 'expense';
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <SwipeableRow
                  key={tx.id}
                  id={tx.id}
                  onEdit={() => onEditTransaction(tx)}
                  onDelete={() => onDeleteTransaction(tx.id)}
                  onClick={() => onEditTransaction(tx)}
                  editLabel={isEn ? 'Edit' : 'تعديل'}
                  deleteLabel={isEn ? 'Delete' : 'حذف'}
                  className="rounded-2xl"
                >
                  <div
                    className="flex items-center justify-between py-3.5 px-3.5 bg-[#171D24] hover:bg-[#1C242E] border border-white/[0.05] hover:border-[#D9B978]/30 transition-colors duration-150 rounded-2xl cursor-pointer group min-h-[56px]"
                    title="اسحب لليمين/اليسار لتعديل أو حذف المعاملة"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        isIncome 
                          ? 'bg-[#8EB9A7]/15 text-[#8EB9A7]' 
                          : isExpense 
                          ? 'bg-[#C98387]/15 text-[#C98387]' 
                          : 'bg-[#759BC8]/15 text-[#759BC8]'
                      }`}>
                        {isIncome && <ArrowUpRight size={17} />}
                        {isExpense && <ArrowDownLeft size={17} />}
                        {isTransfer && <ArrowLeftRight size={17} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-[#F4F1EA] group-hover:text-[#D9B978] transition-colors block truncate">
                          {tx.note || category?.name || (isTransfer ? (isEn ? 'Transfer between wallets' : 'تحويل بين المحافظ') : (isEn ? 'Financial operation' : 'عملية مالية'))}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="truncate max-w-[100px]">{wallet?.name || t.wallet}</span>
                          <span>•</span>
                          <span className="shrink-0">{tx.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ms-2">
                      <div className="text-end font-numeric">
                        <span className={`text-sm sm:text-base font-semibold ${
                          isIncome 
                            ? 'text-[#8EB9A7]' 
                            : isExpense 
                            ? 'text-[#F4F1EA]' 
                            : 'text-[#759BC8]'
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatFinancialNumber(tx.amount)}
                        </span>
                        <span className="text-xs text-slate-400 ms-1 font-normal">
                          {tx.currency || currency.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </SwipeableRow>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};

export default ElegantDashboard;
