import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  showGlow?: boolean;
}

/**
 * TalonSync's mark — cropped/cleaned from the gold gradient logo Britto
 * generated, saved as a transparent PNG (public/talon-icon.png) rather than
 * redrawn as inline SVG paths, since the source art is a raster render (a
 * brushed-metal gradient/shadow treatment) with no vector export available.
 * Renders fine down to favicon size — verified at 64px before wiring in.
 *
 * Replaces the old BananaLogo.tsx (hand-drawn banana SVG) from the app's
 * previous name. Same prop API on purpose, so every call site just swaps
 * the import.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
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
      <img
        src="/talon-icon.png"
        alt="TalonSync"
        className="w-full h-full relative z-10 object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
      />
    </div>
  );
};
