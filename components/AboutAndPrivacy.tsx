import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Lock, 
  Database, 
  Trash2, 
  Globe, 
  Mail, 
  CheckCircle2, 
  EyeOff, 
  Fingerprint, 
  HardDrive,
  Sparkles,
  Layers,
  Scale,
  Camera,
  Coins,
  Activity,
  ArrowUpRight,
  HelpCircle,
  FileText,
  Info,
  ChevronDown
} from 'lucide-react';
import { LanguageKey } from '../utils/translations';

interface AboutAndPrivacyProps {
  onBack: () => void;
  language?: LanguageKey;
  initialTab?: 'about' | 'privacy';
}

export const AboutAndPrivacy: React.FC<AboutAndPrivacyProps> = ({ 
  onBack, 
  language = 'ar',
  initialTab = 'about'
}) => {
  const [currentLang, setCurrentLang] = useState<'ar' | 'en'>(language === 'en' ? 'en' : 'ar');
  const [activeTab, setActiveTab] = useState<'about' | 'privacy'>(initialTab);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(0);
  const [expandedPolicy, setExpandedPolicy] = useState<number | null>(0);

  const isRTL = currentLang === 'ar';

  const toggleLanguage = () => {
    setCurrentLang(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] z-[450] flex flex-col animate-fade overflow-hidden font-sans selection:bg-[#D9B978]/20"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER - QUIET LUXURY NAVIGATION & TABS
      ───────────────────────────────────────────────────────────── */}
      <header className="bg-[#11161C]/95 backdrop-blur-2xl border-b border-white/[0.06] px-4 pt-10 pb-4 shrink-0 shadow-lg z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onBack}
              className="p-2.5 bg-[#0A0D10] hover:bg-white/5 border border-white/10 rounded-2xl text-[#D9B978] active:scale-90 transition-all duration-200 flex items-center gap-1.5 min-h-[44px] min-w-[44px] justify-center"
              title={currentLang === 'ar' ? 'رجوع' : 'Back'}
            >
              {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              <span className="text-xs font-bold hidden sm:inline">
                {currentLang === 'ar' ? 'رجوع' : 'Back'}
              </span>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#D9B978]/10 border border-[#D9B978]/20 text-[#D9B978] flex items-center justify-center">
                <Sparkles size={17} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#F4F1EA] tracking-tight">
                  {currentLang === 'ar' ? 'ثري | THARI' : 'THARI — Living Wealth'}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  {currentLang === 'ar' ? 'الفخامة الهادئة والخصوصية المطلقة' : 'Quiet Luxury & Sovereign Privacy'}
                </p>
              </div>
            </div>
          </div>

          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3.5 py-2 bg-[#D9B978]/10 hover:bg-[#D9B978]/20 border border-[#D9B978]/30 text-[#D9B978] rounded-xl text-xs font-bold active:scale-95 transition-all duration-200 flex items-center gap-1.5 shadow-sm min-h-[44px]"
          >
            <Globe size={14} />
            <span>{currentLang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>

        {/* Soft Navigation Tabs */}
        <div className="max-w-4xl mx-auto pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 min-h-[46px] active:scale-[0.98] ${
              activeTab === 'about'
                ? 'bg-[#D9B978] text-[#0A0D10] shadow-md shadow-[#D9B978]/20'
                : 'bg-[#0A0D10]/80 hover:bg-white/5 text-slate-300 border border-white/[0.04]'
            }`}
          >
            <Info size={16} />
            <span>{currentLang === 'ar' ? 'نبذة عن التطبيق والفلسفة' : 'About THARI & Philosophy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 min-h-[46px] active:scale-[0.98] ${
              activeTab === 'privacy'
                ? 'bg-[#D9B978] text-[#0A0D10] shadow-md shadow-[#D9B978]/20'
                : 'bg-[#0A0D10]/80 hover:bg-white/5 text-slate-300 border border-white/[0.04]'
            }`}
          >
            <ShieldCheck size={16} />
            <span>{currentLang === 'ar' ? 'سياسة الخصوصية والأمان' : 'Privacy & Security Policy'}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. SCROLLABLE CONTENT BODY
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full pb-32 text-start">
        
        <AnimatePresence mode="wait">
          {activeTab === 'about' ? (
            /* ══════════════════════════════════════════════════════════
               TAB 1: ABOUT THARI (MARKETING & PHILOSOPHY)
            ══════════════════════════════════════════════════════════ */
            <motion.div
              key="about-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Hero Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#171D24] to-[#11161C] border border-white/[0.06] shadow-xl text-center space-y-4 relative overflow-hidden">
                <div className="w-16 h-16 bg-[#D9B978]/15 border border-[#D9B978]/30 rounded-2xl flex items-center justify-center mx-auto text-[#D9B978] shadow-lg shadow-[#D9B978]/10">
                  <Sparkles size={32} strokeWidth={2} />
                </div>
                
                <div className="space-y-2 max-w-2xl mx-auto">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#D9B978]">
                    {currentLang === 'ar' ? 'الفخامة الهادئة • الخصوصية أولاً' : 'Quiet Luxury • Local-First'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F4F1EA] tracking-tight">
                    {currentLang === 'ar' 
                      ? 'عندما تلتقي إدارة الثروة بالهدوء والخصوصية المطلقة' 
                      : 'Where Financial Mastery Meets Quiet Luxury and Absolute Privacy'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal pt-1">
                    {currentLang === 'ar'
                      ? 'صُمم «ثري» ليكون الملاذ المالي الخاص لنخبة المستخدمين ورواد الأعمال الذين يبحثون عن الوضوح المالي دون التنازل عن سرية أرقامهم. نؤمن بأن ثروتك شأن خاص بك وحدك؛ لذلك ابتكرنا نظاماً مالياً لا يعتمد على خوادم سحابية خارجية، بل يحفظ كل سجلاتك مشفرة داخل جهازك وبأعلى معايير الحماية.'
                      : 'Crafted for discerning individuals, investors, and professionals, THARI provides an elegant, serene financial sanctuary. We believe true wealth demands uncompromising discretion. Built with a strict Local-First Architecture, THARI stores and encrypts your entire financial ledger exclusively on your device.'}
                  </p>
                </div>

                {/* Feature Highlights Chips */}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span className="px-3 py-1.5 rounded-xl bg-[#D9B978]/10 border border-[#D9B978]/20 text-[#D9B978] text-[11px] font-semibold flex items-center gap-1.5">
                    <Database size={13} /> {currentLang === 'ar' ? 'محلي 100% بدون سحابة' : '100% Local-First'}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#8EB9A7]/10 border border-[#8EB9A7]/20 text-[#8EB9A7] text-[11px] font-semibold flex items-center gap-1.5">
                    <Lock size={13} /> {currentLang === 'ar' ? 'تشفير عسكري AES-256' : 'AES-256 Encrypted'}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#759BC8]/10 border border-[#759BC8]/20 text-[#759BC8] text-[11px] font-semibold flex items-center gap-1.5">
                    <Coins size={13} /> {currentLang === 'ar' ? 'مدار عملات متعدد' : 'Multi-Currency Orbit'}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#D9B978]/10 border border-[#D9B978]/20 text-[#D9B978] text-[11px] font-semibold flex items-center gap-1.5">
                    <Scale size={13} /> {currentLang === 'ar' ? 'حاسبة الزكاة الذكية' : 'Zakat Sanctuary'}
                  </span>
                </div>
              </div>

              {/* Accordion Features List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                  {currentLang === 'ar' ? 'أبرز ركائز منظومة «ثري»' : 'Core Pillars of THARI'}
                </h4>

                {[
                  {
                    icon: Activity,
                    color: '#D9B978',
                    title: currentLang === 'ar' ? '1. نبض الثروة والسجل الشامل (Wealth Pulse & Ledger)' : '1. Wealth Pulse & Consolidated Ledger',
                    desc: currentLang === 'ar' 
                      ? 'نظرة شاملة ولحظية لصافي ثروتك (Net Worth)، التدفقات النقدية، توازن الالتزامات والديون، مع تحليلات ذكية لأداء المحافظ الاستثمارية والسيولة المتاحة.'
                      : 'Instant visibility into your real-time Net Worth, liquidity, receivables, and liabilities with seamless cashflow intelligence and asset distribution insights.',
                    details: currentLang === 'ar' 
                      ? ['متابعة حية لصافي المركز المالي', 'فصل وتحليل الالتزامات مقابل المستحقات', 'مخططات تدفق مالي دقيقة دون أي تشتيت']
                      : ['Real-time consolidated Net Worth calculation', 'Receivables vs liabilities segregation', 'Crystal clear cashflow tracking without distractions']
                  },
                  {
                    icon: Coins,
                    color: '#759BC8',
                    title: currentLang === 'ar' ? '2. مدار العملات الحي (Currency Orbit)' : '2. Currency Orbit & Global FX',
                    desc: currentLang === 'ar' 
                      ? 'إدارة سلسة للمحافظ والعملات المتعددة (SAR, USD, EUR, AED, GBP...) مع محول عملات آني يدعم التحديث المباشر وتتبع تقلبات الصرف العالمية بدقة.'
                      : 'Effortlessly manage multi-currency accounts (USD, SAR, EUR, GBP, AED, etc.) with real-time conversion rates and consolidated base-currency valuations.',
                    details: currentLang === 'ar'
                      ? ['دعم كافة العملات الخليجية والعالمية', 'تحديث حي لأسعار الصرف الرسمية', 'تقييم شامل لثروتك بعملتك المفضلة']
                      : ['Full coverage of GCC and international currencies', 'Real-time market exchange rate lookup', 'Unified base currency valuation']
                  },
                  {
                    icon: Database,
                    color: '#8EB9A7',
                    title: currentLang === 'ar' ? '3. أمان محلي تام دون سحابة (Local-First Vault)' : '3. Sovereign Local-First Security',
                    desc: currentLang === 'ar'
                      ? 'بياناتك لا تغادر هاتفك أبداً. تشفير عسكري قوي (AES-256) يضمن بقاء أرقامك، مدخراتك، وفواتيرك في معزل تام عن أعين المتطفلين وبدون أي تسجيل دخول أو مشاركة خارجية.'
                      : 'No third-party cloud servers. No data brokering. Your financial ledger is protected by client-side AES-256 encryption residing strictly inside your device hardware.',
                    details: currentLang === 'ar'
                      ? ['صفر خوادم خارجية لحفظ الأرقام', 'تشفير كامل لقاعدة البيانات المحلية', 'عمل مستقل تماماً أوفلاين']
                      : ['Zero external servers hosting records', 'Complete local database encryption', 'Autonomous 100% offline capability']
                  },
                  {
                    icon: Scale,
                    color: '#D9B978',
                    title: currentLang === 'ar' ? '4. محراب الزكاة الذكي (Zakat Sanctuary)' : '4. Zakat Sanctuary & Wealth Purification',
                    desc: currentLang === 'ar'
                      ? 'حاسبة زكاة متقدمة ومطابقة للأحكام الشرعية؛ تفرز تلقائياً عروض التجارة، الذهب والفضة، الأسهم (المضاربة والاستثمار)، والصناديق العقارية مع تنبيهات بحلول الحول وبلوغ النصاب.'
                      : 'A comprehensive Islamic wealth calculator tailored for modern assets—stocks, mutual funds, gold, real estate, and trade inventory—with automated Nisab thresholds and Hawl tracking.',
                    details: currentLang === 'ar'
                      ? ['تغطية دقيقة لكافة الأوعية الزكوية المعاصرة', 'ربط فوري بأسعار الذهب لحساب النصاب', 'تنبيهات استحقاق الحول القمري']
                      : ['Comprehensive coverage of modern zakatable asset pools', 'Dynamic gold price tracking for Nisab threshold', 'Lunar Hawl anniversary notifications']
                  },
                  {
                    icon: Camera,
                    color: '#C98387',
                    title: currentLang === 'ar' ? '5. الأرشيف المالي وحفظ الفواتير (Receipt Vault)' : '5. Encrypted Receipt & Document Vault',
                    desc: currentLang === 'ar'
                      ? 'أرفق صور الإيصالات والعقود المالية لكل حركة مع تشفير محلي يدعم الاسترجاع الفوري والبحث السريع دون استهلاك مساحات سحابية خارجية.'
                      : 'Attach transaction receipts, contracts, and invoices directly to movements with compressed local storage and instant offline retrieval.',
                    details: currentLang === 'ar'
                      ? ['إرفاق فوري لصور الفواتير والإيصالات', 'ضغط وتشفير محلي آمن داخل الجهاز', 'بحث وفلترة سريعة بالسجلات']
                      : ['Instant camera attachment for receipts', 'Compressed offline storage container', 'Rapid offline filtering & search']
                  },
                  {
                    icon: Fingerprint,
                    color: '#8EB9A7',
                    title: currentLang === 'ar' ? '6. القفل البايومتري الفوري (Biometric Shield)' : '6. Native Biometric Shield',
                    desc: currentLang === 'ar'
                      ? 'حماية إضافية عبر بصمة الوجه (Face ID) أو بصمة الإصبع (Touch ID) لضمان عدم فتح التطبيق إلا من قبلك شخصياً.'
                      : 'Instant authentication via Face ID, Touch ID, or custom biometric hardware to safeguard your financial privacy at all times.',
                    details: currentLang === 'ar'
                      ? ['مصادقة أمنية عبر معالج الأمان المباشر للهاتف', 'قفل تلقائي فوري عند مغادرة التطبيق', 'حماية بكلمة مرور مشفرة عند الاستعادة']
                      : ['Direct hardware-enclave biometric verification', 'Instant auto-lock upon backgrounding', 'Encrypted passphrase verification on restore']
                  }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  const isExpanded = expandedFeature === idx;
                  return (
                    <div 
                      key={idx}
                      className="p-5 rounded-2xl bg-[#11161C] border border-white/[0.05] transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFeature(isExpanded ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-start min-h-[44px]"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                            style={{ backgroundColor: `${item.color}15`, color: item.color }}
                          >
                            <Icon size={18} />
                          </div>
                          <h5 className="font-semibold text-sm sm:text-base text-[#F4F1EA]">
                            {item.title}
                          </h5>
                        </div>
                        <ChevronDown 
                          size={18} 
                          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180 text-[#D9B978]' : ''
                          }`} 
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden space-y-3 pt-3"
                          >
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                              {item.desc}
                            </p>
                            <div className="p-3 bg-[#0A0D10] rounded-xl border border-white/[0.04] space-y-1.5">
                              {item.details.map((pt, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-400">
                                  <CheckCircle2 size={13} className="text-[#D9B978] shrink-0" />
                                  <span>{pt}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Version and App Info */}
              <div className="p-5 rounded-2xl bg-[#11161C] border border-white/[0.05] text-center space-y-1">
                <p className="text-xs text-[#D9B978] font-semibold">
                  {currentLang === 'ar' ? 'تطبيق ثري — الإصدار 1.2.0 (Build 2026)' : 'THARI App — Version 1.2.0 (Build 2026)'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'ar' 
                    ? 'هندسة فائقة الدقة لإدارة الثروة وحساب الزكاة' 
                    : 'Precision-Engineered Wealth Management & Zakat Solution'}
                </p>
              </div>
            </motion.div>
          ) : (
            /* ══════════════════════════════════════════════════════════
               TAB 2: PRIVACY POLICY (LEGAL & SECURITY)
            ══════════════════════════════════════════════════════════ */
            <motion.div
              key="privacy-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Legal Hero Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#171D24] to-[#11161C] border border-white/[0.06] shadow-xl text-center space-y-3 relative overflow-hidden">
                <div className="w-16 h-16 bg-[#8EB9A7]/15 border border-[#8EB9A7]/30 rounded-2xl flex items-center justify-center mx-auto text-[#8EB9A7] shadow-lg shadow-[#8EB9A7]/10">
                  <ShieldCheck size={32} strokeWidth={2} />
                </div>
                
                <div className="space-y-1.5 max-w-xl mx-auto">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#8EB9A7]">
                    {currentLang === 'ar' ? 'السيادة والسرية القانونية' : 'Legal & Data Sovereignty'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#F4F1EA] tracking-tight">
                    {currentLang === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy & Data Protection'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {currentLang === 'ar' ? 'تاريخ السريان: أغسطس 2026' : 'Effective Date: August 2026'}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <span className="px-3 py-1.5 rounded-xl bg-[#8EB9A7]/10 border border-[#8EB9A7]/20 text-[#8EB9A7] text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> {currentLang === 'ar' ? 'صفر خوادم خارجية' : 'Zero Cloud Servers'}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#D9B978]/10 border border-[#D9B978]/20 text-[#D9B978] text-[11px] font-semibold flex items-center gap-1.5">
                    <Lock size={13} /> {currentLang === 'ar' ? 'تشفير AES-256' : 'AES-256 Local Vault'}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#759BC8]/10 border border-[#759BC8]/20 text-[#759BC8] text-[11px] font-semibold flex items-center gap-1.5">
                    <EyeOff size={13} /> {currentLang === 'ar' ? 'بدون متتبعات أو إعلانات' : 'No Ads or Trackers'}
                  </span>
                </div>
              </div>

              {/* Legal Sections Accordion */}
              <div className="space-y-3">
                {[
                  {
                    icon: Database,
                    color: '#D9B978',
                    title: currentLang === 'ar' ? '1. التخزين المحلي المشفر وانعدام الخوادم' : '1. Sovereign Local Storage & Zero Cloud',
                    body: currentLang === 'ar'
                      ? 'نحن لا نملك، ولا ندير، ولا نستخدم أي خوادم سحابية (Cloud Servers) لتخزين أو استلام سجلاتك المالية أو مبالغ حساباتك أو معلومات ثروتك. كافة البيانات المُدخلة (المعاملات، المحافظ، الديون، الملاحظات، وحسابات الزكاة) تُحفظ وتُشفر محلياً على الذاكرة التخزينية لجهازك فقط باستخدام تقنية AES-256. من المستحيل تقنياً وقانونياً على مطوري التطبيق أو أي طرف ثالث الاطلاع على سجلاتك المالية.'
                      : 'We do not operate, maintain, or utilize cloud databases or remote servers to store, process, or inspect your financial transactions, net worth, debts, or balances. All data entered into THARI is encrypted client-side (AES-256) and saved solely within your device’s isolated sandbox storage. It is technically impossible for the developers of THARI or any third party to access or decrypt your financial ledger.',
                    points: currentLang === 'ar'
                      ? ['البيانات لا تغادر هاتفك إطلاقاً', 'تشفير معزول على مستوى عتاد الجهاز', 'استحالة وصول أي طرف خارجي لأرقامك']
                      : ['Data strictly never leaves your physical device', 'Isolated hardware sandbox encryption', 'Zero third-party access to ledger']
                  },
                  {
                    icon: Fingerprint,
                    color: '#8EB9A7',
                    title: currentLang === 'ar' ? '2. المصادقة والبيانات الحيوية (Biometrics)' : '2. Biometric Security & Device Enclave',
                    body: currentLang === 'ar'
                      ? 'يدعم التطبيق القفل عبر بصمة الوجه (Face ID) أو بصمة الإصبع (Touch ID). تتم عملية التحقق من الهوية بالكامل عبر المعالج الأمني المشفر لنظام تشغيل جهازك (Secure Enclave / Android Keystore). التطبيق لا يطلب، ولا يستلم، ولا يخزن أي قياسات حيوية على الإطلاق؛ بل يتلقى فقط إشعاراً برمجياً ثنائياً بنجاح المصادقة.'
                      : 'THARI supports hardware authentication using Face ID, Touch ID, or Android Biometrics. Biometric validation is handled directly by your device\'s operating system security hardware (Apple Secure Enclave / Android KeyStore). THARI never accesses, records, or stores your biometric templates.',
                    points: currentLang === 'ar'
                      ? ['معالجة البصمة داخل معالج أمان الهاتف', 'عدم وصول التطبيق لأي بيانات حيوية خام', 'إمكانية تفعيل وإلغاء القفل في أي وقت']
                      : ['Processed inside OS hardware security enclave', 'Zero access to raw biometric templates', 'Toggleable anytime in settings']
                  },
                  {
                    icon: Camera,
                    color: '#759BC8',
                    title: currentLang === 'ar' ? '3. أذونات الكاميرا والوسائط' : '3. Camera & Photo Library Access',
                    body: currentLang === 'ar'
                      ? 'يطلب التطبيق إذن الوصول إلى الكاميرا ومكتبة الصور فقط في حال رغبتك باختيار أو تصوير إيصال مالي (Receipt) لإرفاقه بمعاملة معينة. تُخزن الصور المرفقة مشفرة محلياً داخل المساحة المخصصة للتطبيق على هاتفك ولا يتم رفعها أو مشاركتها مع أي خادم خارجي.'
                      : 'Camera and Media permissions are requested strictly on-demand if you choose to photograph or attach document receipts to financial entries. Receipt attachments are compressed, encrypted, and stored entirely within your local device directory. No media files are ever transmitted off-device.',
                    points: currentLang === 'ar'
                      ? ['طلب الإذن فقط عند النقر على إرفاق إيصال', 'تخزين الصور داخل حاوية التطبيق المشفرة', 'انعدام أي رفع سحابي للفواتير']
                      : ['Permission requested strictly on-demand', 'Receipt images stored in encrypted sandbox', 'Zero cloud upload of invoice documents']
                  },
                  {
                    icon: EyeOff,
                    color: '#C98387',
                    title: currentLang === 'ar' ? '4. انعدام مشاركة البيانات والإعلانات' : '4. Zero Data Sharing & No Ads',
                    body: currentLang === 'ar'
                      ? 'التطبيق خالٍ تماماً من الشبكات الإعلانية التتبعية (Ad Trackers). نحن لا نبيع، ولا نؤجر، ولا نشارك أي معلومات تعريفية أو مالية مع أي شركات تسويق أو جهات خارجية تحت أي ظرف.'
                      : 'THARI contains zero invasive analytics frameworks, behavioral trackers, or ad network scripts. We never sell, lease, disclose, or broker your personal or financial information to data brokers, marketers, or institutional third parties.',
                    points: currentLang === 'ar'
                      ? ['صفر إعلانات تجارية', 'صفر حزم تتبع سلوكي', 'احترام كامل للخصوصية المالية']
                      : ['Zero commercial advertisements', 'Zero behavioral telemetry beacons', 'Uncompromising financial privacy']
                  },
                  {
                    icon: Globe,
                    color: '#D9B978',
                    title: currentLang === 'ar' ? '5. استعلام أسعار الصرف العامة' : '5. External Currency Rate Lookups',
                    body: currentLang === 'ar'
                      ? 'عند استخدام ميزة تحديث أسعار صرف العملات، يقتصر الاتصال على جلب بيانات أسعار السوق العامة دون إرسال أي معرفات شخصية أو أرقام محافظ أو تفاصيل تخص أرصدة المستخدم.'
                      : 'When fetching dynamic foreign exchange rates, the application executes a stateless query for public market indices. No device identifiers, account balances, or transaction records are ever attached to these lookup requests.',
                    points: currentLang === 'ar'
                      ? ['جلب أسعار السوق العامة فقط', 'عدم إرسال أي تفاصيل عن أرصدة المستخدم', 'إمكانية العمل بأسعار الصرف المحفوظة أوفلاين']
                      : ['Fetches public market indices only', 'Zero transmission of balances or account info', 'Fully operable offline with cached rates']
                  },
                  {
                    icon: Trash2,
                    color: '#8EB9A7',
                    title: currentLang === 'ar' ? '6. سيادة المستخدم وحذف السجلات' : '6. User Data Rights & Data Purge',
                    body: currentLang === 'ar'
                      ? 'لك كامل السيطرة على بياناتك في أي وقت؛ يمكنك تصدير نسخة احتياطية مشفرة محلياً، أو مسح كافة البيانات بشكل دائم وفوري من خلال إعدادات التطبيق أو عبر إلغاء تثبيت التطبيق من جهازك.'
                      : 'You retain 100% sovereignty over your data. You can export an encrypted backup file, transfer your records offline, or permanently purge all database records at any time directly through the app settings or by deleting the application.',
                    points: currentLang === 'ar'
                      ? ['تصدير نسخة احتياطية مشفرة بكلمة مرورك', 'زر مسح فوري شامل لجميع السجلات', 'حذف التطبيق يزيل كافة الملفات نهائياً']
                      : ['Encrypted backup export with custom password', 'Instant full-purge action in settings', 'App removal erases all local database records']
                  }
                ].map((sec, sIdx) => {
                  const Icon = sec.icon;
                  const isExpanded = expandedPolicy === sIdx;
                  return (
                    <div 
                      key={sIdx}
                      className="p-5 rounded-2xl bg-[#11161C] border border-white/[0.05] transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedPolicy(isExpanded ? null : sIdx)}
                        className="w-full flex items-center justify-between gap-3 text-start min-h-[44px]"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                            style={{ backgroundColor: `${sec.color}15`, color: sec.color }}
                          >
                            <Icon size={18} />
                          </div>
                          <h5 className="font-semibold text-sm sm:text-base text-[#F4F1EA]">
                            {sec.title}
                          </h5>
                        </div>
                        <ChevronDown 
                          size={18} 
                          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180 text-[#D9B978]' : ''
                          }`} 
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden space-y-3 pt-3"
                          >
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                              {sec.body}
                            </p>
                            <div className="p-3 bg-[#0A0D10] rounded-xl border border-white/[0.04] space-y-1.5">
                              {sec.points.map((pt, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-400">
                                  <CheckCircle2 size={13} className="text-[#8EB9A7] shrink-0" />
                                  <span>{pt}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Contact Official Support */}
              <div className="p-6 rounded-3xl bg-[#11161C] border border-[#D9B978]/20 shadow-lg space-y-3">
                <div className="flex items-center gap-3 text-[#D9B978]">
                  <div className="w-9 h-9 rounded-xl bg-[#D9B978]/15 text-[#D9B978] flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <h5 className="font-bold text-sm sm:text-base text-[#F4F1EA]">
                    {currentLang === 'ar' ? 'التواصل والاستفسارات القانونية' : 'Legal & Support Inquiries'}
                  </h5>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {currentLang === 'ar'
                    ? 'إذا كان لديك أي أسئلة أو استفسارات تتعلق بسياسة الخصوصية وأمان البيانات، يمكنك التواصل مع فريق التطوير مباشرة عبر البريد الإلكتروني الرسمي:'
                    : 'If you have any questions or feedback regarding our privacy practices and security measures, please contact our official team directly at:'}
                </p>

                <div className="pt-2">
                  <a 
                    href="mailto:thari-app@inbox.ru"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9B978] text-[#0A0D10] font-bold text-xs sm:text-sm shadow-md hover:bg-[#c9a764] active:scale-95 transition-all min-h-[44px]"
                  >
                    <Mail size={15} />
                    <span dir="ltr">thari-app@inbox.ru</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────────────────
            3. FOOTER
        ───────────────────────────────────────────────────────────── */}
        <div className="pt-8 pb-4 border-t border-white/[0.05] text-center space-y-2">
          <p className="text-xs text-slate-400 font-medium">
            {currentLang === 'ar' 
              ? 'تطبيق ثري — خصوصية مطلقة، تشفير محلي، وسيادة مالية كاملة' 
              : 'THARI — Absolute Privacy, Local Encryption & Total Financial Sovereignty'}
          </p>
          <p className="text-xs text-[#D9B978] font-semibold">
            {currentLang === 'ar' 
              ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} تطبيق ثري` 
              : `All Rights Reserved © ${new Date().getFullYear()} THARI App`}
          </p>
        </div>

      </div>
    </div>
  );
};

export default AboutAndPrivacy;
