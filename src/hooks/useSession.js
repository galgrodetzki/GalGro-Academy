import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "galgro-current-session";

function makeId() {
  return "b_" + Math.random().toString(36).slice(2, 10);
}

const EMPTY = {
  name: "Untitled Session",
  target: 60,
  blocks: [], // { blockId, drillId, dur, rest, notes }
};

export function useSession() {
  const [session, setSession] = useLocalStorage(STORAGE_KEY, EMPTY);

  const setName = useCallback(
    (name) => setSession((s) => ({ ...s, name })),
    [setSession]
  );

  const setTarget = useCallback(
    (target) => setSession((s) => ({ ...s, target })),
    [setSession]
  );

  const addDrill = useCallback(
    (drill, index = null) =>
      setSession((s) => {
        const block = {
          blockId: makeId(),
          drillId: drill.id,
          dur: drill.dur || 5,
          rest: 1,
          notes: "",
        };
        const blocks = [...s.blocks];
        if (index === null || index >= blocks.length) blocks.push(block);
        else blocks.splice(index, 0, block);
        return { ...s, blocks };
      }),
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
    () => setSession(EMPTY),
    [setSession]
  );

  return {
    session,
    setName,
    setTarget,
    addDrill,
    removeBlock,
    updateBlock,
    reorderBlocks,
    clearSession,
  };
}
