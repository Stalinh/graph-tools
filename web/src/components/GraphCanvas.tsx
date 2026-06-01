import {
  Background,
  ReactFlow,
  applyNodeChanges,
  type EdgeTypes,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "../i18n";
import { GRAPH_GRID_SIZE } from "../lib/graphLayout";
import type {
  CanvasPosition,
  CanvasViewport,
  EdgeDirection,
  GraphContextMenuState,
  GraphData,
  GraphNode,
  NodeSize,
  WorkspaceNodeFilter,
} from "../types";

import { CitationEdge } from "./GraphCanvas/CitationEdge";
import { GraphContextMenu } from "./GraphCanvas/GraphContextMenu";
import { GraphScaleIndicator } from "./GraphCanvas/GraphScaleIndicator";
import { GraphCanvasFileStatusPanel } from "./GraphCanvas/GraphCanvasStatusPanels";
import { ImageGraphNode } from "./GraphCanvas/ImageGraphNode";
import { ResizableGraphNode } from "./GraphCanvas/ResizableGraphNode";
import { GroupNode } from "./GraphCanvas/GroupNode";
import { normalizeGroupCollisionChanges } from "./GraphCanvas/canvasInteractionUtils";
import { GlobalPreviewController } from "./GraphCanvas/GlobalPreviewController";
import { createGraphNodes } from "./GraphCanvas/graphUtils";
import { useGraphCanvasAlignmentGuides } from "./GraphCanvas/useGraphCanvasAlignmentGuides";
import { useGraphCanvasCitationSelection } from "./GraphCanvas/useGraphCanvasCitationSelection";
import { useGraphCanvasDragAutoPan } from "./GraphCanvas/useGraphCanvasDragAutoPan";
import { useGraphCanvasEdges } from "./GraphCanvas/useGraphCanvasEdges";
import { useGraphCanvasMarqueeSelection } from "./GraphCanvas/useGraphCanvasMarqueeSelection";
import { useGraphCanvasNodeDragLifecycle } from "./GraphCanvas/useGraphCanvasNodeDragLifecycle";

interface GraphCanvasProps {
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
  onCreateNode: (type: GraphNode["type"], position: CanvasPosition, parentId?: string) => void;
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

interface ViewportChangeOptions {
  markDirty?: boolean;
}

const EDGE_TYPES: EdgeTypes = {
  citation: CitationEdge as EdgeTypes[string],
};

const EMPTY_NODE_SIZES: Record<string, NodeSize> = {};
const MIDDLE_BUTTON = 1;
const MIDDLE_DOUBLE_CLICK_DELAY = 400;
const MIDDLE_DOUBLE_CLICK_DISTANCE = 8;
type ContextMenuEvent = MouseEvent | ReactMouseEvent<Element>;

const NODE_TYPES: NodeTypes = {
  cardNode: ResizableGraphNode as NodeTypes[string],
  imageNode: ImageGraphNode as NodeTypes[string],
  groupNode: GroupNode as NodeTypes[string],
};

export function GraphCanvas({
  graph,
  contextMenu,
  focusNodeId = null,
  images,
  nodePositions,
  nodeSizes = EMPTY_NODE_SIZES,
  searchQuery,
  nodeFilter = "all",
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
  const lastMiddleClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastFocusedNodeIdRef = useRef<string | null>(null);
  const suppressNextViewportDirtyRef = useRef(false);
  const onSelectNodeRef = useRef(onSelectNode);
  const nodePressedRef = useRef<{ id: string; wasSelected: boolean } | null>(null);
  const handleNodeMouseDownRef = useRef<
    ((event: ReactMouseEvent<Element>, nodeId: string) => void) | null
  >(null);

  onSelectNodeRef.current = onSelectNode;
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
    selectionDragRef,
    selectionMode,
  } = useGraphCanvasMarqueeSelection({
    containerRef,
    graphNodes: graph.nodes,
    onEdgeSelect,
    onSelectNodeIds,
    selectedNodeIds,
  });

  const handleQuickAddChild = useCallback(
    (parentId: string) => {
      const parentPosition = nodePositions?.[parentId] ?? { x: 0, y: 0 };
      onCreateNode("card", { x: parentPosition.x + 50, y: parentPosition.y + 80 }, parentId);
    },
    [nodePositions, onCreateNode]
  );

  const [nodes, setNodes] = useState<Node[]>(() =>
    createGraphNodes(
      graph.nodes,
      selectedNodeIds,
      onSelectNode,
      quickEditingNodeId,
      onQuickEditSubmit,
      [],
      nodePositions,
      nodeSizes,
      "",
      new Set(),
      images,
      "all",
      false,
      false,
      (event, nodeId) => handleNodeMouseDownRef.current?.(event, nodeId),
      null,
      handleQuickAddChild,
      handleGroupNodeResize,
      handleGroupNodeResizeEnd
    )
  );
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const { handleNodeDragStart, handleNodeDragStop, hasJustDraggedRef } =
    useGraphCanvasNodeDragLifecycle({
      clearAlignmentGuides,
      nodesRef,
      onNodeDragEnd,
      onNodesDragEnd,
      selectedNodeIds,
      stopDragAutoPan,
    });

  const connectedNodeIds = useMemo(() => {
    if (!selectedEdgeId) return new Set<string>();
    const edge = graph.edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return new Set<string>();
    return new Set([edge.sourceId, edge.targetId]);
  }, [graph.edges, selectedEdgeId]);

  useEffect(() => {
    setNodes((previousNodes) =>
      createGraphNodes(
        graph.nodes,
        selectedNodeIds,
        onSelectNodeRef.current,
        quickEditingNodeId,
        onQuickEditSubmit,
        previousNodes,
        nodePositions,
        nodeSizes,
        searchQuery,
        connectedNodeIds,
        images,
        nodeFilter,
        Boolean(selectedEdgeId),
        Boolean(pendingCitation),
        (event, nodeId) => handleNodeMouseDownRef.current?.(event, nodeId),
        matchingNodeIds ?? null,
        handleQuickAddChild,
        handleGroupNodeResize,
        handleGroupNodeResizeEnd
      )
    );
  }, [
    connectedNodeIds,
    graph.nodes,
    images,
    nodeFilter,
    nodePositions,
    nodeSizes,
    onQuickEditSubmit,
    quickEditingNodeId,
    searchQuery,
    selectedNodeIds,
    matchingNodeIds,
    pendingCitation,
    handleQuickAddChild,
    handleGroupNodeResize,
    handleGroupNodeResizeEnd,
  ]);

  useEffect(() => {
    if (!focusNodeId) {
      lastFocusedNodeIdRef.current = null;
      return;
    }
    if (lastFocusedNodeIdRef.current === focusNodeId) {
      return;
    }

    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }

    const targetNode =
      instance.getNode?.(focusNodeId) ?? nodes.find((node) => node.id === focusNodeId);
    if (!targetNode) {
      return;
    }

    const width = targetNode.measured?.width ?? targetNode.width ?? targetNode.initialWidth ?? 0;
    const height =
      targetNode.measured?.height ?? targetNode.height ?? targetNode.initialHeight ?? 0;
    const centerX = targetNode.position.x + width / 2;
    const centerY = targetNode.position.y + height / 2;
    const zoom = instance.getZoom?.() ?? viewport?.zoom ?? 1;

    void instance.setCenter(centerX, centerY, { duration: 250, zoom });
    lastFocusedNodeIdRef.current = focusNodeId;
    onFocusNodeHandled?.();
  }, [focusNodeId, nodes, onFocusNodeHandled, viewport?.zoom]);

  const handleZoomIn = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }
    void instance.zoomIn({ duration: 160 });
  }, []);

  const handleZoomOut = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }
    void instance.zoomOut({ duration: 160 });
  }, []);

  const handleZoomReset = useCallback(() => {
    const instance = reactFlowInstanceRef.current;
    if (!instance) {
      return;
    }
    void instance.setViewport(
      {
        x: viewport?.x ?? 0,
        y: viewport?.y ?? 0,
        zoom: 1,
      },
      { duration: 180 }
    );
  }, [viewport]);

  const handleGlobalPreviewStart = useCallback(() => {
    suppressNextViewportDirtyRef.current = true;
  }, []);

  const handleGlobalPreviewEnd = useCallback(() => {
    suppressNextViewportDirtyRef.current = false;
  }, []);

  const handleGlobalPreviewViewportChange = useCallback(
    (nextViewport: CanvasViewport) => {
      onViewportChange?.(nextViewport, { markDirty: false });
    },
    [onViewportChange]
  );

  const edges = useGraphCanvasEdges({
    connectedNodeIds,
    graphEdges: graph.edges,
    graphNodes: graph.nodes,
    matchingNodeIds,
    nodeFilter,
    selectedEdgeId,
  });

  const handleNodeMouseDown = useCallback(
    (event: ReactMouseEvent<Element>, nodeId: string) => {
      if (event.button !== 0) {
        return;
      }
      onCloseContextMenu();
      if (pendingCitation) {
        return;
      }

      const wasSelected = selectedNodeIds.includes(nodeId);
      nodePressedRef.current = { id: nodeId, wasSelected };

      if (!wasSelected) {
        onEdgeSelect(null);
        if (event.metaKey || event.ctrlKey) {
          onSelectNodeIds([...selectedNodeIds, nodeId]);
        } else {
          onSelectNodeIds([nodeId]);
        }
      }
    },
    [onCloseContextMenu, pendingCitation, onEdgeSelect, selectedNodeIds, onSelectNodeIds]
  );
  handleNodeMouseDownRef.current = handleNodeMouseDown;

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (event, node) => {
      if (hasJustDraggedRef.current) {
        hasJustDraggedRef.current = false;
        onCloseContextMenu();
        return;
      }
      onCloseContextMenu();
      if (handleCitationNodeClick(node.id)) {
        return;
      }
      onEdgeSelect(null);

      const pressed = nodePressedRef.current;
      nodePressedRef.current = null;

      if (pressed && pressed.id === node.id) {
        if (pressed.wasSelected) {
          if (event.metaKey || event.ctrlKey) {
            const nextSelectedNodeIds = selectedNodeIds.filter(
              (selectedId) => selectedId !== node.id
            );
            onSelectNodeIds(nextSelectedNodeIds);
          } else {
            onSelectNodeIds([node.id]);
          }
        }
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        const nextSelectedNodeIds = selectedNodeIds.includes(node.id)
          ? selectedNodeIds.filter((selectedId) => selectedId !== node.id)
          : [...selectedNodeIds, node.id];
        onSelectNodeIds(nextSelectedNodeIds);
        return;
      }

      onSelectNodeIds([node.id]);
    },
    [
      handleCitationNodeClick,
      onCloseContextMenu,
      onEdgeSelect,
      onSelectNodeIds,
      selectedNodeIds,
    ]
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_, edge) => {
      onCloseContextMenu();
      onSelectNodeIds([]);
      onEdgeSelect(edge.id);
    },
    [onCloseContextMenu, onEdgeSelect, onSelectNodeIds]
  );

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const stableChanges = selectionDragRef.current
      ? changes.filter((change) => change.type !== "select")
      : changes;
    if (stableChanges.length === 0) {
      return;
    }

    const normalizedChanges = normalizeGroupCollisionChanges(
      stableChanges,
      graph.nodes,
      nodesRef.current,
      nodeSizes
    );
    const nextNodes = applyNodeChanges(normalizedChanges, nodesRef.current);
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
  }, [graph.nodes, nodeSizes]);

  const handleCanvasAuxClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;

    if (
      event.button !== MIDDLE_BUTTON ||
      !(target instanceof Element) ||
      !target.closest(".react-flow__pane")
    ) {
      return;
    }

    event.preventDefault();

    const now = Date.now();
    const lastClick = lastMiddleClickRef.current;
    const isDoubleClick =
      lastClick !== null &&
      now - lastClick.time <= MIDDLE_DOUBLE_CLICK_DELAY &&
      Math.abs(event.clientX - lastClick.x) <= MIDDLE_DOUBLE_CLICK_DISTANCE &&
      Math.abs(event.clientY - lastClick.y) <= MIDDLE_DOUBLE_CLICK_DISTANCE;

    if (isDoubleClick) {
      lastMiddleClickRef.current = null;
      void reactFlowInstanceRef.current?.fitView({ duration: 250 });
      return;
    }

    lastMiddleClickRef.current = {
      time: now,
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

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
    [clearCitationSelection, onContextMenuRequest, onSelectNode, selectedNodeId]
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

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;

      const instance = reactFlowInstanceRef.current;
      const container = containerRef.current;
      if (!instance || !container) return;

      const bounds = container.getBoundingClientRect();
      const clientX = Number.isFinite(event.clientX) ? event.clientX : bounds.left + bounds.width / 2;
      const clientY = Number.isFinite(event.clientY) ? event.clientY : bounds.top + bounds.height / 2;

      const position = instance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      onDropFiles?.(files, position);
    },
    [onDropFiles]
  );

  return (
    <div
      className="graph-canvas"
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
        multiSelectionKeyCode={["Meta", "Control"]}
        nodeTypes={NODE_TYPES}
        nodesDraggable
        nodesFocusable={false}
        autoPanOnNodeDrag={false}
        panOnDrag={[1]}
        selectionMode={selectionMode}
        selectionOnDrag
        onAuxClick={handleCanvasAuxClick}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        onEdgeClick={handleEdgeClick}
        onMoveEnd={(_, nextViewport) => {
          const markDirty = !suppressNextViewportDirtyRef.current;
          onViewportChange?.(nextViewport, { markDirty });
          if (!markDirty) {
            suppressNextViewportDirtyRef.current = false;
          }
        }}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={handleNodesChange}
        onSelectionStart={handleSelectionStart}
        onSelectionEnd={handleSelectionEnd}
        onPaneClick={() => {
          clearAlignmentGuides();
          onCloseContextMenu();
          onEdgeSelect(null);
          onSelectNodeIds([]);
        }}
        onPaneContextMenu={handlePaneContextMenu}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
      >
        <GlobalPreviewController
          nodeCount={nodes.length}
          requestId={globalPreviewRequestId}
          onPreviewEnd={handleGlobalPreviewEnd}
          onPreviewStart={handleGlobalPreviewStart}
          onPreviewViewportChange={handleGlobalPreviewViewportChange}
        />
        <Background color="var(--color-graph-grid)" gap={GRAPH_GRID_SIZE} size={2} />
        <GraphScaleIndicator
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
        />
        <GraphCanvasFileStatusPanel
          currentFileName={currentFileName}
          dirty={dirty}
          fileStatus={fileStatus}
        />
        {pendingCitation ? (
          <div
            className="react-flow__panel graph-canvas-panel graph-canvas-panel--citation-pending top center"
            role="status"
          >
            {pendingCitation.message}
          </div>
        ) : null}
      </ReactFlow>
      {alignmentGuides.length > 0 ? (
        <div aria-hidden="true" className="alignment-guides">
          {alignmentGuides.map((guide) => (
            <span
              key={guide.id}
              className={`alignment-guide alignment-guide--${guide.orientation}`}
              style={
                guide.orientation === "vertical"
                  ? {
                      height: guide.end - guide.start,
                      left: guide.offset,
                      top: guide.start,
                    }
                  : {
                      left: guide.start,
                      top: guide.offset,
                      width: guide.end - guide.start,
                    }
              }
            />
          ))}
        </div>
      ) : null}
      {contextMenu ? (
        <GraphContextMenu
          contextMenu={contextMenu}
          graph={graph}
          selectedNodeId={selectedNodeId}
          onClose={onCloseContextMenu}
          onStartCitation={startCitationSelection}
          onCreateNode={onCreateNode}
          onDeleteNode={onDeleteNode}
          onEditNode={onEditNode}
          onToggleNodeLock={onToggleNodeLock}
        />
      ) : null}
    </div>
  );
}
