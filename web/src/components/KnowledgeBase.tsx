import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFileOperations } from '../hooks/useFileOperations';
import { useGraphState } from '../hooks/useGraphState';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { useI18n } from '../i18n';
import { getMatchingNodeResults } from '../lib/searchUtils';
import type { WorkspaceNodeFilter } from '../types';
import { KnowledgeBaseGraphZone } from './KnowledgeBaseGraphZone';
import { KnowledgeBaseInspectorPanel } from './KnowledgeBaseInspectorPanel';
import { KnowledgeBaseModals } from './KnowledgeBaseModals';
import { useKnowledgeBaseDraft } from './KnowledgeBase/useKnowledgeBaseDraft';
import {
  useIncomingWorkspaceFile,
  type DefaultWorkspaceFileHandle,
  type DroppedWorkspaceFile,
} from './KnowledgeBase/useIncomingWorkspaceFile';
import { useKnowledgeBaseImageImport } from './KnowledgeBase/useKnowledgeBaseImageImport';

interface KnowledgeBaseProps {
  defaultWorkspaceFileHandle?: DefaultWorkspaceFileHandle | null;
  droppedWorkspaceFile?: DroppedWorkspaceFile | null;
  onDefaultWorkspaceFileHandleHandled?: (id: number) => void;
  onDroppedWorkspaceFileHandled?: (id: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveCurrentPageChange?: (saveCurrentPage: (() => Promise<boolean>) | null) => void;
}

export function KnowledgeBase({
  defaultWorkspaceFileHandle = null,
  droppedWorkspaceFile = null,
  onDefaultWorkspaceFileHandleHandled,
  onDroppedWorkspaceFileHandled,
  onDirtyChange,
  onSaveCurrentPageChange,
}: KnowledgeBaseProps) {
  const { isZh, locale } = useI18n();
  const graphState = useGraphState({ locale });
  const { nodes, edges, selection, persistence, history, search, images, status } = graphState;
  const [nodeFilter, setNodeFilter] = useState<WorkspaceNodeFilter>('all');
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);

  const searchFilters = useSearchFilters();

  const matchingNodeResults = useMemo(
    () => getMatchingNodeResults(nodes.graph.nodes, search.debouncedSearch, searchFilters.filters),
    [nodes.graph.nodes, search.debouncedSearch, searchFilters.filters]
  );

  const matchingNodes = useMemo(
    () => matchingNodeResults.map((result) => result.node),
    [matchingNodeResults]
  );

