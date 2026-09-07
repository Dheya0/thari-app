import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  HandCoins, 
  FileText, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Repeat, 
  CheckCircle2, 
  Layers,
  Sparkles,
  Lock,
  Smartphone,
  CreditCard,
  Building2,
  Receipt,
  Download,
  Fingerprint,
  RotateCcw,
  Check
} from 'lucide-react';
import Logo from './Logo';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish?: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  isOpen,
  onClose,
  onFinish,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Interactive playground state for step 1 (Wallets)
  const [selectedWalletIdx, setSelectedWalletIdx] = useState(0);

  // Interactive playground state for step 2 (Transactions)
  const [activeTxType, setActiveTxType] = useState<'expense' | 'income' | 'transfer'>('expense');

  // Interactive playground state for step 3 (Edit/Delete)
  const [editDemoState, setEditDemoState] = useState<'normal' | 'editing' | 'deleted'>('normal');

  // Interactive playground state for step 4 (Debts)
  const [debtDemoType, setDebtDemoType] = useState<'to_me' | 'on_me'>('to_me');

  // Interactive playground state for step 5 (Reports & Security)
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isBioActive, setIsBioActive] = useState(true);

  if (!isOpen) return null;

  const totalSteps = 5;

  const handleSkipOrFinish = () => {
    if (onFinish) {
      onFinish();
    } else {
      onClose();
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSkipOrFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#07090C]/90 backdrop-blur-xl z-[250] flex items-center justify-center p-3.5 sm:p-5 overflow-y-auto select-none animate-fade">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 -right-10 w-96 h-96 bg-[#D9B978]/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-10 w-96 h-96 bg-[#8EB9A7]/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Main Glass Modal Card */}
      <div className="relative w-full max-w-lg bg-[#10151C]/95 border border-white/10 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative p-1 rounded-xl bg-[#D9B978]/10 border border-[#D9B978]/20 flex items-center justify-center">
              <Logo size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#F4F1EA]">ثَـري</span>
                <span className="text-[10px] font-bold text-[#D9B978] bg-[#D9B978]/15 px-2 py-0.2 rounded-full border border-[#D9B978]/30">
                  دليل البداية السريعة
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium">جولة تفاعلية ممتعة وسلسة</p>
            </div>
          </div>

          {/* Top Skip Button & Step Pill */}
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/10">
              {currentStep + 1} / {totalSteps}
            </span>
            <button
              type="button"
              onClick={handleSkipOrFinish}
              className="text-xs font-bold text-slate-400 hover:text-[#D9B978] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-xl border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              title="تجاوز الجولة الترحيبية"
            >
              <span>تجاوز</span>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-white/[0.04] h-1.5 relative overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#D9B978] via-[#8EB9A7] to-[#D9B978]"
            initial={{ width: '20%' }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* Main Content Area */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: WALLETS & MULTI-CURRENCY */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/30">
                      <Wallet size={16} />
                    </span>
                    <span className="text-xs font-black text-[#D9B978]">1. الأساس المالي</span>
                  </div>
                  <h3 className="text-lg font-black text-[#F4F1EA]">المحافظ والعملات المتعددة</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    قسّم أموالك إلى محافظ حقيقية (كاش، بنك، عملات أجنبية) مع احتساب وتوحيد صافي ثروتك آلياً.
                  </p>
                </div>

                {/* Interactive Demo Sandbox: Wallets */}
                <div className="p-3.5 rounded-2xl bg-[#090C10] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>⚡ جرّب الضغط على المحفظة للتبديل:</span>
                    <span className="text-[#D9B978] text-[10px]">تفاعلي مباشر</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'كاش الراتب', cur: 'YER', amount: '350,000 ر.ي', icon: Wallet, color: 'emerald' },
                      { name: 'حساب بنكي', cur: 'SAR', amount: '4,200 ر.س', icon: Building2, color: 'amber' },
                      { name: 'مدخرات طوارئ', cur: 'USD', amount: '$ 1,500', icon: CreditCard, color: 'blue' },
                    ].map((w, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedWalletIdx(idx)}
                        className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer relative overflow-hidden ${
                          selectedWalletIdx === idx 
                            ? 'bg-[#18202A] border-[#D9B978] shadow-[0_0_15px_rgba(217,185,120,0.2)] scale-[1.03]' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/20 opacity-70'
                        }`}
                      >
                        {selectedWalletIdx === idx && (
                          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[#D9B978] animate-ping" />
                        )}
                        <w.icon size={15} className={selectedWalletIdx === idx ? 'text-[#D9B978]' : 'text-slate-400'} />
                        <div className="text-[11px] font-bold text-[#F4F1EA] mt-1.5 line-clamp-1">{w.name}</div>
                        <div className="text-[10px] font-black text-emerald-400 font-mono">{w.amount}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                      <Coins size={14} className="text-[#D9B978]" />
                      <span>سعر الصرف المعتمد يتم تثبيته لمنع الخلاف</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">1 USD = 1,600 YER</span>
                  </div>
                </div>

                {/* Practical Tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#D9B978]/5 border border-[#D9B978]/20 text-start">
                  <Sparkles size={16} className="text-[#D9B978] shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    <strong className="text-[#D9B978] font-bold">كيف تضيف محفظة؟</strong> من الشاشة الرئيسية اضغط على قائمة المحافظ ثم زر <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded text-[10px]">+ إضافة محفظة</span> وحدد اسمها وعملتها.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: TRANSACTIONS & QUICK ADD (+) */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <PlusCircle size={16} />
                    </span>
                    <span className="text-xs font-black text-emerald-400">2. تسجيل العمليات اليومية</span>
                  </div>
                  <h3 className="text-lg font-black text-[#F4F1EA]">الزر السريع المركزي (+)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    سجّل مصروفك، إيرادك، أو تحويلاتك بين المحافظ في ثوانٍ مع إرفاق صور الفواتير.
                  </p>
                </div>

                {/* Interactive Demo Sandbox: Transaction Types */}
                <div className="p-3.5 rounded-2xl bg-[#090C10] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>⚡ اختر نوع الحركة لتجربة المحاكي:</span>
                  </div>

                  {/* Segmented Control */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.04] rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setActiveTxType('expense')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTxType === 'expense' 
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-100' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowUpRight size={14} />
                      <span>مصروف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTxType('income')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTxType === 'income' 
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-black scale-100' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowDownLeft size={14} />
                      <span>إيراد</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTxType('transfer')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTxType === 'transfer' 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-100' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Repeat size={14} />
                      <span>تحويل</span>
                    </button>
                  </div>

                  {/* Animated Simulated Card */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        activeTxType === 'expense' ? 'bg-rose-500/20 text-rose-400' :
                        activeTxType === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {activeTxType === 'expense' && <ArrowUpRight size={18} />}
                        {activeTxType === 'income' && <ArrowDownLeft size={18} />}
                        {activeTxType === 'transfer' && <Repeat size={18} />}
                      </div>
                      <div className="text-start">
                        <div className="text-xs font-bold text-[#F4F1EA]">
                          {activeTxType === 'expense' && 'مشتريات وبقالة الأسبوع'}
                          {activeTxType === 'income' && 'إيداع الراتب الشهري'}
                          {activeTxType === 'transfer' && 'تحويل من الكاش للبنك'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Receipt size={10} />
                          <span>فاتورة مرفقة • محفظة الراتب</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <div className={`text-xs font-black ${
                        activeTxType === 'expense' ? 'text-rose-400' :
                        activeTxType === 'income' ? 'text-emerald-400' :
                        'text-blue-400'
                      }`}>
                        {activeTxType === 'expense' && '- 18,500 ر.ي'}
                        {activeTxType === 'income' && '+ 250,000 ر.ي'}
                        {activeTxType === 'transfer' && '⇄ 50,000 ر.ي'}
                      </div>
                      <span className="text-[9px] text-slate-500">تم التوثيق</span>
                    </div>
                  </div>
                </div>

                {/* Practical Tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-start">
                  <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    <strong className="text-emerald-400 font-bold">أين زر الإضافة؟</strong> الزر الذهبي البارز (+) أسفل منتصف الشاشة دائماً جاهز لتسجيل أي حركة بلمسة واحدة.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 3: EDIT, DELETE & RECYCLE BIN */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Edit3 size={16} />
                    </span>
                    <span className="text-xs font-black text-blue-400">3. التعديل والحذف السريع</span>
                  </div>
                  <h3 className="text-lg font-black text-[#F4F1EA]">تعديل بلمسة واحدة وسلة آمنة</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    هل أخطأت في كتابة المبلغ؟ اضغط على المعاملة لتعديلها، أو احذفها واستعدها خلال 30 يوماً.
                  </p>
                </div>

                {/* Interactive Demo Sandbox: Live Edit & Delete Card */}
                <div className="p-3.5 rounded-2xl bg-[#090C10] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>⚡ جرّب التفاعل مع العملية التجريبية أدناه:</span>
                  </div>

                  <div className="relative">
                    <div className="p-3 rounded-xl bg-[#18202A] border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center font-bold">
                          🛒
                        </div>
                        <div className="text-start">
                          <div className="text-xs font-bold text-[#F4F1EA]">
                            {editDemoState === 'editing' ? 'تعديل: فاتورة مطعم (تم التصحيح)' : 'فاتورة مطعم وغداء'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {editDemoState === 'editing' ? 'المبلغ الجديد: 6,000 ر.ي' : 'المبلغ الأصلي: 4,500 ر.ي'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditDemoState(prev => prev === 'editing' ? 'normal' : 'editing')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#D9B978]/20 hover:bg-[#D9B978]/30 text-[#D9B978] text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>{editDemoState === 'editing' ? 'تم الحفظ ✓' : 'تعديل'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditDemoState('deleted')}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Deleted Alert state */}
                    {editDemoState === 'deleted' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-[#11161C]/95 border border-rose-500/40 rounded-xl p-2.5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                          <Trash2 size={15} />
                          <span>نُقلت لسلة المهملات (محفوظة 30 يوماً)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditDemoState('normal')}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black hover:bg-emerald-500/30 active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw size={11} />
                          <span>استرجاع</span>
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-400 shrink-0" />
                    <span>لا تقلق من الحذف العفوي، فالسلة توفر استعادة كاملة بضغطة زر.</span>
                  </div>
                </div>

                {/* Practical Tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-start">
                  <Sparkles size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    <strong className="text-blue-400 font-bold">طريقة سريعة:</strong> انقر مباشرة على أي بطاقة عملية في سجل المعاملات لتعديل أي تفصيل فوراً.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 4: DEBTS & LIABILITIES */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <HandCoins size={16} />
                    </span>
                    <span className="text-xs font-black text-amber-400">4. الالتزامات والذمم</span>
                  </div>
                  <h3 className="text-lg font-black text-[#F4F1EA]">إدارة الديون والأقساط</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    فرّق بوضوح بين الديون التي لك والالتزامات التي عليك، مع تتبع سداد الأقساط الجزئية.
                  </p>
                </div>

                {/* Interactive Demo Sandbox: Debts */}
                <div className="p-3.5 rounded-2xl bg-[#090C10] border border-white/10 space-y-3">
                  {/* Toggle: To Me vs On Me */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDebtDemoType('to_me')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        debtDemoType === 'to_me' 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md font-bold' 
                          : 'bg-white/[0.02] border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">دين لـي (لنا) 🟢</div>
                      <div className="text-[10px] text-slate-400">مستحقات ننتظر تحصيلها</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDebtDemoType('on_me')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        debtDemoType === 'on_me' 
                          ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-md font-bold' 
                          : 'bg-white/[0.02] border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="text-xs">دين علـي (علينا) 🔴</div>
                      <div className="text-[10px] text-slate-400">التزام مالي يجب سداده</div>
                    </button>
                  </div>

                  {/* Simulated Debt Card */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-start">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-[#F4F1EA]">
                        {debtDemoType === 'to_me' ? 'أحمد الشامي (مستحق لك)' : 'شركة الكهرباء (فاتورة مستحقة)'}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        debtDemoType === 'to_me' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {debtDemoType === 'to_me' ? 'متبقي 40%' : 'مستحق السداد'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${debtDemoType === 'to_me' ? 'bg-emerald-400' : 'bg-rose-400'}`} 
                        style={{ width: debtDemoType === 'to_me' ? '60%' : '25%' }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>مدفوع: 600 $</span>
                      <span className="text-[#D9B978]">الإجمالي: 1,000 $ (مثبت بـ 1.6M YER)</span>
                    </div>
                  </div>
                </div>

                {/* Practical Tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-start">
                  <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    <strong className="text-amber-400 font-bold">تسديد جزئي:</strong> يمكنك تسجيل دفعات جزئية في أي وقت مع حساب المتبقي تلقائياً دون أي حيرة.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REPORTS & MAXIMUM PRIVACY */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#D9B978]/20 text-[#D9B978] border border-[#D9B978]/30">
                      <FileText size={16} />
                    </span>
                    <span className="text-xs font-black text-[#D9B978]">5. التقارير والأمان</span>
                  </div>
                  <h3 className="text-lg font-black text-[#F4F1EA]">تقارير PDF احترافية وخصوصية 100%</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    أصدر كشوفاتك المحاسبية بأعلى دقة وتنسيق للطباعة، وكل بياناتك مشفرة ومحفوظة على جهازك فقط.
                  </p>
                </div>

                {/* Interactive Demo Sandbox: PDF Export & Biometric */}
                <div className="p-3.5 rounded-2xl bg-[#090C10] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>⚡ جرب أزرار الميزات الاحترافية:</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* PDF Export Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setExportSuccess(true);
                        setTimeout(() => setExportSuccess(false), 3000);
                      }}
                      className="p-3 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 hover:bg-[#D9B978]/25 text-start active:scale-95 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <FileText size={16} className="text-[#D9B978]" />
                        {exportSuccess ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <Check size={12} /> تم التوليد
                          </span>
                        ) : (
                          <Download size={14} className="text-slate-400" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-[#F4F1EA]">تصدير كشف PDF</div>
                      <div className="text-[9.5px] text-slate-400">تكرار الرؤوس وختم رسمي</div>
                    </button>

                    {/* Biometric Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsBioActive(prev => !prev)}
                      className={`p-3 rounded-xl border text-start active:scale-95 transition-all cursor-pointer space-y-1 ${
                        isBioActive 
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                          : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Fingerprint size={18} />
                        <span className="text-[10px] font-bold">{isBioActive ? 'مفعّل ✓' : 'معطّل'}</span>
                      </div>
                      <div className="text-xs font-bold text-[#F4F1EA]">قفل البصمة و PIN</div>
                      <div className="text-[9.5px] text-slate-400">حماية سرية مطلقة</div>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="shrink-0" />
                    <span>تطبيق ثري يعمل بدون إنترنت ولا يشارك بياناتك مع أي طرف ثالث أبداً.</span>
                  </div>
                </div>

                {/* Practical Tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#D9B978]/5 border border-[#D9B978]/20 text-start">
                  <Sparkles size={16} className="text-[#D9B978] shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    <strong className="text-[#D9B978] font-bold">مبروك!</strong> أنت الآن جاهز لبدء إدارة أموالك وثروتك باحترافية كاملة.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Bottom Navigation & Controls */}
        <div className="p-4 sm:p-5 border-t border-white/[0.07] bg-[#141A22]/90 flex items-center justify-between gap-3">
          
          {/* Step Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep 
                    ? 'w-7 bg-gradient-to-r from-[#D9B978] to-[#8EB9A7]' 
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                title={`الخطوة ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons: Prev & Next / Start */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronRight size={16} />
                <span>السابق</span>
              </button>
            )}

            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B978] to-[#c9a764] hover:opacity-95 text-slate-950 text-xs font-black shadow-[0_4px_18px_rgba(217,185,120,0.35)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkipOrFinish}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B978] via-[#8EB9A7] to-[#D9B978] hover:opacity-95 text-slate-950 text-xs font-black shadow-[0_4px_20px_rgba(217,185,120,0.4)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>ابدأ الآن</span>
                <Sparkles size={15} />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default OnboardingGuideModal;
