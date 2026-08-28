import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scale, 
  Coins, 
  Layers, 
  ShieldCheck, 
  Calendar, 
  Plus, 
  RotateCcw, 
  Check, 
  Trash2, 
  Sparkles, 
  Clock,
  Wallet as WalletIcon,
  HandCoins,
  Gem,
  Building,
  TrendingUp,
  X,
  FileCheck,
  Landmark,
  BadgeAlert,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { Wallet, Transaction, Debt, Currency, ZakatProfile, ZakatPaymentRecord } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { getTranslation } from '../utils/translations';
import { formatFinancialNumber } from './ElegantDashboard';
import { StatsGrid } from './StatsGrid';
import { AssetItemRow } from './AssetItemRow';
import { ZakatAssetConfigModal, ZakatModalCategory } from './ZakatAssetConfigModal';
import { safeAdd, safeSub, safeMul, safeDiv, safePercent, roundToCurrency } from '../utils/mathPrecision';

interface ZakatCalculatorProps {
  totalBalance?: number;
  currencySymbol?: string;
  debts?: Debt[];
  wallets?: Wallet[];
  transactions?: Transaction[];
  currencies?: Currency[];
  currentCurrency?: Currency;
  exchangeRates?: Record<string, number>;
  zakatProfiles?: ZakatProfile[];
  zakatPayments?: ZakatPaymentRecord[];
  onSaveProfiles?: (profiles: ZakatProfile[]) => void;
  onSavePayments?: (payments: ZakatPaymentRecord[]) => void;
  language?: 'ar' | 'en';
}

const BASE_GOLD_PRICE_SAR = 320;
const BASE_SILVER_PRICE_SAR = 4.2;

export type UnifiedZakatCategory = 
  | 'cash_liquidity'
  | 'metals_gold'
  | 'stocks_invest'
  | 'realestate_assets'
  | 'debts_liabilities';

export interface KaratRates {
  price24k: number;
  price21k: number;
  price18k: number;
  priceSilver: number;
  custom21k: number | null;
  custom18k: number | null;
  customSilver: number | null;
}

export function calculateAssetZakat(
  profile: ZakatProfile,
  scopedCashInBase: number,
  debtsToMeIncluded: number,
  debtsOnMeIncluded: number,
  rates: KaratRates
) {
  const g24 = Number(profile.gold24Grams) || 0;
  const g21 = Number(profile.gold21Grams) || 0;
  const g18 = Number(profile.gold18Grams) || 0;
  const silver = Number(profile.silverGrams) || 0;

  const val24 = safeMul(g24, rates.price24k);
  const val21 = safeMul(g21, rates.price21k);
  const val18 = safeMul(g18, rates.price18k);
  const totalGoldVal = safeAdd(val24, val21, val18);
  const totalSilverVal = safeMul(silver, rates.priceSilver);
  const totalMetalsVal = safeAdd(totalGoldVal, totalSilverVal);

  const tradeInv = Number(profile.tradeInventoryValue) || 0;
  const tradingStocks = Number(profile.tradingStocksValue) || 0;
  const reTrade = Number(profile.realEstateTradeValue) || 0;
  const fundsVal = Number(profile.investmentFundsValue) || 0;
  const rentIncome = Number(profile.rentalIncomeValue) || 0;

  let longTermBase = 0;
  if (profile.investmentStocksMethod === 'liquid_ratio') {
    longTermBase = safeMul(Number(profile.longTermStocksValue) || 0, 0.10);
  } else {
    longTermBase = Number(profile.longTermDividendsValue) || 0;
  }

  const totalCommercial = safeAdd(tradeInv, tradingStocks, longTermBase, reTrade, fundsVal, rentIncome);

  const grossAssets = safeAdd(scopedCashInBase, debtsToMeIncluded, totalMetalsVal, totalCommercial);
  const customDeductions = Number(profile.customDeductions) || 0;
  const totalDeductions = safeAdd(debtsOnMeIncluded, customDeductions);
  const netBase = Math.max(0, safeSub(grossAssets, totalDeductions));

  const nisabThreshold = safeMul(85, rates.price24k);
  const silverNisabThreshold = safeMul(595, rates.priceSilver);
  const hasReachedNisab = netBase >= nisabThreshold && nisabThreshold > 0;

  const startDate = profile.hawlStartDate ? new Date(profile.hawlStartDate) : new Date();
  const today = new Date();
  const elapsedDays = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalHawlDays = profile.hawlDurationDays || 354;
  const remainingDays = Math.max(0, totalHawlDays - elapsedDays);
  const isHawlCompleted = elapsedDays >= totalHawlDays;

  const zakatRate = 0.025;
  const estimatedZakat = hasReachedNisab ? roundToCurrency(safePercent(netBase, 2.5), 2) : 0;

  return {
    g24, g21, g18, silver,
    val24, val21, val18,
    totalGoldVal, totalSilverVal, totalMetalsVal,
    tradeInv, tradingStocks, longTermBase, reTrade, fundsVal, rentIncome, totalCommercial,
    grossAssets,
    totalDeductions,
    customDeductions,
    netBase,
    nisabThreshold,
    silverNisabThreshold,
    hasReachedNisab,
    elapsedDays,
    totalHawlDays,
    remainingDays,
    isHawlCompleted,
    zakatRate,
    estimatedZakat
  };
}

