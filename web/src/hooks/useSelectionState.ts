import { useCallback, useState } from "react";
import type { GraphContextMenuState } from "../types";

export function useSelectionState() {
  const [selectedNodeIds, setSelectedNodeIdsState] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<GraphContextMenuState | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [quickEditingNodeId, setQuickEditingNodeId] = useState<string | null>(null);
  const [pendingInspectorContentFocusNodeId, setPendingInspectorContentFocusNodeId] = useState<
    string | null
  >(null);

  const selectedNodeId = selectedNodeIds[0] ?? null;

  const setSelectedNodeId = useCallback(
    (value: string | null | ((prev: string | null) => string | null)) => {
      setSelectedNodeIdsState((previousIds) => {
        const previousId = previousIds[0] ?? null;
        const nextId = typeof value === "function" ? value(previousId) : value;
        if (previousId === nextId) {
          return previousIds;
        }
        return nextId ? [nextId] : [];
      });
    },
    []
  );

  const setSelectedNodeIds = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    setSelectedNodeIdsState((previous) => {
      const nextValue = typeof value === "function" ? value(previous) : value;
      if (areStringArraysEqual(previous, nextValue)) {
        return previous;
      }
      return nextValue;
    });
  }, []);

  return {
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedEdgeId,
    setSelectedEdgeId,
    contextMenu,
    setContextMenu,
    editingNodeId,
    setEditingNodeId,
    quickEditingNodeId,
    setQuickEditingNodeId,
    pendingInspectorContentFocusNodeId,
    setPendingInspectorContentFocusNodeId,
  };
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
