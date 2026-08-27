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
        <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16191E] border border-[#D4C19C]/30 text-[#E8D7B8] text-[11px] font-medium tracking-wide shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4C19C]/80 inline-block"></span>
          <span>{hashtag}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="relative select-none shrink-0" style={{ width: size, height: size }}>
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_2px_12px_rgba(212,193,156,0.12)]"
          >
            <defs>
              {/* Matte Velvet Background */}
              <linearGradient id="logo-matte-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#16191E" />
                <stop offset="60%" stopColor="#0D0F12" />
                <stop offset="100%" stopColor="#07080A" />
              </linearGradient>

              {/* Satin Champagne Gold */}
              <linearGradient id="logo-satin" x1="20%" y1="15%" x2="80%" y2="85%">
                <stop offset="0%" stopColor="#F7EEDF" />
                <stop offset="35%" stopColor="#E5D6BD" />
                <stop offset="70%" stopColor="#CBB794" />
                <stop offset="100%" stopColor="#A89470" />
              </linearGradient>

              {/* Soft Pearls */}
              <linearGradient id="logo-pearl" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAF3E8" />
                <stop offset="100%" stopColor="#D6C4A6" />
              </linearGradient>
            </defs>

            {/* Container Rounded Card with Fine Hairline */}
            <rect x="3.5" y="3.5" width="93" height="93" rx="23" fill="url(#logo-matte-bg)" stroke="#E5D6BD" strokeWidth="0.8" strokeOpacity="0.28" />
            <rect x="5" y="5" width="90" height="90" rx="21.5" stroke="#E5D6BD" strokeWidth="0.4" strokeOpacity="0.08" />

            {/* 3 Pearls of "ث" & Crown of Wealth */}
            <circle cx="50" cy="27.5" r="3.8" fill="url(#logo-pearl)" />
            <circle cx="38.5" cy="37.5" r="3.8" fill="url(#logo-pearl)" />
            <circle cx="61.5" cy="37.5" r="3.8" fill="url(#logo-pearl)" />

            {/* Central Pillar of "T" / Stature of Wealth */}
            <rect x="48.5" y="37" width="3" height="29" rx="1.5" fill="url(#logo-satin)" opacity="0.9" />

            {/* Classic Arch - Subtle Depth */}
            <path 
              d="M26 48 C26 62.5, 37.2 74.2, 50 74.2 C62.8 74.2, 74 62.5, 74 48 C74 46.5, 72.5 45.8, 71.5 47 C68.2 50.8, 60.5 54, 50 54 C39.5 54, 31.8 50.8, 28.5 47 C27.5 45.8, 26 46.5, 26 48 Z" 
              fill="url(#logo-satin)" 
              opacity="0.18"
            />

            {/* Modern Classic Flowing Ribbon of "ث" */}
            <path 
              d="M72 47 C72.5 59, 63.5 71, 50 71 C36.5 71, 27.5 59, 28 47 C28.2 45, 30.8 44.5, 32 46.2 C35.2 50.8, 41.8 55, 50 55 C58.2 55, 64.8 50.8, 68 46.2 C69.2 44.5, 71.8 45, 72 47 Z" 
              fill="url(#logo-satin)"
            />

            {/* Interlocking Balance Circle */}
            <circle cx="50" cy="51" r="16" stroke="url(#logo-satin)" strokeWidth="0.5" strokeDasharray="1.2 1.8" opacity="0.35" />

            {/* Base Foundation Plinth */}
            <rect x="42" y="69" width="16" height="1" rx="0.5" fill="url(#logo-satin)" opacity="0.6" />
          </svg>
        </div>
        
        {showText && (
          <div className="flex flex-col justify-center text-start select-none">
            <span className="text-xl font-bold text-[#F7F1E6] tracking-tight leading-tight">
              ثـري
            </span>
            <span className="text-[9px] text-[#D4C19C] font-semibold tracking-[0.22em] uppercase leading-none">
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
