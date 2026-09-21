import React from 'react';
import { FtBrandMark } from './FtBrandMark';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  animateGlow?: boolean;
  useDollar?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  className = '',
  animateGlow = false,
  useDollar = true
}) => {
  let pixelSize = 34;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'sm': pixelSize = 28; break;
      case 'md': pixelSize = 34; break;
      case 'lg': pixelSize = 48; break;
      case 'xl': pixelSize = 64; break;
    }
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official FT Green Arrow Brand Mark */}
      <FtBrandMark
        size={pixelSize}
        showSquircle={true}
        animateGlow={animateGlow}
      />

      {/* Wordmark & Tagline */}
      {showWordmark && (
        <div className="flex flex-col justify-center select-none">
          <div className="flex items-center gap-1 font-extrabold tracking-tight leading-none text-base sm:text-lg">
            <span className="text-slate-900 dark:text-white">Friends</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-black">
              {useDollar ? (
                <>
                  Tr<span className="text-emerald-400 dark:text-emerald-300 font-black">$</span>cker
                </>
              ) : (
                'Tracker'
              )}
            </span>
          </div>
          {showTagline && (
            <span className="text-[9.5px] sm:text-[10.5px] font-bold tracking-[0.18em] text-emerald-600 dark:text-emerald-400/90 uppercase mt-0.5">
              TRACK • SHARE • GROW
            </span>
          )}
        </div>
      )}
    </div>
  );
};

