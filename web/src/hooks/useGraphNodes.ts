import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getDefaultCardTitle, getDefaultGroupTitle, type Locale } from "../i18n";
import { deleteContentCacheEntry } from "../lib/cardContentCache";
import {
  removeNode,
  updateNodeColor,
  updateNodeFields,
  updateNodeLocked,
  updateNodeOpacity,
} from "../lib/graphMutator";
import {
  DEFAULT_GROUP_SIZE,
  constrainGroupNodeSize,
  snapPositionToGrid,
} from "../lib/graphLayout";
import {
  adjustGroupSizeAndPosition,
  areViewportsEqual,
  detachChildrenFromGroup,
  isGroupPlacementBlocked,
  resolveGroupMoveTarget,
  resolveGroupMoveTargets,
} from "../lib/groupNodeLayout";
import { createNodeDraft, deleteNodeDraft } from "../lib/graphNodeCommands";
import { estimateNodeSize } from "../lib/graphNodeMetrics";
import { EMPTY_GRAPH, generateNextId } from "../lib/workspaceState";
import type { CanvasViewport, GraphData, GraphNode, NodeSize } from "../types";
import type { CanvasCommand, RemoveManyMeta, RemoveMeta } from "./canvasHistoryTypes";

interface UseGraphNodesOptions {
  locale?: Locale;
  pushCommand: (cmd: CanvasCommand) => void;
  setDirty: (dirty: boolean) => void;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedNodeIds: Dispatch<SetStateAction<string[]>>;
  setEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setQuickEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setPendingInspectorContentFocusNodeId: Dispatch<SetStateAction<string | null>>;
}

interface UpdateGraphNodeOptions {
  pushToHistory?: boolean;
}

