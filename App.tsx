
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LayoutDashboard, History, Settings as SettingsIcon, Briefcase, HandCoins, Repeat, Coins, Sparkles, Scale, Wallet as WalletIcon, Check, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { AppState, Transaction, Category, Debt, DebtPayment, Account, RecurringRule } from './types';
import { INITIAL_CATEGORIES, DEFAULT_CURRENCIES, DEFAULT_EXCHANGE_RATES, convertCurrency } from './constants';
import { buildExecutiveCSVContent, exportAndShareExecutiveCSV } from './utils/exportHelper';
import { formatLocalDateOnly } from './utils/formatters';
import { generateFinancialReportSync } from './services/reports/reportService';
import { printOrShareFinancialReport } from './services/reports/reportExportService';
import { saveSecureState, saveSecureStateSync, loadSecureStateAsync, queueSecureStateSave, flushSecureStateSave } from './utils/secureStorage';
import { calculateConsolidatedPosition } from './services/balanceEngine';
import { processDueRecurringRules } from './services/recurringService';
import { isNativeCapacitorEnvironment } from './services/biometricService';
import { WidgetService } from './services/widgetService';
import { getTranslation, getLocalizedCurrency } from './utils/translations';
import { NativeKeyboard, NativeHaptics } from './services/nativeServices';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem } from '@capacitor/filesystem';
import { SplashScreen } from '@capacitor/splash-screen';
import { migrateStateReceipts, deleteReceiptFile } from './services/receiptStorage';
import { appLifecycleService } from './services/appLifecycleService';
import { backNavigationManager, useBackNavigation } from './utils/backNavigation';
import BalanceCard from './components/BalanceCard';
import ElegantDashboard from './components/ElegantDashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import Analytics from './components/Analytics';
import DebtManager from './components/DebtManager';
import SubscriptionManager from './components/SubscriptionManager';
import BudgetManager from './components/BudgetManager';
import GoalTracker from './components/GoalTracker';
import Settings from './components/Settings';
import { AboutAndPrivacy } from './components/AboutAndPrivacy';
import WelcomeScreen from './components/WelcomeScreen';
import LockScreen from './components/LockScreen';
import Logo from './components/Logo';
import FinancialReport from './components/FinancialReport';
import { ReportModal } from './components/reports/ReportModal';
import { TrashModal } from './components/TrashModal';
import { RecurringManagerModal } from './components/RecurringManagerModal';
import { SystemDiagnosticsModal } from './components/SystemDiagnosticsModal';
import { ToolsHubModal } from './components/ToolsHubModal';
import CurrencySelectorModal from './components/CurrencySelectorModal';
import WalletSelectorModal from './components/WalletSelectorModal';
import SmartAlerts from './components/SmartAlerts';
import ZakatCalculator from './components/ZakatCalculator';
import ExecutiveInsights from './components/ExecutiveInsights';
import CashflowSankey from './components/CashflowSankey';

const STORAGE_KEY = 'thari_app_v4';

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-main',
    name: 'الحساب الشخصي',
    type: 'personal',
    description: 'الحساب المالي الأساسي لإدارة المصاريف والدخل اليومي',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_STATE: AppState = {
  accounts: DEFAULT_ACCOUNTS,
  activeAccountId: 'acc-main',
  userName: 'مستخدم ثري',
  userEmail: '',
  transactions: [],
  trashTransactions: [],
  recurringRules: [],
  subscriptions: [],
  chatHistory: [],
  categories: INITIAL_CATEGORIES,
  wallets: [
    { id: 'w-yer-1', name: 'الراتب', currencyCode: 'YER_SANAA', color: '#f59e0b' },
    { id: 'w-sar-1', name: 'كاش سعودي', currencyCode: 'SAR', color: '#10b981' }
  ],
  goals: [],
  debts: [],
  budgets: [],
  currency: DEFAULT_CURRENCIES[0], // Default to SAR
  currencies: DEFAULT_CURRENCIES,
  exchangeRates: DEFAULT_EXCHANGE_RATES,
  auditLogs: [],
  isDarkMode: true,
  pin: null,
  isLocked: false,
  isBiometricEnabled: false,
  requireBiometricOnOpen: true,
  isTravelMode: false,
  showSeparateCurrencies: false,
  hasAcceptedTerms: false,
  apiKey: '', // Initialize empty
  autoLockTime: 'instant',
  autoBackupFrequency: 'daily',
  lastAutoBackupTime: '',
  syncStatus: 'SYNCED',
  language: 'ar',
};

