import { useState } from "react";
import { Calendar, Clock, Trash2, Eye, Layers } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { DRILLS, CATEGORIES } from "../data/drills";

const drillById = (id) => DRILLS.find((d) => d.id === id);
const catById = (key) => CATEGORIES.find((c) => c.key === key);

export default function MySessions() {
  const [savedSessions, setSavedSessions] = useLocalStorage(
    "galgro-sessions",
    []
  );
  const [viewing, setViewing] = useState(null);

  const removeSession = (id) => {
    if (!confirm("Delete this session?")) return;
    setSavedSessions(savedSessions.filter((s) => s.id !== id));
    if (viewing?.id === id) setViewing(null);
  };

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div>
      <PageHeader
        title="My Sessions"
        subtitle={`${savedSessions.length} saved ${
          savedSessions.length === 1 ? "session" : "sessions"
        }`}
      />

      {savedSessions.length === 0 ? (
        <div className="card p-12 text-center">
          <Layers className="mx-auto text-white/20 mb-4" size={48} />
          <h3 className="font-display text-lg font-bold mb-1">
            No saved sessions yet
          </h3>
          <p className="text-sm text-white/50">
            Build a session and hit "Save session" to see it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {savedSessions.map((s) => (
            <div key={s.id} className="card card-hover p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-base truncate">
                    {s.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {fmtDate(s.savedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {s.totalDuration} min
                    </span>
                    <span>{s.blocks.length} drills</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 my-3">
                {s.blocks.slice(0, 3).map((b) => {
                  const d = drillById(b.drillId);
                  if (!d) return null;
                  return (
                    <div
                      key={b.blockId}
                      className="text-xs text-white/60 truncate"
                    >
                      • {d.name}{" "}
                      <span className="text-white/30">({b.dur}m)</span>
                    </div>
                  );
                })}
                {s.blocks.length > 3 && (
                  <div className="text-[11px] text-white/30">
                    +{s.blocks.length - 3} more
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-bg-border">
                <button
                  onClick={() => setViewing(s)}
                  className="btn btn-secondary flex-1 py-1.5 text-xs"
                >
                  <Eye size={12} /> View
                </button>
                <button
                  onClick={() => removeSession(s.id)}
                  className="btn btn-ghost px-2 py-1.5 text-xs hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl font-bold mb-1">
              {viewing.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-white/50 mb-6">
              <span>{fmtDate(viewing.savedAt)}</span>
              <span>•</span>
              <span>
                {viewing.totalDuration} / {viewing.target} min
              </span>
              <span>•</span>
              <span>{viewing.blocks.length} drills</span>
            </div>

            <div className="space-y-2 mb-4">
              {viewing.blocks.map((b, i) => {
                const d = drillById(b.drillId);
                const info = catById(d?.cat);
                if (!d) return null;
                return (
                  <div key={b.blockId} className="card p-3 bg-bg-soft">
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      <span className="bg-accent/20 text-accent rounded w-5 h-5 flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span>{info?.icon}</span>
                      <span>{info?.label}</span>
                      <span className="ml-auto">
                        {b.dur}m + {b.rest}m rest
                      </span>
                    </div>
                    <div className="font-semibold text-sm mt-1">{d.name}</div>
                    {b.notes && (
                      <p className="text-xs text-white/60 mt-2 italic">
                        {b.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setViewing(null)}
              className="btn btn-secondary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
