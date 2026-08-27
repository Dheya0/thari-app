import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Search, X, SlidersHorizontal, Coins, Globe } from 'lucide-react';
import { Currency } from '../types';
import { convertCurrency } from '../constants';
import { getLocalizedCurrency, LanguageKey } from '../utils/translations';

interface CurrencySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencies: Currency[];
  selectedCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
  exchangeRates: Record<string, number>;
  onOpenSettings?: () => void;
  language?: LanguageKey;
  t: any;
}

export const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({
  isOpen,
  onClose,
  currencies,
  selectedCurrency,
  onSelectCurrency,
  exchangeRates,
  onOpenSettings,
  language = 'ar',
  t
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const isAr = language === 'ar';

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Selected currency localized info
  const selectedInfo = useMemo(() => {
    return getLocalizedCurrency(
      selectedCurrency?.code || 'SAR',
      selectedCurrency?.name,
      selectedCurrency?.symbol,
      language
    );
  }, [selectedCurrency, language]);

  // Filter currencies with localized search
  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return currencies.map(c => {
      const locInfo = getLocalizedCurrency(c.code, c.name, c.symbol, language);
      const locInfoAr = getLocalizedCurrency(c.code, c.name, c.symbol, 'ar');
      const locInfoEn = getLocalizedCurrency(c.code, c.name, c.symbol, 'en');
      return {
        ...c,
        localized: locInfo,
        matches: !q || (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          locInfo.name.toLowerCase().includes(q) ||
          locInfo.symbol.toLowerCase().includes(q) ||
          (locInfo.badge && locInfo.badge.toLowerCase().includes(q)) ||
          locInfoAr.name.toLowerCase().includes(q) ||
          locInfoEn.name.toLowerCase().includes(q)
        )
      };
    }).filter(item => item.matches);
  }, [currencies, searchQuery, language]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 pt-16 sm:pt-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0F141C] border border-[#D9B978]/30 rounded-2xl md:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col max-h-[85vh] font-sans"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#141B24]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shadow-inner shrink-0">
                <Coins size={20} />
              </div>
              <div className="text-start">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t?.travelMode || (isAr ? 'خاصية السفر وصرفية الدولة' : 'Travel & Currency Mode')}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t?.currenciesAndRates || (isAr ? 'العملات والأسعار' : 'Currencies & Rates')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t?.close || (isAr ? 'إغلاق' : 'Close')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Travel Mode Banner */}
          <div className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Globe size={16} />
            </div>
            <div className="text-start">
              <h4 className="text-xs font-bold text-amber-300">
                {t?.travelMode || (isAr ? 'خاصية السفر وصرفية الدولة' : 'Travel & Currency Mode')}
              </h4>
              <p className="text-[10px] text-slate-300">
                {t?.selectWalletOrAll || (isAr ? 'اختر العملة الأساسية لعرض كافة الأرصدة والتقارير' : 'Select base currency for all balances & reports')}
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-3 sm:px-5 sm:pt-4 sm:pb-2 bg-[#0F141C]">
            <div className="relative">
              <Search
                size={16}
                className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t?.searchCurrencyPlaceholder || (isAr ? 'ابحث بالاسم، الرمز، أو الكود (مثل: SAR, دولار, ر.ي)...' : 'Search by name, symbol, or code (e.g. SAR, USD, $)...')}
                className={`w-full py-2.5 rounded-xl bg-[#18202B] border border-white/10 focus:border-[#D9B978] text-white text-xs placeholder:text-slate-500 outline-none transition-all ${
                  isAr ? 'pr-10 pl-8' : 'pl-10 pr-8'
                }`}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-white`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Currencies List */}
          <div className="p-3 sm:p-5 overflow-y-auto space-y-2 max-h-[50vh] divide-y divide-white/[0.04] no-scrollbar">
            {filteredCurrencies.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {t?.noMatchingCurrencies || (isAr ? 'لا توجد عملة مطابقة لبحثك' : 'No currencies match your search')}
              </div>
            ) : (
              filteredCurrencies.map((currItem) => {
                const isSelected = currItem.code === selectedCurrency.code;
                const loc = currItem.localized;
                const rateToSel = convertCurrency(1, currItem.code, selectedCurrency.code, exchangeRates);
                const formattedRate = (Math.round(rateToSel * 10000) / 10000).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                  maximumFractionDigits: 4
                });

                return (
                  <button
                    key={currItem.code}
                    type="button"
                    onClick={() => {
                      onSelectCurrency({
                        code: currItem.code,
                        name: loc.name,
                        symbol: loc.symbol
                      });
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group active:scale-[0.98] ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2A2012] via-[#1A222D] to-[#141B24] border-[#D9B978] shadow-md ring-1 ring-[#D9B978]/40'
                        : 'bg-[#141B24] hover:bg-[#1C2633] border-white/5 hover:border-white/15 text-slate-200'
                    }`}
                  >
                    {/* Currency details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Fixed & flexible badge box - Never overflows */}
                      <div
                        className={`min-w-[48px] max-w-[60px] h-11 px-2 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 border shadow-sm transition-all overflow-hidden ${
                          isSelected
                            ? 'bg-[#D9B978] text-slate-950 border-[#D9B978]'
                            : 'bg-white/5 text-[#E5C17B] border-white/10 group-hover:border-[#D9B978]/40'
                        }`}
                      >
                        <span className="text-xs font-black truncate max-w-full tracking-tight">
                          {loc.symbol}
                        </span>
                        {loc.badge && (
                          <span className={`text-[8px] font-bold px-1 rounded-sm mt-0.5 uppercase tracking-tighter truncate max-w-full ${
                            isSelected ? 'bg-black/20 text-slate-950' : 'bg-[#D9B978]/15 text-[#D9B978]'
                          }`}>
                            {loc.badge}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 text-start">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-bold truncate ${
                              isSelected ? 'text-[#E5C17B]' : 'text-white'
                            }`}
                          >
                            {loc.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 shrink-0">
                            {currItem.code}
                          </span>
                        </div>

                        {isSelected ? (
                          <div className="text-[11px] text-[#D9B978] font-medium mt-0.5 truncate">
                            {t?.baseActiveCurrencyNotice || (isAr ? 'العملة الأساسية النشطة لكافة شاشات التطبيق' : 'Active base currency for all application screens')}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            1 {currItem.code} ≈ {formattedRate} {selectedInfo.symbol}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected Checkmark Badge */}
                    <div className="shrink-0 flex items-center">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#D9B978] text-slate-950 flex items-center justify-center shadow-md">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-white/10 group-hover:border-[#D9B978]/40 flex items-center justify-center text-transparent group-hover:text-slate-400 transition-colors">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with Exchange Rates & Settings shortcut */}
          <div className="p-3 sm:p-4 bg-[#141B24] border-t border-white/[0.08] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Globe size={13} className="text-[#D9B978]" />
              <span>
                {t?.totalCurrenciesCount
                  ? t.totalCurrenciesCount.replace('{count}', String(currencies.length))
                  : isAr
                  ? `إجمالي ${currencies.length} عملات مسجلة`
                  : `Total ${currencies.length} registered currencies`}
              </span>
            </div>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#D9B978]/15 border border-white/10 hover:border-[#D9B978]/40 text-slate-300 hover:text-[#E5C17B] transition-all text-[11px] font-medium"
              >
                <SlidersHorizontal size={13} />
                <span>{t?.manageExchangeRatesBtn || (isAr ? 'إدارة أسعار الصرف' : 'Manage Exchange Rates')}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CurrencySelectorModal;
