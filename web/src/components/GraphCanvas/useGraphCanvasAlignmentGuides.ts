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
  const graphNodeTypeByIdRef = useRef(graphNodeTypeById);
  const onNodeResizeEndRef = useRef(onNodeResizeEnd);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  graphNodeTypeByIdRef.current = graphNodeTypeById;
  onNodeResizeEndRef.current = onNodeResizeEnd;

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

      setAlignmentGuides(createAlignmentGuides(container, nodeIds, graphNodeTypeByIdRef.current));
    },
    [containerRef]
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
      onNodeResizeEndRef.current?.(nodeId, size);
    },
    [clearAlignmentGuides]
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
