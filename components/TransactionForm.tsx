import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, StickyNote, Wallet as WalletIcon, ArrowLeftRight, 
  Camera, Image as ImageIcon, Trash2, CheckCircle2, Clock, 
  AlertCircle, Search, ArrowUpRight, ArrowDownLeft, 
  UserPlus, UserMinus, Scale, Check, Phone,
  Tag, Edit3, ChevronRight, Coins, RefreshCw
} from 'lucide-react';
import { 
  Transaction, 
  Category, 
  TransactionType, 
  Wallet, 
  ReceiptAttachment, 
  Debt, 
  FinancialEventType,
  Currency
} from '../types';
import { getIcon, DEFAULT_CURRENCIES, convertCurrency, tryConvertCurrency } from '../constants';
import { getLocalizedCurrency, LanguageKey } from '../utils/translations';
import { getCurrencySymbol, parseArabicNumber, sanitizeNumericInput, formatLocalDateOnly } from '../utils/formatters';
import { safeDiv, roundToCurrency } from '../utils/mathPrecision';
import { NativeKeyboard, NativeHaptics } from '../services/nativeServices';
import { saveReceiptToStorage, loadReceiptDataUrl } from '../services/receiptStorage';
import { useBackNavigation } from '../utils/backNavigation';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export type UnifiedTransactionTab = 'expense' | 'income' | 'transfer' | 'debt' | 'adjustment' | 'history';
export type DebtSubMode = 'to_me' | 'on_me' | 'repayment';

