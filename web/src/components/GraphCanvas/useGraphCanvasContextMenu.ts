import type { NodeMouseHandler, ReactFlowInstance } from '@xyflow/react';
import { useCallback, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import type { GraphContextMenuState } from '../../types';

type ContextMenuEvent = MouseEvent | ReactMouseEvent<Element>;

interface UseGraphCanvasContextMenuOptions {
  clearCitationSelection: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  selectedNodeId: string | null;
  onContextMenuRequest: (contextMenu: GraphContextMenuState) => void;
  onSelectNode: (nodeId: string | null) => void;
}

export function useGraphCanvasContextMenu({
  clearCitationSelection,
  containerRef,
  reactFlowInstanceRef,
  selectedNodeId,
  onContextMenuRequest,
  onSelectNode,
}: UseGraphCanvasContextMenuOptions) {
  const openContextMenu = useCallback(
    (event: ContextMenuEvent, nodeId: string | null = null) => {
      event.preventDefault();
      const instance = reactFlowInstanceRef.current;
      const container = containerRef.current;

      if (!instance || !container) {
        return;
      }

      const bounds = container.getBoundingClientRect();

      onContextMenuRequest({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        flowPosition: instance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
        nodeId,
        selectedNodeIdAtOpen: selectedNodeId,
      });
      clearCitationSelection();

      if (nodeId) {
        onSelectNode(nodeId);
      }
    },
    [
      clearCitationSelection,
      containerRef,
      onContextMenuRequest,
      onSelectNode,
      reactFlowInstanceRef,
      selectedNodeId,
    ]
  );

  const handlePaneContextMenu = useCallback(
    (event: ContextMenuEvent) => {
      openContextMenu(event);
    },
    [openContextMenu]
  );

  const handleNodeContextMenu = useCallback<NodeMouseHandler>(
    (event, node) => {
      openContextMenu(event, node.id);
    },
    [openContextMenu]
  );

  return {
    handleNodeContextMenu,
    handlePaneContextMenu,
  };
}
