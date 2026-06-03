import { useCallback } from 'react';
import type { GraphData, WorkspaceState } from '../types';
import { clearContentCache, deleteContentCacheEntry } from '../lib/cardContentCache';
import { normalizeWorkspaceState } from '../lib/workspaceState';
import type { CanvasHistoryWorkspaceState } from './canvasHistoryTypes';
import type { WorkspaceStoreController, WorkspaceTransaction } from './useWorkspaceStore';

function deleteRemovedContentCacheEntries(currentGraph: GraphData, nextGraph: GraphData) {
  const nextNodeIds = new Set(nextGraph.nodes.map((node) => node.id));
  currentGraph.nodes.forEach((node) => {
    if (!nextNodeIds.has(node.id)) {
      deleteContentCacheEntry(node.id);
    }
  });
}

interface UseGraphPersistenceOptions extends Pick<
  WorkspaceStoreController,
  'workspaceRef' | 'dispatchWorkspaceTransaction'
> {}

function workspaceTransactionFromHistoryState(
  state: CanvasHistoryWorkspaceState
): WorkspaceTransaction {
  return {
    graph: state.graph,
    nodePositions: state.nodePositions,
    nodeSizes: state.nodeSizes,
    viewport: state.viewport,
    selection: {
      ...state.selection,
      contextMenu: null,
    },
  };
}

export function useGraphPersistence({
  workspaceRef,
  dispatchWorkspaceTransaction,
}: UseGraphPersistenceOptions) {
  const undo = useCallback(() => {
    const current = workspaceRef.current;
    const cmd = current.history.undoStack[current.history.undoStack.length - 1];
    if (!cmd) return;

    deleteRemovedContentCacheEntries(current.graph, cmd.before.graph);
    dispatchWorkspaceTransaction({
      ...workspaceTransactionFromHistoryState(cmd.before),
      status: { dirty: true },
      history: {
        type: 'replace',
        undoStack: current.history.undoStack.slice(0, -1),
        redoStack: [...current.history.redoStack, cmd],
      },
    });
  }, [dispatchWorkspaceTransaction, workspaceRef]);

  const redo = useCallback(() => {
    const current = workspaceRef.current;
    const cmd = current.history.redoStack[current.history.redoStack.length - 1];
    if (!cmd) return;

    deleteRemovedContentCacheEntries(current.graph, cmd.after.graph);
    dispatchWorkspaceTransaction({
      ...workspaceTransactionFromHistoryState(cmd.after),
      status: { dirty: true },
      history: {
        type: 'replace',
        undoStack: [...current.history.undoStack, cmd],
        redoStack: current.history.redoStack.slice(0, -1),
      },
    });
  }, [dispatchWorkspaceTransaction, workspaceRef]);

  const createWorkspaceState = useCallback((): WorkspaceState => {
    const current = workspaceRef.current;
    return normalizeWorkspaceState({
      version: 1,
      savedAt: new Date().toISOString(),
      graph: current.graph,
      nodePositions: current.nodePositions,
      nodeSizes: current.nodeSizes,
      viewport: current.viewport,
      selectedNodeId: current.selection.selectedNodeIds[0] ?? null,
    });
  }, [workspaceRef]);

  const applyWorkspaceState = useCallback(
    (state: WorkspaceState) => {
      const now = new Date().toISOString();
      const normalizedState = normalizeWorkspaceState(state);
      const normalizedGraph: GraphData = {
        ...normalizedState.graph,
        nodes: normalizedState.graph.nodes.map((node) => ({
          ...node,
          createdAt: node.createdAt ?? now,
          updatedAt: node.updatedAt ?? now,
        })),
      };

      dispatchWorkspaceTransaction({
        graph: normalizedGraph,
        nodePositions: normalizedState.nodePositions,
        nodeSizes: normalizedState.nodeSizes ?? {},
        viewport: normalizedState.viewport,
        selection: {
          selectedNodeIds: normalizedState.selectedNodeId ? [normalizedState.selectedNodeId] : [],
          selectedEdgeId: null,
          contextMenu: null,
          editingNodeId: null,
          quickEditingNodeId: null,
          pendingInspectorContentFocusNodeId: null,
        },
        status: { dirty: false },
        history: { type: 'clear' },
      });
      clearContentCache();
    },
    [dispatchWorkspaceTransaction]
  );

  const resetToEmpty = useCallback(() => {
    dispatchWorkspaceTransaction({
      graph: { nodes: [], edges: [] },
      nodePositions: {},
      nodeSizes: {},
      viewport: null,
      selection: {
        selectedNodeIds: [],
        selectedEdgeId: null,
        contextMenu: null,
        editingNodeId: null,
        quickEditingNodeId: null,
        pendingInspectorContentFocusNodeId: null,
      },
      status: { dirty: false },
      history: { type: 'clear' },
    });
    clearContentCache();
  }, [dispatchWorkspaceTransaction]);

  return {
    undo,
    redo,
    createWorkspaceState,
    applyWorkspaceState,
    resetToEmpty,
  };
}
