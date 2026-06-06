import type { Node } from '@xyflow/react';
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { CanvasPosition } from '../../types';

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
  onNodeInteractionEnd?: () => void;
  selectedNodeIds: string[];
  stopDragAutoPan: () => void;
}

export function useGraphCanvasNodeDragLifecycle({
  clearAlignmentGuides,
  nodesRef,
  onNodeDragEnd,
  onNodesDragEnd,
  onNodeInteractionEnd,
  selectedNodeIds,
  stopDragAutoPan,
}: UseGraphCanvasNodeDragLifecycleOptions) {
  const nodeDragStartPositions = useRef<Record<string, CanvasPosition>>({});
  const nodeDragStartTimeRef = useRef<Record<string, number>>({});
  const hasJustDraggedRef = useRef(false);
  const [isDraggingNodes, setIsDraggingNodes] = useState(false);

  const handleNodeDragStart = useCallback(
    (_event: unknown, node: Node) => {
      setIsDraggingNodes(false);
      stopDragAutoPan();
      clearAlignmentGuides();
      const currentNodes = nodesRef.current ?? [];
      const currentNodeById = new Map(
        currentNodes.map((currentNode) => [currentNode.id, currentNode])
      );
      if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
        selectedNodeIds.forEach((selectedNodeId) => {
          const selectedNode = currentNodeById.get(selectedNodeId);
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
      setIsDraggingNodes(false);
      onNodeInteractionEnd?.();
      const from = nodeDragStartPositions.current[node.id] ?? node.position;
      const currentNodes = nodesRef.current ?? [];
      const currentNodeById = new Map(
        currentNodes.map((currentNode) => [currentNode.id, currentNode])
      );
      const resolvedNode = currentNodeById.get(node.id) ?? node;
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
            const currentNode = currentNodeById.get(selectedNodeId);
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
      onNodeInteractionEnd,
      onNodesDragEnd,
      selectedNodeIds,
      stopDragAutoPan,
    ]
  );

  return {
    handleNodeDragStart,
    handleNodeDragStop,
    hasJustDraggedRef,
    isDraggingNodes,
    setIsDraggingNodes,
  };
}
