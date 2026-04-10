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
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Plus,
  X,
  GripVertical,
  Clock,
  Trash2,
  RotateCcw,
  Save,
  StickyNote,
  Coffee,
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
  const [savedSessions, setSavedSessions] = useLocalStorage(
    "galgro-sessions",
    []
  );
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
        return (
          d.name.toLowerCase().includes(q) ||
          d.desc.toLowerCase().includes(q)
        );
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

  const handleDragStart = (e) => {
    setActiveDrag(e.active.data.current);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveDrag(null);
    if (!over) return;

    // Dragging drill from library onto session drop zone
    if (active.data.current?.type === "library-drill") {
      const drill = active.data.current.drill;
      if (
        over.id === "session-dropzone" ||
        over.data.current?.type === "session-block"
      ) {
        addDrill(drill);
      }
      return;
    }

    // Reordering session blocks
    if (active.data.current?.type === "session-block") {
      if (active.id !== over.id) {
        const oldIndex = session.blocks.findIndex(
          (b) => b.blockId === active.id
        );
        const newIndex = session.blocks.findIndex(
          (b) => b.blockId === over.id
        );
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderBlocks(oldIndex, newIndex);
        }
      }
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const saveSession = () => {
    if (session.blocks.length === 0) {
      showToast("Add at least one drill before saving");
      return;
    }
    const saved = {
      id: "s_" + Date.now(),
      savedAt: new Date().toISOString(),
      name: session.name,
      target: session.target,
      blocks: session.blocks,
      totalDuration,
    };
    setSavedSessions([saved, ...savedSessions]);
    showToast(`Saved "${session.name}"`);
  };

  const newSession = () => {
    if (
      session.blocks.length > 0 &&
      !confirm("Clear current session and start new?")
    )
      return;
    clearSession();
  };

  return (
    <div>
      <PageHeader
        title="Session Builder"
        subtitle="Drag drills from the library to build your training session"
      >
        <div className="flex items-center gap-2">
          <button onClick={newSession} className="btn btn-secondary">
            <RotateCcw size={14} /> New
          </button>
          <button onClick={saveSession} className="btn btn-primary">
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
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                  size={14}
                />
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
                {INTENSITY.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-bg-border">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>
                All ({DRILLS.length})
              </Chip>
              {CATEGORIES.map((c) => {
                const count = DRILLS.filter((d) => d.cat === c.key).length;
                return (
                  <Chip
                    key={c.key}
                    active={cat === c.key}
                    onClick={() => setCat(c.key)}
                  >
                    <span className="mr-1">{c.icon}</span>
                    {c.label}
                    <span className="ml-1 opacity-50">{count}</span>
                  </Chip>
                );
              })}
            </div>

            {/* Drill list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filtered.map((d) => (
                <LibraryDrillCard key={d.id} drill={d} onAdd={() => addDrill(d)} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-white/40 text-xs py-8">
                  No drills match your filters.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Session panel */}
          <div className="card p-4 flex flex-col max-h-[calc(100vh-180px)]">
            {/* Session header */}
            <div className="mb-3">
              <input
                type="text"
                value={session.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Session name"
                className="input font-display text-lg font-bold mb-3"
              />

              {/* Target duration slider */}
              <div className="flex items-center gap-3 mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 whitespace-nowrap">
                  Target
                </label>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={session.target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="font-display text-sm font-bold text-accent w-16 text-right">
                  {session.target} min
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-bg-soft rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    overTarget
                      ? "bg-red-500"
                      : progress >= 90
                      ? "bg-accent"
                      : "bg-accent/70"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs">
                <span
                  className={`font-semibold ${
                    overTarget ? "text-red-400" : "text-white/70"
                  }`}
                >
                  {totalDuration} / {session.target} min
                </span>
                <span className="text-white/40">
                  {session.blocks.length}{" "}
                  {session.blocks.length === 1 ? "drill" : "drills"}
                </span>
              </div>
            </div>

            {/* Drop zone */}
            <SessionDropZone blocks={session.blocks}>
              {session.blocks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-bg-border rounded-xl p-8 text-center">
                  <div>
                    <Plus className="mx-auto mb-2 text-white/30" size={32} />
                    <p className="text-sm text-white/50 font-semibold">
                      Drag drills here
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      or click the + on any drill
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={session.blocks.map((b) => b.blockId)}
                  strategy={verticalListSortingStrategy}
                >
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
              <div className="font-semibold text-sm text-accent">
                {activeDrag.drill.name}
              </div>
              <div className="text-xs text-white/50">
                {activeDrag.drill.dur} min
              </div>
            </div>
          )}
          {activeDrag?.type === "session-block" && (
            <div className="card p-3 shadow-glow border-accent opacity-90">
              <div className="font-semibold text-sm">
                {drillById(activeDrag.block.drillId)?.name}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 card bg-bg-card px-4 py-3 border-accent/40 shadow-glow text-sm font-semibold animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- CHIPS --------------------------------- */
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
        active
          ? "bg-accent text-black"
          : "bg-bg-card2 text-white/60 hover:text-white border border-bg-border"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------- LIBRARY DRILL CARD -------------------------- */
function LibraryDrillCard({ drill, onAdd }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${drill.id}`,
    data: { type: "library-drill", drill },
  });
  const info = catById(drill.cat);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`card p-3 card-hover cursor-grab active:cursor-grabbing group ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
            <span>{info?.icon}</span>
            <span className="truncate">{info?.label}</span>
          </div>
          <div className="font-semibold text-sm mb-1 truncate group-hover:text-accent transition-colors">
            {drill.name}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {drill.dur}m
            </span>
            <span className={`tag border ${INT_COLORS[drill.int]}`}>
              {drill.int}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-black transition-all flex items-center justify-center shrink-0"
          title="Add to session"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ DROP ZONE -------------------------------- */
function SessionDropZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "session-dropzone",
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col min-h-0 transition-colors rounded-xl ${
        isOver ? "bg-accent/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

/* ---------------------------- SESSION BLOCK ------------------------------ */
function SessionBlock({ block, index, onUpdate, onRemove }) {
  const drill = drillById(block.drillId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.blockId,
    data: { type: "session-block", block },
  });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!drill) return null;
  const info = catById(drill.cat);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card card-hover ${isDragging ? "opacity-40 z-50" : ""}`}
    >
      <div className="flex items-stretch">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="px-2 flex items-center text-white/30 hover:text-accent cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 py-3 pr-3 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                <span>{info?.icon}</span>
                <span className="truncate">{info?.label}</span>
                <span className={`tag border ${INT_COLORS[drill.int]} ml-auto`}>
                  {drill.int}
                </span>
              </div>
              <div className="font-semibold text-sm mt-1 truncate">
                {drill.name}
              </div>
            </div>
          </div>

          {/* Inline duration + rest + actions */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            <div className="flex items-center gap-1 bg-bg-soft rounded px-2 py-1">
              <Clock size={11} className="text-accent" />
              <input
                type="number"
                min="1"
                max="60"
                value={block.dur}
                onChange={(e) =>
                  onUpdate(block.blockId, { dur: Number(e.target.value) || 0 })
                }
                className="w-10 bg-transparent text-white font-semibold focus:outline-none"
              />
              <span className="text-white/40">min</span>
            </div>
            <div className="flex items-center gap-1 bg-bg-soft rounded px-2 py-1">
              <Coffee size={11} className="text-white/50" />
              <input
                type="number"
                min="0"
                max="10"
                value={block.rest}
                onChange={(e) =>
                  onUpdate(block.blockId, {
                    rest: Number(e.target.value) || 0,
                  })
                }
                className="w-8 bg-transparent text-white font-semibold focus:outline-none"
              />
              <span className="text-white/40">rest</span>
            </div>

            <button
              onClick={() => setExpanded((x) => !x)}
              className={`ml-auto w-7 h-7 rounded-lg border border-bg-border hover:border-accent/40 hover:text-accent flex items-center justify-center transition-all ${
                block.notes ? "text-accent border-accent/40" : "text-white/50"
              }`}
              title="Notes"
            >
              <StickyNote size={12} />
            </button>
            <button
              onClick={() => onRemove(block.blockId)}
              className="w-7 h-7 rounded-lg border border-bg-border hover:border-red-500/40 hover:text-red-400 text-white/50 flex items-center justify-center transition-all"
              title="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {expanded && (
            <textarea
              value={block.notes}
              onChange={(e) =>
                onUpdate(block.blockId, { notes: e.target.value })
              }
              placeholder="Session-specific notes for this drill..."
              className="input mt-2 text-xs min-h-[60px] resize-y"
            />
          )}
        </div>
      </div>
    </div>
  );
}
