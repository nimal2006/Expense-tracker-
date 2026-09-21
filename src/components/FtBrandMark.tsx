import React from 'react';

export interface FtBrandMarkProps {
  className?: string;
  size?: number | string;
  showSquircle?: boolean;
  animateGlow?: boolean;
}

export const FtBrandMark: React.FC<FtBrandMarkProps> = ({
  className = '',
  size = 36,
  showSquircle = true,
  animateGlow = false,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`relative flex items-center justify-center select-none shrink-0 ${
        showSquircle
          ? 'rounded-2xl bg-gradient-to-b from-[#253d7d] via-[#1c2e63] to-[#131f45] border border-blue-400/20 shadow-md shadow-[#0f1b3d]/50'
          : ''
      } ${animateGlow ? 'ring-2 ring-emerald-400/40 shadow-emerald-500/20 shadow-lg' : ''} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[82%] h-[82%] select-none overflow-visible"
        aria-label="Friends Tr$cker Brand Icon"
      >
        <defs>
          {/* Vibrant Emerald to Lime Green Gradient */}
          <linearGradient id="ftMainGreen" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#4ADE80" />
          </linearGradient>

          {/* Accent Bright Highlight Gradient */}
          <linearGradient id="ftArrowGrad" x1="20%" y1="80%" x2="90%" y2="10%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="70%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </linearGradient>

          {/* Depth / Shadow Gradient */}
          <linearGradient id="ftDarkGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* 1. Left 'F' Top Rounded Loop */}
        <path
          d="M 28 42 V 32 C 28 26.5 32.5 22 38 22 H 54 C 60 22 64.5 26.5 64.5 32.5 C 64.5 38.5 60 43 54 43 H 38"
          stroke="url(#ftMainGreen)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Left 'F' Middle Crossbar */}
        <path
          d="M 28 53 H 48"
          stroke="url(#ftMainGreen)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* 3. Left 'F' Vertical Lower Stem */}
        <path
          d="M 28 43 V 60"
          stroke="url(#ftMainGreen)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* 4. Anchor Circular Dot */}
        <circle cx="28" cy="74" r="5" fill="url(#ftMainGreen)" />

        {/* 5. 'T' Loop with Rising Ascending Ribbon to Arrow */}
        <path
          d="M 52 50 V 65 C 52 71.5 56.5 76 63 76 C 69.5 76 74 71.5 74 65 V 46 C 74 38 78 30 84 22"
          stroke="url(#ftArrowGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 6. High-Precision Stylized Arrowhead */}
        <path
          d="M 69 25 L 89 17 L 83 37 L 77 30 Z"
          fill="url(#ftArrowGrad)"
          stroke="url(#ftArrowGrad)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

