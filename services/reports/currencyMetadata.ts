export interface CurrencyMetadata {
  id: string;
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  regionAr: string;
  regionEn: string;
  decimalPlaces: number;
  isCrypto?: boolean;
}

export const CURRENCY_METADATA_REGISTRY: Record<string, CurrencyMetadata> = {
  YER_ADEN: {
    id: 'YER_ADEN',
    code: 'YER_ADEN',
    symbol: 'ر.ي',
    nameAr: 'ريال يمني (عدن)',
    nameEn: 'Yemeni Rial (Aden)',
    regionAr: 'اليمن - عدن والمحافظات الجنوبية',
    regionEn: 'Yemen - Aden & Southern Governorates',
    decimalPlaces: 0,
  },
  YER_SANAA: {
    id: 'YER_SANAA',
    code: 'YER_SANAA',
    symbol: 'ر.ي',
    nameAr: 'ريال يمني (صنعاء)',
    nameEn: "Yemeni Rial (Sana'a)",
    regionAr: 'اليمن - صنعاء والمحافظات الشمالية',
    regionEn: "Yemen - Sana'a & Northern Governorates",
    decimalPlaces: 0,
  },
  YER: {
    id: 'YER',
    code: 'YER',
    symbol: 'ر.ي',
    nameAr: 'ريال يمني',
    nameEn: 'Yemeni Rial',
    regionAr: 'اليمن',
    regionEn: 'Yemen',
    decimalPlaces: 0,
  },
  SAR: {
    id: 'SAR',
    code: 'SAR',
    symbol: 'ر.س',
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    regionAr: 'المملكة العربية السعودية',
    regionEn: 'Kingdom of Saudi Arabia',
    decimalPlaces: 2,
  },
  USD: {
    id: 'USD',
    code: 'USD',
    symbol: '$',
    nameAr: 'دولار أمريكي',
    nameEn: 'US Dollar',
    regionAr: 'الولايات المتحدة الأمريكية',
    regionEn: 'United States of America',
    decimalPlaces: 2,
  },
  EUR: {
    id: 'EUR',
    code: 'EUR',
    symbol: '€',
    nameAr: 'يورو',
    nameEn: 'Euro',
    regionAr: 'الاتحاد الأوروبي',
    regionEn: 'European Union',
    decimalPlaces: 2,
  },
  AED: {
    id: 'AED',
    code: 'AED',
    symbol: 'د.إ',
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    regionAr: 'دولة الإمارات العربية المتحدة',
    regionEn: 'United Arab Emirates',
    decimalPlaces: 2,
  },
  KWD: {
    id: 'KWD',
    code: 'KWD',
    symbol: 'د.ك',
    nameAr: 'دينار كويتي',
    nameEn: 'Kuwaiti Dinar',
    regionAr: 'دولة الكويت',
    regionEn: 'State of Kuwait',
    decimalPlaces: 3,
  },
  EGP: {
    id: 'EGP',
    code: 'EGP',
    symbol: 'ج.م',
    nameAr: 'جنيه مصري',
    nameEn: 'Egyptian Pound',
    regionAr: 'جمهورية مصر العربية',
    regionEn: 'Arab Republic of Egypt',
    decimalPlaces: 2,
  },
  OMR: {
    id: 'OMR',
    code: 'OMR',
    symbol: 'ر.ع',
    nameAr: 'ريال عماني',
    nameEn: 'Omani Rial',
    regionAr: 'سلطنة عمان',
    regionEn: 'Sultanate of Oman',
    decimalPlaces: 3,
  },
  QAR: {
    id: 'QAR',
    code: 'QAR',
    symbol: 'ر.ق',
    nameAr: 'ريال قطري',
    nameEn: 'Qatari Riyal',
    regionAr: 'دولة قطر',
    regionEn: 'State of Qatar',
    decimalPlaces: 2,
  },
  BHD: {
    id: 'BHD',
    code: 'BHD',
    symbol: 'د.ب',
    nameAr: 'دينار بحريني',
    nameEn: 'Bahraini Dinar',
    regionAr: 'مملكة البحرين',
    regionEn: 'Kingdom of Bahrain',
    decimalPlaces: 3,
  },
  JOD: {
    id: 'JOD',
    code: 'JOD',
    symbol: 'د.أ',
    nameAr: 'دينار أردني',
    nameEn: 'Jordanian Dinar',
    regionAr: 'المملكة الأردنية الهاشمية',
    regionEn: 'Hashemite Kingdom of Jordan',
    decimalPlaces: 3,
  },
  GBP: {
    id: 'GBP',
    code: 'GBP',
    symbol: '£',
    nameAr: 'جنيه إسترليني',
    nameEn: 'British Pound',
    regionAr: 'المملكة المتحدة',
    regionEn: 'United Kingdom',
    decimalPlaces: 2,
  },
  INR: {
    id: 'INR',
    code: 'INR',
    symbol: '₹',
    nameAr: 'روبية هندية',
    nameEn: 'Indian Rupee',
    regionAr: 'جمهورية الهند',
    regionEn: 'Republic of India',
    decimalPlaces: 2,
  },
  TRY: {
    id: 'TRY',
    code: 'TRY',
    symbol: '₺',
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    regionAr: 'الجمهورية التركية',
    regionEn: 'Republic of Turkey',
    decimalPlaces: 2,
  },
  MYR: {
    id: 'MYR',
    code: 'MYR',
    symbol: 'ر.م',
    nameAr: 'رينغيت ماليزي',
    nameEn: 'Malaysian Ringgit',
    regionAr: 'ماليزيا',
    regionEn: 'Malaysia',
    decimalPlaces: 2,
  },
  IDR: {
    id: 'IDR',
    code: 'IDR',
    symbol: 'ر.إ',
    nameAr: 'روبية إندونيسية',
    nameEn: 'Indonesian Rupiah',
    regionAr: 'إندونيسيا',
    regionEn: 'Indonesia',
    decimalPlaces: 0,
  },
  CAD: {
    id: 'CAD',
    code: 'CAD',
    symbol: 'C$',
    nameAr: 'دولار كندي',
    nameEn: 'Canadian Dollar',
    regionAr: 'كندا',
    regionEn: 'Canada',
    decimalPlaces: 2,
  },
  AUD: {
    id: 'AUD',
    code: 'AUD',
    symbol: 'A$',
    nameAr: 'دولار أسترالي',
    nameEn: 'Australian Dollar',
    regionAr: 'أستراليا',
    regionEn: 'Australia',
    decimalPlaces: 2,
  },
  CHF: {
    id: 'CHF',
    code: 'CHF',
    symbol: 'CHF',
    nameAr: 'فرنك سويسري',
    nameEn: 'Swiss Franc',
    regionAr: 'سويسرا',
    regionEn: 'Switzerland',
    decimalPlaces: 2,
  },
  CNY: {
    id: 'CNY',
    code: 'CNY',
    symbol: '¥',
    nameAr: 'يوان صيني',
    nameEn: 'Chinese Yuan',
    regionAr: 'جمهورية الصين الشعبية',
    regionEn: 'China',
    decimalPlaces: 2,
  },
  JPY: {
    id: 'JPY',
    code: 'JPY',
    symbol: '¥',
    nameAr: 'ين ياباني',
    nameEn: 'Japanese Yen',
    regionAr: 'اليابان',
    regionEn: 'Japan',
    decimalPlaces: 0,
  },
  SYP: {
    id: 'SYP',
    code: 'SYP',
    symbol: 'ل.س',
    nameAr: 'ليرة سورية',
    nameEn: 'Syrian Pound',
    regionAr: 'الجمهورية العربية السورية',
    regionEn: 'Syria',
    decimalPlaces: 0,
  },
  LBP: {
    id: 'LBP',
    code: 'LBP',
    symbol: 'ل.ل',
    nameAr: 'ليرة لبنانية',
    nameEn: 'Lebanese Pound',
    regionAr: 'الجمهورية اللبنانية',
    regionEn: 'Lebanon',
    decimalPlaces: 0,
  },
  IQD: {
    id: 'IQD',
    code: 'IQD',
    symbol: 'د.ع',
    nameAr: 'دينار عراقي',
    nameEn: 'Iraqi Dinar',
    regionAr: 'جمهورية العراق',
    regionEn: 'Iraq',
    decimalPlaces: 0,
  },
  MAD: {
    id: 'MAD',
    code: 'MAD',
    symbol: 'د.م',
    nameAr: 'درهم مغربي',
    nameEn: 'Moroccan Dirham',
    regionAr: 'المملكة المغربية',
    regionEn: 'Kingdom of Morocco',
    decimalPlaces: 2,
  },
  DZD: {
    id: 'DZD',
    code: 'DZD',
    symbol: 'د.ج',
    nameAr: 'دينار جزائري',
    nameEn: 'Algerian Dinar',
    regionAr: 'الجمهورية الجزائرية',
    regionEn: 'Algeria',
    decimalPlaces: 2,
  },
  TND: {
    id: 'TND',
    code: 'TND',
    symbol: 'د.ت',
    nameAr: 'دينار تونسي',
    nameEn: 'Tunisian Dinar',
    regionAr: 'الجمهورية التونسية',
    regionEn: 'Tunisia',
    decimalPlaces: 3,
  },
  LYD: {
    id: 'LYD',
    code: 'LYD',
    symbol: 'د.ل',
    nameAr: 'دينار ليبي',
    nameEn: 'Libyan Dinar',
    regionAr: 'دولة ليبيا',
    regionEn: 'Libya',
    decimalPlaces: 3,
  },
  SDG: {
    id: 'SDG',
    code: 'SDG',
    symbol: 'ج.س',
    nameAr: 'جنيه سوداني',
    nameEn: 'Sudanese Pound',
    regionAr: 'جمهورية السودان',
    regionEn: 'Sudan',
    decimalPlaces: 2,
  },
  PKR: {
    id: 'PKR',
    code: 'PKR',
    symbol: '₨',
    nameAr: 'روبية باكستانية',
    nameEn: 'Pakistani Rupee',
    regionAr: 'باكستان',
    regionEn: 'Pakistan',
    decimalPlaces: 2,
  },
  BDT: {
    id: 'BDT',
    code: 'BDT',
    symbol: '৳',
    nameAr: 'تاكا بنغلاديشية',
    nameEn: 'Bangladeshi Taka',
    regionAr: 'بنغلاديش',
    regionEn: 'Bangladesh',
    decimalPlaces: 2,
  },
  PHP: {
    id: 'PHP',
    code: 'PHP',
    symbol: '₱',
    nameAr: 'بيزو فلبيني',
    nameEn: 'Philippine Peso',
    regionAr: 'الفلبين',
    regionEn: 'Philippines',
    decimalPlaces: 2,
  },
};

