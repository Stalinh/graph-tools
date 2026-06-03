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
  type ScreenPoint,
} from './canvasInteractionUtils';

export interface MarqueeSelectionDrag {
  active: boolean;
  additive: boolean;
  baseSelectedNodeIds: string[];
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
}

interface UseGraphCanvasMarqueeSelectionOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  graphNodes: GraphNode[];
  selectedNodeIds: string[];
  onEdgeSelect: (edgeId: string | null) => void;
  onSelectNodeIds: (nodeIds: string[]) => void;
}

export function useGraphCanvasMarqueeSelection({
  containerRef,
  graphNodes,
  selectedNodeIds,
  onEdgeSelect,
  onSelectNodeIds,
}: UseGraphCanvasMarqueeSelectionOptions) {
  const selectionDragRef = useRef<MarqueeSelectionDrag | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.Full);

  const getMarqueeSelectedNodeIds = useCallback(
    (selectionDrag: MarqueeSelectionDrag) => {
      const container = containerRef.current;
      if (!container) {
        return [];
      }

      const selectionRect = getScreenRect(
        { x: selectionDrag.startX, y: selectionDrag.startY },
        { x: selectionDrag.currentX, y: selectionDrag.currentY }
      );
      const requiresFullContainment = selectionDrag.currentX >= selectionDrag.startX;
      const graphNodeIds = new Set(graphNodes.map((node) => node.id));
      const selectedIds = new Set<string>();

      container.querySelectorAll<HTMLElement>('.react-flow__node[data-id]').forEach((element) => {
        const nodeId = element.getAttribute('data-id');
        if (!nodeId || !graphNodeIds.has(nodeId)) {
          return;
        }

        const bounds = element.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          return;
        }

        const nodeRect = {
          bottom: bounds.bottom,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
        };
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

  const commitSelectionDrag = useCallback(() => {
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag?.active) {
      selectionDragRef.current = null;
      setSelectionMode(SelectionMode.Full);
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
    setSelectionMode(SelectionMode.Full);
  }, [getMarqueeSelectedNodeIds, onEdgeSelect, onSelectNodeIds]);

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

    setSelectionMode(
      event.clientX >= selectionDrag.startX ? SelectionMode.Full : SelectionMode.Partial
    );
  }, []);

  const handleMouseUpCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag) {
      return;
    }

    if (!selectionDrag.active) {
      selectionDragRef.current = null;
      setSelectionMode(SelectionMode.Full);
    }
  }, []);

  const handleSelectionStart = useCallback(() => {
    if (selectionDragRef.current) {
      selectionDragRef.current.active = true;
      if (!selectionDragRef.current.additive) {
        onEdgeSelect(null);
        onSelectNodeIds([]);
      }
    }
  }, [onEdgeSelect, onSelectNodeIds]);

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
    selectionDragRef,
    selectionMode,
  };
}
