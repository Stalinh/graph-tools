import { useCallback } from 'react';
import type { EdgeDirection, EdgeStyle, GraphData } from '../types';
import { normalizeEdgeStyle } from '../lib/edgeStyles';
import {
  addCitation,
  removeCitation,
  reorderReferences as mutatorReorderReferences,
  updateEdgeColor as mutatorUpdateEdgeColor,
  updateEdgeDirection as mutatorUpdateEdgeDirection,
  updateEdgeStyle as mutatorUpdateEdgeStyle,
} from '../lib/graphMutator';
import { normalizeEdgeColor } from '../lib/nodeColors';
import {
  createWorkspacePatchCommandFromTransaction,
  type WorkspaceStoreController,
  type WorkspaceTransaction,
} from './useWorkspaceStore';

interface UseGraphEdgesOptions extends Pick<
  WorkspaceStoreController,
  'workspaceRef' | 'dispatchWorkspaceTransaction'
> {}

function withHistory(
  beforeState: WorkspaceStoreController['workspace'],
  transaction: WorkspaceTransaction
): WorkspaceTransaction {
  return {
    ...transaction,
    history: {
      type: 'push',
      command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
    },
  };
}

export function useGraphEdges({
  workspaceRef,
  dispatchWorkspaceTransaction,
}: UseGraphEdgesOptions) {
  const applyGraphUpdate = useCallback(
    (mutate: (currentGraph: GraphData) => GraphData) => {
      const beforeState = workspaceRef.current;
      const currentGraph = beforeState.graph;
      const nextGraph = mutate(currentGraph);
      if (nextGraph === currentGraph) {
        return false;
      }

      const transaction: WorkspaceTransaction = {
        graph: nextGraph,
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction(withHistory(beforeState, transaction));
      return true;
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const createCitation = useCallback(
    (sourceId: string, targetId: string, direction: EdgeDirection = 'unidirectional') => {
      const beforeState = workspaceRef.current;
      const currentGraph = beforeState.graph;
      const nextGraph = addCitation(currentGraph, sourceId, targetId, direction);
      if (nextGraph === currentGraph) {
        return;
      }

      const transaction: WorkspaceTransaction = {
        graph: nextGraph,
        selection: { selectedNodeIds: [sourceId] },
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction(withHistory(beforeState, transaction));
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const deleteCitation = useCallback(
    (sourceId: string, targetId: string) => {
      const beforeState = workspaceRef.current;
      const currentGraph = beforeState.graph;
      const deletedEdge = currentGraph.edges.find(
        (e) => e.sourceId === sourceId && e.targetId === targetId
      );
      if (!deletedEdge) return;

      const nextGraph = removeCitation(currentGraph, sourceId, targetId);
      if (nextGraph === currentGraph) {
        return;
      }

      const transaction: WorkspaceTransaction = {
        graph: nextGraph,
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction(withHistory(beforeState, transaction));
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const updateEdgeDirection = useCallback(
    (edgeId: string, direction: EdgeDirection) => {
      applyGraphUpdate((currentGraph) => {
        const edge = currentGraph.edges.find((currentEdge) => currentEdge.id === edgeId);
        if (!edge || (edge.direction ?? 'unidirectional') === direction) {
          return currentGraph;
        }

        return mutatorUpdateEdgeDirection(currentGraph, edgeId, direction);
      });
    },
    [applyGraphUpdate]
  );

  const updateEdgeStyle = useCallback(
    (edgeId: string, style: EdgeStyle) => {
      const nextStyle = normalizeEdgeStyle(style);
      applyGraphUpdate((currentGraph) => {
        const edge = currentGraph.edges.find((currentEdge) => currentEdge.id === edgeId);
        const currentStyle = normalizeEdgeStyle(edge?.style);
        if (!edge || currentStyle === nextStyle) {
          return currentGraph;
        }

        return mutatorUpdateEdgeStyle(currentGraph, edgeId, nextStyle);
      });
    },
    [applyGraphUpdate]
  );

  const updateEdgeColor = useCallback(
    (edgeId: string, color: string | undefined) => {
      const nextColor = normalizeEdgeColor(color);
      applyGraphUpdate((currentGraph) => {
        const edge = currentGraph.edges.find((currentEdge) => currentEdge.id === edgeId);
        if (!edge || normalizeEdgeColor(edge.color) === nextColor) {
          return currentGraph;
        }

        return mutatorUpdateEdgeColor(currentGraph, edgeId, nextColor);
      });
    },
    [applyGraphUpdate]
  );

  const reorderReferences = useCallback(
    (sourceId: string, newOrder: string[]) => {
      applyGraphUpdate((currentGraph) => {
        const currentOrder =
          currentGraph.nodes
            .find((node) => node.id === sourceId)
            ?.references?.map((ref) => ref.id) ?? [];

        if (
          currentOrder.length === newOrder.length &&
          currentOrder.every((refId, index) => refId === newOrder[index])
        ) {
          return currentGraph;
        }

        return mutatorReorderReferences(currentGraph, sourceId, newOrder);
      });
    },
    [applyGraphUpdate]
  );

  return {
    createCitation,
    deleteCitation,
    updateEdgeColor,
    updateEdgeDirection,
    updateEdgeStyle,
    reorderReferences,
  };
}
