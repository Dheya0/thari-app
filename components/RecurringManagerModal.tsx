import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Repeat, Play, Pause, Trash2, Plus, Calendar, 
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Clock, ArrowRight
} from 'lucide-react';
import { RecurringRule, Wallet, Category, Currency } from '../types';
import { formatLocalDateOnly } from '../utils/formatters';
import { useBackNavigation } from '../utils/backNavigation';

interface RecurringManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RecurringRule[];
  wallets: Wallet[];
  categories: Category[];
  currencies: Currency[];
  onToggleActive: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onAddRule: (rule: Omit<RecurringRule, 'id' | 'createdAt'>) => void;
  onTriggerCatchup: () => void;
  language?: 'ar' | 'en';
}

const STRINGS = {
  ar: {
    title: 'إدارة العمليات الدورية والمجدولة',
    subtitle: 'الرواتب، الإيجارات، الاشتراكات والتحويلات التلقائية',
    totalRules: 'إجمالي القواعد:',
    catchupBtn: 'فحص الاستحقاق',
    catchupTooltip: 'التحقق الآن من العمليات المستحقة وتوليدها',
    addRuleBtn: 'إضافة قاعدة دورية',
    cancel: 'إلغاء',
    newRuleHeader: 'قاعدة دورية جديدة',
    expense: 'مصروف دوري',
    income: 'دخل دوري',
    transfer: 'تحويل دوري',
    descriptionLabel: 'الوصف / العنوان',
    descriptionPlaceholder: 'مثال: إيجار الشقة، راتب شهري...',
    amountLabel: 'المبلغ',
    frequencyLabel: 'التكرار',
    walletLabel: 'المحفظة',
    sourceWalletLabel: 'المحفظة المصدر',
    destWalletLabel: 'المحفظة المستلمة',
    categoryLabel: 'التصنيف',
    saveRuleBtn: 'حفظ القاعدة',
    noRulesTitle: 'لا توجد قواعد دورية مسجلة حالياً',
    noRulesDesc: 'أضف التزاماتك المتكررة مثل الرواتب أو الإيجارات ليتم تسجيلها تلقائياً عند حلول موعدها.',
    frequencies: {
      daily: 'يومياً',
      weekly: 'أسبوعياً',
      monthly: 'شهرياً',
      yearly: 'سنوياً'
    },
    pausedBadge: 'موقوفة مؤقتاً',
    nextDate: 'القادمة:',
    pauseTitle: 'إيقاف مؤقت',
    activateTitle: 'تفعيل',
    deleteTitle: 'حذف القاعدة',
    unknownWallet: 'مجهولة'
  },
  en: {
    title: 'Recurring & Scheduled Rules',
    subtitle: 'Salaries, rents, recurring bills, and automated transfers',
    totalRules: 'Total Rules:',
    catchupBtn: 'Check Due Rules',
    catchupTooltip: 'Check and generate all currently due recurring operations',
    addRuleBtn: 'Add Recurring Rule',
    cancel: 'Cancel',
    newRuleHeader: 'New Recurring Rule',
    expense: 'Recurring Expense',
    income: 'Recurring Income',
    transfer: 'Recurring Transfer',
    descriptionLabel: 'Description / Title',
    descriptionPlaceholder: 'e.g. Apartment Rent, Monthly Salary...',
    amountLabel: 'Amount',
    frequencyLabel: 'Frequency',
    walletLabel: 'Wallet',
    sourceWalletLabel: 'Source Wallet',
    destWalletLabel: 'Destination Wallet',
    categoryLabel: 'Category',
    saveRuleBtn: 'Save Rule',
    noRulesTitle: 'No recurring rules registered yet',
    noRulesDesc: 'Add recurring obligations like salaries or rents to automate record generation on schedule.',
    frequencies: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    },
    pausedBadge: 'Paused',
    nextDate: 'Next:',
    pauseTitle: 'Pause Rule',
    activateTitle: 'Activate Rule',
    deleteTitle: 'Delete Rule',
    unknownWallet: 'Unknown'
  }
};

