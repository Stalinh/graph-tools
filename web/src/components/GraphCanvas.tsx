import { ReactFlow, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useI18n } from '../i18n';
import type { CanvasPosition, EntityType } from '../types';

import type { GraphCanvasProps } from './GraphCanvas/GraphCanvas.types';
import { GraphCanvasFlowPanels } from './GraphCanvas/GraphCanvasFlowPanels';
import {
  GraphCanvasAlignmentGuides,
  GraphCanvasContextMenuOverlay,
  GraphCanvasMarqueeSelectionOverlay,
} from './GraphCanvas/GraphCanvasOverlays';
import { EDGE_TYPES, EMPTY_NODE_SIZES, NODE_TYPES } from './GraphCanvas/graphCanvasConfig';
import { useGraphCanvasAlignmentGuides } from './GraphCanvas/useGraphCanvasAlignmentGuides';
import { useGraphCanvasCitationSelection } from './GraphCanvas/useGraphCanvasCitationSelection';
import { useGraphCanvasContextMenu } from './GraphCanvas/useGraphCanvasContextMenu';
import { useGraphCanvasDragAutoPan } from './GraphCanvas/useGraphCanvasDragAutoPan';
import { useGraphCanvasEdges } from './GraphCanvas/useGraphCanvasEdges';
import { useGraphCanvasInteractionModel } from './GraphCanvas/useGraphCanvasInteractionModel';
import { useGraphCanvasInteractions } from './GraphCanvas/useGraphCanvasInteractions';
import { useGraphCanvasMarqueeSelection } from './GraphCanvas/useGraphCanvasMarqueeSelection';
import { useGraphCanvasNodeDragLifecycle } from './GraphCanvas/useGraphCanvasNodeDragLifecycle';
import { useGraphCanvasNodes } from './GraphCanvas/useGraphCanvasNodes';
import { useGraphCanvasViewport } from './GraphCanvas/useGraphCanvasViewport';

