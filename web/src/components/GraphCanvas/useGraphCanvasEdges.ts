import type { Edge } from '@xyflow/react';
import { useMemo } from 'react';
import { normalizeEdgeStyle } from '../../lib/edgeStyles';
import type { GraphData, GraphNode, WorkspaceNodeFilter } from '../../types';
import { getEdgeVisualStyle, shouldDimEdgeByFilter } from './graphUtils';

const EDGE_STYLE: Record<string, Edge['style']> = {
  citation: { strokeWidth: 1.8 },
};

interface UseGraphCanvasEdgesOptions {
  connectedNodeIds: Set<string>;
  graphEdges: GraphData['edges'];
  graphNodes: GraphNode[];
  isInteractionActive: boolean;
  matchingNodeIds: Set<string> | null;
  nodeFilter: WorkspaceNodeFilter;
  selectedEdgeId: string | null;
}

export function useGraphCanvasEdges({
  connectedNodeIds,
  graphEdges,
  graphNodes,
  isInteractionActive,
  matchingNodeIds,
  nodeFilter,
  selectedEdgeId,
}: UseGraphCanvasEdgesOptions) {
  return useMemo<Edge[]>(() => {
    const filterMatchesNode = (node: GraphNode) => {
      if (nodeFilter === 'all') return true;
      if (nodeFilter === 'locked') return Boolean(node.locked);
      return node.type === nodeFilter;
    };
    const visibleNodeIds = new Set(graphNodes.filter(filterMatchesNode).map((node) => node.id));

    return graphEdges.map((edge) => {
      const isDimmed =
        matchingNodeIds !== null &&
        !matchingNodeIds.has(edge.sourceId) &&
        !matchingNodeIds.has(edge.targetId);
      const isHiddenByFilter = shouldDimEdgeByFilter(edge, visibleNodeIds);
      const visualStyle = getEdgeVisualStyle({
        edgeId: edge.id,
        selectedEdgeId,
        hasSelectedEdge: connectedNodeIds.size > 0,
        isDimmedBySearch: isDimmed,
        isDimmedByFilter: isHiddenByFilter,
      });

      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'citation',
        interactionWidth: 40,
        className: visualStyle.isSelected ? 'graph-edge--selected' : '',
        data: {
          direction: edge.direction ?? 'unidirectional',
          selected: visualStyle.isSelected,
          isInteractionActive,
          color: edge.color,
          style: normalizeEdgeStyle(edge.style),
        },
        style: {
          ...EDGE_STYLE.citation,
          opacity: visualStyle.opacity,
          strokeWidth: visualStyle.strokeWidth,
        },
      };
    });
  }, [
    connectedNodeIds,
    graphEdges,
    graphNodes,
    isInteractionActive,
    matchingNodeIds,
    nodeFilter,
    selectedEdgeId,
  ]);
}
