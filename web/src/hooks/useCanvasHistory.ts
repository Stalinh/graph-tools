import { useCallback, useRef, useState } from "react";
import type {
  CanvasPosition,
  EdgeDirection,
  GraphData,
  GraphEdge,
  GraphNode,
  NodeSize,
} from "../types";

export type RemoveMeta = {
  removedNode: GraphNode;
  position: CanvasPosition;
  size?: NodeSize;
  removedEdges: GraphEdge[];
  affectedRefs: { ownerId: string; refId: string }[];
};

export type RemoveManyMeta = {
  nodeId: string;
  meta: RemoveMeta;
};

export type CanvasCommand =
  | {
      type: "move";
      nodeId: string;
      from: CanvasPosition;
      to: CanvasPosition;
      graphBefore?: GraphData;
      graphAfter?: GraphData;
    }
  | {
      type: "move-many";
      moves: { nodeId: string; from: CanvasPosition; to: CanvasPosition }[];
      graphBefore?: GraphData;
      graphAfter?: GraphData;
    }
  | {
      type: "add";
      nodeId: string;
      nodeData: GraphNode;
      position: CanvasPosition;
      size?: NodeSize;
    }
  | {
      type: "remove";
      nodeId: string;
      meta: RemoveMeta;
      graphBefore?: GraphData;
      graphAfter?: GraphData;
      positionsBefore?: Record<string, CanvasPosition>;
      positionsAfter?: Record<string, CanvasPosition>;
      sizesBefore?: Record<string, NodeSize>;
      sizesAfter?: Record<string, NodeSize>;
    }
  | {
      type: "remove-many";
      removals: RemoveManyMeta[];
      graphBefore?: GraphData;
      graphAfter?: GraphData;
      positionsBefore?: Record<string, CanvasPosition>;
      positionsAfter?: Record<string, CanvasPosition>;
      sizesBefore?: Record<string, NodeSize>;
      sizesAfter?: Record<string, NodeSize>;
    }
  | { type: "link"; sourceId: string; targetId: string; direction: EdgeDirection }
  | { type: "unlink"; sourceId: string; targetId: string; direction?: EdgeDirection }
  | { type: "replace-graph"; before: GraphData; after: GraphData }
  | { type: "resize"; nodeId: string; before: NodeSize | undefined; after: NodeSize };

export const MAX_HISTORY = 20;

export interface CanvasHistory {
  undoStack: CanvasCommand[];
  redoStack: CanvasCommand[];
  pushCommand: (cmd: CanvasCommand) => void;
  clear: () => void;
  popUndo: () => CanvasCommand | null;
  pushRedo: (cmd: CanvasCommand) => void;
  popRedo: () => CanvasCommand | null;
  pushUndo: (cmd: CanvasCommand) => void;
}

export function useCanvasHistory(): CanvasHistory {
  const [undoStack, setUndoStack] = useState<CanvasCommand[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasCommand[]>([]);

  const undoRef = useRef(undoStack);
  const redoRef = useRef(redoStack);
  undoRef.current = undoStack;
  redoRef.current = redoStack;

  const pushCommand = useCallback((cmd: CanvasCommand) => {
    const prev = undoRef.current;
    let next = [...prev, cmd];
    if (next.length > MAX_HISTORY) {
      next = next.slice(next.length - MAX_HISTORY);
    }
    undoRef.current = next;
    setUndoStack(next);
    redoRef.current = [];
    setRedoStack([]);
  }, []);

  const clear = useCallback(() => {
    undoRef.current = [];
    redoRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const popUndo = useCallback((): CanvasCommand | null => {
    const stack = undoRef.current;
    if (stack.length === 0) return null;
    const cmd = stack[stack.length - 1];
    const next = stack.slice(0, -1);
    undoRef.current = next;
    setUndoStack(next);
    return cmd;
  }, []);

  const pushRedo = useCallback((cmd: CanvasCommand) => {
    const prev = redoRef.current;
    const next = [...prev, cmd];
    redoRef.current = next;
    setRedoStack(next);
  }, []);

  const popRedo = useCallback((): CanvasCommand | null => {
    const stack = redoRef.current;
    if (stack.length === 0) return null;
    const cmd = stack[stack.length - 1];
    const next = stack.slice(0, -1);
    redoRef.current = next;
    setRedoStack(next);
    return cmd;
  }, []);

  const pushUndo = useCallback((cmd: CanvasCommand) => {
    const prev = undoRef.current;
    let next = [...prev, cmd];
    if (next.length > MAX_HISTORY) {
      next = next.slice(next.length - MAX_HISTORY);
    }
    undoRef.current = next;
    setUndoStack(next);
  }, []);

  return { undoStack, redoStack, pushCommand, clear, popUndo, pushRedo, popRedo, pushUndo };
}
