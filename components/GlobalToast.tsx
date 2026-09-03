import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { NativeHaptics } from '../services/nativeServices';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface GlobalToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const GlobalToast: React.FC<GlobalToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;

    if (toast.type === 'success') {
      NativeHaptics.notification('SUCCESS').catch(() => {});
    } else if (toast.type === 'error') {
      NativeHaptics.notification('ERROR').catch(() => {});
    } else {
      NativeHaptics.impact('LIGHT').catch(() => {});
    }

    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast?.id]);

  return (
    <AnimatePresence>
      {toast && (
        <div 
          dir="rtl"
          className="fixed top-5 left-0 right-0 z-[300] flex justify-center pointer-events-none px-4 no-print"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto max-w-md w-full sm:w-auto min-w-[300px] flex items-center justify-between gap-3 px-4 py-3 bg-[#11161C]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            role="alert"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                toast.type === 'error'
                  ? 'bg-[#C98387]/15 text-[#C98387] border border-[#C98387]/30'
                  : toast.type === 'info'
                  ? 'bg-[#759BC8]/15 text-[#759BC8] border border-[#759BC8]/30'
                  : 'bg-[#8EB9A7]/15 text-[#8EB9A7] border border-[#8EB9A7]/30'
              }`}>
                {toast.type === 'error' ? (
                  <AlertCircle size={18} />
                ) : toast.type === 'info' ? (
                  <Info size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
              </div>

              <p className="text-xs sm:text-sm font-bold text-[#F4F1EA] leading-relaxed truncate">
                {toast.message}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    onDismiss();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#D9B978]/15 hover:bg-[#D9B978]/25 text-[#D9B978] border border-[#D9B978]/30 text-xs font-black transition-all active:scale-95 shadow-xs"
                >
                  {toast.action.label}
                </button>
              )}

              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="إغلاق الإشعار"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
