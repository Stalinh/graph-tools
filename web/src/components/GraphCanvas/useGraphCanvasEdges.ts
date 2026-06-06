import type { Edge } from '@xyflow/react';
import { useMemo, useRef } from 'react';
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
  interactionNodeIds: ReadonlySet<string>;
  matchingNodeIds: Set<string> | null;
  nodeFilter: WorkspaceNodeFilter;
  selectedEdgeId: string | null;
}

function areEdgeStylesEqual(left: Edge['style'], right: Edge['style']) {
  return (
    left?.opacity === right?.opacity &&
    left?.strokeWidth === right?.strokeWidth &&
    left?.stroke === right?.stroke
  );
}

function areEdgeDataEqual(left: Edge['data'], right: Edge['data']) {
  return (
    left?.direction === right?.direction &&
    left?.selected === right?.selected &&
    left?.isInteractionActive === right?.isInteractionActive &&
    left?.color === right?.color &&
    left?.style === right?.style
  );
}

function canReuseEdge(previousEdge: Edge, nextEdge: Edge) {
  return (
    previousEdge.source === nextEdge.source &&
    previousEdge.target === nextEdge.target &&
    previousEdge.type === nextEdge.type &&
    previousEdge.interactionWidth === nextEdge.interactionWidth &&
    previousEdge.className === nextEdge.className &&
    areEdgeStylesEqual(previousEdge.style, nextEdge.style) &&
    areEdgeDataEqual(previousEdge.data, nextEdge.data)
  );
}

export function useGraphCanvasEdges({
  connectedNodeIds,
  graphEdges,
  graphNodes,
  isInteractionActive,
  interactionNodeIds,
  matchingNodeIds,
  nodeFilter,
  selectedEdgeId,
}: UseGraphCanvasEdgesOptions) {
  const previousEdgesByIdRef = useRef<ReadonlyMap<string, Edge>>(new Map());

  return useMemo<Edge[]>(() => {
    const filterMatchesNode = (node: GraphNode) => {
      if (nodeFilter === 'all') return true;
      if (nodeFilter === 'locked') return Boolean(node.locked);
      return node.type === nodeFilter;
    };
    const visibleNodeIds = new Set(graphNodes.filter(filterMatchesNode).map((node) => node.id));
    const previousEdgesById = previousEdgesByIdRef.current;

    const nextEdges = graphEdges.map((edge) => {
      const isDimmed =
        matchingNodeIds !== null &&
        !matchingNodeIds.has(edge.sourceId) &&
        !matchingNodeIds.has(edge.targetId);
      const isHiddenByFilter = shouldDimEdgeByFilter(edge, visibleNodeIds);
      const isEdgeInteractionActive =
        isInteractionActive &&
        (interactionNodeIds.size === 0 ||
          interactionNodeIds.has(edge.sourceId) ||
          interactionNodeIds.has(edge.targetId));
      const visualStyle = getEdgeVisualStyle({
        edgeId: edge.id,
        selectedEdgeId,
        hasSelectedEdge: connectedNodeIds.size > 0,
        isDimmedBySearch: isDimmed,
        isDimmedByFilter: isHiddenByFilter,
      });

      const nextEdge: Edge = {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'citation',
        interactionWidth: 40,
        className: visualStyle.isSelected ? 'graph-edge--selected' : '',
        data: {
          direction: edge.direction ?? 'unidirectional',
          selected: visualStyle.isSelected,
          isInteractionActive: isEdgeInteractionActive,
          color: edge.color,
          style: normalizeEdgeStyle(edge.style),
        },
        style: {
          ...EDGE_STYLE.citation,
          opacity: visualStyle.opacity,
          strokeWidth: visualStyle.strokeWidth,
        },
      };

      const previousEdge = previousEdgesById.get(nextEdge.id);
      if (!previousEdge) {
        return nextEdge;
      }

      if (areEdgeStylesEqual(previousEdge.style, nextEdge.style)) {
        nextEdge.style = previousEdge.style;
      }

      if (areEdgeDataEqual(previousEdge.data, nextEdge.data)) {
        nextEdge.data = previousEdge.data;
      }

      return canReuseEdge(previousEdge, nextEdge) ? previousEdge : nextEdge;
    });

    previousEdgesByIdRef.current = new Map(nextEdges.map((edge) => [edge.id, edge]));

    return nextEdges;
  }, [
    connectedNodeIds,
    graphEdges,
    graphNodes,
    isInteractionActive,
    interactionNodeIds,
    matchingNodeIds,
    nodeFilter,
    selectedEdgeId,
  ]);
}
