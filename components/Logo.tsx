
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  hashtag?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 48, className = "", showText = false, hashtag }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {hashtag && (
        <div className="mb-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black tracking-wide shadow-sm animate-pulse">
          <span>{hashtag}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="relative select-none" style={{ width: size, height: size }}>
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl"
          >
            <defs>
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5CB96" />
                <stop offset="50%" stopColor="#D9B978" />
                <stop offset="100%" stopColor="#B38E46" />
              </linearGradient>
              <linearGradient id="dark-glass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#182028" />
                <stop offset="100%" stopColor="#0A0D10" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* الخلفية: شكل هندسي ناعم بلون الكربون والغرافيت الفاخر */}
            <rect x="5" y="5" width="90" height="90" rx="28" fill="url(#dark-glass)" stroke="url(#gold-gradient)" strokeWidth="1.25" strokeOpacity="0.45" />

            {/* الرمز: أعمدة النمو الثلاثة (تمثل نقاط حرف الثاء + مسار التراكم المالي) */}
            {/* العمود الأيسر - بداية النمو */}
            <rect x="24" y="45" width="12" height="20" rx="6" fill="url(#gold-gradient)" filter="url(#glow)" />
            
            {/* العمود الأوسط - القمة (الثروة) */}
            <rect x="44" y="25" width="12" height="40" rx="6" fill="url(#gold-gradient)" filter="url(#glow)" />
            
            {/* العمود الأيمن - الاستدامة */}
            <rect x="64" y="35" width="12" height="30" rx="6" fill="url(#gold-gradient)" filter="url(#glow)" />

            {/* المنحنى السفلي: يمثل الوعاء الحافظ للثروة وجسم حرف الثاء */}
            <path 
              d="M 24 78 Q 50 92 76 78" 
              stroke="url(#gold-gradient)" 
              strokeWidth="5" 
              strokeLinecap="round"
              opacity="0.95"
            />
          </svg>
        </div>
        
        {showText && (
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-[#F4F1EA] tracking-tighter leading-none">
              ثـري
            </h1>
            <span className="text-[9px] text-[#D9B978] font-bold tracking-[0.3em] uppercase opacity-90 mt-1">
              THARI
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export { Logo };
export default Logo;
