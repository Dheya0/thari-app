import React from 'react';
import { ShieldCheck, Scale, Wallet, ChevronLeft } from 'lucide-react';
import Logo from './Logo';

interface WelcomeScreenProps {
  onAccept: () => void;
  onShowPrivacy: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAccept, onShowPrivacy }) => {
  return (
    <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] z-[200] flex flex-col justify-between p-5 sm:p-6 overflow-y-auto select-none">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#D9B978]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#8EB9A7]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm mx-auto my-auto flex flex-col items-center text-center space-y-6 py-4">
        {/* Sleek Logo & Header */}
        <div className="space-y-3 flex flex-col items-center">
          <div className="relative p-1">
            <Logo size={64} />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#F4F1EA] tracking-tight">
              مرحباً بك في <span className="text-[#D9B978]">ثري</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
              نظامك المالي الهادئ لإدارة الثروة والمحافظ وتتبع التدفقات النقدية بدقة وهدوء.
            </p>
          </div>
        </div>

        {/* Compact Modern Feature Highlights */}
        <div className="w-full space-y-2.5 text-right">
          <FeatureItem 
            icon={<ShieldCheck size={18} className="text-[#8EB9A7]" />}
            title="خصوصية وتشفير محلي"
            desc="بياناتك المالية محفوظة في جهازك بالكامل ومحمية ببصمتك الخاصة."
          />
          <FeatureItem 
            icon={<Scale size={18} className="text-[#D9B978]" />}
            title="انضباط وتدقيق مالي دقيق"
            desc="تقارير تحليلية وميزانيات وحساب الزكاة على كافة محافظك بسهولة."
          />
          <FeatureItem 
            icon={<Wallet size={18} className="text-[#759BC8]" />}
            title="محافظ متعددة وعملات"
            desc="فصل مالي سلس للراتب، المدخرات، الديون، وأسعار الصرف المتعددة."
          />
        </div>

        {/* Footer Actions */}
        <div className="w-full space-y-3 pt-2">
          <button 
            onClick={onAccept}
            className="w-full bg-[#D9B978] hover:bg-[#D9B978]/90 text-slate-950 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-[0_10px_25px_rgba(217,185,120,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            <span>البدء واستخدام التطبيق</span>
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </button>

          <p className="text-[11px] text-slate-400 text-center font-normal leading-relaxed">
            بالبدء، فإنك توافق على 
            <button 
              type="button" 
              onClick={onShowPrivacy} 
              className="text-[#D9B978] hover:text-[#D9B978]/80 font-medium mx-1 underline underline-offset-4 cursor-pointer"
            >
              سياسة الخصوصية والاستخدام
            </button> 
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex items-center gap-3 p-3.5 bg-[#171D24]/80 border border-white/[0.05] rounded-2xl shadow-sm hover:border-white/10 transition-all">
    <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="space-y-0.5 min-w-0">
      <h4 className="font-semibold text-[#F4F1EA] text-xs leading-tight">{title}</h4>
      <p className="text-[10px] text-slate-400 leading-snug font-normal line-clamp-1">{desc}</p>
    </div>
  </div>
);

export default WelcomeScreen;
