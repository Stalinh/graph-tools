import type { Node, ReactFlowInstance } from '@xyflow/react';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { CanvasViewport } from '../../types';
import type { ViewportChangeOptions } from './graphCanvasTypes';

interface UseGraphCanvasViewportOptions {
  focusNodeId: string | null;
  nodes: Node[];
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  viewport?: CanvasViewport;
  onFocusNodeHandled?: () => void;
  onViewportChange?: (viewport: CanvasViewport, options?: ViewportChangeOptions) => void;
}

export function useGraphCanvasViewport({
  focusNodeId,
  nodes,
  reactFlowInstanceRef,
  viewport,
  onFocusNodeHandled,
  onViewportChange,
}: UseGraphCanvasViewportOptions) {
  const lastFocusedNodeIdRef = useRef<string | null>(null);
  const suppressNextViewportDirtyRef = useRef(false);

  useEffect(() => {
    if (!focusNodeId) {
      lastFocusedNodeIdRef.current = null;
      return;
    }
    if (lastFocusedNodeIdRef.current === focusNodeId) {
      return;
    }

    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }

    const targetNode =
      instance.getNode?.(focusNodeId) ?? nodes.find((node) => node.id === focusNodeId);
    if (!targetNode) {
      return;
    }

    const width = targetNode.measured?.width ?? targetNode.width ?? targetNode.initialWidth ?? 0;
    const height =
      targetNode.measured?.height ?? targetNode.height ?? targetNode.initialHeight ?? 0;
    const centerX = targetNode.position.x + width / 2;
    const centerY = targetNode.position.y + height / 2;
    const zoom = instance.getZoom?.() ?? viewport?.zoom ?? 1;

    void instance.setCenter(centerX, centerY, { duration: 250, zoom });
    lastFocusedNodeIdRef.current = focusNodeId;
    onFocusNodeHandled?.();
  }, [focusNodeId, nodes, onFocusNodeHandled, reactFlowInstanceRef, viewport?.zoom]);

  const handleZoomIn = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }
    void instance.zoomIn({ duration: 160 });
  }, [reactFlowInstanceRef]);

  const handleZoomOut = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }
    void instance.zoomOut({ duration: 160 });
  }, [reactFlowInstanceRef]);

  const handleZoomReset = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }
    void instance.setViewport(
      {
        x: viewport?.x ?? 0,
        y: viewport?.y ?? 0,
        zoom: 1,
      },
      { duration: 180 }
    );
  }, [reactFlowInstanceRef, viewport]);

  const handleMoveEnd = useCallback(
    (_: unknown, nextViewport: CanvasViewport) => {
      const markDirty = !suppressNextViewportDirtyRef.current;
      onViewportChange?.(nextViewport, { markDirty });
      if (!markDirty) {
        suppressNextViewportDirtyRef.current = false;
      }
    },
    [onViewportChange]
  );

  const handleGlobalPreviewStart = useCallback(() => {
    suppressNextViewportDirtyRef.current = true;
  }, []);

  const handleGlobalPreviewEnd = useCallback(() => {
    suppressNextViewportDirtyRef.current = false;
  }, []);

  const handleGlobalPreviewViewportChange = useCallback(
    (nextViewport: CanvasViewport) => {
      onViewportChange?.(nextViewport, { markDirty: false });
    },
    [onViewportChange]
  );

  return {
    handleGlobalPreviewEnd,
    handleGlobalPreviewStart,
    handleGlobalPreviewViewportChange,
    handleMoveEnd,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  };
}
