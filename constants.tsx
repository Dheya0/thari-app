
import React from 'react';
import { 
  Utensils, Car, Home, Receipt, Film, HeartPulse, GraduationCap, 
  Briefcase, Wallet, CreditCard, ShoppingBag, Gift, PiggyBank,
  Coffee, Zap, Bus, Plane, Smartphone, ShieldCheck
} from 'lucide-react';
import { Category, Currency } from './types';

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  { code: 'YER_SANAA', symbol: 'ر.ي', name: 'ريال يمني - صنعاء' },
  { code: 'YER_ADEN', symbol: 'ر.ي', name: 'ريال يمني - عدن' },
  { code: 'USD', symbol: '$', name: 'دولار أمريكي' },
  { code: 'EUR', symbol: '€', name: 'يورو' },
  { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
  { code: 'KWD', symbol: 'د.ك', name: 'دينار كويتي' },
  { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
  { code: 'OMR', symbol: 'ر.ع', name: 'ريال عماني' },
  { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري' },
  { code: 'JOD', symbol: 'د.أ', name: 'دينار أردني' },
  { code: 'BHD', symbol: 'د.ب', name: 'دينار بحريني' },
  { code: 'GBP', symbol: '£', name: 'جنيه إسترليني' },
  { code: 'INR', symbol: '₹', name: 'روبية هندية' },
];

// Exchange Rates Base: 1 Unit of Currency = X SAR (Saudi Riyal)
// القيم الافتراضية المعتمدة (يمكن للمستخدم تخصيصها وتعديلها بسهولة من الإعدادات)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  SAR: 1.00,          // Base: الريال السعودي هو العملة المرجعية

  // الدولار الأمريكي: 100 دولار = 157,600 ر.ي عدن (100 سعودي = 41,000 ر.ي عدن => 1576 / 410 = 3.8439 ر.س) - قابل للتعديل بالكامل من الإعدادات
  USD: 1576.0 / 410.0, // 3.84390243902439 SAR (100 USD = 157,600 YER_ADEN)
  EUR: 4.10,
  AED: 1.02,
  KWD: 12.20,
  OMR: 9.74,
  QAR: 1.03,
  BHD: 9.95,
  JOD: 5.29,
  GBP: 4.80,
  EGP: 0.08, // تقريبي (100 ريال سعودي ≈ 1,250 جنيه مصري)
  INR: 0.045,

  // الريال اليمني - صنعاء: 100 ريال سعودي = 14,000 ريال يمني (1 ر.ي = 100 / 14000 = 1 / 140 ر.س)
  YER_SANAA: 100.0 / 14000.0, // 1 / 140.0
  
  // الريال اليمني - عدن: 100 ريال سعودي = 41,000 ريال يمني (1 ر.ي = 100 / 41000 = 1 / 410 ر.س)
  YER_ADEN: 100.0 / 41000.0,  // 1 / 410.0
  
  // Legacy support just in case
  YER: 100.0 / 41000.0,
};

export interface CurrencyConversionResult {
  status: 'SUCCESS' | 'RATE_UNAVAILABLE' | 'SAME_CURRENCY';
  convertedAmount: number | null;
  effectiveRate: number | null;
  fromCode: string;
  toCode: string;
  source: 'direct' | 'calculated' | 'identity' | 'missing';
  timestamp: string;
}

// Active registry of FX rate warning events
export const FX_RATE_WARNINGS: { [pair: string]: string } = {};

// Strict conversion function that never silences missing rates
export const tryConvertCurrency = (
  amount: number,
  fromCode: string,
  toCode: string,
  customRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): CurrencyConversionResult => {
  const timestamp = new Date().toISOString();
  if (fromCode === toCode) {
    return {
      status: 'SAME_CURRENCY',
      convertedAmount: amount,
      effectiveRate: 1.0,
      fromCode,
      toCode,
      source: 'identity',
      timestamp,
    };
  }

  const normalizedFrom = fromCode === 'YER' ? 'YER_ADEN' : fromCode;
  const normalizedTo = toCode === 'YER' ? 'YER_ADEN' : toCode;

  const fromRate = customRates[normalizedFrom] ?? DEFAULT_EXCHANGE_RATES[normalizedFrom];
  const toRate = customRates[normalizedTo] ?? DEFAULT_EXCHANGE_RATES[normalizedTo];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    const pairKey = `${fromCode}->${toCode}`;
    FX_RATE_WARNINGS[pairKey] = `سعر الصرف غير متوفر للزوج (${pairKey}) - يرجى التحقق من إعدادات أسعار الصرف`;
    return {
      status: 'RATE_UNAVAILABLE',
      convertedAmount: null,
      effectiveRate: null,
      fromCode,
      toCode,
      source: 'missing',
      timestamp,
    };
  }

  const effectiveRate = fromRate / toRate;
  const convertedAmount = amount * effectiveRate;

  return {
    status: 'SUCCESS',
    convertedAmount,
    effectiveRate,
    fromCode,
    toCode,
    source: 'calculated',
    timestamp,
  };
};

// Helper to convert amounts accurately using provided rates
// Does not silently swallow errors; logs if rate missing and falls back to amount
export const convertCurrency = (
  amount: number, 
  fromCode: string, 
  toCode: string, 
  customRates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): number => {
  const res = tryConvertCurrency(amount, fromCode, toCode, customRates);
  if (res.status === 'SUCCESS' || res.status === 'SAME_CURRENCY') {
    return res.convertedAmount ?? amount;
  }
  // If rate unavailable, warn in console and return amount
  console.warn(`[THARI FX Warning] Rate unavailable from ${fromCode} to ${toCode}. Using 1:1 fallback.`);
  return amount;
};

export const INITIAL_CATEGORIES: Category[] = [
  // Expenses
  { id: '1', name: 'طعام', icon: 'Utensils', color: '#C98387', type: 'expense' },
  { id: '2', name: 'مواصلات', icon: 'Car', color: '#D9B978', type: 'expense' },
  { id: '3', name: 'سكن', icon: 'Home', color: '#759BC8', type: 'expense' },
  { id: '4', name: 'فواتير', icon: 'Receipt', color: '#8EB9A7', type: 'expense' },
  { id: '5', name: 'ترفيه', icon: 'Film', color: '#A898D0', type: 'expense' },
  { id: '6', name: 'صحة', icon: 'HeartPulse', color: '#D4836A', type: 'expense' },
  { id: '7', name: 'تعليم', icon: 'GraduationCap', color: '#C5A25D', type: 'expense' },
  { id: '8', name: 'تسوق', icon: 'ShoppingBag', color: '#9EAA9F', type: 'expense' },
  // Income
  { id: '9', name: 'راتب', icon: 'Wallet', color: '#8EB9A7', type: 'income' },
  { id: '10', name: 'عمل حر', icon: 'Briefcase', color: '#D9B978', type: 'income' },
  { id: '11', name: 'استثمار', icon: 'PiggyBank', color: '#BFA054', type: 'income' },
  { id: '12', name: 'هدية', icon: 'Gift', color: '#D4836A', type: 'income' },
];

export const getIcon = (name: string, size = 20) => {
  const icons: Record<string, any> = {
    Utensils, Car, Home, Receipt, Film, HeartPulse, GraduationCap, 
    Briefcase, Wallet, CreditCard, ShoppingBag, Gift, PiggyBank,
    Coffee, Zap, Bus, Plane, Smartphone, ShieldCheck
  };
  const IconComp = icons[name] || Wallet;
  return <IconComp size={size} />;
};
