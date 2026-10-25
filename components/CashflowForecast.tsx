import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Coins, 
  SlidersHorizontal, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Sparkles, 
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronDown,
  Layers,
  HandCoins
} from 'lucide-react';
import { Wallet, Transaction, RecurringRule, Debt, Budget, Currency } from '../types';
import { 
  calculateSafeToSpend, 
  generateCashflowTrajectory, 
  CashflowSimulationOptions,
  CashflowDayPoint,
  SafeToSpendMetrics 
} from '../services/cashflowEngine';

interface CashflowForecastProps {
  wallets: Wallet[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  debts: Debt[];
  budgets: Budget[];
  exchangeRates: Record<string, number>;
  baseCurrency: Currency;
  currencies: Currency[];
  language?: 'ar' | 'en';
  onOpenRecurringManager?: () => void;
  onOpenNewTransaction?: (type: 'income' | 'expense') => void;
}

export const CashflowForecast: React.FC<CashflowForecastProps> = ({
  wallets,
  transactions,
  recurringRules,
  debts,
  budgets,
  exchangeRates,
  baseCurrency,
  currencies,
  language = 'ar',
  onOpenRecurringManager,
  onOpenNewTransaction
}) => {
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(30);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [showWhatIf, setShowWhatIf] = useState<boolean>(false);
  const [whatIfExpense, setWhatIfExpense] = useState<number>(0);
  const [includeReceivables, setIncludeReceivables] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Available unique currency codes across user's wallets
  const availableWalletCurrencies = useMemo(() => {
    return Array.from(new Set(wallets.map(w => w.currencyCode)));
  }, [wallets]);

  // Options object for simulation
  const simulationOptions: CashflowSimulationOptions = useMemo(() => ({
    days: horizonDays,
    wallets,
    transactions,
    recurringRules,
    debts,
    budgets,
    exchangeRates,
    baseCurrency,
    filterCurrencyCode: selectedCurrencyCode,
    whatIfExpenseAmount: whatIfExpense,
    includeReceivablesInWhatIf: includeReceivables
  }), [
    horizonDays,
    wallets,
    transactions,
    recurringRules,
    debts,
    budgets,
    exchangeRates,
    baseCurrency,
    selectedCurrencyCode,
    whatIfExpense,
    includeReceivables
  ]);

  // Calculate Metrics and Trajectory
  const metrics: SafeToSpendMetrics = useMemo(() => {
    return calculateSafeToSpend(simulationOptions);
  }, [simulationOptions]);

  const trajectory: CashflowDayPoint[] = useMemo(() => {
    return generateCashflowTrajectory(simulationOptions);
  }, [simulationOptions]);

  // Chart min and max for responsive SVG scaling
  const { minBal, maxBal, endingBalance, netTrajectoryChange } = useMemo(() => {
    if (trajectory.length === 0) {
      return { minBal: 0, maxBal: 100, endingBalance: 0, netTrajectoryChange: 0 };
    }
    const balances = trajectory.map(p => p.closingBalance);
    const min = Math.min(...balances, metrics.availableLiquidity);
    const max = Math.max(...balances, metrics.availableLiquidity);
    const ending = trajectory[trajectory.length - 1].closingBalance;
    const change = ending - metrics.availableLiquidity;
    return {
      minBal: Math.min(0, min),
      maxBal: Math.max(10, max),
      endingBalance: ending,
      netTrajectoryChange: change
    };
  }, [trajectory, metrics.availableLiquidity]);

  // SVG Chart path calculation
  const svgPath = useMemo(() => {
    if (trajectory.length < 2) return '';
    const width = 800;
    const height = 220;
    const padding = 20;

    const range = (maxBal - minBal) || 1;
    const points = trajectory.map((point, index) => {
      const x = padding + (index / (trajectory.length - 1)) * (width - 2 * padding);
      const normalizedY = (point.closingBalance - minBal) / range;
      const y = (height - padding) - (normalizedY * (height - 2 * padding));
      return { x, y };
    });

    const d = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // Area closed path for gradient fill
    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaD = `${d} L ${lastP.x} ${height - padding} L ${firstP.x} ${height - padding} Z`;

    return { linePath: d, areaPath: areaD, points };
  }, [trajectory, minBal, maxBal]);

  // Extract upcoming milestone events (recurring rules or debt due dates)
  const upcomingEvents = useMemo(() => {
    const list: {
      date: string;
      title: string;
      amount: number;
      currency: string;
      type: 'income' | 'expense' | 'debt_payable' | 'debt_receivable';
    }[] = [];

    trajectory.forEach(day => {
      day.events.forEach(e => {
        if (e.title !== 'المتوسط اليومي للمصاريف المعتادة') {
          list.push({
            date: day.date,
            title: e.title,
            amount: e.amount,
            currency: e.currency,
            type: e.type as any
          });
        }
      });
    });

    return list.slice(0, 8); // Top 8 upcoming milestone events
  }, [trajectory]);

  return (
    <div className="space-y-6 pb-28 md:pb-8 max-w-6xl mx-auto">
      {/* 1. Header & Horizon Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#11161C] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978]">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>التخطيط المالي وتوقع السيولة</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/30 font-bold">
                  Cashflow Runway
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                استشراف التدفق النقدي المستقبلي ومقياس الأمان المالي اليومي بدقة محاسبية
              </p>
            </div>
          </div>
        </div>

        {/* Duration Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 self-start sm:self-auto">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setHorizonDays(d as 30 | 60 | 90)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                horizonDays === d
                  ? 'bg-[#D9B978] text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d} يوماً
            </button>
          ))}
        </div>
      </div>

      {/* 2. Currency Isolation Filter & What-If Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#11161C]/60 p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap flex items-center gap-1.5 shrink-0">
            <Coins size={14} className="text-[#D9B978]" />
            <span>نطاق العملة:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedCurrencyCode(null)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCurrencyCode === null
                ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            تقييم موحد ({baseCurrency.code})
          </button>

          {availableWalletCurrencies.map((currCode) => {
            const isSelected = selectedCurrencyCode === currCode;
            return (
              <button
                key={currCode}
                type="button"
                onClick={() => setSelectedCurrencyCode(currCode)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#D9B978]/20 border-[#D9B978] text-[#D9B978]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                عزل عملة {currCode}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowWhatIf(!showWhatIf)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            showWhatIf || whatIfExpense > 0 || includeReceivables
              ? 'bg-[#D9B978] text-slate-950 border-[#D9B978] shadow-md font-black'
              : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>محاكي السيناريوهات (What-if)</span>
          {(whatIfExpense > 0 || includeReceivables) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* 3. What-If Scenario Interactive Simulation Drawer */}
      <AnimatePresence>
        {showWhatIf && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#171D24] p-4 sm:p-5 rounded-2xl border border-[#D9B978]/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#D9B978]" />
                  <span className="text-xs font-black text-white">اختبار السيناريوهات المالية الاستثنائية</span>
                </div>
                {(whatIfExpense > 0 || includeReceivables) && (
                  <button
                    type="button"
                    onClick={() => {
                      setWhatIfExpense(0);
                      setIncludeReceivables(false);
                    }}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RefreshCw size={12} />
                    <span>إعادة ضبط السيناريو</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Simulated Extra Expense */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    محاكاة مصروف استثنائي طارئ ({metrics.currencyCode}):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={whatIfExpense || ''}
                      onChange={(e) => setWhatIfExpense(Math.max(0, Number(e.target.value)))}
                      placeholder="أدخل مبلغ المصروف الطارئ..."
                      className="w-full bg-[#0A0D10] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[#D9B978] transition-colors"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-slate-400 font-bold">
                      {metrics.currencySymbol}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    يخصم فورياً من رصيد السيولة لاختبار أثره على ميزانيتك وأمانك المالي.
                  </p>
                </div>

                {/* Simulated Receivables Collection Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    محاكاة تحصيل الديون المستحقة لك:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncludeReceivables(!includeReceivables)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between text-right ${
                      includeReceivables
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#0A0D10] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        includeReceivables ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                      }`}>
                        {includeReceivables && <CheckCircle2 size={12} />}
                      </div>
                      <span>افتراض تحصيل {metrics.simulatedReceivablesInPeriod.toLocaleString()} {metrics.currencySymbol}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {includeReceivables ? 'مفعل' : 'مستبعد'}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400">
                    حسب المعايير المحاسبية، الديون المستحقة تستبعد من الأمان المالي حتى يتم قبضها فعلياً.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Executive KPI Grid (Clean White/Gold Bank Atmosphere) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Safe Daily Spend */}
        <div className="bg-[#11161C] border border-[#D9B978]/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-[#D9B978]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              الإنفاق اليومي الآمن
            </span>
            <ShieldCheck size={16} className="text-[#D9B978]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 font-mono tabular-nums">
            {Math.round(metrics.safeToSpendDaily).toLocaleString()}{' '}
            <span className="text-xs font-bold font-sans text-[#D9B978]">{metrics.currencySymbol}</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            سقف الصرف اليومي الآمن دون الإخلال بالتزاماتك
          </span>
        </div>

        {/* Card 2: Safe To Spend Total */}
        <div className="bg-[#11161C] border border-white/10 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              فائض السيولة المتاح
            </span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">
              {horizonDays} يوم
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1.5 font-mono tabular-nums">
            {Math.round(metrics.safeToSpendTotal).toLocaleString()}{' '}
            <span className="text-xs font-bold font-sans text-slate-400">{metrics.currencySymbol}</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            بعد خصم الميزانيات والديون المستحقة
          </span>
        </div>

        {/* Card 3: Liquidity Runway */}
        <div className="bg-[#11161C] border border-white/10 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 right-0 left-0 h-1 ${
            metrics.healthStatus === 'healthy' ? 'bg-emerald-500' :
            metrics.healthStatus === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              فترة أمان السيولة
            </span>
            <Clock size={16} className={metrics.healthStatus === 'healthy' ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 font-mono tabular-nums">
            {metrics.runwayDays}{' '}
            <span className="text-xs font-bold font-sans text-slate-400">يوماً</span>
          </p>
          <span className={`text-[10px] font-bold block mt-1 ${
            metrics.healthStatus === 'healthy' ? 'text-emerald-400' :
            metrics.healthStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {metrics.healthStatus === 'healthy' ? 'سيولة ممتازة لتغطية المصاريف' :
             metrics.healthStatus === 'warning' ? 'مستوى سيولة يحتاج للمراقبة' : 'تحذير: سيولة حرجة'}
          </span>
        </div>

        {/* Card 4: Ending Projected Balance */}
        <div className="bg-[#11161C] border border-white/10 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-[#759BC8]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              الرصيد المتوقع نهاية الفترة
            </span>
            <span className={`text-[10px] font-bold font-mono ${netTrajectoryChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netTrajectoryChange >= 0 ? '+' : ''}{Math.round(netTrajectoryChange).toLocaleString()}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white mt-1.5 font-mono tabular-nums">
            {Math.round(endingBalance).toLocaleString()}{' '}
            <span className="text-xs font-bold font-sans text-[#759BC8]">{metrics.currencySymbol}</span>
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            الرصيد المتوقع بعد {horizonDays} يوماً
          </span>
        </div>
      </div>

      {/* 5. Responsive Cashflow Trajectory Chart */}
      <div className="bg-[#11161C] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D9B978]" />
              <span>منحنى مسار السيولة النقدية المتوقع ({horizonDays} يوماً)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تتبع يومي لتأثير الدخل الدوري، استحقاق الديون، والمصروف اليومي على رصيدك
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-300">
            <div>
              <span className="text-slate-400 font-sans text-[10px]">البداية: </span>
              <span>{Math.round(metrics.availableLiquidity).toLocaleString()}</span>
            </div>
            <span className="text-slate-600">→</span>
            <div>
              <span className="text-slate-400 font-sans text-[10px]">النهاية: </span>
              <span className={endingBalance >= metrics.availableLiquidity ? 'text-emerald-400' : 'text-amber-400'}>
                {Math.round(endingBalance).toLocaleString()} {metrics.currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* SVG Visualization */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox="0 0 800 220"
            className="w-full h-44 sm:h-56 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D9B978" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#D9B978" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid guidelines */}
            <line x1="20" y1="20" x2="780" y2="20" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />
            <line x1="20" y1="110" x2="780" y2="110" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />
            <line x1="20" y1="200" x2="780" y2="200" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />

            {/* Gradient Area */}
            {svgPath && (
              <path
                d={svgPath.areaPath}
                fill="url(#cashflowGrad)"
              />
            )}

            {/* Main Trajectory Line */}
            {svgPath && (
              <path
                d={svgPath.linePath}
                fill="none"
                stroke="#D9B978"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Key Milestone Nodes (Days with Scheduled Events) */}
            {svgPath && trajectory.map((point, idx) => {
              const hasEvents = point.events.some(e => e.title !== 'المتوسط اليومي للمصاريف المعتادة');
              if (!hasEvents && idx !== 0 && idx !== trajectory.length - 1) return null;

              const pt = svgPath.points[idx];
              if (!pt) return null;

              return (
                <circle
                  key={`pt-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={hasEvents ? 4.5 : 3}
                  fill={hasEvents ? '#fbbf24' : '#D9B978'}
                  stroke="#11161C"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-6 transition-all"
                  onClick={() => setSelectedDayIndex(idx)}
                />
              );
            })}
          </svg>
        </div>

        {/* Selected Day Point Inspector */}
        {selectedDayIndex !== null && trajectory[selectedDayIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-[#171D24] rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#D9B978]" />
              <span className="font-bold text-white">
                يوم {trajectory[selectedDayIndex].dayIndex} ({trajectory[selectedDayIndex].date} - {trajectory[selectedDayIndex].dayNameAr})
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono font-bold">
              <div>
                <span className="text-slate-400 font-sans text-[10px]">الرصيد: </span>
                <span className="text-white">{Math.round(trajectory[selectedDayIndex].closingBalance).toLocaleString()} {metrics.currencySymbol}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans text-[10px]">التغير: </span>
                <span className={trajectory[selectedDayIndex].netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {trajectory[selectedDayIndex].netChange >= 0 ? '+' : ''}{Math.round(trajectory[selectedDayIndex].netChange).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayIndex(null)}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              إغلاق
            </button>
          </motion.div>
        )}
      </div>

      {/* 6. Upcoming Milestone Cashflow Events Timeline */}
      <div className="bg-[#11161C] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#D9B978]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              جدول الالتزامات والدخول المجدولة القادمة
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {upcomingEvents.length} أحداث مالية مجدولة
          </span>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            لا توجد ديون مستحقة أو عمليات دورية مجدولة خلال هذه الفترة
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {upcomingEvents.map((evt, idx) => {
              const isIncome = evt.type === 'income' || evt.type === 'debt_receivable';
              return (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs leading-snug">{evt.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{evt.date}</p>
                    </div>
                  </div>

                  <div className="text-left font-mono font-bold tabular-nums">
                    <span className={isIncome ? 'text-emerald-400' : 'text-rose-400'}>
                      {isIncome ? '+' : '-'}{Math.round(evt.amount).toLocaleString()}
                    </span>{' '}
                    <span className="text-[10px] text-slate-400 font-sans">{evt.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
