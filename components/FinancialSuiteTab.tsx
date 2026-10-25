import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, BookOpen, Sparkles } from 'lucide-react';
import { Wallet, Transaction, RecurringRule, Debt, Budget, Currency, Category, SavingsGoal } from '../types';
import { CashflowForecast } from './CashflowForecast';
import { OfficialReportsTab } from './OfficialReportsTab';
import { NativeHaptics } from '../services/nativeServices';

interface FinancialSuiteTabProps {
  initialSubTab?: 'forecast' | 'reports';
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  recurringRules: RecurringRule[];
  debts: Debt[];
  budgets: Budget[];
  goals: SavingsGoal[];
  currency: Currency;
  currencies: Currency[];
  exchangeRates: Record<string, number>;
  userName?: string;
  language?: 'ar' | 'en';
  onPrint?: (...args: any[]) => any;
  onExportExcel?: (...args: any[]) => any;
  onOpenRecurringManager?: () => void;
  onOpenNewTransaction?: (type: 'income' | 'expense') => void;
}

export const FinancialSuiteTab: React.FC<FinancialSuiteTabProps> = ({
  initialSubTab = 'forecast',
  transactions,
  wallets,
  categories,
  recurringRules,
  debts,
  budgets,
  goals,
  currency,
  currencies,
  exchangeRates,
  userName,
  language = 'ar',
  onPrint,
  onExportExcel,
  onOpenRecurringManager,
  onOpenNewTransaction
}) => {
  const [subTab, setSubTab] = useState<'forecast' | 'reports'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const isEn = language === 'en';

  return (
    <div className="space-y-5 max-w-6xl mx-auto w-full">
      {/* Floating Glassmorphic Suite Segmented Switcher */}
      <div className="sticky top-0 z-30 pt-1 pb-2 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center p-1.5 bg-[#11161C]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] ring-1 ring-white/5 gap-1.5 max-w-full">
          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              setSubTab('forecast');
            }}
            className={`relative flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'forecast'
                ? 'text-slate-950 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {subTab === 'forecast' && (
              <motion.div
                layoutId="suiteTabPill"
                className="absolute inset-0 bg-gradient-to-r from-[#C9A45C] to-[#E2C78C] rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <TrendingUp size={16} />
              <span>{isEn ? 'Cashflow Forecast' : 'التخطيط والتدفق النقدي'}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              NativeHaptics.selection().catch(() => {});
              setSubTab('reports');
            }}
            className={`relative flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              subTab === 'reports'
                ? 'text-slate-950 font-black'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {subTab === 'reports' && (
              <motion.div
                layoutId="suiteTabPill"
                className="absolute inset-0 bg-gradient-to-r from-[#C9A45C] to-[#E2C78C] rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <BookOpen size={16} />
              <span>{isEn ? 'Bank Statements' : 'كشف الحساب الرسمي'}</span>
            </span>
          </button>
        </div>
      </div>

      {/* Main Suite Content Render */}
      <AnimatePresence mode="wait" initial={false}>
        {subTab === 'forecast' ? (
          <motion.div
            key="forecast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <CashflowForecast
              wallets={wallets}
              transactions={transactions}
              recurringRules={recurringRules}
              debts={debts}
              budgets={budgets}
              exchangeRates={exchangeRates}
              baseCurrency={currency}
              currencies={currencies}
              language={language}
              onOpenRecurringManager={onOpenRecurringManager}
              onOpenNewTransaction={onOpenNewTransaction}
            />
          </motion.div>
        ) : (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <OfficialReportsTab
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              currencies={currencies}
              currentCurrency={currency}
              userName={userName}
              exchangeRates={exchangeRates}
              budgets={budgets}
              debts={debts}
              goals={goals}
              onPrint={onPrint}
              onExportExcel={onExportExcel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
