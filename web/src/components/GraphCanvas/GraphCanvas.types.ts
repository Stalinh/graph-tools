import type {
  CanvasPosition,
  CanvasViewport,
  EdgeDirection,
  GraphContextMenuState,
  GraphData,
  GraphNode,
  NodeSize,
  WorkspaceNodeFilter,
} from '../../types';
import type { ViewportChangeOptions } from './graphCanvasTypes';

export interface GraphCanvasProps {
  graph: GraphData;
  contextMenu: GraphContextMenuState | null;
  focusNodeId?: string | null;
  images: Map<string, Blob>;
  nodePositions?: Record<string, CanvasPosition>;
  nodeSizes?: Record<string, NodeSize>;
  searchQuery: string;
  matchingNodeIds?: Set<string> | null;
  nodeFilter?: WorkspaceNodeFilter;
  currentFileName?: string | null;
  dirty?: boolean;
  fileStatus?: string | null;
  globalPreviewRequestId?: number;
  quickEditingNodeId?: string | null;
  selectedEdgeId: string | null;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  viewport?: CanvasViewport;
  onCloseContextMenu: () => void;
  onContextMenuRequest: (contextMenu: GraphContextMenuState) => void;
  onCreateCitation: (sourceId: string, targetId: string, direction: EdgeDirection) => void;
  onCreateNode: (type: GraphNode['type'], position: CanvasPosition, parentId?: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onEditNode: (nodeId: string) => void;
  onQuickEditSubmit: (
    nodeId: string,
    title: string,
    options?: { focusInspectorContent?: boolean }
  ) => void;
  onToggleNodeLock: (nodeId: string, locked: boolean) => void;
  onDropFiles?: (files: File[], position: CanvasPosition) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onFocusNodeHandled?: () => void;
  onNodeDragEnd?: (nodeId: string, from: CanvasPosition, to: CanvasPosition) => void;
  onNodesDragEnd?: (moves: { nodeId: string; from: CanvasPosition; to: CanvasPosition }[]) => void;
  onNodeResizeEnd?: (nodeId: string, size: NodeSize) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectNodeIds: (nodeIds: string[]) => void;
  onViewportChange?: (viewport: CanvasViewport, options?: ViewportChangeOptions) => void;
}
