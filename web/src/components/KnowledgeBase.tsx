import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface DroppedWorkspaceFile {
  file: File;
  id: number;
}

interface KnowledgeBaseProps {
  droppedWorkspaceFile?: DroppedWorkspaceFile | null;
  onDroppedWorkspaceFileHandled?: (id: number) => void;
}

export function KnowledgeBase({
  droppedWorkspaceFile = null,
  onDroppedWorkspaceFileHandled,
}: KnowledgeBaseProps) {
  const { isZh, locale } = useI18n();
  const graphState = useGraphState({ locale });
  const { nodes, edges, selection, persistence, history, search, images, status } = graphState;
  const handledDroppedWorkspaceFileIdRef = useRef<number | null>(null);
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
    [selection.setSelectedNodeId, selection.setSelectedEdgeId]
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
  }, [
    edges.deleteCitation,
    selection.editingNodeId,
    selection.selectedEdge,
    selection.selectedNodeId,
    selection.selectedNodeIds,
    selection.setSelectedEdgeId,
    nodes.deleteNode,
    nodes.deleteNodes,
  ]);

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
    [
      nodes.graph.nodes,
      nodes.updateGraphNode,
      selection.setPendingInspectorContentFocusNodeId,
      selection.setQuickEditingNodeId,
      selection.setSelectedEdgeId,
      selection.setSelectedNodeId,
    ]
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

  useEffect(() => {
    if (!droppedWorkspaceFile) {
      return;
    }
    if (handledDroppedWorkspaceFileIdRef.current === droppedWorkspaceFile.id) {
      return;
    }

    handledDroppedWorkspaceFileIdRef.current = droppedWorkspaceFile.id;
    onDroppedWorkspaceFileHandled?.(droppedWorkspaceFile.id);
    void files.handleDroppedWorkspaceFile(droppedWorkspaceFile.file);
  }, [droppedWorkspaceFile, files.handleDroppedWorkspaceFile, onDroppedWorkspaceFileHandled]);

  const handleDropImages = useCallback(
    (files: File[], position: { x: number; y: number }) => {
      files.forEach((file, index) => {
        const ext = file.name.split('.').pop() || 'png';
        const path = `images/img_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 15)}.${ext}`;
        images.setImages((prev) => {
          const next = new Map(prev);
          next.set(path, file);
          return next;
        });
        const dropPos = {
          x: position.x + index * 20,
          y: position.y + index * 20,
        };
        nodes.createNode('image', dropPos, path);
      });
    },
    [nodes.createNode, images.setImages]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      ) {
        return;
      }

      const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length === 0) return;

      event.preventDefault();
      handleDropImages(files, { x: 0, y: 0 });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleDropImages]);

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
