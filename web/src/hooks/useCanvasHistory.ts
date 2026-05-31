import { useCallback, useRef, useState } from "react";
import type { CanvasCommand } from "./canvasHistoryTypes";

export type { CanvasCommand, RemoveManyMeta, RemoveMeta } from "./canvasHistoryTypes";

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
