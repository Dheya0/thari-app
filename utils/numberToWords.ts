/**
 * Tafqeet and English Number-to-Words Financial Engine
 * Converts numbers into Arabic and English words for official receipts, vouchers, and debt records.
 */

const ARABIC_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
const ARABIC_FEMININE_ONES = ['', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع', 'عشر'];
const ARABIC_TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const ARABIC_TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const ARABIC_HUNDREDS = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

const ENGLISH_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const ENGLISH_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

interface CurrencyWordNames {
  arMainSingle: string;
  arMainPlural: string;
  arSubSingle: string;
  arSubPlural: string;
  enMainSingle: string;
  enMainPlural: string;
  enSubSingle: string;
  enSubPlural: string;
}

const CURRENCY_DICTIONARY: Record<string, CurrencyWordNames> = {
  SAR: {
    arMainSingle: 'ريال سعودي',
    arMainPlural: 'ريالات سعودية',
    arSubSingle: 'هللة',
    arSubPlural: 'هللات',
    enMainSingle: 'Saudi Riyal',
    enMainPlural: 'Saudi Riyals',
    enSubSingle: 'Halala',
    enSubPlural: 'Halalas',
  },
  AED: {
    arMainSingle: 'درهم إماراتي',
    arMainPlural: 'دراهم إماراتية',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: 'UAE Dirham',
    enMainPlural: 'UAE Dirhams',
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  KWD: {
    arMainSingle: 'دينار كويتي',
    arMainPlural: 'دنانير كويتية',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: 'Kuwaiti Dinar',
    enMainPlural: 'Kuwaiti Dinars',
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  QAR: {
    arMainSingle: 'ريال قطري',
    arMainPlural: 'ريالات قطري',
    arSubSingle: 'درهم',
    arSubPlural: 'دراهم',
    enMainSingle: 'Qatari Riyal',
    enMainPlural: 'Qatari Riyals',
    enSubSingle: 'Dirham',
    enSubPlural: 'Dirhams',
  },
  BHD: {
    arMainSingle: 'دينار بحريني',
    arMainPlural: 'دنانير بحرينية',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: 'Bahraini Dinar',
    enMainPlural: 'Bahraini Dinars',
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  OMR: {
    arMainSingle: 'ريال عماني',
    arMainPlural: 'ريالات عمانية',
    arSubSingle: 'بيسة',
    arSubPlural: 'بيسات',
    enMainSingle: 'Omani Rial',
    enMainPlural: 'Omani Rials',
    enSubSingle: 'Baisa',
    enSubPlural: 'Baisas',
  },
  EGP: {
    arMainSingle: 'جنيه مصري',
    arMainPlural: 'جنيهات مصرية',
    arSubSingle: 'قرش',
    arSubPlural: 'قروش',
    enMainSingle: 'Egyptian Pound',
    enMainPlural: 'Egyptian Pounds',
    enSubSingle: 'Piastre',
    enSubPlural: 'Piastres',
  },
  JOD: {
    arMainSingle: 'دينار أردني',
    arMainPlural: 'دنانير أردنية',
    arSubSingle: 'قرش',
    arSubPlural: 'قروش',
    enMainSingle: 'Jordanian Dinar',
    enMainPlural: 'Jordanian Dinars',
    enSubSingle: 'Piastre',
    enSubPlural: 'Piastres',
  },
  IQD: {
    arMainSingle: 'دينار عراقي',
    arMainPlural: 'دنانير عراقية',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: 'Iraqi Dinar',
    enMainPlural: 'Iraqi Dinars',
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  LYD: {
    arMainSingle: 'دينار ليبي',
    arMainPlural: 'دنانير ليبية',
    arSubSingle: 'درهم',
    arSubPlural: 'دراهم',
    enMainSingle: 'Libyan Dinar',
    enMainPlural: 'Libyan Dinars',
    enSubSingle: 'Dirham',
    enSubPlural: 'Dirhams',
  },
  MAD: {
    arMainSingle: 'درهم مغربي',
    arMainPlural: 'دراهم مغربية',
    arSubSingle: 'سنتيم',
    arSubPlural: 'سنتيمات',
    enMainSingle: 'Moroccan Dirham',
    enMainPlural: 'Moroccan Dirhams',
    enSubSingle: 'Centime',
    enSubPlural: 'Centimes',
  },
  DZD: {
    arMainSingle: 'دينار جزائري',
    arMainPlural: 'دنانير جزائرية',
    arSubSingle: 'سنتيم',
    arSubPlural: 'سنتيمات',
    enMainSingle: 'Algerian Dinar',
    enMainPlural: 'Algerian Dinars',
    enSubSingle: 'Centime',
    enSubPlural: 'Centimes',
  },
  TND: {
    arMainSingle: 'دينار تونسي',
    arMainPlural: 'دنانير تونسية',
    arSubSingle: 'مليم',
    arSubPlural: 'مليمات',
    enMainSingle: 'Tunisian Dinar',
    enMainPlural: 'Tunisian Dinars',
    enSubSingle: 'Millime',
    enSubPlural: 'Millimes',
  },
  YER: {
    arMainSingle: 'ريال يمني',
    arMainPlural: 'ريالات يمنية',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: 'Yemeni Rial',
    enMainPlural: 'Yemeni Rials',
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  YER_ADEN: {
    arMainSingle: 'ريال يمني (عدن)',
    arMainPlural: 'ريالات يمنية (عدن)',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: 'Yemeni Rial (Aden)',
    enMainPlural: 'Yemeni Rials (Aden)',
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  YER_SANAA: {
    arMainSingle: 'ريال يمني (صنعاء)',
    arMainPlural: 'ريالات يمنية (صنعاء)',
    arSubSingle: 'فلس',
    arSubPlural: 'فلوس',
    enMainSingle: "Yemeni Rial (Sana'a)",
    enMainPlural: "Yemeni Rials (Sana'a)",
    enSubSingle: 'Fils',
    enSubPlural: 'Fils',
  },
  USD: {
    arMainSingle: 'دولار أمريكي',
    arMainPlural: 'دولارات أمريكية',
    arSubSingle: 'سنت',
    arSubPlural: 'سنتات',
    enMainSingle: 'US Dollar',
    enMainPlural: 'US Dollars',
    enSubSingle: 'Cent',
    enSubPlural: 'Cents',
  },
  EUR: {
    arMainSingle: 'يورو',
    arMainPlural: 'يورو',
    arSubSingle: 'سنت',
    arSubPlural: 'سنتات',
    enMainSingle: 'Euro',
    enMainPlural: 'Euros',
    enSubSingle: 'Cent',
    enSubPlural: 'Cents',
  },
  GBP: {
    arMainSingle: 'جنيه إسترليني',
    arMainPlural: 'جنيهات إسترلينية',
    arSubSingle: 'بنس',
    arSubPlural: 'بنسات',
    enMainSingle: 'British Pound',
    enMainPlural: 'British Pounds',
    enSubSingle: 'Penny',
    enSubPlural: 'Pence',
  },
  TRY: {
    arMainSingle: 'ليرة تركية',
    arMainPlural: 'ليرات تركية',
    arSubSingle: 'قرش',
    arSubPlural: 'قروش',
    enMainSingle: 'Turkish Lira',
    enMainPlural: 'Turkish Liras',
    enSubSingle: 'Kurus',
    enSubPlural: 'Kuruses',
  },
};

/**
 * Convert small integer (0-999) to Arabic words
 */
function convertThreeDigitArabic(num: number): string {
  if (num === 0) return '';
  const parts: string[] = [];
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const ones = remainder % 10;
  const tens = Math.floor(remainder / 10);

  if (hundreds > 0) {
    parts.push(ARABIC_HUNDREDS[hundreds]);
  }

  if (remainder > 0) {
    if (remainder <= 10) {
      parts.push(ARABIC_ONES[remainder]);
    } else if (remainder < 20) {
      parts.push(ARABIC_TEENS[remainder - 10]);
    } else {
      if (ones > 0) {
        parts.push(`${ARABIC_ONES[ones]} و${ARABIC_TENS[tens]}`);
      } else {
        parts.push(ARABIC_TENS[tens]);
      }
    }
  }

  return parts.join(' و');
}

/**
 * Convert integer to Arabic words
 */
export function integerToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  if (num < 0) return `سالب ${integerToArabicWords(Math.abs(num))}`;

  num = Math.floor(num);
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const hundreds = num % 1000;

  const parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertThreeDigitArabic(billions)} مليارات`);
    else parts.push(`${convertThreeDigitArabic(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertThreeDigitArabic(millions)} ملايين`);
    else parts.push(`${convertThreeDigitArabic(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertThreeDigitArabic(thousands)} آلاف`);
    else parts.push(`${convertThreeDigitArabic(thousands)} ألف`);
  }

  if (hundreds > 0) {
    parts.push(convertThreeDigitArabic(hundreds));
  }

  return parts.join(' و');
}

/**
 * Convert small integer (0-999) to English words
 */
function convertThreeDigitEnglish(num: number): string {
  let str = '';
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    str += `${ENGLISH_ONES[hundreds]} Hundred `;
  }

  if (remainder > 0) {
    if (remainder < 20) {
      str += ENGLISH_ONES[remainder];
    } else {
      const tens = Math.floor(remainder / 10);
      const ones = remainder % 10;
      str += ENGLISH_TENS[tens];
      if (ones > 0) str += `-${ENGLISH_ONES[ones]}`;
    }
  }

  return str.trim();
}

/**
 * Convert integer to English words
 */
export function integerToEnglishWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return `Minus ${integerToEnglishWords(Math.abs(num))}`;

  num = Math.floor(num);
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const hundreds = num % 1000;

  const parts: string[] = [];

  if (billions > 0) parts.push(`${convertThreeDigitEnglish(billions)} Billion`);
  if (millions > 0) parts.push(`${convertThreeDigitEnglish(millions)} Million`);
  if (thousands > 0) parts.push(`${convertThreeDigitEnglish(thousands)} Thousand`);
  if (hundreds > 0) parts.push(convertThreeDigitEnglish(hundreds));

  return parts.join(' ');
}

/**
 * Convert financial amount to formal Arabic Tafqeet text
 */
export function formatAmountToArabicWords(amount: number, currencyCode: string = 'SAR'): string {
  const absAmount = Math.abs(amount);
  const mainPart = Math.floor(absAmount);
  const subPart = Math.round((absAmount - mainPart) * 100);

  const dict = CURRENCY_DICTIONARY[currencyCode] || {
    arMainSingle: currencyCode,
    arMainPlural: currencyCode,
    arSubSingle: 'جزء',
    arSubPlural: 'أجزاء',
    enMainSingle: currencyCode,
    enMainPlural: currencyCode,
    enSubSingle: 'cent',
    enSubPlural: 'cents',
  };

  const mainWords = integerToArabicWords(mainPart);
  const currencyTitle = mainPart === 1 ? dict.arMainSingle : (mainPart <= 10 && mainPart >= 3 ? dict.arMainPlural : dict.arMainSingle);

  let result = `فقط ${mainWords} ${currencyTitle}`;

  if (subPart > 0) {
    const subWords = integerToArabicWords(subPart);
    const subTitle = subPart === 1 ? dict.arSubSingle : (subPart <= 10 && subPart >= 3 ? dict.arSubPlural : dict.arSubSingle);
    result += ` و${subWords} ${subTitle}`;
  }

  result += ' لا غير';
  return result;
}

/**
 * Convert financial amount to formal English words
 */
export function formatAmountToEnglishWords(amount: number, currencyCode: string = 'SAR'): string {
  const absAmount = Math.abs(amount);
  const mainPart = Math.floor(absAmount);
  const subPart = Math.round((absAmount - mainPart) * 100);

  const dict = CURRENCY_DICTIONARY[currencyCode] || {
    arMainSingle: currencyCode,
    arMainPlural: currencyCode,
    arSubSingle: 'part',
    arSubPlural: 'parts',
    enMainSingle: currencyCode,
    enMainPlural: currencyCode,
    enSubSingle: 'Cent',
    enSubPlural: 'Cents',
  };

  const mainWords = integerToEnglishWords(mainPart);
  const currencyTitle = mainPart === 1 ? dict.enMainSingle : dict.enMainPlural;

  let result = `${mainWords} ${currencyTitle}`;

  if (subPart > 0) {
    const subWords = integerToEnglishWords(subPart);
    const subTitle = subPart === 1 ? dict.enSubSingle : dict.enSubPlural;
    result += ` and ${subWords} ${subTitle}`;
  }

  result += ' Only';
  return result;
}
