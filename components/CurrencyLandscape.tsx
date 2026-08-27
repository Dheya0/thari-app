import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Coins, Check, ArrowRightLeft, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { Currency, Wallet } from '../types';
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { formatFinancialNumber } from './ElegantDashboard';

interface CurrencyLandscapeProps {
  currencies: Currency[];
  selectedCurrency: Currency;
  onSelectCurrency: (currency: Currency) => void;
  currencyBalances?: Record<string, number>;
  wallets?: Wallet[];
  exchangeRates?: Record<string, number>;
  baseCurrencyCode?: string;
}

// Color palette map for currency exposure segments
const CURRENCY_ACCENT_COLORS: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  SAR: { bar: '#D9B978', text: '#E5C17B', bg: 'rgba(217, 185, 120, 0.16)', border: 'rgba(217, 185, 120, 0.35)' },
  USD: { bar: '#60A5FA', text: '#93C5FD', bg: 'rgba(96, 165, 250, 0.16)', border: 'rgba(96, 165, 250, 0.35)' },
  YER_ADEN: { bar: '#10B981', text: '#34D399', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.35)' },
  YER_SANAA: { bar: '#F43F5E', text: '#FB7185', bg: 'rgba(244, 63, 94, 0.16)', border: 'rgba(244, 63, 94, 0.35)' },
  EUR: { bar: '#A855F7', text: '#C084FC', bg: 'rgba(168, 85, 247, 0.16)', border: 'rgba(168, 85, 247, 0.35)' },
  AED: { bar: '#F59E0B', text: '#FBBF24', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.35)' },
  KWD: { bar: '#2DD4BF', text: '#5EEAD4', bg: 'rgba(45, 212, 191, 0.16)', border: 'rgba(45, 212, 191, 0.35)' },
  OMR: { bar: '#38BDF8', text: '#7DD3FC', bg: 'rgba(56, 189, 248, 0.16)', border: 'rgba(56, 189, 248, 0.35)' },
  QAR: { bar: '#E11D48', text: '#FDA4AF', bg: 'rgba(225, 29, 72, 0.16)', border: 'rgba(225, 29, 72, 0.35)' },
  BHD: { bar: '#EC4899', text: '#F472B6', bg: 'rgba(236, 72, 153, 0.16)', border: 'rgba(236, 72, 153, 0.35)' },
  EGP: { bar: '#EAB308', text: '#FDE047', bg: 'rgba(234, 179, 8, 0.16)', border: 'rgba(234, 179, 8, 0.35)' },
  GBP: { bar: '#3B82F6', text: '#93C5FD', bg: 'rgba(59, 130, 246, 0.16)', border: 'rgba(59, 130, 246, 0.35)' },
};

