import React from 'react';
import { motion } from 'motion/react';
import { TOKENS, ThemeMode } from '../theme/tokens';

export interface AssetItemRowProps {
  id: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  codeBadge: string;
  badgeColor?: string;
  description?: string;
  valueDisplay: string;
  currencyCode: string;
  isDeduction?: boolean;
  isPositiveAddition?: boolean;
  theme?: ThemeMode;
  children?: React.ReactNode;
  actionElement?: React.ReactNode;
  onClick?: () => void;
}

export const AssetItemRow: React.FC<AssetItemRowProps> = ({
  id,
  icon,
  iconBg,
  iconColor,
  title,
  codeBadge,
  badgeColor,
  description,
  valueDisplay,
  currencyCode,
  isDeduction = false,
  isPositiveAddition = false,
  theme = 'dark',
  children,
  actionElement,
  onClick
}) => {
  const isDark = theme === 'dark';
  const c = isDark ? TOKENS.colors.dark : TOKENS.colors.light;

  return (
    <motion.div 
      id={`asset-row-${id}`}
      layout
      className="p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5"
      style={{
        backgroundColor: isDark ? '#12171D' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
        boxShadow: isDark ? '0 4px 20px -2px rgba(0,0,0,0.3)' : '0 2px 10px -2px rgba(0,0,0,0.04)'
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title & Icon Header */}
        <div 
          className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''}`}
          onClick={onClick}
        >
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              iconBg || (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')
            } ${iconColor || (isDark ? 'text-slate-200' : 'text-slate-800')}`}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 
                className="text-sm sm:text-base font-semibold tracking-tight"
                style={{ color: c.textPrimary }}
              >
                {title}
              </h4>
              <span 
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-numeric ${
                  badgeColor || (isDark ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-black/5 text-slate-700 border-black/10')
                }`}
              >
                {codeBadge}
              </span>
            </div>
            {description && (
              <p 
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: c.textSecondary }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Value Display & Optional Quick Action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          <div className="text-right sm:text-left">
            <span className="text-[11px] block sm:hidden" style={{ color: c.textMuted }}>القيمة:</span>
            <div className="flex items-baseline gap-1.5" dir="ltr">
              <span 
                className="text-base sm:text-lg font-bold font-numeric tracking-tight"
                style={{
                  color: isDeduction ? c.rose : isPositiveAddition ? c.sage : c.textPrimary
                }}
              >
                {isDeduction ? `-${valueDisplay}` : isPositiveAddition ? `+${valueDisplay}` : valueDisplay}
              </span>
              <span className="text-xs font-medium" style={{ color: c.textMuted }}>
                {currencyCode}
              </span>
            </div>
          </div>

          {actionElement && (
            <div className="shrink-0">
              {actionElement}
            </div>
          )}
        </div>
      </div>

      {/* Children Input Area */}
      {children && (
        <div 
          className="pt-2.5 border-t"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          {children}
        </div>
      )}
    </motion.div>
  );
};
