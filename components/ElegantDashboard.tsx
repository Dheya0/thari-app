import React, { useMemo } from 'react';
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
  Trash2
} from 'lucide-react';
import { Wallet, Transaction, Category, Currency, Debt } from '../types';
import { convertCurrency } from '../constants';
import { calculateDateBasedGrowth, calculateWalletBalances } from '../services/balanceEngine';
import { getTranslation } from '../utils/translations';
import { SwipeableRow } from './SwipeableRow';

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
  onOpenNewTransaction: (type?: 'expense' | 'income' | 'transfer' | 'adjustment') => void;
  onOpenDebts: () => void;
  onOpenAllTransactions: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  language?: 'ar' | 'en';
}

export const formatFinancialNumber = (num: number | string | undefined | null, useCompact: boolean = false): string => {
  const parsed = typeof num === 'number' ? num : parseFloat(String(num ?? 0));
  if (isNaN(parsed)) return '0';

  const sign = parsed < 0 ? '-' : '';
  const safeNum = Math.abs(parsed);

  if (useCompact) {
    if (safeNum >= 1_000_000_000) {
      const val = safeNum / 1_000_000_000;
      return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'B';
    }
    if (safeNum >= 1_000_000) {
      const val = safeNum / 1_000_000;
      return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + 'M';
    }
    if (safeNum >= 10_000) {
      const val = safeNum / 1_000;
      return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(0)) + 'K';
    }
  }

  return sign + Math.round(safeNum).toLocaleString('en-US');
};

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
  onOpenNewTransaction,
  onOpenDebts,
  onOpenAllTransactions,
  onEditTransaction,
  onDeleteTransaction,
  language = 'ar'
}) => {
  const lang = language || 'ar';
  const t = getTranslation(lang);
  const greeting = getGreeting(lang);
  const isEn = lang === 'en';

  const growthInfo = useMemo(() => {
    return calculateDateBasedGrowth(transactions, currency.code, exchangeRates);
  }, [transactions, currency.code, exchangeRates]);

  const calculatedBalances = useMemo(() => {
    return calculateWalletBalances(wallets, transactions, exchangeRates);
  }, [wallets, transactions, exchangeRates]);

  const currencyBalances = useMemo(() => {
    return calculatedBalances.currencyBalances || {};
  }, [calculatedBalances]);

  const walletRows = useMemo(() => {
    const balanceMap = calculatedBalances.walletBalances || {};
    return wallets.map(wallet => {
      const balance = balanceMap[wallet.id] ?? (Number(wallet.openingBalance) || 0);

      const walletCurr = currencies.find(c => c.code === wallet.currencyCode) || {
        code: wallet.currencyCode,
        symbol: wallet.currencyCode,
        name: wallet.currencyCode
      };

      const inBase = convertCurrency(balance, wallet.currencyCode, currency.code, exchangeRates);

      return {
        ...wallet,
        nativeBalance: balance,
        balanceInBase: inBase,
        currencyObj: walletCurr,
      };
    });
  }, [wallets, calculatedBalances, currencies, currency, exchangeRates]);

  const recentTransactions = useMemo(() => {
    return transactions
      .filter(tx => !tx.isDeleted)
      .filter(tx => !selectedWalletId || tx.walletId === selectedWalletId || tx.destinationWalletId === selectedWalletId)
      .slice(0, 5);
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
          2. WEALTH HERO: THE MONUMENTAL NUMBER & TRIAD METRICS
      ───────────────────────────────────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#171D24] to-[#11161C] border border-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.25)] space-y-6"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {t.netWorth}
            </span>
            {growthInfo.rate !== 0 && (
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

          <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
            <span className={`font-light tracking-tight text-[#F4F1EA] font-numeric break-all ${
              String(Math.round(Math.abs(netWorth || 0))).length > 12
                ? 'text-2xl sm:text-3xl md:text-4xl'
                : String(Math.round(Math.abs(netWorth || 0))).length > 8
                ? 'text-3xl sm:text-4xl md:text-5xl'
                : 'text-4xl sm:text-5xl md:text-6xl'
            }`}>
              {formatFinancialNumber(netWorth)}
            </span>
            <span className="text-lg sm:text-2xl font-normal text-[#D9B978]">
              {currency.symbol}
            </span>
          </div>
        </div>

        {/* Triad Balance Metrics: Available, Receivable, Payable */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-5 border-t border-white/[0.05]">
          
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-1">
            <span className="text-[11px] sm:text-xs font-normal text-slate-400 block truncate">
              {t.availableNow}
            </span>
            <p className="text-base sm:text-xl font-medium text-[#F4F1EA] font-numeric tracking-tight truncate">
              {formatFinancialNumber(availableBalance)}
              <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-normal">{currency.symbol}</span>
            </p>
          </div>

          <button 
            onClick={onOpenDebts}
            className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] hover:bg-[#8EB9A7]/5 border border-white/[0.03] hover:border-[#8EB9A7]/20 text-start space-y-1 group transition-all duration-200 active:scale-[0.98] min-h-[48px]"
          >
            <span className="text-[11px] sm:text-xs font-normal text-slate-400 group-hover:text-[#8EB9A7] transition-colors block truncate">
              {t.youOweOthers}
            </span>
            <p className="text-base sm:text-xl font-medium text-[#8EB9A7] font-numeric tracking-tight truncate">
              {formatFinancialNumber(debtsOwedToMe)}
              <span className="text-[10px] sm:text-xs text-[#8EB9A7]/70 ms-1 font-normal">{currency.symbol}</span>
            </p>
          </button>

          <button 
            onClick={onOpenDebts}
            className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] hover:bg-[#C98387]/5 border border-white/[0.03] hover:border-[#C98387]/20 text-start space-y-1 group transition-all duration-200 active:scale-[0.98] min-h-[48px]"
          >
            <span className="text-[11px] sm:text-xs font-normal text-slate-400 group-hover:text-[#C98387] transition-colors block truncate">
              {t.othersOweYou}
            </span>
            <p className="text-base sm:text-xl font-medium text-[#C98387] font-numeric tracking-tight truncate">
              {formatFinancialNumber(debtsIOwe)}
              <span className="text-[10px] sm:text-xs text-[#C98387]/70 ms-1 font-normal">{currency.symbol}</span>
            </p>
          </button>

        </div>
      </motion.section>

      {/* ─────────────────────────────────────────────────────────────
          3. ACTION BAR: CLEAN DIRECT TRIGGERS (THUMB ZONE OPTIMIZED)
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <button
          onClick={() => onOpenNewTransaction('expense')}
          className="flex items-center justify-center gap-2 py-4 px-3.5 rounded-2xl bg-[#171D24]/90 hover:bg-[#C98387]/15 border border-white/[0.06] hover:border-[#C98387]/30 text-white/90 hover:text-[#C98387] transition-all duration-200 active:scale-95 active:opacity-80 group text-xs sm:text-sm font-medium shadow-sm min-h-[50px]"
        >
          <div className="w-6 h-6 rounded-full bg-[#C98387]/15 flex items-center justify-center text-[#C98387] group-hover:scale-110 transition-transform">
            <ArrowDownLeft size={14} strokeWidth={2.2} />
          </div>
          <span className="truncate">{t.expenses}</span>
        </button>

        <button
          onClick={() => onOpenNewTransaction('income')}
          className="flex items-center justify-center gap-2 py-4 px-3.5 rounded-2xl bg-[#171D24]/90 hover:bg-[#8EB9A7]/15 border border-white/[0.06] hover:border-[#8EB9A7]/30 text-white/90 hover:text-[#8EB9A7] transition-all duration-200 active:scale-95 active:opacity-80 group text-xs sm:text-sm font-medium shadow-sm min-h-[50px]"
        >
          <div className="w-6 h-6 rounded-full bg-[#8EB9A7]/15 flex items-center justify-center text-[#8EB9A7] group-hover:scale-110 transition-transform">
            <ArrowUpRight size={14} strokeWidth={2.2} />
          </div>
          <span className="truncate">{t.income}</span>
        </button>

        <button
          onClick={() => onOpenNewTransaction('transfer')}
          className="flex items-center justify-center gap-2 py-4 px-3.5 rounded-2xl bg-[#171D24]/90 hover:bg-[#759BC8]/15 border border-white/[0.06] hover:border-[#759BC8]/30 text-white/90 hover:text-[#759BC8] transition-all duration-200 active:scale-95 active:opacity-80 group text-xs sm:text-sm font-medium shadow-sm min-h-[50px]"
        >
          <div className="w-6 h-6 rounded-full bg-[#759BC8]/15 flex items-center justify-center text-[#759BC8] group-hover:scale-110 transition-transform">
            <ArrowLeftRight size={14} strokeWidth={2.2} />
          </div>
          <span className="truncate">{t.transfer}</span>
        </button>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. WALLETS SECTION
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.walletsManagement}
          </h2>
          {selectedWalletId && (
            <button
              onClick={() => onSelectWallet(null)}
              className="text-xs text-[#D9B978] hover:underline p-1 min-h-[36px] flex items-center"
            >
              {t.allWallets}
            </button>
          )}
        </div>

        <div className="divide-y divide-white/[0.04] border-y border-white/[0.05]">
          {walletRows.map(w => {
            const isSelected = selectedWalletId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => onSelectWallet(isSelected ? null : w.id)}
                className={`w-full flex items-center justify-between py-4 px-3 hover:bg-white/[0.03] transition-all duration-200 active:scale-[0.99] rounded-xl text-start min-h-[52px] ${
                  isSelected ? 'bg-[#D9B978]/[0.08] border-s-2 border-[#D9B978]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                    style={{ backgroundColor: w.color || '#D9B978' }} 
                  />
                  <div>
                    <span className="text-sm font-medium text-[#F4F1EA] block">
                      {w.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {w.currencyObj.name}
                    </span>
                  </div>
                </div>

                <div className="text-end">
                  <div className={`text-sm sm:text-base font-medium font-numeric tracking-tight ${w.nativeBalance < 0 ? 'text-[#C98387]' : 'text-[#8EB9A7]'}`}>
                    {formatFinancialNumber(w.nativeBalance, true)}
                    <span className="text-xs text-slate-400 ms-1.5 font-normal">
                      {w.currencyObj.symbol}
                    </span>
                  </div>
                  {w.currencyCode !== currency.code && (
                    <span className={`text-[10px] block font-numeric ${w.balanceInBase < 0 ? 'text-[#C98387]' : 'text-slate-400'}`}>
                      ≈ {formatFinancialNumber(w.balanceInBase, true)} {currency.symbol}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. THIS MONTH SUMMARY
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.monthlyIncome.replace('الدخل الشهري', 'هذا الشهر')}
          </h2>
          <span className="text-xs text-slate-400">
            {new Intl.DateTimeFormat(isEn ? 'en-US' : 'ar-SA', { month: 'long', year: 'numeric' }).format(new Date())}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 py-4 px-4 sm:px-6 rounded-2xl bg-[#171D24]/60 border border-white/[0.05]">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-normal">{t.income}</span>
            <div className="text-sm sm:text-base font-semibold text-[#8EB9A7] font-numeric tracking-tight">
              {formatFinancialNumber(monthlyIncome, true)}
              <span className="text-[10px] sm:text-xs text-[#8EB9A7]/80 ms-1 font-normal">{currency.symbol}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-normal">{t.expenses}</span>
            <div className="text-sm sm:text-base font-semibold text-[#C98387] font-numeric tracking-tight">
              {formatFinancialNumber(monthlyExpense, true)}
              <span className="text-[10px] sm:text-xs text-[#C98387]/80 ms-1 font-normal">{currency.symbol}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-normal">{t.net}</span>
            <div className={`text-sm sm:text-base font-semibold font-numeric tracking-tight ${
              monthlyNet >= 0 ? 'text-[#D9B978]' : 'text-[#C98387]'
            }`}>
              {monthlyNet >= 0 ? '+' : ''}{formatFinancialNumber(monthlyNet, true)}
              <span className="text-[10px] sm:text-xs text-slate-400 ms-1 font-normal">{currency.symbol}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. RECENT TRANSACTIONS
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.recentTransactions}
          </h2>
          <button
            onClick={onOpenAllTransactions}
            className="text-xs text-[#D9B978] hover:text-[#D9B978]/80 transition-colors flex items-center gap-1 font-medium p-1 min-h-[36px]"
          >
            <span>{t.viewAll}</span>
            {isEn ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-slate-400">{t.noTransactionsYet}</p>
            <button
              onClick={() => onOpenNewTransaction('expense')}
              className="mt-3 text-xs font-medium text-[#D9B978] hover:underline min-h-[44px] inline-flex items-center"
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
                    className="flex items-center justify-between py-3.5 px-3.5 bg-[#171D24]/80 hover:bg-[#171D24] border border-white/[0.05] hover:border-[#D9B978]/30 transition-all duration-200 rounded-2xl cursor-pointer group min-h-[56px]"
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

                    <div className="flex items-center gap-2.5 shrink-0 ms-2">
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

                      {/* Desktop quick action icons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTransaction(tx);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-[#D9B978] transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTransaction(tx.id);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-[#C98387] transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={13} />
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

export default ElegantDashboard;
