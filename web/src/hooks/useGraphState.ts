import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Locale } from '../i18n';
import { useGraphEdges } from './useGraphEdges';
import { useGraphNodes } from './useGraphNodes';
import { useGraphPersistence } from './useGraphPersistence';
import { useGraphSearch } from './useGraphSearch';
import { useGraphSelection } from './useGraphSelection';
import { useWorkspaceStore } from './useWorkspaceStore';

type SearchState = ReturnType<typeof useGraphSearch>;
type GraphNodesState = ReturnType<typeof useGraphNodes>;
type GraphEdgesState = ReturnType<typeof useGraphEdges>;
type GraphSelectionState = ReturnType<typeof useGraphSelection>;
type GraphPersistenceState = ReturnType<typeof useGraphPersistence>;
type WorkspaceStoreState = ReturnType<typeof useWorkspaceStore>;

export interface GraphState {
  nodes: GraphNodesState;
  edges: GraphEdgesState;
  selection: {
    selectedNodeId: string | null;
    setSelectedNodeId: WorkspaceStoreState['setSelectedNodeId'];
    selectedNodeIds: string[];
    setSelectedNodeIds: WorkspaceStoreState['setSelectedNodeIds'];
    selectedEdgeId: string | null;
    setSelectedEdgeId: WorkspaceStoreState['setSelectedEdgeId'];
    contextMenu: WorkspaceStoreState['workspace']['selection']['contextMenu'];
    setContextMenu: WorkspaceStoreState['setContextMenu'];
    editingNodeId: string | null;
    setEditingNodeId: WorkspaceStoreState['setEditingNodeId'];
    quickEditingNodeId: string | null;
    setQuickEditingNodeId: WorkspaceStoreState['setQuickEditingNodeId'];
    pendingInspectorContentFocusNodeId: string | null;
    setPendingInspectorContentFocusNodeId: WorkspaceStoreState['setPendingInspectorContentFocusNodeId'];
  } & GraphSelectionState;
  persistence: GraphPersistenceState;
  history: {
    undoStack: WorkspaceStoreState['workspace']['history']['undoStack'];
    redoStack: WorkspaceStoreState['workspace']['history']['redoStack'];
    clear: WorkspaceStoreState['clearHistory'];
  };
  search: SearchState;
  images: {
    images: Map<string, Blob>;
    setImages: Dispatch<SetStateAction<Map<string, Blob>>>;
  };
  status: {
    dirty: boolean;
    setDirty: WorkspaceStoreState['setDirty'];
    status: WorkspaceStoreState['workspace']['status']['status'];
    setStatus: WorkspaceStoreState['setStatus'];
    errorMessage: string | null;
    setErrorMessage: WorkspaceStoreState['setErrorMessage'];
  };
}

export interface UseGraphStateOptions {
  locale?: Locale;
}

export function useGraphState(options: UseGraphStateOptions = {}): GraphState {
  const search = useGraphSearch();
  const workspaceStore = useWorkspaceStore();
  const { workspace } = workspaceStore;
  const selectionState = workspace.selection;
  const statusState = workspace.status;
  const selectedNodeId = selectionState.selectedNodeIds[0] ?? null;

  const [images, setImages] = useState<Map<string, Blob>>(new Map());

  const nodes = useGraphNodes({
    workspace,
    workspaceRef: workspaceStore.workspaceRef,
    dispatchWorkspaceTransaction: workspaceStore.dispatchWorkspaceTransaction,
    locale: options.locale ?? 'zh-CN',
  });

  const selection = useGraphSelection({
    selectedNodeId,
    setSelectedNodeId: workspaceStore.setSelectedNodeId,
    selectedNodeIds: selectionState.selectedNodeIds,
    selectedEdgeId: selectionState.selectedEdgeId,
    editingNodeId: selectionState.editingNodeId,
    setEditingNodeId: workspaceStore.setEditingNodeId,
    contextMenu: selectionState.contextMenu,
    setContextMenu: workspaceStore.setContextMenu,
    status: statusState.status,
    setStatus: workspaceStore.setStatus,
    graph: nodes.graph,
  });

  const edges = useGraphEdges({
    workspaceRef: workspaceStore.workspaceRef,
    dispatchWorkspaceTransaction: workspaceStore.dispatchWorkspaceTransaction,
  });

  const persistence = useGraphPersistence({
    workspaceRef: workspaceStore.workspaceRef,
    dispatchWorkspaceTransaction: workspaceStore.dispatchWorkspaceTransaction,
  });

  return {
    nodes,
    edges,
    selection: {
      selectedNodeId,
      setSelectedNodeId: workspaceStore.setSelectedNodeId,
      selectedNodeIds: selectionState.selectedNodeIds,
      setSelectedNodeIds: workspaceStore.setSelectedNodeIds,
      selectedEdgeId: selectionState.selectedEdgeId,
      setSelectedEdgeId: workspaceStore.setSelectedEdgeId,
      contextMenu: selectionState.contextMenu,
      setContextMenu: workspaceStore.setContextMenu,
      editingNodeId: selectionState.editingNodeId,
      setEditingNodeId: workspaceStore.setEditingNodeId,
      quickEditingNodeId: selectionState.quickEditingNodeId,
      setQuickEditingNodeId: workspaceStore.setQuickEditingNodeId,
      pendingInspectorContentFocusNodeId: selectionState.pendingInspectorContentFocusNodeId,
      setPendingInspectorContentFocusNodeId: workspaceStore.setPendingInspectorContentFocusNodeId,
      selectedNode: selection.selectedNode,
      selectedNodes: selection.selectedNodes,
      editingNode: selection.editingNode,
      selectedEdge: selection.selectedEdge,
      selectedEdgeSourceNode: selection.selectedEdgeSourceNode,
      selectedEdgeTargetNode: selection.selectedEdgeTargetNode,
      openNodeEditor: selection.openNodeEditor,
      closeContextMenu: selection.closeContextMenu,
    },
    persistence,
    history: {
      undoStack: workspace.history.undoStack,
      redoStack: workspace.history.redoStack,
      clear: workspaceStore.clearHistory,
    },
    search: {
      searchQuery: search.searchQuery,
      setSearchQuery: search.setSearchQuery,
      debouncedSearch: search.debouncedSearch,
      searchInputRef: search.searchInputRef,
    },
    images: {
      images,
      setImages,
    },
    status: {
      dirty: statusState.dirty,
      setDirty: workspaceStore.setDirty,
      status: statusState.status,
      setStatus: workspaceStore.setStatus,
      errorMessage: statusState.errorMessage,
      setErrorMessage: workspaceStore.setErrorMessage,
    },
  };
}
