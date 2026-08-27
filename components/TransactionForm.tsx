import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, StickyNote, Wallet as WalletIcon, ArrowLeftRight, 
  Camera, Image as ImageIcon, Trash2, CheckCircle2, Clock, 
  AlertCircle, Search, ArrowUpRight, ArrowDownLeft, ChevronRight, 
  UserPlus, UserMinus, Scale, Sliders, Check, Phone, DollarSign,
  Tag, Info, Edit3
} from 'lucide-react';
import { 
  Transaction, 
  Category, 
  TransactionType, 
  Wallet, 
  ReceiptAttachment, 
  Debt, 
  FinancialEventType 
} from '../types';
import { getIcon, DEFAULT_CURRENCIES, convertCurrency } from '../constants';
import { getLocalizedCurrency, LanguageKey } from '../utils/translations';
import { getCurrencySymbol, parseArabicNumber, sanitizeNumericInput } from '../utils/formatters';

interface TransactionFormProps {
  categories: Category[];
  wallets: Wallet[];
  transactions?: Transaction[];
  debts?: Debt[];
  onSubmit: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  onAddDebt?: (debt: Omit<Debt, 'id'>, walletId?: string) => void;
  onPayDebt?: (
    id: string, 
    amount: number, 
    walletId?: string, 
    noteSuffix?: string, 
    customDebtUpdates?: Partial<Debt>,
    paymentDate?: string
  ) => void;
  onClose: () => void;
  initialData?: Transaction | null;
  exchangeRates: Record<string, number>;
  defaultType?: FinancialEventType | TransactionType;
  language?: LanguageKey;
  t: any;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  wallets,
  transactions = [],
  debts = [],
  onSubmit,
  onAddDebt,
  onPayDebt,
  onClose,
  initialData,
  exchangeRates,
  defaultType,
  language = 'ar',
  t,
}) => {
  const mapInitialEventType = (): FinancialEventType | null => {
    if (initialData) {
      if (initialData.type === 'income') return 'income';
      if (initialData.type === 'transfer') return 'transfer';
      if (initialData.type === 'adjustment') return 'balance_adjustment';
      return 'expense';
    }
    if (defaultType) {
      if (defaultType === 'income') return 'income';
      if (defaultType === 'transfer') return 'transfer';
      if (defaultType === 'adjustment' || defaultType === 'balance_adjustment') return 'balance_adjustment';
      if (defaultType === 'debt_to_me') return 'debt_to_me';
      if (defaultType === 'debt_on_me') return 'debt_on_me';
      if (defaultType === 'debt_repayment') return 'debt_repayment';
      return 'expense';
    }
    return null;
  };

  const [selectedEvent, setSelectedEvent] = useState<FinancialEventType | null>(mapInitialEventType);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(Boolean(initialData));
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<string>(initialData?.id || '');

  const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [walletId, setWalletId] = useState(initialData?.walletId || wallets[0]?.id || '');
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    initialData?.destinationWalletId || (wallets.length > 1 ? wallets[1]?.id : '')
  );
  const [destinationAmount, setDestinationAmount] = useState<string>(
    initialData?.destinationAmount ? initialData.destinationAmount.toString() : ''
  );
  const [note, setNote] = useState(initialData?.note || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.time || new Date().toTimeString().slice(0, 5));
  const [receipt, setReceipt] = useState<ReceiptAttachment | undefined>(initialData?.receipt);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [linkDebtToWallet, setLinkDebtToWallet] = useState(true);
  const [selectedDebtIdForRepayment, setSelectedDebtIdForRepayment] = useState<string>(
    debts.find(d => !d.isPaid)?.id || ''
  );

  const [actualRealBalance, setActualRealBalance] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const selectedSourceWallet = wallets.find(w => w.id === walletId) || wallets[0];
  const selectedDestWallet = wallets.find(w => w.id === destinationWalletId) || (wallets.length > 1 ? wallets[1] : undefined);
  
  const [inputCurrency, setInputCurrency] = useState(
    initialData?.currency || selectedSourceWallet?.currencyCode || 'SAR'
  );

  useEffect(() => {
    if (selectedEvent === 'expense' && !categoryId) {
      const firstExp = categories.find(c => c.type === 'expense');
      if (firstExp) setCategoryId(firstExp.id);
    } else if (selectedEvent === 'income' && !categoryId) {
      const firstInc = categories.find(c => c.type === 'income');
      if (firstInc) setCategoryId(firstInc.id);
    }
  }, [selectedEvent, categories]);

  useEffect(() => {
    if (selectedSourceWallet && !initialData && selectedEvent !== 'transfer') {
      setInputCurrency(selectedSourceWallet.currencyCode);
    }
  }, [walletId, selectedEvent]);

  const activeDebts = useMemo(() => {
    return debts.filter(d => !d.isPaid);
  }, [debts]);

  const currentSelectedDebt = useMemo(() => {
    return debts.find(d => d.id === selectedDebtIdForRepayment);
  }, [debts, selectedDebtIdForRepayment]);

  const knownContacts = useMemo(() => {
    const names = new Set<string>();
    debts.forEach(d => {
      if (d.personName) names.add(d.personName.trim());
    });
    return Array.from(names);
  }, [debts]);

  const handleSelectTxForEdit = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    setSelectedTxForEdit(txId);
    setAmount(tx.amount.toString());
    setCategoryId(tx.categoryId || '');
    setWalletId(tx.walletId);
    setDestinationWalletId(tx.destinationWalletId || '');
    setDestinationAmount(tx.destinationAmount ? tx.destinationAmount.toString() : '');
    setInputCurrency(tx.currency || 'SAR');
    setNote(tx.note || '');
    setDate(tx.date);
    setTime(tx.time || '12:00');
    setReceipt(tx.receipt);

    if (tx.type === 'income') setSelectedEvent('income');
    else if (tx.type === 'transfer') setSelectedEvent('transfer');
    else if (tx.type === 'adjustment') {
      setSelectedEvent('balance_adjustment');
      setActualRealBalance(tx.amount.toString());
    } else setSelectedEvent('expense');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceipt({
          id: 'rcpt-' + Date.now(),
          dataUrl: reader.result as string,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          createdAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const adjustmentCalc = useMemo(() => {
    if (selectedEvent !== 'balance_adjustment') return null;
    const current = selectedSourceWallet ? (selectedSourceWallet.currentBalance ?? selectedSourceWallet.openingBalance ?? 0) : 0;
    const actual = actualRealBalance === '' ? null : parseArabicNumber(actualRealBalance);
    if (actual === null || isNaN(actual)) return { current, actual: null, diff: 0, isIncrease: true, absDiff: 0 };
    const diff = actual - current;
    return {
      current,
      actual,
      diff,
      isIncrease: diff >= 0,
      absDiff: Math.abs(diff)
    };
  }, [selectedEvent, selectedSourceWallet, actualRealBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = parseArabicNumber(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('الرجاء إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedEvent === 'expense') {
        const sourceCurrency = inputCurrency || selectedSourceWallet?.currencyCode || 'SAR';
        const walletCurrency = selectedSourceWallet?.currencyCode || sourceCurrency;
        const convertedValue = sourceCurrency !== walletCurrency && exchangeRates
          ? convertCurrency(numAmount, sourceCurrency, walletCurrency, exchangeRates)
          : numAmount;

        onSubmit({
          id: initialData?.id,
          type: 'expense',
          amount: numAmount,
          currency: sourceCurrency,
          walletCurrency,
          convertedAmountInWalletCurrency: convertedValue,
          exchangeRateUsed: sourceCurrency !== walletCurrency && exchangeRates ? (convertCurrency(1, sourceCurrency, walletCurrency, exchangeRates)) : 1,
          walletId,
          categoryId: categoryId || categories.find(c => c.type === 'expense')?.id || 'general',
          note,
          date,
          time,
          frequency: 'once',
          receipt
        });
      } else if (selectedEvent === 'income') {
        const sourceCurrency = inputCurrency || selectedSourceWallet?.currencyCode || 'SAR';
        const walletCurrency = selectedSourceWallet?.currencyCode || sourceCurrency;
        const convertedValue = sourceCurrency !== walletCurrency && exchangeRates
          ? convertCurrency(numAmount, sourceCurrency, walletCurrency, exchangeRates)
          : numAmount;

        onSubmit({
          id: initialData?.id,
          type: 'income',
          amount: numAmount,
          currency: sourceCurrency,
          walletCurrency,
          convertedAmountInWalletCurrency: convertedValue,
          exchangeRateUsed: sourceCurrency !== walletCurrency && exchangeRates ? (convertCurrency(1, sourceCurrency, walletCurrency, exchangeRates)) : 1,
          walletId,
          categoryId: categoryId || categories.find(c => c.type === 'income')?.id || 'general',
          note,
          date,
          time,
          frequency: 'once'
        });
      } else if (selectedEvent === 'transfer') {
        if (walletId === destinationWalletId) {
          setErrorMessage('لا يمكن التحويل بين نفس المحفظة');
          setIsSubmitting(false);
          return;
        }
        const destWallet = wallets.find(w => w.id === destinationWalletId);
        const sourceCurrency = selectedSourceWallet?.currencyCode || 'SAR';
        const destinationCurrency = destWallet?.currencyCode || 'SAR';
        let finalDestAmount = destinationAmount ? parseArabicNumber(destinationAmount) : numAmount;
        if (sourceCurrency !== destinationCurrency && !destinationAmount && exchangeRates) {
          finalDestAmount = convertCurrency(numAmount, sourceCurrency, destinationCurrency, exchangeRates);
        }
        onSubmit({
          id: initialData?.id,
          type: 'transfer',
          amount: numAmount,
          currency: sourceCurrency,
          walletCurrency: sourceCurrency,
          convertedAmountInWalletCurrency: numAmount,
          exchangeRateUsed: sourceCurrency !== destinationCurrency && exchangeRates ? convertCurrency(1, sourceCurrency, destinationCurrency, exchangeRates) : 1,
          walletId,
          destinationWalletId,
          destinationCurrency,
          destinationAmount: finalDestAmount,
          categoryId: categoryId || categories[0]?.id || 'general',
          note,
          date,
          time,
          frequency: 'once'
        });
      } else if (selectedEvent === 'debt_to_me') {
        if (!personName.trim()) {
          setErrorMessage('الرجاء إدخال اسم المدين');
          setIsSubmitting(false);
          return;
        }
        let finalAmount = numAmount;
        if (inputCurrency !== selectedSourceWallet?.currencyCode && exchangeRates) {
          finalAmount = convertCurrency(numAmount, inputCurrency, selectedSourceWallet.currencyCode, exchangeRates);
        }
        if (onAddDebt) {
          onAddDebt({
            type: 'to_me',
            personName: personName.trim(),
            personPhone: personPhone.trim(),
            amount: finalAmount,
            originalAmount: finalAmount,
            paidAmount: 0,
            currency: selectedSourceWallet?.currencyCode || 'SAR',
            dueDate: debtDueDate || undefined,
            isPaid: false,
            note: note || '',
            createdAt: new Date().toISOString()
          }, linkDebtToWallet ? walletId : undefined);
        }
        onClose();
      } else if (selectedEvent === 'debt_on_me') {
        if (!personName.trim()) {
          setErrorMessage('الرجاء إدخال اسم صاحب الدين (الدائن)');
          setIsSubmitting(false);
          return;
        }
        let finalAmount = numAmount;
        if (inputCurrency !== selectedSourceWallet?.currencyCode && exchangeRates) {
          finalAmount = convertCurrency(numAmount, inputCurrency, selectedSourceWallet.currencyCode, exchangeRates);
        }
        if (onAddDebt) {
          onAddDebt({
            type: 'on_me',
            personName: personName.trim(),
            personPhone: personPhone.trim(),
            amount: finalAmount,
            originalAmount: finalAmount,
            paidAmount: 0,
            currency: selectedSourceWallet?.currencyCode || 'SAR',
            dueDate: debtDueDate || undefined,
            isPaid: false,
            note: note || '',
            createdAt: new Date().toISOString()
          }, linkDebtToWallet ? walletId : undefined);
        }
        onClose();
      } else if (selectedEvent === 'debt_repayment') {
        if (!currentSelectedDebt) {
          setErrorMessage('الرجاء اختيار الذمة المالية المراد سدادها');
          setIsSubmitting(false);
          return;
        }
        const rem = Math.max(0, (currentSelectedDebt.originalAmount || currentSelectedDebt.amount) - (currentSelectedDebt.paidAmount || 0));
        if (numAmount > rem + 0.01) {
          setErrorMessage('مبلغ الدفعة أكبر من المتبقي في الذمة المالية');
          setIsSubmitting(false);
          return;
        }
        if (onPayDebt) {
          onPayDebt(currentSelectedDebt.id, numAmount, walletId, note ? ` - ${note}` : undefined, undefined, date);
        }
        onClose();
      } else if (selectedEvent === 'balance_adjustment') {
        if (!adjustmentCalc || adjustmentCalc.actual === null) {
          setErrorMessage('الرجاء إدخال الرصيد الفعلي');
          setIsSubmitting(false);
          return;
        }
        onSubmit({
          type: 'adjustment',
          amount: adjustmentCalc.diff,
          currency: selectedSourceWallet?.currencyCode || 'SAR',
          walletId,
          categoryId: categoryId || categories[0]?.id || 'general',
          note: note || `تسوية رصيد محفظة ${selectedSourceWallet?.name} إلى ${adjustmentCalc.actual}`,
          date,
          time,
          frequency: 'once'
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المعاملة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-lg bg-[#0A0D10] border border-[#D9B978]/20 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[calc(100dvh-1rem)]"
      >
        {/* TOP BAR / NAVIGATION */}
        <div className="p-4 sm:p-5 border-b border-[#D9B978]/10 flex items-center justify-between bg-[#11161C]">
          <div className="flex items-center gap-2.5">
            {selectedEvent && !initialData && (
              <button 
                type="button"
                onClick={() => {
                  setSelectedEvent(null);
                  setErrorMessage('');
                }}
                className="w-11 h-11 rounded-xl bg-[#11161C] hover:bg-[#D9B978]/15 text-[#F4F1EA] flex items-center justify-center transition-all duration-200 active:scale-95 border border-[#D9B978]/20"
                title="الرجوع لقائمة الأحداث"
              >
                <ChevronRight size={20} />
              </button>
            )}

            <div>
              <h3 className="font-black text-[#F4F1EA] text-base sm:text-lg">
                {!selectedEvent 
                  ? t.whatHappened 
                  : selectedEvent === 'expense' ? t.recordExpense
                  : selectedEvent === 'income' ? t.recordIncome
                  : selectedEvent === 'transfer' ? t.transferWallet
                  : selectedEvent === 'debt_to_me' ? t.debtToMeTitle
                  : selectedEvent === 'debt_on_me' ? t.debtOnMeTitle
                  : selectedEvent === 'debt_repayment' ? t.debtRepaymentTitle
                  : t.balanceAdjustmentTitle
                }
              </h3>
              <p className="text-[11px] font-medium text-[#F4F1EA]/60">
                {!selectedEvent 
                  ? t.selectFinancialEvent
                  : t.accountingLedgerRecord
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedEvent && transactions.length > 0 && !initialData && (
              <button
                type="button"
                onClick={() => {
                  setIsEditingExisting(!isEditingExisting);
                  if (!isEditingExisting && transactions[0]) {
                    handleSelectTxForEdit(transactions[0].id);
                  }
                }}
                className={`px-3.5 min-h-[44px] rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 border ${
                  isEditingExisting 
                    ? 'bg-[#D9B978]/20 text-[#D9B978] border-[#D9B978]/40' 
                    : 'bg-[#11161C] text-[#F4F1EA]/80 border-[#D9B978]/20 hover:text-[#F4F1EA]'
                }`}
              >
                <Edit3 size={14} />
                <span>{t.editPrevious}</span>
              </button>
            )}

            <button 
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-xl bg-[#11161C] hover:bg-[#D9B978]/15 text-[#F4F1EA]/70 hover:text-[#F4F1EA] flex items-center justify-center transition-all duration-200 active:scale-95 border border-[#D9B978]/20"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-[#C98387]/15 border border-[#C98387]/30 rounded-2xl flex items-center gap-2.5 text-[#C98387] text-xs font-bold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SCREEN 1: EVENT SELECTION GRID ("ماذا حدث؟") */}
        {!selectedEvent && (
          <div className="p-4 sm:p-6 space-y-4 bg-[#0A0D10]">
            {isEditingExisting && (
              <div className="p-3.5 bg-[#11161C] rounded-2xl border border-[#D9B978]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 size={15} className="text-[#D9B978]" />
                    <span className="text-xs font-bold text-[#D9B978]">{t.editPreviousRegistered}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(false)}
                    className="text-[11px] text-[#F4F1EA]/70 hover:text-[#F4F1EA] px-2 py-0.5 rounded-lg bg-[#0A0D10] border border-[#D9B978]/20"
                  >
                    {t.cancelEdit}
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <p className="text-xs text-[#F4F1EA]/50 py-2 text-center">{t.noTransactionsToEdit}</p>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#F4F1EA]/70 block">{t.selectTxFromLog}</label>
                    <select
                      value={selectedTxForEdit}
                      onChange={(e) => handleSelectTxForEdit(e.target.value)}
                      className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] focus:outline-none focus:border-[#D9B978] font-bold"
                    >
                      {transactions.slice(0, 40).map(tr => {
                        const cat = categories.find(c => c.id === tr.categoryId);
                        const typeLabel = tr.type === 'expense' ? t.expenses : tr.type === 'income' ? t.income : tr.type === 'transfer' ? t.transfer : t.adjustment;
                        const trCurrLoc = getLocalizedCurrency(tr.currency || 'SAR', undefined, undefined, language);
                        return (
                          <option key={tr.id} value={tr.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                            {tr.date} | {typeLabel} ({cat?.name || t.generalSettings}): {tr.amount.toLocaleString()} {trCurrLoc.symbol} ({trCurrLoc.code}) {tr.note ? `- ${tr.note}` : ''}
                          </option>
                        );
                      })}
                    </select>

                    {selectedTxForEdit && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const tx = transactions.find(item => item.id === selectedTxForEdit);
                            if (tx) handleSelectTxForEdit(tx.id);
                          }}
                          className="px-3.5 py-1.5 bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <span>{t.openEditForm}</span>
                          <ChevronRight size={14} className="rotate-180" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* 1. EXPENSE */}
              <button
                type="button"
                onClick={() => setSelectedEvent('expense')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#C98387] hover:bg-[#C98387]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] relative overflow-hidden shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#C98387] transition-colors">{t.expenses}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#C98387]/15 text-[#C98387] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#C98387]/30">
                    <ArrowDownLeft size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.expenseDesc}</p>
              </button>

              {/* 2. INCOME */}
              <button
                type="button"
                onClick={() => setSelectedEvent('income')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#8EB9A7] hover:bg-[#8EB9A7]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#8EB9A7] transition-colors">{t.income}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#8EB9A7]/15 text-[#8EB9A7] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#8EB9A7]/30">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.incomeDesc}</p>
              </button>

              {/* 3. TRANSFER */}
              <button
                type="button"
                onClick={() => setSelectedEvent('transfer')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#D9B978] hover:bg-[#D9B978]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#D9B978] transition-colors">{t.transfer}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#D9B978]/30">
                    <ArrowLeftRight size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.transferDesc}</p>
              </button>

              {/* 4. DEBT TO ME */}
              <button
                type="button"
                onClick={() => setSelectedEvent('debt_to_me')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#8EB9A7] hover:bg-[#8EB9A7]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#8EB9A7] transition-colors">{t.youOweOthers}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#8EB9A7]/15 text-[#8EB9A7] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#8EB9A7]/30">
                    <UserPlus size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.debtToMeDesc}</p>
              </button>

              {/* 5. DEBT ON ME */}
              <button
                type="button"
                onClick={() => setSelectedEvent('debt_on_me')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#D9B978] hover:bg-[#D9B978]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#D9B978] transition-colors">{t.othersOweYou}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#D9B978]/30">
                    <UserMinus size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.debtOnMeDesc}</p>
              </button>

              {/* 6. DEBT REPAYMENT */}
              <button
                type="button"
                onClick={() => setSelectedEvent('debt_repayment')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#D9B978] hover:bg-[#D9B978]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#D9B978] transition-colors">{t.debts}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#D9B978]/30">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.debtRepaymentDesc}</p>
              </button>

              {/* 7. BALANCE ADJUSTMENT */}
              <button
                type="button"
                onClick={() => setSelectedEvent('balance_adjustment')}
                className="p-4 rounded-2xl bg-[#11161C] border border-[#D9B978]/20 hover:border-[#D9B978] hover:bg-[#D9B978]/10 transition-all text-start group flex flex-col justify-between min-h-[95px] shadow-md"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#D9B978] transition-colors">{t.adjustment}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#D9B978]/30">
                    <Scale size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.balanceAdjustmentDesc}</p>
              </button>

              {/* 8. EDIT PREVIOUS TRANSACTION */}
              <button
                type="button"
                onClick={() => {
                  setIsEditingExisting(true);
                  if (transactions.length > 0) {
                    handleSelectTxForEdit(selectedTxForEdit || transactions[0].id);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all text-start group flex flex-col justify-between min-h-[95px] relative overflow-hidden shadow-md ${
                  isEditingExisting
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-[#11161C] border-[#D9B978]/20 hover:border-[#D9B978] hover:bg-[#D9B978]/10'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-[#F4F1EA] text-sm sm:text-base group-hover:text-[#D9B978] transition-colors">{t.editPrevious}</span>
                  <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#D9B978]/30">
                    <Edit3 size={18} />
                  </div>
                </div>
                <p className="text-[10px] text-[#F4F1EA]/60 mt-2 font-medium">{t.editPreviousRegistered}</p>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: DEDICATED EVENT FORM */}
        {selectedEvent && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[calc(100dvh-9rem)] overflow-y-auto custom-scrollbar bg-[#0A0D10] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            
            {/* === 1. EXPENSE VIEW === */}
            {selectedEvent === 'expense' && (
              <>
                <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">{t.expenseAmountAndCurrency}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                      className="w-full bg-transparent text-2xl sm:text-3xl font-black text-[#C98387] focus:outline-none placeholder-[#F4F1EA]/30"
                    />
                    <select
                      value={inputCurrency}
                      onChange={(e) => setInputCurrency(e.target.value)}
                      className="bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-2.5 py-1.5 text-xs text-[#D9B978] font-bold focus:outline-none shrink-0"
                    >
                      {DEFAULT_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0A0D10] text-[#F4F1EA]">{c.symbol} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <WalletIcon size={14} className="text-[#D9B978]" />
                    <span>{t.payFromWallet}</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                  >
                    {wallets.map(w => {
                      const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                      return (
                        <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                          {w.name} ({wCurrLoc.symbol}) — {t.totalBalance}: {(w.currentBalance ?? w.openingBalance ?? 0).toLocaleString()} {wCurrLoc.symbol}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <Tag size={14} className="text-[#C98387]" />
                    <span>{t.expenseCategory}</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                    {categories.filter(c => c.type === 'expense').map(cat => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            isSelected 
                              ? 'bg-[#C98387]/20 text-[#C98387] border-[#C98387] shadow-sm' 
                              : 'bg-[#11161C] border-[#D9B978]/20 text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:border-[#D9B978]/40'
                          }`}
                        >
                          <span className="text-[10px] truncate max-w-full">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* === 2. INCOME VIEW === */}
            {selectedEvent === 'income' && (
              <>
                <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">{t.incomeAmountAndCurrency}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      required
                      autoFocus
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                      className="w-full bg-transparent text-2xl sm:text-3xl font-black text-[#8EB9A7] focus:outline-none placeholder-[#F4F1EA]/30"
                    />
                    <select
                      value={inputCurrency}
                      onChange={(e) => setInputCurrency(e.target.value)}
                      className="bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-2.5 py-1.5 text-xs text-[#8EB9A7] font-bold focus:outline-none shrink-0"
                    >
                      {DEFAULT_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0A0D10] text-[#F4F1EA]">{c.symbol} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <WalletIcon size={14} className="text-[#8EB9A7]" />
                    <span>{t.depositToWallet}</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#8EB9A7]"
                  >
                    {wallets.map(w => {
                      const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                      return (
                        <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                          {w.name} ({wCurrLoc.symbol}) — {t.totalBalance}: {(w.currentBalance ?? w.openingBalance ?? 0).toLocaleString()} {wCurrLoc.symbol}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <Tag size={14} className="text-[#8EB9A7]" />
                    <span>{t.incomeSourceCategory}</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                    {categories.filter(c => c.type === 'income').map(cat => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id)}
                          className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            isSelected 
                              ? 'bg-[#8EB9A7]/20 text-[#8EB9A7] border-[#8EB9A7] shadow-sm' 
                              : 'bg-[#11161C] border-[#D9B978]/20 text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:border-[#D9B978]/40'
                          }`}
                        >
                          <span className="text-[10px] truncate max-w-full">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* === 3. TRANSFER VIEW === */}
            {selectedEvent === 'transfer' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                      <ArrowDownLeft size={13} className="text-[#C98387]" />
                      <span>{t.transferFromWallet}</span>
                    </label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                    >
                      {wallets.map(w => {
                        const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                        return (
                          <option key={w.id} value={w.id} disabled={w.id === destinationWalletId} className="bg-[#0A0D10] text-[#F4F1EA]">
                            {w.name} ({wCurrLoc.symbol})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                      <ArrowUpRight size={13} className="text-[#8EB9A7]" />
                      <span>{t.transferToWallet}</span>
                    </label>
                    <select
                      value={destinationWalletId}
                      onChange={(e) => setDestinationWalletId(e.target.value)}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                    >
                      {wallets.map(w => {
                        const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                        return (
                          <option key={w.id} value={w.id} disabled={w.id === walletId} className="bg-[#0A0D10] text-[#F4F1EA]">
                            {w.name} ({wCurrLoc.symbol})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">
                    {t.amountToTransfer} ({getLocalizedCurrency(selectedSourceWallet?.currencyCode || 'SAR', undefined, undefined, language).symbol})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                    className="w-full bg-transparent text-2xl sm:text-3xl font-black text-[#D9B978] focus:outline-none placeholder-[#F4F1EA]/30"
                  />
                </div>

                {selectedSourceWallet?.currencyCode !== selectedDestWallet?.currencyCode && selectedDestWallet && (
                  <div className="p-3 bg-[#D9B978]/10 border border-[#D9B978]/25 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#D9B978]">{t.receivedAmountTargetCurrency}</span>
                      <span className="text-[10px] text-[#F4F1EA]/60 font-bold">
                        {getLocalizedCurrency(selectedDestWallet.currencyCode, undefined, undefined, language).symbol} ({selectedDestWallet.currencyCode})
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      placeholder="0.00"
                      value={destinationAmount}
                      onChange={(e) => setDestinationAmount(sanitizeNumericInput(e.target.value))}
                      className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-sm text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                    />
                  </div>
                )}
              </>
            )}

            {/* === 4. DEBT TO ME === */}
            {selectedEvent === 'debt_to_me' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <UserPlus size={14} className="text-[#8EB9A7]" />
                    <span>{t.debtorPersonName}</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Ahmad, Company..."
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#8EB9A7]"
                  />
                  {knownContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {knownContacts.slice(0, 5).map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setPersonName(name)}
                          className="px-2 py-0.5 rounded-lg bg-[#11161C] text-[10px] text-[#F4F1EA]/80 hover:text-[#F4F1EA] hover:bg-[#D9B978]/20 font-medium border border-[#D9B978]/20"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">{t.debtAmountOwedToMe}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                      className="w-full bg-transparent text-2xl sm:text-3xl font-black text-[#8EB9A7] focus:outline-none placeholder-[#F4F1EA]/30"
                    />
                    <select
                      value={inputCurrency}
                      onChange={(e) => setInputCurrency(e.target.value)}
                      className="bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-2.5 py-1.5 text-xs text-[#8EB9A7] font-bold focus:outline-none shrink-0"
                    >
                      {DEFAULT_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0A0D10] text-[#F4F1EA]">{c.symbol} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkDebtToWallet}
                      onChange={(e) => setLinkDebtToWallet(e.target.checked)}
                      className="w-4 h-4 rounded text-[#8EB9A7] focus:ring-0 bg-[#0A0D10] border-[#D9B978]/30"
                    />
                    <span className="text-xs font-bold text-[#F4F1EA]">{t.deductWalletNow}</span>
                  </label>
                  {linkDebtToWallet && (
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#8EB9A7] mt-2"
                    >
                      {wallets.map(w => {
                        const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                        return (
                          <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">{w.name} ({wCurrLoc.symbol})</option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#F4F1EA]/70">{t.dueDateOptional}</label>
                    <input
                      type="date"
                      value={debtDueDate}
                      onChange={(e) => setDebtDueDate(e.target.value)}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#F4F1EA]/70">{t.phoneOptional}</label>
                    <input
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={personPhone}
                      onChange={(e) => setPersonPhone(e.target.value)}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* === 5. DEBT ON ME === */}
            {selectedEvent === 'debt_on_me' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <UserMinus size={14} className="text-[#D9B978]" />
                    <span>{t.creditorPersonName}</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Bank, Supplier..."
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                  />
                  {knownContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {knownContacts.slice(0, 5).map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setPersonName(name)}
                          className="px-2 py-0.5 rounded-lg bg-[#11161C] text-[10px] text-[#F4F1EA]/80 hover:text-[#F4F1EA] hover:bg-[#D9B978]/20 font-medium border border-[#D9B978]/20"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">{t.debtAmountOwedByMe}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                      className="w-full bg-transparent text-2xl sm:text-3xl font-black text-[#D9B978] focus:outline-none placeholder-[#F4F1EA]/30"
                    />
                    <select
                      value={inputCurrency}
                      onChange={(e) => setInputCurrency(e.target.value)}
                      className="bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-2.5 py-1.5 text-xs text-[#D9B978] font-bold focus:outline-none shrink-0"
                    >
                      {DEFAULT_CURRENCIES.map(c => {
                        const cLoc = getLocalizedCurrency(c.code, undefined, undefined, language);
                        return (
                          <option key={c.code} value={c.code} className="bg-[#0A0D10] text-[#F4F1EA]">{cLoc.symbol} - {cLoc.name}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkDebtToWallet}
                      onChange={(e) => setLinkDebtToWallet(e.target.checked)}
                      className="w-4 h-4 rounded text-[#D9B978] focus:ring-0 bg-[#0A0D10] border-[#D9B978]/30"
                    />
                    <span className="text-xs font-bold text-[#F4F1EA]">{t.depositWalletNow}</span>
                  </label>
                  {linkDebtToWallet && (
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978] mt-2"
                    >
                      {wallets.map(w => {
                        const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                        return (
                          <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">{w.name} ({wCurrLoc.symbol})</option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#F4F1EA]/70">{t.dueDateSelected}</label>
                    <input
                      type="date"
                      value={debtDueDate}
                      onChange={(e) => setDebtDueDate(e.target.value)}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#F4F1EA]/70">{t.phoneOptional}</label>
                    <input
                      type="tel"
                      placeholder="05XXXXXXXX"
                      value={personPhone}
                      onChange={(e) => setPersonPhone(e.target.value)}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* === 6. DEBT REPAYMENT === */}
            {selectedEvent === 'debt_repayment' && (
              <>
                {activeDebts.length === 0 ? (
                  <div className="p-6 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 text-center space-y-2">
                    <CheckCircle2 size={32} className="text-[#8EB9A7] mx-auto" />
                    <h4 className="font-bold text-[#F4F1EA] text-sm">No active debts requiring settlement</h4>
                    <p className="text-xs text-[#F4F1EA]/60">All debts are fully settled or no debts registered yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#F4F1EA]/70">{t.selectDebtToRepay}</label>
                      <select
                        value={selectedDebtIdForRepayment}
                        onChange={(e) => {
                          setSelectedDebtIdForRepayment(e.target.value);
                          const target = debts.find(d => d.id === e.target.value);
                          if (target) {
                            const rem = Math.max(0, (target.originalAmount || target.amount) - (target.paidAmount || 0));
                            setAmount(rem.toString());
                          }
                        }}
                        className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                      >
                        {activeDebts.map(d => {
                          const rem = Math.max(0, (d.originalAmount || d.amount) - (d.paidAmount || 0));
                          const dCurrLoc = getLocalizedCurrency(d.currency || 'SAR', undefined, undefined, language);
                          return (
                            <option key={d.id} value={d.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                              {d.type === 'to_me' ? '[Owed To Me]' : '[Owed By Me]'} {d.personName} — Rem: {rem.toLocaleString()} {dCurrLoc.symbol} ({dCurrLoc.code})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {currentSelectedDebt && (
                      <div className="p-3 bg-[#11161C] border border-[#D9B978]/30 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-[#F4F1EA]/60 block">
                            {currentSelectedDebt.type === 'to_me' ? 'Collect installment' : 'Pay liability installment'}
                          </span>
                          <span className="font-black text-[#F4F1EA]">{currentSelectedDebt.personName}</span>
                        </div>
                        <div className="text-start">
                          <span className="text-[10px] text-[#F4F1EA]/60 block">{t.remainingBalance}:</span>
                          <span className="font-black text-[#D9B978] text-sm">
                            {Math.max(0, (currentSelectedDebt.originalAmount || currentSelectedDebt.amount) - (currentSelectedDebt.paidAmount || 0)).toLocaleString()} {getLocalizedCurrency(currentSelectedDebt.currency || 'SAR', undefined, undefined, language).symbol}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                      <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">{t.repaymentAmount}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="done"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                        className="w-full bg-transparent text-2xl sm:text-3xl font-black text-[#D9B978] focus:outline-none placeholder-[#F4F1EA]/30"
                      />
                      {currentSelectedDebt && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const rem = Math.max(0, (currentSelectedDebt.originalAmount || currentSelectedDebt.amount) - (currentSelectedDebt.paidAmount || 0));
                              setAmount(rem.toString());
                            }}
                            className="px-2.5 py-1 bg-[#D9B978]/20 hover:bg-[#D9B978]/30 text-[#D9B978] rounded-lg text-[10px] font-bold border border-[#D9B978]/30"
                          >
                            {t.payFullAmount}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const rem = Math.max(0, (currentSelectedDebt.originalAmount || currentSelectedDebt.amount) - (currentSelectedDebt.paidAmount || 0));
                              setAmount((rem / 2).toString());
                            }}
                            className="px-2.5 py-1 bg-[#11161C] hover:bg-[#D9B978]/10 text-[#F4F1EA]/80 rounded-lg text-[10px] font-bold border border-[#D9B978]/20"
                          >
                            {t.halfAmount50}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#F4F1EA]/70">
                        {currentSelectedDebt?.type === 'to_me' ? t.depositToWallet : t.payFromWallet}
                      </label>
                      <select
                        value={walletId}
                        onChange={(e) => setWalletId(e.target.value)}
                        className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                      >
                        {wallets.map(w => {
                          const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                          return (
                            <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">{w.name} ({wCurrLoc.symbol})</option>
                          );
                        })}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* === 7. BALANCE ADJUSTMENT === */}
            {selectedEvent === 'balance_adjustment' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                    <WalletIcon size={14} className="text-[#D9B978]" />
                    <span>{t.selectWalletToCorrect}</span>
                  </label>
                  <select
                    value={walletId}
                    onChange={(e) => {
                      setWalletId(e.target.value);
                      const target = wallets.find(w => w.id === e.target.value);
                      if (target) {
                        const cur = target.currentBalance ?? target.openingBalance ?? 0;
                        setActualRealBalance(cur.toString());
                      }
                    }}
                    className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                  >
                    {wallets.map(w => {
                      const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                      return (
                        <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                          {w.name} ({wCurrLoc.symbol}) — {t.totalBalance}: {(w.currentBalance ?? w.openingBalance ?? 0).toLocaleString()} {wCurrLoc.symbol}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {adjustmentCalc && (
                  <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-3">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-[#D9B978]/10">
                      <span className="text-[#F4F1EA]/70 font-bold">{t.ledgerBalanceApp}</span>
                      <span className="text-[#F4F1EA] font-black text-sm">{adjustmentCalc.current.toLocaleString()} {getLocalizedCurrency(selectedSourceWallet?.currencyCode || 'SAR', undefined, undefined, language).symbol}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#D9B978] block">{t.enterActualBalanceNow}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="done"
                        required
                        autoFocus
                        placeholder="0.00"
                        value={actualRealBalance}
                        onChange={(e) => setActualRealBalance(sanitizeNumericInput(e.target.value))}
                        className="w-full bg-[#0A0D10] border border-[#D9B978]/40 rounded-xl px-3.5 py-2.5 text-xl font-black text-[#F4F1EA] focus:outline-none focus:border-[#D9B978]"
                      />
                    </div>

                    {adjustmentCalc.actual !== null && Math.abs(adjustmentCalc.diff) > 0.001 && (
                      <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        adjustmentCalc.isIncrease 
                          ? 'bg-[#8EB9A7]/15 border-[#8EB9A7]/30 text-[#8EB9A7]' 
                          : 'bg-[#C98387]/15 border-[#C98387]/30 text-[#C98387]'
                      }`}>
                        <span>{t.discrepancyDiff}</span>
                        <span className="font-black text-sm">
                          {adjustmentCalc.isIncrease ? '+' : '-'}{adjustmentCalc.absDiff?.toLocaleString()} {getLocalizedCurrency(selectedSourceWallet?.currencyCode || 'SAR', undefined, undefined, language).symbol} ({adjustmentCalc.isIncrease ? t.increaseWord : t.decreaseWord})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* COMMON FIELDS: DATE & TIME & NOTES */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                  <Calendar size={12} className="text-[#D9B978]" />
                  <span>{t.dateWord}</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                  <Clock size={12} className="text-[#D9B978]" />
                  <span>{t.timeWord}</span>
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                <StickyNote size={12} className="text-[#D9B978]" />
                <span>{t.noteOrEventDesc}</span>
              </label>
              <input
                type="text"
                placeholder={t.notePlaceholderDetail}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2 text-xs text-[#F4F1EA] font-medium focus:outline-none focus:border-[#D9B978]"
              />
            </div>

            {selectedEvent === 'expense' && (
              <div className="space-y-1.5 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                {!receipt ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#D9B978]/30 hover:border-[#D9B978] text-[#F4F1EA]/70 hover:text-[#F4F1EA] text-xs font-bold flex items-center justify-center gap-2 transition-colors bg-[#11161C]"
                  >
                    <Camera size={15} className="text-[#D9B978]" />
                    <span>{t.attachReceiptBtn}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#11161C] border border-[#D9B978]/30">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-[#D9B978]" />
                      <span className="text-xs text-[#F4F1EA] font-bold truncate max-w-[180px]">{receipt.fileName || 'Receipt'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowReceiptPreview(true)}
                        className="px-2 py-1 bg-[#0A0D10] text-[10px] font-bold text-[#F4F1EA] rounded-lg border border-[#D9B978]/30"
                      >
                        {t.viewAll}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceipt(undefined)}
                        className="p-1 text-[#C98387] hover:text-[#C98387]/80"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || (selectedEvent === 'debt_repayment' && activeDebts.length === 0)}
                className="w-full min-h-[50px] py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 shadow-lg active:scale-95 flex items-center justify-center gap-2 bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] shadow-[#D9B978]/20"
              >
                <Check size={18} strokeWidth={3} />
                <span>
                  {initialData ? t.saveChangesInLedger 
                    : selectedEvent === 'expense' ? t.recordExpenseLedger
                    : selectedEvent === 'income' ? t.recordIncomeLedger
                    : selectedEvent === 'transfer' ? t.executeTransferLedger
                    : selectedEvent === 'debt_to_me' ? t.recordDebtLedger
                    : selectedEvent === 'debt_on_me' ? t.recordLiabilityLedger
                    : selectedEvent === 'debt_repayment' ? t.recordRepaymentLedger
                    : t.confirmBalanceAdjustmentLedger
                  }
                </span>
              </button>
            </div>
          </form>
        )}

        {showReceiptPreview && receipt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
            <div className="relative max-w-lg w-full bg-[#0A0D10] rounded-2xl p-4 border border-[#D9B978]/30">
              <button
                type="button"
                onClick={() => setShowReceiptPreview(false)}
                className="absolute top-3 left-3 p-2 rounded-xl bg-[#11161C] text-[#F4F1EA] hover:bg-[#D9B978]/20 border border-[#D9B978]/30"
              >
                <X size={18} />
              </button>
              <img 
                src={receipt.dataUrl} 
                alt="Receipt" 
                className="w-full max-h-[70vh] object-contain rounded-xl mt-6"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TransactionForm;
