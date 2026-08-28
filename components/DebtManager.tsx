import React, { useState, useMemo } from 'react';
import { 
  User, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Plus, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet as WalletIcon, 
  Calendar, 
  Edit3, 
  UserMinus, 
  UserPlus, 
  Info, 
  Link2, 
  Link2Off, 
  EyeOff, 
  GripHorizontal, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Receipt, 
  CreditCard, 
  Check, 
  AlertCircle, 
  Scale, 
  Search, 
  Filter, 
  History,
  Phone,
  Tag,
  FileSpreadsheet,
  Bell,
  Send,
  Share2,
  Copy,
  ExternalLink,
  CalendarPlus,
  MessageSquare,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Debt, Wallet, DebtInstallment, DebtPayment } from '../types';
import { 
  getDebtCalculations, 
  getDebtRemaining, 
  groupDebtsByPerson, 
  getOverallDebtStats, 
  PersonDebtSummary,
  DebtCalculation 
} from '../utils/debtModel';
import { getTranslation, getLocalizedCurrency, LanguageKey } from '../utils/translations';
import { parseArabicNumber } from '../utils/formatters';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';

interface DebtManagerProps {
  debts: Debt[];
  wallets: Wallet[];
  onAddDebt: (debt: Omit<Debt, 'id'>, walletId?: string) => void;
  onUpdateDebt: (id: string, updates: Partial<Debt>) => void;
  onSettleDebt: (id: string, walletId?: string) => void;
  onPayDebt?: (
    id: string, 
    amount: number, 
    walletId?: string, 
    noteSuffix?: string, 
    customDebtUpdates?: Partial<Debt>,
    paymentDate?: string
  ) => void;
  onDeleteDebt: (id: string) => void;
  currencySymbol: string;
  currencyCode: string;
  language?: LanguageKey;
}

