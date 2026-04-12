import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "galgro-current-session";

export function makeBlockId() {
  return "b_" + Math.random().toString(36).slice(2, 10);
}

export const EMPTY_SESSION = {
  name: "Untitled Session",
  target: 60,
  blocks: [],
};

export function useSession() {
  const [session, setSession] = useLocalStorage(STORAGE_KEY, EMPTY_SESSION);

  const setName = useCallback(
    (name) => setSession((s) => ({ ...s, name })),
    [setSession]
  );

  const setTarget = useCallback(
    (target) => setSession((s) => ({ ...s, target })),
    [setSession]
  );

  // Add a drill — respects a custom duration if provided
  const addDrill = useCallback(
    (drill, overrides = {}) =>
      setSession((s) => {
        const block = {
          blockId: makeBlockId(),
          drillId: drill.id,
          dur: overrides.dur ?? drill.dur ?? 5,
          rest: overrides.rest ?? 1,
          notes: overrides.notes ?? "",
        };
        return { ...s, blocks: [...s.blocks, block] };
      }),
    [setSession]
  );

  // Load a template atomically — no race condition, preserves custom durations
  const loadFromTemplate = useCallback(
    (tmpl) => {
      const blocks = tmpl.blocks.map((b) => ({
        blockId: makeBlockId(),
        drillId: b.drillId,
        dur: b.dur ?? 5,
        rest: b.rest ?? 1,
        notes: b.notes || "",
      }));
      setSession({
        name: tmpl.name,
        target: tmpl.target || 60,
        blocks,
      });
    },
    [setSession]
  );

  const removeBlock = useCallback(
    (blockId) =>
      setSession((s) => ({
        ...s,
        blocks: s.blocks.filter((b) => b.blockId !== blockId),
      })),
    [setSession]
  );

  const updateBlock = useCallback(
    (blockId, patch) =>
      setSession((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.blockId === blockId ? { ...b, ...patch } : b
        ),
      })),
    [setSession]
  );

  const reorderBlocks = useCallback(
    (fromIndex, toIndex) =>
      setSession((s) => {
        const blocks = [...s.blocks];
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        return { ...s, blocks };
      }),
    [setSession]
  );

  const clearSession = useCallback(
    () => setSession({ ...EMPTY_SESSION }),
    [setSession]
  );

  return {
    session,
    setName,
    setTarget,
    addDrill,
    loadFromTemplate,
    removeBlock,
    updateBlock,
    reorderBlocks,
    clearSession,
  };
}
