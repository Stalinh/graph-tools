import { GraphCanvas } from './GraphCanvas';
import { KnowledgeBaseMessages } from './KnowledgeBaseMessages';
import type { KnowledgeBaseGraphZoneProps } from './KnowledgeBase.types';
import { WorkspaceToolbar } from './WorkspaceToolbar';

export function KnowledgeBaseGraphZone({
  availableTags,
  draftSaveFailed,
  edges,
  files,
  focusNodeId,
  history,
  images,
  isZh,
  matchingNodeIds,
  matchingNodeResults,
  missingImageAssetCount,
  nodeFilter,
  nodes,
  persistence,
  search,
  searchFilters,
  selection,
  status,
  onDropImages,
  onFocusNodeHandled,
  onNodeFilterChange,
  onQuickEditSubmit,
  onResultNavigate,
}: KnowledgeBaseGraphZoneProps) {
  return (
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
        onNodeFilterChange={onNodeFilterChange}
        showResults={search.debouncedSearch.trim().length > 0}
        matchingResults={matchingNodeResults}
        onResultNavigate={onResultNavigate}
      />
      <KnowledgeBaseMessages
        draftSaveFailed={draftSaveFailed}
        errorMessage={status.errorMessage}
        isZh={isZh}
        missingImageAssetCount={missingImageAssetCount}
      />
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
        onDropFiles={onDropImages}
        onEditNode={selection.openNodeEditor}
        onEdgeSelect={selection.setSelectedEdgeId}
        onFocusNodeHandled={onFocusNodeHandled}
        onNodeDragEnd={nodes.handleNodeDragEnd}
        onNodesDragEnd={nodes.handleNodesDragEnd}
        onNodeResizeEnd={nodes.handleNodeResizeEnd}
        onQuickEditSubmit={onQuickEditSubmit}
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
  );
}
