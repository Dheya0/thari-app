
export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment' | 'transfer_to_goal';

export type FinancialEventType = 
  | 'expense'           // مصروف
  | 'income'            // دخل
  | 'transfer'          // تحويل
  | 'debt_to_me'        // دين لي (إقراض)
  | 'debt_on_me'        // دين عليّ (استلاف)
  | 'debt_repayment'    // سداد دين
  | 'balance_adjustment'; // تصحيح الرصيد

export type LedgerAccountType = 
  | 'asset'             // أصول: محافظ وحسابات نقدية
  | 'liability'         // التزامات: ديون ومطلوبات
  | 'receivable'        // مستحقات: ديون لي بذمة الغير
  | 'payable'           // مطلوبات: ديون عليّ للغير
  | 'equity'            // رأس المال / أرصدة افتتاحية
  | 'income'            // إيرادات
  | 'expense'           // مصروفات
  | 'reconciliation';   // تسويات وفروقات أرصدة

export interface JournalLine {
  id: string;
  accountId: string;
  accountName: string;
  accountType: LedgerAccountType;
  debit: number;
  credit: number;
  currency: string;
  rateSnapshot: number;
  amountInBaseCurrency: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  eventId: string;
  eventType: FinancialEventType;
  date: string;
  timestamp: string;
  description: string;
  sourceWalletId?: string;
  destinationWalletId?: string;
  debtId?: string;
  personName?: string;
  lines: JournalLine[];
  metadata?: Record<string, any>;
}

export type SyncState = 'LOCAL_ONLY' | 'PENDING_LOCAL_SAVE' | 'SAVE_FAILED' | 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'business' | 'family' | 'project';
  description?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}

export interface Wallet {
  id: string;
  accountId?: string;
  name: string;
  currencyCode: string; // العملة الأساسية للمحفظة Primary Currency
  secondaryCurrencies?: string[]; // العملات الإضافية المدعومة
  isMultiCurrency?: boolean;
  color: string;
  type?: 'cash' | 'bank' | 'savings' | 'ewallet';
  openingBalance?: number;
  currentBalance?: number;
  balance?: number;
  status?: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptAttachment {
  id: string;
  transactionId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl?: string; // Base64 safe image / document (legacy / optional now)
  receiptPath?: string; // Filesystem path for mobile-first decoupled storage
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId?: string;
  walletId: string;
  destinationWalletId?: string; // For transfers
  debtId?: string;             // Linked debt entity ID
  debtPaymentId?: string;      // Linked debt payment record ID
  isFinancing?: boolean;       // True if this is financing flow (debt/loan/equity) rather than operating revenue/expense
  currency: string;
  destinationCurrency?: string; // Cross-currency transfer
  destinationAmount?: number;   // Amount in destination currency
  walletCurrency?: string;      // العملة الأساسية للمحفظة المصدر
  convertedAmountInWalletCurrency?: number; // المبلغ المحول والمخصوم فعلياً من المحفظة
  exchangeRateUsed?: number;    // سعر الصرف المعتمد وقت العملية
  foreignAmount?: number;       // المبلغ بالعملة الأجنبية
  foreignCurrency?: string;     // رمز العملة الأجنبية (USD, SAR, etc.)
  exchangeRate?: number;        // سعر الصرف المتفق عليه والمثبت
  conversionNote?: string;      // نص التوثيق المعتمد لسعر الصرف لمنع النزاع
  categoryId: string;
  type: TransactionType;
  amount: number;
  note: string;
  description?: string;
  date: string;
  time?: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  receipt?: ReceiptAttachment;
  isDeleted?: boolean;
  deletedAt?: string;
  deviceId?: string;
  syncStatus?: SyncState;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  recurrenceId?: string;
  occurrenceDate?: string;
}

export interface RecurringRule {
  id: string;
  accountId?: string;
  walletId: string;
  destinationWalletId?: string;
  type: 'income' | 'expense' | 'transfer';
  categoryId: string;
  amount: number;
  currency: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextOccurrence: string;
  lastGeneratedDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  color: string;
  walletId?: string; // Linked wallet
  targetDate?: string; // When the user wants to reach this
}

export type SavingsGoal = Goal;

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  period: 'monthly' | 'yearly';
  categoryId: string;
  nextBillingDate: string;
  isActive: boolean;
}

export interface DebtInstallment {
  id: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  walletId?: string;
  walletName?: string;
  note?: string;
  receipt?: ReceiptAttachment;
  createdAt: string;
  foreignAmount?: number;
  foreignCurrency?: string;
  exchangeRate?: number;
  conversionNote?: string;
}

export type DebtStatus = 'active' | 'partial' | 'settled' | 'overdue';

