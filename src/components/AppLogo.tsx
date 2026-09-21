import React, { useState } from 'react';

export const OFFICIAL_APP_LOGO_URL = 'https://cdn.phototourl.com/free/2026-09-21-6c1d255c-93c1-45f7-89af-bfceae4a0ece.png';

export interface AppLogoProps {
  /** Size in pixels (e.g. 40, 180) or CSS string */
  size?: number | string;
  /** Additional wrapper classes */
  className?: string;
  /** Image class name */
  imgClassName?: string;
  /** Whether to show ambient glowing backdrop */
  glow?: boolean;
  /** Accessible alt text */
  alt?: string;
  /** Priority loading flag */
  priority?: boolean;
  /** On click handler */
  onClick?: () => void;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 40,
  className = '',
  imgClassName = '',
  glow = false,
  alt = 'Friends Tr$cker Official Logo',
  onClick,
}) => {
  const [imgSrc, setImgSrc] = useState<string>(OFFICIAL_APP_LOGO_URL);
  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Optional ambient soft glow */}
      {glow && (
        <div 
          className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl scale-110 pointer-events-none -z-10" 
          aria-hidden="true" 
        />
      )}

      {/* Official Single Source of Truth Brand Asset */}
      <img
        src={imgSrc}
        onError={() => {
          if (imgSrc !== '/assets/friends-tracker-logo.png') {
            setImgSrc('/assets/friends-tracker-logo.png');
          }
        }}
        alt={alt}
        className={`w-full h-full object-contain rounded-2xl shadow-sm select-none pointer-events-none transition-transform duration-200 ${imgClassName}`}
        style={{
          aspectRatio: '1/1',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );
};

export default AppLogo;