function normalizeStoredState(parsed: any): AppState {
  if (!parsed || typeof parsed !== 'object') {
    return INITIAL_STATE;
  }

  let activeCurrency = parsed.currency;
  if (typeof activeCurrency === 'string') {
    activeCurrency = DEFAULT_CURRENCIES.find(c => c.code === activeCurrency) || DEFAULT_CURRENCIES[0];
  } else if (!activeCurrency || !activeCurrency.code) {
    activeCurrency = DEFAULT_CURRENCIES[0];
  }

  const currencies = (parsed.currencies && Array.isArray(parsed.currencies) && parsed.currencies.length > 0)
    ? parsed.currencies
    : DEFAULT_CURRENCIES;

  const categories = (parsed.categories && Array.isArray(parsed.categories) && parsed.categories.length > 0)
    ? parsed.categories
    : INITIAL_CATEGORIES;

  const wallets = (parsed.wallets && Array.isArray(parsed.wallets) && parsed.wallets.length > 0)
    ? parsed.wallets
    : INITIAL_STATE.wallets;

  const accounts = (parsed.accounts && Array.isArray(parsed.accounts) && parsed.accounts.length > 0)
    ? parsed.accounts
    : DEFAULT_ACCOUNTS;

  const exchangeRates = (parsed.exchangeRates && typeof parsed.exchangeRates === 'object')
    ? { ...DEFAULT_EXCHANGE_RATES, ...parsed.exchangeRates }
    : DEFAULT_EXCHANGE_RATES;

  const hasPin = !!parsed.pin && typeof parsed.pin === 'string' && parsed.pin.trim().length > 0;
  const isSecurityProtected = hasPin || (parsed.isBiometricEnabled === true && parsed.requireBiometricOnOpen === true);
  const shouldLockOnOpen = isSecurityProtected && parsed.autoLockTime !== 'never';

  return {
    ...INITIAL_STATE,
    ...parsed,
    accounts,
    activeAccountId: parsed.activeAccountId || accounts[0]?.id || 'acc-main',
    currency: activeCurrency,
    currencies,
    categories,
    wallets,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    trashTransactions: Array.isArray(parsed.trashTransactions) ? parsed.trashTransactions : [],
    recurringRules: Array.isArray(parsed.recurringRules) ? parsed.recurringRules : [],
    subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
    debts: Array.isArray(parsed.debts) ? parsed.debts : [],
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
    auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    exchangeRates,
    userEmail: parsed.userEmail || '',
    userName: parsed.userName || 'مستخدم ثري',
    isLocked: shouldLockOnOpen,
  };
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const stateRevisionRef = useRef(0);

  useEffect(() => {
    stateRevisionRef.current += 1;
  }, [state]);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.log('[perf] startup-start');
    }
    // Hide Capacitor native splash immediately when app loads
    SplashScreen.hide().catch(() => {});
    let cancelled = false;

    const hydrateState = async () => {
      try {
        const parsed = await loadSecureStateAsync(STORAGE_KEY);
        if (cancelled) return;

        if (parsed && typeof parsed === 'object') {
          // Instantly set normalized state so UI paints without waiting for migration
          setState(normalizeStoredState(parsed));
          isHydratedRef.current = true;
          const initialRevision = stateRevisionRef.current;

          if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
            console.log('[perf] hydration-complete');
          }

          // Run non-critical receipt migration in background with revision check
          setTimeout(async () => {
            try {
              const migrated = await migrateStateReceipts(parsed);
              if (!cancelled) {
                if (stateRevisionRef.current === initialRevision) {
                  setState(normalizeStoredState(migrated));
                  queueSecureStateSave(STORAGE_KEY, migrated);
                } else {
                  // User mutations occurred during migration: safely merge only receipt paths without overwriting newer state
                  setState(currentState => {
                    let hasMergeChanges = false;
                    const updatedTransactions = currentState.transactions.map(currTx => {
                      const migTx = migrated.transactions.find((t: Transaction) => t.id === currTx.id);
                      if (migTx && migTx.receipt && migTx.receipt.receiptPath && !currTx.receipt?.receiptPath) {
                        hasMergeChanges = true;
                        return { ...currTx, receipt: migTx.receipt };
                      }
                      return currTx;
                    });
                    if (hasMergeChanges) {
                      const mergedState = { ...currentState, transactions: updatedTransactions };
                      queueSecureStateSave(STORAGE_KEY, mergedState);
                      return mergedState;
                    }
                    return currentState;
                  });
                }
              }
            } catch (bgErr) {
              console.warn('Background migration warning:', bgErr);
            }
          }, 500);
        } else {
          isHydratedRef.current = true;
          if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
            console.log('[perf] hydration-complete');
          }
        }
      } catch (error) {
        console.warn('App hydrate error:', error);
        if (!cancelled) {
          isHydratedRef.current = true;
        }
      }
    };

    void hydrateState();
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts' | 'chat' | 'subscriptions' | 'settings' | 'budgets' | 'goals' | 'zakat'>('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [isLoadingSplash, setIsLoadingSplash] = useState(false);
  const isHydratedRef = useRef(false);

  // Instant Launch: Remove artificial splash delay so UI paints immediately
  useEffect(() => {
    setIsLoadingSplash(false);
  }, []);

  useEffect(() => {
    // Configure Native Keyboard defaults
    if (NativeKeyboard.isAvailable()) {
      NativeKeyboard.setStyle('DARK').catch(() => {});
      NativeKeyboard.setResizeMode('body').catch(() => {});
      NativeKeyboard.setAccessoryBarVisible(false).catch(() => {});
    }

    const updateViewport = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${viewportHeight}px`);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);
  const [printType, setPrintType] = useState<'summary' | 'detailed'>('summary');
  const [printWalletFilter, setPrintWalletFilter] = useState<string | null>(null);
  const [printCurrencyFilter, setPrintCurrencyFilter] = useState<string | null>(null);
  const [printStartDate, setPrintStartDate] = useState<string | null>(null);
  const [printEndDate, setPrintEndDate] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showTrashModal, setShowTrashModal] = useState<boolean>(false);
  const [showRecurringModal, setShowRecurringModal] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);
  const [showToolsHub, setShowToolsHub] = useState<boolean>(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState<boolean>(false);
  const [showWalletSelector, setShowWalletSelector] = useState<boolean>(false);
  
  // Wallet Filter State (null = All Wallets)
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [timePeriodFilter, setTimePeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [formDefaultType, setFormDefaultType] = useState<'expense' | 'income' | 'transfer' | 'adjustment' | undefined>(undefined);

  // Sync Document Direction & Language
  useEffect(() => {
    const lang = state.language || 'ar';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [state.language]);

  const activeLanguage = state.language || 'ar';
  const t = getTranslation(activeLanguage);

  const localizedCurrency = useMemo(() => {
    const loc = getLocalizedCurrency(
      state.currency?.code || 'SAR',
      state.currency?.name,
      state.currency?.symbol,
      activeLanguage
    );
    return {
      ...state.currency,
      name: loc.name,
      symbol: loc.symbol,
    };
  }, [state.currency, activeLanguage]);

  const localizedCurrencies = useMemo(() => {
    return (state.currencies || DEFAULT_CURRENCIES).map(c => {
      const loc = getLocalizedCurrency(c.code, c.name, c.symbol, activeLanguage);
      return {
        ...c,
        name: loc.name,
        symbol: loc.symbol,
      };
    });
  }, [state.currencies, activeLanguage]);

  // 100% Offline-First Sovereignty: Ignore network state changes and connection warnings
  const isOnline = true;
  const showNetworkToast = false;

  // PWA states
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const backgroundedAtRef = useRef<number | null>(null);
  const justUnlockedRef = useRef<number>(0);



  // Check and process due recurring transactions on initial mount
  useEffect(() => {
    setState(prev => {
      if (!prev.recurringRules || prev.recurringRules.length === 0) return prev;
      const { newTransactions, updatedRules } = processDueRecurringRules(
        prev.recurringRules,
        prev.transactions
      );
      if (newTransactions.length === 0) return prev;
      return {
        ...prev,
        transactions: [...newTransactions, ...prev.transactions],
        recurringRules: updatedRules,
      };
    });
  }, []);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      console.log("Thari App: PWA update detected on client!");
      setIsUpdateAvailable(true);
      if (e instanceof CustomEvent && e.detail) {
        setSwRegistration(e.detail);
      }
    };
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.dispatchEvent(new CustomEvent('pwa-check-status'));

    window.addEventListener('pwa-update-available', handleUpdate);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdate);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  // Android Hardware Back Button & Keyboard Hierarchy Handler
  const isKeyboardOpenRef = useRef(false);
  useEffect(() => {
    let showSub: any = null;
    let hideSub: any = null;
    if (NativeKeyboard.isAvailable()) {
      NativeKeyboard.addListener('keyboardWillShow', () => { isKeyboardOpenRef.current = true; }).then(s => { showSub = s; }).catch(() => {});
      NativeKeyboard.addListener('keyboardWillHide', () => { isKeyboardOpenRef.current = false; }).then(s => { hideSub = s; }).catch(() => {});
    }
    return () => {
      if (showSub?.remove) showSub.remove();
      if (hideSub?.remove) hideSub.remove();
    };
  }, []);

  // Register top-level modals in centralized back navigation stack with priority 5
  useBackNavigation(() => {
    if (showPrivacyPolicy) {
      setShowPrivacyPolicy(false);
      return true;
    }
    if (showDiagnosticsModal) {
      setShowDiagnosticsModal(false);
      return true;
    }
    if (showTrashModal) {
      setShowTrashModal(false);
      return true;
    }
    if (showToolsHub) {
      setShowToolsHub(false);
      return true;
    }
    if (showCurrencySelector) {
      setShowCurrencySelector(false);
      return true;
    }
    if (showWalletSelector) {
      setShowWalletSelector(false);
      return true;
    }
    if (showReportModal) {
      setShowReportModal(false);
      return true;
    }
    if (showRecurringModal) {
      setShowRecurringModal(false);
      return true;
    }
    if (showAddForm) {
      setShowAddForm(false);
      setEditingTransaction(null);
      setFormDefaultType(undefined);
      return true;
    }
    return false;
  }, Boolean(
    showPrivacyPolicy ||
    showDiagnosticsModal ||
    showTrashModal ||
    showToolsHub ||
    showCurrencySelector ||
    showWalletSelector ||
    showReportModal ||
    showRecurringModal ||
    showAddForm
  ), 5);

  useEffect(() => {
    let backButtonListener: any = null;
    if (isNativeCapacitorEnvironment()) {
      CapApp.addListener('backButton', () => {
        // 1. If Keyboard open -> close keyboard only
        if (isKeyboardOpenRef.current || (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName))) {
          if (NativeKeyboard.isAvailable()) {
            NativeKeyboard.hide().catch(() => {});
          }
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          isKeyboardOpenRef.current = false;
          return;
        }

        // 2. Delegate to prioritized Back Navigation Manager
        const wasHandled = backNavigationManager.handleBack();
        if (wasHandled) {
          return;
        }

        // 3. If user inside non-Dashboard tab -> return to Dashboard
        if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
          return;
        }

        // 4. If Dashboard & no overlay -> allow app exit
        CapApp.exitApp();
      }).then(l => { backButtonListener = l; });
    }
    return () => {
      if (backButtonListener && backButtonListener.remove) {
        backButtonListener.remove();
      }
    };
  }, [activeTab]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Single Save Pipeline with 400ms debounce, generation counter, and coalescing
  useEffect(() => {
    queueSecureStateSave(STORAGE_KEY, state);
  }, [state]);

  // Flush state immediately on page unload / pagehide using sync recovery snapshot + async flush
  useEffect(() => {
    const handleImmediateFlush = () => {
      if (stateRef.current) {
        saveSecureStateSync(STORAGE_KEY, stateRef.current);
        void flushSecureStateSave(STORAGE_KEY);
      }
    };

    window.addEventListener('beforeunload', handleImmediateFlush);
    window.addEventListener('pagehide', handleImmediateFlush);

    return () => {
      window.removeEventListener('beforeunload', handleImmediateFlush);
      window.removeEventListener('pagehide', handleImmediateFlush);
    };
  }, []);

  // Unified App Lifecycle via appLifecycleService
  useEffect(() => {
    appLifecycleService.init();

    const unsubscribe = appLifecycleService.addListener((event) => {
      if (event === 'APP_BACKGROUND') {
        const now = Date.now();
        backgroundedAtRef.current = now;
        try {
          sessionStorage.setItem('thari_bg_ts', now.toString());
        } catch (e) {}

        if (stateRef.current) {
          saveSecureStateSync(STORAGE_KEY, stateRef.current);
          void flushSecureStateSave(STORAGE_KEY);
        }

        const currentState = stateRef.current;
        const isSecurityConfigured = !!currentState.pin || currentState.isBiometricEnabled === true;
        if (isSecurityConfigured && (!currentState.autoLockTime || currentState.autoLockTime === 'instant')) {
          setState(p => ({ ...p, isLocked: true }));
        }
      } else if (event === 'APP_FOREGROUND') {
        if (Date.now() < justUnlockedRef.current) {
          backgroundedAtRef.current = null;
          try { sessionStorage.removeItem('thari_bg_ts'); } catch (e) {}
          return;
        }
        let bgTime = backgroundedAtRef.current;
        if (!bgTime) {
          try {
            const stored = sessionStorage.getItem('thari_bg_ts');
            if (stored) bgTime = parseInt(stored, 10);
          } catch (e) {}
        }

        const currentState = stateRef.current;
        const isSecurityConfigured = !!currentState.pin || currentState.isBiometricEnabled === true;
        if (isSecurityConfigured && currentState.autoLockTime && currentState.autoLockTime !== 'never') {
          if (bgTime && currentState.autoLockTime !== 'instant') {
            const elapsedMs = Date.now() - bgTime;
            const thresholdMs = currentState.autoLockTime === '1min' ? 60000 : 300000;
            if (elapsedMs >= thresholdMs) {
              setState(p => ({ ...p, isLocked: true }));
            }
          } else if (!currentState.autoLockTime || currentState.autoLockTime === 'instant') {
            const bgDuration = bgTime ? Date.now() - bgTime : 0;
            if (!bgTime || bgDuration >= 1000) {
              setState(p => ({ ...p, isLocked: true }));
            }
          }
        }
        backgroundedAtRef.current = null;
        try { sessionStorage.removeItem('thari_bg_ts'); } catch (e) {}
      } else if (event === 'QUICK_ACTION') {
        setIsLoadingSplash(false);
        setShowAddForm(true);
        setEditingTransaction(null);
        setFormDefaultType('expense');
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) {}
      }
    });

    return () => {
      unsubscribe();
      appLifecycleService.destroy();
    };
  }, []);

  // Automated Periodic / On-Open Snapshot Backup Runner
  useEffect(() => {
    try {
      const freq = state.autoBackupFrequency || 'daily';
      if (freq === 'disabled') return;

      const now = Date.now();
      const lastBackupIso = state.lastAutoBackupTime;
      const lastTime = lastBackupIso ? new Date(lastBackupIso).getTime() : 0;
      const elapsedMs = now - lastTime;

      let shouldBackup = false;
      if (freq === 'on_open') {
        shouldBackup = true;
      } else if (freq === 'daily') {
        shouldBackup = elapsedMs > 86400000; // 24 hours
      } else if (freq === 'weekly') {
        shouldBackup = elapsedMs > 7 * 86400000; // 7 days
      }

      if (shouldBackup) {
        const timestampIso = new Date().toISOString();
        const snapshotItem = {
          id: `auto_${Date.now()}`,
          timestamp: timestampIso,
          dateFormatted: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          transactionsCount: state.transactions.length,
          walletsCount: state.wallets.length,
          debtsCount: state.debts.length,
          data: JSON.stringify(state)
        };

        const savedHistory = localStorage.getItem('thari_auto_backup_history');
        let history = savedHistory ? JSON.parse(savedHistory) : [];
        history = [snapshotItem, ...history.filter((h: any) => h.id !== snapshotItem.id)].slice(0, 5);
        localStorage.setItem('thari_auto_backup_history', JSON.stringify(history));

        setState(prev => ({
          ...prev,
          lastAutoBackupTime: timestampIso
        }));
      }
    } catch (e) {
      console.warn("Auto backup runner error:", e);
    }
  }, [state.autoBackupFrequency]);

  // --- Filtering Logic ---
  
  // 1. Get Transactions based on Selected Wallet & Time Period
  const filteredTransactions = useMemo(() => {
      let list = state.transactions;
      if (selectedWalletId) {
          list = list.filter(t => t.walletId === selectedWalletId || t.destinationWalletId === selectedWalletId);
      }
      if (timePeriodFilter !== 'all') {
          const todayStr = formatLocalDateOnly(new Date());
          if (timePeriodFilter === 'today') {
              list = list.filter(t => t.date === todayStr);
          } else if (timePeriodFilter === 'week') {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              const limitStr = formatLocalDateOnly(sevenDaysAgo);
              list = list.filter(t => t.date >= limitStr);
          } else if (timePeriodFilter === 'month') {
              const monthStr = todayStr.substring(0, 7);
              list = list.filter(t => t.date.startsWith(monthStr));
          }
      }
      return list;
  }, [state.transactions, selectedWalletId, timePeriodFilter]);

  // 2. Calculate Totals and Multi-Currency Breakdown via Balance Engine
  // Lifetime transactions ensure accurate cumulative Wallet Balances & Net Worth,
  // while filteredTransactions determine period Inflows (Income) and Outflows (Expenses).
  const totals = useMemo(() => {
    return calculateConsolidatedPosition(
      filteredTransactions,
      state.wallets,
      state.currency.code,
      state.exchangeRates,
      selectedWalletId,
      null,
      state.transactions,
      state.debts,
      state.isTravelMode || state.showSeparateCurrencies,
      state.showSeparateCurrencies
    );
  }, [filteredTransactions, state.transactions, state.wallets, state.currency.code, state.exchangeRates, selectedWalletId, state.debts, state.isTravelMode, state.showSeparateCurrencies]);

  // Synchronize with native home screen widgets (iOS WidgetKit / Android AppWidget)
  useEffect(() => {
    WidgetService.updateWidgetData({
      totalBalance: totals.netWorthInBase,
      availableBalance: totals.availableLiquidityInBase,
      currency: totals.activeCurrencyCode,
      currencySymbol: localizedCurrency.symbol || totals.activeCurrencyCode,
      lastUpdated: new Date().toLocaleTimeString(activeLanguage === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      activeWalletsCount: state.wallets.filter(w => !w.status || w.status === 'active').length,
    });
  }, [totals, state.wallets, localizedCurrency.symbol, activeLanguage]);

  // Specific calculation for current month's Cashflow (Income, Expense, Net) in current base currency
  const monthlyMetrics = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
    let incomeInBase = 0;
    let expenseInBase = 0;

    state.transactions.forEach(t => {
      if (t.isDeleted || !t.date || !t.date.startsWith(currentMonthPrefix)) return;
      if (selectedWalletId && t.walletId !== selectedWalletId && t.destinationWalletId !== selectedWalletId) return;

      const amt = Number(t.amount) || 0;
      const txCurr = t.currency || state.currency.code;
      const amtInBase = convertCurrency(amt, txCurr, state.currency.code, state.exchangeRates);

      if (t.type === 'income') {
        incomeInBase += amtInBase;
      } else if (t.type === 'expense') {
        expenseInBase += amtInBase;
      }
    });

    return {
      monthlyIncome: incomeInBase,
      monthlyExpense: expenseInBase,
      monthlyNet: incomeInBase - expenseInBase
    };
  }, [state.transactions, state.currency.code, state.exchangeRates, selectedWalletId]);

  // Debts owed to me (receivable) and Debts I owe (payable) converted to current base currency
  const debtTotals = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;

    state.debts.forEach(d => {
      if (d.isPaid || d.status === 'settled') return;
      const remainingAmt = Math.max(0, (Number(d.amount) || 0) - (Number(d.paidAmount) || 0));
      const debtCurr = d.currency || state.currency.code;
      const inBase = convertCurrency(remainingAmt, debtCurr, state.currency.code, state.exchangeRates);

      if (d.type === 'to_me') {
        owedToMe += inBase;
      } else {
        iOwe += inBase;
      }
    });

    return {
      debtsOwedToMe: owedToMe,
      debtsIOwe: iOwe
    };
  }, [state.debts, state.currency.code, state.exchangeRates]);

  // Handle Wallet Selection & Currency Sync
  const handleSelectWallet = (id: string | null) => {
      setSelectedWalletId(id);
      if (id) {
          const wallet = state.wallets.find(w => w.id === id);
          if (wallet) {
              const walletCurrency = state.currencies.find(c => c.code === wallet.currencyCode);
              if (walletCurrency) {
                  setState(p => ({ ...p, currency: walletCurrency }));
              }
          }
      }
  };

  const isExportingInAppRef = useRef(false);

  const handlePrint = async (
    type: 'summary' | 'detailed',
    walletId?: string | null,
    currencyFilter?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ) => {
    if (isExportingInAppRef.current) return;
    isExportingInAppRef.current = true;

    const targetWalletId = walletId !== undefined ? walletId : selectedWalletId;
    setPrintType(type);
    setPrintWalletFilter(targetWalletId);
    setPrintCurrencyFilter(currencyFilter || null);
    setPrintStartDate(startDate || null);
    setPrintEndDate(endDate || null);

    try {
      const model = generateFinancialReportSync({
        transactions: state.transactions,
        categories: state.categories,
        wallets: state.wallets,
        userName: state.userName,
        baseCurrencyCode: state.currency.code,
        exchangeRates: state.exchangeRates,
        budgets: state.budgets,
        debts: state.debts,
        goals: state.goals,
        params: {
          type,
          walletId: targetWalletId,
          currencyCode: currencyFilter || null,
          startDate: startDate || null,
          endDate: endDate || null,
          targetCurrencyCode: state.currency.code,
        },
      });

      await printOrShareFinancialReport(model, 'print');
    } catch (e) {
      console.warn('Print handler error:', e);
      // Fallback
      setTimeout(() => {
        window.print();
      }, 500);
    } finally {
      isExportingInAppRef.current = false;
    }
  };

  const handleShare = async (
    type: 'summary' | 'detailed',
    walletId?: string | null,
    currencyFilter?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ) => {
    if (isExportingInAppRef.current) return;
    isExportingInAppRef.current = true;

    const targetWalletId = walletId !== undefined ? walletId : selectedWalletId;
    setPrintType(type);
    setPrintWalletFilter(targetWalletId);
    setPrintCurrencyFilter(currencyFilter || null);
    setPrintStartDate(startDate || null);
    setPrintEndDate(endDate || null);
    
    try {
      const model = generateFinancialReportSync({
        transactions: state.transactions,
        categories: state.categories,
        wallets: state.wallets,
        userName: state.userName,
        baseCurrencyCode: state.currency.code,
        exchangeRates: state.exchangeRates,
        budgets: state.budgets,
        debts: state.debts,
        goals: state.goals,
        params: {
          type,
          walletId: targetWalletId,
          currencyCode: currencyFilter || null,
          startDate: startDate || null,
          endDate: endDate || null,
          targetCurrencyCode: state.currency.code,
        },
      });

      await printOrShareFinancialReport(model, 'share');
    } catch (e) {
      console.warn('Share error:', e);
      setShowReportModal(true);
    } finally {
      isExportingInAppRef.current = false;
    }
  };

  const handleExportExcelReport = async (
    type: 'summary' | 'detailed' = 'detailed',
    currencyFilter?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ) => {
    if (isExportingInAppRef.current) return;
    isExportingInAppRef.current = true;

    try {
      const model = generateFinancialReportSync({
        transactions: state.transactions,
        categories: state.categories,
        wallets: state.wallets,
        userName: state.userName,
        baseCurrencyCode: state.currency.code,
        exchangeRates: state.exchangeRates,
        budgets: state.budgets,
        debts: state.debts,
        goals: state.goals,
        params: {
          type,
          walletId: selectedWalletId,
          currencyCode: currencyFilter || null,
          startDate: startDate || null,
          endDate: endDate || null,
          targetCurrencyCode: state.currency.code,
        },
      });

      await printOrShareFinancialReport(model, 'excel');
    } catch (e) {
      console.warn('Excel export report error:', e);
      const csvContent = buildExecutiveCSVContent({
        transactions: state.transactions,
        categories: state.categories,
        wallets: state.wallets,
        userName: state.userName,
        currency: state.currency,
        exchangeRates: state.exchangeRates,
        type,
        filterWalletId: selectedWalletId,
        filterCurrency: currencyFilter || null,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      const fileName = `Thari_Executive_Report_${type}_${formatLocalDateOnly(new Date())}.csv`;
      exportAndShareExecutiveCSV(csvContent, fileName);
    } finally {
      isExportingInAppRef.current = false;
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowAddForm(true);
  };

  // Soft Delete Handler
  const handleDeleteTransaction = (id: string) => {
    const target = state.transactions.find(t => t.id === id);
    if (!target) return;

    const deletedItem: Transaction = {
      ...target,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState(p => ({
      ...p,
      transactions: p.transactions.filter(t => t.id !== id),
      trashTransactions: [deletedItem, ...(p.trashTransactions || [])],
    }));
  };

  const handleRestoreTransaction = (id: string) => {
    const target = state.trashTransactions?.find(t => t.id === id);
    if (!target) return;

    const restoredItem: Transaction = {
      ...target,
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    };

    setState(p => ({
      ...p,
      trashTransactions: (p.trashTransactions || []).filter(t => t.id !== id),
      transactions: [restoredItem, ...p.transactions],
    }));
  };

  const handlePermanentDelete = (id: string) => {
    const target = state.trashTransactions?.find(t => t.id === id);
    if (target?.receipt?.receiptPath) {
      deleteReceiptFile(target.receipt.receiptPath).catch(() => {});
    }
    setState(p => ({
      ...p,
      trashTransactions: (p.trashTransactions || []).filter(t => t.id !== id),
    }));
  };

  const handleEmptyTrash = () => {
    (state.trashTransactions || []).forEach(t => {
      if (t.receipt?.receiptPath) {
        deleteReceiptFile(t.receipt.receiptPath).catch(() => {});
      }
    });
    setState(p => ({
      ...p,
      trashTransactions: [],
    }));
  };

  // Recurring Rules Handlers
  const handleToggleRecurringActive = (id: string) => {
    setState(p => ({
      ...p,
      recurringRules: (p.recurringRules || []).map(r => r.id === id ? { ...r, isActive: !r.isActive } : r),
    }));
  };

  const handleDeleteRecurringRule = (id: string) => {
    setState(p => ({
      ...p,
      recurringRules: (p.recurringRules || []).filter(r => r.id !== id),
    }));
  };

  const handleAddRecurringRule = (ruleData: Omit<RecurringRule, 'id' | 'createdAt'>) => {
    const newRule: RecurringRule = {
      ...ruleData,
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState(p => ({
      ...p,
      recurringRules: [newRule, ...(p.recurringRules || [])],
    }));
  };

  const handleTriggerRecurringCatchup = () => {
    setState(prev => {
      if (!prev.recurringRules || prev.recurringRules.length === 0) return prev;
      const { newTransactions, updatedRules } = processDueRecurringRules(
        prev.recurringRules,
        prev.transactions
      );
      if (newTransactions.length === 0) return prev;
      return {
        ...prev,
        transactions: [...newTransactions, ...prev.transactions],
        recurringRules: updatedRules,
      };
    });
  };

  const handleRestoreState = (rawRestoredData: any) => {
    if (!rawRestoredData || typeof rawRestoredData !== 'object') return;
    
    // Schema Sanitization and Normalization
    let restoredCurrency = rawRestoredData.currency;
    if (typeof restoredCurrency === 'string') {
      restoredCurrency = DEFAULT_CURRENCIES.find(c => c.code === restoredCurrency) || DEFAULT_CURRENCIES[0];
    } else if (!restoredCurrency || !restoredCurrency.code) {
      restoredCurrency = DEFAULT_CURRENCIES[0];
    }

    const restoredCurrencies = (rawRestoredData.currencies && Array.isArray(rawRestoredData.currencies) && rawRestoredData.currencies.length > 0)
      ? rawRestoredData.currencies
      : DEFAULT_CURRENCIES;

    const restoredCategories = (rawRestoredData.categories && Array.isArray(rawRestoredData.categories) && rawRestoredData.categories.length > 0)
      ? rawRestoredData.categories
      : INITIAL_CATEGORIES;

    const restoredWallets = (rawRestoredData.wallets && Array.isArray(rawRestoredData.wallets) && rawRestoredData.wallets.length > 0)
      ? rawRestoredData.wallets
      : INITIAL_STATE.wallets;

    const restoredExchangeRates = (rawRestoredData.exchangeRates && typeof rawRestoredData.exchangeRates === 'object')
      ? { ...DEFAULT_EXCHANGE_RATES, ...rawRestoredData.exchangeRates }
      : DEFAULT_EXCHANGE_RATES;

    const sanitizedState: AppState = {
      ...INITIAL_STATE,
      ...rawRestoredData,
      currency: restoredCurrency,
      currencies: restoredCurrencies,
      categories: restoredCategories,
      wallets: restoredWallets,
      exchangeRates: restoredExchangeRates,
      transactions: Array.isArray(rawRestoredData.transactions) ? rawRestoredData.transactions : [],
      trashTransactions: Array.isArray(rawRestoredData.trashTransactions) ? rawRestoredData.trashTransactions : [],
      debts: Array.isArray(rawRestoredData.debts) ? rawRestoredData.debts : [],
      budgets: Array.isArray(rawRestoredData.budgets) ? rawRestoredData.budgets : [],
      goals: Array.isArray(rawRestoredData.goals) ? rawRestoredData.goals : [],
      subscriptions: Array.isArray(rawRestoredData.subscriptions) ? rawRestoredData.subscriptions : [],
      recurringRules: Array.isArray(rawRestoredData.recurringRules) ? rawRestoredData.recurringRules : [],
      isLocked: !!rawRestoredData.pin,
    };

    setState(sanitizedState);
    saveSecureStateSync(STORAGE_KEY, sanitizedState);
  };

  const handleApplyRepairedState = (repairedState: AppState) => {
    setState(repairedState);
  };

  const handleSubmitTransaction = (txData: any) => {
    const targetId = editingTransaction?.id || txData.id;
    if (targetId) {
        setState(p => ({
            ...p,
            transactions: p.transactions.map(t => t.id === targetId ? { ...txData, id: t.id, updatedAt: new Date().toISOString() } : t)
        }));
    } else {
        setState(p => ({ 
            ...p, 
            transactions: [{ ...txData, id: 'tx-' + Date.now(), createdAt: new Date().toISOString() }, ...p.transactions] 
        }));
    }
    setShowAddForm(false);
    setEditingTransaction(null);
    setFormDefaultType(undefined);
  };

  // Debt handlers
  const handleUpdateDebt = (id: string, updates: Partial<Debt>) => {
    setState(p => ({
      ...p,
      debts: p.debts.map(d => d.id === id ? { ...d, ...updates } : d)
    }));
  };

  const handlePayDebt = (
    id: string, 
    amount: number, 
    walletId?: string, 
    noteSuffix?: string, 
    customDebtUpdates?: Partial<Debt>,
    paymentDate?: string
  ) => {
    const debt = state.debts.find(d => d.id === id);
    if (!debt || amount <= 0) return;
    
    const targetWallet = walletId ? state.wallets.find(w => w.id === walletId) : undefined;
    const dateToUse = paymentDate || formatLocalDateOnly(new Date());
    const paymentId = 'pay-' + Date.now();
    const transactionId = 'tx-' + Date.now();

    let newTransaction: Transaction | null = null;
    if (walletId && amount > 0) {
        newTransaction = {
            id: transactionId,
            debtId: id,
            debtPaymentId: paymentId,
            isFinancing: true,
            amount: amount,
            type: debt.type === 'to_me' ? 'income' : 'expense',
            categoryId: debt.type === 'to_me' ? '11' : '4',
            walletId: walletId,
            note: debt.type === 'to_me' 
                ? `دفعة مستردة من دين: ${debt.personName}${noteSuffix ? ` (${noteSuffix})` : ''}` 
                : `دفعة مسددة من دين: ${debt.personName}${noteSuffix ? ` (${noteSuffix})` : ''}`,
            date: dateToUse,
            currency: debt.currency,
            frequency: 'once',
            createdAt: new Date().toISOString()
        };
    }

    const newPayment: DebtPayment = {
      id: paymentId,
      debtId: id,
      amount: amount,
      date: dateToUse,
      walletId: walletId,
      walletName: targetWallet?.name,
      note: noteSuffix || (amount >= (debt.amount - (debt.paidAmount || 0)) ? 'سداد كامل' : 'دفعة سداد'),
      createdAt: new Date().toISOString()
    };
    
    setState(p => {
        // Guard against duplicate posting by checking payment id & debtPaymentId
        if (newTransaction && p.transactions.some(t => t.debtPaymentId === paymentId)) {
          return p;
        }
        const updatedDebts = p.debts.map(d => {
            if (d.id === id) {
                const currentPayments = d.payments || [];
                // Prevent duplicate payment entry in debt history
                if (currentPayments.some(pay => pay.id === paymentId)) {
                  return d;
                }
                const updatedPayments = [newPayment, ...currentPayments];
                const newPaidAmount = (d.paidAmount || 0) + amount;
                const originalTotal = d.originalAmount || d.amount || 0;
                const isPaid = newPaidAmount >= (originalTotal * 0.999);
                
                return {
                    ...d,
                    paidAmount: newPaidAmount,
                    isPaid: isPaid,
                    status: isPaid ? ('settled' as const) : ('partial' as const),
                    payments: updatedPayments,
                    ...customDebtUpdates
                };
            }
            return d;
        });
        return {
            ...p,
            transactions: newTransaction ? [newTransaction, ...p.transactions] : p.transactions,
            debts: updatedDebts
        };
    });
  };

  const handleAddDebt = (debtData: Omit<Debt, 'id'>, walletId?: string) => {
    const newDebtId = 'd-' + Date.now();
    const newTransactionId = 'tx-' + Date.now();
    const newDebt: Debt = { 
      ...debtData, 
      id: newDebtId,
      originalAmount: debtData.originalAmount || debtData.amount,
      paidAmount: debtData.paidAmount || 0,
      payments: debtData.payments || []
    };

    let newTransaction: Transaction | null = null;
    if (walletId) {
        newTransaction = {
            id: newTransactionId,
            debtId: newDebtId,
            isFinancing: true,
            amount: debtData.amount,
            foreignAmount: debtData.foreignAmount,
            foreignCurrency: debtData.foreignCurrency,
            exchangeRate: debtData.exchangeRate,
            conversionNote: debtData.conversionNote,
            type: debtData.type === 'to_me' ? 'expense' : 'income',
            categoryId: debtData.type === 'to_me' ? '12' : '11', 
            walletId: walletId,
            note: debtData.type === 'to_me' ? `إقراض مبلغ لـ: ${debtData.personName}` : `استلاف مبلغ من: ${debtData.personName}`,
            date: debtData.createdAt,
            currency: debtData.currency,
            frequency: 'once',
            createdAt: new Date().toISOString()
        };
    }
    setState(p => {
        // Prevent duplicate addition
        if (p.debts.some(d => d.id === newDebtId)) {
          return p;
        }
        return {
          ...p,
          debts: [newDebt, ...p.debts],
          transactions: newTransaction ? [newTransaction, ...p.transactions] : p.transactions
        };
    });
  };

  const handleSettleDebt = (id: string, walletId?: string) => {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;
    const original = debt.originalAmount || debt.amount || 0;
    const remaining = Math.max(0, original - (debt.paidAmount || 0));
    handlePayDebt(id, remaining, walletId, "سداد كامل");
  };

  if (isLoadingSplash) {
    return (
      <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] z-[9999] flex flex-col items-center justify-center p-6 select-none">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#D9B978]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#759BC8]/10 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="p-3 rounded-3xl bg-white/[0.03] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <Logo size={80} />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F1EA]">ثري <span className="text-[#D9B978] font-light">— THARI</span></h1>
            <p className="text-xs text-slate-400 font-medium">نظامك المالي الهادئ للثروة والمحافظ</p>
          </div>
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-6">
            <div className="w-full h-full bg-[#D9B978] rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (showPrivacyPolicy) {
    return <AboutAndPrivacy onBack={() => setShowPrivacyPolicy(false)} language={state.language || 'ar'} initialTab="privacy" />;
  }

  if (!isHydratedRef.current && !state.hasAcceptedTerms) {
    return (
      <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] z-[9999] flex items-center justify-center">
        <div className="text-center">
          <Logo size={58} />
          <div className="mt-4 text-xs text-slate-400">جاري إعداد تطبيق ثري…</div>
        </div>
      </div>
    );
  }

  if (!state.hasAcceptedTerms) return <WelcomeScreen onAccept={() => setState(p => ({ ...p, hasAcceptedTerms: true }))} onShowPrivacy={() => setShowPrivacyPolicy(true)} />;
  if (state.isLocked && (!!state.pin || state.isBiometricEnabled === true)) {
    return (
      <LockScreen 
        savedPin={state.pin || ''} 
        pinSalt={state.pinSalt}
        isBiometricEnabled={state.isBiometricEnabled === true} 
        onUnlock={() => {
          justUnlockedRef.current = Date.now() + 5000;
          try { sessionStorage.removeItem('thari_bg_ts'); } catch (e) {}
          setState(p => ({ ...p, isLocked: false }));
        }} 
        onRehashPin={(newPinHash, newSalt) => setState(p => ({ ...p, pin: newPinHash, pinSalt: newSalt }))}
      />
    );
  }

  return (
    <div 
      className="w-full flex flex-col relative print:block print:bg-white print:max-w-none print:h-auto overflow-hidden text-right bg-slate-950/30"
      style={{
        height: 'var(--vh, var(--app-height))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      } as React.CSSProperties}
    >
      
      {/* Hidden Print Report */}
      <FinancialReport 
        transactions={state.transactions} 
        categories={state.categories} 
        currency={state.currency} 
        userName={state.userName} 
        wallets={state.wallets} 
        type={printType} 
        exchangeRates={state.exchangeRates}
        filterWalletId={printWalletFilter} 
        filterCurrency={printCurrencyFilter}
        startDate={printStartDate}
        endDate={printEndDate}
      />
      
      <div className="flex flex-col flex-1 print:hidden relative z-20 overflow-hidden">
        <header className="sticky top-0 shrink-0 px-3 sm:px-4 md:px-6 pb-2.5 sm:pb-3 md:py-4 glass-effect border-b border-white/5 z-30 backdrop-blur-xl bg-[#0A0D10]/90" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
          <div className="flex justify-between items-center max-w-6xl mx-auto w-full gap-2 min-w-0">
            {/* App Branding & Quick Add Long Press */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <div
                className="cursor-pointer active:scale-95 transition-transform"
                title="اضغط مطولاً للإضافة السريعة"
                onContextMenu={(e) => {
                  e.preventDefault();
                  NativeHaptics.impact('HEAVY').catch(() => {});
                  setShowAddForm(true);
                }}
                onTouchStart={(e) => {
                  const target = e.currentTarget;
                  const timer = setTimeout(() => {
                    NativeHaptics.impact('HEAVY').catch(() => {});
                    setShowAddForm(true);
                  }, 450);
                  const clear = () => {
                    clearTimeout(timer);
                    target.removeEventListener('touchend', clear);
                    target.removeEventListener('touchmove', clear);
                  };
                  target.addEventListener('touchend', clear, { once: true });
                  target.addEventListener('touchmove', clear, { once: true });
                }}
              >
                <Logo size={24} showText />
              </div>
              {/* Offline-First Sovereignty Badge - 100% Local */}
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors bg-[#D9B978]/15 border-[#D9B978]/40 text-[#D9B978]"
                title="تطبيق ثري يعمل بالكامل محلياً دون الحاجة لأي إنترنت (0 نت)"
              >
                <WifiOff size={11} />
                <span>أوفلاين 100% (بدون نت)</span>
              </div>
            </div>

            {/* Header Actions & Selectors */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Wallet Quick Selector Button */}
              <button
                type="button"
                onClick={() => setShowWalletSelector(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-[#141B24] hover:bg-[#1C2633] border border-[#8EB9A7]/40 hover:border-[#8EB9A7] text-white transition-all text-xs shadow-sm active:scale-95 group ring-1 ring-[#8EB9A7]/20 max-w-[110px] sm:max-w-[160px]"
                title="المحافظ والحسابات - انقر للاختيار أو دمج المحافظ"
              >
                <div className="w-5 h-5 rounded-lg bg-[#8EB9A7] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                  <WalletIcon size={12} />
                </div>
                <div className="flex items-baseline gap-1 min-w-0 truncate">
                  <span className="font-bold text-white tracking-wide truncate text-[11px] sm:text-xs">
                    {selectedWalletId ? state.wallets.find(w => w.id === selectedWalletId)?.name || 'Wallet' : t.allWallets}
                  </span>
                </div>
                <ChevronDown size={13} className="text-[#8EB9A7] group-hover:translate-y-0.5 transition-transform shrink-0" />
              </button>

              {/* Currency Badge / Interactive Quick Selector */}
              {(() => {
                const currentCurrLoc = getLocalizedCurrency(state.currency?.code || 'SAR', state.currency?.name, state.currency?.symbol, state.language || 'ar');
                return (
                  <button
                    type="button"
                    onClick={() => setShowCurrencySelector(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#141B24] hover:bg-[#1C2633] border border-[#D9B978]/40 hover:border-[#D9B978] text-white transition-all text-xs shadow-sm active:scale-95 group ring-1 ring-[#D9B978]/20 shrink-0"
                    title={`العملة الأساسية: ${currentCurrLoc.name} (${state.currency.code})`}
                  >
                    <div className="w-5 h-5 rounded-lg bg-[#D9B978] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                      {currentCurrLoc.symbol}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-white tracking-wide text-[11px] sm:text-xs">{state.currency.code}</span>
                      <span className="text-[10px] text-slate-400 font-normal hidden lg:inline">({currentCurrLoc.name})</span>
                    </div>
                    <ChevronDown size={13} className="text-[#D9B978] group-hover:translate-y-0.5 transition-transform shrink-0" />
                  </button>
                );
              })()}

              {/* Tools Hub Button */}
              <button
                type="button"
                onClick={() => setShowToolsHub(true)}
                className="relative p-2 rounded-xl border border-white/10 text-slate-400 bg-white/5 hover:bg-white/10 hover:text-[#D9B978] transition-all shrink-0 active:scale-95"
                title="مركز الأدوات والتقارير"
              >
                <Sparkles size={15} />
                {((state.recurringRules?.length || 0) > 0 || (state.trashTransactions?.length || 0) > 0) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#D9B978] rounded-full ring-2 ring-[#0A0D10]" />
                )}
              </button>

              {/* Settings Shortcut */}
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl border transition-all shrink-0 active:scale-95 backdrop-blur-md ${
                  activeTab === 'settings' 
                    ? 'bg-[#D9B978] text-slate-950 border-[#D9B978] shadow-[0_0_20px_rgba(217,185,120,0.4)]' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-[#D9B978] hover:border-[#D9B978]/50'
                }`} 
                title="الإعدادات"
              >
                <SettingsIcon size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar smooth-scroll overflow-x-hidden px-3 sm:px-5 md:px-8 relative pb-[calc(7rem+env(safe-area-inset-bottom,16px))] w-full">
          <div className="py-4 sm:py-6 max-w-7xl mx-auto w-full">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="w-full will-change-transform"
              >
                {activeTab === 'dashboard' && (
                  <ElegantDashboard
                    userName={state.userName}
                    netWorth={totals.netWorthInBase}
                    availableBalance={totals.availableLiquidityInBase}
                    debtsOwedToMe={debtTotals.debtsOwedToMe}
                    debtsIOwe={debtTotals.debtsIOwe}
                    monthlyIncome={monthlyMetrics.monthlyIncome}
                    monthlyExpense={monthlyMetrics.monthlyExpense}
                    monthlyNet={monthlyMetrics.monthlyNet}
                    currency={localizedCurrency}
                    currencies={localizedCurrencies}
                    wallets={state.wallets}
                    transactions={state.transactions}
                    categories={state.categories}
                    debts={state.debts}
                    exchangeRates={state.exchangeRates}
                    selectedWalletId={selectedWalletId}
                    onSelectWallet={handleSelectWallet}
                    onChangeCurrency={(curr) => setState(p => ({ ...p, currency: curr }))}
                    onOpenNewTransaction={(type) => {
                      setEditingTransaction(null);
                      setFormDefaultType(type);
                      setShowAddForm(true);
                    }}
                    onOpenDebts={() => setActiveTab('debts')}
                    onOpenAllTransactions={() => setActiveTab('transactions')}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    language={activeLanguage}
                  />
                )}
                
                {activeTab === 'goals' && <GoalTracker goals={state.goals} wallets={state.wallets} transactions={state.transactions} onAddGoal={(g) => setState(p => ({ ...p, goals: [...p.goals, { ...g, id: 'g-'+Date.now() }] }))} onUpdateGoalAmount={(id, amt) => setState(p => ({ ...p, goals: p.goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amt } : g) }))} currencySymbol={localizedCurrency.symbol} language={activeLanguage} />}
                {activeTab === 'budgets' && <BudgetManager budgets={state.budgets} categories={state.categories} transactions={filteredTransactions} onSetBudget={(catId, amount) => setState(p => ({ ...p, budgets: [...p.budgets.filter(b => b.categoryId !== catId), { categoryId: catId, amount }] }))} currencySymbol={localizedCurrency.symbol} currencyCode={state.currency.code} exchangeRates={state.exchangeRates} language={activeLanguage} />}
                {activeTab === 'debts' && <DebtManager debts={state.debts} wallets={state.wallets} onAddDebt={handleAddDebt} onUpdateDebt={handleUpdateDebt} onSettleDebt={handleSettleDebt} onPayDebt={handlePayDebt} onDeleteDebt={(id) => setState(p => ({ ...p, debts: p.debts.filter(d => d.id !== id) }))} currencySymbol={localizedCurrency.symbol} currencyCode={state.currency.code} language={activeLanguage} />}
                {activeTab === 'subscriptions' && <SubscriptionManager subscriptions={state.subscriptions} categories={state.categories} onAdd={(sub) => setState(p => ({ ...p, subscriptions: [{...sub, id: 's-'+Date.now()}, ...p.subscriptions] }))} onRemove={(id) => setState(p => ({ ...p, subscriptions: p.subscriptions.filter(s => s.id !== id) }))} currencySymbol={localizedCurrency.symbol} currencyCode={state.currency.code} language={activeLanguage} />}
                {activeTab === 'zakat' && (
                  <ZakatCalculator 
                    totalBalance={totals.netWorthInBase} 
                    currencySymbol={localizedCurrency.symbol} 
                    debts={state.debts}
                    wallets={state.wallets}
                    transactions={state.transactions}
                    currencies={localizedCurrencies}
                    currentCurrency={localizedCurrency}
                    exchangeRates={state.exchangeRates}
                    zakatProfiles={state.zakatProfiles}
                    zakatPayments={state.zakatPayments}
                    onSaveProfiles={(profiles) => setState(p => ({ ...p, zakatProfiles: profiles }))}
                    onSavePayments={(payments) => setState(p => ({ ...p, zakatPayments: payments }))}
                    language={activeLanguage}
                  />
                )}
                
                {activeTab === 'transactions' && (
                    <div className="space-y-8">
                        <Analytics 
                            transactions={state.transactions} 
                            categories={state.categories} 
                            wallets={state.wallets}
                            currencySymbol={localizedCurrency.symbol} 
                            onPrint={handlePrint} 
                            currentCurrencyCode={state.currency.code} 
                            exchangeRates={state.exchangeRates} 
                            initialWalletId={selectedWalletId} 
                            onFilterChange={handleSelectWallet} 
                            userName={state.userName}
                            currencies={localizedCurrencies}
                        />
                        
                        <TransactionList 
                            transactions={filteredTransactions} 
                            categories={state.categories} 
                            wallets={state.wallets} 
                            onDelete={handleDeleteTransaction} 
                            onEdit={handleEditTransaction} 
                            currencySymbol={localizedCurrency.symbol}
                            currentCurrencyCode={state.currency.code}
                            currencies={localizedCurrencies}
                            exchangeRates={state.exchangeRates}
                            showFilters 
                            language={activeLanguage}
                        />
                    </div>
                )}
                
                {activeTab === 'settings' && (
                    <Settings 
                        {...state} 
                        currency={localizedCurrency}
                        currencies={localizedCurrencies}
                        appState={state} 
                        onUpdateSettings={(updates) => setState(p => ({...p, ...updates}))} 
                        onAddCurrency={(c) => setState(p => ({...p, currencies: [...p.currencies, c]}))} 
                        onRemoveCurrency={(code) => setState(p => ({...p, currencies: p.currencies.filter(c => c.code !== code)}))} 
                        onAddWallet={(w) => setState(p => ({ ...p, wallets: [...p.wallets, { ...w, id: 'w-' + Date.now() }] }))} 
                        onUpdateWallet={(id, updates) => setState(p => ({ ...p, wallets: p.wallets.map(w => w.id === id ? { ...w, ...updates } : w) }))}
                        onRemoveWallet={(id) => setState(p => ({ ...p, wallets: p.wallets.filter(w => w.id !== id) }))} 
                        onAddCategory={(c) => setState(p => ({ ...p, categories: [...p.categories, { ...c, id: 'c-' + Date.now() }] }))}
                        onUpdateCategory={(id, updates) => setState(p => ({ ...p, categories: p.categories.map(c => c.id === id ? { ...c, ...updates } : c) }))}
                        onRemoveCategory={(id) => setState(p => ({ ...p, categories: p.categories.filter(c => c.id !== id) }))}
                        onRestore={handleRestoreState} 
                        onClearData={() => setState(p => ({...p, transactions: [], debts: [], budgets: [], subscriptions: [], chatHistory: [], goals: []}))} 
                        onShowPrivacyPolicy={() => setShowPrivacyPolicy(true)} 
                        onPrint={handlePrint}
                        onShare={handleShare}
                        onExportExcel={handleExportExcelReport}
                        installPrompt={installPrompt}
                        isUpdateAvailable={isUpdateAvailable}
                        swRegistration={swRegistration}
                    />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 pt-16 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] px-4 md:px-0 flex justify-center pointer-events-none z-50 bg-gradient-to-t from-[#0A0D10] via-[#0A0D10]/80 to-transparent">
            <nav className="pointer-events-auto w-full md:max-w-xl bg-[#11161C]/95 backdrop-blur-2xl border border-white/10 flex items-center justify-between px-2 py-2 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <NavButton icon={<LayoutDashboard />} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavButton icon={<Scale />} label={t.zakat} active={activeTab === 'zakat'} onClick={() => setActiveTab('zakat')} />
                
                <motion.button 
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { 
                    NativeHaptics.impact('MEDIUM').catch(() => {});
                    setEditingTransaction(null); 
                    setShowAddForm(true); 
                  }}
                  className="w-14 h-14 bg-[#D9B978] hover:bg-[#D9B978]/90 text-slate-950 rounded-[1.5rem] shadow-[0_10px_25px_rgba(217,185,120,0.35)] flex items-center justify-center z-50 border-[4px] border-[#11161C] mx-1 shrink-0 active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={3.5} />
                </motion.button>

                <NavButton icon={<HandCoins />} label={t.debts} active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} />
                <NavButton icon={<SettingsIcon />} label={t.more} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </nav>
        </div>

        {/* Floating Quick Action Buttons */}
        {activeTab === 'dashboard' && (
          <div className="fixed left-3 sm:left-4 bottom-[calc(6.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-32 md:bottom-36 z-40 flex flex-col gap-2.5 pointer-events-none no-print">
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('goals')} 
              className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 bg-[#11161C]/95 backdrop-blur-3xl border border-white/10 hover:border-[#D9B978]/50 rounded-full flex flex-col items-center justify-center text-[#D9B978] shadow-[0_10px_25px_rgba(0,0,0,0.5)] group relative"
              title="الأهداف المالية"
            >
              <Coins size={18} className="group-hover:scale-110 transition-transform" />
              <span className="absolute right-12 sm:right-14 bg-[#11161C]/95 backdrop-blur-xl border border-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden group-hover:block">الأهداف</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('budgets')} 
              className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 bg-[#11161C]/95 backdrop-blur-3xl border border-white/10 hover:border-[#759BC8]/50 rounded-full flex flex-col items-center justify-center text-[#759BC8] shadow-[0_10px_25px_rgba(0,0,0,0.5)] group relative"
              title="إدارة الميزانية"
            >
              <LayoutDashboard size={18} className="group-hover:scale-110 transition-transform" />
              <span className="absolute right-12 sm:right-14 bg-[#11161C]/95 backdrop-blur-xl border border-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden group-hover:block">الميزانية</span>
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {showToolsHub && (
            <ToolsHubModal
              isOpen={showToolsHub}
              onClose={() => setShowToolsHub(false)}
              recurringRulesCount={state.recurringRules?.length || 0}
              trashCount={state.trashTransactions?.length || 0}
              onOpenReports={() => setShowReportModal(true)}
              onOpenRecurring={() => setShowRecurringModal(true)}
              onOpenTrash={() => setShowTrashModal(true)}
              onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
              language={state.language || 'ar'}
            />
          )}
          {showTrashModal && (
            <TrashModal
              isOpen={showTrashModal}
              onClose={() => setShowTrashModal(false)}
              trashTransactions={state.trashTransactions || []}
              categories={state.categories}
              wallets={state.wallets}
              currencies={state.currencies}
              onRestore={handleRestoreTransaction}
              onPermanentDelete={handlePermanentDelete}
              onEmptyTrash={handleEmptyTrash}
              language={state.language || 'ar'}
            />
          )}
          {showReportModal && (
            <ReportModal
              isOpen={showReportModal}
              onClose={() => setShowReportModal(false)}
              transactions={state.transactions}
              categories={state.categories}
              wallets={state.wallets}
              currencies={state.currencies}
              currentCurrency={state.currency}
              userName={state.userName}
              exchangeRates={state.exchangeRates}
              budgets={state.budgets}
              debts={state.debts}
              goals={state.goals}
              initialType={printType}
              initialWalletId={selectedWalletId}
              initialCurrencyCode={printCurrencyFilter}
              onTriggerPrint={handlePrint}
            />
          )}
          {showRecurringModal && (
            <RecurringManagerModal
              isOpen={showRecurringModal}
              onClose={() => setShowRecurringModal(false)}
              rules={state.recurringRules || []}
              wallets={state.wallets}
              categories={state.categories}
              currencies={state.currencies}
              onToggleActive={handleToggleRecurringActive}
              onDeleteRule={handleDeleteRecurringRule}
              onAddRule={handleAddRecurringRule}
              onTriggerCatchup={handleTriggerRecurringCatchup}
              language={state.language || 'ar'}
            />
          )}
          {showDiagnosticsModal && (
            <SystemDiagnosticsModal
              isOpen={showDiagnosticsModal}
              onClose={() => setShowDiagnosticsModal(false)}
              state={state}
              onApplyRepairedState={handleApplyRepairedState}
              language={state.language || 'ar'}
            />
          )}
          {showAddForm && (
              <TransactionForm 
                categories={state.categories} 
                wallets={state.wallets} 
                transactions={state.transactions}
                debts={state.debts}
                onSubmit={handleSubmitTransaction} 
                onDelete={handleDeleteTransaction}
                onAddDebt={handleAddDebt}
                onPayDebt={handlePayDebt}
                onClose={() => { setShowAddForm(false); setEditingTransaction(null); setFormDefaultType(undefined); }} 
                initialData={editingTransaction} 
                defaultType={formDefaultType} 
                exchangeRates={state.exchangeRates} 
                isTravelMode={state.isTravelMode || state.showSeparateCurrencies}
                baseCurrency={state.currency}
                language={state.language || 'ar'}
                t={t}
              />
          )}
          {showPrivacyPolicy && <AboutAndPrivacy onBack={() => setShowPrivacyPolicy(false)} language={state.language || 'ar'} initialTab="privacy" />}
          {showCurrencySelector && (
            <CurrencySelectorModal
              isOpen={showCurrencySelector}
              onClose={() => setShowCurrencySelector(false)}
              currencies={state.currencies}
              selectedCurrency={state.currency}
              onSelectCurrency={(curr) => setState(p => ({ ...p, currency: curr }))}
              exchangeRates={state.exchangeRates}
              onOpenSettings={() => setActiveTab('settings')}
              language={state.language || 'ar'}
              t={t}
            />
          )}
          {showWalletSelector && (
            <WalletSelectorModal
              isOpen={showWalletSelector}
              onClose={() => setShowWalletSelector(false)}
              wallets={state.wallets}
              selectedWalletId={selectedWalletId}
              onSelectWallet={setSelectedWalletId}
              onOpenSettingsWallets={() => setActiveTab('settings')}
              language={state.language || 'ar'}
              t={t}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <motion.button 
    whileTap={{ scale: 0.92 }}
    onClick={() => {
      NativeHaptics.selection().catch(() => {});
      onClick();
    }} 
    className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 min-w-[60px] group ${active ? 'text-[#D9B978]' : 'text-slate-500'}`}
  >
    <div className={`p-2 rounded-xl transition-all duration-300 relative ${active ? 'bg-[#D9B978]/10 text-[#D9B978]' : 'group-hover:bg-white/5'}`}>
        {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.2 : 1.8 })}
        {active && (
          <motion.div 
            layoutId="activeTabGlow" 
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#D9B978] rounded-full shadow-[0_0_8px_rgba(217,185,120,0.8)]" 
          />
        )}
    </div>
    <span className={`text-[10px] font-bold transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </motion.button>
);

export default App;
