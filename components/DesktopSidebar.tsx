import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  History, 
  HandCoins, 
  Settings as SettingsIcon, 
  Plus, 
  Sparkles, 
  Globe, 
  Wallet as WalletIcon, 
  PiggyBank, 
  PieChart, 
  Repeat, 
  Calculator,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  TrendingUp,
  BookOpen,
  Bell
} from 'lucide-react';
import { Logo } from './Logo';
import { Currency, Wallet } from '../types';
import { getLocalizedCurrency } from '../utils/translations';
import { NativeHaptics } from '../services/nativeServices';

export type TabType = 'dashboard' | 'forecast' | 'budgets' | 'debts' | 'reports' | 'transactions' | 'chat' | 'subscriptions' | 'settings' | 'goals' | 'zakat';

interface DesktopSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewTransaction: () => void;
  language: 'ar' | 'en';
  onToggleLanguage: () => void;
  selectedWalletId: string | null;
  wallets: Wallet[];
  onOpenWalletSelector: () => void;
  currency: Currency;
  onOpenCurrencySelector: () => void;
  onOpenToolsHub: () => void;
  onOpenAlerts?: () => void;
  alertsCount?: number;
  hasPendingAlerts?: boolean;
  userName?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  onNewTransaction,
  language = 'ar',
  onToggleLanguage,
  selectedWalletId,
  wallets,
  onOpenWalletSelector,
  currency,
  onOpenCurrencySelector,
  onOpenToolsHub,
  onOpenAlerts,
  alertsCount = 0,
  hasPendingAlerts = false,
  userName = ''
}) => {
  const isEn = language === 'en';
  const isRtl = !isEn;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('thari_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('thari_sidebar_collapsed', String(next));
      } catch {}
      NativeHaptics.selection().catch(() => {});
      return next;
    });
  };

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: isEn ? 'Wallets & Operations' : 'العمليات والمحافظ',
      shortLabel: isEn ? 'Wallets' : 'المحافظ',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'forecast' as TabType,
      label: isEn ? 'Cashflow & Runway' : 'التخطيط والتدفق النقدي',
      shortLabel: isEn ? 'Forecast' : 'التخطيط',
      icon: TrendingUp,
      badge: 'جديد'
    },
    {
      id: 'budgets' as TabType,
      label: isEn ? 'Budgets & Limits' : 'الميزانيات والتحليلات',
      shortLabel: isEn ? 'Budgets' : 'الميزانيات',
      icon: PieChart,
      badge: null
    },
    {
      id: 'debts' as TabType,
      label: isEn ? 'Debts & Liabilities' : 'الديون والالتزامات',
      shortLabel: isEn ? 'Debts' : 'الديون',
      icon: HandCoins,
      badge: null
    },
    {
      id: 'reports' as TabType,
      label: isEn ? 'Bank Statements' : 'كشف الحساب والتقارير',
      shortLabel: isEn ? 'Reports' : 'كشف الحساب',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'goals' as TabType,
      label: isEn ? 'Savings Goals' : 'الأهداف والادخار',
      shortLabel: isEn ? 'Goals' : 'الأهداف',
      icon: PiggyBank,
      badge: null
    },
    {
      id: 'subscriptions' as TabType,
      label: isEn ? 'Subscriptions' : 'الاشتراكات الدورية',
      shortLabel: isEn ? 'Subs' : 'الاشتراكات',
      icon: Repeat,
      badge: null
    },
    {
      id: 'zakat' as TabType,
      label: isEn ? 'Zakat Calculator' : 'حاسبة الزكاة الذكية',
      shortLabel: isEn ? 'Zakat' : 'الزكاة',
      icon: Calculator,
      badge: null
    },
    {
      id: 'settings' as TabType,
      label: isEn ? 'Settings & Vault' : 'الإعدادات والخزينة',
      shortLabel: isEn ? 'Settings' : 'الإعدادات',
      icon: SettingsIcon,
      badge: null
    }
  ];

  const currentWalletName = selectedWalletId 
    ? wallets.find(w => w.id === selectedWalletId)?.name || (isEn ? 'Selected' : 'المحددة')
    : (isEn ? 'All Wallets' : 'كافة المحافظ');

  const locCurr = getLocalizedCurrency(currency.code || 'SAR', currency.name, currency.symbol, language);

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out border-${isRtl ? 'l' : 'r'} border-white/[0.07] bg-[#0A0D10]/95 backdrop-blur-2xl select-none shadow-[0_0_50px_rgba(0,0,0,0.6)] ${
        isCollapsed ? 'w-[78px]' : 'w-[268px]'
      }`}
      aria-label="قائمة التنقل الجانبية"
    >
      {/* 1. Header & Brand Section */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06] min-h-[72px]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo size={28} showText={false} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-[#F7F1E6]">
                  {isEn ? 'THARI' : 'ثـري'}
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-[#D9B978]/15 text-[#D9B978] border border-[#D9B978]/30">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                {userName || (isEn ? 'Sovereign Wealth' : 'الخزينة الشخصية')}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <Logo size={28} showText={false} />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* Smart Alerts Center Button */}
          {onOpenAlerts && (
            <button
              type="button"
              onClick={onOpenAlerts}
              className={`relative p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#D9B978] border border-white/5 hover:border-[#D9B978]/30 transition-all cursor-pointer active:scale-95 ${
                isCollapsed ? 'hidden' : 'flex'
              }`}
              title={isEn ? 'Smart Alerts Center' : 'مركز التنبيهات الذكية'}
            >
              <Bell size={15} />
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-xs">
                  {alertsCount}
                </span>
              )}
            </button>
          )}

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className={`p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/5 transition-all cursor-pointer active:scale-95 ${
              isCollapsed ? 'hidden' : 'flex'
            }`}
            title={isCollapsed ? (isEn ? 'Expand sidebar' : 'توسيع القائمة') : (isEn ? 'Collapse sidebar' : 'طي القائمة')}
            aria-label={isCollapsed ? 'توسيع' : 'طي'}
          >
            {isRtl ? (
              isCollapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />
            ) : (
              isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />
            )}
          </button>
        </div>
      </div>

      {/* 2. Primary Action: Luminous Golden Add Button */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            NativeHaptics.impact('MEDIUM').catch(() => {});
            onNewTransaction();
          }}
          className={`w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#D9B978] to-[#C9A45C] hover:from-[#E3C588] hover:to-[#D4B066] text-slate-950 font-black text-xs shadow-[0_8px_25px_rgba(217,185,120,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95 border border-white/20 ${
            isCollapsed ? 'px-0 justify-center h-11' : ''
          }`}
          title={isEn ? 'Add Transaction (+)' : 'إضافة معاملة جديدة (+)'}
        >
          <div className="w-6 h-6 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
            <Plus size={16} strokeWidth={3} className="text-slate-950" />
          </div>
          {!isCollapsed && (
            <span className="tracking-wide font-black truncate">
              {isEn ? 'New Transaction' : 'إضافة معاملة'}
            </span>
          )}
        </motion.button>
      </div>

      {/* 3. Navigation Items Scroll Area */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                NativeHaptics.selection().catch(() => {});
                onTabChange(item.id);
              }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer relative group text-start active:scale-[0.98] ${
                isActive
                  ? 'bg-gradient-to-r from-[#D9B978]/15 via-[#D9B978]/10 to-transparent text-[#F4F1EA] border border-[#D9B978]/35 shadow-[0_4px_20px_rgba(217,185,120,0.08)] font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
              } ${isCollapsed ? 'justify-center px-0 h-11' : ''}`}
            >
              {/* Luminous Active Accent Line */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className={`absolute top-2 bottom-2 w-1 rounded-full bg-[#D9B978] shadow-[0_0_10px_#D9B978] ${
                    isRtl ? 'right-0' : 'left-0'
                  }`}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#D9B978] text-slate-950 shadow-xs'
                    : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-white/5'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {!isCollapsed && (
                <span className="text-xs truncate flex-1 tracking-tight">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. Financial Context & Quick Settings (Wallet & Currency Quick Selectors) */}
      <div className="p-3 border-t border-white/[0.06] space-y-2 bg-[#080B0E]/60">
        {!isCollapsed ? (
          <div className="grid grid-cols-2 gap-1.5">
            {/* Wallet Quick Button */}
            <button
              type="button"
              onClick={onOpenWalletSelector}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-slate-300 text-[11px] font-bold transition-all truncate cursor-pointer active:scale-95"
              title={isEn ? 'Switch Wallet' : 'المحافظ والحسابات'}
            >
              <WalletIcon size={12} className="text-[#8EB9A7] shrink-0" />
              <span className="truncate">{currentWalletName}</span>
            </button>

            {/* Currency Quick Button */}
            <button
              type="button"
              onClick={onOpenCurrencySelector}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-slate-300 text-[11px] font-bold transition-all truncate cursor-pointer active:scale-95"
              title={isEn ? 'Switch Currency' : 'العملة الأساسية'}
            >
              <span className="text-[#D9B978] font-black text-[10px] shrink-0">{locCurr.symbol}</span>
              <span className="truncate">{currency.code}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenWalletSelector}
              className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-center text-[#8EB9A7] cursor-pointer"
              title={currentWalletName}
            >
              <WalletIcon size={15} />
            </button>
          </div>
        )}

        {/* Utilities Bar: Language Toggle, Tools Hub & Sovereignty Badge */}
        <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col gap-2' : ''}`}>
          <div className="flex items-center gap-1">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLanguage}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-[#D9B978] border border-white/5 transition-all text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95"
              title={isEn ? 'التحويل إلى العربية' : 'Switch to English'}
            >
              <Globe size={13} className="text-[#D9B978]" />
              {!isCollapsed && <span>{isEn ? 'عربي' : 'EN'}</span>}
            </button>

            {/* Tools Hub Button */}
            <button
              type="button"
              onClick={onOpenToolsHub}
              className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-[#D9B978] border border-white/5 transition-all cursor-pointer active:scale-95"
              title={isEn ? 'Tools Hub & Reports' : 'مركز الأدوات والتقارير'}
            >
              <Sparkles size={14} />
              {hasPendingAlerts && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D9B978] ring-2 ring-[#0A0D10]" />
              )}
            </button>
          </div>

          {/* Offline Sovereignty Indicator */}
          {!isCollapsed ? (
            <div 
              className="flex items-center gap-1 text-[10px] text-slate-500 font-bold px-2 py-1 rounded-lg bg-white/[0.02] border border-white/5"
              title="البيانات مشفرة ومحفوظة محلياً 100%"
            >
              <WifiOff size={10} className="text-[#D9B978]" />
              <span>{isEn ? '100% Local' : 'محلي 100%'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/5 cursor-pointer"
              title={isEn ? 'Expand sidebar' : 'توسيع القائمة'}
            >
              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
