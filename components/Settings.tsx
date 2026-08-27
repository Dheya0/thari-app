import React, { useState, useRef } from 'react';
import { 
  Trash2, User, Wallet as WalletIcon, Lock, Upload, Edit2, Plus, Tag, Coins, X, Check, Printer, FileDown, ChevronDown, AlertCircle, AlertTriangle, FileSpreadsheet, Code, ChevronLeft, Palette, Type,
  ChevronRight, TrendingUp, ShieldCheck, ShieldAlert, Key, Unlock, Smartphone, RefreshCw, Plane, Sparkles, FileText, Bell, Star, Fingerprint, MessageSquare, Heart, Send, HelpCircle, CheckCircle2,
  Mail, HardDrive, Shield, Activity, Clock, Laptop, ScanFace, FileCheck, Share2
} from 'lucide-react';
import { Currency, Wallet, Category, Transaction } from '../types';
import { getTranslation, getLocalizedCurrency } from '../utils/translations';
import { encryptData, decryptData } from '../services/encryptionService';
import { authenticateBiometrics, checkBiometricAvailable, isNativeCapacitorEnvironment, isStandalonePwaMode } from '../services/biometricService';
import { getIcon, DEFAULT_EXCHANGE_RATES } from '../constants';
import { buildExecutiveCSVContent, exportAndShareExecutiveCSV } from '../utils/exportHelper';
import { exportAndShareNativeFile } from '../services/reports/reportExportService';
import { ReportModal } from './reports/ReportModal';