export const ZakatCalculator: React.FC<ZakatCalculatorProps> = ({
  totalBalance = 0,
  currencySymbol = 'ر.س',
  debts = [],
  wallets = [],
  transactions = [],
  currencies = [],
  currentCurrency = { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  exchangeRates = DEFAULT_EXCHANGE_RATES,
  zakatProfiles,
  zakatPayments = [],
  onSaveProfiles,
  onSavePayments,
  language = 'ar'
}) => {
  const t = getTranslation(language);
  const baseCurrencyCode = currentCurrency.code || 'SAR';
  const displaySymbol = currentCurrency.symbol || currencySymbol || baseCurrencyCode;

  const [profiles, setProfiles] = useState<ZakatProfile[]>(() => {
    if (zakatProfiles && zakatProfiles.length > 0) return zakatProfiles;
    
    const saved = localStorage.getItem('thari_zakat_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    const defaultProfile: ZakatProfile = {
      id: 'zp-personal-default',
      name: language === 'ar' ? 'زكاة أموالي الشخصية' : 'Personal Wealth Zakat',
      description: language === 'ar' ? 'النطاق المالي الشامل للمحافظ والمدخرات والذهب الشخصي' : 'Comprehensive financial scope for wallets, savings, and gold',
      scopeType: 'all',
      selectedWalletIds: wallets.map(w => w.id),
      includeDebtsToMe: true,
      includeDebtsOnMe: true,
      gold24Grams: 0,
      gold21Grams: 0,
      gold18Grams: 0,
      silverGrams: 0,
      tradeInventoryValue: 0,
      tradingStocksValue: 0,
      investmentStocksMethod: 'liquid_ratio',
      longTermStocksValue: 0,
      longTermDividendsValue: 0,
      investmentFundsValue: 0,
      realEstateTradeValue: 0,
      rentalIncomeValue: 0,
      hawlStartDate: new Date(Date.now() - 336 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hawlDurationDays: 354,
      customDeductions: 0,
      isScopeConfirmed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return [defaultProfile];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => profiles[0]?.id || 'zp-personal-default');
  const [payments, setPayments] = useState<ZakatPaymentRecord[]>(() => {
    if (zakatPayments && zakatPayments.length > 0) return zakatPayments;
    const saved = localStorage.getItem('thari_zakat_payments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [activeCategoryTab, setActiveCategoryTab] = useState<UnifiedZakatCategory>('cash_liquidity');

  const computeDefaultGoldPrice = (code: string): number => {
    try {
      const converted = convertCurrency(BASE_GOLD_PRICE_SAR, 'SAR', code, exchangeRates);
      return Math.round(converted > 0 ? converted : BASE_GOLD_PRICE_SAR);
    } catch {
      return BASE_GOLD_PRICE_SAR;
    }
  };

  const [goldPrice24k, setGoldPrice24k] = useState<number>(() => computeDefaultGoldPrice(baseCurrencyCode));
  const [customPrice21k, setCustomPrice21k] = useState<number | null>(null);
  const [customPrice18k, setCustomPrice18k] = useState<number | null>(null);
  const [customSilverPrice, setCustomSilverPrice] = useState<number | null>(null);

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configModalCategory, setConfigModalCategory] = useState<ZakatModalCategory>('metals_rates');
  const [showNewProfileModal, setShowNewProfileModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showHawlResetConfirm, setShowHawlResetConfirm] = useState<boolean>(false);
  const [editingProfileName, setEditingProfileName] = useState<string>('');

  const openCategoryConfig = (cat: ZakatModalCategory) => {
    setConfigModalCategory(cat);
    setShowConfigModal(true);
  };

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRecipient, setPaymentRecipient] = useState('');
  const [paymentWalletId, setPaymentWalletId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const activeProfile = useMemo(() => {
    return profiles.find(p => p.id === activeProfileId) || profiles[0] || {
      id: 'temp',
      name: t.zakatTitle,
      scopeType: 'all',
      selectedWalletIds: wallets.map(w => w.id),
      includeDebtsToMe: true,
      includeDebtsOnMe: true,
      gold24Grams: 0,
      gold21Grams: 0,
      gold18Grams: 0,
      silverGrams: 0,
      tradeInventoryValue: 0,
      tradingStocksValue: 0,
      investmentStocksMethod: 'liquid_ratio',
      longTermStocksValue: 0,
      longTermDividendsValue: 0,
      investmentFundsValue: 0,
      realEstateTradeValue: 0,
      rentalIncomeValue: 0,
      hawlStartDate: new Date().toISOString().split('T')[0],
      hawlDurationDays: 354,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as ZakatProfile;
  }, [profiles, activeProfileId, wallets, t.zakatTitle]);

  const updateProfiles = (newProfiles: ZakatProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('thari_zakat_profiles', JSON.stringify(newProfiles));
    if (onSaveProfiles) onSaveProfiles(newProfiles);
  };

  const updateActiveProfile = (partial: Partial<ZakatProfile>) => {
    const updated = profiles.map(p => {
      if (p.id === activeProfile.id) {
        return { ...p, ...partial, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    updateProfiles(updated);
  };

  useEffect(() => {
    setGoldPrice24k(computeDefaultGoldPrice(baseCurrencyCode));
  }, [baseCurrencyCode, exchangeRates]);

  const karatRates: KaratRates = useMemo(() => {
    const p24 = goldPrice24k;
    const p21 = customPrice21k !== null ? customPrice21k : (goldPrice24k * 21) / 24;
    const p18 = customPrice18k !== null ? customPrice18k : (goldPrice24k * 18) / 24;
    const pSilver = customSilverPrice !== null ? customSilverPrice : (goldPrice24k * BASE_SILVER_PRICE_SAR) / BASE_GOLD_PRICE_SAR;
    return {
      price24k: p24,
      price21k: p21,
      price18k: p18,
      priceSilver: pSilver,
      custom21k: customPrice21k,
      custom18k: customPrice18k,
      customSilver: customSilverPrice
    };
  }, [goldPrice24k, customPrice21k, customPrice18k, customSilverPrice]);

  const allWalletBalances = useMemo(() => {
    return wallets.map(wallet => {
      let balance = 0;
      transactions.forEach(tx => {
        if (tx.isDeleted) return;
        const amt = Number(tx.amount) || 0;
        const conv = Number(tx.convertedAmountInWalletCurrency) || amt;

        if (tx.walletId === wallet.id) {
          if (tx.type === 'income') balance += conv;
          else if (tx.type === 'expense') balance -= conv;
          else if (tx.type === 'transfer') balance -= amt;
          else if (tx.type === 'adjustment') balance = amt;
        } else if (tx.destinationWalletId === wallet.id && tx.type === 'transfer') {
          balance += (tx.destinationAmount || amt);
        }
      });

      const nativeBalance = Math.max(0, balance);
      let balanceInBase = 0;
      try {
        balanceInBase = convertCurrency(nativeBalance, wallet.currencyCode || 'SAR', baseCurrencyCode, exchangeRates);
      } catch {
        balanceInBase = nativeBalance;
      }

      return {
        id: wallet.id,
        name: wallet.name,
        currencyCode: wallet.currencyCode || 'SAR',
        nativeBalance,
        balanceInBase
      };
    });
  }, [wallets, transactions, baseCurrencyCode, exchangeRates]);

  const scopedWallets = useMemo(() => {
    if (activeProfile.scopeType === 'all') {
      return allWalletBalances;
    }
    const selectedIds = new Set(activeProfile.selectedWalletIds || []);
    return allWalletBalances.filter(w => selectedIds.has(w.id));
  }, [activeProfile.scopeType, activeProfile.selectedWalletIds, allWalletBalances]);

  const scopedCashInBase = useMemo(() => {
    return scopedWallets.reduce((sum, w) => sum + w.balanceInBase, 0);
  }, [scopedWallets]);

  const scopedDebts = useMemo(() => {
    let toMe = 0;
    let onMe = 0;

    debts.forEach(d => {
      if (d.isPaid || d.status === 'settled') return;
      const remaining = Math.max(0, (Number(d.amount) || 0) - (Number(d.paidAmount) || 0));
      let amtInBase = 0;
      try {
        amtInBase = convertCurrency(remaining, d.currency || 'SAR', baseCurrencyCode, exchangeRates);
      } catch {
        amtInBase = remaining;
      }

      if (d.type === 'to_me') {
        toMe += amtInBase;
      } else if (d.type === 'on_me') {
        onMe += amtInBase;
      }
    });

    const includedToMe = activeProfile.includeDebtsToMe ? toMe : 0;
    const includedOnMe = activeProfile.includeDebtsOnMe ? onMe : 0;

    return {
      toMeTotal: toMe,
      onMeTotal: onMe,
      includedToMe,
      includedOnMe
    };
  }, [debts, activeProfile.includeDebtsToMe, activeProfile.includeDebtsOnMe, baseCurrencyCode, exchangeRates]);

  const zakat = useMemo(() => {
    return calculateAssetZakat(
      activeProfile,
      scopedCashInBase,
      scopedDebts.includedToMe,
      scopedDebts.includedOnMe,
      karatRates
    );
  }, [activeProfile, scopedCashInBase, scopedDebts, karatRates]);

  const handleCreateProfile = () => {
    if (!editingProfileName.trim()) return;
    const newId = 'zp-' + Date.now();
    const newProfile: ZakatProfile = {
      id: newId,
      name: editingProfileName.trim(),
      description: language === 'ar' ? 'ملف زكاة مخصص' : 'Custom Zakat profile',
      scopeType: 'selected_wallets',
      selectedWalletIds: wallets.map(w => w.id),
      includeDebtsToMe: false,
      includeDebtsOnMe: true,
      gold24Grams: 0,
      gold21Grams: 0,
      gold18Grams: 0,
      silverGrams: 0,
      tradeInventoryValue: 0,
      tradingStocksValue: 0,
      investmentStocksMethod: 'liquid_ratio',
      longTermStocksValue: 0,
      longTermDividendsValue: 0,
      investmentFundsValue: 0,
      realEstateTradeValue: 0,
      rentalIncomeValue: 0,
      hawlStartDate: new Date().toISOString().split('T')[0],
      hawlDurationDays: 354,
      customDeductions: 0,
      isScopeConfirmed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...profiles, newProfile];
    updateProfiles(updated);
    setActiveProfileId(newId);
    setEditingProfileName('');
    setShowNewProfileModal(false);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const updated = profiles.filter(p => p.id !== id);
    updateProfiles(updated);
    setActiveProfileId(updated[0].id);
  };

  const handleStartNewCycle = () => {
    updateActiveProfile({
      hawlStartDate: new Date().toISOString().split('T')[0],
      lastCalculatedAt: new Date().toISOString()
    });
    setShowHawlResetConfirm(false);
  };

  const handleAddPayment = () => {
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) return;

    const newPayment: ZakatPaymentRecord = {
      id: 'zpay-' + Date.now(),
      profileId: activeProfile.id,
      profileName: activeProfile.name,
      amount: amt,
      currency: baseCurrencyCode,
      date: new Date().toISOString().split('T')[0],
      recipient: paymentRecipient.trim() || (language === 'ar' ? 'مستحق زكاة' : 'Zakat Beneficiary'),
      walletId: paymentWalletId || undefined,
      note: paymentNote.trim(),
      cycleYear: new Date().getFullYear().toString()
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    localStorage.setItem('thari_zakat_payments', JSON.stringify(updatedPayments));
    if (onSavePayments) onSavePayments(updatedPayments);

    setPaymentAmount('');
    setPaymentRecipient('');
    setPaymentWalletId('');
    setPaymentNote('');
    setShowPaymentModal(false);
  };

  const categorySummary = useMemo(() => {
    return {
      cashCount: scopedWallets.length,
      metalsGrams: (activeProfile.gold24Grams || 0) + (activeProfile.gold21Grams || 0) + (activeProfile.gold18Grams || 0) + (activeProfile.silverGrams || 0),
      stocksTotal: (activeProfile.tradingStocksValue || 0) + zakat.longTermBase + (activeProfile.investmentFundsValue || 0),
      assetsTotal: (activeProfile.tradeInventoryValue || 0) + (activeProfile.realEstateTradeValue || 0) + (activeProfile.rentalIncomeValue || 0),
      debtsTotal: scopedDebts.includedOnMe + (activeProfile.customDeductions || 0)
    };
  }, [scopedWallets, activeProfile, zakat.longTermBase, scopedDebts]);

  return (
    <div id="zakat-calculator-root" className="w-full max-w-5xl mx-auto space-y-5 pb-16 font-sans text-start bg-[#0A0D10] text-[#F4F1EA]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & PROFILE SELECTOR
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-white/[0.04] pb-3.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale size={18} className="text-[#D9B978]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#D9B978]">
                {t.zakatCalculationHeader}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F1EA]">
              {t.zakatMainTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-gold-price-badge"
              onClick={() => openCategoryConfig('metals_rates')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D9B978]/10 hover:bg-[#D9B978]/20 border border-[#D9B978]/30 text-xs font-medium text-[#D9B978] transition-all active:scale-95 group"
              title={t.editGoldPrices}
            >
              <Sparkles size={13} className="text-[#D9B978] group-hover:scale-110 transition-transform" />
              <span>{t.gold24}: {formatFinancialNumber(karatRates.price24k, true)} {displaySymbol}</span>
            </button>

            <button
              id="btn-new-hawl"
              onClick={() => setShowHawlResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95"
              title={t.startNewHawlCycle}
            >
              <RotateCcw size={13} />
              <span>{t.hawlCycle}</span>
            </button>

            <button
              id="btn-new-profile"
              onClick={() => setShowNewProfileModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D9B978] hover:bg-[#E5C17B] text-[#0A0D10] text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>{t.newProfile}</span>
            </button>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {profiles.map(p => {
            const isActive = p.id === activeProfile.id;
            return (
              <div
                key={p.id}
                className={`group shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-medium ${
                  isActive 
                    ? 'bg-[#F4F1EA] text-[#0A0D10] border-[#F4F1EA] shadow-md font-bold' 
                    : 'bg-[#11161C] border-white/[0.06] text-slate-400 hover:text-[#F4F1EA] hover:bg-white/[0.05]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveProfileId(p.id)}
                  className="flex items-center gap-1.5"
                >
                  <FileCheck size={13} className={isActive ? 'text-[#0A0D10]' : 'text-slate-500'} />
                  <span>{p.name}</span>
                </button>

                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10 text-slate-500 hover:text-rose-400 ${isActive ? 'text-slate-700' : ''}`}
                    title={t.deleteProfile}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. ZAKAT INDICATORS & RESULTS DASHBOARD (HERO STATS CARD)
      ───────────────────────────────────────────────────────────── */}
      <motion.section 
        layout
        className="p-5 sm:p-6 rounded-3xl bg-[#11161C] border border-[#D9B978]/25 space-y-5 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {t.zakatDueAmount}
              </span>
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                zakat.hasReachedNisab 
                  ? 'text-[#8EB9A7] bg-[#8EB9A7]/10 border-[#8EB9A7]/20' 
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}>
                {zakat.hasReachedNisab ? <Check size={12} strokeWidth={2.5} /> : <Clock size={12} />}
                <span>{zakat.hasReachedNisab ? t.reachedNisab : t.belowNisab}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2" dir="ltr">
              <span className="text-4xl sm:text-5xl font-light tracking-tight text-[#F4F1EA] font-numeric">
                {formatFinancialNumber(zakat.estimatedZakat)}
              </span>
              <span className="text-base sm:text-lg font-bold text-[#D9B978]">
                {displaySymbol}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="btn-document-payment"
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8EB9A7] hover:bg-[#7da896] text-[#0A0D10] text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <HandCoins size={15} />
              <span>{t.documentZakatPayment}</span>
            </button>
          </div>
        </div>

        {/* Standardized StatsGrid (Quiet Luxury Tokens) */}
        <div className="pt-4 border-t border-white/[0.06]">
          <StatsGrid
            columns={3}
            theme="dark"
            items={[
              {
                id: 'net-zakatable-pool',
                label: t.netZakatPool,
                value: formatFinancialNumber(zakat.netBase, true),
                currency: displaySymbol,
                subValue: t.afterDeduction,
                accentColor: 'ocean',
                icon: Scale
              },
              {
                id: 'nisab-benchmark',
                label: t.nisabThreshold,
                value: formatFinancialNumber(zakat.nisabThreshold, true),
                currency: displaySymbol,
                accentColor: zakat.hasReachedNisab ? 'sage' : 'amber',
                icon: ShieldCheck,
                badge: {
                  text: zakat.hasReachedNisab ? t.reachedNisab : t.belowNisab,
                  variant: zakat.hasReachedNisab ? 'sage' : 'amber'
                }
              },
              {
                id: 'hawl-tracker',
                label: t.hawlStatus,
                value: zakat.isHawlCompleted ? t.reachedNisab : `${t.daysRemaining} ${zakat.remainingDays} ${t.days}`,
                subValue: `${t.daysRemaining} ${activeProfile.hawlStartDate}`,
                accentColor: zakat.isHawlCompleted ? 'sage' : 'neutral',
                icon: Calendar,
                badge: {
                  text: zakat.isHawlCompleted ? t.reachedNisab : `${zakat.remainingDays} ${t.days}`,
                  variant: zakat.isHawlCompleted ? 'sage' : 'neutral'
                }
              }
            ]}
          />
        </div>
      </motion.section>

      {/* ─────────────────────────────────────────────────────────────
          3. SLEEK SEGMENTED NAVIGATION BAR (5 ASSET CATEGORIES)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div 
          id="unified-zakat-nav"
          className="p-1 rounded-2xl bg-[#11161C] border border-white/[0.08] flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {/* TAB 1: Cash & Liquidity */}
          <button
            id="tab-cash-liquidity"
            type="button"
            onClick={() => setActiveCategoryTab('cash_liquidity')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center flex items-center justify-center gap-2 shrink-0 ${
              activeCategoryTab === 'cash_liquidity'
                ? 'bg-[#182032] text-[#D9B978] border border-[#D9B978]/35 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Coins size={15} className={activeCategoryTab === 'cash_liquidity' ? 'text-[#D9B978]' : 'text-slate-500'} />
            <span className="whitespace-nowrap">{t.liquidityAndCash}</span>
          </button>

          {/* TAB 2: Metals & Gold */}
          <button
            id="tab-metals-gold"
            type="button"
            onClick={() => setActiveCategoryTab('metals_gold')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center flex items-center justify-center gap-2 shrink-0 ${
              activeCategoryTab === 'metals_gold'
                ? 'bg-[#182032] text-[#D9B978] border border-[#D9B978]/35 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Sparkles size={15} className={activeCategoryTab === 'metals_gold' ? 'text-[#D9B978]' : 'text-slate-500'} />
            <span className="whitespace-nowrap">{t.metalsAndGold}</span>
            {categorySummary.metalsGrams > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9B978]" />
            )}
          </button>

          {/* TAB 3: Stocks & Investment */}
          <button
            id="tab-stocks-invest"
            type="button"
            onClick={() => setActiveCategoryTab('stocks_invest')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center flex items-center justify-center gap-2 shrink-0 ${
              activeCategoryTab === 'stocks_invest'
                ? 'bg-[#182032] text-[#D9B978] border border-[#D9B978]/35 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <TrendingUp size={15} className={activeCategoryTab === 'stocks_invest' ? 'text-[#D9B978]' : 'text-slate-500'} />
            <span className="whitespace-nowrap">{t.stocksAndInvestments}</span>
          </button>

          {/* TAB 4: Real Estate & Assets */}
          <button
            id="tab-realestate-assets"
            type="button"
            onClick={() => setActiveCategoryTab('realestate_assets')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center flex items-center justify-center gap-2 shrink-0 ${
              activeCategoryTab === 'realestate_assets'
                ? 'bg-[#182032] text-[#D9B978] border border-[#D9B978]/35 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <Building size={15} className={activeCategoryTab === 'realestate_assets' ? 'text-[#D9B978]' : 'text-slate-500'} />
            <span className="whitespace-nowrap">{t.realEstateAndAssets}</span>
          </button>

          {/* TAB 5: Debts & Liabilities */}
          <button
            id="tab-debts-liabilities"
            type="button"
            onClick={() => setActiveCategoryTab('debts_liabilities')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center flex items-center justify-center gap-2 shrink-0 ${
              activeCategoryTab === 'debts_liabilities'
                ? 'bg-[#182032] text-[#D9B978] border border-[#D9B978]/35 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            <HandCoins size={15} className={activeCategoryTab === 'debts_liabilities' ? 'text-[#D9B978]' : 'text-slate-500'} />
            <span className="whitespace-nowrap">{t.liabilitiesAndDebts}</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. UNIFIED TAB PANELS WITH ASSET ITEM ROWS
        ───────────────────────────────────────────────────────────── */}
        
        {/* PANEL 1: CASH & LIQUIDITY */}
        {activeCategoryTab === 'cash_liquidity' && (
          <motion.div
            key="tab-cash-liquidity-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="p-3 rounded-2xl bg-[#11161C] border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Coins size={14} className="text-[#D9B978]" />
                <span>{t.manageZakatLiquidity}</span>
                <span className="text-[#D9B978] font-numeric font-semibold">
                  {formatFinancialNumber(scopedCashInBase, true)} {displaySymbol}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openCategoryConfig('cash_liquidity')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1"
              >
                <SlidersHorizontal size={12} />
                <span>{t.allocateLiquidity}</span>
              </button>
            </div>

            <AssetItemRow
              id="cash-liquidity-total"
              icon={<Coins size={18} />}
              iconBg="bg-teal-500/10 border-teal-500/20"
              iconColor="text-teal-400"
              title={t.totalCashLiquidity}
              codeBadge="CASH"
              badgeColor="bg-teal-500/10 text-teal-400 border-teal-500/20"
              description={t.cashLiquidityDesc}
              valueDisplay={formatFinancialNumber(scopedCashInBase)}
              currencyCode={displaySymbol}
            />


          </motion.div>
        )}

        {/* PANEL 2: METALS & GOLD */}
        {activeCategoryTab === 'metals_gold' && (
          <motion.div
            key="tab-metals-gold-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="p-3 rounded-2xl bg-[#11161C] border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles size={14} className="text-[#D9B978]" />
                <span>{t.approvedGramPrices}</span>
                <span className="text-[#D9B978] font-numeric font-semibold">24k: {formatFinancialNumber(karatRates.price24k, true)}</span>
                <span className="text-slate-500">|</span>
                <span className="text-[#D9B978] font-numeric font-semibold">21k: {formatFinancialNumber(karatRates.price21k, true)}</span>
                <span className="text-slate-500">|</span>
                <span className="text-[#D9B978] font-numeric font-semibold">18k: {formatFinancialNumber(karatRates.price18k, true)} {displaySymbol}</span>
              </div>
              <button
                type="button"
                onClick={() => openCategoryConfig('metals_rates')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1"
              >
                <SlidersHorizontal size={12} />
                <span>{t.editPricesAndKarats}</span>
              </button>
            </div>

            <AssetItemRow
              id="gold-24k"
              icon={<Sparkles size={18} />}
              iconBg="bg-amber-500/10 border-amber-500/20"
              iconColor="text-amber-400"
              title={t.gold24KPure}
              codeBadge="Au 24"
              badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
              description={`${t.approvedGramPrices} ${formatFinancialNumber(karatRates.price24k, true)} ${displaySymbol}`}
              valueDisplay={formatFinancialNumber(zakat.val24)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.ownedWeight}</label>
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={activeProfile.gold24Grams || ''}
                    onChange={(e) => updateActiveProfile({ gold24Grams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-amber-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {t.grams}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="gold-21k"
              icon={<Sparkles size={18} />}
              iconBg="bg-amber-500/10 border-amber-500/20"
              iconColor="text-amber-400"
              title={t.gold21KInvest}
              codeBadge="Au 21"
              badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
              description={`${t.approvedGramPrices} ${formatFinancialNumber(karatRates.price21k, true)} ${displaySymbol}`}
              valueDisplay={formatFinancialNumber(zakat.val21)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.ownedWeight}</label>
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={activeProfile.gold21Grams || ''}
                    onChange={(e) => updateActiveProfile({ gold21Grams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-amber-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {t.grams}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="gold-18k"
              icon={<Sparkles size={18} />}
              iconBg="bg-amber-500/10 border-amber-500/20"
              iconColor="text-amber-400"
              title={t.gold18KOrnaments}
              codeBadge="Au 18"
              badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
              description={`${t.approvedGramPrices} ${formatFinancialNumber(karatRates.price18k, true)} ${displaySymbol}`}
              valueDisplay={formatFinancialNumber(zakat.val18)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.ownedWeight}</label>
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={activeProfile.gold18Grams || ''}
                    onChange={(e) => updateActiveProfile({ gold18Grams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-amber-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {t.grams}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="silver-bullion"
              icon={<Gem size={18} />}
              iconBg="bg-slate-500/10 border-slate-400/20"
              iconColor="text-slate-300"
              title={t.pureSilverGrams}
              codeBadge="Ag"
              badgeColor="bg-slate-500/15 text-slate-300 border-slate-400/30"
              description={`${t.approvedGramPrices} ${formatFinancialNumber(karatRates.priceSilver, true)} ${displaySymbol}`}
              valueDisplay={formatFinancialNumber(zakat.totalSilverVal)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.ownedWeightSilverGrams}</label>
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={activeProfile.silverGrams || ''}
                    onChange={(e) => updateActiveProfile({ silverGrams: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-slate-300 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {t.grams}
                  </span>
                </div>
              </div>
            </AssetItemRow>
          </motion.div>
        )}

        {/* PANEL 3: STOCKS & INVESTMENT */}
        {activeCategoryTab === 'stocks_invest' && (
          <motion.div
            key="tab-stocks-invest-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="p-3 rounded-2xl bg-[#11161C] border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <TrendingUp size={14} className="text-[#D9B978]" />
                <span>{t.stocksInvestManagement}</span>
              </div>
              <button
                type="button"
                onClick={() => openCategoryConfig('stocks_invest')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1"
              >
                <SlidersHorizontal size={12} />
                <span>{t.editStocksAndInvestments}</span>
              </button>
            </div>

            <AssetItemRow
              id="trading-stocks"
              icon={<TrendingUp size={18} />}
              iconBg="bg-blue-500/10 border-blue-500/20"
              iconColor="text-blue-400"
              title={t.tradingStocks}
              codeBadge="STK-TRD"
              badgeColor="bg-blue-500/15 text-blue-400 border-blue-500/30"
              description={t.tradingStocksDesc}
              valueDisplay={formatFinancialNumber(activeProfile.tradingStocksValue || 0)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.currentMarketValue}</label>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={activeProfile.tradingStocksValue || ''}
                    onChange={(e) => updateActiveProfile({ tradingStocksValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-blue-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {displaySymbol}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="longterm-stocks"
              icon={<Landmark size={18} />}
              iconBg="bg-indigo-500/10 border-indigo-500/20"
              iconColor="text-indigo-400"
              title={t.longTermStocks}
              codeBadge="STK-DIV"
              badgeColor="bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
              description={t.longTermStocksDesc}
              valueDisplay={formatFinancialNumber(zakat.longTermBase)}
              currencyCode={displaySymbol}
              actionElement={
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => updateActiveProfile({ investmentStocksMethod: 'liquid_ratio' })}
                    className={`py-1 px-2.5 rounded-lg border transition-all ${
                      activeProfile.investmentStocksMethod === 'liquid_ratio'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.assetRatio10}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveProfile({ investmentStocksMethod: 'dividends_only' })}
                    className={`py-1 px-2.5 rounded-lg border transition-all ${
                      activeProfile.investmentStocksMethod === 'dividends_only'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.dividendsOnly}
                  </button>
                </div>
              }
            >
              <div className="pt-1">
                {activeProfile.investmentStocksMethod === 'liquid_ratio' ? (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 shrink-0">{t.totalPortfolioValue}</label>
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={activeProfile.longTermStocksValue || ''}
                        onChange={(e) => updateActiveProfile({ longTermStocksValue: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 focus:border-indigo-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 shrink-0">{t.receivedDividends}</label>
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={activeProfile.longTermDividendsValue || ''}
                        onChange={(e) => updateActiveProfile({ longTermDividendsValue: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 focus:border-indigo-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="investment-funds"
              icon={<Layers size={18} />}
              iconBg="bg-violet-500/10 border-violet-500/20"
              iconColor="text-violet-400"
              title={t.investmentFundsAndSukuk}
              codeBadge="FND-SKK"
              badgeColor="bg-violet-500/15 text-violet-400 border-violet-500/30"
              description={t.fundsSukukDesc}
              valueDisplay={formatFinancialNumber(activeProfile.investmentFundsValue || 0)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.totalFundsValue}</label>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={activeProfile.investmentFundsValue || ''}
                    onChange={(e) => updateActiveProfile({ investmentFundsValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-violet-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {displaySymbol}
                  </span>
                </div>
              </div>
            </AssetItemRow>
          </motion.div>
        )}

        {/* PANEL 4: REAL ESTATE & ASSETS */}
        {activeCategoryTab === 'realestate_assets' && (
          <motion.div
            key="tab-realestate-assets-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="p-3 rounded-2xl bg-[#11161C] border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Building size={14} className="text-[#D9B978]" />
                <span>{t.realEstateManagement}</span>
              </div>
              <button
                type="button"
                onClick={() => openCategoryConfig('realestate_assets')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1"
              >
                <SlidersHorizontal size={12} />
                <span>{t.editRealEstateAndTrade}</span>
              </button>
            </div>

            <AssetItemRow
              id="trade-inventory"
              icon={<Building size={18} />}
              iconBg="bg-amber-500/10 border-amber-500/20"
              iconColor="text-amber-400"
              title={t.tradeInventoryAndGoods}
              codeBadge="INV-TRD"
              badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
              description={t.tradeInventoryDesc}
              valueDisplay={formatFinancialNumber(activeProfile.tradeInventoryValue || 0)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.goodsMarketValue}</label>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={activeProfile.tradeInventoryValue || ''}
                    onChange={(e) => updateActiveProfile({ tradeInventoryValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-amber-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {displaySymbol}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="real-estate-trade"
              icon={<Building size={18} />}
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              iconColor="text-emerald-400"
              title={t.realEstateForTrade}
              codeBadge="EST-TRD"
              badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              description={t.realEstateTradeDesc}
              valueDisplay={formatFinancialNumber(activeProfile.realEstateTradeValue || 0)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.currentRealEstateValue}</label>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={activeProfile.realEstateTradeValue || ''}
                    onChange={(e) => updateActiveProfile({ realEstateTradeValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-emerald-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {displaySymbol}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <AssetItemRow
              id="rental-income"
              icon={<Landmark size={18} />}
              iconBg="bg-cyan-500/10 border-cyan-500/20"
              iconColor="text-cyan-400"
              title={t.rentalIncomeAndYields}
              codeBadge="EST-RNT"
              badgeColor="bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
              description={t.rentalIncomeDesc}
              valueDisplay={formatFinancialNumber(activeProfile.rentalIncomeValue || 0)}
              currencyCode={displaySymbol}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.netCollectedRent}</label>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={activeProfile.rentalIncomeValue || ''}
                    onChange={(e) => updateActiveProfile({ rentalIncomeValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-400 rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {displaySymbol}
                  </span>
                </div>
              </div>
            </AssetItemRow>

            <div className="p-3 rounded-2xl bg-[#11161C] border border-white/[0.05] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Info size={15} className="text-amber-400 shrink-0" />
                <span>{t.fixedAssetsExemptNotice}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#8EB9A7]/10 text-[#8EB9A7] font-bold text-[10px] shrink-0 border border-[#8EB9A7]/20">
                {t.legallyExempt}
              </span>
            </div>
          </motion.div>
        )}

        {/* PANEL 5: DEBTS & LIABILITIES */}
        {activeCategoryTab === 'debts_liabilities' && (
          <motion.div
            key="tab-debts-liabilities-panel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="p-3 rounded-2xl bg-[#11161C] border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <HandCoins size={14} className="text-[#D9B978]" />
                <span>{t.debtsManagement}</span>
              </div>
              <button
                type="button"
                onClick={() => openCategoryConfig('debts_liabilities')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1"
              >
                <SlidersHorizontal size={12} />
                <span>{t.editDebtsAndLiabilities}</span>
              </button>
            </div>

            <AssetItemRow
              id="debts-to-me"
              icon={<HandCoins size={18} />}
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              iconColor="text-emerald-400"
              title={t.receivablesToMe}
              codeBadge="REC-DBT"
              badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              description={t.debtsToMeDesc}
              valueDisplay={formatFinancialNumber(scopedDebts.includedToMe)}
              currencyCode={displaySymbol}
              isPositiveAddition={activeProfile.includeDebtsToMe && scopedDebts.includedToMe > 0}
              actionElement={
                <button
                  type="button"
                  onClick={() => updateActiveProfile({ includeDebtsToMe: !activeProfile.includeDebtsToMe })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    activeProfile.includeDebtsToMe
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Check size={13} className={activeProfile.includeDebtsToMe ? 'opacity-100' : 'opacity-0'} />
                  <span>{activeProfile.includeDebtsToMe ? t.includedInPool : t.excluded}</span>
                </button>
              }
            />

            <AssetItemRow
              id="debts-on-me"
              icon={<HandCoins size={18} />}
              iconBg="bg-[#C98387]/10 border-[#C98387]/20"
              iconColor="text-[#C98387]"
              title={t.payablesOnMe}
              codeBadge="PAY-DBT"
              badgeColor="bg-[#C98387]/15 text-[#C98387] border-[#C98387]/30"
              description={t.debtsOnMeDesc}
              valueDisplay={formatFinancialNumber(scopedDebts.includedOnMe)}
              currencyCode={displaySymbol}
              isDeduction={activeProfile.includeDebtsOnMe && scopedDebts.includedOnMe > 0}
              actionElement={
                <button
                  type="button"
                  onClick={() => updateActiveProfile({ includeDebtsOnMe: !activeProfile.includeDebtsOnMe })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    activeProfile.includeDebtsOnMe
                      ? 'bg-[#C98387]/20 border-[#C98387]/40 text-[#C98387]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Check size={13} className={activeProfile.includeDebtsOnMe ? 'opacity-100' : 'opacity-0'} />
                  <span>{activeProfile.includeDebtsOnMe ? t.deductedFromPool : t.excluded}</span>
                </button>
              }
            />

            <AssetItemRow
              id="custom-deductions"
              icon={<BadgeAlert size={18} />}
              iconBg="bg-[#C98387]/10 border-[#C98387]/20"
              iconColor="text-[#C98387]"
              title={t.urgentOperationalDeductions}
              codeBadge="DED-OPS"
              badgeColor="bg-[#C98387]/15 text-[#C98387] border-[#C98387]/30"
              description={t.customDeductionsDesc}
              valueDisplay={formatFinancialNumber(activeProfile.customDeductions || 0)}
              currencyCode={displaySymbol}
              isDeduction={(activeProfile.customDeductions || 0) > 0}
            >
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-400 shrink-0">{t.additionalDeductionsAmount}</label>
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={activeProfile.customDeductions || ''}
                    onChange={(e) => updateActiveProfile({ customDeductions: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#C98387] rounded-xl ps-3 pe-16 py-2 text-sm text-[#F4F1EA] font-numeric outline-none text-start"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    {displaySymbol}
                  </span>
                </div>
              </div>
            </AssetItemRow>
          </motion.div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. PAYMENT HISTORY & AUDIT LOG
      ───────────────────────────────────────────────────────────── */}
      {payments.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-white/[0.04]">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.previousZakatPayments}
            </h3>
            <span className="text-xs text-slate-500 font-numeric">
              {payments.length} {t.documentedPayments}
            </span>
          </div>

          <div className="divide-y divide-white/[0.04] border-y border-white/[0.06]">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3 px-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#F4F1EA]">{p.recipient}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 font-mono">
                      {p.profileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{p.date}</span>
                    {p.note && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-xs">{p.note}</span>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-xs sm:text-sm font-bold text-[#8EB9A7] font-numeric" dir="ltr">
                  {formatFinancialNumber(p.amount)} {p.currency}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ZakatAssetConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        category={configModalCategory}
        profile={activeProfile}
        onUpdateProfile={updateActiveProfile}
        karatRates={{
          price24k: karatRates.price24k,
          price21k: karatRates.price21k,
          price18k: karatRates.price18k,
          priceSilver: karatRates.priceSilver,
          custom21k: customPrice21k,
          custom18k: customPrice18k,
          customSilver: customSilverPrice
        }}
        onUpdateKaratRates={({ price24k, custom21k, custom18k, customSilver }) => {
          setGoldPrice24k(price24k);
          setCustomPrice21k(custom21k);
          setCustomPrice18k(custom18k);
          setCustomSilverPrice(customSilver);
        }}
        wallets={allWalletBalances}
        debts={{
          toMeTotal: scopedDebts.toMeTotal,
          onMeTotal: scopedDebts.onMeTotal,
          includedToMe: scopedDebts.includedToMe,
          includedOnMe: scopedDebts.includedOnMe
        }}
        displaySymbol={displaySymbol}
        theme="dark"
      />

      {/* MODAL: NEW ZAKAT PROFILE */}
      <AnimatePresence>
        {showNewProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#11161C] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl text-start"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-semibold text-[#F4F1EA]">{t.createNewZakatProfile}</h3>
                <button onClick={() => setShowNewProfileModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-slate-400 block">{t.profileNameExample}</label>
                <input
                  type="text"
                  placeholder={t.profilePlaceholder}
                  value={editingProfileName}
                  onChange={(e) => setEditingProfileName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 focus:border-[#D9B978] rounded-2xl px-4 py-3 text-sm text-[#F4F1EA] outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t.profileInfoDesc}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateProfile}
                  disabled={!editingProfileName.trim()}
                  className="flex-1 py-3 rounded-2xl bg-[#D9B978] hover:bg-[#E5C17B] text-[#0A0D10] text-xs font-bold transition-all disabled:opacity-50"
                >
                  {t.saveAndActivateProfile}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProfileModal(false)}
                  className="px-5 py-3 rounded-2xl bg-white/[0.03] text-slate-400 hover:text-white text-xs font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RECORD ZAKAT PAYMENT */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#11161C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-start"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-base font-semibold text-[#F4F1EA]">{t.documentZakatPayment}</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.zakatPaymentAmount} ({displaySymbol})</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[#8EB9A7] rounded-2xl px-4 py-2.5 text-sm text-[#F4F1EA] font-numeric outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.recipientOrEntity}</label>
                  <input
                    type="text"
                    placeholder={t.recipientPlaceholder}
                    value={paymentRecipient}
                    onChange={(e) => setPaymentRecipient(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[#8EB9A7] rounded-2xl px-4 py-2.5 text-sm text-[#F4F1EA] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.walletWithdrawalOptional}</label>
                  <select
                    value={paymentWalletId}
                    onChange={(e) => setPaymentWalletId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 focus:border-[#8EB9A7] rounded-2xl px-4 py-2.5 text-sm text-[#F4F1EA] outline-none"
                  >
                    <option value="">{t.noWalletSelected}</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.currencyCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.additionalNotes}</label>
                  <input
                    type="text"
                    placeholder={t.notesPlaceholder}
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[#8EB9A7] rounded-2xl px-4 py-2.5 text-sm text-[#F4F1EA] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddPayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                  className="flex-1 py-3 rounded-2xl bg-[#8EB9A7] hover:bg-[#7da896] text-[#0A0D10] text-xs font-bold transition-all disabled:opacity-50"
                >
                  {t.documentPaymentBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-3 rounded-2xl bg-white/[0.03] text-slate-400 hover:text-white text-xs font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RESET HAWL CONFIRMATION */}
      <AnimatePresence>
        {showHawlResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#11161C] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-start"
            >
              <div className="flex items-center gap-3 text-amber-400 border-b border-white/[0.06] pb-3">
                <RotateCcw size={20} />
                <h3 className="text-base font-semibold text-[#F4F1EA]">{t.startNewHawlCycleTitle}</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t.hawlResetConfirmText} <strong>{activeProfile.name}</strong> {t.hawlResetConfirmText2}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartNewCycle}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                >
                  {t.confirmAndStartHawlToday}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHawlResetConfirm(false)}
                  className="px-5 py-3 rounded-2xl bg-white/[0.03] text-slate-400 hover:text-white text-xs font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ZakatCalculator;
