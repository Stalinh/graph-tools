import {
  useCallback,
  useReducer,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { EMPTY_GRAPH } from '../lib/workspaceState';
import type {
  CanvasPosition,
  CanvasViewport,
  GraphContextMenuState,
  GraphData,
  NodeSize,
} from '../types';
import { createWorkspacePatchCommand } from './canvasHistoryPatch';
import {
  MAX_HISTORY,
  type CanvasCommand,
  type CanvasHistorySelectionState,
  type CanvasHistoryWorkspaceState,
} from './canvasHistoryTypes';

export type WorkspaceSelectionState = CanvasHistorySelectionState & {
  contextMenu: GraphContextMenuState | null;
};

export interface WorkspaceStatusState {
  dirty: boolean;
  status: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
}

export interface WorkspaceHistoryState {
  undoStack: CanvasCommand[];
  redoStack: CanvasCommand[];
}

export interface WorkspaceStoreState {
  graph: GraphData;
  nodePositions: Record<string, CanvasPosition>;
  nodeSizes: Record<string, NodeSize>;
  viewport: CanvasViewport | null;
  selection: WorkspaceSelectionState;
  status: WorkspaceStatusState;
  history: WorkspaceHistoryState;
}

export interface WorkspaceTransaction {
  graph?: GraphData;
  nodePositions?: Record<string, CanvasPosition>;
  nodeSizes?: Record<string, NodeSize>;
  viewport?: CanvasViewport | null;
  selection?: Partial<WorkspaceSelectionState>;
  status?: Partial<WorkspaceStatusState>;
  history?: WorkspaceHistoryTransaction;
}

type WorkspaceHistoryTransaction =
  | { type: 'push'; command: CanvasCommand }
  | { type: 'replace'; undoStack: CanvasCommand[]; redoStack: CanvasCommand[] }
  | { type: 'clear' };

export type WorkspaceTransactionInput =
  | WorkspaceTransaction
  | ((current: WorkspaceStoreState) => WorkspaceTransaction | null);

export type DispatchWorkspaceTransaction = (
  transaction: WorkspaceTransactionInput
) => WorkspaceStoreState | null;

export interface WorkspaceStoreController {
  workspace: WorkspaceStoreState;
  workspaceRef: MutableRefObject<WorkspaceStoreState>;
  dispatchWorkspaceTransaction: DispatchWorkspaceTransaction;
  setDirty: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<WorkspaceStatusState['status']>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedNodeIds: Dispatch<SetStateAction<string[]>>;
  setSelectedEdgeId: Dispatch<SetStateAction<string | null>>;
  setContextMenu: Dispatch<SetStateAction<GraphContextMenuState | null>>;
  setEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setQuickEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setPendingInspectorContentFocusNodeId: Dispatch<SetStateAction<string | null>>;
  clearHistory: () => void;
}

interface WorkspaceReducerAction {
  type: 'replace';
  state: WorkspaceStoreState;
}

const EMPTY_SELECTION: WorkspaceSelectionState = {
  selectedNodeIds: [],
  selectedEdgeId: null,
  contextMenu: null,
  editingNodeId: null,
  quickEditingNodeId: null,
  pendingInspectorContentFocusNodeId: null,
};

const EMPTY_STATUS: WorkspaceStatusState = {
  dirty: false,
  status: 'loading',
  errorMessage: null,
};

const EMPTY_HISTORY: WorkspaceHistoryState = {
  undoStack: [],
  redoStack: [],
};

function workspaceReducer(
  state: WorkspaceStoreState,
  action: WorkspaceReducerAction
): WorkspaceStoreState {
  switch (action.type) {
    case 'replace':
      return action.state;
    default:
      return state;
  }
}

function resolveSetStateAction<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(current) : value;
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function trimUndoStack(stack: CanvasCommand[]) {
  return stack.length > MAX_HISTORY ? stack.slice(stack.length - MAX_HISTORY) : stack;
}

function reduceHistoryTransaction(
  history: WorkspaceHistoryState,
  transaction?: WorkspaceHistoryTransaction
): WorkspaceHistoryState {
  if (!transaction) {
    return history;
  }

  switch (transaction.type) {
    case 'push':
      return {
        undoStack: trimUndoStack([...history.undoStack, transaction.command]),
        redoStack: [],
      };
    case 'replace':
      return {
        undoStack: trimUndoStack(transaction.undoStack),
        redoStack: transaction.redoStack,
      };
    case 'clear':
      return EMPTY_HISTORY;
    default:
      return history;
  }
}

function sanitizeSelectionForGraph(
  selection: WorkspaceSelectionState,
  graph: GraphData
): WorkspaceSelectionState {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));

  return {
    ...selection,
    selectedNodeIds: selection.selectedNodeIds.filter((nodeId) => nodeIds.has(nodeId)),
    selectedEdgeId:
      selection.selectedEdgeId && edgeIds.has(selection.selectedEdgeId)
        ? selection.selectedEdgeId
        : null,
    editingNodeId:
      selection.editingNodeId && nodeIds.has(selection.editingNodeId)
        ? selection.editingNodeId
        : null,
    quickEditingNodeId:
      selection.quickEditingNodeId && nodeIds.has(selection.quickEditingNodeId)
        ? selection.quickEditingNodeId
        : null,
    pendingInspectorContentFocusNodeId:
      selection.pendingInspectorContentFocusNodeId &&
      nodeIds.has(selection.pendingInspectorContentFocusNodeId)
        ? selection.pendingInspectorContentFocusNodeId
        : null,
  };
}

