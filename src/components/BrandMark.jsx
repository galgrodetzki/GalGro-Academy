import { useId } from "react";

export function BrandGlyph({ className = "h-10 w-10", title = "GalGro's Academy" }) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `brand-gradient-${rawId}`;
  const glowId = `brand-glow-${rawId}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="10" y1="8" x2="55" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00e87a" />
          <stop offset="1" stopColor="#4d8fff" />
        </linearGradient>
        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.91 0 0 0 0 0.48 0 0 0 0.36 0"
          />
          <feBlend in="SourceGraphic" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="14" fill="#111520" />
      <rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#2a3048" strokeWidth="2" />
      <path
        d="M32 8 51 16v16.7c0 12.1-7.7 20.4-19 24.8-11.3-4.4-19-12.7-19-24.8V16L32 8Z"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />
      <path
        d="M21 24h22v15H21V24Zm0 5h22M28 24v15M36 24v15"
        fill="none"
        stroke="#0b0e17"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 45c3.1-3.6 5.9-5.4 8.4-5.4 2.4 0 5.1 1.8 8.1 5.4"
        fill="none"
        stroke="#0b0e17"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="32" cy="33" r="4.3" fill="#0b0e17" />
      <circle cx="32" cy="33" r="1.4" fill="#00e87a" />
    </svg>
  );
}

export default function BrandMark({
  className = "",
  glyphClassName = "h-10 w-10",
  textClassName = "",
  textSize = "text-[15px]",
  showText = true,
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandGlyph className={glyphClassName} />
      {showText && (
        <div className={`leading-tight ${textClassName}`}>
          <div className={`font-display ${textSize} font-bold tracking-tight bg-gradient-to-br from-accent to-electric bg-clip-text text-transparent`}>
            GalGro's
          </div>
          <div className={`font-display ${textSize} font-bold -mt-0.5 text-white`}>
            Academy
          </div>
        </div>
      )}
    </div>
  );
}