const COLORS = ['#D9B978', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#64748b'];
const ICONS = ['Utensils', 'Car', 'Home', 'Receipt', 'Film', 'HeartPulse', 'GraduationCap', 'Briefcase', 'Wallet', 'CreditCard', 'ShoppingBag', 'Gift', 'PiggyBank', 'Coffee', 'Zap', 'Bus', 'Plane', 'Smartphone', 'ShieldCheck'];

const Modal = ({ title, children, onClose }: { title: string, children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-[#0A0D10]/80 backdrop-blur-md z-[400] flex items-center justify-center p-3 sm:p-4 animate-fade no-print overflow-hidden">
        <div className="bg-[#11161C] w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/10 animate-slide-up flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0 pb-3 border-b border-white/5">
                <h3 className="text-lg sm:text-xl font-black text-[#F4F1EA] tracking-tight">{title}</h3>
                <button onClick={onClose} className="p-2.5 bg-[#0A0D10] hover:bg-[#11161C] rounded-2xl text-slate-400 hover:text-white active:scale-90 transition-all"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0 px-1">
                {children}
            </div>
        </div>
    </div>
);

const InputField = ({ label, value, onChange, placeholder, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</label>
        <input 
            type="text" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder} 
            className="w-full p-4 rounded-2xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-bold outline-none focus:border-[#D9B978] transition-all shadow-inner text-start"
            {...props}
        />
    </div>
);

const ActionButton = ({ label, onClick, variant = 'primary' }: any) => (
    <button 
      onClick={onClick} 
      className={`w-full py-4 font-black rounded-2xl text-base shadow-xl active:scale-95 transition-all mt-4 ${
        variant === 'primary' ? 'bg-[#D9B978] text-[#0A0D10] shadow-[#D9B978]/10 hover:bg-[#c9a764]' : 'bg-[#0A0D10] text-[#F4F1EA] border border-white/10'
      }`}
    >
        {label}
    </button>
);

const ColorPicker = ({ selected, onSelect, t }: { selected: string, onSelect: (c: string) => void, t: any }) => (
    <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2"><Palette size={14} /> {t.colorHighlight}</label>
        <div className="flex gap-3 overflow-x-auto no-scrollbar p-1">
            {COLORS.map(color => (
                <button key={color} onClick={() => onSelect(color)} className={`w-10 h-10 rounded-full border-4 transition-all shrink-0 ${selected === color ? 'border-white scale-125 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
        </div>
    </div>
);

const ToastNotification = ({ toast }: { toast: { message: string, type: 'success' | 'error' } | null }) => {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 start-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[500] flex items-center gap-3 animate-fade ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
      {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
      <span className="font-bold text-sm">{toast.message}</span>
    </div>
  );
};

const ConfirmDialog = ({ confirmData, onCancel, t }: { confirmData: { message: string, action: () => void, title?: string, type?: 'danger' | 'info' } | null, onCancel: () => void, t: any }) => {
  if (!confirmData) return null;
  const isDanger = confirmData.type === 'danger';
  
  return (
    <div className="fixed inset-0 bg-[#0A0D10]/80 backdrop-blur-sm z-[500] flex items-center justify-center p-4 animate-fade">
      <div className="bg-[#11161C] p-8 rounded-[2.5rem] max-w-sm w-full border border-white/10 shadow-2xl space-y-6 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isDanger ? 'bg-rose-500/10 text-rose-500' : 'bg-[#D9B978]/10 text-[#D9B978]'}`}>
           {isDanger ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
        </div>
        <div className="space-y-2">
            {confirmData.title && <h3 className="text-[#F4F1EA] font-black text-lg">{confirmData.title}</h3>}
            <p className="text-slate-400 font-bold text-sm leading-relaxed">{confirmData.message}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
           <button onClick={onCancel} className="py-4 bg-[#0A0D10] text-slate-400 rounded-2xl font-black text-sm hover:bg-[#11161C] transition-colors">{t.cancel}</button>
           <button onClick={() => { confirmData.action(); onCancel(); }} className={`py-4 rounded-2xl font-black text-sm shadow-lg transition-colors ${isDanger ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-400' : 'bg-[#D9B978] text-[#0A0D10] shadow-[#D9B978]/20 hover:bg-[#c9a764]'}`}>{t.confirm || 'تأكيد'}</button>
        </div>
      </div>
    </div>
  );
};

const AccordionItem = ({ 
  title, 
  icon: Icon, 
  isOpen, 
  onToggle, 
  children 
}: { 
  id?: string;
  title: string; 
  icon: any; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-[#11161C] rounded-[2rem] border border-white/10 overflow-hidden transition-all duration-300 shadow-xl">
      <button 
        onClick={onToggle}
        className="w-full p-5 flex justify-between items-center text-[#F4F1EA] hover:bg-white/[0.02] transition-colors text-start"
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <span className="font-black text-sm md:text-base">{title}</span>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-6 border-t border-white/5 bg-[#0A0D10]/50 space-y-5 animate-slide-down text-start">
          {children}
        </div>
      )}
    </div>
  );
};

interface SettingsProps {
  userName: string;
  pin: string | null;
  currency: Currency;
  currencies: Currency[];
  wallets: Wallet[];
  categories: Category[];
  apiKey?: string;
  exchangeRates?: Record<string, number>;
  appState: any; 
  onUpdateSettings: (updates: any) => void;
  onAddCurrency: (curr: Currency) => void;
  onRemoveCurrency: (code: string) => void;
  onAddWallet: (w: Omit<Wallet, 'id'>) => void;
  onUpdateWallet: (id: string, w: Partial<Wallet>) => void;
  onRemoveWallet: (id: string) => void;
  onAddCategory: (c: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, c: Partial<Category>) => void;
  onRemoveCategory: (id: string) => void;
  onRestore: (data: any) => void;
  onClearData: () => void;
  onShowPrivacyPolicy: () => void;
  onPrint?: (...args: any[]) => void;
  onShare?: (...args: any[]) => void;
  onExportExcel?: (...args: any[]) => void;
  installPrompt?: any;
  isUpdateAvailable?: boolean;
  swRegistration?: ServiceWorkerRegistration | null;
}

export default function Settings({ 
  userName = '', pin = '', currency, currencies, wallets, categories, apiKey = '', exchangeRates = {}, appState = {}, onUpdateSettings, 
  onAddCurrency, onRemoveCurrency, onAddWallet, onUpdateWallet, onRemoveWallet,
  onAddCategory, onUpdateCategory, onRemoveCategory,
  onRestore, onClearData, onShowPrivacyPolicy, onPrint, onShare, onExportExcel,
  installPrompt = null, isUpdateAvailable = false, swRegistration = null
}: SettingsProps) {
  const safeCurrencies = currencies || [];
  const safeWallets = wallets || [];
  const safeCategories = categories || [];

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isNativeApp = isNativeCapacitorEnvironment();
  const isStandalone = isStandalonePwaMode();

  const t = getTranslation(appState?.language || 'ar');

  const [localUserName, setLocalUserName] = useState(userName || '');
  const [localUserEmail, setLocalUserEmail] = useState(appState?.userEmail || '');
  const [localPin, setLocalPin] = useState(pin || '');
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [localAutoLockTime, setLocalAutoLockTime] = useState<'instant' | '1min' | '5min' | 'never'>(appState?.autoLockTime || 'instant');
  const [localRequireBiometricOnOpen, setLocalRequireBiometricOnOpen] = useState<boolean>(appState?.requireBiometricOnOpen !== false);
  const [localAutoBackupFreq, setLocalAutoBackupFreq] = useState<'on_open' | 'daily' | 'weekly' | 'disabled'>(appState?.autoBackupFrequency || 'daily');
  const [localLanguage, setLocalLanguage] = useState<'ar' | 'en'>(appState?.language || 'ar');
  const [showAutoBackupHistoryModal, setShowAutoBackupHistoryModal] = useState(false);
  const [autoBackupHistory, setAutoBackupHistory] = useState<any[]>([]);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(!!pin);
  const [isTravelMode, setIsTravelMode] = useState(Boolean(appState?.isTravelMode || appState?.showSeparateCurrencies));
  const [isExporting, setIsExporting] = useState(false);
  const [activeSection, setActiveSection] = useState<'main' | 'wallets' | 'categories' | 'currencies'>('main');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  
  const [showEmailBackupModal, setShowEmailBackupModal] = useState(false);
  const [emailBackupPassword, setEmailBackupPassword] = useState('');
  const [emailBackupType, setEmailBackupType] = useState<'encrypted' | 'plain'>('encrypted');

  const [isBioHardwareAvailable, setIsBioHardwareAvailable] = useState(false);
  const [biometryTypeTitle, setBiometryTypeTitle] = useState('Face ID / Touch ID');
  const [bioTestStatus, setBioTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [bioTestFeedback, setBioTestFeedback] = useState('');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState<{
      type: 'summary' | 'detailed';
      currencyFilter: string | null;
      action: 'print' | 'share' | 'excel';
  }>({ type: 'detailed', currencyFilter: null, action: 'print' });

  const [editingRateCode, setEditingRateCode] = useState<string | null>(null);
  const [rateInputValue, setRateInputValue] = useState('');

  const [showDataModal, setShowDataModal] = useState(false);
  const [dataModalContent, setDataModalContent] = useState<{title: string, content: string}>({title: '', content: ''});

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [pendingRestoreContent, setPendingRestoreContent] = useState<string | null>(null);

  const [isBiometricEnabled, setIsBiometricEnabled] = useState(appState?.isBiometricEnabled === true);
  const [debtAlertsEnabled, setDebtAlertsEnabled] = useState(true);
  const [dailyLoggerEnabled, setDailyLoggerEnabled] = useState(true);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);

  React.useEffect(() => {
    const nextValue = Boolean(appState?.isTravelMode || appState?.showSeparateCurrencies);
    setIsTravelMode(nextValue);
  }, [appState?.isTravelMode, appState?.showSeparateCurrencies]);

  // Wallet Form State
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [walletData, setWalletData] = useState({ name: '', currencyCode: currency?.code || 'SAR', color: COLORS[0], type: 'cash' as Wallet['type'] });

  // Category Form State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryData, setCategoryData] = useState({ name: '', icon: ICONS[0], color: COLORS[0], type: 'expense' as 'income' | 'expense' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateClick = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to install choice: ${outcome}`);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    checkBiometricAvailable().then((res) => {
      if (isMounted) {
        setIsBioHardwareAvailable(res.isAvailable);
        if (res.biometryType) {
          setBiometryTypeTitle(res.biometryType);
        }
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleDirectStoreRating = () => {
    const isIOSPlatform = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    showToast(t.rateSuccessToast);
    if (isIOSPlatform) {
      window.open('https://apps.apple.com/app/id64762459927?action=write-review', '_blank');
    } else {
      window.open('https://play.google.com/store/apps/details?id=com.thari.finance.app', '_blank');
    }
  };

  const handleSupportClick = () => {
    window.location.href = 'mailto:thari-app@inbox.ru?subject=' + encodeURIComponent(appState?.language === 'en' ? 'THARI App Inquiry - User Support' : 'استفسار تطبيق ثري - دعم المستخدمين');
  };

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [confirmData, setConfirmData] = useState<{message: string, action: () => void, title?: string, type?: 'danger' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerConfirm = (message: string, action: () => void, title?: string, type: 'danger' | 'info' = 'info') => {
    setConfirmData({ message, action, title, type });
  };

  const handleSaveProfile = () => {
    onUpdateSettings({ 
      userName: localUserName, 
      userEmail: localUserEmail,
      apiKey: localApiKey,
      language: localLanguage 
    });
    showToast(t.saveProfileSuccess);
  };

  const handleSaveSecurity = (shouldLock = false) => {
    if (isSecurityEnabled && localPin && localPin.length > 0 && localPin.length < 4) {
      showToast(t.enterPinError, 'error');
      return;
    }

    const effectivePin = isSecurityEnabled && localPin && localPin.length === 4 ? localPin : (isSecurityEnabled ? pin : null);

    onUpdateSettings({
      pin: effectivePin,
      isLocked: shouldLock,
      autoLockTime: localAutoLockTime,
      isBiometricEnabled: isBiometricEnabled,
      requireBiometricOnOpen: localRequireBiometricOnOpen
    });

    if (shouldLock) {
      showToast(t.appLockedSuccess);
    } else {
      showToast(t.securitySettingsUpdated);
    }
  };

  const handleRunBiometricTest = async () => {
    setBioTestStatus('testing');
    try {
      const res = await authenticateBiometrics();
      if (res.success) {
        setBioTestStatus('success');
        setBioTestFeedback(t.bioTestSuccess);
      } else {
        setBioTestStatus('failed');
        setBioTestFeedback(res.error || t.bioTestFail);
      }
    } catch (e: any) {
      setBioTestStatus('failed');
      setBioTestFeedback(e.message || t.bioTestError);
    }
  };

  const handleTestNotification = async () => {
    try {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(t.testNotificationTitle, {
            body: t.testNotificationBody,
            icon: '/icon.png'
          });
          showToast(t.testNotificationSent);
          return;
        }
      }
      showToast(t.testNotificationSent);
    } catch (e) {
      showToast(t.testNotificationSent);
    }
  };

  const handleExportBackup = () => {
    setShowBackupModal(true);
  };

  const executeExport = async (password: string | null) => {
    try {
      setIsExporting(true);
      const dataToExport = {
        version: '1.2.0',
        timestamp: Date.now(),
        state: appState
      };
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const finalPayload = password ? await encryptData(jsonStr, password) : jsonStr;
      const fileName = `thari_backup_${new Date().toISOString().slice(0, 10)}.thari`;
      
      await exportAndShareNativeFile(
        finalPayload,
        fileName,
        'application/json',
        password ? 'نسخة احتياطية مشفرة لتطبيق ثري' : 'نسخة احتياطية لتطبيق ثري'
      );

      setShowBackupModal(false);
      setBackupPassword('');
      showToast(t.backupExportSuccess);
    } catch (e) {
      console.error('Backup export error:', e);
      showToast(t.backupExportFail, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      if (content.includes('version') && content.includes('state')) {
        try {
          const parsed = JSON.parse(content);
          onRestore(parsed.state);
          showToast(t.backupRestoreSuccess);
        } catch (err) {
          showToast(t.backupInvalidFile, 'error');
        }
      } else {
        setPendingRestoreContent(content);
        setShowRestoreModal(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestore = async (password: string) => {
    if (!pendingRestoreContent) return;
    try {
      const decrypted = await decryptData(pendingRestoreContent, password);
      if (!decrypted) {
        showToast(t.backupWrongPass, 'error');
        return;
      }
      const parsed = JSON.parse(decrypted);
      onRestore(parsed.state || parsed);
      setShowRestoreModal(false);
      setRestorePassword('');
      setPendingRestoreContent(null);
      showToast(t.backupDecryptSuccess);
    } catch (e) {
      showToast(t.backupDecryptFail, 'error');
    }
  };

  const handleExportCSV = async (type: 'summary' | 'detailed', currencyFilter: string | null) => {
    try {
      const csv = buildExecutiveCSVContent({
        transactions: appState.transactions || [],
        categories: appState.categories || categories || [],
        wallets: appState.wallets || wallets || [],
        userName: appState.userName || userName || (appState?.language === 'en' ? 'Thari User' : 'مستخدم ثري'),
        currency: currency || appState.currency,
        exchangeRates: appState.exchangeRates || exchangeRates || {},
        type,
        filterCurrency: currencyFilter
      });
      const fileName = `thari_financial_report_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      await exportAndShareExecutiveCSV(csv, fileName);
      showToast(t.excelExportSuccess);
    } catch (e) {
      console.error('Excel CSV export error:', e);
      showToast(t.excelExportFail, 'error');
    }
  };

  const saveWallet = () => {
    if (!walletData.name.trim()) {
      showToast(t.walletNameRequired, 'error');
      return;
    }
    if (editingWallet) {
      onUpdateWallet(editingWallet.id, walletData);
      showToast(t.walletUpdatedSuccess);
    } else {
      onAddWallet({ ...walletData, openingBalance: 0, currentBalance: 0 });
      showToast(t.walletAddedSuccess);
    }
    setShowWalletForm(false);
    setEditingWallet(null);
  };

  const saveCategory = () => {
    if (!categoryData.name.trim()) {
      showToast(t.categoryNameRequired, 'error');
      return;
    }
    if (editingCategory) {
      onUpdateCategory(editingCategory.id, categoryData);
      showToast(t.categoryUpdatedSuccess);
    } else {
      onAddCategory(categoryData);
      showToast(t.categoryAddedSuccess);
    }
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  if (activeSection === 'wallets') {
    return (
      <div className="space-y-6 pb-24 animate-fade text-start">
        <div className="flex justify-between items-center bg-[#11161C] p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('main')} className="p-2.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><ChevronLeft size={20} /></button>
            <h3 className="font-black text-[#F4F1EA] text-lg">{t.walletsManagement}</h3>
          </div>
          <button onClick={() => { setEditingWallet(null); setWalletData({ name: '', currencyCode: currency?.code || 'SAR', color: COLORS[0], type: 'cash' }); setShowWalletForm(true); }} className="bg-[#D9B978] text-[#0A0D10] px-5 py-2.5 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-[#D9B978]/10 flex items-center gap-1.5">
             <Plus size={16} /> {t.addWallet}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           {safeWallets.map(wallet => (
              <div key={wallet.id} className="bg-[#11161C] p-5 rounded-[2rem] border border-white/10 flex justify-between items-center shadow-lg">
                 <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#0A0D10] font-black" style={{ backgroundColor: wallet.color || '#D9B978' }}>
                       <WalletIcon size={24} />
                    </div>
                    <div>
                       <h4 className="text-[#F4F1EA] font-black text-sm">{wallet.name}</h4>
                       <p className="text-xs text-slate-400 font-bold">{(wallet.currentBalance ?? wallet.openingBalance ?? 0).toLocaleString()} {wallet.currencyCode}</p>
                    </div>
                 </div>
                 <button onClick={() => { setEditingWallet(wallet); setWalletData({ name: wallet.name, currencyCode: wallet.currencyCode, color: wallet.color || COLORS[0], type: wallet.type || 'cash' }); setShowWalletForm(true); }} className="p-2.5 bg-[#0A0D10] text-slate-400 hover:text-white rounded-xl border border-white/5">
                    <Edit2 size={16} />
                 </button>
              </div>
           ))}
        </div>

        {showWalletForm && (
            <Modal title={editingWallet ? t.editWallet : t.addWallet} onClose={() => setShowWalletForm(false)}>
                <div className="space-y-6">
                    <InputField label={t.walletNameOrAccount} value={walletData.name} onChange={(v: string) => setWalletData({...walletData, name: v})} placeholder={t.walletPlaceholder} />
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.currency}</label>
                        <select 
                          value={walletData.currencyCode} 
                          onChange={e => setWalletData({...walletData, currencyCode: e.target.value})}
                          className="w-full p-4 rounded-2xl bg-[#0A0D10] border border-white/10 text-[#F4F1EA] font-bold outline-none"
                        >
                           {safeCurrencies.map(c => (
                              <option key={c.code} value={c.code} className="bg-[#11161C] text-white">{c.name} ({c.code})</option>
                           ))}
                        </select>
                    </div>
                    <ColorPicker selected={walletData.color} onSelect={c => setWalletData({...walletData, color: c})} t={t} />
                    <div className="flex gap-3">
                        {editingWallet && (
                            <button onClick={() => triggerConfirm(`${t.deleteWallet} ${editingWallet.name}؟`, () => { onRemoveWallet(editingWallet.id); setShowWalletForm(false); }, t.deleteWallet, "danger")} className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl active:scale-95"><Trash2 size={24} /></button>
                        )}
                        <ActionButton label={t.saveWallet} onClick={saveWallet} />
                    </div>
                </div>
            </Modal>
        )}
      </div>
    );
  }

  if (activeSection === 'categories') {
    return (
      <div className="space-y-6 pb-24 animate-fade text-start">
        <div className="flex justify-between items-center bg-[#11161C] p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('main')} className="p-2.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><ChevronLeft size={20} /></button>
            <h3 className="font-black text-[#F4F1EA] text-lg">{t.categoriesManagement}</h3>
          </div>
          <button onClick={() => { setEditingCategory(null); setCategoryData({ name: '', icon: ICONS[0], color: COLORS[0], type: 'expense' }); setShowCategoryForm(true); }} className="bg-[#D9B978] text-[#0A0D10] px-5 py-2.5 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-[#D9B978]/10 flex items-center gap-1.5">
             <Plus size={16} /> {t.addCategory}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
           {safeCategories.map(cat => (
              <div key={cat.id} className="bg-[#11161C] p-4 rounded-[2rem] border border-white/10 flex justify-between items-center shadow-lg">
                 <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: cat.color || '#D9B978' }}>
                       {getIcon(cat.icon, 20)}
                    </div>
                    <div>
                       <h4 className="text-[#F4F1EA] font-black text-sm">{cat.name}</h4>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cat.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {cat.type === 'income' ? t.income : t.expenses}
                       </span>
                    </div>
                 </div>
                 <button onClick={() => { setEditingCategory(cat); setCategoryData({ name: cat.name, icon: cat.icon || ICONS[0], color: cat.color || COLORS[0], type: cat.type || 'expense' }); setShowCategoryForm(true); }} className="p-2.5 bg-[#0A0D10] text-slate-400 hover:text-white rounded-xl border border-white/5">
                    <Edit2 size={16} />
                 </button>
              </div>
           ))}
        </div>

        {showCategoryForm && (
            <Modal title={editingCategory ? t.editCategory : t.addCategory} onClose={() => setShowCategoryForm(false)}>
                <div className="space-y-6">
                    <div className="flex bg-[#0A0D10] p-1 rounded-2xl border border-white/10">
                        <button type="button" onClick={() => setCategoryData({...categoryData, type: 'expense'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${categoryData.type === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>{t.expenses}</button>
                        <button type="button" onClick={() => setCategoryData({...categoryData, type: 'income'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${categoryData.type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>{t.income}</button>
                    </div>
                    <InputField label={t.categoryName} value={categoryData.name} onChange={(v: string) => setCategoryData({...categoryData, name: v})} placeholder={t.categoryPlaceholder} />
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.icon}</label>
                        <div className="grid grid-cols-5 gap-3 max-h-40 overflow-y-auto no-scrollbar p-1">
                            {ICONS.map(icon => (
                                <button key={icon} type="button" onClick={() => setCategoryData({...categoryData, icon})} className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${categoryData.icon === icon ? 'border-[#D9B978] bg-[#D9B978]/10 text-[#D9B978]' : 'border-white/5 text-slate-400'}`}>
                                    {getIcon(icon, 20)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ColorPicker selected={categoryData.color} onSelect={c => setCategoryData({...categoryData, color: c})} t={t} />
                    <div className="flex gap-3">
                        {editingCategory && (
                            <button type="button" onClick={() => triggerConfirm(`${t.deleteCategory} ${editingCategory.name}؟`, () => { onRemoveCategory(editingCategory.id); setShowCategoryForm(false); }, t.deleteCategory, "danger")} className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl active:scale-95"><Trash2 size={24} /></button>
                        )}
                        <ActionButton label={t.saveCategory} onClick={saveCategory} />
                    </div>
                </div>
            </Modal>
        )}
      </div>
    );
  }

  if (activeSection === 'currencies') {
    return (
      <div className="space-y-6 pb-24 animate-fade text-start">
        <div className="flex justify-between items-center bg-[#11161C] p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('main')} className="p-2.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><ChevronLeft size={20} /></button>
            <h3 className="font-black text-[#F4F1EA] text-lg">{t.currenciesAndRates}</h3>
          </div>
          <button onClick={() => setShowCurrencyModal(true)} className="bg-[#D9B978] text-[#0A0D10] px-5 py-2.5 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-[#D9B978]/10 flex items-center gap-1.5">
             <Plus size={16} /> {t.addCurrency}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           {safeCurrencies.map(c => {
              const loc = getLocalizedCurrency(c.code, c.name, c.symbol, localLanguage || 'ar');
              return (
                 <div key={c.code} className="bg-[#11161C] p-5 rounded-[2rem] border border-white/10 flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-3.5">
                       <div className="min-w-[48px] h-12 px-2.5 rounded-2xl bg-[#D9B978]/10 text-[#D9B978] flex flex-col items-center justify-center font-black text-xs shrink-0 border border-[#D9B978]/20">
                          <span>{loc.symbol}</span>
                          {loc.badge && <span className="text-[8px] opacity-75">{loc.badge}</span>}
                       </div>
                       <div>
                          <h4 className="text-[#F4F1EA] font-black text-sm">{loc.name} ({c.code})</h4>
                          <p className="text-xs text-slate-400 font-bold">{t.exchangeRate}</p>
                       </div>
                    </div>
                    {c.code !== currency?.code && (
                       <button onClick={() => triggerConfirm(`${t.deleteCurrency} ${loc.name}؟`, () => onRemoveCurrency(c.code), t.deleteCurrency, "danger")} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                          <Trash2 size={16} />
                       </button>
                    )}
                 </div>
              );
           })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fade text-start">
      <div className="flex justify-between items-center bg-[#11161C] p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
        <h3 className="font-black text-[#F4F1EA] text-lg">{t.generalSettings}</h3>
        <button onClick={handleSaveProfile} className="bg-[#D9B978] text-[#0A0D10] px-8 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-[#D9B978]/10 hover:bg-[#c9a764]">{t.save}</button>
      </div>

      {isUpdateAvailable && (
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-5 rounded-[2.5rem] border border-amber-500/30 flex items-center justify-between gap-4 shadow-xl">
           <div className="flex gap-3 items-center">
              <RefreshCw size={24} className="text-amber-500 animate-spin shrink-0" style={{ animationDuration: '3s' }} />
               <div>
                  <p className="text-xs font-black text-white">{t.newUpdateAvailable}</p>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{t.newUpdateDesc}</p>
               </div>
           </div>
           <button onClick={handleUpdateClick} className="px-5 py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition-all shrink-0 shadow-lg shadow-amber-500/10">{t.updateNow}</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
         <button type="button" onClick={() => setActiveSection('wallets')} className="bg-[#11161C] p-5 rounded-[2rem] border border-white/10 flex flex-col items-center gap-3 text-[#F4F1EA] font-bold hover:bg-white/[0.03] transition-all active:scale-95 shadow-xl">
            <div className="w-11 h-11 bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center rounded-2xl"><WalletIcon size={22} /></div>
            <span className="text-[11px] font-black uppercase tracking-wider">{t.walletsManagement}</span>
         </button>
         <button type="button" onClick={() => setActiveSection('categories')} className="bg-[#11161C] p-5 rounded-[2rem] border border-white/10 flex flex-col items-center gap-3 text-[#F4F1EA] font-bold hover:bg-white/[0.03] transition-all active:scale-95 shadow-xl">
            <div className="w-11 h-11 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-2xl"><Tag size={22} /></div>
            <span className="text-[11px] font-black uppercase tracking-wider">{t.categoriesManagement}</span>
         </button>
         <button type="button" onClick={() => setActiveSection('currencies')} className="bg-[#11161C] p-5 rounded-[2rem] border border-white/10 flex flex-col items-center gap-3 text-[#F4F1EA] font-bold hover:bg-white/[0.03] transition-all active:scale-95 shadow-xl">
            <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-2xl"><RefreshCw size={22} /></div>
            <span className="text-[11px] font-black uppercase tracking-wider">{t.currenciesAndRates}</span>
         </button>
         <button type="button" onClick={() => setShowEmailBackupModal(true)} className="bg-[#11161C] p-5 rounded-[2rem] border border-white/10 flex flex-col items-center gap-3 text-[#F4F1EA] font-bold hover:bg-white/[0.03] transition-all active:scale-95 shadow-xl">
            <div className="w-11 h-11 bg-indigo-500/10 text-indigo-400 flex items-center justify-center rounded-2xl"><Mail size={22} /></div>
            <span className="text-[11px] font-black uppercase tracking-wider">{t.emailBackup}</span>
         </button>
      </div>

      <div className="space-y-4">
         <AccordionItem 
            id="profile" 
            title={t.accountAndEmailSync} 
            icon={User}
            isOpen={openAccordion === 'profile'}
            onToggle={() => setOpenAccordion(openAccordion === 'profile' ? null : 'profile')}
         >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">{t.accountOwnerName}</label>
                    <input 
                      type="text" 
                      value={localUserName} 
                      onChange={e => setLocalUserName(e.target.value)} 
                      onBlur={() => onUpdateSettings({ userName: localUserName })}
                      className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-bold border border-white/10 outline-none focus:border-[#D9B978] shadow-inner" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">{t.language}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalLanguage('ar');
                          onUpdateSettings({ language: 'ar' });
                        }}
                        className={`p-3.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          localLanguage === 'ar'
                            ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978] shadow-lg shadow-[#D9B978]/10'
                            : 'bg-[#0A0D10] border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>العربية (Arabic)</span>
                        {localLanguage === 'ar' && <Check size={14} className="text-[#D9B978]" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalLanguage('en');
                          onUpdateSettings({ language: 'en' });
                        }}
                        className={`p-3.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          localLanguage === 'en'
                            ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978] shadow-lg shadow-[#D9B978]/10'
                            : 'bg-[#0A0D10] border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>English (الإنجليزية)</span>
                        {localLanguage === 'en' && <Check size={14} className="text-[#D9B978]" />}
                      </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                        <Mail size={12} className="text-[#D9B978]" /> {t.registeredEmailBackup}
                      </label>
                      {appState?.lastBackupDate && (
                        <span className="text-[9px] font-bold text-slate-500">
                          {t.lastBackup} {new Date(appState.lastBackupDate).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        value={localUserEmail} 
                        onChange={e => setLocalUserEmail(e.target.value)} 
                        onBlur={() => onUpdateSettings({ userEmail: localUserEmail })}
                        placeholder="example@domain.com"
                        className="flex-1 p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-bold border border-white/10 outline-none focus:border-[#D9B978] shadow-inner text-sm dir-ltr text-start" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailBackupModal(true)}
                        className="px-4 bg-[#D9B978]/15 hover:bg-[#D9B978]/25 border border-[#D9B978]/30 text-[#D9B978] rounded-xl text-xs font-black active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Send size={14} />
                        <span>{t.emailBackup}</span>
                      </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">{t.consultationKeyOptional}</label>
                    <input 
                      type="password" 
                      value={localApiKey} 
                      onChange={e => setLocalApiKey(e.target.value)} 
                      onBlur={() => onUpdateSettings({ apiKey: localApiKey })}
                      placeholder={t.apiKeyOptionalPlaceholder} 
                      className="text-center w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-bold border border-white/10 outline-none focus:border-[#D9B978] shadow-inner text-sm" 
                    />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="w-full py-3.5 bg-[#D9B978] hover:bg-[#D9B978]/90 text-[#0A0D10] rounded-xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D9B978]/20"
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>{t.save}</span>
                  </button>
                </div>
            </div>
         </AccordionItem>

         <AccordionItem 
            id="security" 
            title={t.securityBiometricWeb} 
            icon={Lock}
            isOpen={openAccordion === 'security'}
            onToggle={() => setOpenAccordion(openAccordion === 'security' ? null : 'security')}
         >
            <div className="space-y-5 divide-y divide-white/5">
                <div className="pb-4">
                    <button 
                        onClick={() => setShowCurrencyModal(true)}
                        className="w-full bg-[#0A0D10] p-4 rounded-2xl border border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-[#D9B978]/30"
                        type="button"
                    >
                        <div className="flex items-center gap-4">
                             <div className="min-w-[44px] h-10 px-2 rounded-xl bg-[#11161C] border border-white/10 flex items-center justify-center text-[#D9B978] font-black text-xs shrink-0">
                                 {getLocalizedCurrency(currency?.code || 'SAR', currency?.name, currency?.symbol, localLanguage || 'ar').symbol}
                             </div>
                             <div className="text-start">
                                 <p className="text-[9px] font-black text-slate-400 uppercase">{t.baseCurrency}</p>
                                 <p className="text-[#F4F1EA] font-bold text-xs">{getLocalizedCurrency(currency?.code || 'SAR', currency?.name, currency?.symbol, localLanguage || 'ar').name}</p>
                             </div>
                        </div>
                        <ChevronDown size={16} className="text-slate-400" />
                    </button>
                </div>

                <div className="pt-4 space-y-2">
                    <div className="flex justify-between items-center bg-[#0A0D10] p-3.5 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"><Plane size={14} className="text-[#D9B978]" /> {t.travelMode}</label>
                        <div dir="ltr" className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${isTravelMode ? 'bg-[#D9B978]' : 'bg-slate-700'}`} onClick={() => {
                            const newVal = !isTravelMode;
                            setIsTravelMode(newVal);
                          onUpdateSettings({ isTravelMode: newVal, showSeparateCurrencies: newVal });
                        }}>
                            <div className={`w-4 h-4 bg-[#0A0D10] rounded-full shadow-md transition-transform ${isTravelMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      <Clock size={14} className="text-[#D9B978]" /> {t.autoLockTimeout}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 bg-[#0A0D10] p-1.5 rounded-2xl border border-white/5">
                      <button type="button" onClick={() => { setLocalAutoLockTime('instant'); onUpdateSettings({ autoLockTime: 'instant' }); }} className={`py-2 rounded-xl text-xs font-bold transition-all ${localAutoLockTime === 'instant' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.instant}</button>
                      <button type="button" onClick={() => { setLocalAutoLockTime('1min'); onUpdateSettings({ autoLockTime: '1min' }); }} className={`py-2 rounded-xl text-xs font-bold transition-all ${localAutoLockTime === '1min' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.minute}</button>
                      <button type="button" onClick={() => { setLocalAutoLockTime('5min'); onUpdateSettings({ autoLockTime: '5min' }); }} className={`py-2 rounded-xl text-xs font-bold transition-all ${localAutoLockTime === '5min' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.fiveMinutes}</button>
                      <button type="button" onClick={() => { setLocalAutoLockTime('never'); onUpdateSettings({ autoLockTime: 'never' }); }} className={`py-2 rounded-xl text-xs font-bold transition-all ${localAutoLockTime === 'never' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.disabled}</button>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center bg-[#0A0D10] p-3.5 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"><Lock size={14} className="text-[#D9B978]" /> {t.secretPinCode}</label>
                        <div dir="ltr" className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${isSecurityEnabled ? 'bg-[#D9B978]' : 'bg-slate-700'}`} onClick={() => {
                            const nextState = !isSecurityEnabled;
                            setIsSecurityEnabled(nextState);
                            if (!nextState) {
                              setLocalPin('');
                              onUpdateSettings({ pin: null, isLocked: false });
                              showToast(t.lockCancelled);
                            }
                        }}>
                            <div className={`w-4 h-4 bg-[#0A0D10] rounded-full shadow-md transition-transform ${isSecurityEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                    {isSecurityEnabled && (
                        <div className="space-y-2">
                          <input 
                              type="password" 
                              value={localPin} 
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setLocalPin(val);
                                if (val.length === 4) {
                                  onUpdateSettings({ pin: val });
                                  showToast(t.pinSavedSuccess);
                                }
                              }} 
                              className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-center text-2xl tracking-[0.5em] border border-white/10 focus:border-[#D9B978] focus:outline-none" 
                              placeholder="****" 
                              maxLength={4}
                          />
                          <p className="text-[10px] text-slate-400 text-center font-bold">{t.enterPinHint}</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 space-y-2">
                    <div className="flex justify-between items-center bg-[#0A0D10] p-3.5 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"><Fingerprint size={14} className="text-emerald-400" /> {t.unlockWithBiometric}</label>
                        <div dir="ltr" className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${isBiometricEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`} onClick={() => {
                            const nextBio = !isBiometricEnabled;
                            setIsBiometricEnabled(nextBio);
                            setLocalRequireBiometricOnOpen(nextBio);
                            onUpdateSettings({ isBiometricEnabled: nextBio, requireBiometricOnOpen: nextBio });
                            showToast(nextBio ? t.biometricEnabled : t.biometricDisabled);
                        }}>
                            <div className={`w-4 h-4 bg-[#0A0D10] rounded-full shadow-md transition-transform ${isBiometricEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="bg-[#0A0D10] p-4 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-black text-[#F4F1EA]">
                        <Laptop size={16} className="text-[#D9B978]" />
                        <span>{t.deviceWebCompatibilityCheck}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {isNativeApp ? t.nativeApp : t.webCompatibleApp}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunBiometricTest}
                      disabled={bioTestStatus === 'testing'}
                      className="w-full py-2.5 bg-[#11161C] hover:bg-white/5 border border-[#D9B978]/30 text-[#D9B978] rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ScanFace size={15} />
                      <span>{bioTestStatus === 'testing' ? t.testingSensor : t.testBiometricNow}</span>
                    </button>

                    {bioTestFeedback && (
                      <div className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${bioTestStatus === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'}`}>
                        {bioTestStatus === 'success' ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" /> : <AlertCircle size={16} className="shrink-0 text-rose-400" />}
                        <span>{bioTestFeedback}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(isSecurityEnabled || isBiometricEnabled) && (
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSaveSecurity(false)}
                      className="py-3.5 bg-[#D9B978] hover:bg-[#c9a764] text-[#0A0D10] rounded-xl font-black text-xs active:scale-95 shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={16} />
                      <span>{t.saveSecuritySettings}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveSecurity(true)}
                      className="py-3.5 bg-[#141B24] hover:bg-[#1C2633] text-[#F4F1EA] border border-white/10 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Lock size={15} className="text-[#D9B978]" />
                      <span>{t.lockAppNow}</span>
                    </button>
                  </div>
                )}
            </div>
         </AccordionItem>

         <AccordionItem 
            id="data" 
            title={t.backupEmailOffline} 
            icon={HardDrive}
            isOpen={openAccordion === 'data'}
            onToggle={() => setOpenAccordion(openAccordion === 'data' ? null : 'data')}
         >
            <div className="space-y-4">
                 <div className="bg-[#0A0D10] p-4 rounded-2xl border border-white/10 space-y-3">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-xs font-black text-[#F4F1EA]">
                       <RefreshCw size={16} className="text-[#D9B978]" />
                       <span>{t.periodicAutoBackup}</span>
                     </div>
                   </div>
                   <div className="grid grid-cols-4 gap-1.5 bg-[#11161C] p-1.5 rounded-xl border border-white/5">
                     <button type="button" onClick={() => { setLocalAutoBackupFreq('on_open'); onUpdateSettings({ autoBackupFrequency: 'on_open' }); showToast(t.autoBackupConfigured); }} className={`py-2 rounded-lg text-[11px] font-bold transition-all ${localAutoBackupFreq === 'on_open' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.onOpen}</button>
                     <button type="button" onClick={() => { setLocalAutoBackupFreq('daily'); onUpdateSettings({ autoBackupFrequency: 'daily' }); showToast(t.autoBackupConfigured); }} className={`py-2 rounded-lg text-[11px] font-bold transition-all ${localAutoBackupFreq === 'daily' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.daily}</button>
                     <button type="button" onClick={() => { setLocalAutoBackupFreq('weekly'); onUpdateSettings({ autoBackupFrequency: 'weekly' }); showToast(t.autoBackupConfigured); }} className={`py-2 rounded-lg text-[11px] font-bold transition-all ${localAutoBackupFreq === 'weekly' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.weekly}</button>
                     <button type="button" onClick={() => { setLocalAutoBackupFreq('disabled'); onUpdateSettings({ autoBackupFrequency: 'disabled' }); showToast(t.autoBackupDisabled); }} className={`py-2 rounded-lg text-[11px] font-bold transition-all ${localAutoBackupFreq === 'disabled' ? 'bg-[#D9B978] text-[#0A0D10] font-black shadow-md' : 'text-slate-400 hover:text-white'}`}>{t.disabled}</button>
                   </div>
                 </div>

                <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => { setReportConfig({ type: 'detailed', currencyFilter: null, action: 'print' }); setShowReportModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-[#0A0D10] rounded-2xl active:scale-95 transition-all border border-white/10 text-white hover:border-[#D9B978]/30 text-xs font-bold">
                        <Printer size={18} className="text-[#D9B978]" />
                        <span className="text-[10px]">{t.printStatement}</span>
                    </button>
                    <button type="button" onClick={() => { setReportConfig({ type: 'detailed', currencyFilter: null, action: 'share' }); setShowReportModal(true); }} className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-[#0A0D10] rounded-2xl active:scale-95 transition-all border border-white/10 text-white hover:border-emerald-500/30 text-xs font-bold">
                        <FileDown size={18} className="text-emerald-400" />
                        <span className="text-[10px]">{t.sharePdf}</span>
                    </button>
                    <button type="button" onClick={() => handleExportCSV('detailed', null)} className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-[#0A0D10] rounded-2xl active:scale-95 transition-all border border-white/10 text-white hover:border-blue-500/30 text-xs font-bold">
                        <FileSpreadsheet size={18} className="text-blue-400" />
                        <span className="text-[10px]">{t.exportExcel}</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button type="button" onClick={() => onPrint?.('detailed', null, null, null, null)} className="flex items-center justify-center gap-2 p-3.5 bg-[#0A0D10] rounded-xl active:scale-95 border border-white/10 text-xs font-bold text-white">
                        <Printer size={14} className="text-[#D9B978]" />
                        <span>{'طباعة'}</span>
                    </button>
                    <button type="button" onClick={() => onShare?.('detailed', null, null, null, null)} className="flex items-center justify-center gap-2 p-3.5 bg-[#0A0D10] rounded-xl active:scale-95 border border-white/10 text-xs font-bold text-white">
                        <Share2 size={14} className="text-sky-400" />
                        <span>{'مشاركة'}</span>
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button type="button" onClick={() => handleExportBackup()} className="flex items-center justify-center gap-2 p-3.5 bg-[#0A0D10] rounded-xl active:scale-95 border border-white/10 text-xs font-bold text-white">
                        <FileDown size={14} className="text-[#D9B978]" />
                        <span>{t.backupThari}</span>
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3.5 bg-[#0A0D10] rounded-xl active:scale-95 border border-white/10 text-xs font-bold text-white">
                        <Upload size={14} className="text-slate-400" />
                        <span>{t.restoreBackup}</span>
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
         </AccordionItem>

         <AccordionItem 
            id="notifications" 
            title={t.smartAlertsNotifications} 
            icon={Bell}
            isOpen={openAccordion === 'notifications'}
            onToggle={() => setOpenAccordion(openAccordion === 'notifications' ? null : 'notifications')}
         >
            <div className="space-y-4">
                <div className="space-y-3">
                    <div className="flex justify-between items-center bg-[#0A0D10] p-3.5 rounded-2xl border border-white/5">
                        <div className="text-start">
                            <p className="text-[11px] font-bold text-white">{t.debtAlerts}</p>
                        </div>
                        <div dir="ltr" className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${debtAlertsEnabled ? 'bg-[#D9B978]' : 'bg-slate-700'}`} onClick={() => setDebtAlertsEnabled(!debtAlertsEnabled)}>
                            <div className={`w-4 h-4 bg-[#0A0D10] rounded-full shadow-md transition-transform ${debtAlertsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </div>
                <button type="button" onClick={handleTestNotification} className="w-full py-3 bg-[#D9B978]/10 text-[#D9B978] rounded-xl font-bold text-xs border border-[#D9B978]/20 active:scale-95 flex items-center justify-center gap-2">
                    <Bell size={14} /> {t.testNotificationBtn}
                </button>
            </div>
         </AccordionItem>

         <AccordionItem 
            id="about" 
            title={t.aboutApp || "عن التطبيق والخصوصية"} 
            icon={Sparkles}
            isOpen={openAccordion === 'about'}
            onToggle={() => setOpenAccordion(openAccordion === 'about' ? null : 'about')}
         >
            <div className="space-y-4">
                {/* Brand & Mission Banner */}
                <div className="bg-gradient-to-b from-[#171D24] to-[#11161C] p-4 sm:p-5 rounded-2xl border border-[#D9B978]/20 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 text-[#D9B978] flex items-center justify-center font-black shadow-md shrink-0">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#F4F1EA]">ثري | THARI — Living Wealth</h4>
                            <p className="text-[11px] text-[#D9B978] font-medium">{t.quietLuxuryLocal}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {t.aboutAppDesc}
                    </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button 
                      type="button" 
                      onClick={onShowPrivacyPolicy} 
                      className="flex items-center justify-between p-3.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl active:scale-[0.98] text-[#F4F1EA] border border-white/10 text-xs font-bold transition-all min-h-[50px]"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center">
                                <Sparkles size={16} />
                            </div>
                            <div className="text-start">
                                <p className="text-xs font-bold text-[#F4F1EA]">{t.aboutPhilosophy}</p>
                                <p className="text-[10px] text-slate-400">{t.thariPillars}</p>
                            </div>
                        </div>
                        <ChevronLeft size={16} className="text-slate-400" />
                    </button>

                    <button 
                      type="button" 
                      onClick={onShowPrivacyPolicy} 
                      className="flex items-center justify-between p-3.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl active:scale-[0.98] text-[#F4F1EA] border border-white/10 text-xs font-bold transition-all min-h-[50px]"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#8EB9A7]/10 text-[#8EB9A7] flex items-center justify-center">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="text-start">
                                <p className="text-xs font-bold text-[#F4F1EA]">{t.privacyPolicyAndSecurity}</p>
                                <p className="text-[10px] text-slate-400">{t.encryptionLocalFirst}</p>
                            </div>
                        </div>
                        <ChevronLeft size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Rating and Support */}
                <div className="bg-[#0A0D10] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#D9B978]/10 text-[#D9B978] flex items-center justify-center font-bold">
                            <Star size={18} className="fill-[#D9B978]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">{t.likeThariExperience}</p>
                            <p className="text-[10px] text-slate-400">{t.rateUsStore}</p>
                        </div>
                    </div>
                    <button type="button" onClick={handleDirectStoreRating} className="px-3.5 py-2 bg-[#D9B978] text-[#0A0D10] font-bold text-xs rounded-xl active:scale-95 shadow-md shrink-0 flex items-center gap-1.5 min-h-[40px]">
                        <Star size={14} className="fill-[#0A0D10]" />
                        <span>{t.rate}</span>
                    </button>
                </div>

                <button type="button" onClick={handleSupportClick} className="w-full flex items-center justify-center gap-2 p-3.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl active:scale-95 text-slate-200 border border-white/10 text-xs font-bold transition-all min-h-[44px]">
                    <MessageSquare size={16} className="text-[#D9B978]" />
                    <span>{t.techSupport} • thari-app@inbox.ru</span>
                </button>
            </div>
         </AccordionItem>

         <AccordionItem 
            id="danger" 
            title={t.systemMaintenanceAndClear} 
            icon={Trash2}
            isOpen={openAccordion === 'danger'}
            onToggle={() => setOpenAccordion(openAccordion === 'danger' ? null : 'danger')}
         >
            <div className="space-y-4">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                    {t.clearDataWarning}
                </p>
                <button type="button" onClick={() => triggerConfirm(t.clearDataConfirm, onClearData, t.clearDataTitle, "danger")} className="w-full py-4 text-rose-500 font-bold text-xs border border-rose-500/20 bg-rose-500/5 rounded-2xl active:scale-95 flex items-center justify-center gap-2">
                  <Trash2 size={16} /> {t.clearAllFinancialRecords}
                </button>
            </div>
         </AccordionItem>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        transactions={appState.transactions || []}
        categories={appState.categories || safeCategories}
        wallets={appState.wallets || safeWallets}
        currencies={safeCurrencies}
        currentCurrency={currency || appState.currency}
        userName={appState.userName || userName || (localLanguage === 'en' ? 'Thari User' : 'مستخدم ثري')}
        exchangeRates={appState.exchangeRates || exchangeRates || {}}
        initialType={reportConfig.type}
        initialCurrencyCode={reportConfig.currencyFilter}
        onTriggerPrint={onPrint}
      />

      {showBackupModal && (
        <Modal title={t.secureBackupTitle} onClose={() => { setShowBackupModal(false); setBackupPassword(''); }}>
            <div className="space-y-8">
                <div className="space-y-4">
                   <InputField type="password" label={t.passwordOptional} value={backupPassword} onChange={setBackupPassword} placeholder={t.passwordOptionalPlaceholder} />
                </div>
                <ActionButton label={backupPassword ? t.exportEncryptedSecure : t.exportNormal} onClick={() => executeExport(backupPassword || null)} />
            </div>
        </Modal>
      )}

      <ToastNotification toast={toast} />
      <ConfirmDialog confirmData={confirmData} onCancel={() => setConfirmData(null)} t={t} />
    </div>
  );
}
