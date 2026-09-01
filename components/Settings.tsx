import React, { useState, useRef } from 'react';
import { 
  Trash2, User, Wallet as WalletIcon, Lock, Upload, Edit2, Plus, Tag, Coins, X, Check, Printer, FileDown, ChevronDown, AlertCircle, AlertTriangle, FileSpreadsheet, Code, ChevronLeft, Palette, Type,
  ChevronRight, TrendingUp, ShieldCheck, ShieldAlert, Key, Unlock, Smartphone, RefreshCw, Plane, Sparkles, FileText, Bell, Star, Fingerprint, MessageSquare, Heart, Send, HelpCircle, CheckCircle2,
  Mail, HardDrive, Shield, Activity, Clock, Laptop, ScanFace, FileCheck, Share2
} from 'lucide-react';
import { Currency, Wallet, Category, Transaction } from '../types';
import { getTranslation, getLocalizedCurrency } from '../utils/translations';
import { sanitizeNumericInput } from '../utils/formatters';
import { encryptData, decryptData } from '../services/encryptionService';
import { authenticateBiometrics, checkBiometricAvailable, isNativeCapacitorEnvironment, isStandalonePwaMode } from '../services/biometricService';
import { getIcon, DEFAULT_EXCHANGE_RATES, convertCurrency } from '../constants';
import { buildExecutiveCSVContent, exportAndShareExecutiveCSV } from '../utils/exportHelper';
import { exportAndShareNativeFile } from '../services/reports/reportExportService';
import { ReportModal } from './reports/ReportModal';
import { useBackNavigation } from '../utils/backNavigation';

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
    <div className="fixed top-20 left-0 right-0 z-[99999] flex justify-center items-center pointer-events-none px-4 no-print">
      <div className={`pointer-events-auto max-w-xs sm:max-w-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border backdrop-blur-xl animate-slide-down ${
        toast.type === 'success' 
          ? 'bg-[#11161C]/95 border-emerald-500/40 text-emerald-400 shadow-[0_10px_25px_rgba(16,185,129,0.2)]' 
          : 'bg-[#11161C]/95 border-rose-500/40 text-rose-400 shadow-[0_10px_25px_rgba(244,63,94,0.2)]'
      }`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
          {toast.type === 'success' ? <Check size={16} strokeWidth={3} /> : <AlertCircle size={16} strokeWidth={3} />}
        </div>
        <span className="font-bold text-xs text-[#F4F1EA] leading-relaxed">{toast.message}</span>
      </div>
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

  const [editingRateCurrency, setEditingRateCurrency] = useState<Currency | null>(null);
  const [rateInputVal, setRateInputVal] = useState('');
  const [rateInputSubVal, setRateInputSubVal] = useState('');
  const [calcTestAmount, setCalcTestAmount] = useState<number>(100);
  const [calcTestFrom, setCalcTestFrom] = useState<string>('SAR');
  const [newCurrencyData, setNewCurrencyData] = useState({ code: '', name: '', symbol: '', rate: '1.0' });

  const currentRates: Record<string, number> = {
    ...DEFAULT_EXCHANGE_RATES,
    ...(appState?.exchangeRates || exchangeRates || {})
  };

  const [manualYerSanaa100, setManualYerSanaa100] = useState(() => {
    const r = currentRates['YER_SANAA'] || (100.0 / 14000.0);
    return String(Math.round(100 / r));
  });
  const [manualYerAden100, setManualYerAden100] = useState(() => {
    const r = currentRates['YER_ADEN'] || (100.0 / 41000.0);
    return String(Math.round(100 / r));
  });
  const [manualUsdInAden100, setManualUsdInAden100] = useState(() => {
    const usdR = currentRates['USD'] || (1576.0 / 410.0);
    const adenR = currentRates['YER_ADEN'] || (100.0 / 41000.0);
    return String(Math.round(100 * (usdR / adenR)));
  });
  const [manualUsdInSar, setManualUsdInSar] = useState(() => {
    const usdR = currentRates['USD'] || (1576.0 / 410.0);
    return String(usdR.toFixed(3));
  });
  const [manualEgp100, setManualEgp100] = useState(() => {
    const r = currentRates['EGP'] || (100.0 / 1250.0);
    return String(Math.round(100 / r));
  });

  React.useEffect(() => {
    const sanaaR = currentRates['YER_SANAA'] || (100.0 / 14000.0);
    setManualYerSanaa100(String(Math.round(100 / sanaaR)));

    const adenR = currentRates['YER_ADEN'] || (100.0 / 41000.0);
    setManualYerAden100(String(Math.round(100 / adenR)));

    const usdR = currentRates['USD'] || (1576.0 / 410.0);
    setManualUsdInAden100(String(Math.round(100 * (usdR / adenR))));
    setManualUsdInSar(String(usdR.toFixed(3)));

    const egpR = currentRates['EGP'] || (100.0 / 1250.0);
    setManualEgp100(String(Math.round(100 / egpR)));
  }, [appState?.exchangeRates, exchangeRates]);

  const handleSaveAllManualRates = () => {
    const sanaaNum = parseFloat(manualYerSanaa100);
    const adenNum = parseFloat(manualYerAden100);
    const usdAdenNum = parseFloat(manualUsdInAden100);
    const egpNum = parseFloat(manualEgp100);
    const usdSarNum = parseFloat(manualUsdInSar);

    if (isNaN(sanaaNum) || sanaaNum <= 0 || isNaN(adenNum) || adenNum <= 0) {
      showToast(localLanguage === 'en' ? 'Please enter valid exchange rates' : 'يرجى إدخال أرقام صحيحة لأسعار الصرف', 'error');
      return;
    }

    const newAdenRate = 100.0 / adenNum;
    const newSanaaRate = 100.0 / sanaaNum;
    let newUsdRate = currentRates['USD'] || (1576.0 / 410.0);

    if (!isNaN(usdAdenNum) && usdAdenNum > 0) {
      newUsdRate = usdAdenNum / adenNum;
    } else if (!isNaN(usdSarNum) && usdSarNum > 0) {
      newUsdRate = usdSarNum;
    }

    const updated: Record<string, number> = {
      ...currentRates,
      YER_SANAA: newSanaaRate,
      YER_ADEN: newAdenRate,
      YER: newAdenRate,
      USD: newUsdRate,
    };

    if (!isNaN(egpNum) && egpNum > 0) {
      updated['EGP'] = 100.0 / egpNum;
    }

    onUpdateSettings({ exchangeRates: updated });
    showToast(localLanguage === 'en' ? 'Custom exchange rates saved to AppState successfully' : 'تم حفظ وتحديث أسعار الصرف اليدوية في النظام بنجاح');
  };

  const handleApplyYemenPreset = () => {
    const updated = {
      ...currentRates,
      YER_SANAA: 100.0 / 14000.0, // 100 SAR = 14,000 YER Sana'a
      YER_ADEN: 100.0 / 41000.0,  // 100 SAR = 41,000 YER Aden
      YER: 100.0 / 41000.0,
      USD: 1576.0 / 410.0,        // 100 USD = 157,600 YER Aden
    };
    onUpdateSettings({ exchangeRates: updated });
    showToast(localLanguage === 'en' ? 'Yemen rates applied: 100 SAR = 14k/41k YER, 100$ = 157.6k YER' : 'تم تطبيق أسعار اليمن: 100 سعودي = 14 ألف صنعاء / 41 ألف عدن، و 100 دولار = 157,600 عدن');
  };

  const handleResetDefaultRates = () => {
    onUpdateSettings({ exchangeRates: { ...DEFAULT_EXCHANGE_RATES } });
    showToast(localLanguage === 'en' ? 'Exchange rates reset to defaults' : 'تمت استعادة أسعار الصرف الافتراضية');
  };

  const openRateEditor = (curr: Currency) => {
    setEditingRateCurrency(curr);
    const code = curr.code;
    const currentRate = currentRates[code] ?? DEFAULT_EXCHANGE_RATES[code] ?? 1.0;

    if (code === 'YER_SANAA') {
      const per100 = Math.round(100 / currentRate);
      setRateInputVal(String(per100 > 0 ? per100 : 14000));
    } else if (code === 'YER_ADEN') {
      const per100 = Math.round(100 / currentRate);
      setRateInputVal(String(per100 > 0 ? per100 : 41000));
      const usdRate = currentRates['USD'] || (1576.0 / 410.0);
      const per100Usd = Math.round(100 * (usdRate / currentRate));
      setRateInputSubVal(String(per100Usd > 0 ? per100Usd : 157600));
    } else if (code === 'USD') {
      setRateInputVal(String(currentRate.toFixed(3)));
      const adenRate = currentRates['YER_ADEN'] || (100.0 / 41000.0);
      const per100UsdInAden = Math.round(100 * (currentRate / adenRate));
      setRateInputSubVal(String(per100UsdInAden > 0 ? per100UsdInAden : 157600));
    } else if (code === 'EGP') {
      const per100 = Math.round(100 / currentRate);
      setRateInputVal(String(per100 > 0 ? per100 : 1250));
    } else {
      setRateInputVal(String(currentRate));
    }
  };

  const saveRateEditor = () => {
    if (!editingRateCurrency) return;
    const code = editingRateCurrency.code;
    const num = parseFloat(rateInputVal);
    if (isNaN(num) || num <= 0) {
      showToast(localLanguage === 'en' ? 'Please enter a valid rate' : 'يرجى إدخال قيمة صحيحة', 'error');
      return;
    }

    let calculatedRate = num;
    if (code === 'YER_SANAA' || code === 'YER_ADEN' || code === 'EGP') {
      // Input was: How much X units per 100 SAR?
      // Rate = 100 / num
      calculatedRate = 100.0 / num;
    }

    const updated = {
      ...currentRates,
      [code]: calculatedRate
    };

    // If editing YER_ADEN and user also specified USD 100 rate in subVal
    if (code === 'YER_ADEN' && rateInputSubVal) {
      const subNum = parseFloat(rateInputSubVal);
      if (!isNaN(subNum) && subNum > 0) {
        // subNum is 100 USD in YER_ADEN => 1 USD = (subNum / 100) YER_ADEN
        // 1 USD in SAR = (subNum / 100) * calculatedRate
        const newUsdRate = (subNum / 100.0) * calculatedRate;
        updated['USD'] = newUsdRate;
      }
    } else if (code === 'USD' && rateInputSubVal) {
      const subNum = parseFloat(rateInputSubVal);
      if (!isNaN(subNum) && subNum > 0) {
        // subNum is 100 USD in YER_ADEN => 1 YER_ADEN = 100 * calculatedRate / subNum SAR
        const newAdenRate = (100.0 * calculatedRate) / subNum;
        updated['YER_ADEN'] = newAdenRate;
        updated['YER'] = newAdenRate;
      }
    }

    onUpdateSettings({ exchangeRates: updated });
    setEditingRateCurrency(null);
    showToast(localLanguage === 'en' ? 'Exchange rate updated successfully' : 'تم حفظ وتحديث سعر الصرف بنجاح');
  };

  const saveNewCurrency = () => {
    const code = newCurrencyData.code.trim().toUpperCase();
    const name = newCurrencyData.name.trim();
    const symbol = newCurrencyData.symbol.trim() || code;
    const rate = parseFloat(newCurrencyData.rate);

    if (!code || !name) {
      showToast(localLanguage === 'en' ? 'Currency code and name are required' : 'يرجى إدخال رمز واسم العملة', 'error');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      showToast(localLanguage === 'en' ? 'Please enter a valid exchange rate' : 'يرجى إدخال سعر صرف صحيح', 'error');
      return;
    }

    onAddCurrency({ code, name, symbol });
    onUpdateSettings({
      exchangeRates: {
        ...currentRates,
        [code]: rate
      }
    });

    setShowCurrencyModal(false);
    setNewCurrencyData({ code: '', name: '', symbol: '', rate: '1.0' });
    showToast(localLanguage === 'en' ? 'Currency added successfully' : 'تمت إضافة العملة بنجاح');
  };

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

  const handleSettingsBack = (): boolean => {
    if (confirmData) {
      setConfirmData(null);
      return true;
    }
    if (showReportModal) {
      setShowReportModal(false);
      return true;
    }
    if (showWalletForm) {
      setShowWalletForm(false);
      setEditingWallet(null);
      return true;
    }
    if (showCategoryForm) {
      setShowCategoryForm(false);
      setEditingCategory(null);
      return true;
    }
    if (showCurrencyModal) {
      setShowCurrencyModal(false);
      return true;
    }
    if (editingRateCurrency) {
      setEditingRateCurrency(null);
      return true;
    }
    if (showEmailBackupModal) {
      setShowEmailBackupModal(false);
      return true;
    }
    if (showBackupModal) {
      setShowBackupModal(false);
      return true;
    }
    if (showRestoreModal) {
      setShowRestoreModal(false);
      return true;
    }
    if (showDataModal) {
      setShowDataModal(false);
      return true;
    }
    if (showAutoBackupHistoryModal) {
      setShowAutoBackupHistoryModal(false);
      return true;
    }
    if (activeSection !== 'main') {
      setActiveSection('main');
      return true;
    }
    return false;
  };

  const hasSettingsSubViewOpen = Boolean(
    confirmData ||
    showReportModal ||
    showWalletForm ||
    showCategoryForm ||
    showCurrencyModal ||
    editingRateCurrency ||
    showEmailBackupModal ||
    showBackupModal ||
    showRestoreModal ||
    showDataModal ||
    showAutoBackupHistoryModal ||
    activeSection !== 'main'
  );

  useBackNavigation(handleSettingsBack, hasSettingsSubViewOpen, 10);

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
            <button 
              type="button"
              onClick={() => setActiveSection('main')} 
              className="p-2.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/5 active:scale-95"
              aria-label={localLanguage === 'ar' ? 'الرجوع' : 'Back'}
              title={localLanguage === 'ar' ? 'الرجوع' : 'Back'}
            >
              {localLanguage === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
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
            <button 
              type="button"
              onClick={() => setActiveSection('main')} 
              className="p-2.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/5 active:scale-95"
              aria-label={localLanguage === 'ar' ? 'الرجوع' : 'Back'}
              title={localLanguage === 'ar' ? 'الرجوع' : 'Back'}
            >
              {localLanguage === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
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
    const isArabic = (localLanguage || 'ar') === 'ar';

    return (
      <div className="space-y-6 pb-24 animate-fade text-start">
        {/* Section Header */}
        <div className="flex justify-between items-center bg-[#11161C] p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setActiveSection('main')} 
              className="p-2.5 bg-[#0A0D10] hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/5 active:scale-95"
              aria-label={isArabic ? 'الرجوع' : 'Back'}
              title={isArabic ? 'الرجوع' : 'Back'}
            >
              {isArabic ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            <div>
              <h3 className="font-black text-[#F4F1EA] text-lg">{t.currenciesAndRates}</h3>
              <p className="text-[11px] text-slate-400 font-bold">
                {isArabic ? 'الريال السعودي (SAR) هو العملة المرجعية للنظام مع إمكانية تعديل كافة الأسعار محلياً' : 'SAR is base currency with full customizable rates'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setNewCurrencyData({ code: '', name: '', symbol: '', rate: '1.0' });
              setShowCurrencyModal(true);
            }} 
            className="bg-[#D9B978] text-[#0A0D10] px-4 py-2.5 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-[#D9B978]/10 flex items-center gap-1.5 shrink-0"
          >
             <Plus size={16} /> {t.addCurrency}
          </button>
        </div>

        {/* Quick Presets & Instant Setup */}
        <div className="bg-[#11161C] p-5 sm:p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-xs">
                ⚡
              </div>
              <h4 className="text-sm font-black text-[#F4F1EA]">
                {isArabic ? 'الضبط السريع لأسعار الصرف في اليمن والدول' : 'Quick Rate Presets'}
              </h4>
            </div>
            <button
              onClick={handleResetDefaultRates}
              className="text-[11px] text-slate-400 hover:text-white font-bold underline px-2 py-1 transition-colors"
            >
              {isArabic ? 'استعادة الافتراضيات' : 'Reset Defaults'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0D10] border border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-[10px]">
                    🇾🇪 {isArabic ? 'أسعار اليمن المعتمدة' : 'Yemen Market Rates'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-bold leading-relaxed">
                  {isArabic 
                    ? '100 سعودي = 14,000 ريال (صنعاء) | 100 سعودي = 41,000 ريال (عدن) | 100 دولار = 157,600 ريال (عدن)'
                    : '100 SAR = 14k YER (Sanaa) | 100 SAR = 41k YER (Aden) | 100 USD = 157.6k YER (Aden)'}
                </p>
              </div>
              <button
                onClick={handleApplyYemenPreset}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all shrink-0 flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                {isArabic ? 'تطبيق أسعار اليمن فوراً' : 'Apply Yemen Rates'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Currency Converter Sandbox */}
        <div className="bg-[#11161C] p-5 sm:p-6 rounded-[2.5rem] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-xs">
              🔄
            </div>
            <div>
              <h4 className="text-sm font-black text-[#F4F1EA]">
                {isArabic ? 'حاسبة التحويل التجريبية الحية' : 'Live FX Converter & Tester'}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                {isArabic ? 'جرّب أي مبلغ للتأكد من دقة الصرف ومطابقته للواقع' : 'Test any amount across all active currencies'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {isArabic ? 'المبلغ للتجربة' : 'Amount'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={calcTestAmount}
                onChange={e => setCalcTestAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full p-3 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black border border-white/10 focus:border-[#D9B978] outline-none"
              />
            </div>
            <div className="w-full sm:w-48 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                {isArabic ? 'من عملة' : 'From Currency'}
              </label>
              <select
                value={calcTestFrom}
                onChange={e => setCalcTestFrom(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black border border-white/10 focus:border-[#D9B978] outline-none"
              >
                {safeCurrencies.map(c => {
                  const loc = getLocalizedCurrency(c.code, c.name, c.symbol, localLanguage || 'ar');
                  return (
                    <option key={c.code} value={c.code}>
                      {loc.name} ({c.code})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2">
            {safeCurrencies.map(c => {
              const convertedVal = convertCurrency(calcTestAmount, calcTestFrom, c.code, currentRates);
              const loc = getLocalizedCurrency(c.code, c.name, c.symbol, localLanguage || 'ar');
              return (
                <div key={c.code} className="p-3 rounded-2xl bg-[#0A0D10] border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold truncate">{loc.name}</span>
                  <div className="flex items-baseline justify-between gap-1 mt-1">
                    <span className="text-sm font-black text-white truncate">
                      {convertedVal.toLocaleString(undefined, { maximumFractionDigits: c.code.includes('YER') ? 0 : 2 })}
                    </span>
                    <span className="text-[10px] font-black text-[#D9B978] shrink-0">{loc.symbol}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency Cards List */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">
            {isArabic ? 'قائمة العملات وأسعار الصرف القابلة للتعديل' : 'Currencies & Exchange Rates'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {safeCurrencies.map(c => {
              const loc = getLocalizedCurrency(c.code, c.name, c.symbol, localLanguage || 'ar');
              const rate = currentRates[c.code] ?? DEFAULT_EXCHANGE_RATES[c.code] ?? 1.0;
              const isBase = c.code === 'SAR';

              // Format human-friendly descriptions
              let rateDescription = '';
              if (isBase) {
                rateDescription = isArabic ? 'العملة المرجعية للنظام (1.00)' : 'Base Reference Currency (1.00)';
              } else if (c.code === 'YER_SANAA') {
                const per100 = Math.round(100 / rate);
                rateDescription = isArabic 
                  ? `100 ر.س = ${per100.toLocaleString()} ر.ي صنعاء`
                  : `100 SAR = ${per100.toLocaleString()} YER`;
              } else if (c.code === 'YER_ADEN') {
                const per100 = Math.round(100 / rate);
                const usdRate = currentRates['USD'] || (1576.0 / 410.0);
                const per100Usd = Math.round(100 * (usdRate / rate));
                rateDescription = isArabic 
                  ? `100 ر.س = ${per100.toLocaleString()} ر.ي | 100 $ = ${per100Usd.toLocaleString()} ر.ي`
                  : `100 SAR = ${per100.toLocaleString()} YER | 100 USD = ${per100Usd.toLocaleString()} YER`;
              } else if (c.code === 'USD') {
                const adenRate = currentRates['YER_ADEN'] || (100.0 / 41000.0);
                const per100UsdInAden = Math.round(100 * (rate / adenRate));
                rateDescription = isArabic 
                  ? `1 $ = ${rate.toFixed(3)} ر.س (100 $ = ${per100UsdInAden.toLocaleString()} ر.ي عدن)`
                  : `1 USD = ${rate.toFixed(3)} SAR (100 USD = ${per100UsdInAden.toLocaleString()} YER)`;
              } else if (c.code === 'EGP') {
                const per100 = Math.round(100 / rate);
                rateDescription = isArabic 
                  ? `100 ر.س = ${per100.toLocaleString()} جنيه مصري`
                  : `100 SAR = ${per100.toLocaleString()} EGP`;
              } else {
                rateDescription = isArabic 
                  ? `1 وحدة = ${rate.toFixed(3)} ر.س`
                  : `1 Unit = ${rate.toFixed(3)} SAR`;
              }

              return (
                <div 
                  key={c.code} 
                  className="bg-[#11161C] p-4 sm:p-5 rounded-[2rem] border border-white/10 flex flex-col justify-between gap-4 shadow-lg hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="min-w-[48px] h-12 px-2.5 rounded-2xl bg-[#D9B978]/10 text-[#D9B978] flex flex-col items-center justify-center font-black text-xs shrink-0 border border-[#D9B978]/20">
                        <span>{loc.symbol}</span>
                        {loc.badge && <span className="text-[8px] opacity-75">{loc.badge}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[#F4F1EA] font-black text-sm">{loc.name}</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                            {c.code}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-bold mt-1">
                          {rateDescription}
                        </p>
                      </div>
                    </div>

                    {c.code !== currency?.code && !isBase && (
                      <button 
                        onClick={() => triggerConfirm(`${t.deleteCurrency} ${loc.name}؟`, () => onRemoveCurrency(c.code), t.deleteCurrency, "danger")} 
                        className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 active:scale-95 transition-all"
                        title={t.deleteCurrency}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {!isBase && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => openRateEditor(c)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#F4F1EA] text-xs font-black border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit2 size={14} className="text-[#D9B978]" />
                        {isArabic ? 'تعديل سعر الصرف' : 'Edit Rate'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit Rate Modal */}
        {editingRateCurrency && (
          <Modal 
            title={`${isArabic ? 'تعديل سعر صرف' : 'Edit Rate'}: ${getLocalizedCurrency(editingRateCurrency.code, editingRateCurrency.name, editingRateCurrency.symbol, localLanguage || 'ar').name}`}
            onClose={() => setEditingRateCurrency(null)}
          >
            <div className="space-y-4 pb-24">
              {editingRateCurrency.code === 'YER_SANAA' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300">
                    {isArabic ? 'كم يساوي 100 ريال سعودي بالريال اليمني (صنعاء)؟' : 'How much is 100 SAR in YER (Sanaa)?'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rateInputVal}
                    onChange={e => setRateInputVal(e.target.value)}
                    placeholder="14000"
                    className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                  />
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {isArabic ? `النتيجة: 100 ر.س = ${parseFloat(rateInputVal) || 0} ر.ي (1 ر.س = ${((parseFloat(rateInputVal) || 0) / 100).toFixed(1)} ر.ي)` : ''}
                  </p>
                </div>
              )}

              {editingRateCurrency.code === 'YER_ADEN' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300">
                      {isArabic ? 'كم يساوي 100 ريال سعودي بالريال اليمني (عدن)؟' : 'How much is 100 SAR in YER (Aden)?'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInputVal}
                      onChange={e => setRateInputVal(e.target.value)}
                      placeholder="41000"
                      className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                    />
                    <p className="text-[11px] text-emerald-400 font-bold">
                      {isArabic ? `100 ر.س = ${(parseFloat(rateInputVal) || 0).toLocaleString()} ر.ي (1 ر.س = ${((parseFloat(rateInputVal) || 0) / 100).toFixed(1)} ر.ي)` : ''}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs font-black text-slate-300">
                      {isArabic ? 'وكم يساوي 100 دولار بالريال اليمني (عدن)؟' : 'How much is 100 USD in YER (Aden)?'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInputSubVal}
                      onChange={e => setRateInputSubVal(e.target.value)}
                      placeholder="157600"
                      className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                    />
                    <p className="text-[11px] text-amber-400 font-bold">
                      {isArabic ? `100 $ = ${(parseFloat(rateInputSubVal) || 0).toLocaleString()} ر.ي (1 $ = ${((parseFloat(rateInputSubVal) || 0) / 100).toFixed(1)} ر.ي)` : ''}
                    </p>
                  </div>
                </div>
              )}

              {editingRateCurrency.code === 'USD' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300">
                      {isArabic ? 'سعر 1 دولار أمريكي بالريال السعودي (SAR):' : 'Rate of 1 USD in SAR:'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInputVal}
                      onChange={e => setRateInputVal(e.target.value)}
                      placeholder="3.844"
                      className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-xs font-black text-slate-300">
                      {isArabic ? 'أو كم يساوي 100 دولار بالريال اليمني عدن؟' : 'Or how much is 100 USD in YER (Aden)?'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInputSubVal}
                      onChange={e => setRateInputSubVal(e.target.value)}
                      placeholder="157600"
                      className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                    />
                  </div>
                </div>
              )}

              {editingRateCurrency.code === 'EGP' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300">
                    {isArabic ? 'كم يساوي 100 ريال سعودي بالجنيه المصري؟' : 'How much is 100 SAR in EGP?'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rateInputVal}
                    onChange={e => setRateInputVal(e.target.value)}
                    placeholder="1250"
                    className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                  />
                  <p className="text-[11px] text-emerald-400 font-bold">
                    {isArabic ? `100 ر.س = ${(parseFloat(rateInputVal) || 0).toLocaleString()} ج.م (1 ج.م = ${(100 / (parseFloat(rateInputVal) || 1250)).toFixed(3)} ر.س)` : ''}
                  </p>
                </div>
              )}

              {editingRateCurrency.code !== 'YER_SANAA' && editingRateCurrency.code !== 'YER_ADEN' && editingRateCurrency.code !== 'USD' && editingRateCurrency.code !== 'EGP' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300">
                    {isArabic ? `سعر 1 ${editingRateCurrency.name} بالريال السعودي (SAR):` : `Rate of 1 unit in SAR:`}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rateInputVal}
                    onChange={e => setRateInputVal(e.target.value)}
                    className="w-full p-4 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black text-lg border border-white/10 focus:border-[#D9B978] outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRateCurrency(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={saveRateEditor}
                  className="flex-1 py-3 rounded-2xl bg-[#D9B978] text-[#0A0D10] font-black text-xs shadow-lg shadow-[#D9B978]/10 active:scale-95 transition-all"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Add New Currency Modal */}
        {showCurrencyModal && (
          <Modal title={t.addCurrency} onClose={() => setShowCurrencyModal(false)}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300">
                  {isArabic ? 'رمز العملة (مثال: TRY, CAD, QAR, KWD)' : 'Currency Code'}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={newCurrencyData.code}
                  onChange={e => setNewCurrencyData({ ...newCurrencyData, code: e.target.value.toUpperCase() })}
                  placeholder="TRY"
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black uppercase border border-white/10 focus:border-[#D9B978] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300">
                  {isArabic ? 'اسم العملة (مثال: ليرة تركية)' : 'Currency Name'}
                </label>
                <input
                  type="text"
                  value={newCurrencyData.name}
                  onChange={e => setNewCurrencyData({ ...newCurrencyData, name: e.target.value })}
                  placeholder={isArabic ? 'ليرة تركية' : 'Turkish Lira'}
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black border border-white/10 focus:border-[#D9B978] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300">
                  {isArabic ? 'رمز العرض (مثال: ₺ أو TL)' : 'Symbol'}
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={newCurrencyData.symbol}
                  onChange={e => setNewCurrencyData({ ...newCurrencyData, symbol: e.target.value })}
                  placeholder="₺"
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black border border-white/10 focus:border-[#D9B978] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300">
                  {isArabic ? 'سعر الصرف مقابل 1 ريال سعودي (SAR)' : 'Exchange Rate in SAR'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newCurrencyData.rate}
                  onChange={e => setNewCurrencyData({ ...newCurrencyData, rate: e.target.value })}
                  placeholder="0.10"
                  className="w-full p-3.5 rounded-xl bg-[#0A0D10] text-[#F4F1EA] font-black border border-white/10 focus:border-[#D9B978] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={saveNewCurrency}
                  className="flex-1 py-3 rounded-2xl bg-[#D9B978] text-[#0A0D10] font-black text-xs shadow-lg shadow-[#D9B978]/10 active:scale-95 transition-all"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </Modal>
        )}
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
            id="customExchangeRates" 
            title={localLanguage === 'en' ? 'Custom Exchange Rates & FX Control' : 'أسعار الصرف المخصصة والتحويل اليدوي'} 
            icon={TrendingUp}
            isOpen={openAccordion === 'customExchangeRates'}
            onToggle={() => setOpenAccordion(openAccordion === 'customExchangeRates' ? null : 'customExchangeRates')}
         >
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0A0D10] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black text-white">
                      {localLanguage === 'en' ? 'Live Dynamic Rates Engine' : 'محرك أسعار الصرف اليدوية المخصصة'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#D9B978]/10 text-[#D9B978] border border-[#D9B978]/20">
                    {localLanguage === 'en' ? 'Base: SAR (1.00)' : 'الأساس: ريال سعودي (1.00)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                  {localLanguage === 'en'
                    ? 'Define your own manual exchange rates. All account balances, transactions, and net worth calculations will dynamically reflect these custom values.'
                    : 'يمكنك تحديد أسعار الصرف يدوياً بدقة لمطابقة السوق ومحلات الصرافة. سيتم حفظ القيم في بياناتك وتطبيقها ديناميكياً على كافة الحسابات والتقارير.'}
                </p>
              </div>

              {/* Yemen Rates Direct Inputs */}
              <div className="space-y-3">
                <div className="bg-[#0A0D10] p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black text-slate-300 flex items-center gap-1.5">
                      🇾🇪 {localLanguage === 'en' ? '100 SAR in YER (Sanaa):' : 'كم يساوي 100 ريال سعودي بالريال اليمني (صنعاء)؟'}
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {localLanguage === 'en' 
                        ? `1 SAR = ${((parseFloat(manualYerSanaa100) || 0) / 100).toFixed(1)} YER` 
                        : `1 ر.س = ${((parseFloat(manualYerSanaa100) || 0) / 100).toFixed(1)} ر.ي`}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={manualYerSanaa100}
                      onChange={e => setManualYerSanaa100(e.target.value)}
                      placeholder="14000"
                      className="w-full p-3.5 rounded-xl bg-[#11161C] text-[#F4F1EA] font-black text-base border border-white/10 focus:border-[#D9B978] outline-none text-start"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      {localLanguage === 'en' ? 'YER Sanaa' : 'ريال يمني'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#0A0D10] p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black text-slate-300 flex items-center gap-1.5">
                      🇾🇪 {localLanguage === 'en' ? '100 SAR in YER (Aden):' : 'كم يساوي 100 ريال سعودي بالريال اليمني (عدن)؟'}
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {localLanguage === 'en' 
                        ? `1 SAR = ${((parseFloat(manualYerAden100) || 0) / 100).toFixed(1)} YER` 
                        : `1 ر.س = ${((parseFloat(manualYerAden100) || 0) / 100).toFixed(1)} ر.ي`}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={manualYerAden100}
                      onChange={e => setManualYerAden100(e.target.value)}
                      placeholder="41000"
                      className="w-full p-3.5 rounded-xl bg-[#11161C] text-[#F4F1EA] font-black text-base border border-white/10 focus:border-[#D9B978] outline-none text-start"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      {localLanguage === 'en' ? 'YER Aden' : 'ريال يمني'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#0A0D10] p-3.5 sm:p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black text-slate-300 flex items-center gap-1.5">
                      💵 {localLanguage === 'en' ? '100 USD in YER (Aden):' : 'كم يساوي 100 دولار أمريكي بالريال اليمني (عدن)؟'}
                    </label>
                    <span className="text-[10px] font-bold text-amber-400">
                      {localLanguage === 'en' 
                        ? `1 USD = ${((parseFloat(manualUsdInAden100) || 0) / 100).toFixed(1)} YER` 
                        : `1 دولار = ${((parseFloat(manualUsdInAden100) || 0) / 100).toFixed(1)} ر.ي`}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={manualUsdInAden100}
                      onChange={e => setManualUsdInAden100(e.target.value)}
                      placeholder="157600"
                      className="w-full p-3.5 rounded-xl bg-[#11161C] text-[#F4F1EA] font-black text-base border border-white/10 focus:border-[#D9B978] outline-none text-start"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      {localLanguage === 'en' ? 'YER Aden' : 'ريال يمني'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#0A0D10] p-3.5 rounded-2xl border border-white/5 space-y-2">
                    <label className="text-[10px] font-black text-slate-300 block">
                      🇪🇬 {localLanguage === 'en' ? '100 SAR in Egyptian Pound:' : '100 ريال سعودي بالجنيه المصري:'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={manualEgp100}
                      onChange={e => setManualEgp100(e.target.value)}
                      placeholder="1250"
                      className="w-full p-3 rounded-xl bg-[#11161C] text-[#F4F1EA] font-black text-sm border border-white/10 focus:border-[#D9B978] outline-none text-start"
                    />
                  </div>

                  <div className="bg-[#0A0D10] p-3.5 rounded-2xl border border-white/5 space-y-2">
                    <label className="text-[10px] font-black text-slate-300 block">
                      🇺🇸 {localLanguage === 'en' ? '1 USD rate in SAR:' : 'سعر 1 دولار بالريال السعودي:'}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={manualUsdInSar}
                      onChange={e => setManualUsdInSar(e.target.value)}
                      placeholder="3.844"
                      className="w-full p-3 rounded-xl bg-[#11161C] text-[#F4F1EA] font-black text-sm border border-white/10 focus:border-[#D9B978] outline-none text-start"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={handleSaveAllManualRates}
                  className="w-full py-3.5 bg-[#D9B978] hover:bg-[#c9a764] text-[#0A0D10] rounded-xl font-black text-xs active:scale-95 shadow-lg shadow-[#D9B978]/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={16} strokeWidth={3} />
                  <span>{localLanguage === 'en' ? 'Save & Apply Exchange Rates to App' : 'حفظ وتطبيق أسعار الصرف في كافة الحسابات'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleApplyYemenPreset}
                    className="py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-[11px] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🇾🇪 {localLanguage === 'en' ? 'Apply Yemen Preset' : 'تطبيق أسعار اليمن'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaultRates}
                    className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl font-bold text-[11px] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>{localLanguage === 'en' ? 'Reset Defaults' : 'استعادة الافتراضيات'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('currencies')}
                  className="w-full py-2.5 bg-[#0A0D10] hover:bg-white/5 text-[#D9B978] border border-[#D9B978]/30 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Coins size={14} />
                  <span>{localLanguage === 'en' ? 'Open Full FX Manager & Live Converter' : 'فتح الإدارة الكاملة للعملات والحاسبة التجريبية'}</span>
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
                              type="text" 
                              inputMode="numeric"
                              value={localPin} 
                              onChange={e => {
                                const sanitized = sanitizeNumericInput(e.target.value, false);
                                const val = sanitized.replace(/\D/g, '').slice(0, 4);
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
