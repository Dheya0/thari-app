import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  QrCode as QrIcon, 
  ShieldCheck, 
  Calendar, 
  User, 
  Phone, 
  CreditCard, 
  FileText,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRightLeft
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Debt, DebtPayment } from '../types';
import { formatAmountToArabicWords, formatAmountToEnglishWords } from '../utils/numberToWords';
import { getLocalizedCurrency, LanguageKey } from '../utils/translations';
import { formatFinancialNumber } from '../utils/formatters';
import { NativeHaptics } from '../services/nativeServices';

interface DebtVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt;
  payment?: DebtPayment;
  language?: LanguageKey;
  userName?: string;
}

export const DebtVoucherModal: React.FC<DebtVoucherModalProps> = ({
  isOpen,
  onClose,
  debt,
  payment,
  language = 'ar',
  userName = 'مستخدم ثري'
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [voucherLang, setVoucherLang] = useState<'dual' | 'ar' | 'en'>('dual');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const isPayment = Boolean(payment);
  const voucherAmount = payment ? payment.amount : debt.amount;
  const currencyCode = debt.currency || 'SAR';
  const currLoc = getLocalizedCurrency(currencyCode, undefined, undefined, language);

  // Generate unique official voucher serial number
  const voucherId = payment 
    ? `PAY-${payment.id.slice(-6).toUpperCase()}-${payment.date.replace(/-/g, '')}`
    : `DEB-${debt.id.slice(-6).toUpperCase()}-${debt.createdAt.slice(0, 10).replace(/-/g, '')}`;

  const arabicWords = formatAmountToArabicWords(voucherAmount, currencyCode);
  const englishWords = formatAmountToEnglishWords(voucherAmount, currencyCode);

  // Is debt to me (I am creditor) or on me (I am debtor)
  const isToMe = debt.type === 'to_me';
  
  // Voucher Title Logic
  const titleAr = isPayment
    ? (isToMe ? 'سند قبض رسمي' : 'سند صرف رسمي')
    : (isToMe ? 'سند إثبات مديونية ومستحقات' : 'سند تعهد والتزام مالي');

  const titleEn = isPayment
    ? (isToMe ? 'OFFICIAL RECEIPT VOUCHER' : 'OFFICIAL PAYMENT VOUCHER')
    : (isToMe ? 'DEBT & RECEIVABLE ACKNOWLEDGEMENT' : 'PROMISSORY NOTE & LIABILITY VOUCHER');

  // Parties
  const creditorName = isToMe ? userName : debt.personName;
  const debtorName = isToMe ? debt.personName : userName;

  // Generate secure QR Code payload
  useEffect(() => {
    if (!isOpen) return;

    const qrPayload = JSON.stringify({
      app: 'Thari Financial System',
      voucher: voucherId,
      type: isPayment ? 'Payment' : 'Debt',
      amount: `${voucherAmount} ${currencyCode}`,
      creditor: creditorName,
      debtor: debtorName,
      date: payment ? payment.date : debt.createdAt.slice(0, 10),
      authHash: btoa(`${voucherId}:${voucherAmount}:${debt.id}`).slice(0, 24)
    });

    QRCode.toDataURL(qrPayload, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0A0D10',
        light: '#FFFFFF',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [isOpen, voucherId, voucherAmount, currencyCode, creditorName, debtorName, isPayment, payment, debt]);

  if (!isOpen) return null;

  // Print voucher
  const handlePrint = () => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    window.print();
  };

  // Export voucher as image
  const handleExportImage = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    NativeHaptics.impact('MEDIUM').catch(() => {});
    try {
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2.5,
        backgroundColor: '#0F1318',
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Voucher-${voucherId}.png`;
      a.click();
      NativeHaptics.notification('SUCCESS').catch(() => {});
    } catch {
      NativeHaptics.notification('ERROR').catch(() => {});
    } finally {
      setIsExporting(false);
    }
  };

  // WhatsApp share message
  const handleWhatsAppShare = () => {
    NativeHaptics.impact('LIGHT').catch(() => {});
    const dateStr = payment ? payment.date : debt.createdAt.slice(0, 10);
    const termsStr = debt.dueDate ? `📅 موعد الاستحقاق: ${debt.dueDate}` : '';
    const rateNote = debt.foreignAmount && debt.foreignCurrency 
      ? `💱 سعر الصرف المثبت: (${debt.foreignAmount} ${debt.foreignCurrency} بسعر ${debt.exchangeRate})`
      : '';

    const text = `📜 *${titleAr} - ${titleEn}*
🏛️ *نظام ثري المالي | Thari Financial*
━━━━━━━━━━━━━━━━━━
🔹 رقم السند: \`${voucherId}\`
📅 التاريخ: ${dateStr}
👤 الدائن: ${creditorName}
👤 المدين: ${debtorName}
💰 المبلغ: *${formatFinancialNumber(voucherAmount)} ${currLoc.symbol} (${currencyCode})*
📝 تفقيط: ${arabicWords}
🔤 In Words: ${englishWords}
${rateNote ? `${rateNote}\n` : ''}${termsStr ? `${termsStr}\n` : ''}━━━━━━━━━━━━━━━━━━
🔒 سند موثق إلكترونياً ومسجل رسمياً بنظام ثري`;

    const phoneClean = debt.personPhone ? debt.personPhone.replace(/[^0-9]/g, '') : '';
    const url = phoneClean 
      ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
    }, 300);
  };

  // Copy text summary
  const handleCopyText = () => {
    const text = `📜 ${titleAr} (#${voucherId})
الدائن: ${creditorName}
المدين: ${debtorName}
المبلغ: ${formatFinancialNumber(voucherAmount)} ${currencyCode}
التفقيط: ${arabicWords}
تاريخ: ${payment ? payment.date : debt.createdAt.slice(0, 10)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    NativeHaptics.notification('SUCCESS').catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#11161C] border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* Header Controls */}
          <div className="px-5 py-3.5 bg-[#0A0D10]/90 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9B978] animate-pulse" />
              <span className="font-black text-sm text-[#F4F1EA]">
                {language === 'en' ? 'Bilingual Financial Voucher' : 'السند المالي الرسمي الموثق'}
              </span>
            </div>

            {/* Language switch inside voucher */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setVoucherLang('dual')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${voucherLang === 'dual' ? 'bg-[#D9B978] text-[#0A0D10] font-black' : 'text-slate-400 hover:text-white'}`}
              >
                ثنائي (AR/EN)
              </button>
              <button
                type="button"
                onClick={() => setVoucherLang('ar')}
                className={`px-2 py-1 rounded-lg transition-colors ${voucherLang === 'ar' ? 'bg-[#D9B978] text-[#0A0D10] font-black' : 'text-slate-400 hover:text-white'}`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setVoucherLang('en')}
                className={`px-2 py-1 rounded-lg transition-colors ${voucherLang === 'en' ? 'bg-[#D9B978] text-[#0A0D10] font-black' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Printable Voucher Body */}
          <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar flex-1">
            <div
              ref={printAreaRef}
              id="thari-official-voucher"
              className="bg-[#0B0F14] border-2 border-[#D9B978]/40 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden text-[#F4F1EA]"
            >
              {/* Luxury Watermark & Background Decor */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#D9B978]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Voucher Top Brand Header */}
              <div className="border-b border-white/10 pb-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D9B978] via-[#c9a764] to-[#997328] text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-[#D9B978]/20 border border-white/20">
                    ث
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-[#F4F1EA] tracking-wide flex items-center gap-1.5">
                      <span>ثري للإدارة المالية والائتمان</span>
                      <span className="text-xs text-[#D9B978] font-normal font-mono">| THARI</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Bilingual Verified Financial Ledger & Credit Records
                    </p>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="inline-block px-3 py-1 bg-[#D9B978]/15 border border-[#D9B978]/30 rounded-xl text-[#D9B978] text-xs font-black">
                    № {voucherId}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {payment ? payment.date : debt.createdAt.slice(0, 10)}
                  </p>
                </div>
              </div>

              {/* Voucher Title Badge */}
              <div className="text-center my-3 bg-[#11161C] border border-[#D9B978]/30 py-2 px-4 rounded-2xl shadow-inner">
                {(voucherLang === 'dual' || voucherLang === 'ar') && (
                  <h4 className="text-sm sm:text-base font-black text-[#D9B978] tracking-wide">
                    {titleAr}
                  </h4>
                )}
                {(voucherLang === 'dual' || voucherLang === 'en') && (
                  <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase mt-0.5 font-sans">
                    {titleEn}
                  </p>
                )}
              </div>

              {/* Main Financial Figure Banner */}
              <div className="my-4 bg-gradient-to-r from-[#D9B978]/15 via-[#171D24] to-[#D9B978]/15 border border-[#D9B978]/35 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  {voucherLang === 'en' ? 'Amount Received / Payable' : 'المبلغ المعتمد في السند'}
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#F4F1EA] tracking-tight font-mono flex items-center justify-center gap-2">
                  <span>{formatFinancialNumber(voucherAmount)}</span>
                  <span className="text-lg sm:text-xl text-[#D9B978]">{currLoc.symbol}</span>
                  <span className="text-xs text-slate-400 font-normal">({currencyCode})</span>
                </div>

                {/* Tafqeet in Arabic Words */}
                {(voucherLang === 'dual' || voucherLang === 'ar') && (
                  <p className="text-xs font-black text-[#D9B978] mt-2 leading-relaxed bg-[#0A0D10]/60 py-1.5 px-3 rounded-xl border border-white/5">
                    {arabicWords}
                  </p>
                )}

                {/* Tafqeet in English Words */}
                {(voucherLang === 'dual' || voucherLang === 'en') && (
                  <p className="text-[11px] font-bold text-slate-300 mt-1 leading-relaxed italic">
                    "{englishWords}"
                  </p>
                )}
              </div>

              {/* Parties Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 text-xs font-bold">
                {/* Creditor */}
                <div className="bg-[#11161C] p-3.5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-normal">
                    {voucherLang === 'en' ? 'Creditor / Received By:' : 'الدائن / الطرف المستحق:'}
                  </span>
                  <p className="text-sm font-black text-[#F4F1EA] flex items-center gap-1.5">
                    <User size={14} className="text-emerald-400" />
                    <span>{creditorName}</span>
                  </p>
                </div>

                {/* Debtor */}
                <div className="bg-[#11161C] p-3.5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-normal">
                    {voucherLang === 'en' ? 'Debtor / Payer:' : 'المدين / الطرف الملتزم بالسداد:'}
                  </span>
                  <p className="text-sm font-black text-[#F4F1EA] flex items-center gap-1.5">
                    <User size={14} className="text-amber-400" />
                    <span>{debtorName}</span>
                  </p>
                  {debt.personPhone && (
                    <span className="text-[10px] text-slate-400 block dir-ltr font-mono">
                      📞 {debt.personPhone}
                    </span>
                  )}
                </div>
              </div>

              {/* Regional Payment Terms & Exchange Rate Lock */}
              <div className="space-y-2 text-xs bg-[#11161C]/80 p-3.5 rounded-2xl border border-white/5">
                {debt.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar size={13} className="text-[#D9B978]" />
                      <span>{voucherLang === 'en' ? 'Due Date & Terms:' : 'تاريخ الاستحقاق وشروط السداد:'}</span>
                    </span>
                    <span className="font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      {debt.dueDate}
                    </span>
                  </div>
                )}

                {/* Agreed Exchange Rate Lock */}
                {debt.foreignAmount && debt.foreignCurrency && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ArrowRightLeft size={13} className="text-emerald-400" />
                      <span>{voucherLang === 'en' ? 'Agreed Exchange Lock:' : 'سعر الصرف المعتمد المتفق عليه:'}</span>
                    </span>
                    <span className="font-bold text-emerald-400 dir-ltr font-mono">
                      1 {debt.foreignCurrency} = {formatFinancialNumber(debt.exchangeRate || 1)} {currencyCode}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {(debt.note || payment?.note) && (
                  <div className="border-t border-white/5 pt-2">
                    <span className="text-slate-400 block text-[10px]">
                      {voucherLang === 'en' ? 'Particulars & Notes:' : 'البيان وملاحظات المعاملة:'}
                    </span>
                    <p className="text-slate-200 font-normal mt-0.5">
                      {payment?.note || debt.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Digital Seal & QR Code Verification Footnote */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                    <ShieldCheck size={15} />
                    <span>سند معتمد وموثق رقمياً (Cryptographically Sealed)</span>
                  </div>
                  <p className="text-slate-500 text-[9px] max-w-[280px]">
                    تم إنشاء هذا السند المالي بنظام "ثري" لإدارة الثروات والديون، ويعد مرجعاً موثقاً للحقوق المالية بين الطرفين.
                  </p>
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-1 shrink-0 bg-white p-1.5 rounded-xl shadow-md">
                    <img 
                      src={qrDataUrl} 
                      alt="Verification QR" 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    />
                    <span className="text-[8px] font-mono font-bold text-slate-800">
                      SCAN TO VERIFY
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 bg-[#0A0D10] border-t border-white/10 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                title="طباعة السند"
              >
                <Printer size={15} />
                <span>طباعة</span>
              </button>

              <button
                type="button"
                onClick={handleExportImage}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="تحميل كصورة عالية الدقة"
              >
                <Download size={15} />
                <span>{isExporting ? 'جاري التحميل...' : 'حفظ كصورة'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                title="نسخ ملخص السند"
              >
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              title="مشاركة عبر واتساب"
            >
              <Share2 size={15} />
              <span>مشاركة واتساب</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
