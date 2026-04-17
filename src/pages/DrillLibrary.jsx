import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Search, Clock, Zap, Package, ChevronRight, Sparkles, Play, SearchX, Map } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CategoryIcon from "../components/CategoryIcon";
import EmptyState from "../components/ui/EmptyState";
import DrillDiagram from "../components/ui/DrillDiagram";
import { DRILL_DIAGRAMS, getCategoryFallbackDiagram } from "../data/drillDiagrams";
import { DRILLS, CATEGORIES, INTENSITY } from "../data/drills";
import { useScrollLock } from "../hooks/useScrollLock";
import { useData } from "../context/DataContext";
import { drillCardHover, modalBackdropMotion, modalPanelMotion } from "../utils/motion";

const INT_COLORS = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Max: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function DrillLibrary() {
  const { customDrills } = useData();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [intensity, setIntensity] = useState("all");
  const [selected, setSelected] = useState(null);

  // Merge static + approved custom drills
  const allDrills = useMemo(() => [...DRILLS, ...customDrills], [customDrills]);

  const filtered = useMemo(() => {
    return allDrills.filter((d) => {
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
  }, [allDrills, search, cat, intensity]);

  const catInfo = (key) => CATEGORIES.find((c) => c.key === key);
  useScrollLock(!!selected);

  return (
    <div>
      <PageHeader
        title="Drill Library"
        subtitle={`${allDrills.length} goalkeeping drills across ${CATEGORIES.length} categories${customDrills.length > 0 ? ` · ${customDrills.length} custom` : ""}`}
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
            All ({allDrills.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = allDrills.filter((d) => d.cat === c.key).length;
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
                <CategoryIcon category={c.key} size={12} />
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
            <Motion.button
              key={d.id}
              whileHover={drillCardHover}
              onClick={() => setSelected(d)}
              className="card card-hover p-4 text-left group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
                  <CategoryIcon category={d.cat} size={12} />
                  <span>{info?.label}</span>
                  {d.custom && (
                    <span className="flex items-center gap-0.5 text-accent/80 normal-case tracking-normal">
                      <Sparkles size={10} /> Custom
                    </span>
                  )}
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
                  {(DRILL_DIAGRAMS[d.id] || d.custom) && (
                    <span
                      className={`flex items-center gap-1 ${DRILL_DIAGRAMS[d.id] ? "text-info" : "text-white/30"}`}
                      title={DRILL_DIAGRAMS[d.id] ? "Has setup diagram" : "Category diagram"}
                    >
                      <Map size={11} />
                    </span>
                  )}
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
              </div>
            </Motion.button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<SearchX size={28} />}
          title="No drills match your filters"
          body="Try clearing the search or picking a different category."
          action={{
            label: "Clear filters",
            onClick: () => {
              setSearch("");
              setCat("all");
              setIntensity("all");
            },
          }}
        />
      )}

      {/* Drill detail modal */}
      <AnimatePresence>
        {selected && (
        <Motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[55] flex items-end md:items-center justify-center md:p-4"
          onClick={() => setSelected(null)}
          {...modalBackdropMotion}
        >
          <Motion.div
            className="card w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
            onClick={(e) => e.stopPropagation()}
            {...modalPanelMotion}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">
              <CategoryIcon category={selected.cat} size={13} />
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

            {selected.video && (
              <a
                href={selected.video}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-semibold"
              >
                <Play size={16} fill="currentColor" />
                Watch on YouTube
              </a>
            )}

            {(() => {
              const diagram = DRILL_DIAGRAMS[selected.id]
                ?? (selected.custom ? getCategoryFallbackDiagram(selected.cat) : null);
              return diagram ? (
                <div className="mb-5">
                  <div className="label flex items-center gap-2">
                    Setup
                    {selected.custom && !DRILL_DIAGRAMS[selected.id] && (
                      <span className="text-[10px] font-normal normal-case text-white/35 tracking-normal">
                        · generic layout for this category
                      </span>
                    )}
                  </div>
                  <DrillDiagram diagram={diagram} />
                </div>
              ) : null;
            })()}

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
          </Motion.div>
        </Motion.div>
        )}
      </AnimatePresence>
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
