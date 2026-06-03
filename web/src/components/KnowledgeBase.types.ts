import type { Dispatch, SetStateAction } from 'react';
import type { useFileOperations } from '../hooks/useFileOperations';
import type { GraphState } from '../hooks/useGraphState';
import type { useSearchFilters } from '../hooks/useSearchFilters';
import type { NodeSearchResult } from '../lib/searchUtils';
import type { CanvasPosition, GraphNode, WorkspaceNodeFilter } from '../types';

export type FileOperationsState = ReturnType<typeof useFileOperations>;
export type SearchFiltersState = ReturnType<typeof useSearchFilters>;

export interface KnowledgeBaseGraphZoneProps {
  availableTags: string[];
  draftSaveFailed: boolean;
  edges: GraphState['edges'];
  files: FileOperationsState;
  focusNodeId: string | null;
  history: GraphState['history'];
  images: GraphState['images'];
  isZh: boolean;
  matchingNodeIds: Set<string> | null;
  matchingNodeResults: NodeSearchResult[];
  missingImageAssetCount: number;
  nodeFilter: WorkspaceNodeFilter;
  nodes: GraphState['nodes'];
  persistence: GraphState['persistence'];
  search: GraphState['search'];
  searchFilters: SearchFiltersState;
  selection: GraphState['selection'];
  status: GraphState['status'];
  onDropImages: (files: File[], position: CanvasPosition) => void;
  onFocusNodeHandled: () => void;
  onNodeFilterChange: Dispatch<SetStateAction<WorkspaceNodeFilter>>;
  onQuickEditSubmit: (
    nodeId: string,
    title: string,
    options?: { focusInspectorContent?: boolean }
  ) => void;
  onResultNavigate: (nodeId: string) => void;
}

export interface KnowledgeBaseInspectorPanelProps {
  edges: GraphState['edges'];
  isCollapsed: boolean;
  nodes: GraphState['nodes'];
  selection: GraphState['selection'];
  onCollapseToggle: () => void;
  onFocusNode: (nodeId: string) => void;
}

export interface KnowledgeBaseModalsProps {
  editingNode: GraphNode | null;
  files: FileOperationsState;
  isZh: boolean;
  onCloseEditor: () => void;
  onSaveEditorNode: (updatedNode: GraphNode) => void;
}
