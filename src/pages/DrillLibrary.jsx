import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Search, Clock, Zap, Package, ChevronRight, Sparkles, Play, SearchX, Map, Maximize2, X } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CategoryIcon from "../components/CategoryIcon";
import EmptyState from "../components/ui/EmptyState";
import DrillDiagram from "../components/ui/DrillDiagram";
import TacticalField from "../components/ui/TacticalField";
import { DRILL_DIAGRAMS, getCategoryFallbackDiagram } from "../data/drillDiagrams";
import { DRILLS, CATEGORIES, INTENSITY } from "../data/drills";
import { useScrollLock } from "../hooks/useScrollLock";
import { useData } from "../context/DataContext";
import { drillCardHover, modalBackdropMotion, modalPanelMotion, staggerContainer, staggerItem } from "../utils/motion";
import { getYouTubeThumbnail, hasPlayableVideo } from "../utils/youtube";

const INT_COLORS = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Max: "bg-red-500/10 text-red-400 border-red-500/20",
};

function LibrarySignal({ label, value, accent = false }) {
  return (
    <div className="inspector-panel p-3">
      <div className="quiet-label">{label}</div>
      <div className={`mt-2 font-display text-2xl font-bold ${accent ? "text-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}

export default function DrillLibrary() {
  const { customDrills } = useData();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [intensity, setIntensity] = useState("all");
  const [selected, setSelected] = useState(null);
  const [zoomedDiagram, setZoomedDiagram] = useState(null);

  // ESC to dismiss the diagram lightbox
  useEffect(() => {
    if (!zoomedDiagram) return;
    const onKey = (e) => { if (e.key === "Escape") setZoomedDiagram(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomedDiagram]);

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
  const activeCategory = cat === "all" ? null : catInfo(cat);
  useScrollLock(!!selected || !!zoomedDiagram);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drill Library"
        subtitle={`${allDrills.length} goalkeeping drills across ${CATEGORIES.length} categories${customDrills.length > 0 ? ` · ${customDrills.length} custom` : ""}`}
      >
        <span className="chip chip-neutral">{filtered.length} visible</span>
        {customDrills.length > 0 && <span className="chip chip-success">{customDrills.length} custom</span>}
      </PageHeader>

      <section className="workspace-panel grid grid-cols-1 gap-4 p-4 md:p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between">
          <div>
            <div className="quiet-label">Library intelligence</div>
            <h2 className="mt-2 max-w-2xl font-display text-2xl font-bold text-white md:text-3xl">
              {activeCategory ? `${activeCategory.label} work, ready to plan.` : "Every drill should earn its place."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
              Filter by category, intensity, diagram, or video support, then move the best work into the builder.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <LibrarySignal label="Visible" value={filtered.length} />
            <LibrarySignal label="Categories" value={CATEGORIES.length} />
            <LibrarySignal label="Custom" value={customDrills.length} accent />
          </div>
        </div>
        <TacticalField
          title="Drill logic"
          subtitle={activeCategory ? activeCategory.label : "Search, filter, select"}
          mode="builder"
          className="hidden min-h-[230px] lg:block"
        />
      </section>

      {/* Search + filters */}
      <div className="control-surface">
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
            className={`filter-chip ${
              cat === "all"
                ? "filter-chip-active"
                : "filter-chip-idle"
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
                className={`filter-chip ${
                  active
                    ? "filter-chip-active"
                    : "filter-chip-idle"
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
      <Motion.div
        key={`${cat}-${intensity}-${search}`}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {filtered.map((d) => {
          const info = catInfo(d.cat);
          return (
            <Motion.button
              key={d.id}
              variants={staggerItem}
              whileHover={drillCardHover}
              onClick={() => setSelected(d)}
              className="metric-card group p-4 text-left"
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
              <p className="text-xs text-white/50 line-clamp-2 mb-4 leading-relaxed">{d.desc}</p>
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
                  {hasPlayableVideo(d.video) && (
                    <span
                      className="flex items-center gap-1 text-red-400/80"
                      title="Has video"
                    >
                      <Play size={11} fill="currentColor" />
                    </span>
                  )}
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
              </div>
            </Motion.button>
          );
        })}
      </Motion.div>

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
          className="fixed inset-0 bg-black/72 backdrop-blur-md z-[55] flex items-end md:items-center justify-center md:p-4"
          onClick={() => setSelected(null)}
          {...modalBackdropMotion}
        >
          <Motion.div
            className="modal-card w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
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

            {selected.video && (() => {
              const thumb = getYouTubeThumbnail(selected.video, "hq");
              return thumb ? (
                <a
                  href={selected.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block mb-5 overflow-hidden rounded-lg border border-white/[0.09] aspect-video bg-white/[0.04]"
                  title="Watch on YouTube"
                >
                  <img
                    src={thumb}
                    alt={`${selected.name} — video thumbnail`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500 text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
                      <Play size={22} fill="currentColor" className="translate-x-[1px]" />
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-3 right-3 text-[11px] font-semibold text-white/85 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-red-500/90 text-white">YouTube</span>
                    <span className="truncate">Tap to watch</span>
                  </div>
                </a>
              ) : (
                <a
                  href={selected.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-semibold"
                >
                  <Play size={16} fill="currentColor" />
                  Search on YouTube
                </a>
              );
            })()}

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
                    <span className="text-[10px] font-normal normal-case text-white/30 tracking-normal ml-auto flex items-center gap-1">
                      <Maximize2 size={10} /> tap to expand
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setZoomedDiagram(diagram)}
                    className="group relative block w-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent/50"
                    aria-label="Expand diagram"
                  >
                    <DrillDiagram diagram={diagram} />
                    <span className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-md bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 size={13} />
                    </span>
                  </button>
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
                    <span key={e} className="tag border border-white/[0.08] bg-white/[0.045] text-white/70">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="btn btn-secondary w-full justify-center mt-4"
            >
              Close
            </button>
          </Motion.div>
        </Motion.div>
        )}
      </AnimatePresence>

      {/* Diagram lightbox — sits above the detail modal */}
      <AnimatePresence>
        {zoomedDiagram && (
          <Motion.div
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-8"
            onClick={() => setZoomedDiagram(null)}
            {...modalBackdropMotion}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoomedDiagram(null); }}
              className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center justify-center w-10 h-10 rounded-full bg-bg-card2 border border-bg-border text-white/80 hover:text-white hover:bg-bg-card transition-colors"
              aria-label="Close diagram"
            >
              <X size={18} />
            </button>
            <Motion.div
              className="w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
              {...modalPanelMotion}
            >
              <DrillDiagram diagram={zoomedDiagram} />
              <div className="mt-3 text-center text-[11px] text-white/35 font-semibold tracking-wide uppercase">
                Tap anywhere or press Esc to close
              </div>
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
