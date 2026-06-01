import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getDefaultCardTitle, getDefaultGroupTitle, type Locale } from "../i18n";
import { deleteContentCacheEntry } from "../lib/cardContentCache";
import { updateNodeFields } from "../lib/graphMutator";
import { areViewportsEqual } from "../lib/groupNodeLayout";
import { createNodeDraft, deleteNodeDraft, deleteNodesDraft } from "../lib/graphNodeCommands";
import { EMPTY_GRAPH, generateNextId } from "../lib/workspaceState";
import type { CanvasPosition, CanvasViewport, GraphData, GraphNode, NodeSize } from "../types";
import type { CanvasCommand } from "./canvasHistoryTypes";
import type { UpdateGraphNodeOptions } from "./graphNodes/graphNodeActionTypes";
import { useGraphNodeAppearanceActions } from "./graphNodes/useGraphNodeAppearanceActions";
import { useGraphNodeLayoutActions } from "./graphNodes/useGraphNodeLayoutActions";

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

interface ViewportChangeOptions {
  markDirty?: boolean;
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
  const [nodePositions, setNodePositions] = useState<Record<string, CanvasPosition>>({});
  const [nodeSizes, setNodeSizes] = useState<Record<string, NodeSize>>({});
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
    (mutate: (currentGraph: GraphData) => GraphData, options?: UpdateGraphNodeOptions) => {
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
      position: CanvasPosition,
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
      setNodePositions,
      setNodeSizes,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
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
      setNodePositions,
      setNodeSizes,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
    ]
  );

  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      const uniqueNodeIds = [...new Set(nodeIds)];
      const draft = deleteNodesDraft(
        uniqueNodeIds,
        graphRef.current,
        nodePositionsRef.current,
        nodeSizesRef.current
      );
      if (!draft) return;
      draft.removals.forEach(({ nodeId }) => deleteContentCacheEntry(nodeId));

      graphRef.current = draft.graph;
      nodePositionsRef.current = draft.positions;
      nodeSizesRef.current = draft.sizes;

      setGraph(draft.graph);
      setNodePositions(draft.positions);
      setNodeSizes(draft.sizes);
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
        removals: draft.removals,
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
      setNodePositions,
      setNodeSizes,
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

  const {
    updateGraphNodeColor,
    updateGraphNodesColor,
    updateGraphNodeLocked,
    updateGraphNodesLocked,
    updateGraphNodeOpacity,
    commitGraphNodeOpacity,
    updateGraphNodesOpacity,
    commitGraphNodesOpacity,
  } = useGraphNodeAppearanceActions({
    applyGraphUpdate,
    graphRef,
    setGraph,
    setDirty,
    pushCommand,
  });

  const { handleNodeDragEnd, handleNodesDragEnd, handleNodeResizeEnd, matchGroupNodeSizes } =
    useGraphNodeLayoutActions({
      graphRef,
      nodePositionsRef,
      nodeSizesRef,
      setGraph,
      setNodePositions,
      setNodeSizes,
      setDirty,
      pushCommand,
    });

  const handleViewportChange = useCallback(
    (vp: CanvasViewport, options?: ViewportChangeOptions) => {
      if (!areViewportsEqual(viewportRef.current, vp)) {
        setViewport(vp);
        if (options?.markDirty !== false) {
          setDirty(true);
        }
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
