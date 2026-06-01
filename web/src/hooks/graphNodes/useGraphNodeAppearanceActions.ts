import { useCallback } from "react";
import { updateNodeColor, updateNodeLocked, updateNodeOpacity } from "../../lib/graphMutator";
import type { ApplyGraphUpdate, GraphNodeActionContext } from "./graphNodeActionTypes";

interface UseGraphNodeAppearanceActionsOptions
  extends Pick<GraphNodeActionContext, "graphRef" | "setGraph" | "setDirty" | "pushCommand"> {
  applyGraphUpdate: ApplyGraphUpdate;
}

const clampOpacity = (opacity: number) => Math.min(Math.max(opacity, 0), 1);

export function useGraphNodeAppearanceActions({
  applyGraphUpdate,
  graphRef,
  setGraph,
  setDirty,
  pushCommand,
}: UseGraphNodeAppearanceActionsOptions) {
  const updateGraphNodeColor = useCallback(
    (nodeId: string, color: string) => {
      applyGraphUpdate(
        (currentGraph) => {
          const currentNode = currentGraph.nodes.find((node) => node.id === nodeId);
          if (!currentNode || (currentNode.color ?? "") === color) {
            return currentGraph;
          }

          return updateNodeColor(currentGraph, nodeId, color);
        },
        { pushToHistory: true }
      );
    },
    [applyGraphUpdate]
  );

  const updateGraphNodeLocked = useCallback(
    (nodeId: string, locked: boolean) => {
      applyGraphUpdate(
        (currentGraph) => {
          const currentNode = currentGraph.nodes.find((node) => node.id === nodeId);
          if (!currentNode || Boolean(currentNode.locked) === locked) {
            return currentGraph;
          }

          return updateNodeLocked(currentGraph, nodeId, locked);
        },
        { pushToHistory: true }
      );
    },
    [applyGraphUpdate]
  );

  const updateGraphNodeOpacity = useCallback(
    (nodeId: string, opacity: number) => {
      const currentGraph = graphRef.current;
      const nextGraph = updateNodeOpacity(currentGraph, nodeId, opacity);
      if (nextGraph !== currentGraph) {
        graphRef.current = nextGraph;
        setGraph(nextGraph);
        setDirty(true);
      }
    },
    [graphRef, setDirty, setGraph]
  );

  const commitGraphNodeOpacity = useCallback(
    (nodeId: string, from: number, to: number) => {
      const previousOpacity = clampOpacity(from);
      const nextOpacity = clampOpacity(to);
      if (previousOpacity === nextOpacity) {
        return;
      }

      const currentGraph = graphRef.current;
      const currentNode = currentGraph.nodes.find((node) => node.id === nodeId);
      if (!currentNode) {
        return;
      }

      const beforeGraph = updateNodeOpacity(currentGraph, nodeId, previousOpacity);
      pushCommand({ type: "replace-graph", before: beforeGraph, after: currentGraph });
    },
    [graphRef, pushCommand]
  );

  const updateGraphNodesColor = useCallback(
    (nodeIds: string[], color: string) => {
      applyGraphUpdate(
        (currentGraph) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          const hasMeaningfulChange = uniqueNodeIds.some((nodeId) => {
            const node = currentGraph.nodes.find((currentNode) => currentNode.id === nodeId);
            return node && (node.color ?? "") !== color;
          });

          if (!hasMeaningfulChange) {
            return currentGraph;
          }

          return uniqueNodeIds.reduce(
            (nextGraph, nodeId) => updateNodeColor(nextGraph, nodeId, color),
            currentGraph
          );
        },
        { pushToHistory: true }
      );
    },
    [applyGraphUpdate]
  );

  const updateGraphNodesLocked = useCallback(
    (nodeIds: string[], locked: boolean) => {
      applyGraphUpdate(
        (currentGraph) => {
          const uniqueNodeIds = [...new Set(nodeIds)];
          const hasMeaningfulChange = uniqueNodeIds.some((nodeId) => {
            const node = currentGraph.nodes.find((currentNode) => currentNode.id === nodeId);
            return node && Boolean(node.locked) !== locked;
          });

          if (!hasMeaningfulChange) {
            return currentGraph;
          }

          return uniqueNodeIds.reduce(
            (nextGraph, nodeId) => updateNodeLocked(nextGraph, nodeId, locked),
            currentGraph
          );
        },
        { pushToHistory: true }
      );
    },
    [applyGraphUpdate]
  );

  const updateGraphNodesOpacity = useCallback(
    (nodeIds: string[], opacity: number) => {
      const currentGraph = graphRef.current;
      const nextGraph = nodeIds.reduce(
        (nextGraph, nodeId) => updateNodeOpacity(nextGraph, nodeId, opacity),
        currentGraph
      );
      if (nextGraph !== currentGraph) {
        graphRef.current = nextGraph;
        setGraph(nextGraph);
        setDirty(true);
      }
    },
    [graphRef, setDirty, setGraph]
  );

  const commitGraphNodesOpacity = useCallback(
    (nodeIds: string[], from: number, to: number) => {
      const uniqueNodeIds = [...new Set(nodeIds)];
      const previousOpacity = clampOpacity(from);
      const nextOpacity = clampOpacity(to);
      if (previousOpacity === nextOpacity || uniqueNodeIds.length === 0) {
        return;
      }

      const currentGraph = graphRef.current;
      const beforeGraph = uniqueNodeIds.reduce(
        (nextGraph, nodeId) => updateNodeOpacity(nextGraph, nodeId, previousOpacity),
        currentGraph
      );
      pushCommand({ type: "replace-graph", before: beforeGraph, after: currentGraph });
    },
    [graphRef, pushCommand]
  );

  return {
    updateGraphNodeColor,
    updateGraphNodesColor,
    updateGraphNodeLocked,
    updateGraphNodesLocked,
    updateGraphNodeOpacity,
    commitGraphNodeOpacity,
    updateGraphNodesOpacity,
    commitGraphNodesOpacity,
  };
}
