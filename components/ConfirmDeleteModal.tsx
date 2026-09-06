import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, RotateCcw, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet as WalletIcon, Calendar } from 'lucide-react';
import { Transaction } from '../types';
import { NativeHaptics } from '../services/nativeServices';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: () => void;
  walletName?: string;
  categoryName?: string;
  language?: 'ar' | 'en';
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onConfirm,
  walletName,
  categoryName,
  language = 'ar',
}) => {
  const isEn = language === 'en';

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isExpense = transaction.type === 'expense' || (!isIncome && !isTransfer);

  const handleConfirm = () => {
    NativeHaptics.notification('WARNING').catch(() => {});
    onConfirm();
  };

  const handleCancel = () => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        dir={isEn ? 'ltr' : 'rtl'}
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCancel();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-sm sm:max-w-md bg-[#11161C] border border-[#C98387]/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-5 sm:p-6 overflow-hidden flex flex-col text-center"
        >
          {/* Subtle Ambient Crimson Glow */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-44 h-44 bg-[#C98387]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
            title={isEn ? 'Close' : 'إغلاق'}
          >
            <X size={16} />
          </button>

          {/* Header Icon Badge */}
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-[#C98387]/15 border border-[#C98387]/30 text-[#C98387] flex items-center justify-center shadow-lg shadow-[#C98387]/10 shrink-0">
            <Trash2 size={24} strokeWidth={2.2} />
          </div>

          {/* Dialog Titles */}
          <h3 className="text-lg sm:text-xl font-black text-[#F4F1EA] mb-1 tracking-tight">
            {isEn ? 'Delete Transaction?' : 'تأكيد حذف المعاملة'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-4 leading-relaxed font-medium">
            {isEn 
              ? 'Are you sure you want to remove this transaction from your records?' 
              : 'هل أنت متأكد من رغبتك في حذف هذه المعاملة من سجلك المالي؟'}
          </p>

          {/* Transaction Summary Card */}
          <div className="p-3.5 bg-[#0A0D10]/80 border border-white/[0.07] rounded-2xl mb-4 text-start">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isIncome ? 'bg-[#8EB9A7]/20 text-[#8EB9A7]' : isTransfer ? 'bg-[#759BC8]/20 text-[#759BC8]' : 'bg-[#C98387]/20 text-[#C98387]'
                }`}>
                  {isIncome ? <ArrowUpRight size={14} /> : isTransfer ? <ArrowLeftRight size={14} /> : <ArrowDownLeft size={14} />}
                </div>
                <span className="text-xs font-bold text-slate-300 truncate">
                  {transaction.note || categoryName || (isTransfer ? (isEn ? 'Transfer' : 'تحويل') : (isEn ? 'Operation' : 'معاملة'))}
                </span>
              </div>

              <div className={`text-sm sm:text-base font-black font-numeric shrink-0 ${
                isIncome ? 'text-[#8EB9A7]' : isTransfer ? 'text-[#759BC8]' : 'text-[#C98387]'
              }`}>
                {isExpense ? '-' : isIncome ? '+' : ''}
                {parseFloat(transaction.amount?.toString() || '0').toLocaleString()} {transaction.currency}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5 truncate">
                <WalletIcon size={12} className="text-[#D9B978]/80 shrink-0" />
                <span className="truncate">{walletName || (isEn ? 'Primary Wallet' : 'المحفظة الأساسية')}</span>
              </div>
              <div className="flex items-center gap-1 font-numeric shrink-0">
                <Calendar size={12} className="text-slate-500 shrink-0" />
                <span>{transaction.date}</span>
              </div>
            </div>
          </div>

          {/* Safe Recycle Info Banner */}
          <div className="p-2.5 bg-[#D9B978]/10 border border-[#D9B978]/20 rounded-xl mb-5 flex items-center gap-2.5 text-start">
            <RotateCcw size={15} className="text-[#D9B978] shrink-0" />
            <p className="text-[11px] text-[#D9B978] leading-tight font-medium">
              {isEn 
                ? 'Moved safely to the recycle bin. You can restore or undo anytime.' 
                : 'سيتم نقلها بأمان إلى سلة المحذوفات، مع إمكانية التراجع فوراً أو استعادتها.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#C98387] to-[#B3686D] hover:brightness-110 active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#C98387]/20 flex items-center justify-center gap-2 transition-all"
            >
              <Trash2 size={16} />
              <span>{isEn ? 'Move to Recycle Bin' : 'تأكيد الحذف والنقل للسلة'}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#171D24] hover:bg-[#1C242E] active:scale-[0.98] text-slate-300 hover:text-white font-bold text-xs sm:text-sm border border-white/10 transition-all"
            >
              <span>{isEn ? 'Cancel & Keep' : 'إلغاء والاحتفاظ بالمعاملة'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
