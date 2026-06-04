import { SelectionMode } from '@xyflow/react';
import {
  useCallback,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import type { GraphNode } from '../../types';
import {
  containsRect,
  getScreenRect,
  intersectsRect,
  type ScreenRect,
  type ScreenPoint,
} from './canvasInteractionUtils';

export interface MarqueeSelectionDrag {
  active: boolean;
  additive: boolean;
  baseSelectedNodeIds: string[];
  currentX: number;
  currentY: number;
  nodeRects: Array<{ nodeId: string; rect: ScreenRect }>;
  startX: number;
  startY: number;
}

interface UseGraphCanvasMarqueeSelectionOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  graphNodes: GraphNode[];
  selectedNodeIds: string[];
  setIsMarqueeSelectionActive?: (active: boolean) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onSelectNodeIds: (nodeIds: string[]) => void;
}

export function useGraphCanvasMarqueeSelection({
  containerRef,
  graphNodes,
  selectedNodeIds,
  setIsMarqueeSelectionActive,
  onEdgeSelect,
  onSelectNodeIds,
}: UseGraphCanvasMarqueeSelectionOptions) {
  const selectionDragRef = useRef<MarqueeSelectionDrag | null>(null);
  const [selectionMode] = useState<SelectionMode>(SelectionMode.Full);

  const snapshotNodeRects = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return [];
    }

    const graphNodeIds = new Set(graphNodes.map((node) => node.id));

    return Array.from(container.querySelectorAll<HTMLElement>('.react-flow__node[data-id]'))
      .flatMap((element) => {
        const nodeId = element.getAttribute('data-id');
        if (!nodeId || !graphNodeIds.has(nodeId)) {
          return [];
        }

        const bounds = element.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          return [];
        }

        return [
          {
            nodeId,
            rect: {
              bottom: bounds.bottom,
              left: bounds.left,
              right: bounds.right,
              top: bounds.top,
            },
          },
        ];
      })
      .sort(
        (left, right) =>
          graphNodes.findIndex((node) => node.id === left.nodeId) -
          graphNodes.findIndex((node) => node.id === right.nodeId)
      );
  }, [containerRef, graphNodes]);

  const getMarqueeSelectedNodeIds = useCallback(
    (selectionDrag: MarqueeSelectionDrag) => {
      if (selectionDrag.nodeRects.length === 0) {
        return [];
      }

      const selectionRect = getScreenRect(
        { x: selectionDrag.startX, y: selectionDrag.startY },
        { x: selectionDrag.currentX, y: selectionDrag.currentY }
      );
      const requiresFullContainment = selectionDrag.currentX >= selectionDrag.startX;
      const selectedIds = new Set<string>();

      selectionDrag.nodeRects.forEach(({ nodeId, rect: nodeRect }) => {
        const isHit = requiresFullContainment
          ? containsRect(selectionRect, nodeRect)
          : intersectsRect(selectionRect, nodeRect);

        if (isHit) {
          selectedIds.add(nodeId);
        }
      });

      return graphNodes.map((node) => node.id).filter((nodeId) => selectedIds.has(nodeId));
    },
    [containerRef, graphNodes]
  );

  const selectionRect =
    selectionDragRef.current?.active &&
    selectionDragRef.current.currentX !== selectionDragRef.current.startX
      ? getScreenRect(
          { x: selectionDragRef.current.startX, y: selectionDragRef.current.startY },
          { x: selectionDragRef.current.currentX, y: selectionDragRef.current.currentY }
        )
      : null;

  const commitSelectionDrag = useCallback(() => {
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag?.active) {
      selectionDragRef.current = null;
      setIsMarqueeSelectionActive?.(false);
      return;
    }

    onEdgeSelect(null);
    const candidateNodeIds = getMarqueeSelectedNodeIds(selectionDrag);
    if (selectionDrag.additive) {
      onSelectNodeIds([...new Set([...selectionDrag.baseSelectedNodeIds, ...candidateNodeIds])]);
    } else {
      onSelectNodeIds(candidateNodeIds);
    }

    selectionDragRef.current = null;
    setIsMarqueeSelectionActive?.(false);
  }, [getMarqueeSelectedNodeIds, onEdgeSelect, onSelectNodeIds, setIsMarqueeSelectionActive]);

  const updateSelectionDragPoint = (point: ScreenPoint) => {
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag) {
      return;
    }

    selectionDrag.currentX = point.x;
    selectionDrag.currentY = point.y;
  };

  const handleMouseDownCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        event.button !== 0 ||
        !(target instanceof Element) ||
        !target.closest('.react-flow__pane')
      ) {
        return;
      }

      selectionDragRef.current = {
        active: false,
        additive: event.metaKey || event.ctrlKey,
        baseSelectedNodeIds: selectedNodeIds,
        currentX: event.clientX,
        currentY: event.clientY,
        nodeRects: [],
        startX: event.clientX,
        startY: event.clientY,
      };
    },
    [selectedNodeIds]
  );

  const handleMouseMoveCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag) {
      return;
    }

    const distanceX = Math.abs(event.clientX - selectionDrag.startX);
    const distanceY = Math.abs(event.clientY - selectionDrag.startY);
    if (distanceX < 4 && distanceY < 4) {
      return;
    }
  }, []);

  const handleMouseUpCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
      const selectionDrag = selectionDragRef.current;
      if (!selectionDrag) {
        return;
      }

      if (!selectionDrag.active) {
        selectionDragRef.current = null;
        setIsMarqueeSelectionActive?.(false);
      }
    },
    [setIsMarqueeSelectionActive]
  );

  const handleSelectionStart = useCallback(() => {
    if (selectionDragRef.current) {
      selectionDragRef.current.active = true;
      selectionDragRef.current.nodeRects = snapshotNodeRects();
      setIsMarqueeSelectionActive?.(true);
    }
  }, [setIsMarqueeSelectionActive, snapshotNodeRects]);

  const handleSelectionEnd = useCallback(
    (event: ReactMouseEvent) => {
      updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
      commitSelectionDrag();
    },
    [commitSelectionDrag]
  );

  return {
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    handleSelectionEnd,
    handleSelectionStart,
    isMarqueeSelectionActive: Boolean(selectionDragRef.current?.active),
    selectionRect,
    selectionDragRef,
    selectionMode,
  };
}
