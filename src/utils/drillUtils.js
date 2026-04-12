import { DRILLS, CATEGORIES } from "../data/drills";

export const drillById = (id) => DRILLS.find((d) => d.id === id);
export const catById = (key) => CATEGORIES.find((c) => c.key === key);

export const INT_COLORS = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Max: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const formatDate = (iso, opts = {}) => {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
};
