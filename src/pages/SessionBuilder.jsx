import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useScrollLock } from "../hooks/useScrollLock";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Plus,
  GripVertical,
  Clock,
  Trash2,
  RotateCcw,
  Save,
  StickyNote,
  Coffee,
  Zap,
  Package,
  X,
  CalendarDays,
  CheckCircle2,
  Bookmark,
  BookTemplate,
  FolderOpen,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import CategoryIcon from "../components/CategoryIcon";
import TacticalField from "../components/ui/TacticalField";
import { DRILLS, CATEGORIES, INTENSITY } from "../data/drills";
import { useSession } from "../hooks/useSession";
import { useData } from "../context/DataContext";
import { catById, INT_COLORS } from "../utils/drillUtils";
import { drillCardHover, modalBackdropMotion, modalPanelMotion } from "../utils/motion";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function SessionBuilder() {
  const {
    session,
    setName,
    setTarget,
    addDrill,
    loadFromTemplate,
    removeBlock,
    updateBlock,
    reorderBlocks,
    clearSession,
  } = useSession();

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [intensity, setIntensity] = useState("all");
  const [activeDrag, setActiveDrag] = useState(null);
  const [previewDrill, setPreviewDrill] = useState(null);
  const [mobileTab, setMobileTab] = useState("library"); // "library" | "session" — only used on mobile

  // Save session modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveDate, setSaveDate] = useState(todayISO());
  const [saveStatus, setSaveStatus] = useState("planned");

  // Templates
  const { templates, addTemplate, removeTemplate, addSession, players, settings, customDrills } = useData();

  // Merge static + approved custom drills for the library panel
  const allDrills = useMemo(() => [...DRILLS, ...customDrills], [customDrills]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [toast, setToast] = useState("");

  // Apply defaultTarget from settings on fresh session
  useEffect(() => {
    if (session.blocks.length === 0 && session.target === 60 && settings.defaultTarget !== 60) {
      setTarget(settings.defaultTarget);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filtered = useMemo(() => {
    return allDrills.filter((d) => {
      if (cat !== "all" && d.cat !== cat) return false;
      if (intensity !== "all" && d.int !== intensity) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allDrills, search, cat, intensity]);

  const totalDuration = session.blocks.reduce(
    (acc, b) => acc + (Number(b.dur) || 0) + (Number(b.rest) || 0),
    0
  );
  const progress = Math.min(100, (totalDuration / session.target) * 100);
  const overTarget = totalDuration > session.target;

  const handleDragStart = (e) => setActiveDrag(e.active.data.current);

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveDrag(null);
    if (!over) return;
    if (active.data.current?.type === "library-drill") {
      if (over.id === "session-dropzone" || over.data.current?.type === "session-block") {
        addDrill(active.data.current.drill);
      }
      return;
    }
    if (active.data.current?.type === "session-block" && active.id !== over.id) {
      const oldIndex = session.blocks.findIndex((b) => b.blockId === active.id);
      const newIndex = session.blocks.findIndex((b) => b.blockId === over.id);
      if (oldIndex !== -1 && newIndex !== -1) reorderBlocks(oldIndex, newIndex);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Save as template
  const openSaveTemplate = () => {
    if (session.blocks.length === 0) { showToast("Add drills before saving a template"); return; }
    setTemplateName(session.name !== "Untitled Session" ? session.name : "");
    setShowSaveTemplate(true);
  };

  const confirmSaveTemplate = async () => {
    if (!templateName.trim()) { showToast("Give the template a name"); return; }
    const tmpl = {
      id: "t_" + Date.now(),
      name: templateName.trim(),
      created_at: new Date().toISOString(),
      target: session.target,
      blocks: session.blocks.map((block) => {
        const rest = { ...block };
        delete rest.blockId;
        return rest;
      }),
    };
    const error = await addTemplate(tmpl);
    if (error) {
      showToast(`Could not save template: ${error.message}`);
      return;
    }
    setShowSaveTemplate(false);
    setTemplateName("");
    showToast(`Template "${tmpl.name}" saved`);
  };

  const loadTemplate = (tmpl) => {
    if (session.blocks.length > 0 && !confirm("This will replace your current session. Continue?")) return;
    loadFromTemplate(tmpl);
    setShowLoadTemplate(false);
    showToast(`Loaded "${tmpl.name}"`);
  };

  const deleteTemplate = async (id) => {
    const error = await removeTemplate(id);
    if (error) showToast(`Could not delete template: ${error.message}`);
  };

  // Save session
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);

  const openSaveModal = () => {
    if (session.blocks.length === 0) { showToast("Add at least one drill before saving"); return; }
    setSaveDate(todayISO());
    setSaveStatus("planned");
    setSelectedPlayerIds([]);
    setShowSaveModal(true);
  };

  const togglePlayer = (id) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const confirmSave = async () => {
    const saved = {
      id: "s_" + Date.now(),
      sessionDate: saveDate,
      status: saveStatus,
      name: session.name,
      target: session.target,
      blocks: session.blocks,
      totalDuration,
      sessionNotes: "",
      playerIds: selectedPlayerIds,
      attendance: [],
    };
    const error = await addSession(saved);
    if (error) {
      showToast(`Could not save session: ${error.message}`);
      return;
    }
    clearSession();
    setShowSaveModal(false);
    showToast(`Session saved for ${formatDate(saveDate)}`);
  };

  const newSession = () => {
    if (session.blocks.length > 0 && !confirm("Clear current session and start new?")) return;
    clearSession();
    // Apply user's preferred default target after clearing
    if (settings.defaultTarget && settings.defaultTarget !== 60) {
      setTarget(settings.defaultTarget);
    }
  };

  const formatDate = (iso) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Session Builder"
        subtitle="Tap + on a drill to add it — or drag on desktop"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={newSession} className="btn btn-secondary" title="New session">
            <RotateCcw size={14} /> <span className="hidden sm:inline">New</span>
          </button>
          <button onClick={() => setShowLoadTemplate(true)} className="btn btn-secondary" title="Load template">
            <FolderOpen size={14} /> <span className="hidden sm:inline">Templates</span>
          </button>
          <button onClick={openSaveTemplate} className="btn btn-secondary" title="Save as template">
            <Bookmark size={14} /> <span className="hidden sm:inline">Save template</span>
          </button>
          <button onClick={openSaveModal} className="btn btn-primary">
            <Save size={14} /> <span className="hidden sm:inline">Save session</span><span className="sm:hidden">Save</span>
          </button>
        </div>
      </PageHeader>

      {/* Mobile-only tab switcher */}
      <div className="tab-rail lg:hidden">
        <button
          onClick={() => setMobileTab("library")}
          className={`tab-button ${
            mobileTab === "library" ? "tab-button-active" : "tab-button-idle"
          }`}
        >
          Drill Library
        </button>
        <button
          onClick={() => setMobileTab("session")}
          className={`tab-button relative ${
            mobileTab === "session" ? "tab-button-active" : "tab-button-idle"
          }`}
        >
          Session
          {session.blocks.length > 0 && (
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              mobileTab === "session" ? "bg-black/20 text-black" : "bg-accent/20 text-accent"
            }`}>
              {session.blocks.length}
            </span>
          )}
        </button>
      </div>

      <BuilderCockpit
        session={session}
        filteredCount={filtered.length}
        totalDrills={allDrills.length}
        totalDuration={totalDuration}
        progress={progress}
        overTarget={overTarget}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
          {/* LEFT: Library */}
          <div className={`workspace-panel flex flex-col p-3 lg:max-h-[calc(100vh-220px)] ${mobileTab === "library" ? "flex" : "hidden lg:flex"}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="quiet-label">Drill database</div>
                <div className="mt-1 text-xs text-white/45">{filtered.length} drills match the current filters.</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                <input
                  type="text"
                  placeholder="Search drills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 py-2 text-sm"
                />
              </div>
              <select
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                className="input w-32 py-2 text-sm"
              >
                <option value="all">All</option>
                {INTENSITY.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div className="flex flex-nowrap md:flex-wrap gap-1.5 mb-3 pb-3 border-b border-white/[0.07] overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
              <Chip active={cat === "all"} onClick={() => setCat("all")}>All ({allDrills.length})</Chip>
              {CATEGORIES.map((c) => {
                const count = allDrills.filter((d) => d.cat === c.key).length;
                return (
                  <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
                    <CategoryIcon category={c.key} size={11} className="mr-1" />{c.label}
                    <span className="ml-1 opacity-50">{count}</span>
                  </Chip>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filtered.map((d) => (
                <LibraryDrillCard
                  key={d.id}
                  drill={d}
                  onAdd={() => addDrill(d)}
                  onPreview={() => setPreviewDrill(d)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-white/40 text-xs py-8">No drills match your filters.</div>
              )}
            </div>
          </div>

          {/* RIGHT: Session */}
          <div className={`workspace-panel flex flex-col p-3 lg:max-h-[calc(100vh-220px)] ${mobileTab === "session" ? "flex" : "hidden lg:flex"}`}>
            <div className="mb-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="quiet-label">Session timeline</div>
                  <div className="mt-1 text-xs text-white/45">Order, load, rest, and drill notes.</div>
                </div>
                <span className={`chip ${overTarget ? "chip-danger" : "chip-success"}`}>{Math.round(progress)}%</span>
              </div>
              <input
                type="text"
                value={session.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Session name"
                className="input font-display text-lg font-bold mb-3"
              />
              <div className="flex items-center gap-3 mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 whitespace-nowrap">Target</label>
                <input
                  type="range" min="10" max="120" step="5"
                  value={session.target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="font-display text-sm font-bold text-accent w-16 text-right">{session.target} min</span>
              </div>
              <div className="relative h-2 bg-black/25 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${overTarget ? "bg-red-500" : progress >= 90 ? "bg-accent" : "bg-accent/70"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs">
                <span className={`font-semibold ${overTarget ? "text-red-400" : "text-white/70"}`}>
                  {totalDuration} / {session.target} min
                </span>
                <span className="text-white/40">{session.blocks.length} {session.blocks.length === 1 ? "drill" : "drills"}</span>
              </div>
            </div>

            <SessionDropZone>
              {session.blocks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-black/[0.1] p-8 text-center">
                  <div>
                    <Plus className="mx-auto mb-2 text-white/30" size={32} />
                    <p className="text-sm text-white/50 font-semibold">Drag drills here</p>
                    <p className="text-xs text-white/30 mt-1">or click + on any drill · or load a template</p>
                  </div>
                </div>
              ) : (
                <SortableContext items={session.blocks.map((b) => b.blockId)} strategy={verticalListSortingStrategy}>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {session.blocks.map((block, idx) => (
                      <SessionBlock
                        key={block.blockId}
                        block={block}
                        index={idx}
                        drills={allDrills}
                        onUpdate={updateBlock}
                        onRemove={removeBlock}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </SessionDropZone>
          </div>
        </div>

        <DragOverlay>
          {activeDrag?.type === "library-drill" && (
            <div className="modal-card rounded-lg p-3 border-accent">
              <div className="font-semibold text-sm text-accent">{activeDrag.drill.name}</div>
              <div className="text-xs text-white/50">{activeDrag.drill.dur} min</div>
            </div>
          )}
          {activeDrag?.type === "session-block" && (
            <div className="modal-card rounded-lg p-3 border-accent opacity-90">
              <div className="font-semibold text-sm">{allDrills.find((d) => d.id === activeDrag.block.drillId)?.name}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Drill preview modal */}
      <AnimatePresence>
        {previewDrill && (
          <DrillPreviewModal
            key="drill-preview"
            drill={previewDrill}
            onClose={() => setPreviewDrill(null)}
            onAdd={() => { addDrill(previewDrill); setPreviewDrill(null); }}
          />
        )}
      </AnimatePresence>

      {/* Save as template modal */}
      <AnimatePresence>
        {showSaveTemplate && (
          <Modal key="save-template" title="Save as Template" onClose={() => setShowSaveTemplate(false)}>
            <div className="space-y-4">
              <div>
                <label className="label">Template name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmSaveTemplate()}
                  placeholder="e.g. Rapid Fire Warmup"
                  className="input"
                  autoFocus
                />
              </div>
              <div className="text-xs text-white/40">
                {session.blocks.length} drills · {totalDuration} min total
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowSaveTemplate(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={confirmSaveTemplate} className="btn btn-primary flex-1">
                <Bookmark size={14} /> Save template
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Load template modal */}
      <AnimatePresence>
        {showLoadTemplate && (
          <Modal key="load-template" title="Load Template" onClose={() => setShowLoadTemplate(false)}>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <BookTemplate className="mx-auto mb-3 opacity-30" size={36} />
                <p className="text-sm">No templates saved yet.</p>
                <p className="text-xs mt-1">Build a session and click "Save template".</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {templates.map((t) => (
                  <div key={t.id} className="data-row p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{t.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {t.blocks.length} drills · {t.target} min target
                      </div>
                    </div>
                    <button
                      onClick={() => loadTemplate(t)}
                      className="btn btn-primary py-1.5 text-xs shrink-0"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="text-white/30 hover:text-red-400 transition-colors"
                      title="Delete template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowLoadTemplate(false)} className="btn btn-secondary w-full mt-4">
              Close
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* Save session modal */}
      <AnimatePresence>
        {showSaveModal && (
          <Modal key="save-session" title="Save Session" onClose={() => setShowSaveModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="label">Session name</label>
                <input type="text" value={session.name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Session date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" size={15} />
                  <input
                    type="date"
                    value={saveDate}
                    onChange={(e) => setSaveDate(e.target.value)}
                    className="input pl-10"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
              </div>
              <div>
                <label className="label">Session type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSaveStatus("planned")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-all ${
                      saveStatus === "planned"
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/[0.09] text-white/50 hover:border-white/30"
                    }`}
                  >
                    <CalendarDays size={15} /> Upcoming
                  </button>
                  <button
                    onClick={() => setSaveStatus("completed")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-all ${
                      saveStatus === "completed"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-white/[0.09] text-white/50 hover:border-white/30"
                    }`}
                  >
                    <CheckCircle2 size={15} /> Completed
                  </button>
                </div>
              </div>
              {/* Player picker */}
              {players.length > 0 && (
                <div>
                  <label className="label">Who's attending?</label>
                  <div className="flex flex-wrap gap-2">
                    {players.map((p) => {
                      const selected = selectedPlayerIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => togglePlayer(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                            selected
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-white/[0.09] text-white/50 hover:border-white/30 hover:text-white"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black bg-white/10">
                            {p.name.charAt(0)}
                          </span>
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-white/40">
                {session.blocks.length} drills · {totalDuration} min total
                {selectedPlayerIds.length > 0 ? ` · ${selectedPlayerIds.length} player${selectedPlayerIds.length > 1 ? "s" : ""}` : ""}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={confirmSave} className="btn btn-primary flex-1">
                <Save size={14} /> Save
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {toast && (
        <div className="toast-panel">
          {toast}
        </div>
      )}
    </div>
  );
}

function BuilderCockpit({ session, filteredCount, totalDrills, totalDuration, progress, overTarget }) {
  const remaining = session.target - totalDuration;
  const planState = session.blocks.length === 0
    ? "Empty"
    : overTarget
      ? "Over target"
      : progress >= 90
        ? "Ready range"
        : "Building";

  return (
    <section className="workspace-panel grid grid-cols-1 gap-3 p-3 md:p-4 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
      <div className="space-y-2 xl:self-start">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <CockpitMetric
            label="Plan state"
            value={planState}
            detail={`${session.blocks.length} drill${session.blocks.length === 1 ? "" : "s"} selected`}
            tone={overTarget ? "danger" : progress >= 90 ? "success" : "neutral"}
          />
          <CockpitMetric
            label="Duration"
            value={`${totalDuration}m`}
            detail={remaining >= 0 ? `${remaining}m remaining` : `${Math.abs(remaining)}m over target`}
            tone={overTarget ? "danger" : "success"}
          />
          <CockpitMetric
            label="Target"
            value={`${session.target}m`}
            detail="Coach load"
            tone="info"
          />
          <CockpitMetric
            label="Library"
            value={filteredCount}
            detail={`${totalDrills} total drills`}
            tone="neutral"
          />
        </div>
        <div className="inspector-panel hidden p-4 md:block">
          <div className="quiet-label">Planning discipline</div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/48">
            Build the session as a timeline: warm-up, main load, recovery windows, then save or export once the minutes match the target.
          </p>
        </div>
      </div>
      <TacticalField
        title="Session blueprint"
        subtitle={session.blocks.length ? `${session.name} · ${Math.round(progress)}% loaded` : "Drag drills into the plan"}
        mode="builder"
        className="hidden min-h-[210px] xl:block"
      />
    </section>
  );
}

function CockpitMetric({ label, value, detail, tone = "neutral" }) {
  const toneClass = {
    success: "text-accent",
    info: "text-electric",
    danger: "text-red-300",
    neutral: "text-white",
  }[tone];

  return (
    <div className="inspector-panel p-3">
      <div className="quiet-label">{label}</div>
      <div className={`mt-2 font-display text-xl font-bold md:text-2xl ${toneClass}`}>{value}</div>
      <div className="mt-1 truncate text-[11px] text-white/40">{detail}</div>
    </div>
  );
}

/* --------------------------------- SHARED --------------------------------- */
function Modal({ title, onClose, children }) {
  useScrollLock(true);
  return (
    <Motion.div
      className="fixed inset-0 bg-black/72 backdrop-blur-md z-[55] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      {...modalBackdropMotion}
    >
      <Motion.div
        className="modal-card w-full sm:max-w-md p-5 sm:p-6 rounded-t-2xl sm:rounded-lg max-h-[92vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
        {...modalPanelMotion}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </Motion.div>
    </Motion.div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`filter-chip px-2.5 py-1 text-[11px] ${
        active ? "filter-chip-active" : "filter-chip-idle"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------- LIBRARY DRILL CARD -------------------------- */
function LibraryDrillCard({ drill, onAdd, onPreview }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${drill.id}`,
    data: { type: "library-drill", drill },
  });
  const info = catById(drill.cat);

  return (
    <Motion.div
      whileHover={isDragging ? undefined : drillCardHover}
      className={`metric-card group flex items-stretch ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="px-2 flex items-center text-white/22 hover:text-accent cursor-grab active:cursor-grabbing border-r border-white/[0.07]"
        title="Drag to session"
      >
        <GripVertical size={14} />
      </div>
      <button onClick={onPreview} className="flex-1 p-3 text-left min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
          <CategoryIcon category={drill.cat} size={11} />
          <span className="truncate">{info?.label}</span>
        </div>
        <div className="font-semibold text-sm mb-1 truncate group-hover:text-accent transition-colors">{drill.name}</div>
        <div className="flex items-center gap-2 text-[11px] text-white/50">
          <span className="flex items-center gap-1"><Clock size={10} /> {drill.dur}m</span>
          <span className={`tag border ${INT_COLORS[drill.int]}`}>{drill.int}</span>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="w-10 flex items-center justify-center text-accent hover:bg-accent hover:text-black transition-all border-l border-white/[0.07] rounded-r-lg"
        title="Add to session"
      >
        <Plus size={16} />
      </button>
    </Motion.div>
  );
}

/* ------------------------------ DROP ZONE -------------------------------- */
function SessionDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "session-dropzone" });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col min-h-0 transition-colors rounded-lg ${isOver ? "bg-accent/5" : ""}`}
    >
      {children}
    </div>
  );
}

/* ---------------------------- SESSION BLOCK ------------------------------ */
function SessionBlock({ block, index, drills, onUpdate, onRemove }) {
  const drill = drills.find((d) => d.id === block.drillId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.blockId,
    data: { type: "session-block", block },
  });
  const [expanded, setExpanded] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  if (!drill) return null;
  const info = catById(drill.cat);

  return (
    <div ref={setNodeRef} style={style} className={`data-row ${isDragging ? "opacity-40 z-50" : ""}`}>
      <div className="flex items-stretch">
        <button
          {...attributes}
          {...listeners}
          className="px-2 flex items-center text-white/30 hover:text-accent cursor-grab active:cursor-grabbing border-r border-white/[0.07]"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1 py-3 pr-3 pl-3 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
            <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center text-[10px] shrink-0">{index + 1}</span>
            <CategoryIcon category={drill.cat} size={11} />
            <span className="truncate">{info?.label}</span>
            <span className={`tag border ${INT_COLORS[drill.int]} ml-auto`}>{drill.int}</span>
          </div>
          <div className="font-semibold text-sm mb-2 truncate">{drill.name}</div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 rounded bg-black/[0.16] px-2 py-1">
              <Clock size={11} className="text-accent" />
              <input
                type="number" min="1" max="60" value={block.dur}
                onChange={(e) => onUpdate(block.blockId, { dur: Number(e.target.value) || 0 })}
                className="w-10 bg-transparent text-white font-semibold focus:outline-none"
              />
              <span className="text-white/40">min</span>
            </div>
            <div className="flex items-center gap-1 rounded bg-black/[0.16] px-2 py-1">
              <Coffee size={11} className="text-white/50" />
              <input
                type="number" min="0" max="10" value={block.rest}
                onChange={(e) => onUpdate(block.blockId, { rest: Number(e.target.value) || 0 })}
                className="w-8 bg-transparent text-white font-semibold focus:outline-none"
              />
              <span className="text-white/40">rest</span>
            </div>
            <button
              onClick={() => setExpanded((x) => !x)}
              className={`ml-auto w-7 h-7 rounded-lg border hover:border-accent/40 hover:text-accent flex items-center justify-center transition-all ${
                block.notes ? "text-accent border-accent/40" : "text-white/50 border-white/[0.09]"
              }`}
              title="Notes"
            >
              <StickyNote size={12} />
            </button>
            <button
              onClick={() => onRemove(block.blockId)}
              className="w-7 h-7 rounded-lg border border-white/[0.09] hover:border-red-500/40 hover:text-red-400 text-white/50 flex items-center justify-center transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
          {expanded && (
            <textarea
              value={block.notes}
              onChange={(e) => onUpdate(block.blockId, { notes: e.target.value })}
              placeholder="Session-specific notes for this drill..."
              className="input mt-2 text-xs min-h-[60px] resize-y"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- DRILL PREVIEW MODAL ----------------------------- */
function DrillPreviewModal({ drill, onClose, onAdd }) {
  useScrollLock(true);
  const info = catById(drill.cat);
  return (
    <Motion.div
      className="fixed inset-0 bg-black/72 backdrop-blur-md z-[55] flex items-end md:items-center justify-center md:p-4"
      onClick={onClose}
      {...modalBackdropMotion}
    >
      <Motion.div
        className="modal-card w-full md:max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-y-auto p-5 md:p-8 rounded-t-2xl md:rounded-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8"
        onClick={(e) => e.stopPropagation()}
        {...modalPanelMotion}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">
          <CategoryIcon category={drill.cat} size={13} /><span>{info?.label}</span>
        </div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-display text-2xl font-bold">{drill.name}</h2>
          <span className={`tag border ${INT_COLORS[drill.int]} shrink-0`}>{drill.int}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/60 mb-6 pb-4 border-b border-white/[0.07]">
          <span className="flex items-center gap-1.5"><Clock size={13} className="text-accent" /> {drill.dur} min</span>
          <span className="flex items-center gap-1.5"><Zap size={13} className="text-electric" /> {drill.reps}</span>
          {drill.eq?.length > 0 && (
            <span className="flex items-center gap-1.5"><Package size={13} /> {drill.eq.join(", ")}</span>
          )}
        </div>
        <ModalSection title="Description">{drill.desc}</ModalSection>
        <ModalSection title="Coaching Points">{drill.cp}</ModalSection>
        <ModalSection title="Progressions">{drill.prog}</ModalSection>
        <ModalSection title="Common Mistakes">{drill.mistakes}</ModalSection>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary flex-1">Close</button>
          <button onClick={onAdd} className="btn btn-primary flex-1"><Plus size={14} /> Add to session</button>
        </div>
      </Motion.div>
    </Motion.div>
  );
}

function ModalSection({ title, children }) {
  if (!children) return null;
  return (
    <div className="mb-4">
      <div className="label">{title}</div>
      <p className="text-sm text-white/80 leading-relaxed">{children}</p>
    </div>
  );
}
