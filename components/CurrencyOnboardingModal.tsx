import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Coins, 
  Globe, 
  Search, 
  X, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Currency } from '../types';
import { CURRENCY_METADATA_REGISTRY, CurrencyMetadata } from '../services/reports/currencyMetadata';
import { LanguageKey, getLocalizedCurrency } from '../utils/translations';
import { NativeHaptics } from '../services/nativeServices';

interface CurrencyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBaseCurrency?: Currency;
  currentActiveCurrencies?: Currency[];
  onSavePortfolio: (baseCurrency: Currency, activeCurrencies: Currency[]) => void;
  language?: LanguageKey;
}

// Regional categories for seamless browsing
type RegionCategory = 'all' | 'gcc' | 'arab' | 'global';

export const CurrencyOnboardingModal: React.FC<CurrencyOnboardingModalProps> = ({
  isOpen,
  onClose,
  currentBaseCurrency,
  currentActiveCurrencies = [],
  onSavePortfolio,
  language = 'ar'
}) => {
  const isAr = language === 'ar';

  // Step 1: Base Currency, Step 2: Active Multi-Currencies
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<RegionCategory>('all');

  // Selected base currency state
  const [selectedBaseCode, setSelectedBaseCode] = useState<string>(
    currentBaseCurrency?.code || 'SAR'
  );

  // Selected active portfolio currencies (Set of codes)
  const [selectedActiveCodes, setSelectedActiveCodes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (currentActiveCurrencies && currentActiveCurrencies.length > 0) {
      currentActiveCurrencies.forEach(c => initial.add(c.code));
    } else {
      ['SAR', 'USD', 'AED', 'EGP', 'EUR'].forEach(c => initial.add(c));
    }
    initial.add(currentBaseCurrency?.code || 'SAR');
    return initial;
  });

  // Prepare full list of regional currencies from registry
  const allCurrenciesList = useMemo(() => {
    return Object.values(CURRENCY_METADATA_REGISTRY).map(meta => {
      // Categorize into region
      let category: RegionCategory = 'global';
      const code = meta.code;
      if (['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR'].includes(code)) {
        category = 'gcc';
      } else if ([
        'EGP', 'JOD', 'IQD', 'LYD', 'MAD', 'DZD', 'TND', 'SYP', 'LBP', 'SDG',
        'YER', 'YER_ADEN', 'YER_SANAA'
      ].includes(code)) {
        category = 'arab';
      }

      return {
        code: meta.code,
        symbol: meta.symbol,
        name: isAr ? meta.nameAr : meta.nameEn,
        nameAr: meta.nameAr,
        nameEn: meta.nameEn,
        region: isAr ? meta.regionAr : meta.regionEn,
        category,
      };
    });
  }, [isAr]);

  // Filtered currencies based on search & active tab
  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allCurrenciesList.filter(c => {
      const matchCategory = activeCategory === 'all' || c.category === activeCategory;
      if (!matchCategory) return false;

      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      );
    });
  }, [allCurrenciesList, activeCategory, searchQuery]);

  if (!isOpen) return null;

  // Toggle selection for active portfolio
  const toggleActiveCode = (code: string) => {
    NativeHaptics.selection().catch(() => {});
    setSelectedActiveCodes(prev => {
      const next = new Set(prev);
      if (code === selectedBaseCode) {
        // Base currency must always be in active currencies
        return next;
      }
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Quick preset helper
  const applyPreset = (preset: 'gcc' | 'arab_all' | 'global_majors') => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    setSelectedActiveCodes(prev => {
      const next = new Set(prev);
      next.add(selectedBaseCode);
      if (preset === 'gcc') {
        ['SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'USD'].forEach(c => next.add(c));
      } else if (preset === 'arab_all') {
        [
          'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'EGP', 'JOD', 'IQD', 
          'LYD', 'MAD', 'DZD', 'TND', 'USD', 'EUR'
        ].forEach(c => next.add(c));
      } else if (preset === 'global_majors') {
        ['USD', 'EUR', 'GBP', 'TRY', 'SAR', 'AED'].forEach(c => next.add(c));
      }
      return next;
    });
  };

  const handleComplete = () => {
    NativeHaptics.notification('SUCCESS').catch(() => {});
    const baseMeta = CURRENCY_METADATA_REGISTRY[selectedBaseCode] || {
      code: selectedBaseCode,
      symbol: selectedBaseCode,
      nameAr: selectedBaseCode,
      nameEn: selectedBaseCode,
    };

    const baseCurrencyObj: Currency = {
      code: baseMeta.code,
      symbol: baseMeta.symbol,
      name: isAr ? baseMeta.nameAr : baseMeta.nameEn,
    };

    const activeList: Currency[] = Array.from(selectedActiveCodes).map(code => {
      const meta = CURRENCY_METADATA_REGISTRY[code];
      return {
        code,
        symbol: meta?.symbol || code,
        name: meta ? (isAr ? meta.nameAr : meta.nameEn) : code,
      };
    });

    onSavePortfolio(baseCurrencyObj, activeList);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="bg-[#11161C] border border-white/10 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Top Header */}
          <div className="px-5 py-4 bg-[#0A0D10] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
                <Coins size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-[#F4F1EA] flex items-center gap-2">
                  <span>{isAr ? 'محفظة العملات الإقليمية والعالمية' : 'Global & Regional Currency Portfolio'}</span>
                  <span className="text-[10px] bg-[#D9B978] text-slate-950 px-2 py-0.5 rounded-full font-black">
                    {step === 1 ? (isAr ? 'خطوة 1 من 2' : 'Step 1 of 2') : (isAr ? 'خطوة 2 من 2' : 'Step 2 of 2')}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {step === 1 
                    ? (isAr ? 'اختر العملة المرجعية الأساسية للحسابات والتقارير' : 'Select your primary base accounting currency')
                    : (isAr ? 'حدد كافة العملات التي تتعامل بها لإضافتها لمحفظتك' : 'Select all currencies you deal with for your portfolio')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper Tabs Bar */}
          <div className="px-5 pt-3 pb-2 bg-[#0A0D10]/50 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  step === 1
                    ? 'bg-[#D9B978] text-slate-950 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span>1. {isAr ? 'العملة الأساسية' : 'Base Currency'}</span>
                <span className="text-[10px] font-mono opacity-80">({selectedBaseCode})</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  step === 2
                    ? 'bg-[#D9B978] text-slate-950 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span>2. {isAr ? 'محفظة العملات النشطة' : 'Active Currencies'}</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono">
                  {selectedActiveCodes.size}
                </span>
              </button>
            </div>
          </div>

          {/* Search Bar & Regional Tabs */}
          <div className="px-5 py-3 space-y-2 bg-[#0E1319] border-b border-white/5 shrink-0">
            <div className="relative">
              <Search size={15} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث باسم العملة، الرمز، أو الدولة...' : 'Search by currency, code, or country...'}
                className="w-full bg-[#0A0D10] border border-white/10 rounded-xl py-2 pr-10 pl-9 text-xs text-[#F4F1EA] placeholder:text-slate-500 focus:border-[#D9B978]/50 outline-none transition-colors text-right"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Regional Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', labelAr: 'كافة العملات', labelEn: 'All Currencies' },
                { id: 'gcc', labelAr: 'دول الخليج (GCC)', labelEn: 'Gulf (GCC)' },
                { id: 'arab', labelAr: 'الوطن العربي', labelEn: 'Arab World' },
                { id: 'global', labelAr: 'عالمية كبرى', labelEn: 'Global Major' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as RegionCategory)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    activeCategory === tab.id
                      ? 'bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/40'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {isAr ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>

            {/* Quick Presets (Only in Step 2) */}
            {step === 2 && (
              <div className="flex items-center gap-1.5 pt-1 text-[10px] overflow-x-auto no-scrollbar">
                <span className="text-slate-500 font-bold shrink-0">{isAr ? 'مجموعات جاهزة:' : 'Quick Presets:'}</span>
                <button
                  type="button"
                  onClick={() => applyPreset('gcc')}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 whitespace-nowrap"
                >
                  + {isAr ? 'دول الخليج' : 'GCC Pack'}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('arab_all')}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 whitespace-nowrap"
                >
                  + {isAr ? 'شامل الدول العربية' : 'All Arab Pack'}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('global_majors')}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 whitespace-nowrap"
                >
                  + {isAr ? 'العالمية (USD/EUR)' : 'Global Majors'}
                </button>
              </div>
            )}
          </div>

          {/* Currencies Grid Content */}
          <div className="overflow-y-auto p-4 sm:p-5 custom-scrollbar flex-1 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredCurrencies.map(curr => {
                const isBase = curr.code === selectedBaseCode;
                const isActive = selectedActiveCodes.has(curr.code);

                if (step === 1) {
                  // Step 1: Radio selection for base currency
                  return (
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      key={curr.code}
                      onClick={() => {
                        NativeHaptics.selection().catch(() => {});
                        setSelectedBaseCode(curr.code);
                        setSelectedActiveCodes(prev => new Set(prev).add(curr.code));
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isBase
                          ? 'bg-[#D9B978]/15 border-[#D9B978] shadow-md ring-1 ring-[#D9B978]/30'
                          : 'bg-[#0A0D10] border-white/5 hover:border-white/20 hover:bg-[#141A22]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 border ${
                          isBase
                            ? 'bg-[#D9B978] text-slate-950 border-[#D9B978]'
                            : 'bg-white/5 text-[#D9B978] border-white/10'
                        }`}>
                          {curr.symbol}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-[#F4F1EA] truncate">
                              {curr.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              ({curr.code})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">
                            {curr.region}
                          </span>
                        </div>
                      </div>

                      {isBase ? (
                        <div className="w-6 h-6 rounded-full bg-[#D9B978] text-slate-950 flex items-center justify-center shrink-0">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-600 shrink-0" />
                      )}
                    </motion.div>
                  );
                } else {
                  // Step 2: Multi-selection for active currencies
                  return (
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      key={curr.code}
                      onClick={() => toggleActiveCode(curr.code)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-[#D9B978]/15 border-[#D9B978]/80 shadow-md'
                          : 'bg-[#0A0D10] border-white/5 hover:border-white/20 hover:bg-[#141A22]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 border ${
                          isActive
                            ? 'bg-[#D9B978] text-slate-950 border-[#D9B978]'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}>
                          {curr.symbol}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-[#F4F1EA] truncate">
                              {curr.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              ({curr.code})
                            </span>
                            {isBase && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                {isAr ? 'الأساسية' : 'Base'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">
                            {curr.region}
                          </span>
                        </div>
                      </div>

                      {isActive ? (
                        <div className="w-6 h-6 rounded-lg bg-[#D9B978] text-slate-950 flex items-center justify-center shrink-0">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-lg border border-slate-600 shrink-0" />
                      )}
                    </motion.div>
                  );
                }
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-[#0A0D10] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
            {step === 1 ? (
              <>
                <div className="text-xs text-slate-400 font-bold">
                  {isAr ? 'العملة المرجعية:' : 'Selected Base:'} <strong className="text-[#D9B978] font-mono">{selectedBaseCode}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-[#D9B978] hover:bg-[#c9a764] text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <span>{isAr ? 'التالي: اختيار محفظة العملات' : 'Next: Select Portfolio'}</span>
                  {isAr ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isAr ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}
                  <span>{isAr ? 'رجوع' : 'Back'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#D9B978] via-[#e2c68c] to-[#D9B978] text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>{isAr ? 'حفظ وتفعيل محفظتي المالية' : 'Save & Activate Portfolio'}</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
