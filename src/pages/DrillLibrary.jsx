import { useMemo, useState } from "react";
import { Search, Clock, Zap, Package, ChevronRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { DRILLS, CATEGORIES, INTENSITY } from "../data/drills";
import { useScrollLock } from "../hooks/useScrollLock";

const INT_COLORS = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Max: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function DrillLibrary() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [intensity, setIntensity] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    return DRILLS.filter((d) => {
      if (cat !== "all" && d.cat !== cat) return false;
      if (intensity !== "all" && d.int !== intensity) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.desc.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, cat, intensity]);

  const catInfo = (key) => CATEGORIES.find((c) => c.key === key);
  useScrollLock(!!selected);

  return (
    <div>
      <PageHeader
        title="Drill Library"
        subtitle={`${DRILLS.length} professional goalkeeping drills across ${CATEGORIES.length} categories`}
      />

      {/* Search + filters */}
      <div className="card p-3 md:p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search drills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
            className="input sm:w-40"
          >
            <option value="all">All intensities</option>
            {INTENSITY.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        {/* Category chips — horizontal scroll on mobile */}
        <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setCat("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap ${
              cat === "all"
                ? "bg-accent text-black"
                : "bg-bg-card2 text-white/60 hover:text-white border border-bg-border"
            }`}
          >
            All ({DRILLS.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = DRILLS.filter((d) => d.cat === c.key).length;
            const active = cat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? "bg-accent text-black"
                    : "bg-bg-card2 text-white/60 hover:text-white border border-bg-border"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <span className={`text-[10px] ${active ? "text-black/60" : "text-white/30"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drill grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((d) => {
          const info = catInfo(d.cat);
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className="card card-hover p-4 text-left group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
                  <span>{info?.icon}</span>
                  <span>{info?.label}</span>
                </div>
                <span className={`tag border ${INT_COLORS[d.int]}`}>{d.int}</span>
              </div>
              <div className="font-bold text-base mb-1.5 group-hover:text-accent transition-colors">
                {d.name}
              </div>
              <p className="text-xs text-white/50 line-clamp-2 mb-3">{d.desc}</p>
              <div className="flex items-center justify-between text-[11px] text-white/40">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {d.dur} min
                  </span>
                  {d.eq?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Package size={11} /> {d.eq.length}
                    </span>
                  )}
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center text-white/40">
          No drills match your filters.
        </div>
      )}

      {/* Drill detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] flex items-end md:items-center justify-center md:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="card w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">
              <span>{catInfo(selected.cat)?.icon}</span>
              <span>{catInfo(selected.cat)?.label}</span>
            </div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
              <span className={`tag border ${INT_COLORS[selected.int]}`}>{selected.int}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-white/60 mb-6">
              <span className="flex items-center gap-1.5"><Clock size={13} /> {selected.dur} min</span>
              <span className="flex items-center gap-1.5"><Zap size={13} /> {selected.reps}</span>
            </div>

            <Section title="Description">{selected.desc}</Section>
            <Section title="Coaching Points">{selected.cp}</Section>
            <Section title="Progressions">{selected.prog}</Section>
            <Section title="Common Mistakes">{selected.mistakes}</Section>

            {selected.eq?.length > 0 && (
              <div className="mb-4">
                <div className="label">Equipment</div>
                <div className="flex flex-wrap gap-2">
                  {selected.eq.map((e) => (
                    <span key={e} className="tag bg-bg-card2 border border-bg-border text-white/70">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="btn btn-secondary w-full mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="label">{title}</div>
      <p className="text-sm text-white/80 leading-relaxed">{children}</p>
    </div>
  );
}