/**
 * Normalizes legacy currency codes (like 'YER' -> 'YER_ADEN')
 */
export function normalizeCurrencyCode(rawCode?: string | null): string {
  if (!rawCode) return 'SAR';
  const upper = rawCode.trim().toUpperCase();
  if (upper === 'YER') return 'YER_ADEN';
  return upper;
}

/**
 * Returns rich currency metadata or a fallback object for custom currencies
 */
export function getCurrencyMetadata(rawCode?: string | null, customSymbol?: string, customName?: string): CurrencyMetadata {
  const code = normalizeCurrencyCode(rawCode);
  if (CURRENCY_METADATA_REGISTRY[code]) {
    return CURRENCY_METADATA_REGISTRY[code];
  }
  return {
    id: code,
    code,
    symbol: customSymbol || code,
    nameAr: customName || code,
    nameEn: code,
    regionAr: 'عملة مخصصة',
    regionEn: 'Custom Currency',
    decimalPlaces: 2,
  };
}

/**
 * Format monetary amount according to currency rules
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
  locale: 'ar' | 'en' = 'ar',
  includeSymbol: boolean = true
): string {
  const meta = getCurrencyMetadata(currencyCode);
  const formattedNumber = amount.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: meta.decimalPlaces,
  });

  if (!includeSymbol) return formattedNumber;
  return locale === 'ar' ? `${formattedNumber} ${meta.symbol}` : `${meta.symbol} ${formattedNumber}`;
}