export const DebtManager: React.FC<DebtManagerProps> = ({ 
  debts, 
  wallets, 
  onAddDebt, 
  onUpdateDebt, 
  onSettleDebt, 
  onPayDebt, 
  onDeleteDebt, 
  currencySymbol, 
  currencyCode,
  language = 'ar'
}) => {
  const t = getTranslation(language);
  const isRtl = language === 'ar';

  const locCurr = useMemo(() => {
    return getLocalizedCurrency(currencyCode || 'SAR', undefined, currencySymbol, language);
  }, [currencyCode, currencySymbol, language]);
  const resolvedSymbol = locCurr.symbol;

  const getDebtCurrencySymbol = (debtCurr?: string) => {
    if (!debtCurr) return resolvedSymbol;
    return getLocalizedCurrency(debtCurr, undefined, undefined, language).symbol;
  };

  // Main view modes: 'list' (individual debts) | 'persons' (statement by contact)
  const [activeView, setActiveView] = useState<'list' | 'persons'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'to_me' | 'on_me' | 'active' | 'settled' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<{ debt: Debt; prefillAmount?: number; installmentId?: string } | null>(null);
  const [historyModalDebt, setHistoryModalDebt] = useState<Debt | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [expandedPersonName, setExpandedPersonName] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reminder Modal State
  const [reminderModalData, setReminderModalData] = useState<{
    personName: string;
    personPhone?: string;
    amount: number;
    currency: string;
    dueDate?: string;
    type: 'to_me' | 'on_me';
    debtId?: string;
    conversionNote?: string;
    isPersonStatement?: boolean;
    totalOwedToMe?: number;
    totalIOwe?: number;
    netBalance?: number;
  } | null>(null);
  const [reminderTemplateType, setReminderTemplateType] = useState<'friendly' | 'formal' | 'urgent' | 'statement'>('friendly');
  const [customReminderText, setCustomReminderText] = useState('');
  const [reminderRecipientPhone, setReminderRecipientPhone] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Form State (New / Edit Debt)
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personTag, setPersonTag] = useState<'individual' | 'friend' | 'family' | 'customer' | 'supplier'>('individual');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'to_me' | 'on_me'>('on_me');
  const [note, setNote] = useState('');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  // Installments in Form
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  // Agreed Exchange Rate & Currency Lock State (تثبيت سعر الصرف وتوثيق العملة الأجنبية لمنع النزاع)
  const [hasAgreedRate, setHasAgreedRate] = useState(false);
  const [foreignAmountInput, setForeignAmountInput] = useState('');
  const [foreignCurrencyInput, setForeignCurrencyInput] = useState('USD');
  const [agreedRateInput, setAgreedRateInput] = useState('');
  const [customConversionNote, setCustomConversionNote] = useState('');
  
  // Wallet Transaction Link in Form
  const [includeWalletTransaction, setIncludeWalletTransaction] = useState(true);
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '');

  // Payment Modal Input State
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payWalletId, setPayWalletId] = useState<string>(wallets[0]?.id || '');
  const [payDateInput, setPayDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [payNoteInput, setPayNoteInput] = useState('');
  const [payExternalOnly, setPayExternalOnly] = useState(false);
  const [payHasAgreedRate, setPayHasAgreedRate] = useState(false);
  const [payForeignAmountInput, setPayForeignAmountInput] = useState('');
  const [payForeignCurrencyInput, setPayForeignCurrencyInput] = useState('USD');
  const [payAgreedRateInput, setPayAgreedRateInput] = useState('');

  // Global calculations
  const stats = useMemo(() => getOverallDebtStats(debts), [debts]);
  const personSummaries = useMemo(() => groupDebtsByPerson(debts), [debts]);

  // Urgent & Upcoming Dues Calculation
  const upcomingAndOverdueDebts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return debts
      .filter(d => !d.isPaid && d.dueDate)
      .map(d => {
        const due = new Date(d.dueDate!);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const calc = getDebtCalculations(d);
        return {
          debt: d,
          calc,
          diffDays,
          isOverdue: diffDays < 0,
          isDueToday: diffDays === 0,
          isDueSoon: diffDays > 0 && diffDays <= 7
        };
      })
      .filter(item => item.isOverdue || item.isDueToday || item.isDueSoon)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [debts]);

  // Helper to generate formatted reminder text
  const generateReminderMessage = (
    data: {
      personName: string;
      amount: number;
      currency: string;
      dueDate?: string;
      type: 'to_me' | 'on_me';
      conversionNote?: string;
      isPersonStatement?: boolean;
      totalOwedToMe?: number;
      totalIOwe?: number;
      netBalance?: number;
    },
    template: 'friendly' | 'formal' | 'urgent' | 'statement'
  ): string => {
    const formattedAmount = data.amount.toLocaleString();
    const currSym = getDebtCurrencySymbol(data.currency);
    const dateStr = data.dueDate || (isRtl ? 'غير محدد' : 'N/A');
    const docNoteStr = data.conversionNote 
      ? (isRtl ? `\n📌 ملاحظة التوثيق وسعر الصرف المتفق عليه:\n(${data.conversionNote})\n` : `\n📌 Agreed Exchange Rate & Documentation:\n(${data.conversionNote})\n`)
      : '';

    if (data.isPersonStatement) {
      const net = data.netBalance || 0;
      const isPos = net > 0;
      return isRtl
        ? `السلام عليكم ورحمة الله،\nكشف حساب مالي للأخ/الأخت: ${data.personName}\n\n• إجمالي المستحق لك: ${(data.totalIOwe || 0).toLocaleString()} ${currSym}\n• إجمالي المستحق عليك: ${(data.totalOwedToMe || 0).toLocaleString()} ${currSym}\n• صافي الرصيد الحالي: ${Math.abs(net).toLocaleString()} ${currSym} (${isPos ? 'مستحق لك' : 'مستحق عليك'})\n\nشاكرين ومقدرين حسن تعاونكم الدائم.`
        : `Financial Statement Summary\nContact: ${data.personName}\n\n• Owed To You: ${(data.totalIOwe || 0).toLocaleString()} ${currSym}\n• Owed By You: ${(data.totalOwedToMe || 0).toLocaleString()} ${currSym}\n• Net Position: ${Math.abs(net).toLocaleString()} ${currSym} (${isPos ? 'Receivable' : 'Payable'})\n\nThank you for your cooperation.`;
    }

    if (data.type === 'to_me') {
      switch (template) {
        case 'formal':
          return isRtl
            ? `إشعار مالي / تذكير استحقاق:\nإلى الأخ/الأخت: ${data.personName}\nالمبلغ المتبقي: ${formattedAmount} ${currSym}\nتاريخ الاستحقاق: ${dateStr}${docNoteStr}\nنرجو التكرم بالاطلاع والتنسيق للسداد عند الإمكان، شاكرين لكم طيب تعاونكم.`
            : `Payment Reminder Notice:\nTo: ${data.personName}\nOutstanding Amount: ${formattedAmount} ${currSym}\nDue Date: ${dateStr}${docNoteStr}\nPlease arrange for payment at your convenience. Thank you.`;
        case 'urgent':
          return isRtl
            ? `تذكير هام وعاجل:\nالأخ/الأخت ${data.personName}، نود لفت عنايتكم الكريمة بحلول موعد سداد الدين المستحق بتاريخ ${dateStr} بمبلغ ${formattedAmount} ${currSym}.${docNoteStr}\nنرجو المبادرة بالسداد في أقرب فرصة ممكنة، جزاكم الله خيراً.`
            : `Urgent Payment Reminder:\nDear ${data.personName}, this is an urgent reminder that payment of ${formattedAmount} ${currSym} was due on ${dateStr}.${docNoteStr}\nPlease initiate payment as soon as possible.`;
        case 'friendly':
        default:
          return isRtl
            ? `السلام عليكم ورحمة الله أخي الكريم ${data.personName}،\nأتمنى أن تكون بأتم الصحة والعافية.\nأود تذكيرك بلطف بمبلغ ${formattedAmount} ${currSym} المستحق بتاريخ ${dateStr}.${docNoteStr}\nجزاك الله خيراً وبارك فيك.`
            : `Hello ${data.personName},\nHope you're doing well! Just a friendly reminder regarding the remaining balance of ${formattedAmount} ${currSym} due on ${dateStr}.${docNoteStr}\nThank you so much!`;
      }
    } else {
      // on_me (I owe them)
      switch (template) {
        case 'formal':
          return isRtl
            ? `إشعار تأكيد سداد والتزام مالي:\nإلى: ${data.personName}\nأؤكد لكم التزامي بسداد المبلغ المستحق لكم وقدره ${formattedAmount} ${currSym}، والمحدد بتاريخ ${dateStr}.${docNoteStr}\nسأقوم بالتحويل وفق الموعد بإذن الله.`
            : `Payment Confirmation Notice:\nTo: ${data.personName}\nConfirming my commitment to settle the balance of ${formattedAmount} ${currSym} on or before ${dateStr}.${docNoteStr}\nThank you for your patience.`;
        case 'friendly':
        default:
          return isRtl
            ? `السلام عليكم أخي ${data.personName}،\nأحببت طمأنتك وتذكيرك بأنني أرتب لسداد المبلغ المستحق لكم وقدره ${formattedAmount} ${currSym} في موعده بإذن الله (${dateStr}).${docNoteStr}\nشاكراً لك سعة صدرك.`
            : `Hello ${data.personName},\nJust reassuring you that I am arranging to settle the payment of ${formattedAmount} ${currSym} on schedule (${dateStr}).${docNoteStr}\nThanks for your patience!`;
      }
    }
  };

  const openDebtReminderModal = (debt: Debt) => {
    const calc = getDebtCalculations(debt);
    const resolvedDocNote = debt.conversionNote || (debt.foreignAmount && debt.exchangeRate ? (
      isRtl 
        ? `تمت العملية: ${debt.foreignAmount} ${getDebtCurrencySymbol(debt.foreignCurrency)} بسعر صرف ${debt.exchangeRate.toLocaleString()} • الإجمالي: ${debt.amount.toLocaleString()} ${getDebtCurrencySymbol(debt.currency)}`
        : `Recorded: ${debt.foreignAmount} ${debt.foreignCurrency} @ ${debt.exchangeRate.toLocaleString()} • Total: ${debt.amount.toLocaleString()} ${debt.currency}`
    ) : undefined);

    const data = {
      personName: debt.personName,
      personPhone: debt.personPhone || '',
      amount: calc.remainingAmount,
      currency: debt.currency || currencyCode,
      dueDate: debt.dueDate,
      type: debt.type,
      debtId: debt.id,
      conversionNote: resolvedDocNote,
      isPersonStatement: false
    };
    setReminderModalData(data);
    setReminderRecipientPhone(debt.personPhone || '');
    const initialTemplate = calc.isOverdue ? 'urgent' : 'friendly';
    setReminderTemplateType(initialTemplate);
    setCustomReminderText(generateReminderMessage(data, initialTemplate));
    setCopiedSuccess(false);
  };

  const openPersonStatementReminderModal = (person: PersonDebtSummary) => {
    const primaryDebt = person.debts[0];
    const data = {
      personName: person.personName,
      personPhone: person.personPhone || primaryDebt?.personPhone || '',
      amount: Math.abs(person.netBalance),
      currency: primaryDebt?.currency || currencyCode,
      type: (person.netBalance >= 0 ? 'to_me' : 'on_me') as 'to_me' | 'on_me',
      isPersonStatement: true,
      totalOwedToMe: person.totalOwedToMeRemaining,
      totalIOwe: person.totalIOweRemaining,
      netBalance: person.netBalance
    };
    setReminderModalData(data);
    setReminderRecipientPhone(data.personPhone);
    setReminderTemplateType('statement');
    setCustomReminderText(generateReminderMessage(data, 'statement'));
    setCopiedSuccess(false);
  };

  const handleTemplateChange = (tmpl: 'friendly' | 'formal' | 'urgent' | 'statement') => {
    setReminderTemplateType(tmpl);
    if (reminderModalData) {
      setCustomReminderText(generateReminderMessage(reminderModalData, tmpl));
    }
  };

  const handleCopyReminder = async () => {
    try {
      await navigator.clipboard.writeText(customReminderText);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleSendWhatsApp = () => {
    const clean = (reminderRecipientPhone || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(customReminderText);
    const url = clean ? `https://wa.me/${clean}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSendSMS = () => {
    const clean = (reminderRecipientPhone || '').replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent(customReminderText);
    const url = clean ? `sms:${clean}?body=${encoded}` : `sms:?body=${encoded}`;
    window.open(url, '_blank');
  };

  const handleAddToCalendar = () => {
    if (!reminderModalData || !reminderModalData.dueDate) return;
    const dateFormatted = reminderModalData.dueDate.replace(/-/g, '');
    const title = encodeURIComponent(
      reminderModalData.type === 'to_me'
        ? `تحصيل دين: ${reminderModalData.personName}`
        : `سداد دين: ${reminderModalData.personName}`
    );
    const details = encodeURIComponent(
      `المبلغ: ${reminderModalData.amount.toLocaleString()} ${getDebtCurrencySymbol(reminderModalData.currency)}\n${customReminderText}`
    );
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateFormatted}/${dateFormatted}&details=${details}`;
    window.open(url, '_blank');
  };

  // Unique contact names for quick suggestion chips
  const existingContactNames = useMemo(() => {
    const names = Array.from(new Set(debts.map(d => d.personName?.trim()).filter(Boolean)));
    return names;
  }, [debts]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const calc = getDebtCalculations(d);
      
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = d.personName?.toLowerCase().includes(q);
        const matchesNote = d.note?.toLowerCase().includes(q);
        const matchesAmount = d.amount.toString().includes(q);
        if (!matchesName && !matchesNote && !matchesAmount) return false;
      }

      // Status / Type filter
      if (statusFilter === 'to_me') return d.type === 'to_me';
      if (statusFilter === 'on_me') return d.type === 'on_me';
      if (statusFilter === 'active') return calc.status !== 'settled';
      if (statusFilter === 'settled') return calc.status === 'settled';
      if (statusFilter === 'overdue') return calc.status === 'overdue';
      return true;
    }).sort((a, b) => {
      const aCalc = getDebtCalculations(a);
      const bCalc = getDebtCalculations(b);
      if (aCalc.status === 'settled' && bCalc.status !== 'settled') return 1;
      if (aCalc.status !== 'settled' && bCalc.status === 'settled') return -1;
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
  }, [debts, statusFilter, searchQuery]);

  // Filtered persons
  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) return personSummaries;
    const q = searchQuery.toLowerCase().trim();
    return personSummaries.filter(p => 
      p.personName.toLowerCase().includes(q) || 
      (p.personPhone && p.personPhone.includes(q))
    );
  }, [personSummaries, searchQuery]);

  const openAdd = (prefilledPerson?: string) => {
    setEditingDebt(null);
    setPersonName(prefilledPerson || '');
    setPersonPhone('');
    setPersonTag('individual');
    setAmount('');
    setNote('');
    setDueDate(''); 
    setCreatedAt(new Date().toISOString().split('T')[0]);
    setIncludeWalletTransaction(true);
    setEnableInstallments(false);
    setInstallmentCount(3);
    setHasAgreedRate(false);
    setForeignAmountInput('');
    setForeignCurrencyInput('USD');
    setAgreedRateInput('');
    setCustomConversionNote('');
    setShowAddForm(true);
  };

  const openEdit = (d: Debt) => {
    setEditingDebt(d);
    setPersonName(d.personName || '');
    setPersonPhone(d.personPhone || '');
    setPersonTag(d.personTag || 'individual');
    setAmount((d.originalAmount || d.amount).toString());
    setType(d.type);
    setNote(d.note || '');
    setCreatedAt(d.createdAt || new Date().toISOString().split('T')[0]);
    setDueDate(d.dueDate || '');
    setEnableInstallments(!!d.installments && d.installments.length > 0);
    setInstallmentCount(d.installments?.length || 3);
    
    // Agreed Currency Lock & Foreign Amount prefill
    if (d.foreignAmount || d.exchangeRate || d.conversionNote) {
      setHasAgreedRate(true);
      setForeignAmountInput(d.foreignAmount ? d.foreignAmount.toString() : '');
      setForeignCurrencyInput(d.foreignCurrency || 'USD');
      setAgreedRateInput(d.exchangeRate ? d.exchangeRate.toString() : '');
      setCustomConversionNote(d.conversionNote || '');
    } else {
      setHasAgreedRate(false);
      setForeignAmountInput('');
      setForeignCurrencyInput('USD');
      setAgreedRateInput('');
      setCustomConversionNote('');
    }
    setShowAddForm(true);
  };

  const openPaymentModal = (debt: Debt, prefillAmount?: number, installmentId?: string) => {
    const remaining = getDebtRemaining(debt);
    const amountToPay = prefillAmount !== undefined ? prefillAmount : remaining;
    setPaymentModalData({ debt, prefillAmount: amountToPay, installmentId });
    setPayAmountInput(amountToPay.toString());
    setPayDateInput(new Date().toISOString().split('T')[0]);
    setPayNoteInput(installmentId ? (isRtl ? 'سداد قسط محدد' : 'Specific installment payment') : (amountToPay >= remaining ? (isRtl ? 'سداد كامل المبلغ المتبقي' : 'Full remaining payment') : (isRtl ? 'دفعة سداد جزئية' : 'Partial payment')));
    setPayExternalOnly(false);
    setPayWalletId(wallets[0]?.id || '');

    if (debt.exchangeRate || debt.foreignAmount) {
      setPayHasAgreedRate(true);
      setPayForeignCurrencyInput(debt.foreignCurrency || 'USD');
      setPayAgreedRateInput(debt.exchangeRate ? debt.exchangeRate.toString() : '');
      if (debt.exchangeRate && debt.exchangeRate > 0) {
        setPayForeignAmountInput(roundToCurrency(safeDiv(amountToPay, debt.exchangeRate)).toString());
      } else {
        setPayForeignAmountInput('');
      }
    } else {
      setPayHasAgreedRate(false);
      setPayForeignAmountInput('');
      setPayForeignCurrencyInput('USD');
      setPayAgreedRateInput('');
    }
  };

  const generateInstallments = (total: number, count: number, start: string): DebtInstallment[] => {
    const installments: DebtInstallment[] = [];
    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / count);
    const remainderCents = totalCents - (baseCents * count);
    const startDate = new Date(start);
    
    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i + 1);
        const cents = i === count - 1 ? baseCents + remainderCents : baseCents;
        installments.push({
            id: `inst-${Date.now()}-${i}`,
            amount: roundToCurrency(cents / 100),
            dueDate: date.toISOString().split('T')[0],
            isPaid: false
        });
    }
    return installments;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount) return;

    const totalAmount = parseArabicNumber(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return;
    
    let installmentsData = editingDebt?.installments;
    if (!editingDebt && enableInstallments && installmentCount > 1) {
       installmentsData = generateInstallments(totalAmount, installmentCount, createdAt);
    }

    const fAmt = hasAgreedRate && foreignAmountInput ? parseArabicNumber(foreignAmountInput) : undefined;
    const fCurr = hasAgreedRate && foreignAmountInput ? foreignCurrencyInput : undefined;
    const exRate = hasAgreedRate && agreedRateInput ? parseArabicNumber(agreedRateInput) : undefined;

    let finalConversionNote: string | undefined = undefined;
    if (hasAgreedRate && fAmt && exRate) {
      finalConversionNote = customConversionNote.trim() || (isRtl
        ? `تمت عملية ${fAmt} ${getDebtCurrencySymbol(fCurr)} بسعر صرف ${exRate.toLocaleString()} • الإجمالي: ${roundToCurrency(totalAmount).toLocaleString()} ${resolvedSymbol}`
        : `Transaction: ${fAmt} ${fCurr} @ ${exRate.toLocaleString()} • Total: ${roundToCurrency(totalAmount).toLocaleString()} ${resolvedSymbol}`);
    } else if (hasAgreedRate && customConversionNote.trim()) {
      finalConversionNote = customConversionNote.trim();
    }

    const data: any = {
      personName: personName.trim(),
      personPhone: personPhone.trim() || undefined,
      personTag: personTag || 'individual',
      amount: roundToCurrency(totalAmount),
      originalAmount: roundToCurrency(totalAmount),
      type,
      isPaid: editingDebt ? editingDebt.isPaid : false,
      paidAmount: editingDebt ? (editingDebt.paidAmount || 0) : 0,
      note,
      createdAt,
      dueDate: dueDate || undefined,
      currency: currencyCode,
      installments: installmentsData,
      payments: editingDebt?.payments || [],
      foreignAmount: fAmt,
      foreignCurrency: fCurr,
      exchangeRate: exRate,
      conversionNote: finalConversionNote
    };

    if (editingDebt) {
      onUpdateDebt(editingDebt.id, data);
    } else {
      onAddDebt(data, includeWalletTransaction ? selectedWalletId : undefined);
    }
    
    setShowAddForm(false);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData) return;

    const payVal = parseArabicNumber(payAmountInput);
    if (isNaN(payVal) || payVal <= 0) return;

    const { debt, installmentId } = paymentModalData;
    const chosenWalletId = payExternalOnly ? undefined : payWalletId;

    let updatedInstallments = debt.installments;
    if (installmentId && debt.installments) {
      updatedInstallments = debt.installments.map(inst => 
        inst.id === installmentId ? { ...inst, isPaid: true, paidDate: payDateInput } : inst
      );
    }

    let paymentNoteText = payNoteInput.trim();
    if (payHasAgreedRate && payForeignAmountInput && payAgreedRateInput) {
      const pFAmt = parseArabicNumber(payForeignAmountInput);
      const pRate = parseArabicNumber(payAgreedRateInput);
      const payConversionStr = isRtl 
        ? `[سداد: ${pFAmt} ${getDebtCurrencySymbol(payForeignCurrencyInput)} بسعر ${pRate.toLocaleString()}]`
        : `[Paid: ${pFAmt} ${payForeignCurrencyInput} @ ${pRate.toLocaleString()}]`;
      paymentNoteText = paymentNoteText ? `${paymentNoteText} ${payConversionStr}` : payConversionStr;
    }

    if (onPayDebt) {
      onPayDebt(
        debt.id, 
        roundToCurrency(payVal), 
        chosenWalletId, 
        paymentNoteText || undefined, 
        updatedInstallments ? { installments: updatedInstallments } : undefined,
        payDateInput
      );
    } else {
      onSettleDebt(debt.id, chosenWalletId);
    }

    setPaymentModalData(null);
  };

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto w-full text-start" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. Header & Summary Cards (Quiet Luxury Tokens: bg-[#11161C], text-[#D9B978]) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Debts I Owe (عليّ) */}
        <div className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <UserMinus size={18} />
            </span>
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <ArrowDownLeft size={12} /> {t.debtOwesYou}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#F4F1EA]">
            {stats.totalIOweRemaining.toLocaleString()} <span className="text-xs text-rose-400 font-bold">{resolvedSymbol}</span>
          </p>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 pt-2 border-t border-white/5">
            <span>{t.originalAmount}: {stats.totalOriginalIOwe.toLocaleString()}</span>
            <span>{t.paidAmount}: {stats.totalPaidIOwe.toLocaleString()}</span>
          </div>
        </div>

        {/* Debts Owed to Me (لي) */}
        <div className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <UserPlus size={18} />
            </span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <ArrowUpRight size={12} /> {t.debtIOWin}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#F4F1EA]">
            {stats.totalOwedToMeRemaining.toLocaleString()} <span className="text-xs text-emerald-400 font-bold">{resolvedSymbol}</span>
          </p>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 pt-2 border-t border-white/5">
            <span>{t.originalAmount}: {stats.totalOriginalOwedToMe.toLocaleString()}</span>
            <span>{t.paidAmount}: {stats.totalPaidOwedToMe.toLocaleString()}</span>
          </div>
        </div>

        {/* Net Debt Position */}
        <div className="bg-[#11161C] border border-white/10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden group shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-xl bg-[#D9B978]/20 text-[#D9B978]">
              <Scale size={18} />
            </span>
            <span className="text-[10px] font-black text-[#D9B978] uppercase tracking-widest">
              {t.totalNetWorth}
            </span>
          </div>
          {(() => {
            const net = stats.totalOwedToMeRemaining - stats.totalIOweRemaining;
            const isPositive = net > 0;
            const isZero = Math.abs(net) < 0.01;
            return (
              <>
                <p className={`text-xl sm:text-2xl font-black ${isZero ? 'text-slate-300' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Math.abs(net).toLocaleString()} <span className="text-xs font-bold">{resolvedSymbol}</span>
                </p>
                <div className="text-[10px] font-bold text-slate-400 mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span>{isZero ? (isRtl ? 'الذمم متعادلة' : 'Balanced') : isPositive ? (isRtl ? 'صافي مستحق لك' : 'Net Receivable') : (isRtl ? 'صافي التزام عليك' : 'Net Payable')}</span>
                  <span>{stats.uniquePersonsCount} {isRtl ? 'جهات تعامل' : 'Contacts'}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* 1.5. Debt Reminders & Due Dates Hub (مركز تذكيرات الاستحقاق والديون العاجلة) */}
      {upcomingAndOverdueDebts.length > 0 && (
        <div className="bg-gradient-to-r from-[#11161C] via-[#151c24] to-[#11161C] border border-[#D9B978]/30 p-4 sm:p-5 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shrink-0 animate-pulse">
                <Bell size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-white text-sm sm:text-base">
                    {isRtl ? 'تنبيهات وتذكيرات استحقاق الديون' : 'Debt Dues & Reminders Hub'}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D9B978]/20 text-[#D9B978]">
                    {upcomingAndOverdueDebts.length} {isRtl ? 'تنبيهات عاجلة' : 'Alerts'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                  {isRtl 
                    ? 'ديون حان موعد استحقاقها أو اقترب موعد سدادها — يمكنك إرسال تذكير مباشر للطرف الآخر أو السداد فوراً'
                    : 'Upcoming and overdue debt dues — send instant reminders or settle on schedule'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setStatusFilter('overdue')}
                className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 rounded-xl text-[11px] font-black transition-all flex items-center gap-1"
              >
                <AlertTriangle size={13} />
                <span>{isRtl ? 'عرض المتأخرة فقط' : 'Overdue Only'} ({upcomingAndOverdueDebts.filter(d => d.isOverdue).length})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
            {upcomingAndOverdueDebts.slice(0, 4).map(({ debt, calc, diffDays, isOverdue, isDueToday }) => (
              <div
                key={debt.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 backdrop-blur-md transition-all ${
                  isOverdue
                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                    : isDueToday
                    ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-[#0A0D10]/60 border-white/10 hover:border-[#D9B978]/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                    debt.type === 'to_me' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {debt.type === 'to_me' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-white text-xs truncate max-w-[120px] sm:max-w-[150px]">
                        {debt.personName}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        isOverdue 
                          ? 'bg-rose-500/20 text-rose-300 animate-pulse' 
                          : isDueToday 
                          ? 'bg-amber-500/20 text-amber-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {isOverdue 
                          ? (isRtl ? `متأخر ${Math.abs(diffDays)} يوم` : `${Math.abs(diffDays)}d overdue`)
                          : isDueToday 
                          ? (isRtl ? 'يستحق اليوم!' : 'Due Today!') 
                          : (isRtl ? `متبقي ${diffDays} أيام` : `In ${diffDays}d`)}
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-[#D9B978] mt-0.5">
                      {calc.remainingAmount.toLocaleString()} <span className="text-[9px] opacity-80">{getDebtCurrencySymbol(debt.currency)}</span>
                      <span className="text-[10px] text-slate-500 font-bold ms-1.5">
                        ({debt.type === 'to_me' ? (isRtl ? 'مستحق لك' : 'Receivable') : (isRtl ? 'التزام عليك' : 'Payable')})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openDebtReminderModal(debt)}
                    className="px-2.5 py-1.5 bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 active:scale-95 shadow"
                    title={isRtl ? 'إرسال تذكير فوري' : 'Send Reminder'}
                  >
                    <Send size={12} />
                    <span className="hidden sm:inline">{isRtl ? 'تذكير' : 'Remind'}</span>
                  </button>
                  <button
                    onClick={() => openPaymentModal(debt, calc.remainingAmount)}
                    className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 rounded-xl text-[10px] font-bold active:scale-95 transition-all"
                    title={isRtl ? 'تسجيل سداد' : 'Pay'}
                  >
                    <CreditCard size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Top Action Bar: Add Debt + View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button 
          onClick={() => openAdd()}
          className="py-3.5 px-6 bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 rounded-2xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm active:scale-98 transition-all shadow-lg shrink-0"
        >
          <Plus size={18} strokeWidth={3} /> {t.registerNewDebt}
        </button>

        {/* View Switcher Tabs */}
        <div className="flex bg-[#11161C] p-1 rounded-2xl border border-white/10 self-center sm:self-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveView('list')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeView === 'list' 
                ? 'bg-[#D9B978] text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt size={14} />
            <span>{t.operationLog} ({debts.length})</span>
          </button>
          <button
            onClick={() => setActiveView('persons')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeView === 'persons' 
                ? 'bg-[#D9B978] text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>{t.contactsStatement} ({stats.uniquePersonsCount})</span>
          </button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-[#11161C] p-3 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-500`} />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t.searchDebtPlaceholder}
              className={`w-full ${isRtl ? 'pl-3 pr-10' : 'pr-3 pl-10'} py-2 rounded-xl bg-[#0A0D10] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:border-[#D9B978] outline-none transition-all font-bold`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-500 hover:text-white`}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips (for list view) */}
        {activeView === 'list' && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === 'all' ? 'bg-[#D9B978] text-slate-950' : 'bg-[#0A0D10] text-slate-400 border border-white/10 hover:text-white'
              }`}
            >
              {isRtl ? 'الكل' : 'All'} ({debts.length})
            </button>
            <button
              onClick={() => setStatusFilter('to_me')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
                statusFilter === 'to_me' ? 'bg-emerald-500 text-slate-950' : 'bg-[#0A0D10] text-emerald-400 border border-white/10'
              }`}
            >
              <ArrowUpRight size={13} /> {t.debtIOWin} ({debts.filter(d => d.type === 'to_me').length})
            </button>
            <button
              onClick={() => setStatusFilter('on_me')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
                statusFilter === 'on_me' ? 'bg-rose-500 text-white' : 'bg-[#0A0D10] text-rose-400 border border-white/10'
              }`}
            >
              <ArrowDownLeft size={13} /> {t.debtOwesYou} ({debts.filter(d => d.type === 'on_me').length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === 'active' ? 'bg-blue-500 text-white' : 'bg-[#0A0D10] text-blue-400 border border-white/10'
              }`}
            >
              {t.activeList} ({stats.activeCount})
            </button>
            {stats.overdueCount > 0 && (
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
                  statusFilter === 'overdue' ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#0A0D10] text-rose-400 border border-rose-500/30'
                }`}
              >
                <AlertCircle size={13} /> {isRtl ? 'متأخرة' : 'Overdue'} ({stats.overdueCount})
              </button>
            )}
            <button
              onClick={() => setStatusFilter('settled')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                statusFilter === 'settled' ? 'bg-emerald-600 text-white' : 'bg-[#0A0D10] text-slate-400 border border-white/10'
              }`}
            >
              {t.paidFully} ({stats.settledCount})
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {activeView === 'list' ? (
        <div className="space-y-3.5">
          {filteredDebts.length === 0 ? (
            <div className="text-center py-14 bg-[#11161C] rounded-3xl border border-white/10 p-6">
              <div className="w-16 h-16 bg-[#0A0D10] rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500 border border-white/10">
                <Receipt size={30} />
              </div>
              <h4 className="text-white font-bold text-sm mb-1">{t.noDebtsMatch}</h4>
              <p className="text-slate-400 text-xs mb-5">{t.noDebtsSub}</p>
              <button 
                onClick={() => openAdd()}
                className="px-5 py-2.5 bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> {t.addDebtNow}
              </button>
            </div>
          ) : (
            filteredDebts.map(debt => {
              const calc = getDebtCalculations(debt);
              const isExpanded = expandedDebtId === debt.id;
              const hasInstallments = !!debt.installments && debt.installments.length > 0;
              const paymentsCount = debt.payments?.length || (debt.paidAmount > 0 ? 1 : 0);

              return (
                <div 
                  key={debt.id} 
                  className={`p-4 sm:p-5 rounded-3xl border transition-all relative overflow-hidden group ${
                    calc.status === 'settled'
                      ? 'bg-[#11161C]/50 border-white/5 opacity-70 hover:opacity-100'
                      : calc.status === 'overdue'
                      ? 'bg-[#11161C] border-rose-500/40 shadow-lg shadow-rose-500/5'
                      : 'bg-[#11161C] border-white/10 hover:border-[#D9B978]/40 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow shrink-0 ${
                        debt.type === 'to_me' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {debt.type === 'to_me' ? <UserPlus size={20} /> : <UserMinus size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white text-sm sm:text-base leading-tight">
                            {debt.personName}
                          </h4>
                          {debt.personTag && (
                            <span className="text-[9px] font-bold text-slate-400 bg-[#0A0D10] px-2 py-0.5 rounded-md border border-white/5">
                              {debt.personTag === 'customer' ? (isRtl ? 'عميل' : 'Customer') : debt.personTag === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : debt.personTag === 'friend' ? (isRtl ? 'صديق' : 'Friend') : debt.personTag === 'family' ? (isRtl ? 'عائلة' : 'Family') : (isRtl ? 'فرد' : 'Individual')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            debt.type === 'to_me' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {debt.type === 'to_me' ? t.debtIOWin : t.debtOwesYou}
                          </span>
                          
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            calc.status === 'settled' 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : calc.status === 'overdue' 
                              ? 'bg-rose-500/20 text-rose-300 animate-pulse' 
                              : calc.status === 'partial' 
                              ? 'bg-[#D9B978]/20 text-[#D9B978]' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {calc.statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-end">
                      <p className={`text-base sm:text-lg font-black ${
                        calc.status === 'settled' 
                          ? 'text-emerald-400' 
                          : debt.type === 'to_me' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {calc.remainingAmount.toLocaleString()} <span className="text-[10px] opacity-70">{getDebtCurrencySymbol(debt.currency)}</span>
                      </p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {t.remainingBalance}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3.5 p-2.5 bg-[#0A0D10] rounded-2xl border border-white/5 text-center text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block mb-0.5">{t.originalAmount}</span>
                      <span className="font-black text-white">{calc.originalAmount.toLocaleString()} {getDebtCurrencySymbol(debt.currency)}</span>
                    </div>
                    <div className="border-inline border-white/5 px-1">
                      <span className="text-[9px] font-bold text-slate-500 block mb-0.5">{t.paidAmount} ({Math.round(calc.progressPercent)}%)</span>
                      <span className="font-black text-[#D9B978]">{calc.paidAmount.toLocaleString()} {getDebtCurrencySymbol(debt.currency)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block mb-0.5">{t.remainingBalance}</span>
                      <span className={`font-black ${debt.type === 'to_me' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {calc.remainingAmount.toLocaleString()} {getDebtCurrencySymbol(debt.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 mb-1">
                    <div className="h-1.5 bg-[#0A0D10] rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          calc.status === 'settled' 
                            ? 'bg-emerald-500' 
                            : debt.type === 'to_me' ? 'bg-emerald-400' : 'bg-[#D9B978]'
                        }`} 
                        style={{ width: `${calc.progressPercent}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[10px] text-slate-400 font-bold">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-500" /> {isRtl ? 'النشوء' : 'Created'}: {debt.createdAt}
                      </span>
                      {debt.dueDate && (
                        <span className={`flex items-center gap-1 ${calc.isOverdue ? 'text-rose-400' : 'text-slate-300'}`}>
                          <Clock size={11} /> {isRtl ? 'الاستحقاق' : 'Due'}: {debt.dueDate}
                        </span>
                      )}
                    </div>
                    
                    {paymentsCount > 0 && (
                      <button
                        onClick={() => setHistoryModalDebt(debt)}
                        className="text-[#D9B978] hover:text-[#E5C17B] flex items-center gap-1 font-bold underline underline-offset-2"
                      >
                        <History size={11} /> {t.paymentHistory} ({paymentsCount})
                      </button>
                    )}
                  </div>

                  {debt.note && (
                    <div className="mt-2.5 p-2 bg-[#0A0D10] rounded-xl border border-white/5 flex items-start gap-2 text-start">
                      <Info size={12} className="text-slate-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] font-medium text-slate-300 leading-relaxed">{debt.note}</p>
                    </div>
                  )}

                  {/* 💱 Agreed Exchange Rate & Foreign Currency Lock Note (توثيق سعر الصرف المتفق عليه لمنع النزاع) */}
                  {(debt.conversionNote || (debt.foreignAmount && debt.exchangeRate)) && (
                    <div className="mt-2.5 p-2.5 bg-[#0A0D10] rounded-xl border border-[#D9B978]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-start">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#D9B978] font-black text-sm shrink-0">💱</span>
                        <p className="text-[11px] font-bold text-[#D9B978] leading-tight break-words">
                          {debt.conversionNote || (isRtl 
                            ? `تمت العملية: ${debt.foreignAmount} ${getDebtCurrencySymbol(debt.foreignCurrency)} بسعر صرف ${debt.exchangeRate?.toLocaleString()} • الإجمالي: ${calc.originalAmount.toLocaleString()} ${getDebtCurrencySymbol(debt.currency)}`
                            : `Recorded: ${debt.foreignAmount} ${debt.foreignCurrency} @ ${debt.exchangeRate?.toLocaleString()} • Total: ${calc.originalAmount.toLocaleString()} ${getDebtCurrencySymbol(debt.currency)}`)}
                        </p>
                      </div>
                      <span className="text-[9px] font-black text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 self-start sm:self-auto shrink-0">
                        {isRtl ? '🔒 مثبت وموثق' : '🔒 Rate Locked'}
                      </span>
                    </div>
                  )}

                  {hasInstallments && (
                    <div className="mt-3">
                      <button 
                        onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0A0D10] border border-white/5 text-[10px] font-bold text-slate-300 hover:text-white transition-colors"
                      >
                        <span>{t.installmentsSchedule} ({debt.installments!.filter(i => i.isPaid).length}/{debt.installments!.length})</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                          {debt.installments!.map((inst, idx) => (
                            <div 
                              key={inst.id} 
                              className={`flex items-center justify-between p-2.5 rounded-xl border ${
                                inst.isPaid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#0A0D10] border-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-bold text-slate-500">#{idx+1}</span>
                                <div>
                                  <p className={`text-xs font-bold ${inst.isPaid ? 'text-emerald-400' : 'text-white'}`}>
                                    {inst.amount.toLocaleString()} {debt.currency || currencySymbol}
                                  </p>
                                  <p className="text-[9px] text-slate-500">{isRtl ? 'تاريخ' : 'Date'}: {inst.dueDate}</p>
                                </div>
                              </div>
                              {inst.isPaid ? (
                                <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle size={13} /> {isRtl ? 'مسدد' : 'Paid'}
                                </span>
                              ) : (
                                <button 
                                  onClick={() => openPaymentModal(debt, inst.amount, inst.id)}
                                  className="px-3 py-1 bg-[#D9B978] text-slate-950 rounded-lg text-[10px] font-bold hover:bg-[#E5C17B] active:scale-95"
                                >
                                  {isRtl ? 'سداد القسط' : 'Pay Installment'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                    {calc.status !== 'settled' ? (
                      <>
                        <button 
                          onClick={() => openPaymentModal(debt, calc.remainingAmount)}
                          className="flex-1 py-2.5 bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
                        >
                          <CreditCard size={14} /> {t.settleDebt}
                        </button>
                        <button 
                          onClick={() => openPaymentModal(debt, calc.remainingAmount)}
                          className="py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                          title={t.fullSettle}
                        >
                          <CheckCircle size={14} />
                          <span className="hidden sm:inline">{t.fullSettle}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 py-2 bg-emerald-500/10 rounded-xl text-emerald-400 font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20">
                        <CheckCircle size={14} /> {isRtl ? 'تم تسوية هذه الذمة المالية بالكامل' : 'Fully settled'}
                      </div>
                    )}

                    {/* Reminder Button */}
                    <button 
                      onClick={() => openDebtReminderModal(debt)}
                      className="p-2.5 bg-[#D9B978]/10 text-[#D9B978] hover:bg-[#D9B978]/25 rounded-xl active:scale-90 transition-all border border-[#D9B978]/30 flex items-center justify-center shadow-sm"
                      title={isRtl ? 'إرسال تذكير بالدين (واتساب / رسالة / تقويم)' : 'Send Debt Reminder'}
                    >
                      <Bell size={15} />
                    </button>

                    <button 
                      onClick={() => openEdit(debt)}
                      className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl active:scale-90 transition-all border border-slate-700 hover:bg-slate-700"
                      title={t.edit}
                    >
                      <Edit3 size={15} />
                    </button>

                    {confirmDeleteId === debt.id ? (
                      <div className="flex gap-1 items-center bg-[#0A0D10] p-1 rounded-xl border border-rose-500/30">
                        <button 
                          onClick={() => { onDeleteDebt(debt.id); setConfirmDeleteId(null); }}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black active:scale-95 hover:bg-rose-500"
                        >
                          {t.confirmedDelete}
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-700"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDeleteId(debt.id)}
                        className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl active:scale-90 transition-all border border-rose-500/20 hover:bg-rose-500/20"
                        title={t.delete}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPersons.length === 0 ? (
            <div className="text-center py-14 bg-[#11161C] rounded-3xl border border-white/10 p-6">
              <div className="w-16 h-16 bg-[#0A0D10] rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500 border border-white/10">
                <Users size={30} />
              </div>
              <h4 className="text-white font-bold text-sm mb-1">{isRtl ? 'لا توجد جهات تعامل مسجلة' : 'No contacts recorded'}</h4>
              <p className="text-slate-400 text-xs mb-5">{isRtl ? 'عند تسجيل أي دين لشخص أو جهة، ستظهر كشوف حساباتهم المجمعة هنا تلقائياً.' : 'Recorded contact statements will appear here automatically.'}</p>
              <button 
                onClick={() => openAdd()}
                className="px-5 py-2.5 bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> {t.addDebtNow}
              </button>
            </div>
          ) : (
            filteredPersons.map(person => {
              const isExpanded = expandedPersonName === person.personName;
              const hasNet = Math.abs(person.netBalance) > 0.01;

              return (
                <div 
                  key={person.personName}
                  className="bg-[#11161C] border border-white/10 rounded-3xl p-4 sm:p-5 hover:border-[#D9B978]/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#D9B978]/10 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] font-black text-lg">
                        {person.personName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white text-base">{person.personName}</h4>
                          {person.personTag && (
                            <span className="text-[9px] font-bold text-slate-400 bg-[#0A0D10] px-2 py-0.5 rounded-md border border-white/5">
                              {person.personTag === 'customer' ? (isRtl ? 'عميل' : 'Customer') : person.personTag === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : (isRtl ? 'فرد' : 'Individual')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          {person.debts.length} {isRtl ? 'عمليات مسجلة' : 'operations'}
                        </p>
                      </div>
                    </div>

                    <div className="text-start sm:text-end">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
                        {isRtl ? 'صافي المعاملة والحساب' : 'Net Account'}
                      </span>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs sm:text-sm ${
                        !hasNet 
                          ? 'bg-slate-800 text-slate-300' 
                          : person.netStatus === 'receivable'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {!hasNet ? (
                          <span className="flex items-center gap-1"><CheckCircle size={14} className="text-emerald-400" /> {isRtl ? 'الحساب متقاص وخالص' : 'Balanced'}</span>
                        ) : person.netStatus === 'receivable' ? (
                          <>
                            <ArrowUpRight size={14} />
                            <span>{isRtl ? 'لك بذمته' : 'Owed To You'}: {person.netBalance.toLocaleString()} {resolvedSymbol}</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft size={14} />
                            <span>{isRtl ? 'له بذمتك' : 'You Owe'}: {Math.abs(person.netBalance).toLocaleString()} {resolvedSymbol}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
                    <div className="bg-[#0A0D10] p-3 rounded-2xl border border-emerald-500/10">
                      <span className="text-[10px] font-black text-emerald-400 block mb-1 flex items-center gap-1">
                        <ArrowUpRight size={12} /> {t.totalDebtsOwedToMe}
                      </span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-[10px] font-bold">{isRtl ? 'المتبقي:' : 'Remaining:'}</span>
                        <span className="font-black text-emerald-400 text-sm">{person.totalOwedToMeRemaining.toLocaleString()} {resolvedSymbol}</span>
                      </div>
                    </div>

                    <div className="bg-[#0A0D10] p-3 rounded-2xl border border-rose-500/10">
                      <span className="text-[10px] font-black text-rose-400 block mb-1 flex items-center gap-1">
                        <ArrowDownLeft size={12} /> {t.totalDebtsIOwe}
                      </span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 text-[10px] font-bold">{isRtl ? 'المتبقي:' : 'Remaining:'}</span>
                        <span className="font-black text-rose-400 text-sm">{person.totalIOweRemaining.toLocaleString()} {resolvedSymbol}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => setExpandedPersonName(isExpanded ? null : person.personName)}
                      className="text-xs font-bold text-[#D9B978] hover:text-[#E5C17B] flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 transition-all"
                    >
                      <span>{isExpanded ? (isRtl ? 'إخفاء كشف العمليات' : 'Hide Statement') : (isRtl ? `عرض كشف العمليات التفصيلي (${person.debts.length})` : `Show Statement (${person.debts.length})`)}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openPersonStatementReminderModal(person)}
                        className="text-[11px] font-bold text-[#D9B978] hover:text-white bg-[#D9B978]/10 hover:bg-[#D9B978]/20 px-3 py-1.5 rounded-xl border border-[#D9B978]/25 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        title={isRtl ? 'إرسال كشف حساب وتذكير عبر واتساب أو رسالة' : 'Send Statement Reminder'}
                      >
                        <Send size={12} /> {isRtl ? 'تذكير وكشف حساب' : 'Send Statement'}
                      </button>

                      <button
                        onClick={() => openAdd(person.personName)}
                        className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1 transition-all"
                      >
                        <Plus size={13} /> {isRtl ? 'دين جديد' : 'New Debt'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-white/5">
                      {person.debts.map(d => {
                        const calc = getDebtCalculations(d);
                        return (
                          <div 
                            key={d.id}
                            className="bg-[#0A0D10] p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2 h-2 rounded-full ${d.type === 'to_me' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">
                                    {d.type === 'to_me' ? t.debtIOWin : t.debtOwesYou}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    calc.status === 'settled' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {calc.statusLabel}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500">{isRtl ? 'تاريخ' : 'Date'}: {d.createdAt}</span>
                                {(d.conversionNote || (d.foreignAmount && d.exchangeRate)) && (
                                  <p className="text-[10px] font-bold text-[#D9B978] mt-0.5">
                                    💱 {d.conversionNote || (isRtl 
                                      ? `تمت العملية: ${d.foreignAmount} ${getDebtCurrencySymbol(d.foreignCurrency)} بسعر صرف ${d.exchangeRate?.toLocaleString()}` 
                                      : `Op: ${d.foreignAmount} ${d.foreignCurrency} @ ${d.exchangeRate?.toLocaleString()}`)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-start sm:text-end">
                                <span className={`font-black ${d.type === 'to_me' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {t.remainingBalance}: {calc.remainingAmount.toLocaleString()} {getDebtCurrencySymbol(d.currency)}
                                </span>
                                <span className="text-[10px] text-slate-500 block">{t.originalAmount}: {calc.originalAmount.toLocaleString()}</span>
                              </div>

                              {calc.status !== 'settled' && (
                                <button
                                  onClick={() => openPaymentModal(d, calc.remainingAmount)}
                                  className="px-3 py-1.5 bg-[#D9B978] text-slate-950 font-bold rounded-lg text-[10px] hover:bg-[#E5C17B] active:scale-95"
                                >
                                  {isRtl ? 'سداد' : 'Pay'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DEBT */}
      {showAddForm && (
        <div className="fixed inset-0 bg-[#0A0D10]/85 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4 no-print overflow-hidden">
          <div className="bg-[#11161C] w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col border border-white/10 overflow-hidden text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-white/5">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Receipt size={18} className="text-[#D9B978]" />
                {editingDebt ? (isRtl ? 'تعديل بيانات الدين' : 'Edit Debt') : (isRtl ? 'تسجيل دين مالي جديد' : 'New Debt')}
              </h3>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 px-1 pb-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{isRtl ? 'نوع الدين والالتزام' : 'Debt Type'}</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0D10] p-1.5 rounded-2xl border border-white/10">
                  <button 
                    type="button" 
                    onClick={() => setType('on_me')} 
                    className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      type === 'on_me' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserMinus size={14} /> {t.debtOwesYou}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setType('to_me')} 
                    className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      type === 'to_me' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus size={14} /> {t.debtIOWin}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                    {isRtl ? 'اسم الشخص أو الجهة' : 'Contact Name'}
                  </label>
                  <input 
                    type="text" 
                    value={personName} 
                    onChange={e => setPersonName(e.target.value)} 
                    placeholder={isRtl ? 'مثلاً: محمد، البنك، فلان...' : 'e.g., John, Bank...'} 
                    className="w-full p-3 rounded-2xl bg-[#0A0D10] border border-white/10 outline-none text-white text-xs sm:text-sm font-bold focus:border-[#D9B978] transition-colors shadow-inner" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{isRtl ? 'رقم الهاتف / واتساب (اختياري)' : 'Phone / WhatsApp'}</span>
                    <span className="text-[9px] text-[#D9B978] font-bold">{isRtl ? 'للتذكير المباشر' : 'For Reminders'}</span>
                  </label>
                  <input 
                    type="tel" 
                    value={personPhone} 
                    onChange={e => setPersonPhone(e.target.value)} 
                    placeholder={isRtl ? 'مثلاً: 9665xxxxxxxx أو 77xxxxxxx' : '+1234567890'} 
                    className="w-full p-3 rounded-2xl bg-[#0A0D10] border border-white/10 outline-none text-white text-xs sm:text-sm font-bold focus:border-[#D9B978] transition-colors shadow-inner text-start" 
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                  {t.amount} ({locCurr.name})
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any"
                    value={amount} 
                    onChange={e => {
                      const val = e.target.value;
                      setAmount(val);
                      if (hasAgreedRate && agreedRateInput) {
                        const amtNum = parseArabicNumber(val);
                        const rateNum = parseArabicNumber(agreedRateInput);
                        if (!isNaN(amtNum) && !isNaN(rateNum) && rateNum > 0) {
                          setForeignAmountInput(roundToCurrency(safeDiv(amtNum, rateNum)).toString());
                        }
                      }
                    }} 
                    placeholder="0.00" 
                    className="w-full p-3 rounded-2xl bg-[#0A0D10] border border-white/10 outline-none text-[#D9B978] font-black text-center text-xl tracking-wider focus:border-[#D9B978] transition-colors shadow-inner" 
                    required 
                  />
                  <span className={`absolute ${isRtl ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-xs font-black text-slate-500`}>
                    {resolvedSymbol}
                  </span>
                </div>
              </div>

              {/* 💱 Agreed Exchange Rate & Foreign Currency Lock (تثبيت سعر الصرف وتوثيق العملة الأجنبية لمنع النزاع) */}
              <div className="bg-[#0A0D10] p-3.5 rounded-2xl border border-[#D9B978]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#D9B978]/20 flex items-center justify-center text-[#D9B978] text-xs font-black">
                      💱
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block">
                        {isRtl ? 'تثبيت سعر صرف متفق عليه / عملة أجنبية' : 'Agreed Exchange Rate & Foreign Currency'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {isRtl ? 'توثيق رسمي لمنع النزاع أو التلاعب بتغيرات السوق لاحقاً' : 'Locks rate to prevent currency disputes'}
                      </span>
                    </div>
                  </div>
                  <div 
                    className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all ${hasAgreedRate ? 'bg-[#D9B978]' : 'bg-slate-800'}`} 
                    onClick={() => {
                      const next = !hasAgreedRate;
                      setHasAgreedRate(next);
                      if (next && !agreedRateInput) {
                        setAgreedRateInput('1600');
                        if (foreignAmountInput) {
                          const f = parseArabicNumber(foreignAmountInput);
                          if (!isNaN(f) && f > 0) {
                            setAmount(roundToCurrency(safeMul(f, 1600)).toString());
                          }
                        }
                      }
                    }}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${hasAgreedRate ? (isRtl ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'}`} />
                  </div>
                </div>

                {hasAgreedRate && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isRtl ? 'المبلغ بالعملة الأجنبية' : 'Foreign Amount'}
                        </label>
                        <div className="flex items-center bg-[#11161C] rounded-xl border border-white/10 overflow-hidden">
                          <input 
                            type="number"
                            step="any"
                            value={foreignAmountInput}
                            onChange={e => {
                              const val = e.target.value;
                              setForeignAmountInput(val);
                              const num = parseArabicNumber(val);
                              const rate = parseArabicNumber(agreedRateInput);
                              if (!isNaN(num) && num > 0 && !isNaN(rate) && rate > 0) {
                                setAmount(roundToCurrency(safeMul(num, rate)).toString());
                              }
                            }}
                            placeholder={isRtl ? 'مثلاً: 104' : 'e.g. 104'}
                            className="w-full p-2.5 bg-transparent outline-none text-white font-bold text-xs"
                          />
                          <select
                            value={foreignCurrencyInput}
                            onChange={e => setForeignCurrencyInput(e.target.value)}
                            className="bg-slate-800 text-[#D9B978] text-xs font-black px-2 py-2.5 outline-none border-s border-white/10 cursor-pointer"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="SAR">SAR (ر.س)</option>
                            <option value="AED">AED (د.إ)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="KWD">KWD (د.ك)</option>
                            <option value="OMR">OMR (ر.ع)</option>
                            <option value="QAR">QAR (ر.ق)</option>
                            <option value="BHD">BHD (د.ب)</option>
                            <option value="EGP">EGP (ج.م)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isRtl ? 'سعر الصرف المتفق عليه' : 'Agreed Rate'}
                        </label>
                        <input 
                          type="number"
                          step="any"
                          value={agreedRateInput}
                          onChange={e => {
                            const val = e.target.value;
                            setAgreedRateInput(val);
                            const num = parseArabicNumber(foreignAmountInput);
                            const rate = parseArabicNumber(val);
                            if (!isNaN(num) && num > 0 && !isNaN(rate) && rate > 0) {
                              setAmount(roundToCurrency(safeMul(num, rate)).toString());
                            }
                          }}
                          placeholder={isRtl ? 'مثلاً: 1600' : 'e.g. 1600'}
                          className="w-full p-2.5 rounded-xl bg-[#11161C] border border-white/10 outline-none text-[#D9B978] font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* Live Certified Documentation Note Preview */}
                    {foreignAmountInput && agreedRateInput && (
                      <div className="p-2.5 bg-[#11161C] rounded-xl border border-[#D9B978]/30 text-start">
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5 flex items-center gap-1">
                          <span>🔒 {isRtl ? 'نص التوثيق المعتمد في الكشوفات ورسائل التذكير:' : 'Certified Statement Documentation Note:'}</span>
                        </span>
                        <p className="text-xs font-black text-[#D9B978] leading-relaxed">
                          {customConversionNote.trim() || (isRtl 
                            ? `تمت عملية ${foreignAmountInput} ${getDebtCurrencySymbol(foreignCurrencyInput)} بسعر صرف ${parseArabicNumber(agreedRateInput).toLocaleString()} • الإجمالي: ${(parseArabicNumber(amount) || 0).toLocaleString()} ${resolvedSymbol}`
                            : `Transaction: ${foreignAmountInput} ${foreignCurrencyInput} @ ${agreedRateInput} • Total: ${(parseArabicNumber(amount) || 0).toLocaleString()} ${resolvedSymbol}`)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{isRtl ? 'تاريخ النشوء' : 'Creation Date'}</label>
                  <input 
                    type="date" 
                    value={createdAt} 
                    onChange={e => setCreatedAt(e.target.value)} 
                    className="w-full p-2.5 rounded-xl bg-[#0A0D10] border border-white/10 outline-none text-slate-300 font-bold text-xs" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{isRtl ? 'تاريخ الاستحقاق (اختياري)' : 'Due Date (Optional)'}</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className="w-full p-2.5 rounded-xl bg-[#0A0D10] border border-white/10 outline-none text-slate-300 font-bold text-xs" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{isRtl ? 'تصنيف جهة التعامل' : 'Tag'}</label>
                <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                  {[
                    { id: 'individual', label: isRtl ? 'فرد / عام' : 'Individual' },
                    { id: 'friend', label: isRtl ? 'صديق' : 'Friend' },
                    { id: 'family', label: isRtl ? 'عائلة' : 'Family' },
                    { id: 'customer', label: isRtl ? 'عميل' : 'Customer' },
                    { id: 'supplier', label: isRtl ? 'مورد' : 'Supplier' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPersonTag(t.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        personTag === t.id ? 'bg-[#D9B978] text-slate-950 font-black' : 'bg-[#0A0D10] text-slate-400 border border-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {!editingDebt && (
                <div className="bg-[#0A0D10] p-3 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <GripHorizontal size={14} /> {isRtl ? 'تفعيل جدول الأقساط الشهرية' : 'Enable Monthly Installments'}
                    </span>
                    <div 
                      className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all ${enableInstallments ? 'bg-[#D9B978]' : 'bg-slate-800'}`} 
                      onClick={() => setEnableInstallments(!enableInstallments)}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${enableInstallments ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  {enableInstallments && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-2 items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{isRtl ? 'عدد الأقساط:' : 'Count:'}</label>
                        <input 
                          type="range" 
                          min="2" 
                          max="36" 
                          value={installmentCount} 
                          onChange={e => setInstallmentCount(parseInt(e.target.value))} 
                          className="flex-1 accent-[#D9B978] h-1.5" 
                        />
                        <span className="bg-slate-800 text-white font-bold px-2 py-0.5 rounded-lg text-xs min-w-[2rem] text-center">
                          {installmentCount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{t.notes}</label>
                <textarea 
                  rows={2} 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                  placeholder={isRtl ? 'أي تفاصيل أو شروط خاصة بالسداد...' : 'Notes...'} 
                  className="w-full p-3 rounded-2xl bg-[#0A0D10] border border-white/10 outline-none text-white font-bold text-xs resize-none focus:border-[#D9B978]" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 font-black rounded-2xl shadow-md text-xs sm:text-sm active:scale-98 transition-all mt-2"
              >
                {editingDebt ? (isRtl ? 'حفظ تعديلات الدين' : 'Save Changes') : (isRtl ? 'تسجيل الدين وحفظ السجل 💾' : 'Save Debt 💾')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD PAYMENT */}
      {paymentModalData && (
        <div className="fixed inset-0 bg-[#0A0D10]/85 backdrop-blur-md z-[350] flex items-center justify-center p-3 sm:p-4 no-print overflow-hidden">
          <div className="bg-[#11161C] w-full max-w-md mx-auto rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col min-h-0 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" />
                {isRtl ? 'تسجيل دفعة سداد' : 'Record Payment'}
              </h3>
              <button 
                onClick={() => setPaymentModalData(null)}
                className="p-1.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 px-1">
              <div className="bg-[#0A0D10] p-3.5 rounded-2xl border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'طرف التعامل' : 'Contact'}</span>
                    <span className="text-sm font-black text-white">{paymentModalData.debt.personName}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'المتبقي الإجمالي' : 'Remaining'}</span>
                    <span className="text-sm font-black text-[#D9B978]">
                      {getDebtRemaining(paymentModalData.debt).toLocaleString()} {getDebtCurrencySymbol(paymentModalData.debt.currency)}
                    </span>
                  </div>
                </div>

                {/* Show locked conversion note in Payment Modal */}
                {(paymentModalData.debt.conversionNote || (paymentModalData.debt.foreignAmount && paymentModalData.debt.exchangeRate)) && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-xs text-[#D9B978]">
                    <span className="shrink-0">💱</span>
                    <span className="text-[11px] font-bold">
                      {paymentModalData.debt.conversionNote || (isRtl 
                        ? `سعر الصرف المعتمد: ${paymentModalData.debt.foreignAmount} ${getDebtCurrencySymbol(paymentModalData.debt.foreignCurrency)} بسعر ${paymentModalData.debt.exchangeRate?.toLocaleString()}`
                        : `Locked Rate: ${paymentModalData.debt.foreignAmount} ${paymentModalData.debt.foreignCurrency} @ ${paymentModalData.debt.exchangeRate?.toLocaleString()}`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Foreign Currency Toggle */}
              <div className="bg-[#0A0D10] p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💱 {isRtl ? 'السداد بعملة أجنبية / تثبيت صرف الدفعة' : 'Pay with Foreign Currency / Rate'}</span>
                  </span>
                  <div 
                    className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all ${payHasAgreedRate ? 'bg-emerald-500' : 'bg-slate-800'}`} 
                    onClick={() => setPayHasAgreedRate(!payHasAgreedRate)}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${payHasAgreedRate ? (isRtl ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'}`} />
                  </div>
                </div>

                {payHasAgreedRate && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'المبلغ الأجنبي' : 'Foreign Amt'}</label>
                        <div className="flex items-center bg-[#11161C] rounded-xl border border-white/10 overflow-hidden">
                          <input 
                            type="number"
                            step="any"
                            value={payForeignAmountInput}
                            onChange={e => {
                              const val = e.target.value;
                              setPayForeignAmountInput(val);
                              const num = parseArabicNumber(val);
                              const rate = parseArabicNumber(payAgreedRateInput);
                              if (!isNaN(num) && num > 0 && !isNaN(rate) && rate > 0) {
                                setPayAmountInput(roundToCurrency(safeMul(num, rate)).toString());
                              }
                            }}
                            placeholder="مثلاً: 50"
                            className="w-full p-2 bg-transparent outline-none text-white font-bold text-xs"
                          />
                          <select
                            value={payForeignCurrencyInput}
                            onChange={e => setPayForeignCurrencyInput(e.target.value)}
                            className="bg-slate-800 text-[#D9B978] text-[11px] font-black px-2 py-2 outline-none border-s border-white/10"
                          >
                            <option value="USD">USD</option>
                            <option value="SAR">SAR</option>
                            <option value="AED">AED</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'سعر الصرف' : 'Rate'}</label>
                        <input 
                          type="number"
                          step="any"
                          value={payAgreedRateInput}
                          onChange={e => {
                            const val = e.target.value;
                            setPayAgreedRateInput(val);
                            const num = parseArabicNumber(payForeignAmountInput);
                            const rate = parseArabicNumber(val);
                            if (!isNaN(num) && num > 0 && !isNaN(rate) && rate > 0) {
                              setPayAmountInput(roundToCurrency(safeMul(num, rate)).toString());
                            }
                          }}
                          placeholder={isRtl ? 'مثلاً: 1600' : 'e.g. 1600'}
                          className="w-full p-2 rounded-xl bg-[#11161C] border border-white/10 outline-none text-white font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isRtl ? 'المبلغ الإجمالي المسدد بالعملة الأساسية' : 'Payment Amount in Base Currency'}</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="any"
                    value={payAmountInput}
                    onChange={e => {
                      const val = e.target.value;
                      setPayAmountInput(val);
                      if (payHasAgreedRate && payAgreedRateInput) {
                        const amtNum = parseArabicNumber(val);
                        const rateNum = parseArabicNumber(payAgreedRateInput);
                        if (!isNaN(amtNum) && !isNaN(rateNum) && rateNum > 0) {
                          setPayForeignAmountInput(roundToCurrency(safeDiv(amtNum, rateNum)).toString());
                        }
                      }
                    }}
                    placeholder="0.00"
                    className="w-full p-3 rounded-2xl bg-[#0A0D10] border border-white/10 outline-none text-emerald-400 font-black text-center text-xl tracking-wider focus:border-emerald-500 transition-colors shadow-inner"
                    required
                  />
                  <span className={`absolute ${isRtl ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 text-xs font-black text-slate-500`}>
                    {getDebtCurrencySymbol(paymentModalData.debt.currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'تاريخ الدفعة' : 'Date'}</label>
                <input 
                  type="date"
                  value={payDateInput}
                  onChange={e => setPayDateInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0A0D10] border border-white/10 outline-none text-white font-bold text-xs"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg text-xs sm:text-sm active:scale-98 transition-all mt-2"
              >
                {isRtl ? 'تأكيد وحفظ الدفعة في السجل 💳' : 'Confirm Payment 💳'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAYMENT HISTORY MODAL */}
      {historyModalDebt && (
        <div className="fixed inset-0 bg-[#0A0D10]/85 backdrop-blur-md z-[350] flex items-center justify-center p-3 sm:p-4 no-print overflow-hidden">
          <div className="bg-[#11161C] w-full max-w-md mx-auto rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col min-h-0 text-start" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <History size={18} className="text-[#D9B978]" />
                  {t.paymentHistory}
                </h3>
                <p className="text-xs text-slate-400 font-bold">{historyModalDebt.personName}</p>
              </div>
              <button 
                onClick={() => setHistoryModalDebt(null)}
                className="p-1.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 px-1">
              {(!historyModalDebt.payments || historyModalDebt.payments.length === 0) ? (
                <div className="text-center py-8 text-slate-500 text-xs font-bold">
                  {historyModalDebt.paidAmount > 0 ? (
                    <div className="bg-[#0A0D10] p-4 rounded-2xl border border-white/10">
                      <p className="text-emerald-400 font-black text-sm mb-1">
                        {isRtl ? 'تم سداد' : 'Paid'}: {historyModalDebt.paidAmount.toLocaleString()} {getDebtCurrencySymbol(historyModalDebt.currency)}
                      </p>
                    </div>
                  ) : (
                    <p>{isRtl ? 'لم يتم تسجيل أي دفعات سداد لهذا الدين حتى الآن.' : 'No payments recorded yet.'}</p>
                  )}
                </div>
              ) : (
                historyModalDebt.payments.map((p, idx) => (
                  <div key={p.id || idx} className="p-3 bg-[#0A0D10] rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black text-sm">
                          +{p.amount.toLocaleString()} {getDebtCurrencySymbol(historyModalDebt.currency)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {isRtl ? 'تاريخ' : 'Date'}: {p.date} {p.note ? `• ${p.note}` : ''}
                      </p>
                    </div>
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setHistoryModalDebt(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl mt-3"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: DEBT REMINDER & SHARING MODAL (تذكير بالديون ومشاركتها) */}
      {reminderModalData && (
        <div className="fixed inset-0 bg-[#0A0D10]/85 backdrop-blur-md z-[400] flex items-center justify-center p-3 sm:p-4 no-print overflow-hidden">
          <div className="bg-[#11161C] w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#D9B978]/30 overflow-hidden max-h-[90vh] flex flex-col min-h-0 text-start relative" dir={isRtl ? 'rtl' : 'ltr'}>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    {isRtl ? 'تذكير بالدين ومشاركة الإشعار' : 'Debt Reminder & Notice'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold">
                    {reminderModalData.personName} • {reminderModalData.amount.toLocaleString()} {getDebtCurrencySymbol(reminderModalData.currency)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReminderModalData(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-1 pb-1">
              
              {/* Summary Pill */}
              <div className="bg-[#0A0D10] p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${reminderModalData.type === 'to_me' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <div>
                    <p className="text-xs font-black text-white">
                      {reminderModalData.isPersonStatement 
                        ? (isRtl ? 'كشف حساب مالي مجمع' : 'Consolidated Statement')
                        : reminderModalData.type === 'to_me' 
                        ? (isRtl ? 'دين مستحق لك (تحصيل)' : 'Debt Owed To You') 
                        : (isRtl ? 'دين مستحق عليك (التزام)' : 'Debt You Owe')}
                    </p>
                    {reminderModalData.dueDate && (
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                        <Calendar size={11} className="text-[#D9B978]" />
                        <span>{isRtl ? 'تاريخ الاستحقاق:' : 'Due Date:'} {reminderModalData.dueDate}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-end">
                  <span className={`text-base font-black ${reminderModalData.type === 'to_me' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reminderModalData.amount.toLocaleString()} <span className="text-xs">{getDebtCurrencySymbol(reminderModalData.currency)}</span>
                  </span>
                </div>
              </div>

              {/* Template Selectors */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                  {isRtl ? 'اختر صيغة ونبرة التذكير المناسبة' : 'Choose Reminder Tone'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'friendly', label: isRtl ? 'ودّي ولطيف' : 'Friendly', icon: '🌟' },
                    { id: 'formal', label: isRtl ? 'رسمي ومفصل' : 'Formal', icon: '📄' },
                    { id: 'urgent', label: isRtl ? 'استحقاق عاجل' : 'Urgent', icon: '⚠️' },
                    { id: 'statement', label: isRtl ? 'كشف مالي' : 'Statement', icon: '📊' },
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.id as any)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                        reminderTemplateType === tmpl.id
                          ? 'bg-[#D9B978] text-slate-950 font-black shadow-md'
                          : 'bg-[#0A0D10] text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      <span className="text-sm">{tmpl.icon}</span>
                      <span>{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Phone (Optional/Editable) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>{isRtl ? 'رقم هاتف المستلم (لإرسال واتساب / SMS)' : 'Recipient Phone Number'}</span>
                  <span className="text-[9px] text-[#D9B978]">{isRtl ? 'مع رمز الدولة' : 'With Country Code'}</span>
                </label>
                <div className="relative">
                  <Phone size={14} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-500`} />
                  <input
                    type="tel"
                    value={reminderRecipientPhone}
                    onChange={e => setReminderRecipientPhone(e.target.value)}
                    placeholder={isRtl ? 'مثلاً: 9665xxxxxxxx أو 967xxxxxxxxx' : '+1234567890'}
                    className={`w-full p-2.5 ${isRtl ? 'pr-9' : 'pl-9'} rounded-xl bg-[#0A0D10] border border-white/10 text-white font-bold text-xs outline-none focus:border-[#D9B978]`}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Editable Message Box */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isRtl ? 'نص التذكير (قابل للتعديل بحرية)' : 'Message Content (Editable)'}
                  </label>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {customReminderText.length} {isRtl ? 'حرف' : 'chars'}
                  </span>
                </div>
                <textarea
                  value={customReminderText}
                  onChange={e => setCustomReminderText(e.target.value)}
                  rows={5}
                  className="w-full p-3 rounded-2xl bg-[#0A0D10] border border-white/10 text-white text-xs sm:text-sm font-medium outline-none focus:border-[#D9B978] custom-scrollbar leading-relaxed resize-none shadow-inner"
                />
              </div>

              {/* Action Buttons Grid */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* WhatsApp Direct */}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <MessageSquare size={16} />
                    <span>{isRtl ? 'إرسال عبر واتساب 🟢' : 'Send via WhatsApp'}</span>
                  </button>

                  {/* Copy Message */}
                  <button
                    type="button"
                    onClick={handleCopyReminder}
                    className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md ${
                      copiedSuccess 
                        ? 'bg-emerald-500 text-slate-950 font-black' 
                        : 'bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950'
                    }`}
                  >
                    {copiedSuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                    <span>{copiedSuccess ? (isRtl ? 'تم نسخ النص بنجاح! ✓' : 'Copied!') : (isRtl ? 'نسخ نص التذكير 📋' : 'Copy Message')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* SMS Message */}
                  <button
                    type="button"
                    onClick={handleSendSMS}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-white/10 active:scale-98 transition-all"
                  >
                    <Send size={14} />
                    <span>{isRtl ? 'إرسال كـ رسالة نصية SMS' : 'Send via SMS'}</span>
                  </button>

                  {/* Add to Google Calendar */}
                  {reminderModalData.dueDate && (
                    <button
                      type="button"
                      onClick={handleAddToCalendar}
                      className="py-2.5 px-3 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                    >
                      <Calendar size={14} />
                      <span>{isRtl ? 'إضافة موعد في التقويم 📅' : 'Add to Calendar'}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-3 mt-2 border-t border-white/5 shrink-0">
              <button
                onClick={() => setReminderModalData(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all"
              >
                {isRtl ? 'إغلاق النافذة' : 'Close Window'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DebtManager;
