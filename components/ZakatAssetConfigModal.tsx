import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Coins, 
  TrendingUp, 
  Building, 
  HandCoins, 
  Check, 
  RotateCcw,
  SlidersHorizontal,
  Wallet as WalletIcon,
  HelpCircle,
  Percent,
  Plus
} from 'lucide-react';
import { ZakatProfile, Wallet, Debt, Currency } from '../types';
import { TOKENS, ThemeMode } from '../theme/tokens';
import { formatFinancialNumber } from './ElegantDashboard';

export type ZakatModalCategory = 
  | 'metals_rates'       // أسعار العيارات والفضة
  | 'cash_liquidity'     // السيولة والمحافظ
  | 'stocks_invest'      // الأسهم والصناديق الاستثمارية
  | 'realestate_assets'  // العقارات وعروض التجارة
  | 'debts_liabilities'; // الديون والالتزامات والخصومات

export interface KaratRates {
  price24k: number;
  price21k: number;
  price18k: number;
  priceSilver: number;
  custom21k: number | null;
  custom18k: number | null;
  customSilver: number | null;
}

export interface ZakatAssetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: ZakatModalCategory;
  profile: ZakatProfile;
  onUpdateProfile: (partial: Partial<ZakatProfile>) => void;
  karatRates: KaratRates;
  onUpdateKaratRates: (rates: { price24k: number; custom21k: number | null; custom18k: number | null; customSilver: number | null }) => void;
  wallets: Array<{ id: string; name: string; nativeBalance: number; balanceInBase: number; currencyCode: string }>;
  debts: { toMeTotal: number; onMeTotal: number; includedToMe: number; includedOnMe: number };
  displaySymbol: string;
  theme?: ThemeMode;
}

