import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, RotateCcw, X, ArrowLeftRight } from 'lucide-react';
import { Transaction, Category, Wallet, Currency } from '../types';
import { getIcon } from '../constants';
import { useBackNavigation } from '../utils/backNavigation';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashTransactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  currencies: Currency[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  language?: 'ar' | 'en';
}

const STRINGS = {
  ar: {
    title: 'سلة المحذوفات',
    subtitle: (count: number) => `العمليات المحذوفة مؤقتاً (${count})`,
    banner: 'يمكنك استعادة أي عملية محذوفة بالضغط على زر الاستعادة',
    emptyTrashBtn: 'تفريغ السلة نهائياً',
    emptyTitle: 'سلة المحذوفات فارغة تماماً',
    transferTitle: 'تحويل مالي',
    uncategorized: 'غير مصنف',
    walletFallback: 'محفظة',
    deletedOn: 'حذف',
    restoreTitle: 'استعادة المعاملة',
    deleteTitle: 'حذف نهائي',
    close: 'إغلاق',
  },
  en: {
    title: 'Recycle Bin',
    subtitle: (count: number) => `Temporarily deleted records (${count})`,
    banner: 'You can recover any deleted transaction by clicking the restore button',
    emptyTrashBtn: 'Empty Bin Permanently',
    emptyTitle: 'Recycle Bin is completely empty',
    transferTitle: 'Wallet Transfer',
    uncategorized: 'Uncategorized',
    walletFallback: 'Wallet',
    deletedOn: 'Deleted',
    restoreTitle: 'Restore Transaction',
    deleteTitle: 'Permanent Delete',
    close: 'Close',
  }
};

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashTransactions,
  categories,
  wallets,
  currencies,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  language = 'ar',
}) => {
  useBackNavigation(() => {
    onClose();
    return true;
  }, isOpen, 15);

  if (!isOpen) return null;

  const isRTL = language === 'ar';
  const t = STRINGS[language] || STRINGS.ar;

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4 no-print overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-slate-900 w-full max-w-lg mx-auto rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 flex flex-col max-h-[88dvh] sm:max-h-[88vh] overflow-hidden text-start my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{t.title}</h3>
              <p className="text-[11px] text-slate-400 font-bold">
                {t.subtitle(trashTransactions.length)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            title={t.close}
          >
            <X size={16} />
          </button>
        </div>

        {/* Action toolbar if items exist */}
        {trashTransactions.length > 0 && (
          <div className="py-2.5 flex items-center justify-between shrink-0 border-b border-white/5 gap-2">
            <span className="text-[11px] font-bold text-slate-400 truncate">
              {t.banner}
            </span>
            <button
              type="button"
              onClick={onEmptyTrash}
              className="text-xs font-black text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-500/20 active:scale-95 transition-all shrink-0"
            >
              <Trash2 size={13} />
              <span>{t.emptyTrashBtn}</span>
            </button>
          </div>
        )}

        {/* List of deleted items */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 py-3 min-h-0">
          {trashTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Trash2 size={36} className="mx-auto text-slate-600 opacity-50" />
              <p className="text-xs font-bold">{t.emptyTitle}</p>
            </div>
          ) : (
            trashTransactions.map((tx) => {
              const category = categories.find((c) => c.id === tx.categoryId);
              const wallet = wallets.find((w) => w.id === tx.walletId);
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';

              return (
                <div
                  key={tx.id}
                  className="bg-slate-950/80 p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-2.5 hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${category?.color || '#3b82f6'}20`,
                        color: category?.color || '#3b82f6',
                      }}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight size={18} />
                      ) : (
                        getIcon(category?.icon || 'CreditCard', 18)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate">
                          {isTransfer ? t.transferTitle : category?.name || t.uncategorized}
                        </span>
                        {tx.note && (
                          <span className="text-[10px] text-slate-400 truncate">({tx.note})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                        <span>{wallet?.name || t.walletFallback}</span>
                        <span>•</span>
                        <span>{tx.date}</span>
                        {tx.deletedAt && (
                          <>
                            <span>•</span>
                            <span className="text-rose-400/80">
                              {t.deletedOn}: {new Date(tx.deletedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-black dir-ltr ${
                        isIncome ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount.toLocaleString()} {tx.currency}
                    </span>

                    <button
                      type="button"
                      onClick={() => onRestore(tx.id)}
                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 active:scale-95 transition-all"
                      title={t.restoreTitle}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPermanentDelete(tx.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 active:scale-95 transition-all"
                      title={t.deleteTitle}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
          >
            {t.close}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default TrashModal;
