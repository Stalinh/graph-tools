import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GraphContextMenuState, GraphData, GraphEdge, GraphNode } from "../types";

interface UseGraphSelectionOptions {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  editingNodeId: string | null;
  setEditingNodeId: (id: string | null) => void;
  contextMenu: GraphContextMenuState | null;
  setContextMenu: (state: GraphContextMenuState | null) => void;
  status: "loading" | "ready" | "error";
  setStatus: (s: "loading" | "ready" | "error") => void;
  graph: GraphData;
}

export function useGraphSelection(options: UseGraphSelectionOptions) {
  const {
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    editingNodeId,
    setEditingNodeId,
    setContextMenu,
    setStatus,
    graph,
  } = options;
  const hasInitializedStatusRef = useRef(false);

  useEffect(() => {
    if (hasInitializedStatusRef.current) {
      return;
    }
    hasInitializedStatusRef.current = true;
    setStatus("ready");
  }, [setStatus]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  const openNodeEditor = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setEditingNodeId(nodeId);
    },
    [setSelectedNodeId, setEditingNodeId]
  );

  const selectedNode = useMemo<GraphNode | null>(() => {
    if (!selectedNodeId) return null;
    return graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [graph.nodes, selectedNodeId]);

  const editingNode = useMemo<GraphNode | null>(() => {
    if (!editingNodeId) return null;
    return graph.nodes.find((node) => node.id === editingNodeId) ?? null;
  }, [editingNodeId, graph.nodes]);
  const selectedNodes = useMemo<GraphNode[]>(
    () => graph.nodes.filter((node) => selectedNodeIds.includes(node.id)),
    [graph.nodes, selectedNodeIds]
  );

  const selectedEdge = useMemo<GraphEdge | null>(() => {
    if (!selectedEdgeId) return null;
    return graph.edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [graph.edges, selectedEdgeId]);

  const selectedEdgeSourceNode = useMemo<GraphNode | null>(() => {
    if (!selectedEdge) return null;
    return graph.nodes.find((n) => n.id === selectedEdge.sourceId) ?? null;
  }, [graph.nodes, selectedEdge]);

  const selectedEdgeTargetNode = useMemo<GraphNode | null>(() => {
    if (!selectedEdge) return null;
    return graph.nodes.find((n) => n.id === selectedEdge.targetId) ?? null;
  }, [graph.nodes, selectedEdge]);

  return {
    selectedNode,
    editingNode,
    selectedNodes,
    selectedEdge,
    selectedEdgeSourceNode,
    selectedEdgeTargetNode,
    openNodeEditor,
    closeContextMenu,
  };
}
