import { useId } from "react";

export function BrandGlyph({ className = "h-10 w-10", title = "GalGro's Academy" }) {
  const rawId = useId().replace(/:/g, "");
  const crestGradientId = `brand-crest-${rawId}`;
  const lineGradientId = `brand-line-${rawId}`;
  const glowId = `brand-glow-${rawId}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-labelledby={`brand-title-${rawId}`}
      className={className}
    >
      <title id={`brand-title-${rawId}`}>{title}</title>
      <defs>
        <linearGradient id={crestGradientId} x1="14" y1="8" x2="50" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00e87a" />
          <stop offset="1" stopColor="#4d8fff" />
        </linearGradient>
        <linearGradient id={lineGradientId} x1="20" y1="17" x2="44" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b0e17" stopOpacity="0.94" />
          <stop offset="1" stopColor="#111520" stopOpacity="0.74" />
        </linearGradient>
        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.91 0 0 0 0 0.48 0 0 0 0.28 0"
          />
          <feBlend in="SourceGraphic" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="12" fill="#0b0e17" />
      <rect x="1" y="1" width="62" height="62" rx="11" fill="#111520" stroke="#2a3048" strokeWidth="1.5" />
      <path d="M10 18h44M10 46h44M32 9v46" stroke="#25304a" strokeWidth="1" strokeLinecap="round" opacity="0.72" />
      <path
        d="M32 7.5 51 16v15.6c0 12.2-7.5 20.5-19 25.1-11.5-4.6-19-12.9-19-25.1V16l19-8.5Z"
        fill={`url(#${crestGradientId})`}
        filter={`url(#${glowId})`}
      />
      <path
        d="M32 12.4 46.4 18.7v12.1c0 8.7-5.5 15.3-14.4 19.3-8.9-4-14.4-10.6-14.4-19.3V18.7L32 12.4Z"
        fill={`url(#${lineGradientId})`}
      />
      <path
        d="M22.8 23.4h18.4v12.7H22.8V23.4Zm0 4.4h18.4M28.9 23.4v12.7M35.1 23.4v12.7"
        fill="none"
        stroke="#00e87a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.8 42.5c2.7-3.2 5.1-4.8 7.3-4.8 2.1 0 4.5 1.6 7.1 4.8"
        fill="none"
        stroke="#4d8fff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="31.4" r="3.6" fill="#00e87a" />
      <circle cx="32" cy="31.4" r="1.35" fill="#0b0e17" />
    </svg>
  );
}

export default function BrandMark({
  className = "",
  glyphClassName = "h-10 w-10",
  textClassName = "",
  textSize = "text-[15px]",
  showText = true,
  compact = false,
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandGlyph className={glyphClassName} />
      {showText && (
        <div className={`leading-tight ${textClassName}`}>
          <div className={`font-display ${textSize} font-bold tracking-tight text-white`}>
            GalGro's
          </div>
          {!compact && (
            <div className="mt-0.5 flex items-center gap-2">
              <span className="h-px w-5 bg-accent/70" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                Academy
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
