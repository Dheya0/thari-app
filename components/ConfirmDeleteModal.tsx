import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, RotateCcw, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet as WalletIcon, Calendar, Tag, ShieldAlert } from 'lucide-react';
import { Transaction } from '../types';
import { NativeHaptics } from '../services/nativeServices';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: () => void;
  walletName?: string;
  destWalletName?: string;
  categoryName?: string;
  language?: 'ar' | 'en';
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onConfirm,
  walletName,
  destWalletName,
  categoryName,
  language = 'ar',
}) => {
  const isEn = language === 'en';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const amountNum = Math.abs(parseFloat(transaction.amount?.toString() || '0'));

  return (
    <AnimatePresence>
      <div 
        dir={isEn ? 'ltr' : 'rtl'}
        className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCancel();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className="relative w-full max-w-md bg-[#0E1319] border border-white/[0.08] rounded-3xl sm:rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.85)] p-5 sm:p-6 overflow-hidden flex flex-col text-start ring-1 ring-white/[0.05]"
          onClick={e => e.stopPropagation()}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#C98387]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#D9B978]/8 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar with Icon & Dismiss */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06] relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#C98387]/15 border border-[#C98387]/25 text-[#C98387] flex items-center justify-center shadow-inner">
                <Trash2 size={19} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#F4F1EA] tracking-tight">
                  {isEn ? 'Confirm Removal' : 'تأكيد حذف المعاملة'}
                </h3>
                <span className="text-[11px] text-slate-400 font-medium block">
                  {isEn ? 'Safe removal to Recycle Bin' : 'حذف آمن مع حفظ في سلة المهملات'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white active:scale-95 transition-all"
              title={isEn ? 'Close' : 'إغلاق'}
            >
              <X size={17} />
            </button>
          </div>

          {/* Elegant Transaction Summary Card */}
          <div className="p-4 bg-[#141A23]/90 border border-white/[0.07] rounded-2xl mb-4 relative overflow-hidden group">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isIncome ? 'bg-[#8EB9A7]/15 text-[#8EB9A7] border border-[#8EB9A7]/25' 
                  : isTransfer ? 'bg-[#759BC8]/15 text-[#759BC8] border border-[#759BC8]/25' 
                  : 'bg-[#C98387]/15 text-[#C98387] border border-[#C98387]/25'
                }`}>
                  {isIncome ? <ArrowUpRight size={17} strokeWidth={2.5} /> 
                  : isTransfer ? <ArrowLeftRight size={17} strokeWidth={2.5} /> 
                  : <ArrowDownLeft size={17} strokeWidth={2.5} />}
                </div>

                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[#F4F1EA] block truncate">
                    {transaction.note || categoryName || (isTransfer ? (isEn ? 'Transfer' : 'تحويل') : (isEn ? 'Transaction' : 'معاملة'))}
                  </span>
                  {categoryName && transaction.note && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                      <Tag size={10} className="text-[#D9B978]/80 shrink-0" />
                      <span className="truncate">{categoryName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Display */}
              <div className="text-end shrink-0">
                <div className={`text-base sm:text-lg font-black font-numeric tracking-tight ${
                  isIncome ? 'text-[#8EB9A7]' : isTransfer ? 'text-[#759BC8]' : 'text-[#C98387]'
                }`}>
                  {isExpense ? '-' : isIncome ? '+' : ''}
                  {amountNum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  <span className="text-xs font-bold font-sans mx-1 text-slate-300">
                    {transaction.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta Tags (Wallet & Date) */}
            <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5 truncate">
                <WalletIcon size={12} className="text-[#D9B978] shrink-0" />
                <span className="truncate text-slate-300">
                  {isTransfer && destWalletName 
                    ? `${walletName || (isEn ? 'Wallet' : 'محفظة')} ➔ ${destWalletName}` 
                    : walletName || (isEn ? 'Primary Wallet' : 'المحفظة')}
                </span>
              </div>
              <div className="flex items-center gap-1 font-numeric shrink-0 text-slate-400">
                <Calendar size={12} className="text-slate-500 shrink-0" />
                <span>{transaction.date}</span>
              </div>
            </div>
          </div>

          {/* Reassurance Notice */}
          <div className="p-3 bg-[#D9B978]/[0.07] border border-[#D9B978]/20 rounded-2xl mb-5 flex items-start gap-2.5">
            <RotateCcw size={15} className="text-[#D9B978] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-[#D9B978]/90 font-medium">
              {isEn ? (
                <>
                  <span className="font-bold text-[#D9B978]">No worries: </span>
                  You can immediately tap <strong>Undo</strong> in the bottom notification, or recover this transaction anytime from Settings &gt; Recycle Bin.
                </>
              ) : (
                <>
                  <span className="font-bold text-[#D9B978]">لا داعي للقلق: </span>
                  يمكنك التراجع فوراً بالضغط على زر <strong>تراجع</strong> بالإشعار، أو استعادتها لاحقاً من الإعدادات &gt; سلة المحذوفات.
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 relative z-10">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[#C98387] hover:bg-[#BD7579] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#C98387]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 size={16} />
              <span>{isEn ? 'Delete Transaction' : 'حذف المعاملة'}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="py-3.5 px-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] active:scale-[0.98] text-slate-300 hover:text-white font-bold text-xs sm:text-sm border border-white/10 transition-all cursor-pointer text-center"
            >
              <span>{isEn ? 'Cancel' : 'إلغاء'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
