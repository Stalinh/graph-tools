import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EdgeDirection, EdgeStyle, GraphData } from "../types";
import type { CanvasCommand } from "./useCanvasHistory";
import {
  addCitation,
  removeCitation,
  updateEdgeColor as mutatorUpdateEdgeColor,
  updateEdgeDirection as mutatorUpdateEdgeDirection,
  updateEdgeStyle as mutatorUpdateEdgeStyle,
  reorderReferences as mutatorReorderReferences,
} from "../lib/graphMutator";
import { normalizeEdgeColor } from "../lib/nodeColors";

interface UseGraphEdgesOptions {
  graph: GraphData;
  setGraph: Dispatch<SetStateAction<GraphData>>;
  pushCommand: (cmd: CanvasCommand) => void;
  setDirty: (dirty: boolean) => void;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
}

export function useGraphEdges({
  graph,
  setGraph,
  pushCommand,
  setDirty,
  setSelectedNodeId,
}: UseGraphEdgesOptions) {
  const graphRef = useRef(graph);
  graphRef.current = graph;

  const applyGraphUpdate = useCallback(
    (mutate: (currentGraph: GraphData) => GraphData) => {
      const currentGraph = graphRef.current;
      const nextGraph = mutate(currentGraph);
      if (nextGraph === currentGraph) {
        return false;
      }

      graphRef.current = nextGraph;
      setGraph(nextGraph);
      setDirty(true);
      pushCommand({ type: "replace-graph", before: currentGraph, after: nextGraph });
      return true;
    },
    [pushCommand, setDirty, setGraph]
  );

  const createCitation = useCallback(
    (sourceId: string, targetId: string, direction: EdgeDirection = "unidirectional") => {
      const currentGraph = graphRef.current;
      const nextGraph = addCitation(currentGraph, sourceId, targetId, direction);
      if (nextGraph === currentGraph) {
        return;
      }

      graphRef.current = nextGraph;
      setGraph(nextGraph);
      setSelectedNodeId(sourceId);
      setDirty(true);
      pushCommand({ type: "link", sourceId, targetId, direction });
    },
    [setGraph, pushCommand, setDirty, setSelectedNodeId]
  );

  const deleteCitation = useCallback(
    (sourceId: string, targetId: string) => {
      const currentGraph = graphRef.current;
      const deletedEdge = currentGraph.edges.find(
        (e) => e.sourceId === sourceId && e.targetId === targetId
      );
      if (!deletedEdge) return;

      const nextGraph = removeCitation(currentGraph, sourceId, targetId);
      if (nextGraph === currentGraph) {
        return;
      }

      graphRef.current = nextGraph;
      setGraph(nextGraph);
      setDirty(true);
      pushCommand({
        type: "unlink",
        sourceId,
        targetId,
        direction: deletedEdge.direction,
      });
    },
    [setGraph, pushCommand, setDirty]
  );

  const updateEdgeDirection = useCallback(
    (edgeId: string, direction: EdgeDirection) => {
      applyGraphUpdate((currentGraph) => {
        const edge = currentGraph.edges.find((currentEdge) => currentEdge.id === edgeId);
        if (!edge || (edge.direction ?? "unidirectional") === direction) {
          return currentGraph;
        }

        return mutatorUpdateEdgeDirection(currentGraph, edgeId, direction);
      });
    },
    [applyGraphUpdate]
  );

  const updateEdgeStyle = useCallback(
    (edgeId: string, style: EdgeStyle) => {
      applyGraphUpdate((currentGraph) => {
        const edge = currentGraph.edges.find((currentEdge) => currentEdge.id === edgeId);
        const currentStyle = edge?.style === "sketch" ? "sketch" : "note-dash";
        if (!edge || currentStyle === style) {
          return currentGraph;
        }

        return mutatorUpdateEdgeStyle(currentGraph, edgeId, style);
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
