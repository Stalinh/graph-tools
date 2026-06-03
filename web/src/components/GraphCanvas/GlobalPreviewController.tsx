import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { useEffect, useRef } from 'react';
import type { CanvasViewport } from '../../types';

interface GlobalPreviewControllerProps {
  nodeCount: number;
  requestId: number;
  onPreviewEnd: () => void;
  onPreviewStart: () => void;
  onPreviewViewportChange: (viewport: CanvasViewport) => void;
}

export function GlobalPreviewController({
  nodeCount,
  requestId,
  onPreviewEnd,
  onPreviewStart,
  onPreviewViewportChange,
}: GlobalPreviewControllerProps) {
  const flow = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });
  const handledRequestIdRef = useRef(0);

  useEffect(() => {
    if (requestId <= 0 || requestId === handledRequestIdRef.current || nodeCount === 0) {
      return;
    }
    if (!nodesInitialized) {
      return;
    }

    let cancelled = false;
    let previewStarted = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      handledRequestIdRef.current = requestId;
      previewStarted = true;
      onPreviewStart();
      void flow
        .fitView({ duration: 0 })
        .then(() => {
          if (!cancelled) {
            onPreviewViewportChange(flow.getViewport());
          }
        })
        .catch(() => undefined)
        .finally(() => {
          requestAnimationFrame(() => {
            if (!cancelled) {
              onPreviewEnd();
            }
          });
        });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (previewStarted) {
        onPreviewEnd();
      }
    };
  }, [
    flow,
    nodeCount,
    nodesInitialized,
    onPreviewEnd,
    onPreviewStart,
    onPreviewViewportChange,
    requestId,
  ]);

  return null;
}