  const matchingNodeIds = useMemo(() => {
    if (!search.debouncedSearch.trim() && !searchFilters.hasAnyFilter) return null;
    return new Set(matchingNodes.map((n) => n.id));
  }, [matchingNodes, search.debouncedSearch, searchFilters.hasAnyFilter]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const node of nodes.graph.nodes) {
      for (const tag of node.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [nodes.graph.nodes]);

  const missingImageAssetCount = useMemo(
    () =>
      nodes.graph.nodes.filter(
        (node) => node.type === 'image' && node.imagePath && !images.images.has(node.imagePath)
      ).length,
    [nodes.graph.nodes, images.images]
  );
  const { draftSaveFailed } = useKnowledgeBaseDraft({
    nodes,
    persistence,
    selection,
    status,
  });

  const handleResultNavigate = useCallback(
    (nodeId: string) => {
      selection.setSelectedNodeId(nodeId);
      selection.setSelectedEdgeId(null);
      setFocusNodeId(nodeId);
    },
    [selection]
  );

  const handleDeleteSelection = useCallback(() => {
    if (selection.editingNodeId) {
      return;
    }

    if (selection.selectedEdge) {
      edges.deleteCitation(selection.selectedEdge.sourceId, selection.selectedEdge.targetId);
      selection.setSelectedEdgeId(null);
      return;
    }

    if (selection.selectedNodeIds.length > 1) {
      nodes.deleteNodes(selection.selectedNodeIds);
      return;
    }

    if (selection.selectedNodeId) {
      nodes.deleteNode(selection.selectedNodeId);
    }
  }, [edges, nodes, selection]);

  const handleQuickEditSubmit = useCallback(
    (nodeId: string, title: string, options?: { focusInspectorContent?: boolean }) => {
      const currentNode = nodes.graph.nodes.find((node) => node.id === nodeId);
      if (!currentNode) {
        selection.setQuickEditingNodeId(null);
        selection.setPendingInspectorContentFocusNodeId(null);
        return;
      }

      nodes.updateGraphNode({ ...currentNode, title }, { pushToHistory: true });
      selection.setSelectedNodeId(nodeId);
      selection.setSelectedEdgeId(null);
      selection.setQuickEditingNodeId(null);
      selection.setPendingInspectorContentFocusNodeId(
        options?.focusInspectorContent && currentNode.type === 'card' ? nodeId : null
      );
    },
    [nodes, selection]
  );

  useKeyboardShortcuts({
    undo: persistence.undo,
    redo: persistence.redo,
    searchInputRef: search.searchInputRef,
    setSearchQuery: search.setSearchQuery,
    onDeleteSelection: handleDeleteSelection,
  });

  const files = useFileOperations({
    createWorkspaceState: persistence.createWorkspaceState,
    applyWorkspaceState: persistence.applyWorkspaceState,
    resetToEmpty: persistence.resetToEmpty,
    clearHistory: history.clear,
    setStatus: status.setStatus,
    setErrorMessage: status.setErrorMessage,
    getImages: () => images.images,
    setImages: images.setImages,
    dirty: status.dirty,
    setDirty: status.setDirty,
    locale,
  });
  const { handleDroppedWorkspaceFile, handleOpenDefaultWorkspaceFile, handleSave } = files;
  const { handleDropImages } = useKnowledgeBaseImageImport({
    createNode: nodes.createNode,
    setImages: images.setImages,
  });

  useEffect(() => {
    onDirtyChange?.(status.dirty);
  }, [onDirtyChange, status.dirty]);

  useEffect(() => {
    onSaveCurrentPageChange?.(handleSave);
    return () => onSaveCurrentPageChange?.(null);
  }, [handleSave, onSaveCurrentPageChange]);

  useIncomingWorkspaceFile({
    defaultWorkspaceFileHandle,
    droppedWorkspaceFile,
    handleDroppedWorkspaceFile,
    handleOpenDefaultWorkspaceFile,
    onDefaultWorkspaceFileHandleHandled,
    onDroppedWorkspaceFileHandled,
  });

  return (
    <section
      className={`knowledge-base ${isInspectorCollapsed ? 'is-inspector-collapsed' : ''}`}
      aria-label={isZh ? '知识图谱工作区' : 'Knowledge graph workspace'}
    >
      <KnowledgeBaseGraphZone
        availableTags={availableTags}
        draftSaveFailed={draftSaveFailed}
        edges={edges}
        files={files}
        focusNodeId={focusNodeId}
        history={history}
        images={images}
        isZh={isZh}
        matchingNodeIds={matchingNodeIds}
        matchingNodeResults={matchingNodeResults}
        missingImageAssetCount={missingImageAssetCount}
        nodeFilter={nodeFilter}
        nodes={nodes}
        persistence={persistence}
        search={search}
        searchFilters={searchFilters}
        selection={selection}
        status={status}
        onDropImages={handleDropImages}
        onFocusNodeHandled={() => setFocusNodeId(null)}
        onNodeFilterChange={setNodeFilter}
        onQuickEditSubmit={handleQuickEditSubmit}
        onResultNavigate={handleResultNavigate}
      />
      <KnowledgeBaseInspectorPanel
        edges={edges}
        isCollapsed={isInspectorCollapsed}
        nodes={nodes}
        selection={selection}
        onCollapseToggle={() => setIsInspectorCollapsed((current) => !current)}
        onFocusNode={setFocusNodeId}
      />
      <KnowledgeBaseModals
        editingNode={selection.editingNode}
        files={files}
        isZh={isZh}
        onCloseEditor={() => selection.setEditingNodeId(null)}
        onSaveEditorNode={(updatedNode) =>
          nodes.updateGraphNode(updatedNode, { pushToHistory: true })
        }
      />
    </section>
  );
}
