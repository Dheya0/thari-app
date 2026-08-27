/**
 * THARI Financial Application — Unified Formatters Engine (Single Source of Truth)
 * Eliminates all duplicate formatting functions across components and views.
 */

import { DEFAULT_CURRENCIES } from '../constants';
import { roundToCurrency } from './mathPrecision';
import { getLocalizedCurrency, LanguageKey } from './translations';

export interface FormatCurrencyOptions {
  showSymbol?: boolean;
  symbolPosition?: 'prefix' | 'suffix' | 'auto';
  decimalPlaces?: number;
  useGrouping?: boolean;
  locale?: string;
  language?: LanguageKey;
}

/**
 * Maps known currency codes to localized display symbols
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  YER_SANAA: 'ر.ي',
  YER_ADEN: 'ر.ي',
  YER: 'ر.ي',
  USD: '$',
  EUR: '€',
  AED: 'د.إ',
  KWD: 'د.ك',
  OMR: 'ر.ع',
  QAR: 'ر.ق',
  BHD: 'د.ب',
  JOD: 'د.أ',
  GBP: '£',
  EGP: 'ج.م',
  INR: '₹',
  TRY: '₺',
  MYR: 'ر.م',
  IDR: 'ر.إ',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  JPY: '¥',
  SYP: 'ل.س',
  LBP: 'ل.ل',
  IQD: 'د.ع',
  MAD: 'د.م',
  DZD: 'د.ج',
  TND: 'د.ت',
  LYD: 'د.ل',
  SDG: 'ج.س',
  PKR: '₨',
  BDT: '৳',
  PHP: '₱',
};

/**
 * Get currency symbol by currency code and optional language
 */
export function getCurrencySymbol(code: string, lang: LanguageKey = 'ar'): string {
  if (!code) return lang === 'ar' ? 'ر.س' : 'SAR';
  const loc = getLocalizedCurrency(code, undefined, undefined, lang);
  if (loc && loc.symbol) return loc.symbol;
  if (CURRENCY_SYMBOLS[code]) return CURRENCY_SYMBOLS[code];
  const found = DEFAULT_CURRENCIES.find(c => c.code === code);
  return found ? found.symbol : code;
}

/**
 * Universal Currency & Number Formatter
 * Complies with strict DRY principle.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode = 'SAR',
  options: FormatCurrencyOptions = {}
): string {
  const {
    showSymbol = true,
    decimalPlaces,
    useGrouping = true,
    locale = 'en-US'
  } = options;

  const num = Number(amount) || 0;
  
  // Determine standard decimal places for currency
  let decimals = decimalPlaces;
  if (decimals === undefined) {
    if (currencyCode === 'YER_SANAA' || currencyCode === 'YER_ADEN' || currencyCode === 'YER') {
      // Yemeni Riyal typically has no fractional piasters in practical cash
      decimals = Math.abs(num) < 1000 && num % 1 !== 0 ? 2 : 0;
    } else if (currencyCode === 'KWD' || currencyCode === 'BHD' || currencyCode === 'OMR') {
      decimals = 3;
    } else {
      decimals = num % 1 === 0 ? 0 : 2;
    }
  }

  const rounded = roundToCurrency(num, decimals);
  const formattedNumber = rounded.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping
  });

  if (!showSymbol) {
    return formattedNumber;
  }

  const symbol = getCurrencySymbol(currencyCode);
  return `${formattedNumber} ${symbol}`;
}

/**
 * Compact Number Formatter for badges & widgets (e.g. 1.2M, 45K)
 */
export function formatCompactNumber(amount: number | string, locale = 'en-US'): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(num);
}

/**
 * Format standard date according to Arabic / Islamic locale
 */
export function formatAppDate(dateString: string, includeTime = false): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    
    const datePart = d.toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    if (!includeTime) return datePart;

    const timePart = d.toLocaleTimeString('ar-SA-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${datePart} ${timePart}`;
  } catch {
    return dateString;
  }
}

/**
 * Sanitizes numeric user input across Arabic/English keyboards.
 * Accepts Arabic digits, Persian digits, Arabic decimal separators, and comma.
 */
export function sanitizeNumericInput(raw: string, allowNegative = true): string {
  if (raw === null || raw === undefined) return '';

  let str = String(raw).trim();
  if (!str) return '';

  // Normalize Arabic/Persian digits
  str = str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  str = str.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

  // Normalize decimal separators and thousands separators used by Arabic keyboards
  str = str.replace(/٫/g, '.').replace(/٬/g, '').replace(/,/g, '.');

  // Allow only digits, one leading minus, and single dot.
  let cleaned = str.replace(/[^0-9.\-]/g, '');

  if (allowNegative) {
    const minusIndex = cleaned.indexOf('-');
    if (minusIndex > 0) {
      cleaned = cleaned.replace(/-/g, '');
      cleaned = '-' + cleaned;
    }
    if (cleaned.indexOf('-') > 0) cleaned = cleaned.replace(/-/g, '');
  } else {
    cleaned = cleaned.replace(/-/g, '');
  }

  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    const before = cleaned.slice(0, firstDot).replace(/\./g, '');
    const after = cleaned.slice(firstDot + 1).replace(/\./g, '');
    cleaned = `${before}.${after}`;
  }

  if (cleaned === '.') return '';
  if (cleaned === '-.') return '-';

  return cleaned;
}

/**
 * Parses numbers containing Eastern Arabic numerals (٠-٩) or Persian numerals (۰-۹)
 * as well as Arabic decimal separators (٫) and converts them to standard numbers.
 */
export function parseArabicNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0;
  if (typeof input === 'number') return isNaN(input) ? 0 : input;

  let str = String(input).trim();
  if (!str) return 0;

  str = sanitizeNumericInput(str, true);
  str = str.replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

