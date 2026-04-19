import { motion as Motion } from "framer-motion";
import { pageHeaderMotion } from "../utils/motion";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <Motion.div
      className="relative mb-5 flex flex-col gap-3 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-end sm:justify-between md:mb-7 md:pb-6"
      {...pageHeaderMotion}
    >
      <div className="min-w-0">
        <div className="brand-overline mb-2">GalGro's Academy</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-[34px] md:leading-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/50 md:text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </Motion.div>
  );
}