export function reduceWorkspaceTransaction(
  state: WorkspaceStoreState,
  transaction: WorkspaceTransaction
): WorkspaceStoreState {
  const graph = transaction.graph ?? state.graph;
  const selection = sanitizeSelectionForGraph(
    {
      ...state.selection,
      ...transaction.selection,
    },
    graph
  );

  return {
    graph,
    nodePositions: transaction.nodePositions ?? state.nodePositions,
    nodeSizes: transaction.nodeSizes ?? state.nodeSizes,
    viewport: Object.prototype.hasOwnProperty.call(transaction, 'viewport')
      ? (transaction.viewport ?? null)
      : state.viewport,
    selection,
    status: {
      ...state.status,
      ...transaction.status,
    },
    history: reduceHistoryTransaction(state.history, transaction.history),
  };
}

export function createWorkspaceSnapshot(state: WorkspaceStoreState): CanvasHistoryWorkspaceState {
  const selection = sanitizeSelectionForGraph(state.selection, state.graph);
  return {
    graph: state.graph,
    nodePositions: state.nodePositions,
    nodeSizes: state.nodeSizes,
    viewport: state.viewport,
    selection: {
      selectedNodeIds: selection.selectedNodeIds,
      selectedEdgeId: selection.selectedEdgeId,
      editingNodeId: selection.editingNodeId,
      quickEditingNodeId: selection.quickEditingNodeId,
      pendingInspectorContentFocusNodeId: selection.pendingInspectorContentFocusNodeId,
    },
  };
}

export function createWorkspacePatchCommandFromTransaction(
  before: WorkspaceStoreState,
  transaction: WorkspaceTransaction
): CanvasCommand {
  return createWorkspacePatchCommand(
    createWorkspaceSnapshot(before),
    createWorkspaceSnapshot(reduceWorkspaceTransaction(before, transaction))
  );
}

export function createInitialWorkspaceStoreState(
  overrides: Partial<WorkspaceStoreState> = {}
): WorkspaceStoreState {
  return {
    graph: overrides.graph ?? EMPTY_GRAPH,
    nodePositions: overrides.nodePositions ?? {},
    nodeSizes: overrides.nodeSizes ?? {},
    viewport: Object.prototype.hasOwnProperty.call(overrides, 'viewport')
      ? (overrides.viewport ?? null)
      : null,
    selection: {
      ...EMPTY_SELECTION,
      ...overrides.selection,
    },
    status: {
      ...EMPTY_STATUS,
      ...overrides.status,
    },
    history: {
      ...EMPTY_HISTORY,
      ...overrides.history,
    },
  };
}

