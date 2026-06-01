import { useCallback } from "react";
import {
  DEFAULT_GROUP_SIZE,
  constrainGroupNodeSize,
  snapPositionToGrid,
} from "../../lib/graphLayout";
import { estimateNodeSize } from "../../lib/graphNodeMetrics";
import {
  adjustGroupSizeAndPosition,
  isGroupPlacementBlocked,
  resolveGroupMoveTarget,
  resolveGroupMoveTargets,
} from "../../lib/groupNodeLayout";
import type { NodeSize } from "../../types";
import type { GraphNodeActionContext } from "./graphNodeActionTypes";
import {
  findContainingGroup,
  getAbsoluteNodePosition,
  getNodeCenter,
  getRelativeNodePosition,
  updateNodeParentMetadata,
} from "./graphNodeLayoutUtils";

interface UseGraphNodeLayoutActionsOptions
  extends Pick<
    GraphNodeActionContext,
    | "graphRef"
    | "nodePositionsRef"
    | "nodeSizesRef"
    | "setGraph"
    | "setNodePositions"
    | "setNodeSizes"
    | "setDirty"
    | "pushCommand"
  > {}

export function useGraphNodeLayoutActions({
  graphRef,
  nodePositionsRef,
  nodeSizesRef,
  setGraph,
  setNodePositions,
  setNodeSizes,
  setDirty,
  pushCommand,
}: UseGraphNodeLayoutActionsOptions) {
  const handleNodeDragEnd = useCallback(
    (nodeId: string, from: { x: number; y: number }, to: { x: number; y: number }) => {
      const currentNodes = graphRef.current.nodes;
      const node = currentNodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Group nodes cannot be nested in other groups
      if (node.type === "group") {
        const candidateTo = snapPositionToGrid(to);
        const finalTo = resolveGroupMoveTarget(
          node.id,
          from,
          candidateTo,
          nodeSizesRef.current[node.id] ?? DEFAULT_GROUP_SIZE,
          currentNodes,
          nodePositionsRef.current,
          nodeSizesRef.current
        );

        if (finalTo.x === from.x && finalTo.y === from.y) {
          const revertedPositions = {
            ...nodePositionsRef.current,
            [nodeId]: from,
          };
          nodePositionsRef.current = revertedPositions;
          setNodePositions(revertedPositions);
          return;
        }

        if (from.x !== finalTo.x || from.y !== finalTo.y) {
          setNodePositions((currentPositions) => ({
            ...currentPositions,
            [nodeId]: finalTo,
          }));
          setDirty(true);
          pushCommand({ type: "move", nodeId, from, to: finalTo });
        }
        return;
      }

      // Calculate dropped absolute position
      const absTo = getAbsoluteNodePosition(node, to, nodePositionsRef.current);

      // Determine if dropped inside a group node (using center of node)
      const nodeSize = nodeSizesRef.current[nodeId] ?? estimateNodeSize(node);
      const targetGroup = findContainingGroup({
        nodeId,
        center: getNodeCenter(absTo, nodeSize),
        nodes: currentNodes,
        positions: nodePositionsRef.current,
        sizes: nodeSizesRef.current,
      });

      const oldParentId = node.parentId;
      const newParentId = targetGroup?.id;

      if (oldParentId === newParentId) {
        // Parent didn't change (still same group or still outside)
        if (from.x !== to.x || from.y !== to.y) {
          let nextPositions = {
            ...nodePositionsRef.current,
            [nodeId]: to,
          };
          let nextSizes = { ...nodeSizesRef.current };

          if (newParentId) {
            const adjusted = adjustGroupSizeAndPosition(
              newParentId,
              currentNodes,
              nextPositions,
              nextSizes
            );
            nextPositions = adjusted.positions;
            nextSizes = adjusted.sizes;
          }

          nodePositionsRef.current = nextPositions;
          setNodePositions(nextPositions);
          setNodeSizes(nextSizes);
          setDirty(true);
          pushCommand({ type: "move", nodeId, from, to: nextPositions[nodeId] });
        }
        return;
      }

      // Parent changed, update parentId and tags
      const beforeGraph = graphRef.current;
      const updatedAt = new Date().toISOString();
      const afterGraph = {
        ...beforeGraph,
        nodes: beforeGraph.nodes.map((n) => {
          if (n.id !== nodeId) return n;

          return updateNodeParentMetadata({
            node: n,
            nodes: beforeGraph.nodes,
            oldParentId,
            newParentGroup: targetGroup,
            updatedAt,
          });
        }),
      };

      const finalToPos = getRelativeNodePosition(absTo, newParentId, nodePositionsRef.current);

      let nextPositions = {
        ...nodePositionsRef.current,
        [nodeId]: finalToPos,
      };
      let nextSizes = { ...nodeSizesRef.current };

      if (newParentId) {
        const adjusted = adjustGroupSizeAndPosition(
          newParentId,
          afterGraph.nodes,
          nextPositions,
          nextSizes
        );
        nextPositions = adjusted.positions;
        nextSizes = adjusted.sizes;
      }

      if (oldParentId) {
        const adjusted = adjustGroupSizeAndPosition(
          oldParentId,
          afterGraph.nodes,
          nextPositions,
          nextSizes
        );
        nextPositions = adjusted.positions;
        nextSizes = adjusted.sizes;
      }

      graphRef.current = afterGraph;
      setGraph(afterGraph);
      nodePositionsRef.current = nextPositions;
      setNodePositions(nextPositions);
      setNodeSizes(nextSizes);
      setDirty(true);

      pushCommand({
        type: "move",
        nodeId,
        from,
        to: nextPositions[nodeId],
        graphBefore: beforeGraph,
        graphAfter: afterGraph,
      });
    },
    [
      graphRef,
      nodePositionsRef,
      nodeSizesRef,
      pushCommand,
      setDirty,
      setGraph,
      setNodePositions,
      setNodeSizes,
    ]
  );

  const handleNodesDragEnd = useCallback(
    (moves: { nodeId: string; from: { x: number; y: number }; to: { x: number; y: number } }[]) => {
      const currentNodes = graphRef.current.nodes;
      const normalizedMoves = moves.map((move) =>
        currentNodes.some((node) => node.id === move.nodeId && node.type === "group")
          ? { ...move, to: snapPositionToGrid(move.to) }
          : move
      );
      const meaningfulMoves = normalizedMoves.filter(
        (move) => move.from.x !== move.to.x || move.from.y !== move.to.y
      );
      if (meaningfulMoves.length === 0) {
        return;
      }

      const beforeGraph = graphRef.current;
      let afterGraph = beforeGraph;
      const finalMoves: typeof moves = [];
      const updatedPositions: Record<string, { x: number; y: number }> = {};
      const resolvedGroupPositions = resolveGroupMoveTargets(
        meaningfulMoves,
        beforeGraph.nodes,
        nodePositionsRef.current,
        nodeSizesRef.current
      );

      meaningfulMoves.forEach((move) => {
        const { nodeId, from, to } = move;
        const node = afterGraph.nodes.find((n) => n.id === nodeId);
        if (!node) {
          finalMoves.push(move);
          updatedPositions[nodeId] = to;
          return;
        }

        if (node.type === "group") {
          const resolvedPosition = resolvedGroupPositions[nodeId] ?? to;
          updatedPositions[nodeId] = resolvedPosition;
          if (from.x !== resolvedPosition.x || from.y !== resolvedPosition.y) {
            finalMoves.push({
              nodeId,
              from,
              to: resolvedPosition,
            });
          }
          return;
        }

        // Calculate dropped absolute position
        const absTo = getAbsoluteNodePosition(node, to, nodePositionsRef.current);

        // Bounding box checking
        const nodeSize = nodeSizesRef.current[nodeId] ?? estimateNodeSize(node);
        const targetGroup = findContainingGroup({
          nodeId,
          center: getNodeCenter(absTo, nodeSize),
          nodes: afterGraph.nodes,
          positions: nodePositionsRef.current,
          sizes: nodeSizesRef.current,
        });

        const oldParentId = node.parentId;
        const newParentId = targetGroup?.id;

        if (oldParentId === newParentId) {
          finalMoves.push(move);
          updatedPositions[nodeId] = to;
        } else {
          const updatedAt = new Date().toISOString();
          afterGraph = {
            ...afterGraph,
            nodes: afterGraph.nodes.map((n) => {
              if (n.id !== nodeId) return n;

              return updateNodeParentMetadata({
                node: n,
                nodes: afterGraph.nodes,
                oldParentId,
                newParentGroup: targetGroup,
                updatedAt,
              });
            }),
          };

          const finalToPos = getRelativeNodePosition(
            absTo,
            newParentId,
            nodePositionsRef.current
          );

          finalMoves.push({
            nodeId,
            from,
            to: finalToPos,
          });
          updatedPositions[nodeId] = finalToPos;
        }
      });

      const affectedGroups = new Set<string>();
      meaningfulMoves.forEach((move) => {
        const node = beforeGraph.nodes.find((n) => n.id === move.nodeId);
        if (node && node.type !== "group") {
          if (node.parentId) affectedGroups.add(node.parentId);
          const targetNode = afterGraph.nodes.find((n) => n.id === move.nodeId);
          if (targetNode && targetNode.parentId) affectedGroups.add(targetNode.parentId);
        }
      });

      let nextPositions = {
        ...nodePositionsRef.current,
        ...updatedPositions,
      };
      let nextSizes = { ...nodeSizesRef.current };

      affectedGroups.forEach((groupId) => {
        const adjusted = adjustGroupSizeAndPosition(
          groupId,
          afterGraph.nodes,
          nextPositions,
          nextSizes
        );
        nextPositions = adjusted.positions;
        nextSizes = adjusted.sizes;
      });

      const finalAdjustedMoves = finalMoves.map((m) => ({
        ...m,
        to: nextPositions[m.nodeId] ?? m.to,
      }));

      nodePositionsRef.current = nextPositions;
      setNodePositions(nextPositions);
      setNodeSizes(nextSizes);

      const graphChanged = afterGraph !== beforeGraph;
      if (graphChanged) {
        graphRef.current = afterGraph;
        setGraph(afterGraph);
      }
      setDirty(true);

      pushCommand({
        type: "move-many",
        moves: finalAdjustedMoves,
        graphBefore: graphChanged ? beforeGraph : undefined,
        graphAfter: graphChanged ? afterGraph : undefined,
      });
    },
    [
      graphRef,
      nodePositionsRef,
      nodeSizesRef,
      pushCommand,
      setDirty,
      setGraph,
      setNodePositions,
      setNodeSizes,
    ]
  );

  const handleNodeResizeEnd = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const finalSize = node.type === "group" ? constrainGroupNodeSize(size) : size;
      const before = nodeSizesRef.current[nodeId];
      const fallbackBefore = before ?? estimateNodeSize(node);

      if (before && before.width === finalSize.width && before.height === finalSize.height) {
        return;
      }

      if (
        node.type === "group" &&
        isGroupPlacementBlocked(
          nodeId,
          nodePositionsRef.current[nodeId] ?? { x: 0, y: 0 },
          finalSize,
          graphRef.current.nodes,
          nodePositionsRef.current,
          nodeSizesRef.current
        )
      ) {
        const revertedSizes = {
          ...nodeSizesRef.current,
          [nodeId]: fallbackBefore,
        };
        nodeSizesRef.current = revertedSizes;
        setNodeSizes(revertedSizes);
        return;
      }

      let nextSizes = {
        ...nodeSizesRef.current,
        [nodeId]: finalSize,
      };
      let nextPositions = { ...nodePositionsRef.current };

      const parentId = node.parentId;
      if (parentId) {
        const adjusted = adjustGroupSizeAndPosition(
          parentId,
          graphRef.current.nodes,
          nextPositions,
          nextSizes
        );
        nextPositions = adjusted.positions;
        nextSizes = adjusted.sizes;
      }

      nodePositionsRef.current = nextPositions;
      setNodePositions(nextPositions);
      setNodeSizes(nextSizes);
      setDirty(true);
      pushCommand({ type: "resize", nodeId, before, after: finalSize });
    },
    [
      graphRef,
      nodePositionsRef,
      nodeSizesRef,
      pushCommand,
      setDirty,
      setNodePositions,
      setNodeSizes,
    ]
  );

  const matchGroupNodeSizes = useCallback(
    (nodeIds: string[]) => {
      const currentNodes = graphRef.current.nodes;
      const currentNodeById = new Map(currentNodes.map((node) => [node.id, node]));
      const orderedGroupIds = [...new Set(nodeIds)].filter(
        (nodeId) => currentNodeById.get(nodeId)?.type === "group"
      );
      const referenceId = orderedGroupIds[0];
      const referenceNode = referenceId ? currentNodeById.get(referenceId) : undefined;
      if (!referenceId || !referenceNode || orderedGroupIds.length < 2) {
        return;
      }

      const referenceSize = constrainGroupNodeSize(
        nodeSizesRef.current[referenceId] ?? estimateNodeSize(referenceNode)
      );
      const nextSizes = { ...nodeSizesRef.current };
      const resizes: {
        nodeId: string;
        before: NodeSize | undefined;
        after: NodeSize;
      }[] = [];

      orderedGroupIds.forEach((nodeId) => {
        const node = currentNodeById.get(nodeId);
        if (!node || (nodeId !== referenceId && node.locked)) {
          return;
        }

        const before = nodeSizesRef.current[nodeId];
        const fallbackBefore = before ?? estimateNodeSize(node);
        if (
          fallbackBefore.width === referenceSize.width &&
          fallbackBefore.height === referenceSize.height
        ) {
          return;
        }

        if (
          isGroupPlacementBlocked(
            nodeId,
            nodePositionsRef.current[nodeId] ?? { x: 0, y: 0 },
            referenceSize,
            currentNodes,
            nodePositionsRef.current,
            nextSizes
          )
        ) {
          return;
        }

        nextSizes[nodeId] = referenceSize;
        resizes.push({ nodeId, before, after: referenceSize });
      });

      if (resizes.length === 0) {
        return;
      }

      nodeSizesRef.current = nextSizes;
      setNodeSizes(nextSizes);
      setDirty(true);
      pushCommand({ type: "resize-many", resizes });
    },
    [graphRef, nodePositionsRef, nodeSizesRef, pushCommand, setDirty, setNodeSizes]
  );

  return {
    handleNodeDragEnd,
    handleNodesDragEnd,
    handleNodeResizeEnd,
    matchGroupNodeSizes,
  };
}
