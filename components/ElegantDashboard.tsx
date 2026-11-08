import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
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
  ChevronDown,
  HandCoins,
  PieChart,
  PiggyBank,
  TrendingUp,
  Repeat,
  Scale,
  Plus,
  History,
  Settings as SettingsIcon
} from 'lucide-react';
import { Wallet, Transaction, Category, Currency, Debt } from '../types';
import { convertCurrency } from '../constants';
import { calculateDateBasedGrowth, calculateWalletBalances } from '../services/balanceEngine';
import { getTranslation, getLocalizedCurrency } from '../utils/translations';
import { SwipeableRow } from './SwipeableRow';
import { formatFinancialNumber } from '../utils/formatters';
import { safeAdd, safeSub } from '../utils/mathPrecision';
import { NativeHaptics } from '../services/nativeServices';

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
  onOpenGoals?: () => void;
  onOpenBudgets?: () => void;
  onOpenForecast?: () => void;
  onOpenRecurring?: () => void;
  onOpenZakat?: () => void;
  onOpenSettings?: () => void;
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
  onOpenCurrencySelector,
  onOpenNewTransaction,
  onOpenDebts,
  onOpenAllTransactions,
  onEditTransaction,
  onDeleteTransaction,
  language = 'ar',
  showSeparateCurrencies = false,
  onToggleSeparateCurrencies,
  onOpenGoals,
  onOpenBudgets,
  onOpenForecast,
  onOpenRecurring,
  onOpenZakat,
  onOpenSettings
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
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 font-sans selection:bg-[#D9B978]/20">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: GREETING & QUICK ACTIONS
      ───────────────────────────────────────────────────────────── */}
      <section className="flex items-center justify-between gap-3 pt-1 sm:pt-2 border-b border-white/[0.06] pb-3.5 sm:pb-4">
        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-bold tracking-wide text-[#D9B978] block truncate">
            {greeting.text}، {userName || (isEn ? 'Thari User' : 'مستخدم ثري')}
          </span>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#F4F1EA] truncate">
            {t.comprehensiveFinancialCenter}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-300 font-bold bg-[#171D24] border border-white/10 px-3 py-1.5 rounded-xl">
            {new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
          </span>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. WEALTH HERO CARD: CLEAR BALANCE, CURRENCY & METRICS
      ───────────────────────────────────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="p-4 sm:p-6 md:p-7 rounded-3xl bg-gradient-to-b from-[#171D24] to-[#11161C] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] space-y-5"
      >
        {/* Selected Wallet Filter Active Notification Banner */}
        {selectedWallet && (
          <div className="flex items-center justify-between bg-gradient-to-r from-[#8EB9A7]/20 via-[#171D24] to-[#171D24] border border-[#8EB9A7]/50 px-4 py-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-slate-950 font-black shadow-sm"
                style={{ backgroundColor: selectedWallet.color || '#8EB9A7' }} 
              >
                <WalletIcon size={18} />
              </div>
              <div className="truncate">
                <span className="text-[11px] font-black text-[#8EB9A7] uppercase tracking-wider block">
                  {isEn ? 'Active Single-Wallet View' : 'عرض المحفظة المحددة فقط'}
                </span>
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {selectedWallet.name} <span className="text-xs font-bold text-slate-300">({selectedWalletCurrencyObj.name})</span>
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectWallet(null)}
              className="px-3.5 py-2 rounded-xl bg-[#8EB9A7] text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shrink-0 shadow-sm cursor-pointer"
              title={isEn ? 'Show All Wallets' : 'عرض كافة المحافظ وإلغاء التحديد'}
            >
              <span>{isEn ? 'All Wallets' : 'عرض الكل'}</span>
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Card Subheader: Title, Eye Toggle, and Currency Mode Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-300">
                {selectedWallet 
                  ? (isEn ? `Wallet Balance: ${selectedWallet.name}` : `رصيد المحفظة: ${selectedWallet.name}`)
                  : (currencyViewMode === 'separated' && currencyEntries.length > 1
                      ? (isEn ? 'Independent Currencies' : 'أرصدة العملات المستقلة')
                      : t.netWorth)}
              </span>
              <button
                type="button"
                onClick={toggleHideBalances}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-[#D9B978] transition-colors flex items-center gap-1.5 text-xs font-bold touch-manipulation cursor-pointer"
                title={hideBalances ? (isEn ? 'Show figures' : 'إظهار الأرقام') : (isEn ? 'Hide figures' : 'إخفاء الأرقام')}
                aria-label={hideBalances ? 'إظهار الأرقام' : 'إخفاء الأرقام'}
              >
                {hideBalances ? <EyeOff size={14} className="text-[#D9B978]" /> : <Eye size={14} className="text-[#D9B978]" />}
                <span>{hideBalances ? (isEn ? 'Show' : 'إظهار') : (isEn ? 'Hide' : 'إخفاء')}</span>
              </button>
            </div>

            {/* Mode Controls: Consolidated vs Separated (when All Wallets) */}
            {!selectedWallet && currencyEntries.length > 1 && (
              <div className="flex items-center bg-[#0A0D10] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleToggleCurrencyViewMode('consolidated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    currencyViewMode === 'consolidated'
                      ? 'bg-[#D9B978] text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Layers size={13} />
                  <span>{isEn ? 'Unified' : 'مجموع موحد'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCurrencyViewMode('separated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    currencyViewMode === 'separated'
                      ? 'bg-[#D9B978] text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Coins size={13} />
                  <span>{isEn ? 'Separated' : 'فصل العملات'}</span>
                </button>
              </div>
            )}

            {!selectedWallet && growthInfo.rate !== 0 && (
              <div className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                growthInfo.rate > 0 
                  ? 'text-[#8EB9A7] bg-[#8EB9A7]/10 border-[#8EB9A7]/30' 
                  : 'text-[#C98387] bg-[#C98387]/10 border-[#C98387]/30'
              }`}>
                {growthInfo.rate > 0 ? <ArrowUp size={13} strokeWidth={2.5} /> : <ArrowDown size={13} strokeWidth={2.5} />}
                <span dir="ltr">{Math.abs(growthInfo.rate)}%</span>
                <span className="text-[11px] font-medium opacity-90">{growthInfo.comparisonText}</span>
              </div>
            )}
          </div>

          {/* DISPLAY CASE 1: SPECIFIC WALLET IS SELECTED */}
          {selectedWallet ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`font-black tracking-tight ${selectedWalletNativeBalance < 0 ? 'text-[#C98387]' : 'text-[#F4F1EA]'} font-numeric break-all text-4xl sm:text-5xl md:text-6xl`}>
                  {displayFinancialValue(selectedWalletNativeBalance)}
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#D9B978]">
                  {selectedWalletCurrencyObj.symbol}
                </span>
              </div>
              {selectedWalletCurrencyObj.code !== currency.code && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <p className="text-xs font-bold text-slate-300 font-numeric">
                    ≈ {displayFinancialValue(selectedWalletBalanceInBase)} {currency.symbol} <span className="text-[11px] text-slate-400">({isEn ? 'in base currency' : 'المعادل بالعملة الأساسية'})</span>
                  </p>
                  {onOpenCurrencySelector && (
                    <button
                      type="button"
                      onClick={onOpenCurrencySelector}
                      className="px-2.5 py-1 rounded-lg bg-[#D9B978]/15 border border-[#D9B978]/30 text-xs font-black text-[#D9B978] flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Coins size={13} />
                      <span>{isEn ? `Change Base (${currency.code})` : `تغيير العملة (${currency.code})`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : currencyViewMode === 'separated' && currencyEntries.length > 1 ? (
            /* DISPLAY CASE 2: SEPARATED CURRENCIES VIEW */
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currencyEntries.map(([code, amt]) => {
                  const loc = getLocalizedCurrency(code, code, undefined, lang);
                  const isNeg = amt < 0;
                  const walletCount = wallets.filter(w => w.currencyCode === code).length;

                  return (
                    <div 
                      key={code} 
                      className="p-4 rounded-2xl bg-[#0A0D10]/80 border border-white/10 hover:border-[#D9B978]/40 transition-all flex flex-col justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#D9B978]/20 border border-[#D9B978]/30 text-[#D9B978] flex items-center justify-center font-black text-xs">
                            {loc.symbol}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white">{loc.name}</h4>
                            <span className="text-[11px] text-slate-400 font-mono">{code}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-300 font-bold bg-white/5 px-2 py-0.5 rounded-lg">
                          {walletCount} {isEn ? 'wallets' : 'محافظ'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 font-bold block">
                          {isEn ? 'Current Balance' : 'الرصيد الفعلي'}
                        </span>
                        <div className={`text-xl sm:text-2xl font-black font-numeric tracking-tight ${isNeg ? 'text-[#C98387]' : 'text-[#8EB9A7]'}`}>
                          {displayFinancialValue(amt)} <span className="text-xs font-bold text-slate-300 ms-1">{loc.symbol}</span>
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
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`font-black tracking-tight text-[#F4F1EA] font-numeric break-all ${
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
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#D9B978]/15 hover:bg-[#D9B978]/25 border border-[#D9B978]/50 text-[#D9B978] transition-all text-xs font-black active:scale-95 cursor-pointer shadow-xs"
                    title={isEn ? `Change base currency (${currency.code})` : `تغيير العملة الأساسية للتطبيق (${currency.code})`}
                  >
                    <Coins size={15} />
                    <span className="text-base sm:text-lg font-black">{currency.symbol}</span>
                    <span className="text-xs font-mono opacity-90">({currency.code})</span>
                    <ChevronDown size={14} />
                  </button>
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-[#D9B978]">
                    {currency.symbol}
                  </span>
                )}
              </div>

              {/* Currency Pockets Ribbon (when multiple currencies exist in consolidated view) */}
              {currencyEntries.length > 1 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Coins size={14} className="text-[#D9B978]" />
                      {isEn ? 'Actual Balances by Currency' : 'الأرصدة الفعلية حسب كل عملة'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleCurrencyViewMode('separated')}
                      className="text-xs font-black text-[#D9B978] hover:underline cursor-pointer"
                    >
                      {isEn ? 'Separate Currencies' : 'فصل العملات كبطاقات'}
                    </button>
                  </div>
                  
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {currencyEntries.map(([code, amt]) => {
                      const loc = getLocalizedCurrency(code, code, undefined, lang);
                      const isNeg = amt < 0;
                      return (
                        <div
                          key={code}
                          className="shrink-0 px-3.5 py-2.5 rounded-2xl bg-[#0A0D10]/70 border border-white/10 flex items-center gap-2.5 min-w-[125px]"
                        >
                          <span className="w-7 h-7 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 text-[#D9B978] flex items-center justify-center font-black text-xs">
                            {loc.symbol}
                          </span>
                          <div>
                            <span className="text-[11px] text-slate-300 font-bold block">{loc.name}</span>
                            <span className={`text-xs sm:text-sm font-black font-numeric block ${isNeg ? 'text-[#C98387]' : 'text-white'}`}>
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

        {/* Triad Balance Metrics with Clear Icons */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-4 border-t border-white/10">
          {selectedWallet ? (
            <>
              <div className="p-3 sm:p-4 rounded-2xl bg-[#0A0D10]/60 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#8EB9A7]">
                  <ArrowUpRight size={15} strokeWidth={2.5} className="shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate">
                    {isEn ? 'Inflows' : 'إجمالي الواردات'}
                  </span>
                </div>
                <p className="text-sm sm:text-lg font-black text-[#8EB9A7] font-numeric tracking-tight truncate">
                  {displayFinancialValue(selectedWalletInflows, true)}
                  <span className="text-[10px] sm:text-xs text-[#8EB9A7]/80 ms-1 font-bold">{selectedWalletCurrencyObj.symbol}</span>
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-[#0A0D10]/60 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#C98387]">
                  <ArrowDownLeft size={15} strokeWidth={2.5} className="shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate">
                    {isEn ? 'Outflows' : 'إجمالي المصروفات'}
                  </span>
                </div>
                <p className="text-sm sm:text-lg font-black text-[#C98387] font-numeric tracking-tight truncate">
                  {displayFinancialValue(selectedWalletOutflows, true)}
                  <span className="text-[10px] sm:text-xs text-[#C98387]/80 ms-1 font-bold">{selectedWalletCurrencyObj.symbol}</span>
                </p>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-[#0A0D10]/60 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#D9B978]">
                  <TrendingUp size={15} strokeWidth={2.5} className="shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate">
                    {isEn ? 'Net Flow' : 'صافي الحركة'}
                  </span>
                </div>
                <p className={`text-sm sm:text-lg font-black font-numeric tracking-tight truncate ${selectedWalletNetMovement >= 0 ? 'text-[#D9B978]' : 'text-[#C98387]'}`}>
                  {selectedWalletNetMovement >= 0 ? '+' : ''}{displayFinancialValue(selectedWalletNetMovement, true)}
                  <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-bold">{selectedWalletCurrencyObj.symbol}</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 sm:p-4 rounded-2xl bg-[#0A0D10]/60 border border-white/10 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#D9B978]">
                  <WalletIcon size={15} strokeWidth={2.3} className="shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate">
                    {t.availableNow}
                  </span>
                </div>
                <p className="text-sm sm:text-lg font-black text-[#F4F1EA] font-numeric tracking-tight truncate">
                  {displayFinancialValue(availableBalance, true)}
                  <span className="text-[10px] sm:text-xs text-[#D9B978] ms-1 font-bold">{currency.symbol}</span>
                </p>
              </div>

              <button 
                type="button"
                onClick={() => onOpenDebts('to_me')}
                className="p-3 sm:p-4 rounded-2xl bg-[#0A0D10]/60 hover:bg-[#8EB9A7]/15 border border-white/10 hover:border-[#8EB9A7]/40 text-start space-y-1.5 group transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[#8EB9A7] min-w-0">
                    <HandCoins size={15} strokeWidth={2.3} className="shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold text-slate-300 group-hover:text-white truncate">
                      {t.youOweOthers}
                    </span>
                  </div>
                  {isEn ? <ChevronRight size={13} className="text-slate-500 shrink-0" /> : <ChevronLeft size={13} className="text-slate-500 shrink-0" />}
                </div>
                <p className="text-sm sm:text-lg font-black text-[#8EB9A7] font-numeric tracking-tight truncate">
                  {displayFinancialValue(debtsOwedToMe, true)}
                  <span className="text-[10px] sm:text-xs text-[#8EB9A7]/80 ms-1 font-bold">{currency.symbol}</span>
                </p>
              </button>

              <button 
                type="button"
                onClick={() => onOpenDebts('on_me')}
                className="p-3 sm:p-4 rounded-2xl bg-[#0A0D10]/60 hover:bg-[#C98387]/15 border border-white/10 hover:border-[#C98387]/40 text-start space-y-1.5 group transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-[#C98387] min-w-0">
                    <HandCoins size={15} strokeWidth={2.3} className="shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold text-slate-300 group-hover:text-white truncate">
                      {t.othersOweYou}
                    </span>
                  </div>
                  {isEn ? <ChevronRight size={13} className="text-slate-500 shrink-0" /> : <ChevronLeft size={13} className="text-slate-500 shrink-0" />}
                </div>
                <p className="text-sm sm:text-lg font-black text-[#C98387] font-numeric tracking-tight truncate">
                  {displayFinancialValue(debtsIOwe, true)}
                  <span className="text-[10px] sm:text-xs text-[#C98387]/80 ms-1 font-bold">{currency.symbol}</span>
                </p>
              </button>
            </>
          )}
        </div>
      </motion.section>

      {/* ─────────────────────────────────────────────────────────────
          3. PRIMARY OPERATIONS: PROMINENT ACTION BUTTONS WITH CLEAR ICONS
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2">
            <Plus size={16} className="text-[#D9B978]" strokeWidth={2.5} />
            <span>{isEn ? 'Quick Financial Operations' : 'العمليات المالية السريعة'}</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-bold">
            {isEn ? 'Tap to record immediately' : 'اختر نوع العملية للتسجيل الفوري'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {/* Expense Button */}
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              onOpenNewTransaction('expense');
            }}
            className="flex flex-col sm:flex-row items-center sm:justify-start gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#171D24] hover:bg-[#C98387]/15 border border-[#C98387]/35 hover:border-[#C98387] text-white transition-all duration-150 active:scale-95 group shadow-md cursor-pointer text-center sm:text-start"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#C98387]/20 border border-[#C98387]/40 flex items-center justify-center text-[#C98387] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <ArrowDownLeft size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#C98387] block truncate">
                {isEn ? 'Record Expense' : 'تسجيل مصروف'}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 hidden xs:block truncate mt-0.5">
                {isEn ? 'Deduct from wallet' : 'خصم من المحفظة'}
              </span>
            </div>
          </button>

          {/* Income Button */}
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              onOpenNewTransaction('income');
            }}
            className="flex flex-col sm:flex-row items-center sm:justify-start gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#171D24] hover:bg-[#8EB9A7]/15 border border-[#8EB9A7]/35 hover:border-[#8EB9A7] text-white transition-all duration-150 active:scale-95 group shadow-md cursor-pointer text-center sm:text-start"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#8EB9A7]/20 border border-[#8EB9A7]/40 flex items-center justify-center text-[#8EB9A7] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <ArrowUpRight size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#8EB9A7] block truncate">
                {isEn ? 'Record Income' : 'تسجيل دخل'}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 hidden xs:block truncate mt-0.5">
                {isEn ? 'Add to wallet' : 'إيداع في المحفظة'}
              </span>
            </div>
          </button>

          {/* Transfer Button */}
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              onOpenNewTransaction('transfer');
            }}
            className="flex flex-col sm:flex-row items-center sm:justify-start gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#171D24] hover:bg-[#759BC8]/15 border border-[#759BC8]/35 hover:border-[#759BC8] text-white transition-all duration-150 active:scale-95 group shadow-md cursor-pointer text-center sm:text-start"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#759BC8]/20 border border-[#759BC8]/40 flex items-center justify-center text-[#759BC8] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <ArrowLeftRight size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#759BC8] block truncate">
                {isEn ? 'Transfer Funds' : 'تحويل محفظة'}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 hidden xs:block truncate mt-0.5">
                {isEn ? 'Between wallets' : 'نقل وصرف عملات'}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. IMPORTANT OPTIONS & TOOLS GRID (الخيارات والأدوات المهمة)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-black text-slate-200 flex items-center gap-2">
            <Layers size={16} className="text-[#D9B978]" strokeWidth={2.3} />
            <span>{isEn ? 'Important Options & Financial Tools' : 'الخيارات والأدوات المهمة'}</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-bold">
            {isEn ? 'Direct access' : 'وصول سريع ومباشر'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Option 1: Debts Manager */}
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              onOpenDebts('all');
            }}
            className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141A21] hover:bg-[#1B232D] border border-white/10 hover:border-[#D9B978]/50 text-start transition-all duration-150 active:scale-[0.98] group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shrink-0 group-hover:scale-105 transition-transform">
                <HandCoins size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#D9B978] block truncate">
                  {isEn ? 'Debts & Dues' : 'الديون والالتزامات'}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate mt-0.5">
                  {isEn ? 'Track & settle debts' : 'ديون لك وعليك والسداد'}
                </span>
              </div>
            </div>
            {isEn ? <ChevronRight size={15} className="text-slate-500 group-hover:text-[#D9B978] shrink-0" /> : <ChevronLeft size={15} className="text-slate-500 group-hover:text-[#D9B978] shrink-0" />}
          </button>

          {/* Option 2: Monthly Budgets */}
          {onOpenBudgets && (
            <button
              type="button"
              onClick={() => {
                NativeHaptics.selection().catch(() => {});
                onOpenBudgets();
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141A21] hover:bg-[#1B232D] border border-white/10 hover:border-[#759BC8]/50 text-start transition-all duration-150 active:scale-[0.98] group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#759BC8]/15 border border-[#759BC8]/30 flex items-center justify-center text-[#759BC8] shrink-0 group-hover:scale-105 transition-transform">
                  <PieChart size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#759BC8] block truncate">
                    {isEn ? 'Monthly Budgets' : 'الميزانية الشهرية'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate mt-0.5">
                    {isEn ? 'Spending limits' : 'سقوف الصرف والتنبيهات'}
                  </span>
                </div>
              </div>
              {isEn ? <ChevronRight size={15} className="text-slate-500 group-hover:text-[#759BC8] shrink-0" /> : <ChevronLeft size={15} className="text-slate-500 group-hover:text-[#759BC8] shrink-0" />}
            </button>
          )}

          {/* Option 3: Savings Goals */}
          {onOpenGoals && (
            <button
              type="button"
              onClick={() => {
                NativeHaptics.selection().catch(() => {});
                onOpenGoals();
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141A21] hover:bg-[#1B232D] border border-white/10 hover:border-[#8EB9A7]/50 text-start transition-all duration-150 active:scale-[0.98] group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#8EB9A7]/15 border border-[#8EB9A7]/30 flex items-center justify-center text-[#8EB9A7] shrink-0 group-hover:scale-105 transition-transform">
                  <PiggyBank size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#8EB9A7] block truncate">
                    {isEn ? 'Savings Goals' : 'الأهداف والادخار'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate mt-0.5">
                    {isEn ? 'Target funds' : 'خطط التوفير والطوارئ'}
                  </span>
                </div>
              </div>
              {isEn ? <ChevronRight size={15} className="text-slate-500 group-hover:text-[#8EB9A7] shrink-0" /> : <ChevronLeft size={15} className="text-slate-500 group-hover:text-[#8EB9A7] shrink-0" />}
            </button>
          )}

          {/* Option 4: Cashflow & Planning */}
          {onOpenForecast && (
            <button
              type="button"
              onClick={() => {
                NativeHaptics.selection().catch(() => {});
                onOpenForecast();
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141A21] hover:bg-[#1B232D] border border-white/10 hover:border-[#D9B978]/50 text-start transition-all duration-150 active:scale-[0.98] group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#D9B978] block truncate">
                    {isEn ? 'Cashflow Planning' : 'التخطيط والسيولة'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate mt-0.5">
                    {isEn ? 'Future forecast' : 'توقعات الرصيد المستقبلي'}
                  </span>
                </div>
              </div>
              {isEn ? <ChevronRight size={15} className="text-slate-500 group-hover:text-[#D9B978] shrink-0" /> : <ChevronLeft size={15} className="text-slate-500 group-hover:text-[#D9B978] shrink-0" />}
            </button>
          )}

          {/* Option 5: Recurring Rules */}
          {onOpenRecurring && (
            <button
              type="button"
              onClick={() => {
                NativeHaptics.selection().catch(() => {});
                onOpenRecurring();
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141A21] hover:bg-[#1B232D] border border-white/10 hover:border-[#8EB9A7]/50 text-start transition-all duration-150 active:scale-[0.98] group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#8EB9A7]/15 border border-[#8EB9A7]/30 flex items-center justify-center text-[#8EB9A7] shrink-0 group-hover:scale-105 transition-transform">
                  <Repeat size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-[#8EB9A7] block truncate">
                    {isEn ? 'Recurring Rules' : 'العمليات الدورية'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate mt-0.5">
                    {isEn ? 'Automated bills' : 'رواتب والتزامات مجدولة'}
                  </span>
                </div>
              </div>
              {isEn ? <ChevronRight size={15} className="text-slate-500 group-hover:text-[#8EB9A7] shrink-0" /> : <ChevronLeft size={15} className="text-slate-500 group-hover:text-[#8EB9A7] shrink-0" />}
            </button>
          )}

          {/* Option 6: Zakat Calculator */}
          {onOpenZakat && (
            <button
              type="button"
              onClick={() => {
                NativeHaptics.selection().catch(() => {});
                onOpenZakat();
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#141A21] hover:bg-[#1B232D] border border-white/10 hover:border-emerald-400/50 text-start transition-all duration-150 active:scale-[0.98] group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Scale size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 block truncate">
                    {isEn ? 'Zakat Calculator' : 'حاسبة الزكاة'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate mt-0.5">
                    {isEn ? 'Sharia calculation' : 'حساب النصاب والزكاة'}
                  </span>
                </div>
              </div>
              {isEn ? <ChevronRight size={15} className="text-slate-500 group-hover:text-emerald-400 shrink-0" /> : <ChevronLeft size={15} className="text-slate-500 group-hover:text-emerald-400 shrink-0" />}
            </button>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. WALLETS SECTION: TACTILE CARDS WITH CLEAR ICONS
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <WalletIcon size={16} className="text-[#D9B978]" strokeWidth={2.3} />
            <h2 className="text-xs sm:text-sm font-black text-slate-200">
              {t.walletsManagement}
            </h2>
            <span className="text-xs text-slate-400 font-bold">({wallets.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedWalletId && (
              <button
                type="button"
                onClick={() => onSelectWallet(null)}
                className="px-2.5 py-1.5 rounded-xl bg-[#8EB9A7]/15 border border-[#8EB9A7]/40 text-xs text-[#8EB9A7] flex items-center gap-1 font-black cursor-pointer active:scale-95"
              >
                <span>{t.allWallets}</span>
                <X size={13} />
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-slate-300 hover:text-[#D9B978] flex items-center gap-1.5 font-bold cursor-pointer active:scale-95"
              >
                <SettingsIcon size={13} className="text-[#D9B978]" />
                <span>{isEn ? 'Manage Wallets' : 'إدارة المحافظ'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {walletRows.map(w => {
            const isSelected = selectedWalletId === w.id;
            return (
              <button
                type="button"
                key={w.id}
                onClick={() => onSelectWallet(isSelected ? null : w.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-150 active:scale-[0.99] text-start cursor-pointer border ${
                  isSelected 
                    ? 'bg-gradient-to-r from-[#8EB9A7]/20 via-[#171D24] to-[#171D24] border-[#8EB9A7] ring-1 ring-[#8EB9A7]/40 shadow-md' 
                    : 'bg-[#141A21] hover:bg-[#1A222C] border-white/10 hover:border-[#D9B978]/40'
                }`}
                title={isSelected ? (isEn ? 'Click to show all wallets' : 'انقر لإلغاء التحديد وعرض كافة المحافظ') : (isEn ? 'Click to isolate this wallet' : 'انقر لفصل وعرض هذه المحفظة فقط')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-slate-950 shadow-xs" 
                    style={{ backgroundColor: w.color || '#D9B978' }} 
                  >
                    <WalletIcon size={18} strokeWidth={2.4} />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#F4F1EA] block truncate">
                        {w.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-[#8EB9A7] text-slate-950 font-black px-2 py-0.5 rounded-lg shrink-0">
                          {isEn ? 'Selected' : 'محددة'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-bold">
                      {w.currencyObj.name} ({w.currencyCode})
                    </span>
                  </div>
                </div>

                <div className="text-end shrink-0 ms-3">
                  <div className={`text-sm sm:text-base font-black font-numeric tracking-tight ${w.nativeBalance < 0 ? 'text-[#C98387]' : 'text-[#8EB9A7]'}`}>
                    {displayFinancialValue(w.nativeBalance, true)}
                    <span className="text-xs text-slate-300 ms-1 font-bold">
                      {w.currencyObj.symbol}
                    </span>
                  </div>
                  {w.currencyCode !== currency.code && (
                    <span className={`text-[11px] block font-numeric font-bold ${w.balanceInBase < 0 ? 'text-[#C98387]' : 'text-slate-400'}`}>
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
          6. THIS MONTH SUMMARY (SCOPED BY WALLET IF FILTERED)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-black text-slate-200">
              {isEn ? 'This Month Summary' : 'ملخص حركة هذا الشهر'}
            </h2>
            {selectedWallet && (
              <span className="text-[11px] text-[#8EB9A7] bg-[#8EB9A7]/15 border border-[#8EB9A7]/30 px-2.5 py-0.5 rounded-lg font-black">
                {selectedWallet.name}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', { month: 'long', year: 'numeric' }).format(new Date())}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#141A21] border border-white/10">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <ArrowUpRight size={14} className="text-[#8EB9A7]" />
              <span>{t.income}</span>
            </span>
            <div className="text-sm sm:text-lg font-black text-[#8EB9A7] font-numeric tracking-tight">
              {displayFinancialValue(monthlyIncome, true)}
              <span className="text-[10px] sm:text-xs text-[#8EB9A7]/80 ms-1 font-bold">
                {selectedWallet ? selectedWalletCurrencyObj.symbol : currency.symbol}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <ArrowDownLeft size={14} className="text-[#C98387]" />
              <span>{t.expenses}</span>
            </span>
            <div className="text-sm sm:text-lg font-black text-[#C98387] font-numeric tracking-tight">
              {displayFinancialValue(monthlyExpense, true)}
              <span className="text-[10px] sm:text-xs text-[#C98387]/80 ms-1 font-bold">
                {selectedWallet ? selectedWalletCurrencyObj.symbol : currency.symbol}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <TrendingUp size={14} className="text-[#D9B978]" />
              <span>{t.net}</span>
            </span>
            <div className={`text-sm sm:text-lg font-black font-numeric tracking-tight ${
              monthlyNet >= 0 ? 'text-[#D9B978]' : 'text-[#C98387]'
            }`}>
              {hideBalances ? '••••••' : (monthlyNet >= 0 ? '+' : '') + formatFinancialNumber(monthlyNet, true)}
              <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-bold">
                {selectedWallet ? selectedWalletCurrencyObj.symbol : currency.symbol}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. RECENT TRANSACTIONS (WITH CLEAR ICONS & ACTION BUTTONS)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#D9B978]" strokeWidth={2.3} />
            <h2 className="text-xs sm:text-sm font-black text-slate-200">
              {t.recentTransactions}
            </h2>
            {selectedWallet && (
              <span className="text-xs text-slate-400 font-bold">({selectedWallet.name})</span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAllTransactions}
            className="px-3 py-1.5 rounded-xl bg-[#D9B978]/15 hover:bg-[#D9B978]/25 border border-[#D9B978]/30 text-xs text-[#D9B978] transition-colors flex items-center gap-1 font-black cursor-pointer active:scale-95"
          >
            <span>{t.viewAll}</span>
            {isEn ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/15 rounded-2xl bg-[#141A21]/50">
            <p className="text-xs sm:text-sm font-bold text-slate-400">{t.noTransactionsYet}</p>
            <button
              type="button"
              onClick={() => onOpenNewTransaction('expense')}
              className="mt-3 px-4 py-2.5 rounded-xl bg-[#D9B978] text-slate-950 text-xs font-black inline-flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{isEn ? 'Record first operation' : 'تسجيل أول عملية مالية'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
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
                    className="flex items-center justify-between py-3.5 px-3.5 sm:px-4 bg-[#141A21] hover:bg-[#1A222C] border border-white/10 hover:border-[#D9B978]/40 transition-colors duration-150 rounded-2xl cursor-pointer group min-h-[60px]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isIncome 
                          ? 'bg-[#8EB9A7]/15 text-[#8EB9A7] border-[#8EB9A7]/30' 
                          : isExpense 
                          ? 'bg-[#C98387]/15 text-[#C98387] border-[#C98387]/30' 
                          : 'bg-[#759BC8]/15 text-[#759BC8] border-[#759BC8]/30'
                      }`}>
                        {isIncome && <ArrowUpRight size={19} strokeWidth={2.4} />}
                        {isExpense && <ArrowDownLeft size={19} strokeWidth={2.4} />}
                        {isTransfer && <ArrowLeftRight size={19} strokeWidth={2.4} />}
                        {!isIncome && !isExpense && !isTransfer && <WalletIcon size={18} strokeWidth={2.2} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-black text-[#F4F1EA] group-hover:text-[#D9B978] transition-colors block truncate">
                          {tx.note || category?.name || (isTransfer ? (isEn ? 'Transfer between wallets' : 'تحويل بين المحافظ') : (isEn ? 'Financial operation' : 'عملية مالية'))}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mt-0.5">
                          <span className="truncate max-w-[110px]">{wallet?.name || t.wallet}</span>
                          <span>•</span>
                          <span className="shrink-0">{tx.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ms-2">
                      <div className="text-end font-numeric">
                        <span className={`text-sm sm:text-base font-black ${
                          isIncome 
                            ? 'text-[#8EB9A7]' 
                            : isExpense 
                            ? 'text-[#C98387]' 
                            : 'text-[#759BC8]'
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatFinancialNumber(tx.amount)}
                        </span>
                        <span className="text-xs text-slate-300 ms-1 font-bold">
                          {tx.currency || currency.symbol}
                        </span>
                      </div>

                      {/* Explicit Edit / Delete Quick Buttons for Clear Visibility */}
                      <div className="flex items-center gap-1 ps-1 border-s border-white/10" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#D9B978]/20 text-slate-300 hover:text-[#D9B978] transition-colors active:scale-90 cursor-pointer"
                          title={isEn ? 'Edit' : 'تعديل'}
                          aria-label={isEn ? 'Edit' : 'تعديل'}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors active:scale-90 cursor-pointer"
                          title={isEn ? 'Delete' : 'حذف'}
                          aria-label={isEn ? 'Delete' : 'حذف'}
                        >
                          <Trash2 size={14} />
                        </button>
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

export default React.memo(ElegantDashboard);
