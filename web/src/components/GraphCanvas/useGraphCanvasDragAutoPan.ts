import type { Node, ReactFlowInstance } from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { combineScreenRects, getAutoPanDelta, getNodeElement } from './canvasInteractionUtils';

const DRAG_AUTO_PAN_EDGE_THRESHOLD = 24;
const DRAG_AUTO_PAN_STEP = 24;
const ALIGNMENT_GUIDE_DRAG_THRESHOLD = 4;

interface UseGraphCanvasDragAutoPanOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  onInteractionDrag: () => void;
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  selectedNodeIds: string[];
  showAlignmentGuidesForNodeIds: (nodeIds: string[]) => void;
}

export function useGraphCanvasDragAutoPan({
  containerRef,
  onInteractionDrag,
  reactFlowInstanceRef,
  selectedNodeIds,
  showAlignmentGuidesForNodeIds,
}: UseGraphCanvasDragAutoPanOptions) {
  const dragAutoPanFrameRef = useRef<number | null>(null);
  const alignmentGuideFrameRef = useRef<number | null>(null);
  const lastGuidePointRef = useRef<{ x: number; y: number } | null>(null);
  const hasNotifiedInteractionDragRef = useRef(false);

  const stopDragAutoPan = useCallback(() => {
    if (dragAutoPanFrameRef.current !== null) {
      cancelAnimationFrame(dragAutoPanFrameRef.current);
      dragAutoPanFrameRef.current = null;
    }
    if (alignmentGuideFrameRef.current !== null) {
      cancelAnimationFrame(alignmentGuideFrameRef.current);
      alignmentGuideFrameRef.current = null;
    }
    lastGuidePointRef.current = null;
    hasNotifiedInteractionDragRef.current = false;
  }, []);

  const handleNodeDrag = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      const container = containerRef.current;
      const instance = reactFlowInstanceRef.current;
      if (!container || !instance) {
        return;
      }

      const draggedNodeIds =
        selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)
          ? selectedNodeIds
          : [node.id];
      if (dragAutoPanFrameRef.current !== null) {
        cancelAnimationFrame(dragAutoPanFrameRef.current);
        dragAutoPanFrameRef.current = null;
      }
      if (!hasNotifiedInteractionDragRef.current) {
        hasNotifiedInteractionDragRef.current = true;
        onInteractionDrag();
      }
      const lastGuidePoint = lastGuidePointRef.current;
      const shouldRefreshGuides =
        !lastGuidePoint ||
        Math.abs(lastGuidePoint.x - event.clientX) >= ALIGNMENT_GUIDE_DRAG_THRESHOLD ||
        Math.abs(lastGuidePoint.y - event.clientY) >= ALIGNMENT_GUIDE_DRAG_THRESHOLD;
      if (shouldRefreshGuides && alignmentGuideFrameRef.current === null) {
        lastGuidePointRef.current = { x: event.clientX, y: event.clientY };
        alignmentGuideFrameRef.current = requestAnimationFrame(() => {
          alignmentGuideFrameRef.current = null;
          showAlignmentGuidesForNodeIds(draggedNodeIds);
        });
      }
      const bounds = container.getBoundingClientRect();
      const pointerDeltaX = getAutoPanDelta(
        event.clientX,
        bounds.left,
        bounds.right,
        DRAG_AUTO_PAN_EDGE_THRESHOLD,
        DRAG_AUTO_PAN_STEP
      );
      const pointerDeltaY = getAutoPanDelta(
        event.clientY,
        bounds.top,
        bounds.bottom,
        DRAG_AUTO_PAN_EDGE_THRESHOLD,
        DRAG_AUTO_PAN_STEP
      );

      if (pointerDeltaX === 0 && pointerDeltaY === 0) {
        return;
      }

      const draggedElements = draggedNodeIds
        .map((nodeId) => getNodeElement(container, nodeId))
        .filter((element): element is HTMLElement => element !== null);

      if (draggedElements.length === 0) {
        return;
      }

      const draggedRect = combineScreenRects(draggedElements);
      const nodeDeltaX =
        pointerDeltaX < 0
          ? draggedRect.left <= bounds.left + DRAG_AUTO_PAN_EDGE_THRESHOLD
            ? pointerDeltaX
            : 0
          : pointerDeltaX > 0
            ? draggedRect.right >= bounds.right - DRAG_AUTO_PAN_EDGE_THRESHOLD
              ? pointerDeltaX
              : 0
            : 0;
      const nodeDeltaY =
        pointerDeltaY < 0
          ? draggedRect.top <= bounds.top + DRAG_AUTO_PAN_EDGE_THRESHOLD
            ? pointerDeltaY
            : 0
          : pointerDeltaY > 0
            ? draggedRect.bottom >= bounds.bottom - DRAG_AUTO_PAN_EDGE_THRESHOLD
              ? pointerDeltaY
              : 0
            : 0;

      if (nodeDeltaX === 0 && nodeDeltaY === 0) {
        return;
      }

      dragAutoPanFrameRef.current = requestAnimationFrame(() => {
        dragAutoPanFrameRef.current = null;
        const currentViewport = instance.getViewport();
        void instance.setViewport(
          {
            ...currentViewport,
            x: currentViewport.x - nodeDeltaX,
            y: currentViewport.y - nodeDeltaY,
          },
          { duration: 0 }
        );
      });
    },
    [
      containerRef,
      onInteractionDrag,
      reactFlowInstanceRef,
      selectedNodeIds,
      showAlignmentGuidesForNodeIds,
    ]
  );

  useEffect(() => stopDragAutoPan, [stopDragAutoPan]);

  return {
    handleNodeDrag,
    stopDragAutoPan,
  };
}