export const RecurringManagerModal: React.FC<RecurringManagerModalProps> = ({
  isOpen,
  onClose,
  rules,
  wallets,
  categories,
  currencies,
  onToggleActive,
  onDeleteRule,
  onAddRule,
  onTriggerCatchup,
  language = 'ar',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(currencies[0]?.code || 'SAR');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[1]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(formatLocalDateOnly(new Date()));

  if (!isOpen) return null;

  const isRTL = language === 'ar';
  const t = STRINGS[language] || STRINGS.ar;

  useBackNavigation(() => {
    if (isAdding) {
      setIsAdding(false);
      return true;
    }
    onClose();
    return true;
  }, isOpen, 15);

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0 || !walletId) return;

    onAddRule({
      description,
      type,
      amount: parseFloat(amount),
      currency,
      walletId,
      destinationWalletId: type === 'transfer' ? destinationWalletId : undefined,
      categoryId: type === 'transfer' ? '' : categoryId,
      frequency,
      startDate,
      nextOccurrence: startDate,
      isActive: true,
    });

    setIsAdding(false);
    setDescription('');
    setAmount('');
  };

  const getFrequencyLabel = (freq: string) => {
    return t.frequencies[freq as keyof typeof t.frequencies] || freq;
  };

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-start"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            {isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="p-2.5 rounded-2xl bg-slate-800 text-amber-400 hover:bg-slate-700 active:scale-90 transition-all border border-amber-500/20 flex items-center justify-center"
                aria-label={language === 'ar' ? 'الرجوع للقائمة' : 'Back to list'}
                title={language === 'ar' ? 'الرجوع للقائمة' : 'Back to list'}
              >
                {isRTL ? <ArrowRight size={18} /> : <ArrowUpRight size={18} className="rotate-180" />}
              </button>
            )}
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Repeat size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{isAdding ? t.newRuleHeader : t.title}</h2>
              <p className="text-xs text-slate-400">{isAdding ? (language === 'ar' ? 'اضغط رجوع للعودة إلى قائمة القواعد' : 'Press back to return to rules list') : t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
              } else {
                onClose();
              }
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors"
            aria-label={t.cancel || 'إغلاق'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="px-5 py-3 bg-slate-950/30 border-b border-slate-800/60 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400">
            {t.totalRules} <span className="font-bold text-amber-400">{rules.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerCatchup}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
              title={t.catchupTooltip}
            >
              <Clock size={14} />
              <span>{t.catchupBtn}</span>
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>{isAdding ? t.cancel : t.addRuleBtn}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Add Form */}
          <AnimatePresence>
            {isAdding && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmitNew}
                className="bg-slate-950/60 border border-amber-500/30 p-4 rounded-2xl space-y-3 overflow-hidden mb-4"
              >
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">{t.newRuleHeader}</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      type === 'expense'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {t.expense}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      type === 'income'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {t.income}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('transfer')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      type === 'transfer'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {t.transfer}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{t.descriptionLabel}</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t.descriptionPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{t.amountLabel}</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="0.01"
                      step="any"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{t.frequencyLabel}</label>
                    <select
                      value={frequency}
                      onChange={(e: any) => setFrequency(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="daily">{t.frequencies.daily}</option>
                      <option value="weekly">{t.frequencies.weekly}</option>
                      <option value="monthly">{t.frequencies.monthly}</option>
                      <option value="yearly">{t.frequencies.yearly}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      {type === 'transfer' ? t.sourceWalletLabel : t.walletLabel}
                    </label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.currencyCode})</option>
                      ))}
                    </select>
                  </div>

                  {type === 'transfer' ? (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">{t.destWalletLabel}</label>
                      <select
                        value={destinationWalletId}
                        onChange={(e) => setDestinationWalletId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {wallets.filter(w => w.id !== walletId).map(w => (
                          <option key={w.id} value={w.id}>{w.name} ({w.currencyCode})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">{t.categoryLabel}</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {categories.filter(c => c.type === (type === 'income' ? 'income' : 'expense')).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors"
                  >
                    {t.saveRuleBtn}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Rules List */}
          {rules.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl space-y-2">
              <Calendar className="mx-auto text-slate-600" size={36} />
              <div className="text-sm font-bold text-slate-400">{t.noRulesTitle}</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t.noRulesDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rules.map((rule) => {
                const wallet = wallets.find(w => w.id === rule.walletId);
                const destWallet = rule.destinationWalletId ? wallets.find(w => w.id === rule.destinationWalletId) : null;
                const category = categories.find(c => c.id === rule.categoryId);

                return (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      rule.isActive
                        ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/20 border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        rule.type === 'income' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : rule.type === 'transfer'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {rule.type === 'income' ? <ArrowDownLeft size={16} /> : rule.type === 'transfer' ? <ArrowLeftRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{rule.description}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                            {getFrequencyLabel(rule.frequency)}
                          </span>
                          {!rule.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500">
                              {t.pausedBadge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{t.walletLabel}: {wallet?.name || t.unknownWallet}</span>
                          {destWallet && <span>→ {destWallet.name}</span>}
                          {category && <span>• {category.name}</span>}
                          <span>• {t.nextDate} {rule.nextOccurrence}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      <div className="text-left sm:text-right font-mono font-bold text-sm text-white">
                        {rule.amount.toLocaleString()} <span className="text-[10px] text-slate-400">{rule.currency}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleActive(rule.id)}
                          className={`p-2 rounded-xl border transition-colors ${
                            rule.isActive
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                          title={rule.isActive ? t.pauseTitle : t.activateTitle}
                        >
                          {rule.isActive ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                          title={t.deleteTitle}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
