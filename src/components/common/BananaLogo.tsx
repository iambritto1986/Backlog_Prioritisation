import React from 'react';

interface BananaLogoProps {
  className?: string;
  size?: number;
  showGlow?: boolean;
}

export const BananaLogo: React.FC<BananaLogoProps> = ({
  className = 'w-7 h-7',
  size,
  showGlow = true,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
      {showGlow && (
        <div className="absolute inset-0 bg-[#d4af37]/30 blur-md rounded-full pointer-events-none transform scale-90" />
      )}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
      >
        <defs>
          <linearGradient id="bananaGold" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#d4af37" />
            <stop offset="85%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="bananaHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Top/Main Banana Body */}
        <path
          d="M 68 14 
             C 65 14, 62 16, 61 19
             C 57 26, 53 36, 46 45
             C 38 56, 27 65, 16 71
             C 14 72, 13 75, 15 77
             C 17 79, 21 80, 24 78
             C 38 71, 52 59, 64 45
             C 74 34, 79 24, 77 17
             C 76 15, 73 14, 68 14 Z"
          fill="url(#bananaGold)"
        />

        {/* Lower Split / Crack Feature */}
        <path
          d="M 16 71
             C 24 74, 34 76, 45 74
             C 47 73, 49 71, 47 69
             C 45 67, 42 67, 39 68
             C 30 70, 21 68, 16 71 Z"
          fill="url(#bananaGold)"
        />

        {/* Stem Cap */}
        <path
          d="M 68 14
             C 69 11, 71 9, 73 8
             C 75 7, 78 8, 77 10
             C 76 12, 75 14, 74 16
             Z"
          fill="#92400e"
        />

        {/* Inner Glossy Ridge Highlight */}
        <path
          d="M 62 21
             C 55 31, 45 44, 32 57
             C 25 64, 18 69, 18 69"
          stroke="url(#bananaHighlight)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
