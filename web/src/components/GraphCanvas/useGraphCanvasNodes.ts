import type { Node } from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { CanvasPosition, GraphNode, NodeSize, WorkspaceNodeFilter } from '../../types';
import { createGraphNodes } from './graphUtils';

interface UseGraphCanvasNodesOptions {
  connectedNodeIds: Set<string>;
  dispatchNodeMouseDown: (event: ReactMouseEvent<Element>, nodeId: string) => void;
  graphNodes: GraphNode[];
  images: Map<string, Blob>;
  matchingNodeIds: Set<string> | null;
  nodeFilter: WorkspaceNodeFilter;
  nodePositions?: Record<string, CanvasPosition>;
  nodeSizes: Record<string, NodeSize>;
  pendingCitation: boolean;
  quickEditingNodeId: string | null;
  searchQuery: string;
  selectedEdgeId: string | null;
  selectedNodeIds: string[];
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
  connectedNodeIds,
  dispatchNodeMouseDown,
  graphNodes,
  images,
  matchingNodeIds,
  nodeFilter,
  nodePositions,
  nodeSizes,
  pendingCitation,
  quickEditingNodeId,
  searchQuery,
  selectedEdgeId,
  selectedNodeIds,
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
      selectedNodeIds,
      onSelectNode,
      quickEditingNodeId,
      onQuickEditSubmit,
      previousNodesById: new Map(),
      savedNodePositions: nodePositions,
      savedNodeSizes: nodeSizes,
      searchQuery: '',
      connectedNodeIds: new Set(),
      images,
      nodeFilter: 'all',
      selectedEdgeActive: false,
      citationSelectionActive: false,
      onNodeMouseDown: dispatchNodeMouseDown,
      matchingNodeIds: null,
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
        selectedNodeIds,
        onSelectNode: onSelectNodeRef.current,
        quickEditingNodeId,
        onQuickEditSubmit,
        previousNodesById,
        savedNodePositions: nodePositions,
        savedNodeSizes: nodeSizes,
        searchQuery,
        connectedNodeIds,
        images,
        nodeFilter,
        selectedEdgeActive: Boolean(selectedEdgeId),
        citationSelectionActive: pendingCitation,
        onNodeMouseDown: dispatchNodeMouseDown,
        matchingNodeIds,
        onQuickAddChild: handleQuickAddChild,
        onNodeResize: onGroupNodeResize,
        onNodeResizeEnd: onGroupNodeResizeEnd,
      });
    });
  }, [
    connectedNodeIds,
    dispatchNodeMouseDown,
    graphNodes,
    images,
    nodeFilter,
    nodePositions,
    nodeSizes,
    onQuickEditSubmit,
    quickEditingNodeId,
    searchQuery,
    selectedNodeIds,
    matchingNodeIds,
    pendingCitation,
    selectedEdgeId,
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
