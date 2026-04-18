import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Dumbbell,
  Swords,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { fetchGameDays } from "../lib/gameDays";
import PageHeader from "../components/PageHeader";

// Mentor-A3: team-wide calendar view.
// Joins training days (from `sessions.session_date`) with game days (from the
// `game_days` table added in Mentor-A1) into one monthly grid.
// Writes live in Admin → Calendar (A2); this page is read-only for everyone
// and includes a "Manage games" deep link for the head coach.

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toLocalDateKey(date) {
  // Use LOCAL year-month-day so "today" matches the user's clock.
  // session_date + game_date are stored as plain DATE in Postgres, so
  // we compare as strings.
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseLocalDateKey(key) {
  // Treat the YYYY-MM-DD as local midnight to avoid TZ drift in the grid.
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildMonthGrid(anchor) {
  // 6x7 grid of calendar cells starting from the Sunday at or before the first
  // of the month. Dates outside the current month are dimmed in the UI but
  // still rendered so the layout never jumps.
  const first = startOfMonth(anchor);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function CalendarPage({ setPage }) {
  const { isCoach } = useAuth();
  const { sessions } = useData();

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [gameDays, setGameDays] = useState([]);
  const [selectedKey, setSelectedKey] = useState(() => toLocalDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchGameDays()
      .then((rows) => {
        if (!cancelled) setGameDays(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Could not load game days.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Index sessions by session_date for O(1) cell lookups. Sessions without a
  // date (drafts) are excluded from the calendar but still show in My Sessions.
  const sessionsByDate = useMemo(() => {
    const map = new Map();
    (sessions || []).forEach((s) => {
      if (!s.sessionDate) return;
      const list = map.get(s.sessionDate) || [];
      list.push(s);
      map.set(s.sessionDate, list);
    });
    return map;
  }, [sessions]);

  const gameDaysByDate = useMemo(() => {
    const map = new Map();
    gameDays.forEach((gd) => {
      const list = map.get(gd.gameDate) || [];
      list.push(gd);
      map.set(gd.gameDate, list);
    });
    return map;
  }, [gameDays]);

  const monthCells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const todayKey = toLocalDateKey(new Date());
  const monthLabel = anchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedDate = parseLocalDateKey(selectedKey);
  const selectedSessions = sessionsByDate.get(selectedKey) || [];
  const selectedGames = gameDaysByDate.get(selectedKey) || [];

  const subtitle = isCoach
    ? "Training days pull from your scheduled sessions. Games come from Admin → Calendar."
    : "Training days and games the squad is preparing for.";

  return (
    <div>
      <PageHeader title="Team Calendar" subtitle={subtitle} />

      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-accent" />
          <h2 className="font-display font-bold text-lg">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor((prev) => addMonths(prev, -1))}
            className="p-2 rounded-lg border border-bg-border text-white/60 hover:text-white hover:border-accent/40 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setAnchor(startOfMonth(now));
              setSelectedKey(toLocalDateKey(now));
            }}
            className="px-3 py-2 rounded-lg border border-bg-border text-xs font-bold text-white/60 hover:text-accent hover:border-accent/40 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor((prev) => addMonths(prev, 1))}
            className="p-2 rounded-lg border border-bg-border text-white/60 hover:text-white hover:border-accent/40 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-3 mb-4 border-red-500/30 bg-red-500/5 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="card p-3 md:p-4 border border-bg-border mb-6">
        <div className="grid grid-cols-7 gap-1 mb-2 px-1">
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-[10px] font-bold text-white/40 uppercase tracking-wider text-center"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((cellDate) => {
            const key = toLocalDateKey(cellDate);
            const inMonth = cellDate.getMonth() === anchor.getMonth();
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const cellSessions = sessionsByDate.get(key) || [];
            const cellGames = gameDaysByDate.get(key) || [];
            const hasContent = cellSessions.length > 0 || cellGames.length > 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={`relative aspect-square sm:aspect-[4/3] flex flex-col items-start p-1.5 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : isToday
                      ? "border-accent/40 bg-accent/5"
                      : hasContent
                        ? "border-bg-border bg-bg-soft hover:border-accent/30"
                        : "border-bg-border/50 hover:border-bg-border"
                } ${inMonth ? "" : "opacity-35"}`}
              >
                <span
                  className={`text-[11px] sm:text-xs font-bold ${
                    isToday ? "text-accent" : "text-white/70"
                  }`}
                >
                  {cellDate.getDate()}
                </span>
                {hasContent && (
                  <div className="flex flex-wrap gap-0.5 mt-auto w-full">
                    {cellGames.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-300 bg-red-500/15 border border-red-500/25 px-1 py-[1px] rounded">
                        <Swords size={8} />
                        {cellGames.length > 1 ? `${cellGames.length}` : "GAME"}
                      </span>
                    )}
                    {cellSessions.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-accent bg-accent/15 border border-accent/25 px-1 py-[1px] rounded">
                        <Dumbbell size={8} />
                        {cellSessions.length > 1 ? `${cellSessions.length}` : "TRAIN"}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected-day detail */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
            Selected day
          </div>
          <h3 className="font-display font-bold text-lg">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
        </div>
        {isCoach && (
          <button
            type="button"
            onClick={() => setPage && setPage("admin")}
            className="text-xs font-semibold text-white/50 hover:text-accent transition-colors flex items-center gap-1"
          >
            Manage games
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      {loading && selectedGames.length === 0 && selectedSessions.length === 0 ? (
        <div className="card p-5 border border-dashed border-bg-border text-center text-xs text-white/40">
          Loading schedule…
        </div>
      ) : selectedGames.length === 0 && selectedSessions.length === 0 ? (
        <div className="card p-5 border border-dashed border-bg-border text-center text-xs text-white/40">
          Nothing on this day — pick another date above.
        </div>
      ) : (
        <div className="space-y-2">
          {selectedGames.map((gd) => (
            <div
              key={gd.id}
              className="card p-4 flex items-start gap-3 border border-red-500/25 bg-red-500/5"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Swords size={15} className="text-red-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-red-300/80 uppercase tracking-wider">
                  Game day
                </div>
                <div className="text-sm font-bold">vs {gd.opponent}</div>
                {gd.notes && (
                  <p className="text-xs text-white/60 mt-1 whitespace-pre-wrap">
                    {gd.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
          {selectedSessions.map((s) => (
            <div
              key={s.id}
              className="card p-4 flex items-start gap-3 border border-accent/25 bg-accent/5"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={15} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-accent/80 uppercase tracking-wider">
                  Training session
                </div>
                <div className="text-sm font-bold truncate">{s.name}</div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  {s.totalDuration ? `${s.totalDuration} min` : "Duration not set"}
                  {s.target ? ` · Target: ${s.target}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
