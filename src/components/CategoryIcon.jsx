const ICONS = {
  "shot-stopping": (
    <>
      <path d="M12 2.6 18 5.2v5.2c0 3.8-2.3 6.5-6 8-3.7-1.5-6-4.2-6-8V5.2L12 2.6Z" />
      <path d="M8.4 10.4h7.2M12 6.8v7.2" />
    </>
  ),
  diving: (
    <>
      <path d="M4.2 15.6c3.4-4.9 7.6-7.5 12.7-7.8" />
      <path d="M7.2 16.9c3.3 1.3 6.4 1.2 9.6-.3" />
      <path d="M6 6.8h4.7l2.7 3.2" />
      <circle cx="15.4" cy="5.7" r="1.6" />
    </>
  ),
  reflexes: (
    <>
      <path d="m12.8 2.8-6.2 8h5.1l-1 7.9 6.7-9h-5.1l.5-6.9Z" />
      <path d="M4 5.9 2.6 4.5M20 19.5l-1.4-1.4M4 18.1l-1.4 1.4M20 4.5l-1.4 1.4" />
    </>
  ),
  footwork: (
    <>
      <path d="M7 5.3h3.3v5.5H7z" />
      <path d="M13.7 13.2H17v5.5h-3.3z" />
      <path d="M7 15.4h3.3M13.7 8.6H17M11.8 6.6h.1M12.1 17.2h.1" />
    </>
  ),
  positioning: (
    <>
      <path d="M4 18V6h16v12" />
      <path d="M7.5 18v-5.2h9V18M12 6v6.8M4 11h16" />
      <circle cx="12" cy="12.8" r="1.6" />
    </>
  ),
  distribution: (
    <>
      <path d="M4 16.2 20 5.2l-5.3 14.1-3.2-5-5.2-1.2Z" />
      <path d="m11.5 14.3 3.2-3.4" />
    </>
  ),
  crosses: (
    <>
      <path d="M5 18c2.8-7.7 7.7-11.8 14.6-12.2" />
      <path d="M15.3 4.1h4.5v4.5" />
      <path d="M5.2 9.4h5.2v8.3H5.2z" />
    </>
  ),
  "1v1": (
    <>
      <path d="M5.5 17.5c1.4-3.2 3.6-4.9 6.5-4.9s5.1 1.7 6.5 4.9" />
      <circle cx="12" cy="8.4" r="2.6" />
      <path d="M4 4.8h4M16 4.8h4M3.4 19.4h17.2" />
    </>
  ),
  "set-pieces": (
    <>
      <path d="M6 20V4" />
      <path d="M6 4h10.5l-1.9 3 1.9 3H6" />
      <circle cx="15.5" cy="16.2" r="2.8" />
      <path d="M14.1 13.8 17 18.4M12.8 16.2h5.4" />
    </>
  ),
  communication: (
    <>
      <path d="M4.5 12.8V7.4h4.2l6.2-3.1v11.6l-6.2-3.1H4.5Z" />
      <path d="M17.4 8.2c.8.9.8 2.4 0 3.4M19.7 6.1c1.9 2.3 1.9 5.7 0 8" />
      <path d="M7.2 12.8 8.5 18" />
    </>
  ),
  physical: (
    <>
      <path d="M4.5 14.8h15" />
      <path d="M6.4 11.6v6.4M17.6 11.6v6.4M9 9.8v10M15 9.8v10" />
      <path d="M10.3 7.5h3.4" />
    </>
  ),
  mental: (
    <>
      <path d="M8.2 17.6c-2.4-.8-3.7-2.7-3.7-5.4 0-3.1 2.4-5.4 5.1-5.1.7-1.8 2.3-2.8 4.1-2.5 2 .3 3.4 1.9 3.5 3.8 1.7.6 2.7 2 2.7 3.8 0 2.8-2 4.8-4.9 4.9" />
      <path d="M9.8 9.3c1.5.6 2.3 1.7 2.3 3.2v6.8M14.9 10.8c-1.8.7-2.8 2-2.8 3.9" />
    </>
  ),
  recovery: (
    <>
      <path d="M5.8 11a6.4 6.4 0 0 1 10.8-4.7L19 8.7" />
      <path d="M19 4.6v4.1h-4.1" />
      <path d="M18.2 13a6.4 6.4 0 0 1-10.8 4.7L5 15.3" />
      <path d="M5 19.4v-4.1h4.1" />
    </>
  ),
};

export default function CategoryIcon({ category, size = 14, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[category] ?? ICONS.positioning}
    </svg>
  );
}