export function GraphCanvas({
  graph,
  contextMenu,
  focusNodeId = null,
  images,
  nodePositions,
  nodeSizes = EMPTY_NODE_SIZES,
  searchQuery,
  nodeFilter = 'all',
  currentFileName = null,
  dirty = false,
  fileStatus = null,
  globalPreviewRequestId = 0,
  quickEditingNodeId = null,
  selectedEdgeId,
  selectedNodeId,
  selectedNodeIds,
  viewport,
  onCloseContextMenu,
  onContextMenuRequest,
  onCreateCitation,
  onCreateNode,
  onDeleteNode,
  onEditNode,
  onQuickEditSubmit,
  onToggleNodeLock,
  onDropFiles,
  onEdgeSelect,
  onFocusNodeHandled,
  onNodeDragEnd,
  onNodesDragEnd,
  onSelectNode,
  onSelectNodeIds,
  onViewportChange,
  matchingNodeIds = null,
  onNodeResizeEnd,
}: GraphCanvasProps) {
  const { isZh } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [isMarqueeSelectionActive, setIsMarqueeSelectionActive] = useState(false);
  const [interactionNodeIds, setInteractionNodeIds] = useState<ReadonlySet<string>>(new Set());
  const handleNodeMouseDownRef = useRef<
    ((event: ReactMouseEvent<Element>, nodeId: string) => void) | null
  >(null);
  const dispatchNodeMouseDown = useCallback((event: ReactMouseEvent<Element>, nodeId: string) => {
    handleNodeMouseDownRef.current?.(event, nodeId);
  }, []);

  const {
    clearCitationSelection,
    handleCitationNodeClick,
    pendingCitation,
    startCitationSelection,
  } = useGraphCanvasCitationSelection({
    graphEdges: graph.edges,
    graphNodes: graph.nodes,
    isZh,
    onCreateCitation,
    onEdgeSelect,
    onSelectNode,
  });
  const graphNodeTypeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node.type])),
    [graph.nodes]
  );
  const {
    alignmentGuides,
    clearAlignmentGuides,
    handleGroupNodeResize,
    handleGroupNodeResizeEnd,
    showAlignmentGuidesForNodeIds,
  } = useGraphCanvasAlignmentGuides({
    containerRef,
    graphNodeTypeById,
    onNodeResizeEnd,
  });
  const { handleNodeDrag, stopDragAutoPan } = useGraphCanvasDragAutoPan({
    containerRef,
    onInteractionDrag: (nodeIds) => {
      setInteractionNodeIds(new Set(nodeIds));
      setIsDraggingNodes(true);
    },
    reactFlowInstanceRef,
    selectedNodeIds,
    showAlignmentGuidesForNodeIds,
  });
  const {
    handleMouseDownCapture,
    handleMouseMoveCapture,
    handleMouseUpCapture,
    handleSelectionEnd,
    handleSelectionStart,
    selectionRect,
    selectionDragRef,
    selectionMode,
  } = useGraphCanvasMarqueeSelection({
    containerRef,
    graphNodes: graph.nodes,
    setIsMarqueeSelectionActive,
    onEdgeSelect,
    onSelectNodeIds,
    selectedNodeIds,
  });

  const interactionModel = useGraphCanvasInteractionModel({
    graph,
    matchingNodeIds,
    nodeFilter,
    pendingCitation: Boolean(pendingCitation),
    selectedEdgeId,
    selectedNodeIds,
  });
  const { nodes, nodesRef, setNodes } = useGraphCanvasNodes({
    dispatchNodeMouseDown,
    graphNodes: graph.nodes,
    images,
    interactionModel,
    nodePositions,
    nodeSizes,
    quickEditingNodeId,
    searchQuery,
    onCreateNode,
    onGroupNodeResize: handleGroupNodeResize,
    onGroupNodeResizeEnd: handleGroupNodeResizeEnd,
    onQuickEditSubmit,
    onSelectNode,
  });
  const {
    handleNodeDragStart,
    handleNodeDragStop,
    hasJustDraggedRef,
    isDraggingNodes,
    setIsDraggingNodes,
  } = useGraphCanvasNodeDragLifecycle({
    clearAlignmentGuides,
    nodesRef,
    onNodeDragEnd,
    onNodesDragEnd,
    onNodeInteractionEnd: () => {
      setInteractionNodeIds(new Set());
    },
    selectedNodeIds,
    stopDragAutoPan,
  });
  const viewportHandlers = useGraphCanvasViewport({
    focusNodeId,
    nodes,
    reactFlowInstanceRef,
    viewport,
    onFocusNodeHandled,
    onViewportChange,
  });
  const edges = useGraphCanvasEdges({
    connectedNodeIds: interactionModel.connectedNodeIds,
    graphEdges: graph.edges,
    graphNodes: graph.nodes,
    isInteractionActive: isDraggingNodes || isMarqueeSelectionActive,
    interactionNodeIds,
    matchingNodeIds: interactionModel.matchingNodeIds,
    nodeFilter,
    selectedEdgeId,
  });
  const contextMenuHandlers = useGraphCanvasContextMenu({
    clearCitationSelection,
    containerRef,
    reactFlowInstanceRef,
    selectedNodeId,
    onContextMenuRequest,
    onSelectNode,
  });
  const interactionHandlers = useGraphCanvasInteractions({
    clearAlignmentGuides,
    containerRef,
    graph,
    handleCitationNodeClick,
    handleNodeMouseDownRef,
    hasJustDraggedRef,
    nodeSizes,
    nodesRef,
    pendingCitation: Boolean(pendingCitation),
    reactFlowInstanceRef,
    selectedNodeIds,
    selectionDragRef,
    setNodes,
    onCloseContextMenu,
    onDropFiles,
    onEdgeSelect,
    onSelectNodeIds,
  });

  const handleCreateContextMenuNode = useCallback(
    (type: EntityType, position: CanvasPosition) => onCreateNode(type, position),
    [onCreateNode]
  );

  return (
    <div
      className="graph-canvas graph-canvas--executive"
      ref={containerRef}
      onMouseDownCapture={handleMouseDownCapture}
      onMouseMoveCapture={handleMouseMoveCapture}
      onMouseUpCapture={handleMouseUpCapture}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        defaultViewport={viewport}
        edgeTypes={EDGE_TYPES}
        fitView={!viewport}
        minZoom={0.05}
        multiSelectionKeyCode={['Meta', 'Control']}
        nodeTypes={NODE_TYPES}
        nodesDraggable
        nodesFocusable={false}
        autoPanOnNodeDrag={false}
        panOnDrag={[1]}
        selectionMode={selectionMode}
        selectionOnDrag
        onAuxClick={interactionHandlers.handleCanvasAuxClick}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        onEdgeClick={interactionHandlers.handleEdgeClick}
        onMoveEnd={viewportHandlers.handleMoveEnd}
        onNodeContextMenu={contextMenuHandlers.handleNodeContextMenu}
        onNodeClick={interactionHandlers.handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={interactionHandlers.handleNodesChange}
        onSelectionStart={handleSelectionStart}
        onSelectionEnd={handleSelectionEnd}
        onPaneClick={interactionHandlers.handlePaneClick}
        onPaneContextMenu={contextMenuHandlers.handlePaneContextMenu}
        onDragOver={(event) => event.preventDefault()}
        onDrop={interactionHandlers.handleDrop}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
      >
        <GraphCanvasFlowPanels
          currentFileName={currentFileName}
          dirty={dirty}
          fileStatus={fileStatus}
          globalPreviewRequestId={globalPreviewRequestId}
          nodeCount={nodes.length}
          pendingCitationMessage={pendingCitation?.message ?? null}
          onGlobalPreviewEnd={viewportHandlers.handleGlobalPreviewEnd}
          onGlobalPreviewStart={viewportHandlers.handleGlobalPreviewStart}
          onGlobalPreviewViewportChange={viewportHandlers.handleGlobalPreviewViewportChange}
          onZoomIn={viewportHandlers.handleZoomIn}
          onZoomOut={viewportHandlers.handleZoomOut}
          onZoomReset={viewportHandlers.handleZoomReset}
        />
      </ReactFlow>
      <GraphCanvasMarqueeSelectionOverlay selectionRect={selectionRect} />
      <GraphCanvasAlignmentGuides alignmentGuides={alignmentGuides} />
      <GraphCanvasContextMenuOverlay
        contextMenu={contextMenu}
        graph={graph}
        selectedNodeId={selectedNodeId}
        onClose={onCloseContextMenu}
        onStartCitation={startCitationSelection}
        onCreateNode={handleCreateContextMenuNode}
        onDeleteNode={onDeleteNode}
        onEditNode={onEditNode}
        onToggleNodeLock={onToggleNodeLock}
      />
    </div>
  );
}
