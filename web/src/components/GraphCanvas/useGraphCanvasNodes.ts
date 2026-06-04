import type { Node } from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { CanvasPosition, GraphNode, NodeSize } from '../../types';
import { createGraphNodes } from './graphUtils';
import type { GraphCanvasInteractionModel } from './useGraphCanvasInteractionModel';

interface UseGraphCanvasNodesOptions {
  dispatchNodeMouseDown: (event: ReactMouseEvent<Element>, nodeId: string) => void;
  graphNodes: GraphNode[];
  images: Map<string, Blob>;
  interactionModel: GraphCanvasInteractionModel;
  nodePositions?: Record<string, CanvasPosition>;
  nodeSizes: Record<string, NodeSize>;
  quickEditingNodeId: string | null;
  searchQuery: string;
  onCreateNode: (type: GraphNode['type'], position: CanvasPosition, parentId?: string) => void;
  onGroupNodeResize: (nodeId: string) => void;
  onGroupNodeResizeEnd: (nodeId: string, size: NodeSize) => void;
  onQuickEditSubmit: (
    nodeId: string,
    title: string,
    options?: { focusInspectorContent?: boolean }
  ) => void;
  onSelectNode: (nodeId: string | null) => void;
}

export function useGraphCanvasNodes({
  dispatchNodeMouseDown,
  graphNodes,
  images,
  interactionModel,
  nodePositions,
  nodeSizes,
  quickEditingNodeId,
  searchQuery,
  onCreateNode,
  onGroupNodeResize,
  onGroupNodeResizeEnd,
  onQuickEditSubmit,
  onSelectNode,
}: UseGraphCanvasNodesOptions) {
  const onSelectNodeRef = useRef(onSelectNode);
  const nodePositionsRef = useRef(nodePositions);

  onSelectNodeRef.current = onSelectNode;
  nodePositionsRef.current = nodePositions;

  const handleQuickAddChild = useCallback(
    (parentId: string) => {
      const parentPosition = nodePositionsRef.current?.[parentId] ?? { x: 0, y: 0 };
      onCreateNode('card', { x: parentPosition.x + 50, y: parentPosition.y + 80 }, parentId);
    },
    [onCreateNode]
  );

  const [nodes, setNodes] = useState<Node[]>(() =>
    createGraphNodes({
      graphNodes,
      selectedNodeIds: Array.from(interactionModel.selectedNodeIdSet),
      onSelectNode,
      quickEditingNodeId,
      onQuickEditSubmit,
      previousNodesById: new Map(),
      savedNodePositions: nodePositions,
      savedNodeSizes: nodeSizes,
      searchQuery,
      connectedNodeIds: interactionModel.connectedNodeIds,
      images,
      visibleNodeIds: interactionModel.visibleNodeIds,
      selectedEdgeActive: interactionModel.selectedEdgeActive,
      citationSelectionActive: interactionModel.citationSelectionActive,
      onNodeMouseDown: dispatchNodeMouseDown,
      matchingNodeIds: interactionModel.matchingNodeIds,
      onQuickAddChild: handleQuickAddChild,
      onNodeResize: onGroupNodeResize,
      onNodeResizeEnd: onGroupNodeResizeEnd,
    })
  );
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    setNodes((previousNodes) => {
      const previousNodesById = new Map(previousNodes.map((node) => [node.id, node]));

      return createGraphNodes({
        graphNodes,
        selectedNodeIds: Array.from(interactionModel.selectedNodeIdSet),
        onSelectNode: onSelectNodeRef.current,
        quickEditingNodeId,
        onQuickEditSubmit,
        previousNodesById,
        savedNodePositions: nodePositions,
        savedNodeSizes: nodeSizes,
        searchQuery,
        connectedNodeIds: interactionModel.connectedNodeIds,
        images,
        visibleNodeIds: interactionModel.visibleNodeIds,
        selectedEdgeActive: interactionModel.selectedEdgeActive,
        citationSelectionActive: interactionModel.citationSelectionActive,
        onNodeMouseDown: dispatchNodeMouseDown,
        matchingNodeIds: interactionModel.matchingNodeIds,
        onQuickAddChild: handleQuickAddChild,
        onNodeResize: onGroupNodeResize,
        onNodeResizeEnd: onGroupNodeResizeEnd,
      });
    });
  }, [
    dispatchNodeMouseDown,
    graphNodes,
    images,
    interactionModel,
    nodePositions,
    nodeSizes,
    onQuickEditSubmit,
    quickEditingNodeId,
    searchQuery,
    handleQuickAddChild,
    onGroupNodeResize,
    onGroupNodeResizeEnd,
  ]);

  return {
    nodes,
    nodesRef,
    setNodes,
  };
}
