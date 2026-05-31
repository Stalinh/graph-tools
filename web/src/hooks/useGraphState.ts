import { useState, type Dispatch, type SetStateAction } from "react";
import type { Locale } from "../i18n";
import { useGraphEdges } from "./useGraphEdges";
import { useGraphNodes } from "./useGraphNodes";
import { useGraphPersistence } from "./useGraphPersistence";
import { useGraphSearch } from "./useGraphSearch";
import { useGraphSelection } from "./useGraphSelection";
import type { CanvasCommand } from "./useCanvasHistory";
import { useSelectionState } from "./useSelectionState";
import { useWorkspaceStatusState } from "./useWorkspaceStatusState";

type SelectionState = ReturnType<typeof useSelectionState>;
type StatusState = ReturnType<typeof useWorkspaceStatusState>;
type SearchState = ReturnType<typeof useGraphSearch>;
type GraphNodesState = ReturnType<typeof useGraphNodes>;
type GraphEdgesState = ReturnType<typeof useGraphEdges>;
type GraphSelectionState = ReturnType<typeof useGraphSelection>;
type GraphPersistenceState = ReturnType<typeof useGraphPersistence>;

export interface GraphState {
  nodes: Omit<GraphNodesState, "setGraph" | "setNodePositions" | "setViewport">;
  edges: GraphEdgesState;
  selection: SelectionState & GraphSelectionState;
  persistence: GraphPersistenceState;
  search: SearchState;
  images: {
    images: Map<string, Blob>;
    setImages: Dispatch<SetStateAction<Map<string, Blob>>>;
  };
  status: StatusState;
}

export interface UseGraphStateOptions {
  pushCommand: (cmd: CanvasCommand) => void;
  popUndo: () => CanvasCommand | null;
  pushRedo: (cmd: CanvasCommand) => void;
  popRedo: () => CanvasCommand | null;
  pushUndo: (cmd: CanvasCommand) => void;
  clear: () => void;
  locale?: Locale;
}

