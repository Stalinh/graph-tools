import type { Node } from "@xyflow/react";
import { useCallback, useRef, type RefObject } from "react";
import type { CanvasPosition } from "../../types";

const DRAG_DISTANCE_THRESHOLD = 16;
const DRAG_TIME_THRESHOLD = 300;

interface GraphNodeMove {
  nodeId: string;
  from: CanvasPosition;
  to: CanvasPosition;
}

interface UseGraphCanvasNodeDragLifecycleOptions {
  clearAlignmentGuides: () => void;
  nodesRef: RefObject<Node[]>;
  onNodeDragEnd?: (nodeId: string, from: CanvasPosition, to: CanvasPosition) => void;
  onNodesDragEnd?: (moves: GraphNodeMove[]) => void;
  selectedNodeIds: string[];
  stopDragAutoPan: () => void;
}

export function useGraphCanvasNodeDragLifecycle({
  clearAlignmentGuides,
  nodesRef,
  onNodeDragEnd,
  onNodesDragEnd,
  selectedNodeIds,
  stopDragAutoPan,
}: UseGraphCanvasNodeDragLifecycleOptions) {
  const nodeDragStartPositions = useRef<Record<string, CanvasPosition>>({});
  const nodeDragStartTimeRef = useRef<Record<string, number>>({});
  const hasJustDraggedRef = useRef(false);

  const handleNodeDragStart = useCallback(
    (_event: unknown, node: Node) => {
      stopDragAutoPan();
      clearAlignmentGuides();
      const currentNodes = nodesRef.current ?? [];
      if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
        selectedNodeIds.forEach((selectedNodeId) => {
          const selectedNode = currentNodes.find((currentNode) => currentNode.id === selectedNodeId);
          if (selectedNode) {
            nodeDragStartPositions.current[selectedNodeId] = { ...selectedNode.position };
          }
        });
      } else {
        nodeDragStartPositions.current[node.id] = { ...node.position };
      }
      nodeDragStartTimeRef.current[node.id] = Date.now();
    },
    [clearAlignmentGuides, nodesRef, selectedNodeIds, stopDragAutoPan]
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      stopDragAutoPan();
      clearAlignmentGuides();
      const from = nodeDragStartPositions.current[node.id] ?? node.position;
      const currentNodes = nodesRef.current ?? [];
      const resolvedNode = currentNodes.find((canvasNode) => canvasNode.id === node.id) ?? node;
      const startTime = nodeDragStartTimeRef.current[node.id];
      const dx = Math.abs(resolvedNode.position.x - from.x);
      const dy = Math.abs(resolvedNode.position.y - from.y);
      const distanceMoved = Math.sqrt(dx * dx + dy * dy);
      const timeElapsed = startTime ? Date.now() - startTime : 0;

      if (distanceMoved > DRAG_DISTANCE_THRESHOLD && timeElapsed > DRAG_TIME_THRESHOLD) {
        hasJustDraggedRef.current = true;
      }
      if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
        const moves = selectedNodeIds
          .map((selectedNodeId) => {
            const currentNode = currentNodes.find((canvasNode) => canvasNode.id === selectedNodeId);
            const startPosition = nodeDragStartPositions.current[selectedNodeId];
            if (!currentNode || !startPosition) {
              return null;
            }

            return {
              nodeId: selectedNodeId,
              from: startPosition,
              to: { ...currentNode.position },
            };
          })
          .filter((move): move is GraphNodeMove => move !== null);

        onNodesDragEnd?.(moves);
        selectedNodeIds.forEach((selectedNodeId) => {
          delete nodeDragStartPositions.current[selectedNodeId];
        });
      } else {
        onNodeDragEnd?.(node.id, from, { ...resolvedNode.position });
        delete nodeDragStartPositions.current[node.id];
      }
      delete nodeDragStartPositions.current[node.id];
      delete nodeDragStartTimeRef.current[node.id];
    },
    [
      clearAlignmentGuides,
      nodesRef,
      onNodeDragEnd,
      onNodesDragEnd,
      selectedNodeIds,
      stopDragAutoPan,
    ]
  );

  return {
    handleNodeDragStart,
    handleNodeDragStop,
    hasJustDraggedRef,
  };
}
