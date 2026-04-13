import { motion as Motion } from "framer-motion";
import { pageHeaderMotion } from "../utils/motion";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <Motion.div
      className="relative mb-5 flex flex-col gap-3 border-b border-bg-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between md:mb-8 md:pb-6"
      {...pageHeaderMotion}
    >
      <Motion.div
        className="absolute bottom-[-1px] left-0 h-px w-20 bg-accent"
        style={{ transformOrigin: "left" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      />
      <div className="min-w-0">
        <div className="brand-overline mb-2">GalGro's Academy</div>
        <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-xs md:text-sm text-white/50">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </Motion.div>
  );
}