export const ZakatAssetConfigModal: React.FC<ZakatAssetConfigModalProps> = ({
  isOpen,
  onClose,
  category,
  profile,
  onUpdateProfile,
  karatRates,
  onUpdateKaratRates,
  wallets,
  debts,
  displaySymbol,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const c = isDark ? TOKENS.colors.dark : TOKENS.colors.light;

  const getCategoryDetails = () => {
    switch (category) {
      case 'metals_rates':
        return {
          title: 'إعداد أسعار عيارات الذهب والفضة',
          subtitle: 'تحديث أسعار الجرام الواحد لاعتمادها في احتساب النصاب والأوزان',
          icon: Sparkles,
          iconColor: 'text-[#D9B978]',
          iconBg: 'bg-[#D9B978]/10 border-[#D9B978]/25'
        };
      case 'cash_liquidity':
        return {
          title: 'تخصيص نطاق السيولة والمحافظ',
          subtitle: 'إدراج أو استبعاد حسابات بنكية محددة من الوعاء الزكوي',
          icon: Coins,
          iconColor: 'text-teal-400',
          iconBg: 'bg-teal-500/10 border-teal-500/20'
        };
      case 'stocks_invest':
        return {
          title: 'إعداد الأسهم والصناديق الاستثمارية',
          subtitle: 'تحديد طريقة زكاة الأسهم (المضاربة أو الاستثمار طويل الأجل)',
          icon: TrendingUp,
          iconColor: 'text-sky-400',
          iconBg: 'bg-sky-500/10 border-sky-500/20'
        };
      case 'realestate_assets':
        return {
          title: 'إعداد العقارات وعروض التجارة',
          subtitle: 'تقييم بضائع التجارة والعقارات المعدة للبيع والإيجارات المحصلة',
          icon: Building,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/10 border-amber-500/20'
        };
      case 'debts_liabilities':
        return {
          title: 'إدارة الديون والالتزامات والخصومات',
          subtitle: 'تضمين المستحقات المرجوة وخصم الديون والالتزامات الحالية',
          icon: HandCoins,
          iconColor: 'text-rose-400',
          iconBg: 'bg-rose-500/10 border-rose-500/20'
        };
    }
  };

  const details = getCategoryDetails();
  const Icon = details.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{
            backgroundColor: isDark ? '#10151C' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          }}
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${details.iconBg} ${details.iconColor}`}>
                <Icon size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">{details.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{details.subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            
            {/* 1. METALS RATES MODAL CONTENT */}
            {category === 'metals_rates' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 24k Gold (Benchmark) */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-[#D9B978]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#D9B978]">عيار 24 (الأساس الشرعي)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#D9B978]/20 text-[#E5C17B] font-mono font-bold">
                        Au 24
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={karatRates.price24k || ''}
                        onChange={(e) => onUpdateKaratRates({
                          price24k: parseFloat(e.target.value) || 0,
                          custom21k: karatRates.custom21k,
                          custom18k: karatRates.custom18k,
                          customSilver: karatRates.customSilver
                        })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-[#D9B978] rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  </div>

                  {/* 21k Gold */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">عيار 21</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono font-bold">
                        Au 21
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={String(Math.round((karatRates.price24k * 21) / 24))}
                        value={karatRates.custom21k !== null ? karatRates.custom21k : Math.round(karatRates.price21k * 100) / 100 || ''}
                        onChange={(e) => onUpdateKaratRates({
                          price24k: karatRates.price24k,
                          custom21k: parseFloat(e.target.value) || null,
                          custom18k: karatRates.custom18k,
                          customSilver: karatRates.customSilver
                        })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-[#D9B978] rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  </div>

                  {/* 18k Gold */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">عيار 18</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono font-bold">
                        Au 18
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={String(Math.round((karatRates.price24k * 18) / 24))}
                        value={karatRates.custom18k !== null ? karatRates.custom18k : Math.round(karatRates.price18k * 100) / 100 || ''}
                        onChange={(e) => onUpdateKaratRates({
                          price24k: karatRates.price24k,
                          custom21k: karatRates.custom21k,
                          custom18k: parseFloat(e.target.value) || null,
                          customSilver: karatRates.customSilver
                        })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-[#D9B978] rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  </div>

                  {/* Pure Silver */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">الفضة النقية (جرام)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono font-bold">
                        Ag Pure
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={karatRates.customSilver !== null ? karatRates.customSilver : Math.round(karatRates.priceSilver * 100) / 100 || ''}
                        onChange={(e) => onUpdateKaratRates({
                          price24k: karatRates.price24k,
                          custom21k: karatRates.custom21k,
                          custom18k: karatRates.custom18k,
                          customSilver: parseFloat(e.target.value) || null
                        })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-[#D9B978] rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grams Input for Gold & Silver */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Coins size={14} className="text-[#D9B978]" />
                    <span>أوزان الذهب والفضة الخاضعة للزكاة في هذا الملف</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">عيار 24 (جرام)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={profile.gold24Grams || ''}
                        onChange={(e) => onUpdateProfile({ gold24Grams: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-numeric text-left outline-none focus:border-[#D9B978]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">عيار 21 (جرام)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={profile.gold21Grams || ''}
                        onChange={(e) => onUpdateProfile({ gold21Grams: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-numeric text-left outline-none focus:border-[#D9B978]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">عيار 18 (جرام)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={profile.gold18Grams || ''}
                        onChange={(e) => onUpdateProfile({ gold18Grams: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-numeric text-left outline-none focus:border-[#D9B978]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">فضة (جرام)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={profile.silverGrams || ''}
                        onChange={(e) => onUpdateProfile({ silverGrams: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-numeric text-left outline-none focus:border-[#D9B978]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CASH & LIQUIDITY MODAL CONTENT */}
            {category === 'cash_liquidity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-xs text-slate-300 font-medium">نطاق احتساب المحافظ:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateProfile({ scopeType: 'all', selectedWalletIds: wallets.map(w => w.id) })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        profile.scopeType === 'all'
                          ? 'bg-[#D9B978] text-slate-950 border-[#D9B978]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      تضمين كافة المحافظ
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateProfile({ scopeType: 'selected_wallets' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        profile.scopeType === 'selected_wallets'
                          ? 'bg-[#D9B978] text-slate-950 border-[#D9B978]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      تخصيص يدوي
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-semibold block px-1">المحافظ والحسابات المسجلة:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wallets.map(w => {
                      const isChecked = profile.scopeType === 'all' || profile.selectedWalletIds?.includes(w.id);
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            const current = new Set(profile.selectedWalletIds || []);
                            if (current.has(w.id)) {
                              if (current.size > 1) current.delete(w.id);
                            } else {
                              current.add(w.id);
                            }
                            onUpdateProfile({
                              scopeType: 'selected_wallets',
                              selectedWalletIds: Array.from(current)
                            });
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all ${
                            isChecked 
                              ? 'bg-amber-500/10 border-amber-500/30 text-white' 
                              : 'bg-white/[0.02] border-white/[0.04] text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              isChecked ? 'bg-[#D9B978] border-[#D9B978] text-slate-950' : 'border-slate-600'
                            }`}>
                              {isChecked && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-medium truncate">{w.name}</span>
                          </div>
                          <span className="text-xs font-numeric font-bold text-[#E5C17B] shrink-0" dir="ltr">
                            {formatFinancialNumber(w.nativeBalance, true)} {w.currencyCode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. STOCKS & INVESTMENTS MODAL CONTENT */}
            {category === 'stocks_invest' && (
              <div className="space-y-3.5">
                {/* Trading Stocks (Mudaraba) */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">أسهم المضاربة (تداول قصير الأجل)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">
                      STK-TRD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    تزكى بكامل قيمتها السوقية في تاريخ وجوب الزكاة.
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={profile.tradingStocksValue || ''}
                      onChange={(e) => onUpdateProfile({ tradingStocksValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-sky-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {displaySymbol}
                    </span>
                  </div>
                </div>

                {/* Long-term Investment Stocks */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">الأسهم الاستثمارية (طويلة الأجل)</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateProfile({ investmentStocksMethod: 'liquid_ratio' })}
                        className={`py-1 px-2.5 rounded-lg border text-[11px] transition-all ${
                          profile.investmentStocksMethod === 'liquid_ratio'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        نسبة الأصول (10%)
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateProfile({ investmentStocksMethod: 'dividends_only' })}
                        className={`py-1 px-2.5 rounded-lg border text-[11px] transition-all ${
                          profile.investmentStocksMethod === 'dividends_only'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        الأرباح فقط
                      </button>
                    </div>
                  </div>

                  {profile.investmentStocksMethod === 'liquid_ratio' ? (
                    <div className="relative">
                      <label className="text-[11px] text-slate-400 block mb-1">إجمالي قيمة المحفظة الاستثمارية:</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={profile.longTermStocksValue || ''}
                        onChange={(e) => onUpdateProfile({ longTermStocksValue: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-indigo-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                      />
                      <span className="absolute right-3 top-7 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <label className="text-[11px] text-slate-400 block mb-1">صافي الأرباح الموزعة المستلمة:</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={profile.longTermDividendsValue || ''}
                        onChange={(e) => onUpdateProfile({ longTermDividendsValue: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-indigo-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                      />
                      <span className="absolute right-3 top-7 text-xs text-slate-400 pointer-events-none">
                        {displaySymbol}
                      </span>
                    </div>
                  )}
                </div>

                {/* Investment Funds & Sukuk */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">الصناديق الاستثمارية والصكوك</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono font-bold">
                      FND-SKK
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={profile.investmentFundsValue || ''}
                      onChange={(e) => onUpdateProfile({ investmentFundsValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-violet-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {displaySymbol}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. REAL ESTATE & ASSETS MODAL CONTENT */}
            {category === 'realestate_assets' && (
              <div className="space-y-3.5">
                {/* Trade Inventory */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">عروض التجارة والبضائع</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                      INV-TRD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">تقوم البضائع بسعر الجملة وقت وجوب الزكاة.</p>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={profile.tradeInventoryValue || ''}
                      onChange={(e) => onUpdateProfile({ tradeInventoryValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {displaySymbol}
                    </span>
                  </div>
                </div>

                {/* Real Estate for Trading */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">عقارات معدة للمتاجرة (أراضي ومخططات)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      EST-TRD
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={profile.realEstateTradeValue || ''}
                      onChange={(e) => onUpdateProfile({ realEstateTradeValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-emerald-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {displaySymbol}
                    </span>
                  </div>
                </div>

                {/* Rental Income */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">ريع وعوائد العقارات المؤجرة</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                      EST-RNT
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={profile.rentalIncomeValue || ''}
                      onChange={(e) => onUpdateProfile({ rentalIncomeValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-cyan-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {displaySymbol}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DEBTS & LIABILITIES MODAL CONTENT */}
            {category === 'debts_liabilities' && (
              <div className="space-y-3.5">
                {/* Receivables Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
                  <div>
                    <h5 className="font-bold text-white">ديون لك عند الغير (مرجوة السداد)</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      الإجمالي الحالي: {formatFinancialNumber(debts.toMeTotal)} {displaySymbol}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateProfile({ includeDebtsToMe: !profile.includeDebtsToMe })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      profile.includeDebtsToMe
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {profile.includeDebtsToMe ? 'مضمنة في الوعاء' : 'مستبعدة'}
                  </button>
                </div>

                {/* Payables Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
                  <div>
                    <h5 className="font-bold text-white">ديون عليك للغير (واجبة السداد)</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      الإجمالي الحالي: {formatFinancialNumber(debts.onMeTotal)} {displaySymbol}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateProfile({ includeDebtsOnMe: !profile.includeDebtsOnMe })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      profile.includeDebtsOnMe
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {profile.includeDebtsOnMe ? 'مخصومة من الوعاء' : 'مستبعدة'}
                  </button>
                </div>

                {/* Custom Deductions */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">خصومات والتزامات تشغيلية عاجلة</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                      DED-OPS
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={profile.customDeductions || ''}
                      onChange={(e) => onUpdateProfile({ customDeductions: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-rose-400 rounded-xl pl-16 pr-3 py-2 text-sm text-white font-numeric outline-none text-left"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      {displaySymbol}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t flex items-center justify-end gap-2 shrink-0 bg-black/20"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#D9B978] hover:bg-[#E5C17B] text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>حفظ وتحديث الوعاء</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
