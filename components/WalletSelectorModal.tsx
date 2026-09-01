import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Wallet as WalletIcon, Layers, Plus } from 'lucide-react';
import { Wallet } from '../types';
import { getLocalizedCurrency, LanguageKey } from '../utils/translations';
import { useBackNavigation } from '../utils/backNavigation';

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  selectedWalletId: string | null;
  onSelectWallet: (walletId: string | null) => void;
  onOpenSettingsWallets?: () => void;
  language?: LanguageKey;
  t: any;
}

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isOpen,
  onClose,
  wallets,
  selectedWalletId,
  onSelectWallet,
  onOpenSettingsWallets,
  language = 'ar',
  t
}) => {
  useBackNavigation(() => {
    onClose();
    return true;
  }, isOpen, 15);

  const modalRef = useRef<HTMLDivElement>(null);

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
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0F141C] border border-[#8EB9A7]/30 rounded-2xl md:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col max-h-[85vh] font-sans"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#141B24]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#8EB9A7]/15 border border-[#8EB9A7]/30 flex items-center justify-center text-[#8EB9A7] shadow-inner">
                <WalletIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.walletAccounts}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t.selectWalletOrAll}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t.close}
            >
              <X size={18} />
            </button>
          </div>

          {/* Wallets List */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-2 max-h-[60vh] no-scrollbar">
            {/* All Wallets (Consolidated) Option */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onSelectWallet(null);
                onClose();
              }}
              className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                selectedWalletId === null
                  ? 'bg-gradient-to-r from-[#8EB9A7]/20 via-[#141B24] to-[#141B24] border-[#8EB9A7] ring-1 ring-[#8EB9A7]/40 shadow-md'
                  : 'bg-[#141B24] hover:bg-[#1A232E] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  selectedWalletId === null ? 'bg-[#8EB9A7] text-slate-950 font-bold' : 'bg-white/5 text-slate-300'
                }`}>
                  <Layers size={18} />
                </div>
                <div className="text-start">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#8EB9A7] transition-colors">
                    {t.allWallets}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {t.consolidatedView}
                  </p>
                </div>
              </div>

              {selectedWalletId === null && (
                <div className="w-6 h-6 rounded-full bg-[#8EB9A7] text-slate-950 flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </motion.button>

            {/* Individual Wallets */}
            {wallets.map((wallet) => {
              const isSelected = selectedWalletId === wallet.id;
              return (
                <motion.button
                  key={wallet.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelectWallet(wallet.id);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#8EB9A7]/20 via-[#141B24] to-[#141B24] border-[#8EB9A7] ring-1 ring-[#8EB9A7]/40 shadow-md'
                      : 'bg-[#141B24] hover:bg-[#1A232E] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm"
                      style={{ backgroundColor: wallet.color || '#3B82F6' }}
                    >
                      <WalletIcon size={16} />
                    </div>
                    <div className="text-start">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#8EB9A7] transition-colors">
                        {wallet.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {wallet.type === 'bank' ? (t.bankAccount || 'حساب بنكي') : wallet.type === 'cash' ? (t.cashWallet || 'نقد (كاش)') : wallet.type === 'savings' ? (t.savingsAccount || 'حساب توفير') : (t.investmentAssets || 'استثمار وأصول')} • {getLocalizedCurrency(wallet.currencyCode, wallet.currencyCode, undefined, language || 'ar').symbol} ({wallet.currencyCode})
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#8EB9A7] text-slate-950 flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </motion.button>
              );
            })}

            {wallets.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs">
                {t.noWalletsFound || 'لا توجد محافظ مضافة حالياً. يمكنك إضافة محافظ من إعدادات الحسابات.'}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-3 sm:p-4 bg-[#141B24] border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {t.totalWalletsCount ? t.totalWalletsCount.replace('{count}', String(wallets.length)) : `إجمالي المحافظ: ${wallets.length}`}
            </span>
            {onOpenSettingsWallets && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettingsWallets();
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
              >
                <Plus size={14} />
                <span>{t.manageWalletsSettings || 'إدارة المحافظ في الإعدادات'}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WalletSelectorModal;
