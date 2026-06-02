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
import { createWorkspacePatchCommandFromTransaction } from "../useWorkspaceStore";
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
    "workspaceRef" | "dispatchWorkspaceTransaction"
  > {}

export function useGraphNodeLayoutActions({
  workspaceRef,
  dispatchWorkspaceTransaction,
}: UseGraphNodeLayoutActionsOptions) {
  const handleNodeDragEnd = useCallback(
    (nodeId: string, from: { x: number; y: number }, to: { x: number; y: number }) => {
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const currentNodes = beforeGraph.nodes;
      const node = currentNodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Group nodes cannot be nested in other groups
      if (node.type === "group") {
        const candidateTo = snapPositionToGrid(to);
        const finalTo = resolveGroupMoveTarget(
          node.id,
          from,
          candidateTo,
          beforeSizes[node.id] ?? DEFAULT_GROUP_SIZE,
          currentNodes,
          beforePositions,
          beforeSizes
        );

        if (finalTo.x === from.x && finalTo.y === from.y) {
          const revertedPositions = {
            ...beforePositions,
            [nodeId]: from,
          };
          dispatchWorkspaceTransaction({ nodePositions: revertedPositions });
          return;
        }

        if (from.x !== finalTo.x || from.y !== finalTo.y) {
          const nextPositions = {
            ...beforePositions,
            [nodeId]: finalTo,
          };
          const transaction = {
            nodePositions: nextPositions,
            status: { dirty: true },
          };
          dispatchWorkspaceTransaction({
            ...transaction,
            history: {
              type: "push",
              command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
            },
          });
        }
        return;
      }

      // Calculate dropped absolute position
      const absTo = getAbsoluteNodePosition(node, to, beforePositions);

      // Determine if dropped inside a group node (using center of node)
      const nodeSize = beforeSizes[nodeId] ?? estimateNodeSize(node);
      const targetGroup = findContainingGroup({
        nodeId,
        center: getNodeCenter(absTo, nodeSize),
        nodes: currentNodes,
        positions: beforePositions,
        sizes: beforeSizes,
      });

      const oldParentId = node.parentId;
      const newParentId = targetGroup?.id;

      if (oldParentId === newParentId) {
        // Parent didn't change (still same group or still outside)
        if (from.x !== to.x || from.y !== to.y) {
          let nextPositions = {
            ...beforePositions,
            [nodeId]: to,
          };
          let nextSizes = { ...beforeSizes };

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

          const transaction = {
            nodePositions: nextPositions,
            nodeSizes: nextSizes,
            status: { dirty: true },
          };
          dispatchWorkspaceTransaction({
            ...transaction,
            history: {
              type: "push",
              command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
            },
          });
        }
        return;
      }

      // Parent changed, update parentId and tags
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

      const finalToPos = getRelativeNodePosition(absTo, newParentId, beforePositions);

      let nextPositions = {
        ...beforePositions,
        [nodeId]: finalToPos,
      };
      let nextSizes = { ...beforeSizes };

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

      const transaction = {
        graph: afterGraph,
        nodePositions: nextPositions,
        nodeSizes: nextSizes,
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction({
        ...transaction,
        history: {
          type: "push",
          command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
        },
      });
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const handleNodesDragEnd = useCallback(
    (moves: { nodeId: string; from: { x: number; y: number }; to: { x: number; y: number } }[]) => {
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const currentNodes = beforeGraph.nodes;
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

      let afterGraph = beforeGraph;
      const updatedPositions: Record<string, { x: number; y: number }> = {};
      const resolvedGroupPositions = resolveGroupMoveTargets(
        meaningfulMoves,
        beforeGraph.nodes,
        beforePositions,
        beforeSizes
      );

      meaningfulMoves.forEach((move) => {
        const { nodeId, to } = move;
        const node = afterGraph.nodes.find((n) => n.id === nodeId);
        if (!node) {
          updatedPositions[nodeId] = to;
          return;
        }

        if (node.type === "group") {
          const resolvedPosition = resolvedGroupPositions[nodeId] ?? to;
          updatedPositions[nodeId] = resolvedPosition;
          return;
        }

        // Calculate dropped absolute position
        const absTo = getAbsoluteNodePosition(node, to, beforePositions);

        // Bounding box checking
        const nodeSize = beforeSizes[nodeId] ?? estimateNodeSize(node);
        const targetGroup = findContainingGroup({
          nodeId,
          center: getNodeCenter(absTo, nodeSize),
          nodes: afterGraph.nodes,
          positions: beforePositions,
          sizes: beforeSizes,
        });

        const oldParentId = node.parentId;
        const newParentId = targetGroup?.id;

        if (oldParentId === newParentId) {
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
            beforePositions
          );

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
        ...beforePositions,
        ...updatedPositions,
      };
      let nextSizes = { ...beforeSizes };

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

      const transaction = {
        graph: afterGraph,
        nodePositions: nextPositions,
        nodeSizes: nextSizes,
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction({
        ...transaction,
        history: {
          type: "push",
          command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
        },
      });
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const handleNodeResizeEnd = useCallback(
    (nodeId: string, size: { width: number; height: number }) => {
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const node = beforeGraph.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const finalSize = node.type === "group" ? constrainGroupNodeSize(size) : size;
      const before = beforeSizes[nodeId];
      const fallbackBefore = before ?? estimateNodeSize(node);

      if (before && before.width === finalSize.width && before.height === finalSize.height) {
        return;
      }

      if (
        node.type === "group" &&
        isGroupPlacementBlocked(
          nodeId,
          beforePositions[nodeId] ?? { x: 0, y: 0 },
          finalSize,
          beforeGraph.nodes,
          beforePositions,
          beforeSizes
        )
      ) {
        const revertedSizes = {
          ...beforeSizes,
          [nodeId]: fallbackBefore,
        };
        dispatchWorkspaceTransaction({ nodeSizes: revertedSizes });
        return;
      }

      let nextSizes = {
        ...beforeSizes,
        [nodeId]: finalSize,
      };
      let nextPositions = { ...beforePositions };

      const parentId = node.parentId;
      if (parentId) {
        const adjusted = adjustGroupSizeAndPosition(
          parentId,
          beforeGraph.nodes,
          nextPositions,
          nextSizes
        );
        nextPositions = adjusted.positions;
        nextSizes = adjusted.sizes;
      }

      const transaction = {
        nodePositions: nextPositions,
        nodeSizes: nextSizes,
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction({
        ...transaction,
        history: {
          type: "push",
          command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
        },
      });
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const matchGroupNodeSizes = useCallback(
    (nodeIds: string[]) => {
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const currentNodes = beforeGraph.nodes;
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
        beforeSizes[referenceId] ?? estimateNodeSize(referenceNode)
      );
      const nextSizes = { ...beforeSizes };
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

        const before = beforeSizes[nodeId];
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
            beforePositions[nodeId] ?? { x: 0, y: 0 },
            referenceSize,
            currentNodes,
            beforePositions,
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

      const transaction = {
        nodeSizes: nextSizes,
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction({
        ...transaction,
        history: {
          type: "push",
          command: createWorkspacePatchCommandFromTransaction(beforeState, transaction),
        },
      });
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  return {
    handleNodeDragEnd,
    handleNodesDragEnd,
    handleNodeResizeEnd,
    matchGroupNodeSizes,
  };
}