export const CurrencyLandscape: React.FC<CurrencyLandscapeProps> = ({
  currencies,
  selectedCurrency,
  onSelectCurrency,
  currencyBalances = {},
  wallets = [],
  exchangeRates = DEFAULT_EXCHANGE_RATES,
  baseCurrencyCode = 'SAR'
}) => {
  // Calculate total wealth equivalent in base currency across all held currencies
  const exposureAnalysis = useMemo(() => {
    let totalInBase = 0;
    const items: {
      currency: Currency;
      nativeAmount: number;
      amountInBase: number;
      percentage: number;
      walletCount: number;
      color: { bar: string; text: string; bg: string; border: string };
      exchangeRateToSelected: number;
      ratePerOneSelected: number;
    }[] = [];

    // Tally amounts for currencies with active balances or wallets
    currencies.forEach(curr => {
      const nativeAmount = currencyBalances[curr.code] || 0;
      const amountInBase = convertCurrency(nativeAmount, curr.code, baseCurrencyCode, exchangeRates);
      const walletCount = wallets.filter(w => w.currencyCode === curr.code).length;

      if (nativeAmount !== 0 || walletCount > 0 || curr.code === selectedCurrency.code) {
        if (amountInBase > 0) {
          totalInBase += amountInBase;
        }

        const color = CURRENCY_ACCENT_COLORS[curr.code] || {
          bar: '#94A3B8',
          text: '#CBD5E1',
          bg: 'rgba(148, 163, 184, 0.16)',
          border: 'rgba(148, 163, 184, 0.3)'
        };

        const rateToSel = convertCurrency(1, curr.code, selectedCurrency.code, exchangeRates);
        const ratePerOne = convertCurrency(1, selectedCurrency.code, curr.code, exchangeRates);

        items.push({
          currency: curr,
          nativeAmount,
          amountInBase,
          percentage: 0,
          walletCount,
          color,
          exchangeRateToSelected: rateToSel,
          ratePerOneSelected: ratePerOne
        });
      }
    });

    // Compute percentage of portfolio
    const finalItems = items.map(item => ({
      ...item,
      percentage: totalInBase > 0 && item.amountInBase > 0 
        ? Math.round((item.amountInBase / (totalInBase <= 0 ? 1 : totalInBase)) * 100)
        : (item.currency.code === selectedCurrency.code ? 100 : 0)
    }));

    // Sort by largest balance first
    finalItems.sort((a, b) => b.amountInBase - a.amountInBase);

    return { totalInBase, items: finalItems };
  }, [currencies, currencyBalances, wallets, exchangeRates, baseCurrencyCode, selectedCurrency.code]);

  return (
    <div className="w-full bg-[#0D1219] rounded-2xl md:rounded-3xl p-3 sm:p-4 border border-white/[0.08] shadow-md space-y-3 text-right font-sans" dir="rtl">
      {/* Header with Title and Current Base Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center border border-[#D9B978]/30 shadow-inner">
            <Coins size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>توزيع العملات الحي</span>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                نشط
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[11px] font-semibold text-slate-200">
            <span className="text-slate-400">العرض:</span>
            <span className="text-[#D9B978] font-bold font-numeric">{selectedCurrency.symbol} ({selectedCurrency.code})</span>
          </div>
        </div>
      </div>

      {/* Proportional Exposure Visual Spectrum Bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-[#161F2B] border border-white/[0.08] rounded-full overflow-hidden flex p-0.5 gap-0.5">
          {exposureAnalysis.items.filter(i => i.amountInBase > 0).map(item => (
            <motion.div
              key={item.currency.code}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(item.percentage, 4)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-sm transition-all"
              style={{ backgroundColor: item.color.bar }}
              title={`${item.currency.name}: ${item.percentage}%`}
            />
          ))}
        </div>
      </div>

      {/* Living Interactive Currency Grid / Chips (Compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
        {exposureAnalysis.items.map(item => {
          const isSelected = item.currency.code === selectedCurrency.code;
          const hasBalance = item.nativeAmount !== 0;

          return (
            <motion.button
              key={item.currency.code}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCurrency(item.currency)}
              className={`p-3 rounded-xl border text-right transition-all duration-200 flex flex-col justify-between relative overflow-hidden group shadow-sm ${
                isSelected
                  ? 'bg-gradient-to-br from-[#231A10] via-[#161D27] to-[#10151E] border-[#D9B978] ring-1 ring-[#D9B978]/40 shadow-md'
                  : 'bg-[#141B24] hover:bg-[#1A232E] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Top Row: Currency Symbol & Name & Select Indicator */}
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color.bar }}
                  />
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#E5C17B]' : 'text-white'}`}>
                    {item.currency.name}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-300 font-numeric px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 shrink-0">
                  {item.currency.code}
                </span>
              </div>

              {/* Native Balance Display */}
              <div className="space-y-0.5 my-1">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className={`text-sm font-bold font-numeric tracking-tight ${
                    item.nativeAmount < 0 ? 'text-rose-400' : 'text-white'
                  }`}>
                    {formatFinancialNumber(item.nativeAmount)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {item.currency.symbol}
                  </span>
                </div>

                {!isSelected && hasBalance && (
                  <div className="text-[10px] text-slate-300 font-numeric flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded border border-white/[0.04]">
                    <span className="text-slate-400">يعادل:</span>
                    <span className="font-semibold text-[#E5C17B]">
                      {formatFinancialNumber(convertCurrency(item.nativeAmount, item.currency.code, selectedCurrency.code, exchangeRates))} {selectedCurrency.symbol}
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default CurrencyLandscape;
