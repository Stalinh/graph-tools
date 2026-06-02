import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFileOperations } from "../hooks/useFileOperations";
import { useGraphState } from "../hooks/useGraphState";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSearchFilters } from "../hooks/useSearchFilters";
import { useI18n } from "../i18n";
import { getMatchingNodes } from "../lib/searchUtils";
import { loadWorkspaceDraft, saveWorkspaceDraft } from "../lib/workspaceDraftStorage";
import { migrateWorkspaceIds } from "../lib/workspaceState";
import type { WorkspaceNodeFilter, WorkspaceState } from "../types";
import { GraphCanvas } from "./GraphCanvas";
import { Inspector } from "./Inspector";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { WorkspaceToolbar } from "./WorkspaceToolbar";

const RichEditorModal = lazy(async () => {
  const module = await import("./RichEditorModal");
  return { default: module.RichEditorModal };
});

const DRAFT_SAVE_DEBOUNCE_MS = 500;

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
  const didRestoreDraftRef = useRef(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftStateRef = useRef<WorkspaceState | null>(null);
  const handledDroppedWorkspaceFileIdRef = useRef<number | null>(null);
  const [nodeFilter, setNodeFilter] = useState<WorkspaceNodeFilter>("all");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);

  const searchFilters = useSearchFilters();

  const matchingNodes = useMemo(
    () => getMatchingNodes(nodes.graph.nodes, search.debouncedSearch, searchFilters.filters),
    [nodes.graph.nodes, search.debouncedSearch, searchFilters.filters]
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
        (node) => node.type === "image" && node.imagePath && !images.images.has(node.imagePath)
      ).length,
    [nodes.graph.nodes, images.images]
  );

  const flushDraftSave = useCallback(
    (updateFailureState = true) => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }

      if (!latestDraftStateRef.current) {
        return;
      }

      const saved = saveWorkspaceDraft(latestDraftStateRef.current);
      if (updateFailureState) {
        setDraftSaveFailed(!saved);
      }
    },
    [setDraftSaveFailed]
  );

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
        options?.focusInspectorContent && currentNode.type === "card" ? nodeId : null
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
        const ext = file.name.split(".").pop() || "png";
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
        nodes.createNode("image", dropPos, path);
      });
    },
    [nodes.createNode, images.setImages]
  );

  useEffect(() => {
    if (didRestoreDraftRef.current) {
      return;
    }

    didRestoreDraftRef.current = true;
    const draft = loadWorkspaceDraft();
    if (!draft) {
      status.setStatus("ready");
      return;
    }

    persistence.applyWorkspaceState(migrateWorkspaceIds(draft));
    status.setStatus("ready");
    status.setErrorMessage(null);
  }, [persistence, status]);

  useEffect(() => {
    if (!didRestoreDraftRef.current || status.status !== "ready") {
      return;
    }

    latestDraftStateRef.current = persistence.createWorkspaceState();
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      flushDraftSave();
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }, [
    flushDraftSave,
    persistence.createWorkspaceState,
    nodes.graph,
    nodes.nodePositions,
    nodes.nodeSizes,
    selection.selectedNodeId,
    status.status,
    nodes.viewport,
  ]);

  useEffect(() => {
    return () => flushDraftSave(false);
  }, [flushDraftSave]);

  useEffect(() => {
    const handlePageHide = () => flushDraftSave(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushDraftSave(false);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushDraftSave]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)
      ) {
        return;
      }

      const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      event.preventDefault();
      handleDropImages(files, { x: 0, y: 0 });
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleDropImages]);

  return (
    <section
      className={`knowledge-base ${isInspectorCollapsed ? "is-inspector-collapsed" : ""}`}
      aria-label={isZh ? "知识图谱工作区" : "Knowledge graph workspace"}
    >
      <div className="graph-zone">
        <WorkspaceToolbar
          nodeCount={nodes.graph.nodes.length}
          edgeCount={nodes.graph.edges.length}
          searchQuery={search.searchQuery}
          onSearchChange={search.setSearchQuery}
          searchInputRef={search.searchInputRef}
          onNew={files.handleNew}
          onOpen={() => {
            void files.handleOpen();
          }}
          onSave={() => {
            void files.handleSave();
          }}
          onSaveAs={() => {
            void files.handleSaveAs();
          }}
          canUndo={history.undoStack.length > 0}
          canRedo={history.redoStack.length > 0}
          onUndo={persistence.undo}
          onRedo={persistence.redo}
          availableTags={availableTags}
          selectedTags={searchFilters.selectedTags}
          selectedColors={searchFilters.selectedColors}
          hasAnyFilter={searchFilters.hasAnyFilter}
          onToggleTag={searchFilters.toggleTag}
          onToggleColor={searchFilters.toggleColor}
          onClearFilters={searchFilters.clearFilters}
          nodeFilter={nodeFilter}
          onNodeFilterChange={setNodeFilter}
          showResults={search.debouncedSearch.trim().length > 0}
          matchingNodes={matchingNodes}
          onResultNavigate={handleResultNavigate}
        />
        {draftSaveFailed ? (
          <div className="graph-message" role="alert">
            {isZh
              ? [
                  "本地草稿保存失败。",
                  "请使用“另存为”导出 .graph 文件，避免刷新后丢失未保存内容。",
                ].join("")
              : [
                  "Saving the local draft failed. ",
                  "Use Save As to export a .graph file so unsaved work is not lost on refresh.",
                ].join("")}
          </div>
        ) : null}
        {missingImageAssetCount > 0 ? (
          <div className="graph-message" role="alert">
            {isZh
              ? [
                  `${missingImageAssetCount} 个图片资源缺失。`,
                  "请打开原 .graph 文件或重新拖入图片后再保存。",
                ].join("")
              : `${missingImageAssetCount} image asset${
                  missingImageAssetCount === 1 ? "" : "s"
                } missing. Open the original .graph file or drop the image again before saving.`}
          </div>
        ) : null}
        {status.errorMessage ? (
          <div className="graph-message" role="alert">
            {status.errorMessage}
          </div>
        ) : null}
        <GraphCanvas
          contextMenu={selection.contextMenu}
          focusNodeId={focusNodeId}
          graph={nodes.graph}
          images={images.images}
          nodePositions={nodes.nodePositions}
          nodeSizes={nodes.nodeSizes}
          nodeFilter={nodeFilter}
          currentFileName={files.currentFileName}
          dirty={status.dirty}
          fileStatus={files.fileStatus}
          globalPreviewRequestId={files.globalPreviewRequestId}
          quickEditingNodeId={selection.quickEditingNodeId}
          searchQuery={search.debouncedSearch}
          selectedEdgeId={selection.selectedEdgeId}
          selectedNodeId={selection.selectedNodeId}
          selectedNodeIds={selection.selectedNodeIds}
          viewport={nodes.viewport ?? undefined}
          matchingNodeIds={matchingNodeIds}
          onCloseContextMenu={selection.closeContextMenu}
          onContextMenuRequest={selection.setContextMenu}
          onCreateCitation={edges.createCitation}
          onCreateNode={(type, position, parentId) =>
            nodes.createNode(type, position, undefined, parentId)
          }
          onDeleteNode={nodes.deleteNode}
          onDropFiles={handleDropImages}
          onEditNode={selection.openNodeEditor}
          onEdgeSelect={selection.setSelectedEdgeId}
          onFocusNodeHandled={() => setFocusNodeId(null)}
          onNodeDragEnd={nodes.handleNodeDragEnd}
          onNodesDragEnd={nodes.handleNodesDragEnd}
          onNodeResizeEnd={nodes.handleNodeResizeEnd}
          onQuickEditSubmit={handleQuickEditSubmit}
          onToggleNodeLock={nodes.updateGraphNodeLocked}
          onSelectNode={(nodeId) => {
            selection.setSelectedNodeId(nodeId);
            selection.setSelectedEdgeId(null);
          }}
          onSelectNodeIds={(nodeIds) => {
            selection.setSelectedNodeIds(nodeIds);
            selection.setSelectedEdgeId(null);
          }}
          onViewportChange={nodes.handleViewportChange}
        />
      </div>
      <Inspector
        allNodes={nodes.graph.nodes}
        autoFocusContent={
          selection.pendingInspectorContentFocusNodeId !== null &&
          selection.pendingInspectorContentFocusNodeId === selection.selectedNodeId
        }
        allEdges={nodes.graph.edges}
        edge={selection.selectedEdge}
        isCollapsed={isInspectorCollapsed}
        node={selection.selectedNode}
        selectedNodes={selection.selectedNodes}
        onCollapseToggle={() => setIsInspectorCollapsed((current) => !current)}
        onBatchColorChange={(color) =>
          nodes.updateGraphNodesColor(selection.selectedNodeIds, color)
        }
        onBatchDelete={() => nodes.deleteNodes(selection.selectedNodeIds)}
        onBatchLockChange={(locked) =>
          nodes.updateGraphNodesLocked(selection.selectedNodeIds, locked)
        }
        onMatchGroupSizes={() => nodes.matchGroupNodeSizes(selection.selectedNodeIds)}
        onColorChange={nodes.updateGraphNodeColor}
        onCreateCitation={edges.createCitation}
        onAutoFocusContentHandled={() => selection.setPendingInspectorContentFocusNodeId(null)}
        onDeleteCitation={edges.deleteCitation}
        onDeleteEdge={(edge) => {
          edges.deleteCitation(edge.sourceId, edge.targetId);
          selection.setSelectedEdgeId(null);
        }}
        onEdgeColorChange={edges.updateEdgeColor}
        onEdgeDirectionChange={edges.updateEdgeDirection}
        onEdgeStyleChange={edges.updateEdgeStyle}
        onReorderReferences={edges.reorderReferences}
        onSelectNode={(nodeId) => {
          selection.setSelectedNodeId(nodeId);
          selection.setSelectedEdgeId(null);
          setFocusNodeId(nodeId);
        }}
        onCommitNode={nodes.commitGraphNode}
        sourceNode={selection.selectedEdgeSourceNode}
        targetNode={selection.selectedEdgeTargetNode}
      />
      {selection.editingNode && selection.editingNode.type === "card" ? (
        <Suspense
          fallback={
            <div className="modal-loading-fallback" role="status">
              {isZh ? "正在加载编辑器..." : "Loading editor..."}
            </div>
          }
        >
          <RichEditorModal
            node={selection.editingNode}
            onClose={() => selection.setEditingNodeId(null)}
            onSave={(updatedNode) => nodes.updateGraphNode(updatedNode, { pushToHistory: true })}
          />
        </Suspense>
      ) : null}
      {files.pendingAction ? (
        <UnsavedChangesModal
          actionLabel={
            files.pendingAction === "new"
              ? isZh
                ? "新建画布"
                : "creating a new canvas"
              : files.pendingAction === "open-dropped"
                ? isZh
                  ? "打开拖入的文件"
                  : "opening the dropped file"
                : isZh
                  ? "打开其他文件"
                  : "opening another file"
          }
          onCancel={files.cancelPendingAction}
          onDiscard={() => {
            void files.discardPendingAction();
          }}
          onSave={() => {
            void files.saveAndContinuePendingAction();
          }}
        />
      ) : null}
    </section>
  );
}
