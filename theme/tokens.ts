/**
 * THARI — Institutional Quiet Luxury Design Tokens
 * Single source of truth for color palette, typography scales,
 * mathematical radii, spacing, and transition curves.
 */

export const TOKENS = {
  colors: {
    // Dark Theme (Carbon Palette)
    dark: {
      bg: '#0A0D10',           // Deep carbon canvas
      surface1: '#12171D',     // Primary card surface
      surface2: '#182028',     // Elevated card / input surface
      surface3: '#222C37',     // Hover / active surface
      borderSubtle: 'rgba(255, 255, 255, 0.07)',
      borderMedium: 'rgba(255, 255, 255, 0.14)',
      borderAccent: 'rgba(217, 185, 120, 0.35)',
      
      textPrimary: '#F4F1EA',   // Warm soft alabaster
      textSecondary: '#94A3B8', // Slate grey
      textMuted: '#64748B',     // Muted slate
      textInverse: '#0A0D10',   // Black for champagne buttons
      
      // Accents
      champagne: '#D9B978',     // Core brand accent (Gold/Champagne)
      champagneHover: '#C8A865',
      champagneMuted: 'rgba(217, 185, 120, 0.12)',
      
      sage: '#8EB9A7',          // Growth, Inflows, Positive
      sageMuted: 'rgba(142, 185, 167, 0.12)',
      
      rose: '#C98387',          // Outflows, Expenses, Due liabilities
      roseMuted: 'rgba(201, 131, 135, 0.12)',
      
      ocean: '#759BC8',         // Transfers, Neutral balances
      oceanMuted: 'rgba(117, 155, 200, 0.12)',
      
      amber: '#E5A93C',         // Alerts, Reminders, Hawl pending
      amberMuted: 'rgba(229, 169, 60, 0.12)',
    },

    // Light Theme (Warm Alabaster & Sandstone)
    light: {
      bg: '#F8F7F4',           // Warm alabaster canvas
      surface1: '#FFFFFF',     // Clean white surface
      surface2: '#F1EFEA',     // Elevated sandstone surface
      surface3: '#E6E2D8',     // Active button surface
      borderSubtle: 'rgba(0, 0, 0, 0.08)',
      borderMedium: 'rgba(0, 0, 0, 0.15)',
      borderAccent: 'rgba(184, 143, 62, 0.40)',
      
      textPrimary: '#14181E',   // Deep obsidian
      textSecondary: '#4A5568', // Charcoal slate
      textMuted: '#718096',     // Soft slate
      textInverse: '#FFFFFF',
      
      // Accents in Light
      champagne: '#9E7A2E',     // High-contrast gold for light mode
      champagneHover: '#876620',
      champagneMuted: 'rgba(158, 122, 46, 0.10)',
      
      sage: '#2E7D60',          // Emerald sage for light readability
      sageMuted: 'rgba(46, 125, 96, 0.10)',
      
      rose: '#A83B44',          // Crisp deep rose
      roseMuted: 'rgba(168, 59, 68, 0.10)',
      
      ocean: '#2C5E8A',         // Rich ocean blue
      oceanMuted: 'rgba(44, 94, 138, 0.10)',
      
      amber: '#B26E06',
      amberMuted: 'rgba(178, 110, 6, 0.10)',
    }
  },

  // Mathematical Radii (Inner Radius = Outer Radius - Padding)
  radii: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    full: '9999px',
  },

  // Mathematical Spacing Scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // Transition & Animation constants
  transitions: {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: { type: 'spring', stiffness: 350, damping: 28 },
  }
} as const;

export type ThemeMode = 'dark' | 'light';
