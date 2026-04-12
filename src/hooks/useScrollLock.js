import { useEffect } from "react";

/**
 * Locks body scroll while `active` is true.
 * Restores original overflow on cleanup (unmount or active → false).
 */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