export function useGraphNodes({
  locale = "zh-CN",
  pushCommand,
  setDirty,
  setSelectedNodeId,
  setSelectedNodeIds,
  setEditingNodeId,
  setQuickEditingNodeId,
  setPendingInspectorContentFocusNodeId,
}: UseGraphNodesOptions) {
  const [graph, setGraph] = useState<GraphData>(EMPTY_GRAPH);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [viewport, setViewport] = useState<CanvasViewport | null>(null);

  const graphRef = useRef(graph);
  graphRef.current = graph;

  const nodePositionsRef = useRef(nodePositions);
  nodePositionsRef.current = nodePositions;

  const nodeSizesRef = useRef(nodeSizes);
  nodeSizesRef.current = nodeSizes;

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const applyGraphUpdate = useCallback(
    (mutate: (currentGraph: GraphData) => GraphData, options?: { pushToHistory?: boolean }) => {
      const currentGraph = graphRef.current;
      const nextGraph = mutate(currentGraph);
      if (nextGraph === currentGraph) {
        return false;
      }

      graphRef.current = nextGraph;
      setGraph(nextGraph);
      setDirty(true);

      if (options?.pushToHistory) {
        pushCommand({ type: "replace-graph", before: currentGraph, after: nextGraph });
      }

      return true;
    },
    [pushCommand, setDirty]
  );

  const createNode = useCallback(
    (
      type: GraphNode["type"],
      position: { x: number; y: number },
      imagePath?: string,
      parentId?: string
    ) => {
      const id = generateNextId(graphRef.current.nodes);
      const now = new Date();
      const createdAt = now.toISOString();
      const draft = createNodeDraft({
        createdAt,
        defaultCardTitle: getDefaultCardTitle(locale),
        defaultGroupTitle: getDefaultGroupTitle(locale),
        graph: graphRef.current,
        id,
        imagePath,
        parentId,
        position,
        positions: nodePositionsRef.current,
        sizes: nodeSizesRef.current,
        type,
      });

      graphRef.current = draft.graph;
      nodePositionsRef.current = draft.positions;
      nodeSizesRef.current = draft.sizes;
      setGraph(draft.graph);
      setNodePositions(draft.positions);
      setNodeSizes(draft.sizes);
      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
      setQuickEditingNodeId(type === "card" || type === "group" ? id : null);
      setPendingInspectorContentFocusNodeId(null);
      setDirty(true);
      pushCommand({
        type: "add",
        nodeId: id,
        nodeData: draft.node,
        position: draft.position,
        size: draft.size,
      });
    },
    [
      locale,
      pushCommand,
      setDirty,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
      setNodeSizes,
    ]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const draft = deleteNodeDraft(
        nodeId,
        graphRef.current,
        nodePositionsRef.current,
        nodeSizesRef.current
      );
      if (!draft) return;
      deleteContentCacheEntry(nodeId);

      graphRef.current = draft.graph;
      nodePositionsRef.current = draft.positions;
      nodeSizesRef.current = draft.sizes;

      setGraph(draft.graph);
      setNodePositions(draft.positions);
      setNodeSizes(draft.sizes);

      setSelectedNodeId((currentSelectedNodeId) =>
        currentSelectedNodeId === nodeId ? null : currentSelectedNodeId
      );
      setSelectedNodeIds((currentSelectedNodeIds) =>
        currentSelectedNodeIds.filter((selectedId) => selectedId !== nodeId)
      );
      setEditingNodeId((currentEditingNodeId) =>
        currentEditingNodeId === nodeId ? null : currentEditingNodeId
      );
      setQuickEditingNodeId((currentQuickEditingNodeId) =>
        currentQuickEditingNodeId === nodeId ? null : currentQuickEditingNodeId
      );
      setPendingInspectorContentFocusNodeId((currentPendingNodeId) =>
        currentPendingNodeId === nodeId ? null : currentPendingNodeId
      );
      setDirty(true);

      pushCommand({
        type: "remove",
        nodeId,
        meta: draft.meta,
        graphBefore: draft.graphBefore,
        graphAfter: draft.graphAfter,
        positionsBefore: draft.positionsBefore,
        positionsAfter: draft.positionsAfter,
        sizesBefore: draft.sizesBefore,
        sizesAfter: draft.sizesAfter,
      });
    },
    [
      pushCommand,
      setDirty,
      setEditingNodeId,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
    ]
  );

  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      const uniqueNodeIds = [...new Set(nodeIds)];
      if (uniqueNodeIds.length === 0) {
        return;
      }

      const removals: RemoveManyMeta[] = [];
      const originalGraph = graphRef.current;
      const originalPositions = nodePositionsRef.current;
      const originalSizes = nodeSizesRef.current;
      let usedSnapshotCommand = false;

      uniqueNodeIds.forEach((nodeId) => {
        const nodeToDelete = graphRef.current.nodes.find((node) => node.id === nodeId);
        let graphBeforeRemoval = graphRef.current;
        let positionsBeforeRemoval = nodePositionsRef.current;
        let sizesBeforeRemoval = nodeSizesRef.current;

        if (nodeToDelete?.type === "group") {
          const detached = detachChildrenFromGroup(
            nodeId,
            nodeToDelete.title,
            graphBeforeRemoval,
            positionsBeforeRemoval,
            sizesBeforeRemoval
          );
          graphBeforeRemoval = detached.graph;
          positionsBeforeRemoval = detached.positions;
          sizesBeforeRemoval = detached.sizes;
          usedSnapshotCommand = true;
        }

        const {
          graph: nextGraph,
          removedNode,
          removedEdges,
          affectedRefs,
        } = removeNode(graphBeforeRemoval, nodeId);
        if (!removedNode || removedNode.id !== nodeId) {
          return;
        }
        deleteContentCacheEntry(nodeId);

        const removedNodePos = nodePositionsRef.current[nodeId] ?? { x: 0, y: 0 };
        const removedNodeSize = nodeSizesRef.current[nodeId];
        const nextPositions = { ...positionsBeforeRemoval };
        delete nextPositions[nodeId];
        const nextSizes = { ...sizesBeforeRemoval };
        delete nextSizes[nodeId];

        graphRef.current = nextGraph;
        nodePositionsRef.current = nextPositions;
        nodeSizesRef.current = nextSizes;

        const removeMeta: RemoveMeta = {
          removedNode,
          position: removedNodePos,
          size: removedNodeSize,
          removedEdges,
          affectedRefs,
        };
        removals.push({ nodeId, meta: removeMeta });
      });

      if (removals.length === 0) {
        return;
      }

      const affectedParents = new Set<string>();
      removals.forEach((r) => {
        if (r.meta.removedNode.parentId) {
          affectedParents.add(r.meta.removedNode.parentId);
        }
      });

      if (affectedParents.size > 0) {
        let nextPositions = { ...nodePositionsRef.current };
        let nextSizes = { ...nodeSizesRef.current };
        affectedParents.forEach((parentId) => {
          const adjusted = adjustGroupSizeAndPosition(
            parentId,
            graphRef.current.nodes,
            nextPositions,
            nextSizes
          );
          nextPositions = adjusted.positions;
          nextSizes = adjusted.sizes;
        });
        nodePositionsRef.current = nextPositions;
        nodeSizesRef.current = nextSizes;
        setNodeSizes(nextSizes);
      }

      setGraph(graphRef.current);
      setNodePositions(nodePositionsRef.current);
      setNodeSizes(nodeSizesRef.current);
      setSelectedNodeId(null);
      setSelectedNodeIds([]);
      setEditingNodeId((currentEditingNodeId) =>
        currentEditingNodeId && uniqueNodeIds.includes(currentEditingNodeId)
          ? null
          : currentEditingNodeId
      );
      setQuickEditingNodeId((currentQuickEditingNodeId) =>
        currentQuickEditingNodeId && uniqueNodeIds.includes(currentQuickEditingNodeId)
          ? null
          : currentQuickEditingNodeId
      );
      setPendingInspectorContentFocusNodeId((currentPendingNodeId) =>
        currentPendingNodeId && uniqueNodeIds.includes(currentPendingNodeId)
          ? null
          : currentPendingNodeId
      );
      setDirty(true);
      pushCommand({
        type: "remove-many",
        removals,
        graphBefore: usedSnapshotCommand ? originalGraph : undefined,
        graphAfter: usedSnapshotCommand ? graphRef.current : undefined,
        positionsBefore: usedSnapshotCommand ? originalPositions : undefined,
        positionsAfter: usedSnapshotCommand ? nodePositionsRef.current : undefined,
        sizesBefore: usedSnapshotCommand ? originalSizes : undefined,
        sizesAfter: usedSnapshotCommand ? nodeSizesRef.current : undefined,
      });
    },
    [
      pushCommand,
      setDirty,
      setEditingNodeId,
      setNodePositions,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
    ]
  );

  const updateGraphNode = useCallback(
    (updatedNode: GraphNode, options?: UpdateGraphNodeOptions) => {
      applyGraphUpdate((currentGraph) => {
        const currentNode = currentGraph.nodes.find((node) => node.id === updatedNode.id);
        if (!currentNode || JSON.stringify(currentNode) === JSON.stringify(updatedNode)) {
          return currentGraph;
        }

        return updateNodeFields(currentGraph, updatedNode);
      }, options);
    },
    [applyGraphUpdate]
  );

  const commitGraphNode = useCallback(
    (updatedNode: GraphNode) => {
      updateGraphNode(updatedNode, { pushToHistory: true });
    },
    [updateGraphNode]
  );

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
    [setDirty]
  );

  const commitGraphNodeOpacity = useCallback(
    (nodeId: string, from: number, to: number) => {
      const previousOpacity = Math.min(Math.max(from, 0), 1);
      const nextOpacity = Math.min(Math.max(to, 0), 1);
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
    [pushCommand]
  );

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
      let absTo = { ...to };
      if (node.parentId) {
        const parentPos = nodePositionsRef.current[node.parentId] ?? { x: 0, y: 0 };
        absTo = { x: to.x + parentPos.x, y: to.y + parentPos.y };
      }

      // Determine if dropped inside a group node (using center of node)
      const nodeSize = nodeSizesRef.current[nodeId] ?? estimateNodeSize(node);
      const centerX = absTo.x + nodeSize.width / 2;
      const centerY = absTo.y + nodeSize.height / 2;

      let targetGroup: GraphNode | undefined;
      for (const otherNode of currentNodes) {
        if (otherNode.id !== nodeId && otherNode.type === "group") {
          const gPos = nodePositionsRef.current[otherNode.id] ?? { x: 0, y: 0 };
          const gSize = nodeSizesRef.current[otherNode.id] ?? DEFAULT_GROUP_SIZE;
          if (
            centerX >= gPos.x &&
            centerX <= gPos.x + gSize.width &&
            centerY >= gPos.y &&
            centerY <= gPos.y + gSize.height
          ) {
            targetGroup = otherNode;
            break;
          }
        }
      }

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
      const afterGraph = {
        ...beforeGraph,
        nodes: beforeGraph.nodes.map((n) => {
          if (n.id !== nodeId) return n;

          let nextTags = [...n.tags];
          // Remove old parent's tag
          if (oldParentId) {
            const oldGroup = beforeGraph.nodes.find((gn) => gn.id === oldParentId);
            if (oldGroup && oldGroup.title) {
              nextTags = nextTags.filter((t) => t !== oldGroup.title);
            }
          }
          // Add new parent's tag
          if (newParentId && targetGroup && targetGroup.title) {
            if (!nextTags.includes(targetGroup.title)) {
              nextTags.push(targetGroup.title);
            }
          }

          return {
            ...n,
            parentId: newParentId,
            tags: nextTags,
            updatedAt: new Date().toISOString(),
          };
        }),
      };

      const finalToPos = newParentId
        ? {
            x: absTo.x - (nodePositionsRef.current[newParentId]?.x ?? 0),
            y: absTo.y - (nodePositionsRef.current[newParentId]?.y ?? 0),
          }
        : absTo;

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
    [pushCommand, setDirty]
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
        let absTo = { ...to };
        if (node.parentId) {
          const parentPos = nodePositionsRef.current[node.parentId] ?? { x: 0, y: 0 };
          absTo = { x: to.x + parentPos.x, y: to.y + parentPos.y };
        }

        // Bounding box checking
        const nodeSize = nodeSizesRef.current[nodeId] ?? estimateNodeSize(node);
        const centerX = absTo.x + nodeSize.width / 2;
        const centerY = absTo.y + nodeSize.height / 2;

        let targetGroup: GraphNode | undefined;
        for (const otherNode of afterGraph.nodes) {
          if (otherNode.id !== nodeId && otherNode.type === "group") {
            const gPos = nodePositionsRef.current[otherNode.id] ?? { x: 0, y: 0 };
            const gSize = nodeSizesRef.current[otherNode.id] ?? DEFAULT_GROUP_SIZE;
            if (
              centerX >= gPos.x &&
              centerX <= gPos.x + gSize.width &&
              centerY >= gPos.y &&
              centerY <= gPos.y + gSize.height
            ) {
              targetGroup = otherNode;
              break;
            }
          }
        }

        const oldParentId = node.parentId;
        const newParentId = targetGroup?.id;

        if (oldParentId === newParentId) {
          finalMoves.push(move);
          updatedPositions[nodeId] = to;
        } else {
          afterGraph = {
            ...afterGraph,
            nodes: afterGraph.nodes.map((n) => {
              if (n.id !== nodeId) return n;

              let nextTags = [...n.tags];
              if (oldParentId) {
                const oldGroup = afterGraph.nodes.find((gn) => gn.id === oldParentId);
                if (oldGroup && oldGroup.title) {
                  nextTags = nextTags.filter((t) => t !== oldGroup.title);
                }
              }
              if (newParentId && targetGroup && targetGroup.title) {
                if (!nextTags.includes(targetGroup.title)) {
                  nextTags.push(targetGroup.title);
                }
              }

              return {
                ...n,
                parentId: newParentId,
                tags: nextTags,
                updatedAt: new Date().toISOString(),
              };
            }),
          };

          const finalToPos = newParentId
            ? {
                x: absTo.x - (nodePositionsRef.current[newParentId]?.x ?? 0),
                y: absTo.y - (nodePositionsRef.current[newParentId]?.y ?? 0),
              }
            : absTo;

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
    [pushCommand, setDirty]
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
    [setDirty]
  );

  const commitGraphNodesOpacity = useCallback(
    (nodeIds: string[], from: number, to: number) => {
      const uniqueNodeIds = [...new Set(nodeIds)];
      const previousOpacity = Math.min(Math.max(from, 0), 1);
      const nextOpacity = Math.min(Math.max(to, 0), 1);
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
    [pushCommand]
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
    [pushCommand, setDirty]
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
        if (fallbackBefore.width === referenceSize.width && fallbackBefore.height === referenceSize.height) {
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
    [pushCommand, setDirty]
  );

  const handleViewportChange = useCallback(
    (vp: CanvasViewport) => {
      if (!areViewportsEqual(viewportRef.current, vp)) {
        setViewport(vp);
        setDirty(true);
      }
    },
    [setDirty]
  );

  return {
    graph,
    setGraph,
    nodePositions,
    setNodePositions,
    nodeSizes,
    setNodeSizes,
    viewport,
    setViewport,
    createNode,
    deleteNode,
    deleteNodes,
    updateGraphNode,
    commitGraphNode,
    updateGraphNodeColor,
    updateGraphNodesColor,
    updateGraphNodeLocked,
    updateGraphNodesLocked,
    updateGraphNodeOpacity,
    commitGraphNodeOpacity,
    updateGraphNodesOpacity,
    commitGraphNodesOpacity,
    handleNodeDragEnd,
    handleNodesDragEnd,
    handleNodeResizeEnd,
    matchGroupNodeSizes,
    handleViewportChange,
  };
}
