import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2,
  Edit2,
  Wallet as WalletIcon,
  Coins,
  Filter,
  Calendar,
  Search,
  ArrowLeftRight,
  SlidersHorizontal,
  Paperclip,
  Eye,
  X,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Transaction, Category, TransactionType, Wallet, Currency } from '../types';
import { loadReceiptDataUrl } from '../services/receiptStorage';
import { getIcon, DEFAULT_CURRENCIES, convertCurrency } from '../constants';
import { getLocalizedCurrency, LanguageKey } from '../utils/translations';
import { SwipeableRow } from './SwipeableRow';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  currencySymbol: string;
  currentCurrencyCode?: string;
  currencies?: Currency[];
  exchangeRates?: Record<string, number>;
  showFilters?: boolean;
  language?: LanguageKey;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  wallets,
  onDelete,
  onEdit,
  currencySymbol,
  currentCurrencyCode = 'SAR',
  currencies = DEFAULT_CURRENCIES,
  exchangeRates = {},
  showFilters = false,
  language = 'ar'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [walletFilter, setWalletFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  // Reset visibleCount when search or filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, typeFilter, walletFilter, currencyFilter]);

  // Extract all unique currencies present in current transactions
  const uniqueCurrenciesInTx = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.currency) set.add(t.currency);
    });
    return Array.from(set);
  }, [transactions]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(c => map.set(c.id, c.name.toLowerCase()));
    return map;
  }, [categories]);

  const walletNameMap = useMemo(() => {
    const map = new Map<string, string>();
    wallets.forEach(w => map.set(w.id, w.name.toLowerCase()));
    return map;
  }, [wallets]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return transactions.filter(tx => {
      if (tx.isDeleted) return false;

      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      const matchWallet =
        walletFilter === 'all' ||
        tx.walletId === walletFilter ||
        tx.destinationWalletId === walletFilter;
      const matchCurrency = currencyFilter === 'all' || tx.currency === currencyFilter;

      if (!matchType || !matchWallet || !matchCurrency) return false;

      if (query) {
        const catName = categoryNameMap.get(tx.categoryId) || '';
        const srcWalletName = (tx.walletId ? walletNameMap.get(tx.walletId) : '') || '';
        const destWalletName = (tx.destinationWalletId ? walletNameMap.get(tx.destinationWalletId) : '') || '';

        const inNote = (tx.note || '').toLowerCase().includes(query);
        const inCat = catName.includes(query);
        const inSrcWallet = srcWalletName.includes(query);
        const inDestWallet = destWalletName.includes(query);
        const inAmount = tx.amount.toString().includes(query);
        const inDate = (tx.date || '').includes(query);

        return inNote || inCat || inSrcWallet || inDestWallet || inAmount || inDate;
      }

      return true;
    });
  }, [transactions, typeFilter, walletFilter, currencyFilter, searchQuery, categoryNameMap, walletNameMap]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA === dateB) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return dateB.localeCompare(dateA);
    });
  }, [filteredTransactions]);

  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 86; // px per transaction card
  const overscan = 6;
  const containerHeight = 650;

  const totalCount = sortedTransactions.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
  const endIndex = Math.min(totalCount, startIndex + Math.ceil(containerHeight / ROW_HEIGHT) + overscan * 2);
  const visibleSlice = sortedTransactions.slice(startIndex, endIndex);

  // Reset scrollTop when search or filters change
  useEffect(() => {
    setScrollTop(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchQuery, typeFilter, walletFilter, currencyFilter]);

  const closeReceiptViewer = () => {
    if (viewingReceipt && viewingReceipt.startsWith('blob:')) {
      URL.revokeObjectURL(viewingReceipt);
    }
    setViewingReceipt(null);
  };

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 sm:py-16"
      >
        <div className="bg-slate-900 w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/5">
          <WalletIcon className="text-slate-700" size={32} />
        </div>
        <p className="text-slate-400 text-xs sm:text-sm font-bold">لا توجد أي معاملات مسجلة بعد</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Search Bar & Instant Filter Controls */}
      {showFilters && (
        <div className="space-y-3 bg-[#11161C] p-3.5 sm:p-4 rounded-3xl border border-white/10 shadow-lg transition-all">
          {/* Live Search Field */}
          <div className="relative flex items-center">
            <Search size={15} className="absolute right-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الوصف، التصنيف، المحفظة، أو التاريخ..."
              className="w-full bg-[#0A0D10] border border-white/10 rounded-2xl py-2.5 pr-10 pl-9 text-xs font-bold text-[#F4F1EA] placeholder:text-slate-500 focus:border-[#D9B978]/50 outline-none transition-colors text-right"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 text-slate-400 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="grid grid-cols-4 bg-[#0A0D10] p-1 rounded-2xl border border-white/5 shadow-inner gap-1">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'expense', label: 'المصاريف' },
              { id: 'income', label: 'الواردات' },
              { id: 'transfer', label: 'التحويلات' },
            ].map((item) => (
              <motion.button
                whileTap={{ scale: 0.96 }}
                key={item.id}
                onClick={() => setTypeFilter(item.id as any)}
                className={`py-2 rounded-xl text-[11px] font-black tracking-wide transition-all ${
                  typeFilter === item.id
                    ? 'bg-[#D9B978] text-[#0A0D10] shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          {/* Quick Wallet & Currency Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            {/* Wallet Selector */}
            <div className="flex items-center gap-2 bg-[#0A0D10] px-3 py-2 rounded-xl border border-white/5">
              <WalletIcon size={14} className="text-[#D9B978] shrink-0" />
              <div className="flex-1 min-w-0">
                <select
                  value={walletFilter}
                  onChange={(e) => setWalletFilter(e.target.value)}
                  className="w-full bg-transparent text-[#F4F1EA] text-xs font-bold outline-none cursor-pointer truncate text-right"
                >
                  <option value="all" className="bg-[#11161C] text-white">
                    كافة المحافظ ({wallets.length})
                  </option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id} className="bg-[#11161C] text-white">
                      محفظة: {w.name} ({w.currencyCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2 bg-[#0A0D10] px-3 py-2 rounded-xl border border-white/5">
              <Coins size={14} className="text-[#D9B978] shrink-0" />
              <div className="flex-1 min-w-0">
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="w-full bg-transparent text-[#F4F1EA] text-xs font-bold outline-none cursor-pointer truncate text-right"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    كافة العملات المسجلة
                  </option>
                  {uniqueCurrenciesInTx.map(code => {
                    const cObj =
                      currencies.find(c => c.code === code) ||
                      DEFAULT_CURRENCIES.find(c => c.code === code);
                    return (
                      <option key={code} value={code} className="bg-slate-900 text-white">
                        عملة: {cObj?.name || code} ({code})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Active filter count status */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 font-bold">
            <span>
              عدد العمليات المطابقة: <strong className="text-amber-400 font-black">{sortedTransactions.length}</strong>
            </span>
            {(typeFilter !== 'all' || walletFilter !== 'all' || currencyFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setWalletFilter('all');
                  setCurrencyFilter('all');
                  setSearchQuery('');
                }}
                className="text-amber-400 hover:underline font-black cursor-pointer"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transaction Cards List with True Virtualization */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="space-y-2.5 overflow-y-auto max-h-[68vh] relative pr-1"
        style={{ willChange: 'transform' }}
      >
        {totalCount === 0 ? (
          <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-white/5">
            <p className="text-xs text-slate-400 font-bold">لا توجد عمليات تطابق معايير التصفية المختارة.</p>
          </div>
        ) : (
          <div style={{ height: `${totalCount * ROW_HEIGHT}px`, position: 'relative' }}>
            <div style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)`, position: 'absolute', top: 0, left: 0, right: 0 }} className="space-y-2.5">
              {visibleSlice.map((tx, idx) => {
                const index = startIndex + idx;
                const category = categories.find(c => c.id === tx.categoryId);
                const wallet = wallets.find(w => w.id === tx.walletId);
                const destWallet = wallets.find(w => w.id === tx.destinationWalletId);

                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                const isAdjustment = tx.type === 'adjustment';

                // Exact transaction currency details
                const txCurrencyCode = tx.currency || wallet?.currencyCode || currentCurrencyCode;
                const txCurrencyObj =
                  currencies.find(c => c.code === txCurrencyCode) ||
                  DEFAULT_CURRENCIES.find(c => c.code === txCurrencyCode);
                const txLoc = getLocalizedCurrency(txCurrencyCode, txCurrencyObj?.name, txCurrencyObj?.symbol, language);
                const txSymbol = txLoc.symbol;
                const txCurrencyName = txLoc.name;

                // Converted amount calculation for Base Currency
                const isDiffCurrency = txCurrencyCode !== currentCurrencyCode;
                const baseLoc = getLocalizedCurrency(currentCurrencyCode, undefined, currencySymbol, language);
                const resolvedBaseSymbol = baseLoc.symbol;
                const convertedAmount =
                  isDiffCurrency && !isTransfer
                    ? convertCurrency(tx.amount, txCurrencyCode, currentCurrencyCode, exchangeRates)
                    : null;

                // Cross-Currency deduction relative to the specific Wallet's Primary Currency
                const isDiffFromWallet = Boolean(wallet && txCurrencyCode !== wallet.currencyCode && !isTransfer);
                const walletCurrencyCode = wallet?.currencyCode || currentCurrencyCode;
                const walletLoc = getLocalizedCurrency(walletCurrencyCode, undefined, undefined, language);
                const walletSymbol = walletLoc.symbol;
                const amountInWallet = isDiffFromWallet
                  ? (tx.convertedAmountInWalletCurrency || convertCurrency(tx.amount, txCurrencyCode, walletCurrencyCode, exchangeRates))
                  : null;
                const exchangeRateToWallet = isDiffFromWallet
                  ? (tx.exchangeRateUsed || convertCurrency(1, txCurrencyCode, walletCurrencyCode, exchangeRates))
                  : null;

                return (
                  <motion.div
                    layout={false}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    key={tx.id}
                    className="w-full"
                    style={{ height: `${ROW_HEIGHT - 6}px` }}
                  >
                    <SwipeableRow
                      id={tx.id}
                      onEdit={() => onEdit(tx)}
                      onDelete={() => onDelete(tx.id)}
                      onClick={() => onEdit(tx)}
                      editLabel="تعديل"
                      deleteLabel="حذف"
                    >
                    <div
                      className="group bg-[#11161C] p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-white/5 flex items-center justify-between hover:border-[#D9B978]/30 hover:bg-[#151C24] transition-colors duration-200 gap-2.5 cursor-pointer"
                      title="اسحب لليمين/اليسار للحذف والتعديل، أو انقر للتفاصيل"
                    >
                      {/* Left / Primary Info */}
                      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 shrink-0 shadow-sm"
                          style={{
                            backgroundColor: isTransfer
                              ? 'rgba(117, 155, 200, 0.15)'
                              : isAdjustment
                              ? 'rgba(217, 185, 120, 0.15)'
                              : `${category?.color || '#D9B978'}20`,
                            color: isTransfer
                              ? '#759BC8'
                              : isAdjustment
                              ? '#D9B978'
                              : category?.color || '#D9B978',
                          }}
                        >
                          {isTransfer ? (
                            <ArrowLeftRight size={20} />
                          ) : isAdjustment ? (
                            <SlidersHorizontal size={20} />
                          ) : (
                            getIcon(category?.icon || 'CreditCard', 20)
                          )}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1 text-right">
                          {/* Title & Note */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-[#F4F1EA] tracking-tight truncate max-w-[150px] sm:max-w-[220px]">
                              {isTransfer
                                ? `تحويل: ${wallet?.name || 'محفظة'} ➔ ${destWallet?.name || 'محفظة'}`
                                : isAdjustment
                                ? 'تسوية / تعديل رصيد'
                                : category?.name || 'غير مصنف'}
                            </span>
                            {tx.note && (
                              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                                ({tx.note})
                              </span>
                            )}
                            {tx.receipt && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (tx.receipt) {
                                    const url = await loadReceiptDataUrl(tx.receipt);
                                    setViewingReceipt(url || null);
                                  }
                                }}
                                className="text-[#D9B978] hover:text-[#D9B978]/80 p-0.5"
                                title="عرض الفاتورة المرفقة"
                              >
                                <Paperclip size={12} />
                              </button>
                            )}
                          </div>

                          {/* Badges Bar */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Wallet Badge */}
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0A0D10] rounded-lg border border-white/5">
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: wallet?.color || '#8EB9A7' }}
                              />
                              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[90px]">
                                {wallet?.name || 'المحفظة العامة'}
                              </span>
                            </div>

                            {/* Specific Currency Badge */}
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#D9B978]/10 rounded-lg border border-[#D9B978]/25 text-[#D9B978]">
                              <Coins size={10} className="shrink-0" />
                              <span className="text-[9px] font-black tracking-wide truncate max-w-[100px]" title={txCurrencyName}>
                                {txCurrencyCode}
                              </span>
                            </div>

                            {/* Date & Time */}
                            <span className="text-[9px] text-slate-500 font-mono hidden sm:inline-block">
                              {tx.date} {tx.time ? `• ${tx.time}` : ''}
                            </span>
                          </div>

                          {/* Agreed Exchange Rate & Certified Foreign Currency Badge */}
                          {(tx.conversionNote || (tx.foreignAmount && tx.exchangeRate)) && (
                            <div 
                              className="flex items-center gap-1.5 px-2 py-0.5 bg-[#D9B978]/10 rounded-lg border border-[#D9B978]/30 text-[#D9B978] text-[9px] font-bold max-w-fit truncate mt-1"
                              title={tx.conversionNote || `تمت عملية ${tx.foreignAmount} ${tx.foreignCurrency || 'USD'} بسعر صرف ${tx.exchangeRate?.toLocaleString()}`}
                            >
                              <span className="shrink-0 text-[#D9B978]">💱</span>
                              <span className="truncate">
                                {tx.conversionNote || `عملية ${tx.foreignAmount} ${tx.foreignCurrency || 'USD'} بسعر صرف ${tx.exchangeRate?.toLocaleString()}`}
                              </span>
                              <span className="text-[8px] bg-[#D9B978]/25 text-[#D9B978] px-1 py-0.2 rounded font-black shrink-0">
                                🔒 موثق
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right / Financial Info */}
                      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <div className="text-left flex flex-col items-end">
                          <p
                            className={`font-black text-sm sm:text-base tracking-tight dir-ltr ${
                              isTransfer
                                ? 'text-[#759BC8]'
                                : isIncome
                                ? 'text-[#8EB9A7]'
                                : 'text-[#C98387]'
                            }`}
                          >
                            {isTransfer ? '↔ ' : isIncome ? '+' : '-'}
                            {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            <span className="text-[11px] font-bold text-slate-300 ml-1">{txSymbol}</span>
                          </p>

                          {isDiffFromWallet && amountInWallet !== null && (
                            <span className="text-[9px] font-bold text-[#D9B978]/90 dir-ltr text-right flex items-center gap-1 mt-0.5">
                              <span>المخصوم: {amountInWallet.toLocaleString('en-US', { maximumFractionDigits: 1 })} {walletSymbol}</span>
                              {exchangeRateToWallet && (
                                <span className="text-slate-500 font-normal">
                                  (1 {txSymbol} = {exchangeRateToWallet.toLocaleString('en-US', { maximumFractionDigits: 2 })} {walletSymbol})
                                </span>
                              )}
                            </span>
                          )}

                          {isDiffCurrency && convertedAmount !== null && (
                            <span className="text-[9px] font-bold text-slate-400 dir-ltr">
                              المعادل: ≈ {Math.round(convertedAmount).toLocaleString()} {resolvedBaseSymbol}
                            </span>
                          )}

                          <span className="text-[8.5px] text-slate-500 font-mono sm:hidden">{tx.date}</span>
                        </div>

                        {/* Direct desktop action buttons */}
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(tx);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#D9B978] transition-colors bg-white/5 rounded-xl border border-white/5"
                            title="تعديل المعاملة"
                          >
                            <Edit2 size={13} />
                          </motion.button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(tx.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#C98387] transition-colors bg-white/5 rounded-xl border border-white/5"
                            title="حذف"
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </SwipeableRow>
                </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full-size receipt viewer */}
      <AnimatePresence>
        {viewingReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[300] flex flex-col items-center justify-center p-4"
          >
            <div className="flex justify-between items-center w-full max-w-lg mb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Paperclip size={14} /> الفاتورة / السند المرفق
              </span>
              <button
                type="button"
                onClick={closeReceiptViewer}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={viewingReceipt}
              alt="Receipt Attachment"
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionList;
