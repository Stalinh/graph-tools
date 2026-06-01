import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { GraphNode, NodeSize } from "../../types";
import { createAlignmentGuides, type AlignmentGuide } from "./canvasInteractionUtils";

interface UseGraphCanvasAlignmentGuidesOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  graphNodeTypeById: Map<string, GraphNode["type"]>;
  onNodeResizeEnd?: (nodeId: string, size: NodeSize) => void;
}

export function useGraphCanvasAlignmentGuides({
  containerRef,
  graphNodeTypeById,
  onNodeResizeEnd,
}: UseGraphCanvasAlignmentGuidesOptions) {
  const alignmentGuideFrameRef = useRef<number | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  const clearAlignmentGuides = useCallback(() => {
    if (alignmentGuideFrameRef.current !== null) {
      cancelAnimationFrame(alignmentGuideFrameRef.current);
      alignmentGuideFrameRef.current = null;
    }
    setAlignmentGuides([]);
  }, []);

  const showAlignmentGuidesForNodeIds = useCallback(
    (nodeIds: string[]) => {
      const container = containerRef.current;
      if (!container) {
        setAlignmentGuides([]);
        return;
      }

      setAlignmentGuides(createAlignmentGuides(container, nodeIds, graphNodeTypeById));
    },
    [containerRef, graphNodeTypeById]
  );

  const handleGroupNodeResize = useCallback(
    (nodeId: string) => {
      if (alignmentGuideFrameRef.current !== null) {
        cancelAnimationFrame(alignmentGuideFrameRef.current);
      }

      alignmentGuideFrameRef.current = requestAnimationFrame(() => {
        alignmentGuideFrameRef.current = null;
        showAlignmentGuidesForNodeIds([nodeId]);
      });
    },
    [showAlignmentGuidesForNodeIds]
  );

  const handleGroupNodeResizeEnd = useCallback(
    (nodeId: string, size: NodeSize) => {
      clearAlignmentGuides();
      onNodeResizeEnd?.(nodeId, size);
    },
    [clearAlignmentGuides, onNodeResizeEnd]
  );

  useEffect(() => {
    return () => {
      if (alignmentGuideFrameRef.current !== null) {
        cancelAnimationFrame(alignmentGuideFrameRef.current);
      }
    };
  }, []);

  return {
    alignmentGuides,
    clearAlignmentGuides,
    handleGroupNodeResize,
    handleGroupNodeResizeEnd,
    showAlignmentGuidesForNodeIds,
  };
}