export function useGraphState(history: UseGraphStateOptions): GraphState {
  const search = useGraphSearch();
  const selectionState = useSelectionState();
  const statusState = useWorkspaceStatusState();

  const [images, setImages] = useState<Map<string, Blob>>(new Map());

  const nodes = useGraphNodes({
    pushCommand: history.pushCommand,
    setDirty: statusState.setDirty,
    setSelectedNodeId: selectionState.setSelectedNodeId,
    setSelectedNodeIds: selectionState.setSelectedNodeIds,
    setEditingNodeId: selectionState.setEditingNodeId,
    setQuickEditingNodeId: selectionState.setQuickEditingNodeId,
    setPendingInspectorContentFocusNodeId: selectionState.setPendingInspectorContentFocusNodeId,
    locale: history.locale ?? "zh-CN",
  });

  const selection = useGraphSelection({
    selectedNodeId: selectionState.selectedNodeId,
    setSelectedNodeId: selectionState.setSelectedNodeId,
    selectedNodeIds: selectionState.selectedNodeIds,
    selectedEdgeId: selectionState.selectedEdgeId,
    editingNodeId: selectionState.editingNodeId,
    setEditingNodeId: selectionState.setEditingNodeId,
    contextMenu: selectionState.contextMenu,
    setContextMenu: selectionState.setContextMenu,
    status: statusState.status,
    setStatus: statusState.setStatus,
    graph: nodes.graph,
  });

  const edges = useGraphEdges({
    graph: nodes.graph,
    setGraph: nodes.setGraph,
    pushCommand: history.pushCommand,
    setDirty: statusState.setDirty,
    setSelectedNodeId: selectionState.setSelectedNodeId,
  });

  const persistence = useGraphPersistence({
    graph: nodes.graph,
    nodePositions: nodes.nodePositions,
    nodeSizes: nodes.nodeSizes,
    viewport: nodes.viewport,
    selectedNodeId: selectionState.selectedNodeId,
    setDirty: statusState.setDirty,
    setGraph: nodes.setGraph,
    setNodePositions: nodes.setNodePositions,
    setNodeSizes: nodes.setNodeSizes,
    setViewport: nodes.setViewport,
    setSelectedNodeId: selectionState.setSelectedNodeId,
    setSelectedNodeIds: selectionState.setSelectedNodeIds,
    setSelectedEdgeId: selectionState.setSelectedEdgeId,
    setEditingNodeId: selectionState.setEditingNodeId,
    setQuickEditingNodeId: selectionState.setQuickEditingNodeId,
    setPendingInspectorContentFocusNodeId: selectionState.setPendingInspectorContentFocusNodeId,
    pushUndo: history.pushUndo,
    popUndo: history.popUndo,
    pushRedo: history.pushRedo,
    popRedo: history.popRedo,
    clearHistory: history.clear,
  });

  return {
    nodes: {
      graph: nodes.graph,
      nodePositions: nodes.nodePositions,
      nodeSizes: nodes.nodeSizes,
      setNodeSizes: nodes.setNodeSizes,
      viewport: nodes.viewport,
      createNode: nodes.createNode,
      deleteNode: nodes.deleteNode,
      deleteNodes: nodes.deleteNodes,
      updateGraphNode: nodes.updateGraphNode,
      commitGraphNode: nodes.commitGraphNode,
      updateGraphNodeColor: nodes.updateGraphNodeColor,
      updateGraphNodesColor: nodes.updateGraphNodesColor,
      updateGraphNodeLocked: nodes.updateGraphNodeLocked,
      updateGraphNodesLocked: nodes.updateGraphNodesLocked,
      updateGraphNodeOpacity: nodes.updateGraphNodeOpacity,
      commitGraphNodeOpacity: nodes.commitGraphNodeOpacity,
      updateGraphNodesOpacity: nodes.updateGraphNodesOpacity,
      commitGraphNodesOpacity: nodes.commitGraphNodesOpacity,
      handleNodeDragEnd: nodes.handleNodeDragEnd,
      handleNodesDragEnd: nodes.handleNodesDragEnd,
      handleNodeResizeEnd: nodes.handleNodeResizeEnd,
      matchGroupNodeSizes: nodes.matchGroupNodeSizes,
      handleViewportChange: nodes.handleViewportChange,
    },
    edges: {
      createCitation: edges.createCitation,
      deleteCitation: edges.deleteCitation,
      updateEdgeColor: edges.updateEdgeColor,
      updateEdgeDirection: edges.updateEdgeDirection,
      updateEdgeStyle: edges.updateEdgeStyle,
      reorderReferences: edges.reorderReferences,
    },
    selection: {
      selectedNodeId: selectionState.selectedNodeId,
      setSelectedNodeId: selectionState.setSelectedNodeId,
      selectedNodeIds: selectionState.selectedNodeIds,
      setSelectedNodeIds: selectionState.setSelectedNodeIds,
      selectedEdgeId: selectionState.selectedEdgeId,
      setSelectedEdgeId: selectionState.setSelectedEdgeId,
      contextMenu: selectionState.contextMenu,
      setContextMenu: selectionState.setContextMenu,
      editingNodeId: selectionState.editingNodeId,
      setEditingNodeId: selectionState.setEditingNodeId,
      quickEditingNodeId: selectionState.quickEditingNodeId,
      setQuickEditingNodeId: selectionState.setQuickEditingNodeId,
      pendingInspectorContentFocusNodeId: selectionState.pendingInspectorContentFocusNodeId,
      setPendingInspectorContentFocusNodeId: selectionState.setPendingInspectorContentFocusNodeId,
      selectedNode: selection.selectedNode,
      selectedNodes: selection.selectedNodes,
      editingNode: selection.editingNode,
      selectedEdge: selection.selectedEdge,
      selectedEdgeSourceNode: selection.selectedEdgeSourceNode,
      selectedEdgeTargetNode: selection.selectedEdgeTargetNode,
      openNodeEditor: selection.openNodeEditor,
      closeContextMenu: selection.closeContextMenu,
    },
    persistence: {
      undo: persistence.undo,
      redo: persistence.redo,
      createWorkspaceState: persistence.createWorkspaceState,
      applyWorkspaceState: persistence.applyWorkspaceState,
      resetToEmpty: persistence.resetToEmpty,
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
      setDirty: statusState.setDirty,
      status: statusState.status,
      setStatus: statusState.setStatus,
      errorMessage: statusState.errorMessage,
      setErrorMessage: statusState.setErrorMessage,
    },
  };
}
