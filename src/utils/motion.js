export const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
};

export const pageHeaderMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

export const heroPanelMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.04 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.08,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

export const modalBackdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.16, ease: "easeOut" },
};

export const modalPanelMotion = {
  initial: { opacity: 0, scale: 0.96, y: 18 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 18 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
};

export const drillCardHover = {
  y: -3,
  transition: { type: "spring", stiffness: 420, damping: 30 },
};

export const softCardHover = {
  y: -2,
  transition: { type: "spring", stiffness: 360, damping: 32 },
};

export const softTap = {
  scale: 0.985,
  transition: { type: "spring", stiffness: 520, damping: 32 },
};

export const navItemTap = {
  scale: 0.975,
  transition: { type: "spring", stiffness: 520, damping: 34 },
};

export const bottomNavTap = {
  scale: 0.9,
  transition: { type: "spring", stiffness: 560, damping: 32 },
};