export function useWorkspaceStore(
  initialState?: Partial<WorkspaceStoreState>
): WorkspaceStoreController {
  const [workspace, dispatch] = useReducer(
    workspaceReducer,
    initialState,
    createInitialWorkspaceStoreState
  );
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  const dispatchWorkspaceTransaction = useCallback<DispatchWorkspaceTransaction>((input) => {
    const current = workspaceRef.current;
    const transaction = typeof input === 'function' ? input(current) : input;
    if (!transaction) {
      return null;
    }

    const next = reduceWorkspaceTransaction(current, transaction);
    workspaceRef.current = next;
    dispatch({ type: 'replace', state: next });
    return next;
  }, []);

  const setStatusValue = useCallback(
    <K extends keyof WorkspaceStatusState>(
      key: K,
      value: SetStateAction<WorkspaceStatusState[K]>
    ) => {
      dispatchWorkspaceTransaction((current) => {
        const nextValue = resolveSetStateAction(value, current.status[key]);
        if (current.status[key] === nextValue) {
          return null;
        }
        return { status: { [key]: nextValue } as Partial<WorkspaceStatusState> };
      });
    },
    [dispatchWorkspaceTransaction]
  );

  const setSelectionValue = useCallback(
    <K extends keyof WorkspaceSelectionState>(
      key: K,
      value: SetStateAction<WorkspaceSelectionState[K]>
    ) => {
      dispatchWorkspaceTransaction((current) => {
        const nextValue = resolveSetStateAction(value, current.selection[key]);
        if (current.selection[key] === nextValue) {
          return null;
        }
        return { selection: { [key]: nextValue } as Partial<WorkspaceSelectionState> };
      });
    },
    [dispatchWorkspaceTransaction]
  );

  const setSelectedNodeId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (value) => {
      dispatchWorkspaceTransaction((current) => {
        const previousId = current.selection.selectedNodeIds[0] ?? null;
        const nextId = resolveSetStateAction(value, previousId);
        const nextIds = nextId ? [nextId] : [];
        if (areStringArraysEqual(current.selection.selectedNodeIds, nextIds)) {
          return null;
        }
        return { selection: { selectedNodeIds: nextIds } };
      });
    },
    [dispatchWorkspaceTransaction]
  );

  const setSelectedNodeIds = useCallback<Dispatch<SetStateAction<string[]>>>(
    (value) => {
      dispatchWorkspaceTransaction((current) => {
        const nextIds = resolveSetStateAction(value, current.selection.selectedNodeIds);
        if (areStringArraysEqual(current.selection.selectedNodeIds, nextIds)) {
          return null;
        }
        return { selection: { selectedNodeIds: nextIds } };
      });
    },
    [dispatchWorkspaceTransaction]
  );

  const clearHistory = useCallback(() => {
    dispatchWorkspaceTransaction({ history: { type: 'clear' } });
  }, [dispatchWorkspaceTransaction]);

  const setDirty = useCallback<Dispatch<SetStateAction<boolean>>>(
    (value) => setStatusValue('dirty', value),
    [setStatusValue]
  );
  const setStatus = useCallback<Dispatch<SetStateAction<WorkspaceStatusState['status']>>>(
    (value) => setStatusValue('status', value),
    [setStatusValue]
  );
  const setErrorMessage = useCallback<Dispatch<SetStateAction<string | null>>>(
    (value) => setStatusValue('errorMessage', value),
    [setStatusValue]
  );
  const setSelectedEdgeId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (value) => setSelectionValue('selectedEdgeId', value),
    [setSelectionValue]
  );
  const setContextMenu = useCallback<Dispatch<SetStateAction<GraphContextMenuState | null>>>(
    (value) => setSelectionValue('contextMenu', value),
    [setSelectionValue]
  );
  const setEditingNodeId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (value) => setSelectionValue('editingNodeId', value),
    [setSelectionValue]
  );
  const setQuickEditingNodeId = useCallback<Dispatch<SetStateAction<string | null>>>(
    (value) => setSelectionValue('quickEditingNodeId', value),
    [setSelectionValue]
  );
  const setPendingInspectorContentFocusNodeId = useCallback<
    Dispatch<SetStateAction<string | null>>
  >((value) => setSelectionValue('pendingInspectorContentFocusNodeId', value), [setSelectionValue]);

  return {
    workspace,
    workspaceRef,
    dispatchWorkspaceTransaction,
    setDirty,
    setStatus,
    setErrorMessage,
    setSelectedNodeId,
    setSelectedNodeIds,
    setSelectedEdgeId,
    setContextMenu,
    setEditingNodeId,
    setQuickEditingNodeId,
    setPendingInspectorContentFocusNodeId,
    clearHistory,
  };
}
