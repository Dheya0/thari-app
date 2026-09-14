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
  Check, 
  Copy,
  Coins, 
  FileText, 
  Info, 
  Fingerprint,
  Wallet,
  Handshake,
  Target,
  FileSpreadsheet,
  HardDriveDownload,
  CheckCircle2,
  Cpu,
  EyeOff,
  Scale,
  RefreshCw,
  Clock,
  KeyRound
} from 'lucide-react';
import { LanguageKey } from '../utils/translations';
import { Logo } from './Logo';

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
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isRTL = currentLang === 'ar';
  const officialEmail = 'thari-app@inbox.ru';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(officialEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const toggleLanguage = () => {
    setCurrentLang(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      className="fixed inset-0 bg-[#080B0E] text-[#F4F1EA] z-[450] flex flex-col overflow-hidden font-sans selection:bg-[#D9B978]/25"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER - LUXURY NAVIGATION & TAB SELECTOR
      ───────────────────────────────────────────────────────────── */}
      <header 
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        className="bg-[#0E1319]/95 backdrop-blur-2xl border-b border-white/[0.07] px-4 sm:px-6 pb-4 shrink-0 shadow-2xl z-20"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onBack}
              className="p-2.5 bg-[#080B0E] hover:bg-white/5 border border-white/10 rounded-2xl text-[#D9B978] active:scale-95 transition-all duration-150 flex items-center gap-1.5 min-h-[44px] min-w-[44px] justify-center shadow-sm"
              title={currentLang === 'ar' ? 'رجوع' : 'Back'}
            >
              {isRTL ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              <span className="text-xs font-bold hidden sm:inline">
                {currentLang === 'ar' ? 'الرئيسية' : 'Home'}
              </span>
            </button>
            
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#F4F1EA] tracking-tight leading-tight">
                  {currentLang === 'ar' ? 'ثَـري | THARI' : 'THARI — Wealth Governance'}
                </h2>
                <p className="text-[10px] text-[#D9B978] font-bold tracking-wider uppercase">
                  {currentLang === 'ar' ? 'السيادة والخصوصية المالية' : 'Sovereign Financial Privacy'}
                </p>
              </div>
            </div>
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3.5 py-2 bg-[#D9B978]/10 hover:bg-[#D9B978]/20 border border-[#D9B978]/30 text-[#D9B978] rounded-xl text-xs font-black active:scale-95 transition-all duration-150 flex items-center gap-1.5 shadow-sm min-h-[44px]"
          >
            <Globe size={14} />
            <span>{currentLang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-4xl mx-auto pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 min-h-[46px] active:scale-[0.98] ${
              activeTab === 'about'
                ? 'bg-[#D9B978] text-[#080B0E] shadow-lg shadow-[#D9B978]/20'
                : 'bg-[#080B0E] text-slate-400 hover:text-white border border-white/[0.05]'
            }`}
          >
            <Info size={16} />
            <span>{currentLang === 'ar' ? 'عن التطبيق والمعمارية' : 'About & Architecture'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 min-h-[46px] active:scale-[0.98] ${
              activeTab === 'privacy'
                ? 'bg-[#D9B978] text-[#080B0E] shadow-lg shadow-[#D9B978]/20'
                : 'bg-[#080B0E] text-slate-400 hover:text-white border border-white/[0.05]'
            }`}
          >
            <ShieldCheck size={16} />
            <span>{currentLang === 'ar' ? 'وثيقة الخصوصية والسيادة' : 'Privacy & Sovereignty'}</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. SCROLLABLE BODY CONTENT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full pb-32 text-start">
        <AnimatePresence mode="wait">
          {activeTab === 'about' ? (
            /* ══════════════════════════════════════════════════════════
               TAB 1: ABOUT & SYSTEM ARCHITECTURE
            ══════════════════════════════════════════════════════════ */
            <motion.div
              key="about-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Sovereign Philosophy Hero */}
              <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#11161D] to-[#0A0D12] border border-white/[0.08] shadow-2xl overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="p-3.5 bg-[#D9B978]/10 border border-[#D9B978]/30 rounded-2xl text-[#D9B978] shrink-0 shadow-inner">
                    <Logo size={52} />
                  </div>
                  <div className="space-y-2 text-center sm:text-start">
                    <span className="text-[11px] font-black text-[#D9B978] uppercase tracking-widest">
                      {currentLang === 'ar' ? 'فلسفة الفخامة الهادئة والسيادة' : 'Quiet Luxury & Sovereign Finance'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[#F4F1EA] tracking-tight leading-snug">
                      {currentLang === 'ar' 
                        ? 'إدارة متكاملة للثروة بلا ضوضاء وبلا خوادم خارجية' 
                        : 'Holistic Wealth Governance With Zero External Dependency'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {currentLang === 'ar'
                        ? 'ابتُكر «ثَـري» ليكون الملاذ المالي الخاص لأصحاب الأعمال والمستثمرين الذين ينشدون ضبط أموالهم باحترافية مصرفية كاملة، مع التزام صارم بعدم خروج أي رقم أو حركة مالية خارج عتاد جهاز المستخدم الشخصي.'
                        : 'Engineered as an autonomous, confidential wealth governance sanctuary for high-net-worth individuals and discerning professionals who demand institutional clarity with absolute local-first privacy.'}
                    </p>
                  </div>
                </div>

                {/* Key Technical Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-6 mt-6 border-t border-white/[0.06]">
                  {[
                    { label: currentLang === 'ar' ? 'محلي 100%' : '100% Local-First', sub: currentLang === 'ar' ? 'صفر خوادم وسيطة' : 'Zero Cloud Relay' },
                    { label: currentLang === 'ar' ? 'تشفير AES-256' : 'AES-256 Vault', sub: currentLang === 'ar' ? 'حماية محكمة محلياً' : 'Encrypted Storage' },
                    { label: currentLang === 'ar' ? 'تأمين بايومتري' : 'Biometric Enclave', sub: currentLang === 'ar' ? 'Face ID / Touch ID' : 'Hardware Secured' },
                    { label: currentLang === 'ar' ? 'محاسبة معتمدة' : 'Double-Entry Audit', sub: currentLang === 'ar' ? 'مطابقة الأرصدة والقوائم' : 'Ledger Reconciliation' },
                  ].map((b, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#080B0E]/90 border border-white/[0.05] text-center">
                      <div className="text-xs font-black text-[#D9B978]">{b.label}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{b.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8 Complete Functional Systems */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#D9B978]">
                    {currentLang === 'ar' ? 'المنظومات الوظيفية المتكاملة في «ثري»' : 'Core Integrated Systems in THARI'}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-bold">8 Modules</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Wallet,
                      title: currentLang === 'ar' ? '1. المحافظ والتدفقات النقدية' : '1. Multi-Wallet Cashflow Engine',
                      desc: currentLang === 'ar'
                        ? 'إدارة الحسابات البنكية، الخزائن النقدية، محافظ الادخار والاستثمار مع تتبع دقيق للحركات، المصروفات، والأرباح مع دعم العملات المتعددة.'
                        : 'Track multi-currency bank accounts, cash vaults, savings, and investments with instantaneous balance reconciliations and ledger logs.'
                    },
                    {
                      icon: Coins,
                      title: currentLang === 'ar' ? '2. مدار العملات وسوق الصرف الآني' : '2. Multi-Currency & FX Engine',
                      desc: currentLang === 'ar'
                        ? 'إدارة الحسابات بالعملات المتعددة (SAR, USD, EUR, AED, GBP...) مع محول عملات آني يدعم تحديث وتتبع أسعار الصرف وتقييم الثروة بالعملة الأساسية.'
                        : 'Manage multi-currency portfolios (USD, SAR, EUR, GBP, AED, etc.) with real-time conversion rates and unified base-currency net worth valuation.'
                    },
                    {
                      icon: Scale,
                      title: currentLang === 'ar' ? '3. سجل القيود والمعاملات المحاسبي' : '3. Double-Entry Audit Ledger',
                      desc: currentLang === 'ar'
                        ? 'تسجيل كل حركة مالية مع ربطها بالتصنيفات والمحافظ والملاحظات والعملات، ومطابقة الأرصدة التراكمية في الوقت الفعلي.'
                        : 'Comprehensive accounting ledger recording credits, debits, categories, notes, and exact running balances across all transaction streams.'
                    },
                    {
                      icon: Target,
                      title: currentLang === 'ar' ? '4. الميزانيات وسقوف الإنفاق الذكية' : '4. Budgets & Spending Ceilings',
                      desc: currentLang === 'ar'
                        ? 'تحديد سقوف إنفاق ذكية للفئات ومراقبة الفائض والإنفاق التراكمي ونسب الاستهلاك لترشيد المصروفات وتفادي تجاوز الميزانية.'
                        : 'Set category spending limits, track headroom in real-time, and monitor utilization rates to enforce disciplined financial planning.'
                    },
                    {
                      icon: Handshake,
                      title: currentLang === 'ar' ? '5. إدارة الديون والالتزامات والمطالبات' : '5. Debt & Liability Governance',
                      desc: currentLang === 'ar'
                        ? 'متابعة ما لك وما عليك، التسويات الجزئية، توثيق فروقات العملات، وتوليد رسائل تذكير ومطالبات بـ 7 نبرات احترافية ومشاركتها عبر واتساب و SMS.'
                        : 'Manage receivables and payables with partial settlement logs, currency peg notes, and automated multi-tone reminder notices via WhatsApp & SMS.'
                    },
                    {
                      icon: Clock,
                      title: currentLang === 'ar' ? '6. العمليات والاشتراكات المجدولة' : '6. Recurring Rules & Subscriptions',
                      desc: currentLang === 'ar'
                        ? 'أتمتة الفواتير الدورية، الرواتب المتكررة، والاشتراكات الشهرية والسنوية مع تنبيهات مسبقة قبل موعد التجديد والاستحقاق.'
                        : 'Automate repetitive expenses, salaries, and recurring bill commitments with advance renewal notifications.'
                    },
                    {
                      icon: FileSpreadsheet,
                      title: currentLang === 'ar' ? '7. التقارير والتوثيق المالي المعتمد' : '7. Publication-Grade Reports & Export',
                      desc: currentLang === 'ar'
                        ? 'طباعة وتصدير كشوف حسابات رسمية ومستندات PDF مالية مطابقة للمعايير المصرفية، مع إمكانية التصدير والاستيراد لملفات Excel و CSV.'
                        : 'Generate publication-grade PDF financial statements, transaction audit sheets, and seamless CSV/Excel data interchange.'
                    },
                    {
                      icon: HardDriveDownload,
                      title: currentLang === 'ar' ? '8. النسخ الاحتياطي المشفر والاستعادة' : '8. Encrypted Vault & Recovery',
                      desc: currentLang === 'ar'
                        ? 'تصدير واستيراد نسخ احتياطية مشفرة بكلمة مرور مع فحص تكامل البيانات (SHA-256 Checksum) وسلة مهملات لاستعادة الحركات المحذوفة.'
                        : 'Export and restore password-encrypted backups verified by SHA-256 checksums and referential integrity protection with an offline trash recycler.'
                    }
                  ].map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <div 
                        key={idx}
                        className="p-5 rounded-2xl bg-[#0E1319] border border-white/[0.06] hover:border-[#D9B978]/30 transition-all duration-200 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#080B0E] border border-white/10 flex items-center justify-center text-[#D9B978] shrink-0">
                            <Icon size={20} />
                          </div>
                          <h5 className="text-sm font-black text-[#F4F1EA]">{p.title}</h5>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-normal">{p.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Version & Build Signature */}
              <div className="p-4 rounded-2xl bg-[#0E1319]/80 border border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-start">
                <div>
                  <div className="text-xs font-black text-[#D9B978]">THARI Financial Core — v1.2.0 (Build 2026)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {currentLang === 'ar' ? 'نظام مالي سيادي عالي الدقة ومستقل تماماً' : 'Sovereign High-Precision Offline Financial Architecture'}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-[#080B0E] px-2.5 py-1 rounded-lg border border-white/5">
                  SHA-256 SECURED
                </div>
              </div>
            </motion.div>
          ) : (
            /* ══════════════════════════════════════════════════════════
               TAB 2: LEGAL PRIVACY & DATA SOVEREIGNTY (COMPREHENSIVE)
            ══════════════════════════════════════════════════════════ */
            <motion.div
              key="privacy-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Sovereign Privacy Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#11161D] to-[#0A0D12] border border-[#D9B978]/30 shadow-2xl text-center space-y-3 relative overflow-hidden">
                <div className="w-14 h-14 bg-[#D9B978]/10 border border-[#D9B978]/30 rounded-2xl flex items-center justify-center mx-auto text-[#D9B978] shadow-inner">
                  <ShieldCheck size={30} strokeWidth={2.2} />
                </div>
                
                <div className="space-y-1.5 max-w-xl mx-auto">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#D9B978]">
                    {currentLang === 'ar' ? 'المعايير القانونية والسيادية' : 'Legal & Sovereign Standards'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#F4F1EA] tracking-tight">
                    {currentLang === 'ar' ? 'وثيقة الخصوصية وأمان السجلات المالية' : 'Privacy Policy & Financial Data Protection'}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {currentLang === 'ar' ? 'سارية المفعول ومتوافقة بالكامل مع لوائح متاجر التطبيقات وسياسات أمان البيانات العالمية' : 'Fully Compliant with Apple App Store Guidelines, Google Play Data Safety & Global Privacy Laws'}
                  </p>
                </div>
              </div>

              {/* 5 Core Legal Articles */}
              <div className="space-y-4">
                {[
                  {
                    icon: Database,
                    num: '01',
                    title: currentLang === 'ar' ? 'التخزين المحلي المشفر وانعدام الخوادم الخارجية' : 'Local-First Encrypted Sandbox & Zero Cloud Servers',
                    body: currentLang === 'ar'
                      ? 'لا يمتلك تطبيق «ثري» أي خوادم سحابية لجمع أو استقبال أو معالجة أو فحص معاملاتك أو أرصدتك أو أرقام حساباتك. جميع البيانات التي تُدخلها (المحافظ، الحركات المالية، الديون، والميزانيات) تُحفظ مشفرة حصرياً داخل المساحة المعزولة (Sandbox) لجهازك. لا يمكن لأي طرف خارجي أو لمطوري التطبيق الوصول إلى سجلاتك المالية إطلاقاً.'
                      : 'THARI does not operate, utilize, or host remote cloud servers to store, process, or inspect your financial transactions, account balances, budgets, or debt ledgers. All data entered resides strictly in your device’s isolated local sandbox storage. It is technically impossible for the developers or any third party to access your records.'
                  },
                  {
                    icon: Fingerprint,
                    num: '02',
                    title: currentLang === 'ar' ? 'الحماية البايومترية ومعالج أمان الجهاز' : 'Biometric Security & Hardware Secure Enclave',
                    body: currentLang === 'ar'
                      ? 'عند تفعيل القفل بالبصمة (Face ID أو Touch ID أو بصمة أندرويد)، تتم المصادقة بالكامل عبر معالج الأمان المباشر لنظام هاتفك (Apple Secure Enclave / Android KeyStore). لا يستلم التطبيق أي بيانات حيوية خام، بل يتلقى فقط إشعاراً برمجياً مشفراً بنجاح المصادقة.'
                      : 'When biometric lock is activated (Face ID, Touch ID, or Android Biometrics), authentication is performed natively by your operating system’s hardware security enclave. THARI never receives or stores raw biometric data.'
                  },
                  {
                    icon: EyeOff,
                    num: '03',
                    title: currentLang === 'ar' ? 'انعدام التتبع والإعلانات التجسسية' : 'Zero Behavioral Analytics & No Third-Party Ads',
                    body: currentLang === 'ar'
                      ? 'تطبيق «ثري» خالٍ تماماً من حزم التتبع السلوكي (Telemetry Trackers) وشبكات الإعلانات التتبعية. نحن لا نبيع ولا نؤجر ولا نشارك أي بيانات شخصية أو مالية مع أي جهات تسويقية أو شركات وساطة بيانات.'
                      : 'THARI contains zero behavioral tracking beacons and zero advertising SDKs. We never monetize, sell, lease, or distribute your personal or financial data to any brokers or advertisers.'
                  },
                  {
                    icon: HardDriveDownload,
                    num: '04',
                    title: currentLang === 'ar' ? 'سيادة البيانات والنسخ الاحتياطي وحرية النقل' : 'Data Portability & Encrypted Backup Ownership',
                    body: currentLang === 'ar'
                      ? 'لك كامل الحق والحرية في تصدير نسخة احتياطية مشفرة بكلمة مرورك في أي وقت، واستيرادها أو نقلها بين أجهزتك محلياً دون أي وسيط خارجي، مع إمكانية تصدير السجلات بصيغة CSV و Excel و PDF.'
                      : 'You maintain 100% sovereignty over your data. You may export password-encrypted backups, restore them across your devices offline, or export structured datasets in CSV, Excel, and PDF formats at any time.'
                  },
                  {
                    icon: Trash2,
                    num: '05',
                    title: currentLang === 'ar' ? 'حق الحذف الكامل والفوري (Apple & Google Compliant)' : 'Right to Permanent Data Purge (App Store Guideline 5.1.1)',
                    body: currentLang === 'ar'
                      ? 'يمكنك في أي لحظة مسح كافة السجلات والعملات والمحافظ نهائياً بضغطة واحدة من شاشة الإعدادات عبر خيار (مسح كافة البيانات)، كما أن إلغاء تثبيت التطبيق من جهازك يمسح كافة السجلات المشفرة دون ترك أي أثر.'
                      : 'In strict compliance with Apple App Store Guideline 5.1.1 and Google Play Data Safety policies, you can permanently erase all transactions, wallets, and ledgers in one click via Settings > Clear Data, or simply by uninstalling the app.'
                  }
                ].map((art, idx) => {
                  const Icon = art.icon;
                  return (
                    <div 
                      key={idx}
                      className="p-5 sm:p-6 rounded-2xl bg-[#0E1319] border border-white/[0.06] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#080B0E] border border-white/10 flex items-center justify-center text-[#D9B978] shrink-0">
                            <Icon size={18} />
                          </div>
                          <h5 className="text-sm sm:text-base font-black text-[#F4F1EA]">
                            {art.title}
                          </h5>
                        </div>
                        <span className="text-xs font-mono font-black text-slate-400 bg-[#080B0E] px-2 py-0.5 rounded border border-white/5">
                          {art.num}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                        {art.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Official Verified Support & Contact Box */}
              <div className="p-6 rounded-3xl bg-[#0E1319] border border-[#D9B978]/30 shadow-xl space-y-4">
                <div className="flex items-center gap-3 text-[#D9B978]">
                  <div className="w-9 h-9 rounded-xl bg-[#D9B978]/15 border border-[#D9B978]/30 flex items-center justify-center text-[#D9B978] shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-sm sm:text-base text-[#F4F1EA]">
                      {currentLang === 'ar' ? 'التواصل الرسمي والدعم الفني المعتمد' : 'Official Support & Legal Inquiries'}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {currentLang === 'ar' ? 'فريق التطوير والامتثال القانوني' : 'Developer & Compliance Team'}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {currentLang === 'ar'
                    ? 'لأي استفسارات قانونية، طلبات دعم فني، أو استفسارات تتعلق بأمان وتشفير البيانات، يسعدنا تواصلكم المباشر عبر البريد الإلكتروني المعتمد:'
                    : 'For legal questions, compliance inquiries, or technical support regarding your data security, feel free to reach out directly to the developer:'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a 
                    href={`mailto:${officialEmail}?subject=THARI%20Inquiry`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9B978] text-[#080B0E] font-black text-xs sm:text-sm shadow-md hover:bg-[#c9a764] active:scale-95 transition-all min-h-[44px]"
                  >
                    <Mail size={16} />
                    <span dir="ltr">{officialEmail}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#080B0E] border border-white/10 text-slate-300 hover:text-white font-bold text-xs active:scale-95 transition-all min-h-[44px]"
                  >
                    {copiedEmail ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedEmail ? (currentLang === 'ar' ? 'تم النسخ!' : 'Copied!') : (currentLang === 'ar' ? 'نسخ البريد' : 'Copy Email')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────────────────
            3. LUXURY FOOTER SIGNATURE
        ───────────────────────────────────────────────────────────── */}
        <footer className="pt-8 pb-6 border-t border-white/[0.06] text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <span>{currentLang === 'ar' ? 'تطبيق ثَـري' : 'THARI App'}</span>
            <span>•</span>
            <span className="text-[#D9B978] font-bold">{currentLang === 'ar' ? 'سيادة مالية مطلقة' : 'Absolute Sovereign Privacy'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {currentLang === 'ar' 
              ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} — تطوير مالي عالي الدقة` 
              : `All Rights Reserved © ${new Date().getFullYear()} — Precision Financial Engineering`}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AboutAndPrivacy;