export interface Debt {
  id: string;
  personName: string;
  personPhone?: string;
  personTag?: 'individual' | 'friend' | 'family' | 'customer' | 'supplier';
  amount: number; // المبلغ الأصلي Total/Original amount
  originalAmount?: number;
  paidAmount: number; // إجمالي المبلغ المدفوع Amount paid so far
  type: 'to_me' | 'on_me'; // 'to_me' = دين لي (مستحق لي) | 'on_me' = دين علي (مستحق علي)
  createdAt: string; // تاريخ الإنشاء
  dueDate?: string;  // تاريخ الاستحقاق
  isPaid: boolean; // True only if fully paid
  status?: DebtStatus; // حالة الدين
  note: string;
  currency: string;
  payments?: DebtPayment[]; // سجل الدفعات التفصيلي
  installments?: DebtInstallment[]; // أقساط اختيارية
  // Agreed Exchange Rate & Currency Lock (توثيق وتثبيت سعر الصرف لمنع الاحتيال والنزاع)
  foreignAmount?: number; // المبلغ بالعملة الأجنبية مثلاً 104
  foreignCurrency?: string; // العملة الأجنبية مثلاً USD
  exchangeRate?: number; // سعر الصرف المعتمد المتفق عليه مثلاً 1600
  conversionNote?: string; // نص الملاحظة التوثيقية المطبوعة (مثل: تمت العملية: 104 $ بسعر 1,600 = الإجمالي: 166,400 ر.ي)
}

export interface Budget {
  id?: string;
  categoryId: string;
  amount: number;
  currencyCode?: string;
  period?: 'monthly' | 'weekly' | 'custom';
  startDate?: string;
  endDate?: string;
}

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  icon?: string;
  region?: string;
  decimalPlaces?: number;
  isActive?: boolean;
};

export interface AuditLog {
  id: string;
  action: 'transaction_created' | 'transaction_updated' | 'transaction_deleted' | 'transaction_restored' | 'wallet_created' | 'wallet_updated' | 'transfer_executed' | 'backup_created' | 'backup_restored';
  entityId: string;
  details: string;
  timestamp: string;
}

export type ZakatScopeType = 'all' | 'selected_wallets' | 'custom';

export interface ZakatProfile {
  id: string;
  name: string;
  description?: string;
  scopeType: ZakatScopeType;
  selectedWalletIds: string[];
  includeDebtsToMe: boolean;
  includeDebtsOnMe: boolean;
  gold24Grams: number;
  gold21Grams: number;
  gold18Grams: number;
  silverGrams: number;
  customGold24Price?: number;
  customGold21Price?: number;
  customGold18Price?: number;
  customSilverPrice?: number;
  tradeInventoryValue: number;
  tradingStocksValue: number;
  investmentStocksMethod: 'liquid_ratio' | 'dividends_only';
  longTermStocksValue: number;
  longTermDividendsValue: number;
  investmentFundsValue?: number;
  realEstateTradeValue: number;
  rentalIncomeValue?: number;
  hawlStartDate: string;
  hawlDurationDays: number;
  customDeductions?: number;
  isScopeConfirmed?: boolean;
  scopeConfirmedAt?: string;
  lastCalculatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZakatPaymentRecord {
  id: string;
  profileId: string;
  profileName: string;
  amount: number;
  currency: string;
  date: string;
  recipient?: string;
  walletId?: string;
  note?: string;
  cycleYear: string;
}

export interface AppState {
  accounts: Account[];
  activeAccountId: string;
  userName: string;
  userEmail?: string;
  transactions: Transaction[];
  trashTransactions: Transaction[];
  recurringRules: RecurringRule[];
  subscriptions: Subscription[];
  categories: Category[];
  wallets: Wallet[];
  goals: Goal[];
  debts: Debt[];
  budgets: Budget[];
  zakatProfiles?: ZakatProfile[];
  zakatPayments?: ZakatPaymentRecord[];
  currency: Currency;
  currencies: Currency[];
  exchangeRates: Record<string, number>; // Custom Exchange Rates (Base: SAR)
  auditLogs: AuditLog[];
  isDarkMode: boolean;
  pin: string | null;
  pinSalt?: string;
  isLocked: boolean;
  isBiometricEnabled?: boolean;
  isTravelMode: boolean;
  hasAcceptedTerms: boolean;
  showSeparateCurrencies: boolean; // Toggle for Travel Mode
  lastBackupDate?: string; // ISO date string of last backup taken
  autoLockTime?: 'instant' | '1min' | '5min' | 'never'; // Auto-lock timeout
  requireBiometricOnOpen?: boolean; // Require biometric / PIN on every app launch or background resume
  autoBackupFrequency?: 'on_open' | 'daily' | 'weekly' | 'disabled'; // Auto-backup frequency
  lastAutoBackupTime?: string; // ISO date string of last automatic backup
  syncStatus?: SyncState;
  language?: 'ar' | 'en'; // App language (Arabic / English)
}
