import React from 'react';
import { motion } from 'motion/react';
import { TOKENS, ThemeMode } from '../theme/tokens';
import { LucideIcon } from 'lucide-react';

export interface StatItem {
  id: string;
  label: string;
  value: string | number;
  currency?: string;
  subValue?: string;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant?: 'sage' | 'rose' | 'ocean' | 'amber' | 'champagne' | 'neutral';
  };
  trend?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
    isPositive?: boolean;
  };
  accentColor?: 'sage' | 'rose' | 'ocean' | 'amber' | 'champagne' | 'neutral';
  onClick?: () => void;
}

export interface StatsGridProps {
  items: StatItem[];
  columns?: 2 | 3 | 4;
  theme?: ThemeMode;
  className?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  items,
  columns = 4,
  theme = 'dark',
  className = ''
}) => {
  const isDark = theme === 'dark';
  const c = isDark ? TOKENS.colors.dark : TOKENS.colors.light;

  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
  }[columns];

  const getAccentTheme = (accent?: string) => {
    switch (accent) {
      case 'sage':
        return { text: c.sage, bg: c.sageMuted, border: 'border-emerald-500/20' };
      case 'rose':
        return { text: c.rose, bg: c.roseMuted, border: 'border-rose-500/20' };
      case 'ocean':
        return { text: c.ocean, bg: c.oceanMuted, border: 'border-sky-500/20' };
      case 'amber':
        return { text: c.amber, bg: c.amberMuted, border: 'border-amber-500/20' };
      case 'champagne':
        return { text: c.champagne, bg: c.champagneMuted, border: 'border-[#D9B978]/30' };
      default:
        return { text: c.textPrimary, bg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDark ? 'border-white/10' : 'border-black/10' };
    }
  };

  return (
    <div className={`grid ${colClasses} gap-2.5 sm:gap-3.5 ${className}`} dir="rtl">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const colorSet = getAccentTheme(item.accentColor);
        const badgeSet = getAccentTheme(item.badge?.variant || item.accentColor);

        return (
          <motion.div
            key={item.id || idx}
            whileHover={item.onClick ? { scale: 1.015, transition: { duration: 0.15 } } : undefined}
            whileTap={item.onClick ? { scale: 0.985 } : undefined}
            onClick={item.onClick}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all border flex flex-col justify-between ${
              item.onClick ? 'cursor-pointer' : ''
            }`}
            style={{
              backgroundColor: isDark ? '#12171D' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.08)',
              boxShadow: isDark ? '0 4px 20px -2px rgba(0,0,0,0.4)' : '0 2px 10px -2px rgba(0,0,0,0.05)'
            }}
          >
            {/* Header: Label + Icon / Badge */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span 
                className="text-xs font-medium truncate"
                style={{ color: c.textSecondary }}
              >
                {item.label}
              </span>

              {item.badge ? (
                <span 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-tight shrink-0 font-numeric ${badgeSet.border}`}
                  style={{
                    backgroundColor: badgeSet.bg,
                    color: badgeSet.text
                  }}
                >
                  {item.badge.text}
                </span>
              ) : Icon ? (
                <div 
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${colorSet.border}`}
                  style={{
                    backgroundColor: colorSet.bg,
                    color: colorSet.text
                  }}
                >
                  <Icon size={13} strokeWidth={2.2} />
                </div>
              ) : null}
            </div>

            {/* Body: Value + Currency */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-1.5" dir="ltr">
                <span 
                  className="text-lg sm:text-xl font-bold font-numeric tracking-tight"
                  style={{ color: colorSet.text }}
                >
                  {item.value}
                </span>
                {item.currency && (
                  <span 
                    className="text-xs font-medium"
                    style={{ color: c.textMuted }}
                  >
                    {item.currency}
                  </span>
                )}
              </div>

              {/* Footer / SubValue / Trend */}
              {item.subValue && (
                <p 
                  className="text-[11px] truncate"
                  style={{ color: c.textMuted }}
                >
                  {item.subValue}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
