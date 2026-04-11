import { useMemo, useState } from "react";
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
import { DRILLS, CATEGORIES, INTENSITY } from "../data/drills";
import { useSession } from "../hooks/useSession";
import { useLocalStorage } from "../hooks/useLocalStorage";

const INT_COLORS = {
  Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  High: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Max: "bg-red-500/10 text-red-400 border-red-500/20",
};

const drillById = (id) => DRILLS.find((d) => d.id === id);
const catById = (key) => CATEGORIES.find((c) => c.key === key);
const todayISO = () => new Date().toISOString().split("T")[0];

export default function SessionBuilder() {
  const {
    session,
    setName,
    setTarget,
    addDrill,
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

  // Save session modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveDate, setSaveDate] = useState(todayISO());
  const [saveStatus, setSaveStatus] = useState("planned");

  // Templates
  const [templates, setTemplates] = useLocalStorage("galgro-templates", []);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);

  const [savedSessions, setSavedSessions] = useLocalStorage("galgro-sessions", []);
  const [toast, setToast] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filtered = useMemo(() => {
    return DRILLS.filter((d) => {
      if (cat !== "all" && d.cat !== cat) return false;
      if (intensity !== "all" && d.int !== intensity) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, cat, intensity]);

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

  const confirmSaveTemplate = () => {
    if (!templateName.trim()) { showToast("Give the template a name"); return; }
    const tmpl = {
      id: "t_" + Date.now(),
      name: templateName.trim(),
      createdAt: new Date().toISOString(),
      target: session.target,
      blocks: session.blocks.map(({ blockId: _, ...rest }) => rest), // strip blockIds
    };
    setTemplates([tmpl, ...templates]);
    setShowSaveTemplate(false);
    setTemplateName("");
    showToast(`Template "${tmpl.name}" saved`);
  };

  // Load template
  const loadTemplate = (tmpl) => {
    if (session.blocks.length > 0 && !confirm("This will replace your current session. Continue?")) return;
    clearSession();
    // Small delay to let state reset, then add blocks
    setTimeout(() => {
      setName(tmpl.name);
      setTarget(tmpl.target || 60);
      tmpl.blocks.forEach((b) => {
        const drill = drillById(b.drillId);
        if (drill) addDrill(drill);
      });
    }, 50);
    setShowLoadTemplate(false);
    showToast(`Loaded template "${tmpl.name}"`);
  };

  const deleteTemplate = (id) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  // Save session
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [players] = useLocalStorage("galgro-players", []);

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

  const confirmSave = () => {
    const saved = {
      id: "s_" + Date.now(),
      savedAt: new Date().toISOString(),
      sessionDate: saveDate,
      status: saveStatus,
      name: session.name,
      target: session.target,
      blocks: session.blocks,
      totalDuration,
      sessionNotes: "",
      playerIds: selectedPlayerIds,
    };
    setSavedSessions([saved, ...savedSessions]);
    setShowSaveModal(false);
    showToast(`Session saved for ${formatDate(saveDate)}`);
  };

  const newSession = () => {
    if (session.blocks.length > 0 && !confirm("Clear current session and start new?")) return;
    clearSession();
  };

  const formatDate = (iso) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      <PageHeader
        title="Session Builder"
        subtitle="Click a drill to preview — drag or press + to add to your session"
      >
        <div className="flex items-center gap-2">
          <button onClick={newSession} className="btn btn-secondary">
            <RotateCcw size={14} /> New
          </button>
          <button onClick={() => setShowLoadTemplate(true)} className="btn btn-secondary">
            <FolderOpen size={14} /> Templates
          </button>
          <button onClick={openSaveTemplate} className="btn btn-secondary">
            <Bookmark size={14} /> Save template
          </button>
          <button onClick={openSaveModal} className="btn btn-primary">
            <Save size={14} /> Save session
          </button>
        </div>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4">
          {/* LEFT: Library */}
          <div className="card p-4 flex flex-col max-h-[calc(100vh-180px)]">
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

            <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-bg-border">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>All ({DRILLS.length})</Chip>
              {CATEGORIES.map((c) => {
                const count = DRILLS.filter((d) => d.cat === c.key).length;
                return (
                  <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
                    <span className="mr-1">{c.icon}</span>{c.label}
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
          <div className="card p-4 flex flex-col max-h-[calc(100vh-180px)]">
            <div className="mb-3">
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
              <div className="relative h-2 bg-bg-soft rounded-full overflow-hidden">
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
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-bg-border rounded-xl p-8 text-center">
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
            <div className="card p-3 shadow-glow border-accent">
              <div className="font-semibold text-sm text-accent">{activeDrag.drill.name}</div>
              <div className="text-xs text-white/50">{activeDrag.drill.dur} min</div>
            </div>
          )}
          {activeDrag?.type === "session-block" && (
            <div className="card p-3 shadow-glow border-accent opacity-90">
              <div className="font-semibold text-sm">{drillById(activeDrag.block.drillId)?.name}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Drill preview modal */}
      {previewDrill && (
        <DrillPreviewModal
          drill={previewDrill}
          onClose={() => setPreviewDrill(null)}
          onAdd={() => { addDrill(previewDrill); setPreviewDrill(null); }}
        />
      )}

      {/* Save as template modal */}
      {showSaveTemplate && (
        <Modal title="Save as Template" onClose={() => setShowSaveTemplate(false)}>
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

      {/* Load template modal */}
      {showLoadTemplate && (
        <Modal title="Load Template" onClose={() => setShowLoadTemplate(false)}>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <BookTemplate className="mx-auto mb-3 opacity-30" size={36} />
              <p className="text-sm">No templates saved yet.</p>
              <p className="text-xs mt-1">Build a session and click "Save template".</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {templates.map((t) => (
                <div key={t.id} className="card p-3 flex items-center gap-3">
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

      {/* Save session modal */}
      {showSaveModal && (
        <Modal title="Save Session" onClose={() => setShowSaveModal(false)}>
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
                      : "border-bg-border text-white/50 hover:border-white/30"
                  }`}
                >
                  <CalendarDays size={15} /> Upcoming
                </button>
                <button
                  onClick={() => setSaveStatus("completed")}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-all ${
                    saveStatus === "completed"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-bg-border text-white/50 hover:border-white/30"
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
                            : "border-bg-border text-white/50 hover:border-white/30 hover:text-white"
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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card bg-bg-card px-4 py-3 border-accent/40 shadow-glow text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- SHARED --------------------------------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
        active ? "bg-accent text-black" : "bg-bg-card2 text-white/60 hover:text-white border border-bg-border"
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
    <div className={`card card-hover group flex items-stretch ${isDragging ? "opacity-40" : ""}`}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="px-2 flex items-center text-white/20 hover:text-accent cursor-grab active:cursor-grabbing border-r border-bg-border"
        title="Drag to session"
      >
        <GripVertical size={14} />
      </div>
      <button onClick={onPreview} className="flex-1 p-3 text-left min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
          <span>{info?.icon}</span>
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
        className="w-10 flex items-center justify-center text-accent hover:bg-accent hover:text-black transition-all border-l border-bg-border rounded-r-xl"
        title="Add to session"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/* ------------------------------ DROP ZONE -------------------------------- */
function SessionDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "session-dropzone" });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col min-h-0 transition-colors rounded-xl ${isOver ? "bg-accent/5" : ""}`}
    >
      {children}
    </div>
  );
}

/* ---------------------------- SESSION BLOCK ------------------------------ */
function SessionBlock({ block, index, onUpdate, onRemove }) {
  const drill = drillById(block.drillId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.blockId,
    data: { type: "session-block", block },
  });
  const [expanded, setExpanded] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };
  if (!drill) return null;
  const info = catById(drill.cat);

  return (
    <div ref={setNodeRef} style={style} className={`card ${isDragging ? "opacity-40 z-50" : ""}`}>
      <div className="flex items-stretch">
        <button
          {...attributes}
          {...listeners}
          className="px-2 flex items-center text-white/30 hover:text-accent cursor-grab active:cursor-grabbing border-r border-bg-border"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1 py-3 pr-3 pl-3 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
            <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center text-[10px] shrink-0">{index + 1}</span>
            <span>{info?.icon}</span>
            <span className="truncate">{info?.label}</span>
            <span className={`tag border ${INT_COLORS[drill.int]} ml-auto`}>{drill.int}</span>
          </div>
          <div className="font-semibold text-sm mb-2 truncate">{drill.name}</div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-bg-soft rounded px-2 py-1">
              <Clock size={11} className="text-accent" />
              <input
                type="number" min="1" max="60" value={block.dur}
                onChange={(e) => onUpdate(block.blockId, { dur: Number(e.target.value) || 0 })}
                className="w-10 bg-transparent text-white font-semibold focus:outline-none"
              />
              <span className="text-white/40">min</span>
            </div>
            <div className="flex items-center gap-1 bg-bg-soft rounded px-2 py-1">
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
                block.notes ? "text-accent border-accent/40" : "text-white/50 border-bg-border"
              }`}
              title="Notes"
            >
              <StickyNote size={12} />
            </button>
            <button
              onClick={() => onRemove(block.blockId)}
              className="w-7 h-7 rounded-lg border border-bg-border hover:border-red-500/40 hover:text-red-400 text-white/50 flex items-center justify-center transition-all"
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
  const info = catById(drill.cat);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">
          <span>{info?.icon}</span><span>{info?.label}</span>
        </div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-display text-2xl font-bold">{drill.name}</h2>
          <span className={`tag border ${INT_COLORS[drill.int]} shrink-0`}>{drill.int}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/60 mb-6 pb-4 border-b border-bg-border">
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
      </div>
    </div>
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
