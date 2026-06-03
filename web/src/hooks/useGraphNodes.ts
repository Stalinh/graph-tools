import { useCallback } from 'react';
import { getDefaultCardTitle, getDefaultGroupTitle, type Locale } from '../i18n';
import { deleteContentCacheEntry } from '../lib/cardContentCache';
import { updateNodeFields } from '../lib/graphMutator';
import { areViewportsEqual } from '../lib/groupNodeLayout';
import { createNodeDraft, deleteNodeDraft, deleteNodesDraft } from '../lib/graphNodeCommands';
import { generateNextId } from '../lib/workspaceState';
import type { CanvasPosition, CanvasViewport, GraphData, GraphNode } from '../types';
import type { UpdateGraphNodeOptions } from './graphNodes/graphNodeActionTypes';
import { useGraphNodeAppearanceActions } from './graphNodes/useGraphNodeAppearanceActions';
import { useGraphNodeLayoutActions } from './graphNodes/useGraphNodeLayoutActions';
import {
  createWorkspacePatchCommandFromTransaction,
  type WorkspaceStoreController,
  type WorkspaceTransaction,
} from './useWorkspaceStore';

interface UseGraphNodesOptions extends Pick<
  WorkspaceStoreController,
  'workspace' | 'workspaceRef' | 'dispatchWorkspaceTransaction'
> {
  locale?: Locale;
}

interface ViewportChangeOptions {
  markDirty?: boolean;
}

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

export function useGraphNodes({
  locale = 'zh-CN',
  workspace,
  workspaceRef,
  dispatchWorkspaceTransaction,
}: UseGraphNodesOptions) {
  const applyGraphUpdate = useCallback(
    (mutate: (currentGraph: GraphData) => GraphData, options?: UpdateGraphNodeOptions) => {
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
      dispatchWorkspaceTransaction(
        options?.pushToHistory ? withHistory(beforeState, transaction) : transaction
      );
      return true;
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const createNode = useCallback(
    (type: GraphNode['type'], position: CanvasPosition, imagePath?: string, parentId?: string) => {
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const id = generateNextId(beforeGraph.nodes);
      const now = new Date();
      const createdAt = now.toISOString();
      const draft = createNodeDraft({
        createdAt,
        defaultCardTitle: getDefaultCardTitle(locale),
        defaultGroupTitle: getDefaultGroupTitle(locale),
        graph: beforeGraph,
        id,
        imagePath,
        parentId,
        position,
        positions: beforePositions,
        sizes: beforeSizes,
        type,
      });

      const transaction: WorkspaceTransaction = {
        graph: draft.graph,
        nodePositions: draft.positions,
        nodeSizes: draft.sizes,
        selection: {
          selectedNodeIds: [id],
          quickEditingNodeId: type === 'card' || type === 'group' ? id : null,
          pendingInspectorContentFocusNodeId: null,
        },
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction(withHistory(beforeState, transaction));
    },
    [dispatchWorkspaceTransaction, locale, workspaceRef]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const draft = deleteNodeDraft(nodeId, beforeGraph, beforePositions, beforeSizes);
      if (!draft) return;
      deleteContentCacheEntry(nodeId);

      const selectedNodeIds =
        beforeState.selection.selectedNodeIds[0] === nodeId
          ? []
          : beforeState.selection.selectedNodeIds.filter((selectedId) => selectedId !== nodeId);
      const transaction: WorkspaceTransaction = {
        graph: draft.graph,
        nodePositions: draft.positions,
        nodeSizes: draft.sizes,
        selection: {
          selectedNodeIds,
          editingNodeId:
            beforeState.selection.editingNodeId === nodeId
              ? null
              : beforeState.selection.editingNodeId,
          quickEditingNodeId:
            beforeState.selection.quickEditingNodeId === nodeId
              ? null
              : beforeState.selection.quickEditingNodeId,
          pendingInspectorContentFocusNodeId:
            beforeState.selection.pendingInspectorContentFocusNodeId === nodeId
              ? null
              : beforeState.selection.pendingInspectorContentFocusNodeId,
        },
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction(withHistory(beforeState, transaction));
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      const uniqueNodeIds = [...new Set(nodeIds)];
      const beforeState = workspaceRef.current;
      const beforeGraph = beforeState.graph;
      const beforePositions = beforeState.nodePositions;
      const beforeSizes = beforeState.nodeSizes;
      const draft = deleteNodesDraft(uniqueNodeIds, beforeGraph, beforePositions, beforeSizes);
      if (!draft) return;
      draft.removedNodeIds.forEach((nodeId) => deleteContentCacheEntry(nodeId));

      const removedNodeIds = new Set(uniqueNodeIds);
      const transaction: WorkspaceTransaction = {
        graph: draft.graph,
        nodePositions: draft.positions,
        nodeSizes: draft.sizes,
        selection: {
          selectedNodeIds: [],
          editingNodeId:
            beforeState.selection.editingNodeId &&
            removedNodeIds.has(beforeState.selection.editingNodeId)
              ? null
              : beforeState.selection.editingNodeId,
          quickEditingNodeId:
            beforeState.selection.quickEditingNodeId &&
            removedNodeIds.has(beforeState.selection.quickEditingNodeId)
              ? null
              : beforeState.selection.quickEditingNodeId,
          pendingInspectorContentFocusNodeId:
            beforeState.selection.pendingInspectorContentFocusNodeId &&
            removedNodeIds.has(beforeState.selection.pendingInspectorContentFocusNodeId)
              ? null
              : beforeState.selection.pendingInspectorContentFocusNodeId,
        },
        status: { dirty: true },
      };
      dispatchWorkspaceTransaction(withHistory(beforeState, transaction));
    },
    [dispatchWorkspaceTransaction, workspaceRef]
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
    workspaceRef,
    dispatchWorkspaceTransaction,
  });

  const { handleNodeDragEnd, handleNodesDragEnd, handleNodeResizeEnd, matchGroupNodeSizes } =
    useGraphNodeLayoutActions({
      workspaceRef,
      dispatchWorkspaceTransaction,
    });

  const handleViewportChange = useCallback(
    (vp: CanvasViewport, options?: ViewportChangeOptions) => {
      const beforeState = workspaceRef.current;
      if (areViewportsEqual(beforeState.viewport, vp)) {
        return;
      }

      dispatchWorkspaceTransaction({
        viewport: vp,
        status: options?.markDirty === false ? undefined : { dirty: true },
      });
    },
    [dispatchWorkspaceTransaction, workspaceRef]
  );

  return {
    graph: workspace.graph,
    nodePositions: workspace.nodePositions,
    nodeSizes: workspace.nodeSizes,
    viewport: workspace.viewport,
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
