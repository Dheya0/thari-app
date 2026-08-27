
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
// القيم الافتراضية (يمكن للمستخدم تعديلها من الإعدادات)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  SAR: 1.00,          // Base

  // العملات العالمية
  USD: 3.75,          
  EUR: 4.10,
  AED: 1.02,
  KWD: 12.20,
  OMR: 9.74,
  QAR: 1.03,
  BHD: 9.95,
  JOD: 5.29,
  GBP: 4.80,
  EGP: 0.08, // تقريبي
  INR: 0.045,

  // الريال اليمني (قيم تقريبية للمساعدة، التعديل متاح في الإعدادات)
  // المنطق: إذا كان 1 ريال سعودي = 140 يمني
  // فإن قيمة 1 يمني بالريال السعودي = 1 / 140
  YER_SANAA: 1 / 140.0, 
  
  // إذا كان 1 ريال سعودي = 430 يمني (عدن)
  YER_ADEN: 1 / 430.0,
  
  // Legacy support just in case
  YER: 1 / 430.0,
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
  { id: '1', name: 'طعام', icon: 'Utensils', color: '#ef4444', type: 'expense' },
  { id: '2', name: 'مواصلات', icon: 'Car', color: '#f59e0b', type: 'expense' },
  { id: '3', name: 'سكن', icon: 'Home', color: '#3b82f6', type: 'expense' },
  { id: '4', name: 'فواتير', icon: 'Receipt', color: '#10b981', type: 'expense' },
  { id: '5', name: 'ترفيه', icon: 'Film', color: '#8b5cf6', type: 'expense' },
  { id: '6', name: 'صحة', icon: 'HeartPulse', color: '#ec4899', type: 'expense' },
  { id: '7', name: 'تعليم', icon: 'GraduationCap', color: '#6366f1', type: 'expense' },
  { id: '8', name: 'تسوق', icon: 'ShoppingBag', color: '#f43f5e', type: 'expense' },
  // Income
  { id: '9', name: 'راتب', icon: 'Wallet', color: '#10b981', type: 'income' },
  { id: '10', name: 'عمل حر', icon: 'Briefcase', color: '#06b6d4', type: 'income' },
  { id: '11', name: 'استثمار', icon: 'PiggyBank', color: '#84cc16', type: 'income' },
  { id: '12', name: 'هدية', icon: 'Gift', color: '#f97316', type: 'income' },
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
