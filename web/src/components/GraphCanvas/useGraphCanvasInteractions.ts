import {
  applyNodeChanges,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from '@xyflow/react';
import {
  useCallback,
  useRef,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { CanvasPosition, GraphData, NodeSize } from '../../types';
import { normalizeGroupCollisionChanges } from './canvasInteractionUtils';
import type { MarqueeSelectionDrag } from './useGraphCanvasMarqueeSelection';

const MIDDLE_BUTTON = 1;
const MIDDLE_DOUBLE_CLICK_DELAY = 400;
const MIDDLE_DOUBLE_CLICK_DISTANCE = 8;

interface UseGraphCanvasInteractionsOptions {
  clearAlignmentGuides: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  graph: GraphData;
  handleCitationNodeClick: (nodeId: string) => boolean;
  handleNodeMouseDownRef: MutableRefObject<
    ((event: ReactMouseEvent<Element>, nodeId: string) => void) | null
  >;
  hasJustDraggedRef: MutableRefObject<boolean>;
  nodeSizes: Record<string, NodeSize>;
  nodesRef: MutableRefObject<Node[]>;
  pendingCitation: boolean;
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  selectedNodeIds: string[];
  selectionDragRef: MutableRefObject<MarqueeSelectionDrag | null>;
  setNodes: (nodes: Node[]) => void;
  onCloseContextMenu: () => void;
  onDropFiles?: (files: File[], position: CanvasPosition) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onSelectNodeIds: (nodeIds: string[]) => void;
}

export function useGraphCanvasInteractions({
  clearAlignmentGuides,
  containerRef,
  graph,
  handleCitationNodeClick,
  handleNodeMouseDownRef,
  hasJustDraggedRef,
  nodeSizes,
  nodesRef,
  pendingCitation,
  reactFlowInstanceRef,
  selectedNodeIds,
  selectionDragRef,
  setNodes,
  onCloseContextMenu,
  onDropFiles,
  onEdgeSelect,
  onSelectNodeIds,
}: UseGraphCanvasInteractionsOptions) {
  const lastMiddleClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const nodePressedRef = useRef<{ id: string; wasSelected: boolean } | null>(null);

  const handleNodeMouseDown = useCallback(
    (event: ReactMouseEvent<Element>, nodeId: string) => {
      if (event.button !== 0) {
        return;
      }
      onCloseContextMenu();
      if (pendingCitation) {
        return;
      }

      const wasSelected = selectedNodeIds.includes(nodeId);
      nodePressedRef.current = { id: nodeId, wasSelected };

      if (!wasSelected) {
        onEdgeSelect(null);
        if (event.metaKey || event.ctrlKey) {
          onSelectNodeIds([...selectedNodeIds, nodeId]);
        } else {
          onSelectNodeIds([nodeId]);
        }
      }
    },
    [onCloseContextMenu, pendingCitation, onEdgeSelect, selectedNodeIds, onSelectNodeIds]
  );
  handleNodeMouseDownRef.current = handleNodeMouseDown;

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (event, node) => {
      if (hasJustDraggedRef.current) {
        hasJustDraggedRef.current = false;
        onCloseContextMenu();
        return;
      }
      onCloseContextMenu();
      if (handleCitationNodeClick(node.id)) {
        return;
      }
      onEdgeSelect(null);

      const pressed = nodePressedRef.current;
      nodePressedRef.current = null;

      if (pressed && pressed.id === node.id) {
        if (pressed.wasSelected) {
          if (event.metaKey || event.ctrlKey) {
            const nextSelectedNodeIds = selectedNodeIds.filter(
              (selectedId) => selectedId !== node.id
            );
            onSelectNodeIds(nextSelectedNodeIds);
          } else {
            onSelectNodeIds([node.id]);
          }
        }
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        const nextSelectedNodeIds = selectedNodeIds.includes(node.id)
          ? selectedNodeIds.filter((selectedId) => selectedId !== node.id)
          : [...selectedNodeIds, node.id];
        onSelectNodeIds(nextSelectedNodeIds);
        return;
      }

      onSelectNodeIds([node.id]);
    },
    [
      handleCitationNodeClick,
      hasJustDraggedRef,
      onCloseContextMenu,
      onEdgeSelect,
      onSelectNodeIds,
      selectedNodeIds,
    ]
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_, edge) => {
      onCloseContextMenu();
      onSelectNodeIds([]);
      onEdgeSelect(edge.id);
    },
    [onCloseContextMenu, onEdgeSelect, onSelectNodeIds]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const stableChanges = selectionDragRef.current
        ? changes.filter((change) => change.type !== 'select')
        : changes;
      if (stableChanges.length === 0) {
        return;
      }

      const normalizedChanges = normalizeGroupCollisionChanges(
        stableChanges,
        graph.nodes,
        nodesRef.current,
        nodeSizes
      );
      const nextNodes = applyNodeChanges(normalizedChanges, nodesRef.current);
      nodesRef.current = nextNodes;
      setNodes(nextNodes);
    },
    [graph.nodes, nodeSizes, nodesRef, selectionDragRef, setNodes]
  );

  const handleCanvasAuxClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;

      if (
        event.button !== MIDDLE_BUTTON ||
        !(target instanceof Element) ||
        !target.closest('.react-flow__pane')
      ) {
        return;
      }

      event.preventDefault();

      const now = Date.now();
      const lastClick = lastMiddleClickRef.current;
      const isDoubleClick =
        lastClick !== null &&
        now - lastClick.time <= MIDDLE_DOUBLE_CLICK_DELAY &&
        Math.abs(event.clientX - lastClick.x) <= MIDDLE_DOUBLE_CLICK_DISTANCE &&
        Math.abs(event.clientY - lastClick.y) <= MIDDLE_DOUBLE_CLICK_DISTANCE;

      if (isDoubleClick) {
        lastMiddleClickRef.current = null;
        void reactFlowInstanceRef.current?.fitView({ duration: 250 });
        return;
      }

      lastMiddleClickRef.current = {
        time: now,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [reactFlowInstanceRef]
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;

      const instance = reactFlowInstanceRef.current;
      const container = containerRef.current;
      if (!instance || !container) return;

      const bounds = container.getBoundingClientRect();
      const clientX = Number.isFinite(event.clientX)
        ? event.clientX
        : bounds.left + bounds.width / 2;
      const clientY = Number.isFinite(event.clientY)
        ? event.clientY
        : bounds.top + bounds.height / 2;

      const position = instance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      onDropFiles?.(files, position);
    },
    [containerRef, onDropFiles, reactFlowInstanceRef]
  );

  const handlePaneClick = useCallback(() => {
    clearAlignmentGuides();
    onCloseContextMenu();
    onEdgeSelect(null);
    onSelectNodeIds([]);
  }, [clearAlignmentGuides, onCloseContextMenu, onEdgeSelect, onSelectNodeIds]);

  return {
    handleCanvasAuxClick,
    handleDrop,
    handleEdgeClick,
    handleNodeClick,
    handleNodesChange,
    handlePaneClick,
  };
}