interface TransactionFormProps {
  categories: Category[];
  wallets: Wallet[];
  transactions?: Transaction[];
  debts?: Debt[];
  onSubmit: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  onAddDebt?: (debt: Omit<Debt, 'id'>, walletId?: string) => void;
  onUpdateDebt?: (id: string, updates: Partial<Debt>) => void;
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
  initialDebt?: Debt | null;
  initialPersonName?: string;
  initialDebtId?: string;
  exchangeRates: Record<string, number>;
  defaultType?: FinancialEventType | TransactionType;
  isTravelMode?: boolean;
  baseCurrency?: Currency;
  language?: LanguageKey;
  t: any;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  wallets,
  transactions = [],
  debts = [],
  onSubmit,
  onDelete,
  onAddDebt,
  onUpdateDebt,
  onPayDebt,
  onClose,
  initialData,
  initialDebt,
  initialPersonName,
  initialDebtId,
  exchangeRates,
  defaultType,
  isTravelMode,
  baseCurrency,
  language = 'ar',
  t,
}) => {
  // Determine initial tab from initialData, initialDebt, or defaultType
  const resolveInitialTab = (): { tab: UnifiedTransactionTab; debtMode: DebtSubMode } => {
    if (initialDebt) {
      return { tab: 'debt', debtMode: initialDebt.type };
    }
    if (initialData) {
      if (initialData.type === 'income') return { tab: 'income', debtMode: 'to_me' };
      if (initialData.type === 'transfer') return { tab: 'transfer', debtMode: 'to_me' };
      if (initialData.type === 'adjustment') return { tab: 'adjustment', debtMode: 'to_me' };
      return { tab: 'expense', debtMode: 'to_me' };
    }
    if (defaultType) {
      if (defaultType === 'income') return { tab: 'income', debtMode: 'to_me' };
      if (defaultType === 'transfer') return { tab: 'transfer', debtMode: 'to_me' };
      if (defaultType === 'adjustment' || defaultType === 'balance_adjustment') return { tab: 'adjustment', debtMode: 'to_me' };
      if (defaultType === 'debt_to_me') return { tab: 'debt', debtMode: 'to_me' };
      if (defaultType === 'debt_on_me') return { tab: 'debt', debtMode: 'on_me' };
      if (defaultType === 'debt_repayment') return { tab: 'debt', debtMode: 'repayment' };
      return { tab: 'expense', debtMode: 'to_me' };
    }
    return { tab: 'expense', debtMode: 'to_me' };
  };

  const initialConfig = resolveInitialTab();
  const [activeTab, setActiveTab] = useState<UnifiedTransactionTab>(initialConfig.tab);
  const [debtSubMode, setDebtSubMode] = useState<DebtSubMode>(initialConfig.debtMode);
  
  // Navigation step compatibility for testing invariants & deep history linking
  const [navStep, setNavStep] = useState<'what_happened' | 'previous_transactions_list' | 'edit_transaction'>(
    initialData || initialDebt ? 'edit_transaction' : 'edit_transaction'
  );
  
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(Boolean(initialData || initialDebt));
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<string>(initialData?.id || '');

  const [amount, setAmount] = useState(() => {
    if (initialDebt) return (initialDebt.originalAmount || initialDebt.amount).toString();
    if (initialData) return initialData.amount.toString();
    return '';
  });
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [walletId, setWalletId] = useState(initialData?.walletId || wallets[0]?.id || '');
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    initialData?.destinationWalletId || (wallets.length > 1 ? wallets[1]?.id : '')
  );
  const [destinationAmount, setDestinationAmount] = useState<string>(
    initialData?.destinationAmount ? initialData.destinationAmount.toString() : ''
  );
  const [note, setNote] = useState(initialDebt?.note || initialData?.note || '');
  const [date, setDate] = useState(initialData?.date || formatLocalDateOnly(new Date()));
  const [time, setTime] = useState(initialData?.time || new Date().toTimeString().slice(0, 5));
  const [receipt, setReceipt] = useState<ReceiptAttachment | undefined>(initialData?.receipt);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debt fields
  const [personName, setPersonName] = useState(initialDebt?.personName || initialPersonName || '');
  const [personPhone, setPersonPhone] = useState(initialDebt?.personPhone || '');
  const [debtDueDate, setDebtDueDate] = useState(initialDebt?.dueDate || '');
  const [linkDebtToWallet, setLinkDebtToWallet] = useState(!initialDebt);
  const [selectedDebtIdForRepayment, setSelectedDebtIdForRepayment] = useState<string>(() => {
    if (initialDebtId) return initialDebtId;
    return debts.find(d => !d.isPaid)?.id || '';
  });

  useEffect(() => {
    if (initialDebt) {
      setPersonName(initialDebt.personName || '');
      setPersonPhone(initialDebt.personPhone || '');
      setDebtDueDate(initialDebt.dueDate || '');
      setAmount((initialDebt.originalAmount || initialDebt.amount).toString());
      setNote(initialDebt.note || '');
      setDebtSubMode(initialDebt.type);
    } else if (initialPersonName) {
      setPersonName(initialPersonName);
    }
  }, [initialDebt, initialPersonName]);

  useEffect(() => {
    if (initialDebtId) {
      setSelectedDebtIdForRepayment(initialDebtId);
      const target = debts.find(d => d.id === initialDebtId);
      if (target) {
        const rem = Math.max(0, (target.originalAmount || target.amount) - (target.paidAmount || 0));
        setAmount(rem.toString());
      }
    }
  }, [initialDebtId, debts]);

  // Search filter for previous transactions
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // Balance adjustment fields
  const [actualRealBalance, setActualRealBalance] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const primaryInputRef = useRef<HTMLInputElement | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Handle Tab Switching
  const handleTabChange = (newTab: UnifiedTransactionTab) => {
    NativeHaptics.selection().catch(() => {});
    setErrorMessage('');
    setActiveTab(newTab);
    if (newTab === 'history') {
      setNavStep('previous_transactions_list');
    } else {
      setNavStep('edit_transaction');
      // Auto assign default category if empty
      if (newTab === 'expense' && (!categoryId || !categories.some(c => c.id === categoryId && c.type === 'expense'))) {
        const firstExp = categories.find(c => c.type === 'expense');
        if (firstExp) setCategoryId(firstExp.id);
      } else if (newTab === 'income' && (!categoryId || !categories.some(c => c.id === categoryId && c.type === 'income'))) {
        const firstInc = categories.find(c => c.type === 'income');
        if (firstInc) setCategoryId(firstInc.id);
      } else if (newTab === 'adjustment') {
        const selW = wallets.find(w => w.id === walletId) || wallets[0];
        if (selW && !actualRealBalance) {
          setActualRealBalance((selW.currentBalance ?? selW.openingBalance ?? 0).toString());
        }
      }
    }
  };

  const dismissKeyboard = () => {
    NativeKeyboard.hide().catch(() => {});
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  const handleKeyDownPreventEnter = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dismissKeyboard();
    }
  };

  const addQuickAmount = (val: number) => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    const current = parseArabicNumber(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleDeleteCurrent = () => {
    NativeHaptics.notification('WARNING').catch(() => {});
    const idToDelete = initialData?.id || selectedTxForEdit;
    if (idToDelete && onDelete) {
      onDelete(idToDelete);
      if (initialData) {
        onClose();
      } else {
        setSelectedTxForEdit('');
        setIsEditingExisting(false);
        setActiveTab('history');
        setShowDeleteConfirm(false);
      }
    }
  };

  const handleSelectTransactionItem = (txId: string) => {
    handleSelectTxForEdit(txId);
  };

  const handleStepBack = (): boolean => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      return true;
    }
    if (activeTab === 'history') {
      setActiveTab('expense');
      setNavStep('edit_transaction');
      return true;
    }
    if (isEditingExisting && !initialData) {
      setIsEditingExisting(false);
      setSelectedTxForEdit('');
      setActiveTab('history');
      return true;
    }
    onClose();
    return true;
  };

  // Register back handler
  useBackNavigation(handleStepBack, true, 20);
  
  const selectedSourceWallet = wallets.find(w => w.id === walletId) || wallets[0];
  const selectedDestWallet = wallets.find(w => w.id === destinationWalletId) || (wallets.length > 1 ? wallets[1] : undefined);
  
  const [inputCurrency, setInputCurrency] = useState(
    initialData?.currency || selectedSourceWallet?.currencyCode || 'SAR'
  );

  // Swap Source and Destination Wallets in Transfer mode
  const handleSwapWallets = () => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    if (destinationWalletId && walletId) {
      const prevSource = walletId;
      const prevDest = destinationWalletId;
      setWalletId(prevDest);
      setDestinationWalletId(prevSource);
    }
  };

  const handleAmountChange = (val: string) => {
    const sanitized = sanitizeNumericInput(val);
    setAmount(sanitized);
  };

  useEffect(() => {
    if (activeTab === 'expense' && !categoryId) {
      const firstExp = categories.find(c => c.type === 'expense');
      if (firstExp) setCategoryId(firstExp.id);
    } else if (activeTab === 'income' && !categoryId) {
      const firstInc = categories.find(c => c.type === 'income');
      if (firstInc) setCategoryId(firstInc.id);
    }
  }, [activeTab, categories]);

  useEffect(() => {
    if (selectedSourceWallet && !initialData && activeTab !== 'transfer') {
      setInputCurrency(selectedSourceWallet.currencyCode);
    }
  }, [walletId, activeTab]);

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

  const filteredPreviousTransactions = useMemo(() => {
    if (!txSearchQuery.trim()) return transactions;
    const q = txSearchQuery.toLowerCase().trim();
    return transactions.filter(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const noteMatch = tx.note?.toLowerCase().includes(q);
      const catMatch = cat?.name?.toLowerCase().includes(q);
      const amtMatch = tx.amount.toString().includes(q);
      return noteMatch || catMatch || amtMatch;
    });
  }, [transactions, txSearchQuery, categories]);

  const handleSelectTxForEdit = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    setSelectedTxForEdit(txId);
    setIsEditingExisting(true);
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

    if (tx.type === 'income') {
      setActiveTab('income');
    } else if (tx.type === 'transfer') {
      setActiveTab('transfer');
    } else if (tx.type === 'adjustment') {
      setActiveTab('adjustment');
      setActualRealBalance(tx.amount.toString());
    } else {
      setActiveTab('expense');
    }
    setNavStep('edit_transaction');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(language === 'en' ? 'Image size is too large (max 5MB)' : 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Res = reader.result as string;
        const newReceipt: ReceiptAttachment = {
          id: 'rcpt-' + Date.now(),
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          createdAt: new Date().toISOString()
        };
        const saved = await saveReceiptToStorage(newReceipt, base64Res);
        setReceipt(saved);
      };
      reader.readAsDataURL(file);
    }
  };

  const adjustmentCalc = useMemo(() => {
    if (activeTab !== 'adjustment') return null;
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
  }, [activeTab, selectedSourceWallet, actualRealBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (activeTab !== 'adjustment') {
      const rawClean = typeof amount === 'string' ? amount.trim() : String(amount || '');
      if (rawClean.includes('-')) {
        NativeHaptics.notification('ERROR').catch(() => {});
        setErrorMessage(language === 'en' ? 'Negative values are forbidden in transactions' : 'ممنوع إدخال القيم السالبة في المعاملات المالية');
        return;
      }

      const numAmount = parseArabicNumber(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        NativeHaptics.notification('ERROR').catch(() => {});
        setErrorMessage(language === 'en' ? 'Transaction amount must be greater than zero' : 'ممنوع إدخال قيمة سالبة أو صفر. يرجى إدخال مبلغ موجب أكبر من الصفر');
        return;
      }
    }

    const numAmount = Math.abs(parseArabicNumber(amount));
    setIsSubmitting(true);

    try {
      NativeHaptics.notification('SUCCESS').catch(() => {});
      if (activeTab === 'expense') {
        const sourceCurrency = inputCurrency || selectedSourceWallet?.currencyCode || 'SAR';
        const walletCurrency = selectedSourceWallet?.currencyCode || sourceCurrency;
        const convertedValue = sourceCurrency !== walletCurrency && exchangeRates
          ? convertCurrency(numAmount, sourceCurrency, walletCurrency, exchangeRates)
          : numAmount;

        onSubmit({
          id: initialData?.id || (isEditingExisting ? selectedTxForEdit : undefined),
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
      } else if (activeTab === 'income') {
        const sourceCurrency = inputCurrency || selectedSourceWallet?.currencyCode || 'SAR';
        const walletCurrency = selectedSourceWallet?.currencyCode || sourceCurrency;
        const convertedValue = sourceCurrency !== walletCurrency && exchangeRates
          ? convertCurrency(numAmount, sourceCurrency, walletCurrency, exchangeRates)
          : numAmount;

        onSubmit({
          id: initialData?.id || (isEditingExisting ? selectedTxForEdit : undefined),
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
      } else if (activeTab === 'transfer') {
        if (walletId === destinationWalletId) {
          setErrorMessage(language === 'en' ? 'Cannot transfer between the same wallet' : 'لا يمكن التحويل بين نفس المحفظة');
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
          id: initialData?.id || (isEditingExisting ? selectedTxForEdit : undefined),
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
      } else if (activeTab === 'debt') {
        if (initialDebt && onUpdateDebt) {
          if (!personName.trim()) {
            setErrorMessage(language === 'en' ? 'Please enter contact name' : 'الرجاء إدخال اسم الطرف المعني');
            setIsSubmitting(false);
            return;
          }
          let finalAmount = numAmount;
          if (inputCurrency !== selectedSourceWallet?.currencyCode && exchangeRates) {
            finalAmount = convertCurrency(numAmount, inputCurrency, selectedSourceWallet.currencyCode, exchangeRates);
          }
          onUpdateDebt(initialDebt.id, {
            type: debtSubMode === 'on_me' ? 'on_me' : 'to_me',
            personName: personName.trim(),
            personPhone: personPhone.trim(),
            amount: finalAmount,
            originalAmount: finalAmount,
            dueDate: debtDueDate || undefined,
            note: note || '',
          });
          onClose();
          return;
        }

        if (debtSubMode === 'to_me') {
          if (!personName.trim()) {
            setErrorMessage(language === 'en' ? 'Please enter debtor person name' : 'الرجاء إدخال اسم الشخص المدين');
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
        } else if (debtSubMode === 'on_me') {
          if (!personName.trim()) {
            setErrorMessage(language === 'en' ? 'Please enter creditor person name' : 'الرجاء إدخال اسم صاحب الدين (الدائن)');
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
        } else if (debtSubMode === 'repayment') {
          if (!currentSelectedDebt) {
            setErrorMessage(language === 'en' ? 'Please select debt to repay' : 'الرجاء اختيار الذمة المالية المراد سدادها');
            setIsSubmitting(false);
            return;
          }
          const rem = Math.max(0, (currentSelectedDebt.originalAmount || currentSelectedDebt.amount) - (currentSelectedDebt.paidAmount || 0));
          if (numAmount > rem + 0.01) {
            setErrorMessage(language === 'en' ? 'Payment amount exceeds remaining debt balance' : 'مبلغ الدفعة أكبر من المتبقي في الذمة المالية');
            setIsSubmitting(false);
            return;
          }
          if (onPayDebt) {
            onPayDebt(currentSelectedDebt.id, numAmount, walletId, note ? ` - ${note}` : undefined, undefined, date);
          }
          onClose();
        }
      } else if (activeTab === 'adjustment') {
        if (!adjustmentCalc || adjustmentCalc.actual === null) {
          setErrorMessage(language === 'en' ? 'Please enter actual balance' : 'الرجاء إدخال الرصيد الفعلي');
          setIsSubmitting(false);
          return;
        }
        if (adjustmentCalc.actual < 0) {
          setErrorMessage(language === 'en' ? 'Actual wallet balance cannot be negative' : 'ممنوع إدخال رصيد فعلي سالب. يجب أن يكون الرصيد صفراً أو موجباً');
          setIsSubmitting(false);
          return;
        }
        onSubmit({
          type: 'adjustment',
          amount: adjustmentCalc.diff,
          currency: selectedSourceWallet?.currencyCode || 'SAR',
          walletId,
          categoryId: categoryId || categories[0]?.id || 'general',
          note: note || (language === 'ar' ? `تسوية رصيد محفظة ${selectedSourceWallet?.name} إلى ${adjustmentCalc.actual}` : `Balance adjustment for ${selectedSourceWallet?.name}`),
          date,
          time,
          frequency: 'once'
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ المعاملة' : 'Error saving transaction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-[#0A0D10] border border-[#D9B978]/25 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92dvh] max-h-[860px] my-auto"
      >
        {/* TOP BAR / UNIFIED HEADER */}
        <div className="p-3.5 sm:p-4 border-b border-[#D9B978]/15 bg-[#11161C] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
                {activeTab === 'expense' ? <ArrowDownLeft size={18} className="text-[#C98387]" /> :
                 activeTab === 'income' ? <ArrowUpRight size={18} className="text-[#8EB9A7]" /> :
                 activeTab === 'transfer' ? <ArrowLeftRight size={18} className="text-[#D9B978]" /> :
                 activeTab === 'debt' ? <Coins size={18} className="text-[#D9B978]" /> :
                 activeTab === 'adjustment' ? <Scale size={18} className="text-[#D9B978]" /> :
                 <Edit3 size={18} className="text-[#D9B978]" />}
              </div>
              <div>
                <h3 className="font-black text-[#F4F1EA] text-sm sm:text-base leading-tight">
                  {initialData || isEditingExisting ? (language === 'ar' ? 'تعديل المعاملة' : 'Edit Transaction') :
                   activeTab === 'expense' ? (t.recordExpense || 'تسجيل مصروف') :
                   activeTab === 'income' ? (t.recordIncome || 'إيداع دخل') :
                   activeTab === 'transfer' ? (t.transferWallet || 'تحويل مالي بين المحافظ') :
                   activeTab === 'debt' ? (language === 'ar' ? 'قيد وسداد الديون' : 'Debt Management') :
                   activeTab === 'adjustment' ? (t.balanceAdjustmentTitle || 'تسوية الرصيد') :
                   (language === 'ar' ? 'سجل وتعديل المعاملات' : 'Transaction History')}
                </h3>
                <p className="text-[10px] text-[#F4F1EA]/50 font-medium">
                  {language === 'ar' ? 'نموذج موحد وسريع للقيود المحاسبية' : 'Unified financial ledger form'}
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#0A0D10] hover:bg-[#C98387]/20 text-[#F4F1EA]/70 hover:text-[#C98387] flex items-center justify-center transition-all duration-150 active:scale-95 border border-[#D9B978]/20"
            >
              <X size={16} />
            </button>
          </div>

          {/* UNIFIED SEGMENTED TYPE SWITCHER */}
          <div className="flex items-center gap-1 p-1 bg-[#0A0D10] rounded-2xl border border-[#D9B978]/20 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleTabChange('expense')}
              className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'expense'
                  ? 'bg-[#C98387] text-[#0A0D10] shadow-sm'
                  : 'text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:bg-white/5'
              }`}
            >
              <ArrowDownLeft size={13} />
              <span>{t.expenses || 'مصروف'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('income')}
              className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'income'
                  ? 'bg-[#8EB9A7] text-[#0A0D10] shadow-sm'
                  : 'text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:bg-white/5'
              }`}
            >
              <ArrowUpRight size={13} />
              <span>{t.income || 'دخل'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('transfer')}
              className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'transfer'
                  ? 'bg-[#D9B978] text-[#0A0D10] shadow-sm'
                  : 'text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:bg-white/5'
              }`}
            >
              <ArrowLeftRight size={13} />
              <span>{t.transfer || 'تحويل'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('debt')}
              className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'debt'
                  ? 'bg-[#D9B978] text-[#0A0D10] shadow-sm'
                  : 'text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:bg-white/5'
              }`}
            >
              <Coins size={13} />
              <span>{t.debts || 'ديون'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('adjustment')}
              className={`flex-1 min-w-[62px] py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'adjustment'
                  ? 'bg-[#D9B978] text-[#0A0D10] shadow-sm'
                  : 'text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:bg-white/5'
              }`}
            >
              <Scale size={13} />
              <span>{t.adjustment || 'تسوية'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('history')}
              className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0 ${
                activeTab === 'history'
                  ? 'bg-[#D9B978] text-[#0A0D10] shadow-sm'
                  : 'text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:bg-white/5'
              }`}
              title={language === 'ar' ? 'سجل العمليات والتعديل' : 'History / Edit'}
            >
              <Edit3 size={13} />
              <span>{language === 'ar' ? 'السجل' : 'Log'}</span>
            </button>
          </div>

          {/* DEBT SUB-MODE SWITCHER (WHEN DEBT TAB IS ACTIVE) */}
          {activeTab === 'debt' && (
            <div className="flex items-center gap-1.5 p-1 bg-[#0A0D10] rounded-xl border border-[#D9B978]/15">
              <button
                type="button"
                onClick={() => setDebtSubMode('to_me')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  debtSubMode === 'to_me'
                    ? 'bg-[#8EB9A7]/25 text-[#8EB9A7] border border-[#8EB9A7]/40'
                    : 'text-[#F4F1EA]/60 hover:text-[#F4F1EA]'
                }`}
              >
                <UserPlus size={12} />
                <span>{language === 'ar' ? 'دين لي (أطلب شخصاً)' : 'Debt To Me'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDebtSubMode('on_me')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  debtSubMode === 'on_me'
                    ? 'bg-[#D9B978]/25 text-[#D9B978] border border-[#D9B978]/40'
                    : 'text-[#F4F1EA]/60 hover:text-[#F4F1EA]'
                }`}
              >
                <UserMinus size={12} />
                <span>{language === 'ar' ? 'دين عليّ (التزام)' : 'Debt On Me'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDebtSubMode('repayment')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  debtSubMode === 'repayment'
                    ? 'bg-[#D9B978]/25 text-[#D9B978] border border-[#D9B978]/40'
                    : 'text-[#F4F1EA]/60 hover:text-[#F4F1EA]'
                }`}
              >
                <CheckCircle2 size={12} />
                <span>{language === 'ar' ? 'سداد دفعة' : 'Repayment'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mx-4 mt-2.5 p-2.5 bg-[#C98387]/15 border border-[#C98387]/30 rounded-2xl flex items-center gap-2.5 text-[#C98387] text-xs font-bold shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1 TO 5: UNIFIED DEDICATED TRANSACTION FORM */}
        {activeTab !== 'history' && (
          <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-[#0A0D10]"
          >
            {/* Travel Mode Prominent Exchange Rate Banner */}
            {isTravelMode && (() => {
              const baseCurrencyCode = baseCurrency?.code || 'SAR';
              const currentLocalCode = inputCurrency || selectedSourceWallet?.currencyCode || baseCurrencyCode;
              const fxResult = tryConvertCurrency(1, currentLocalCode, baseCurrencyCode, exchangeRates);
              const conversionRate = fxResult.effectiveRate ?? 1;
              return (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💱</span>
                    <div>
                      <p className="text-[10px] font-bold text-amber-300">
                        {language === 'ar' ? 'وضع السفر وصرف العملة' : 'Travel Mode Exchange Rate'}
                      </p>
                      <p className="text-xs font-bold text-white font-numeric">
                        1 {getCurrencySymbol(currentLocalCode)} = {conversionRate.toLocaleString()} {getCurrencySymbol(baseCurrencyCode)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg font-mono font-bold">
                    {currentLocalCode} ➔ {baseCurrencyCode}
                  </span>
                </div>
              );
            })()}

            {/* UNIFIED AMOUNT & CURRENCY BOX (EXCEPT FOR REPAYMENT / ADJUSTMENT SPECIAL CASES) */}
            {activeTab !== 'adjustment' && (
              <div className="p-3.5 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#F4F1EA]/70 uppercase tracking-wider block">
                    {activeTab === 'expense' ? (t.expenseAmountAndCurrency || 'مبلغ المصروف والعملة') :
                     activeTab === 'income' ? (t.incomeAmountAndCurrency || 'مبلغ الدخل والعملة') :
                     activeTab === 'transfer' ? (t.amountToTransfer || 'المبلغ المراد تحويله') :
                     debtSubMode === 'to_me' ? (t.debtAmountOwedToMe || 'مبلغ الدين المستحق لك') :
                     debtSubMode === 'on_me' ? (t.debtAmountOwedByMe || 'مبلغ الالتزام المستحق عليك') :
                     (t.repaymentAmount || 'مبلغ الدفعة المسددة')}
                  </label>
                  {isEditingExisting && (
                    <span className="text-[10px] text-[#D9B978] bg-[#D9B978]/15 px-2 py-0.5 rounded-lg font-bold">
                      {language === 'ar' ? 'تعديل قيد سابق' : 'Editing existing'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={primaryInputRef}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    required
                    placeholder="0.00"
                    value={amount}
                    onKeyDown={handleKeyDownPreventEnter}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`w-full bg-transparent text-2xl sm:text-3xl font-black focus:outline-none placeholder-[#F4F1EA]/25 font-numeric ${
                      activeTab === 'expense' ? 'text-[#C98387]' :
                      activeTab === 'income' ? 'text-[#8EB9A7]' :
                      'text-[#D9B978]'
                    }`}
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

                {/* Quick amount increment pills */}
                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar py-0.5">
                  {[50, 100, 500, 1000].map(inc => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => addQuickAmount(inc)}
                      className="px-2.5 py-1 rounded-lg bg-[#171D24] hover:bg-[#D9B978]/20 text-[#D9B978] text-[11px] font-bold border border-[#D9B978]/25 shrink-0 active:scale-95 transition-all"
                    >
                      +{inc}
                    </button>
                  ))}
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="px-2 py-1 rounded-lg bg-[#C98387]/15 hover:bg-[#C98387]/25 text-[#C98387] text-[11px] font-bold border border-[#C98387]/30 shrink-0 active:scale-95 transition-all"
                    >
                      {language === 'ar' ? 'مسح' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* UNIFIED WALLET CONTROLS */}
            {activeTab !== 'transfer' && activeTab !== 'debt' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                  <WalletIcon size={14} className="text-[#D9B978]" />
                  <span>
                    {activeTab === 'expense' ? (t.payFromWallet || 'الدفع من محفظة:') :
                     activeTab === 'income' ? (t.depositToWallet || 'الإيداع في محفظة:') :
                     (t.selectWalletToCorrect || 'اختر المحفظة المراد تصحيح رصيدها:')}
                  </span>
                </label>
                <select
                  value={walletId}
                  onChange={(e) => {
                    setWalletId(e.target.value);
                    if (activeTab === 'adjustment') {
                      const target = wallets.find(w => w.id === e.target.value);
                      if (target) {
                        setActualRealBalance((target.currentBalance ?? target.openingBalance ?? 0).toString());
                      }
                    }
                  }}
                  className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#F4F1EA] font-bold focus:outline-none focus:border-[#D9B978]"
                >
                  {wallets.map(w => {
                    const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                    const curBal = (w.currentBalance ?? w.openingBalance ?? 0);
                    return (
                      <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                        {w.name} ({wCurrLoc.symbol}) — {t.totalBalance || 'الرصيد'}: {curBal.toLocaleString()} {wCurrLoc.symbol}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* TRANSFER WALLETS (SOURCE & DESTINATION) */}
            {activeTab === 'transfer' && (
              <div className="p-3.5 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#D9B978]/10">
                  <span className="text-xs font-bold text-[#D9B978]">{t.transferWallet || 'تحويل مالي بين المحافظ'}</span>
                  {wallets.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSwapWallets}
                      className="px-2.5 py-1 rounded-xl bg-[#0A0D10] text-[#D9B978] text-[11px] font-bold border border-[#D9B978]/30 hover:bg-[#D9B978]/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <RefreshCw size={12} />
                      <span>{language === 'ar' ? 'تبديل المحافظ' : 'Swap'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                      <ArrowDownLeft size={12} className="text-[#C98387]" />
                      <span>{t.transferFromWallet || 'من محفظة (خصم):'}</span>
                    </label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                    >
                      {wallets.map(w => {
                        const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                        const curBal = (w.currentBalance ?? w.openingBalance ?? 0);
                        return (
                          <option key={w.id} value={w.id} disabled={w.id === destinationWalletId} className="bg-[#0A0D10] text-[#F4F1EA]">
                            {w.name} ({curBal.toLocaleString()} {wCurrLoc.symbol})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                      <ArrowUpRight size={12} className="text-[#8EB9A7]" />
                      <span>{t.transferToWallet || 'إلى محفظة (إيداع):'}</span>
                    </label>
                    <select
                      value={destinationWalletId}
                      onChange={(e) => setDestinationWalletId(e.target.value)}
                      className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                    >
                      {wallets.map(w => {
                        const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                        const curBal = (w.currentBalance ?? w.openingBalance ?? 0);
                        return (
                          <option key={w.id} value={w.id} disabled={w.id === walletId} className="bg-[#0A0D10] text-[#F4F1EA]">
                            {w.name} ({curBal.toLocaleString()} {wCurrLoc.symbol})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {selectedSourceWallet?.currencyCode !== selectedDestWallet?.currencyCode && selectedDestWallet && (
                  <div className="p-2.5 bg-[#0A0D10] border border-[#D9B978]/25 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#D9B978]">{t.receivedAmountTargetCurrency || 'المبلغ المستلم بالعملة المستهدفة:'}</span>
                      <span className="text-[10px] text-[#F4F1EA]/60 font-bold">
                        {getLocalizedCurrency(selectedDestWallet.currencyCode, undefined, undefined, language).symbol}
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      placeholder="0.00"
                      value={destinationAmount}
                      onKeyDown={handleKeyDownPreventEnter}
                      onChange={(e) => setDestinationAmount(sanitizeNumericInput(e.target.value))}
                      className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-lg px-3 py-1.5 text-xs text-[#F4F1EA] font-bold focus:outline-none font-numeric"
                    />
                  </div>
                )}
              </div>
            )}

            {/* CATEGORIES GRID (EXPENSE & INCOME) */}
            {(activeTab === 'expense' || activeTab === 'income') && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1.5">
                  <Tag size={13} className={activeTab === 'expense' ? 'text-[#C98387]' : 'text-[#8EB9A7]'} />
                  <span>{activeTab === 'expense' ? (t.expenseCategory || 'تصنيف المصروف:') : (t.incomeSourceCategory || 'مصدر / تصنيف الدخل:')}</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                  {categories.filter(c => c.type === activeTab).map(cat => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`p-2 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center ${
                          isSelected 
                            ? activeTab === 'expense' 
                              ? 'bg-[#C98387]/20 text-[#C98387] border-[#C98387] ring-1 ring-[#C98387]' 
                              : 'bg-[#8EB9A7]/20 text-[#8EB9A7] border-[#8EB9A7] ring-1 ring-[#8EB9A7]'
                            : 'bg-[#11161C] border-[#D9B978]/20 text-[#F4F1EA]/70 hover:text-[#F4F1EA] hover:border-[#D9B978]/40'
                        }`}
                      >
                        <span className={isSelected ? (activeTab === 'expense' ? 'text-[#C98387]' : 'text-[#8EB9A7]') : 'text-[#D9B978]/80'}>
                          {getIcon(cat.icon, 16)}
                        </span>
                        <span className="text-[10px] truncate max-w-full">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DEBT FIELDS (TO_ME, ON_ME, REPAYMENT) */}
            {activeTab === 'debt' && (
              <div className="space-y-3">
                {debtSubMode !== 'repayment' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                        {debtSubMode === 'to_me' ? <UserPlus size={13} className="text-[#8EB9A7]" /> : <UserMinus size={13} className="text-[#D9B978]" />}
                        <span>{debtSubMode === 'to_me' ? (t.debtorPersonName || 'اسم الشخص المستدين (المدين):') : (t.creditorPersonName || 'اسم صاحب الدين (الدائن):')}</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={language === 'ar' ? 'مثال: أحمد، شركة...' : 'e.g. Ahmad, Company...'}
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
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

                    <div className="p-2.5 bg-[#11161C] rounded-xl border border-[#D9B978]/20 space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={linkDebtToWallet}
                          onChange={(e) => setLinkDebtToWallet(e.target.checked)}
                          className="w-4 h-4 rounded text-[#D9B978] focus:ring-0 bg-[#0A0D10] border-[#D9B978]/30"
                        />
                        <span className="text-xs font-bold text-[#F4F1EA]">
                          {debtSubMode === 'to_me' ? (t.deductWalletNow || 'خصم المبلغ من محفظة نقدية الآن') : (t.depositWalletNow || 'إيداع المبلغ في محفظة الآن')}
                        </span>
                      </label>
                      {linkDebtToWallet && (
                        <select
                          value={walletId}
                          onChange={(e) => setWalletId(e.target.value)}
                          className="w-full bg-[#0A0D10] border border-[#D9B978]/30 rounded-xl px-3 py-1.5 text-xs text-[#F4F1EA] font-bold focus:outline-none mt-1"
                        >
                          {wallets.map(w => {
                            const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                            const curBal = (w.currentBalance ?? w.openingBalance ?? 0);
                            return (
                              <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">{w.name} ({curBal.toLocaleString()} {wCurrLoc.symbol})</option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#F4F1EA]/70">{t.dueDateOptional || 'تاريخ الاستحقاق'}</label>
                        <input
                          type="date"
                          value={debtDueDate}
                          onChange={(e) => setDebtDueDate(e.target.value)}
                          className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-1.5 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#F4F1EA]/70">{t.phoneOptional || 'الهاتف (اختياري)'}</label>
                        <input
                          type="tel"
                          inputMode="tel"
                          placeholder="05XXXXXXXX"
                          value={personPhone}
                          onKeyDown={handleKeyDownPreventEnter}
                          onChange={(e) => setPersonPhone(e.target.value)}
                          className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-1.5 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* REPAYMENT SUBMODE */}
                    {activeDebts.length === 0 ? (
                      <div className="p-4 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 text-center space-y-1.5">
                        <CheckCircle2 size={24} className="text-[#8EB9A7] mx-auto" />
                        <h4 className="font-bold text-[#F4F1EA] text-xs">{language === 'ar' ? 'لا توجد ديون نشطة تتطلب السداد' : 'No active debts'}</h4>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#F4F1EA]/70">{t.selectDebtToRepay || 'اختر الذمة المالية المراد سدادها:'}</label>
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
                            className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3.5 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                          >
                            {activeDebts.map(d => {
                              const rem = Math.max(0, (d.originalAmount || d.amount) - (d.paidAmount || 0));
                              const dCurrLoc = getLocalizedCurrency(d.currency || 'SAR', undefined, undefined, language);
                              return (
                                <option key={d.id} value={d.id} className="bg-[#0A0D10] text-[#F4F1EA]">
                                  {d.type === 'to_me' ? (language === 'ar' ? '[دين لي]' : '[To Me]') : (language === 'ar' ? '[دين عليّ]' : '[On Me]')} {d.personName} — {rem.toLocaleString()} {dCurrLoc.symbol}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {currentSelectedDebt && (
                          <div className="p-2.5 bg-[#11161C] border border-[#D9B978]/25 rounded-xl flex items-center justify-between text-xs">
                            <span className="font-black text-[#F4F1EA]">{currentSelectedDebt.personName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#F4F1EA]/60">{t.remainingBalance || 'المتبقي'}:</span>
                              <span className="font-black text-[#D9B978] font-numeric">
                                {Math.max(0, (currentSelectedDebt.originalAmount || currentSelectedDebt.amount) - (currentSelectedDebt.paidAmount || 0)).toLocaleString()} {getLocalizedCurrency(currentSelectedDebt.currency || 'SAR', undefined, undefined, language).symbol}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#F4F1EA]/70">
                            {currentSelectedDebt?.type === 'to_me' ? (t.depositToWallet || 'الإيداع في محفظة:') : (t.payFromWallet || 'الدفع من محفظة:')}
                          </label>
                          <select
                            value={walletId}
                            onChange={(e) => setWalletId(e.target.value)}
                            className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                          >
                            {wallets.map(w => {
                              const wCurrLoc = getLocalizedCurrency(w.currencyCode, undefined, undefined, language);
                              const curBal = (w.currentBalance ?? w.openingBalance ?? 0);
                              return (
                                <option key={w.id} value={w.id} className="bg-[#0A0D10] text-[#F4F1EA]">{w.name} ({curBal.toLocaleString()} {wCurrLoc.symbol})</option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* BALANCE ADJUSTMENT VIEW */}
            {activeTab === 'adjustment' && adjustmentCalc && (
              <div className="p-3.5 bg-[#11161C] rounded-2xl border border-[#D9B978]/20 space-y-2.5">
                <div className="flex justify-between items-center text-xs pb-1.5 border-b border-[#D9B978]/10">
                  <span className="text-[#F4F1EA]/70 font-bold">{t.ledgerBalanceApp || 'الرصيد الدفتري المسجل في التطبيق:'}</span>
                  <span className="text-[#F4F1EA] font-black text-sm font-numeric">{adjustmentCalc.current.toLocaleString()} {getLocalizedCurrency(selectedSourceWallet?.currencyCode || 'SAR', undefined, undefined, language).symbol}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#D9B978] block">{t.enterActualBalanceNow || 'أدخل الرصيد الفعلي الموجود لديك الآن:'}</label>
                  <input
                    ref={primaryInputRef}
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    required
                    placeholder="0.00"
                    value={actualRealBalance}
                    onKeyDown={handleKeyDownPreventEnter}
                    onChange={(e) => setActualRealBalance(sanitizeNumericInput(e.target.value))}
                    className="w-full bg-[#0A0D10] border border-[#D9B978]/40 rounded-xl px-3 py-2 text-lg font-black text-[#F4F1EA] focus:outline-none font-numeric"
                  />
                </div>

                {adjustmentCalc.actual !== null && Math.abs(adjustmentCalc.diff) > 0.001 && (
                  <div className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                    adjustmentCalc.isIncrease 
                      ? 'bg-[#8EB9A7]/15 border-[#8EB9A7]/30 text-[#8EB9A7]' 
                      : 'bg-[#C98387]/15 border-[#C98387]/30 text-[#C98387]'
                  }`}>
                    <span>{t.discrepancyDiff || 'فارق التسوية والتصحيح:'}</span>
                    <span className="font-black font-numeric">
                      {adjustmentCalc.isIncrease ? '+' : '-'}{adjustmentCalc.absDiff?.toLocaleString()} {getLocalizedCurrency(selectedSourceWallet?.currencyCode || 'SAR', undefined, undefined, language).symbol} ({adjustmentCalc.isIncrease ? (t.increaseWord || 'زيادة') : (t.decreaseWord || 'عجز/نقص')})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* UNIFIED DESCRIPTION / NOTE / "ماذا حدث؟" */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#F4F1EA]/80 flex items-center gap-1">
                <StickyNote size={12} className="text-[#D9B978]" />
                <span>{language === 'ar' ? 'ماذا حدث؟ (البيان / ملاحظة المعاملة)' : (t.noteOrEventDesc || 'Notes / Details')}</span>
              </label>
              <input
                type="text"
                placeholder={language === 'ar' ? 'اكتب بيان أو تفاصيل المعاملة...' : (t.notePlaceholderDetail || 'Detailed note...')}
                value={note}
                onKeyDown={handleKeyDownPreventEnter}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-3 py-2 text-xs text-[#F4F1EA] font-medium focus:outline-none focus:border-[#D9B978]"
              />
            </div>

            {/* UNIFIED DATE & TIME */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                  <Calendar size={11} className="text-[#D9B978]" />
                  <span>{t.dateWord || 'التاريخ'}</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-2.5 py-1.5 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-[#F4F1EA]/70 flex items-center gap-1">
                  <Clock size={11} className="text-[#D9B978]" />
                  <span>{t.timeWord || 'الوقت'}</span>
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#11161C] border border-[#D9B978]/30 rounded-xl px-2.5 py-1.5 text-xs text-[#F4F1EA] font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* RECEIPT ATTACHMENT */}
            {activeTab === 'expense' && (
              <div className="space-y-1">
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
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-[#D9B978]/30 hover:border-[#D9B978] text-[#F4F1EA]/70 hover:text-[#F4F1EA] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors bg-[#11161C]"
                  >
                    <Camera size={14} className="text-[#D9B978]" />
                    <span>{t.attachReceiptBtn || 'إرفاق صورة الفاتورة (اختياري)'}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#11161C] border border-[#D9B978]/30">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={15} className="text-[#D9B978]" />
                      <span className="text-xs text-[#F4F1EA] font-bold truncate max-w-[180px]">{receipt.fileName || 'Receipt'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (receipt) {
                            const url = await loadReceiptDataUrl(receipt);
                            setPreviewUrl(url);
                            setShowReceiptPreview(true);
                          }
                        }}
                        className="px-2 py-0.5 bg-[#0A0D10] text-[10px] font-bold text-[#F4F1EA] rounded-lg border border-[#D9B978]/30"
                      >
                        {t.viewAll || 'عرض'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceipt(undefined)}
                        className="p-1 text-[#C98387]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2 pb-6 space-y-2 shrink-0">
              <button
                type="submit"
                disabled={isSubmitting || (activeTab === 'debt' && debtSubMode === 'repayment' && activeDebts.length === 0)}
                className="w-full min-h-[46px] py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all duration-150 shadow-md active:scale-[0.99] flex items-center justify-center gap-2 bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10]"
              >
                <Check size={17} strokeWidth={3} />
                <span>
                  {initialData || isEditingExisting ? (t.saveChangesInLedger || 'حفظ التعديلات في القيود') :
                   activeTab === 'expense' ? (t.recordExpenseLedger || 'تسجيل المصروف في القيود') :
                   activeTab === 'income' ? (t.recordIncomeLedger || 'إيداع الدخل في القيود') :
                   activeTab === 'transfer' ? (t.executeTransferLedger || 'تنفيذ التحويل المالي') :
                   debtSubMode === 'to_me' ? (t.recordDebtLedger || 'قيد الدين والمستحق') :
                   debtSubMode === 'on_me' ? (t.recordLiabilityLedger || 'قيد الالتزام المالي') :
                   debtSubMode === 'repayment' ? (t.recordRepaymentLedger || 'تسجيل دفعة السداد') :
                   (t.confirmBalanceAdjustmentLedger || 'تأكيد تصحيح وتسوية الرصيد')
                  }
                </span>
              </button>

              {(initialData || (isEditingExisting && selectedTxForEdit)) && onDelete && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-2xl font-bold text-xs text-[#C98387] bg-[#C98387]/10 hover:bg-[#C98387]/20 border border-[#C98387]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>{t.deleteTransaction || 'حذف المعاملة'}</span>
                  </button>

                  <ConfirmDeleteModal
                    isOpen={showDeleteConfirm}
                    transaction={(initialData || transactions?.find(t => t.id === selectedTxForEdit) || {
                      id: selectedTxForEdit || '',
                      amount: parseArabicNumber(amount) || 0,
                      currency: inputCurrency || 'SAR',
                      type: (activeTab === 'income' ? 'income' : activeTab === 'transfer' ? 'transfer' : 'expense') as any,
                      date,
                      note,
                      walletId: walletId,
                      categoryId: categoryId,
                    }) as Transaction}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDeleteCurrent}
                    walletName={wallets.find(w => w.id === walletId)?.name}
                    destWalletName={wallets.find(w => w.id === destinationWalletId)?.name}
                    categoryName={categories.find(c => c.id === categoryId)?.name}
                    language={language as any}
                  />
                </div>
              )}
            </div>
          </form>
        )}

        {/* TAB 6: UNIFIED HISTORY & EDIT LIST */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-5 space-y-3 bg-[#0A0D10] flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-[#D9B978]">
                {language === 'ar' ? 'اختر معاملة للتعديل أو الحذف من السجل' : 'Select a transaction to edit or remove'}
              </span>
              <span className="text-[11px] font-mono text-[#F4F1EA]/50">
                {transactions.length} {language === 'ar' ? 'معاملة' : 'transactions'}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#F4F1EA]/40" />
              <input
                type="text"
                placeholder={language === 'ar' ? 'بحث بالبيان، التصنيف، أو المبلغ...' : 'Search transactions...'}
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full bg-[#11161C] border border-[#D9B978]/20 rounded-xl ps-9 pe-3 py-2 text-xs text-[#F4F1EA] placeholder-[#F4F1EA]/30 focus:outline-none focus:border-[#D9B978]"
              />
            </div>

            {filteredPreviousTransactions.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#11161C] border border-white/10 flex items-center justify-center text-[#F4F1EA]/40">
                  <Edit3 size={20} />
                </div>
                <p className="text-xs font-bold text-[#F4F1EA]/70">
                  {language === 'ar' ? 'لا توجد معاملات سابقة مطابقة' : 'No matching previous transactions'}
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange('expense')}
                  className="px-4 py-2 rounded-xl bg-[#D9B978] text-[#0A0D10] font-black text-xs"
                >
                  {language === 'ar' ? 'تسجيل معاملة جديدة' : 'Add New'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPreviousTransactions.map(tr => {
                  const cat = categories.find(c => c.id === tr.categoryId);
                  const iconElement = cat?.icon ? getIcon(cat.icon, 16) : (tr.type === 'income' ? <ArrowUpRight size={16} /> : tr.type === 'expense' ? <ArrowDownLeft size={16} /> : <ArrowLeftRight size={16} />);
                  const typeLabel = tr.type === 'expense' ? (t.expenses || 'مصروف') : tr.type === 'income' ? (t.income || 'دخل') : tr.type === 'transfer' ? (t.transfer || 'تحويل') : (t.adjustment || 'تسوية');
                  const trCurrLoc = getLocalizedCurrency(tr.currency || 'SAR', undefined, undefined, language);
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => handleSelectTransactionItem(tr.id)}
                      className="w-full text-start p-3 rounded-2xl bg-[#11161C] hover:bg-[#1C2633] border border-white/10 hover:border-[#D9B978]/40 transition-all flex items-center justify-between gap-3 group active:scale-[0.99] shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          tr.type === 'expense' ? 'bg-[#C98387]/15 text-[#C98387] border-[#C98387]/30' :
                          tr.type === 'income' ? 'bg-[#8EB9A7]/15 text-[#8EB9A7] border-[#8EB9A7]/30' :
                          'bg-[#D9B978]/15 text-[#D9B978] border-[#D9B978]/30'
                        }`}>
                          {iconElement}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-[#F4F1EA] truncate">
                              {cat?.name || typeLabel}
                            </span>
                            <span className="text-[10px] font-mono text-[#F4F1EA]/50">
                              {tr.date}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#F4F1EA]/60 truncate mt-0.5">
                            {tr.note || typeLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <span className={`text-xs font-mono font-black ${
                          tr.type === 'income' ? 'text-[#8EB9A7]' : 'text-[#F4F1EA]'
                        }`}>
                          {tr.type === 'income' ? '+' : tr.type === 'expense' ? '-' : ''}{tr.amount.toLocaleString()} {trCurrLoc.symbol}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-[#D9B978] mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                          <ChevronRight size={11} className={language === 'ar' ? 'rotate-180' : ''} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                src={previewUrl} 
                alt="Receipt" 
                className="w-full max-h-[70vh] object-contain rounded-xl mt-6"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default TransactionForm;
