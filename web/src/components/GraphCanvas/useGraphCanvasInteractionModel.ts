import { useMemo } from 'react';
import { isReferenceableNode } from '../../lib/graphConstraints';
import type { GraphData, GraphNode, WorkspaceNodeFilter } from '../../types';

export interface GraphCanvasInteractionModel {
  citationDisabledNodeIds: Set<string>;
  citationSelectionActive: boolean;
  connectedNodeIds: Set<string>;
  matchingNodeIds: Set<string> | null;
  selectedEdgeActive: boolean;
  selectedEdgeId: string | null;
  selectedNodeIdSet: Set<string>;
  visibleNodeIds: Set<string>;
}

export interface CreateGraphCanvasInteractionModelOptions {
  graph: GraphData;
  matchingNodeIds: Set<string> | null;
  nodeFilter: WorkspaceNodeFilter;
  pendingCitation: boolean;
  selectedEdgeId: string | null;
  selectedNodeIds: string[];
}

function isNodeVisibleByFilter(node: GraphNode, nodeFilter: WorkspaceNodeFilter) {
  if (nodeFilter === 'all') return true;
  if (nodeFilter === 'locked') return Boolean(node.locked);
  return node.type === nodeFilter;
}

export function createGraphCanvasInteractionModel({
  graph,
  matchingNodeIds,
  nodeFilter,
  pendingCitation,
  selectedEdgeId,
  selectedNodeIds,
}: CreateGraphCanvasInteractionModelOptions): GraphCanvasInteractionModel {
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const selectedEdge = selectedEdgeId
    ? graph.edges.find((edge) => edge.id === selectedEdgeId)
    : undefined;
  const connectedNodeIds = selectedEdge
    ? new Set([selectedEdge.sourceId, selectedEdge.targetId])
    : new Set<string>();
  const visibleNodeIds = new Set<string>();
  const citationDisabledNodeIds = new Set<string>();

  graph.nodes.forEach((node) => {
    if (isNodeVisibleByFilter(node, nodeFilter)) {
      visibleNodeIds.add(node.id);
    }
    if (pendingCitation && !isReferenceableNode(node)) {
      citationDisabledNodeIds.add(node.id);
    }
  });

  return {
    citationDisabledNodeIds,
    citationSelectionActive: pendingCitation,
    connectedNodeIds,
    matchingNodeIds,
    selectedEdgeActive: Boolean(selectedEdge),
    selectedEdgeId: selectedEdge?.id ?? null,
    selectedNodeIdSet,
    visibleNodeIds,
  };
}

export function useGraphCanvasInteractionModel({
  graph,
  matchingNodeIds,
  nodeFilter,
  pendingCitation,
  selectedEdgeId,
  selectedNodeIds,
}: CreateGraphCanvasInteractionModelOptions): GraphCanvasInteractionModel {
  return useMemo(
    () =>
      createGraphCanvasInteractionModel({
        graph,
        matchingNodeIds,
        nodeFilter,
        pendingCitation,
        selectedEdgeId,
        selectedNodeIds,
      }),
    [
      graph.edges,
      graph.nodes,
      matchingNodeIds,
      nodeFilter,
      pendingCitation,
      selectedEdgeId,
      selectedNodeIds,
    ]
  );
}
