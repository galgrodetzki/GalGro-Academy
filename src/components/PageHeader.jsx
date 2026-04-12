export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5 md:mb-8">
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-xs md:text-sm text-white/50">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
