import {
  Background,
  ReactFlow,
  SelectionMode,
  applyNodeChanges,
  type Edge,
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
import {
  createGraphNodes,
  getEdgeVisualStyle,
  shouldDimEdgeByFilter,
} from "./GraphCanvas/graphUtils";

interface PendingCitation {
  direction: EdgeDirection;
  message: string;
  sourceId: string | null;
}

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
  onViewportChange?: (viewport: CanvasViewport) => void;
}

const EDGE_STYLE: Record<string, Edge["style"]> = {
  citation: { strokeWidth: 1.8 },
};

const EDGE_TYPES: EdgeTypes = {
  citation: CitationEdge as EdgeTypes[string],
};

const EMPTY_NODE_SIZES: Record<string, NodeSize> = {};
const MIDDLE_BUTTON = 1;
const MIDDLE_DOUBLE_CLICK_DELAY = 400;
const MIDDLE_DOUBLE_CLICK_DISTANCE = 8;
type ContextMenuEvent = MouseEvent | ReactMouseEvent<Element>;
interface ScreenPoint {
  x: number;
  y: number;
}

interface ScreenRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

const NODE_TYPES: NodeTypes = {
  cardNode: ResizableGraphNode as NodeTypes[string],
  imageNode: ImageGraphNode as NodeTypes[string],
  groupNode: GroupNode as NodeTypes[string],
};

function getScreenRect(start: ScreenPoint, end: ScreenPoint): ScreenRect {
  return {
    bottom: Math.max(start.y, end.y),
    left: Math.min(start.x, end.x),
    right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y),
  };
}

function containsRect(container: ScreenRect, target: ScreenRect) {
  return (
    target.left >= container.left &&
    target.right <= container.right &&
    target.top >= container.top &&
    target.bottom <= container.bottom
  );
}

function intersectsRect(a: ScreenRect, b: ScreenRect) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

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
  const nodeDragStartPositions = useRef<Record<string, { x: number; y: number }>>({});
  const nodeDragStartTimeRef = useRef<Record<string, number>>({});
  const hasJustDraggedRef = useRef(false);
  const lastFocusedNodeIdRef = useRef<string | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const nodePressedRef = useRef<{ id: string; wasSelected: boolean } | null>(null);
  const handleNodeMouseDownRef = useRef<
    ((event: ReactMouseEvent<Element>, nodeId: string) => void) | null
  >(null);

  const selectionDragRef = useRef<{
    active: boolean;
    additive: boolean;
    baseSelectedNodeIds: string[];
    currentX: number;
    currentY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const DRAG_DISTANCE_THRESHOLD = 16;
  const DRAG_TIME_THRESHOLD = 300;
  onSelectNodeRef.current = onSelectNode;
  const [pendingCitation, setPendingCitation] = useState<PendingCitation | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.Full);

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
      (event, nodeId) => handleNodeMouseDownRef.current?.(event, nodeId),
      null,
      handleQuickAddChild,
      onNodeResizeEnd
    )
  );
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;

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
        (event, nodeId) => handleNodeMouseDownRef.current?.(event, nodeId),
        matchingNodeIds ?? null,
        handleQuickAddChild,
        onNodeResizeEnd
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
    handleQuickAddChild,
    onNodeResizeEnd,
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

  const edges = useMemo<Edge[]>(() => {
    const filterMatchesNode = (node: GraphNode) => {
      if (nodeFilter === "all") return true;
      if (nodeFilter === "locked") return Boolean(node.locked);
      return node.type === nodeFilter;
    };
    const visibleNodeIds = new Set(graph.nodes.filter(filterMatchesNode).map((node) => node.id));

    return graph.edges.map((edge) => {
      const isDimmed =
        matchingNodeIds !== null &&
        !matchingNodeIds.has(edge.sourceId) &&
        !matchingNodeIds.has(edge.targetId);
      const isHiddenByFilter = shouldDimEdgeByFilter(edge, visibleNodeIds);
      const visualStyle = getEdgeVisualStyle({
        edgeId: edge.id,
        selectedEdgeId,
        hasSelectedEdge: connectedNodeIds.size > 0,
        isDimmedBySearch: isDimmed,
        isDimmedByFilter: isHiddenByFilter,
      });

      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: "citation",
        interactionWidth: 40,
        className: visualStyle.isSelected ? "graph-edge--selected" : "",
        data: {
          direction: edge.direction ?? "unidirectional",
          selected: visualStyle.isSelected,
          color: edge.color,
          style: edge.style === "sketch" ? "sketch" : "note-dash",
        },
        style: {
          ...EDGE_STYLE.citation,
          opacity: visualStyle.opacity,
          strokeWidth: visualStyle.strokeWidth,
        },
      };
    });
  }, [connectedNodeIds, graph.edges, graph.nodes, nodeFilter, matchingNodeIds, selectedEdgeId]);

  const startCitationSelection = useCallback(
    (direction: EdgeDirection) => {
      setPendingCitation({
        direction,
        sourceId: null,
        message: isZh
          ? "选择被引用内容：点击第 1 个节点，Esc 取消"
          : "Choose the cited content: click the first node, or press Esc to cancel",
      });
      onEdgeSelect(null);
      onSelectNode(null);
    },
    [isZh, onEdgeSelect, onSelectNode]
  );

  useEffect(() => {
    if (!pendingCitation) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingCitation(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingCitation]);

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
      if (pendingCitation) {
        if (!pendingCitation.sourceId) {
          setPendingCitation({
            ...pendingCitation,
            sourceId: node.id,
            message: isZh
              ? "选择引用它的内容：点击第 2 个节点完成，Esc 取消"
              : "Choose the source content: click the second node to finish, or press Esc to cancel",
          });
          onSelectNode(node.id);
          onEdgeSelect(null);
          return;
        }

        if (node.id === pendingCitation.sourceId) {
          setPendingCitation({
            ...pendingCitation,
            message: isZh
              ? "不能引用自身，请选择另一个节点"
              : "A node cannot link to itself. Choose another node.",
          });
          return;
        }

        const citationExists = graph.edges.some(
          (edge) => edge.sourceId === pendingCitation.sourceId && edge.targetId === node.id
        );
        if (citationExists) {
          setPendingCitation({
            ...pendingCitation,
            message: isZh
              ? "引用已存在，请选择另一个节点"
              : "That link already exists. Choose another node.",
          });
          return;
        }

        onCreateCitation(pendingCitation.sourceId, node.id, pendingCitation.direction);
        onSelectNode(null);
        onEdgeSelect(`edge-${pendingCitation.sourceId}-${node.id}`);
        setPendingCitation(null);
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
      graph.edges,
      isZh,
      onCloseContextMenu,
      onCreateCitation,
      onEdgeSelect,
      onSelectNode,
      onSelectNodeIds,
      pendingCitation,
      selectedNodeIds,
    ]
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_, edge) => {
      onCloseContextMenu();
      onEdgeSelect(edge.id);
    },
    [onCloseContextMenu, onEdgeSelect]
  );

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const stableChanges = selectionDragRef.current
      ? changes.filter((change) => change.type !== "select")
      : changes;
    if (stableChanges.length === 0) {
      return;
    }

    const nextNodes = applyNodeChanges(stableChanges, nodesRef.current);
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
  }, []);

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
      setPendingCitation(null);

      if (nodeId) {
        onSelectNode(nodeId);
      }
    },
    [onContextMenuRequest, onSelectNode, selectedNodeId]
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
      const clientX =
        Number.isFinite(event.clientX) && event.clientX !== 0
          ? event.clientX
          : bounds.left + bounds.width / 2;
      const clientY =
        Number.isFinite(event.clientY) && event.clientY !== 0
          ? event.clientY
          : bounds.top + bounds.height / 2;

      const position = instance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      onDropFiles?.(files, position);
    },
    [onDropFiles]
  );

  const getMarqueeSelectedNodeIds = useCallback(
    (selectionDrag: NonNullable<typeof selectionDragRef.current>) => {
      const container = containerRef.current;
      if (!container) {
        return [];
      }

      const selectionRect = getScreenRect(
        { x: selectionDrag.startX, y: selectionDrag.startY },
        { x: selectionDrag.currentX, y: selectionDrag.currentY }
      );
      const requiresFullContainment = selectionDrag.currentX >= selectionDrag.startX;
      const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
      const selectedIds = new Set<string>();

      container.querySelectorAll<HTMLElement>(".react-flow__node[data-id]").forEach((element) => {
        const nodeId = element.getAttribute("data-id");
        if (!nodeId || !graphNodeIds.has(nodeId)) {
          return;
        }

        const bounds = element.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          return;
        }

        const nodeRect = {
          bottom: bounds.bottom,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
        };
        const isHit = requiresFullContainment
          ? containsRect(selectionRect, nodeRect)
          : intersectsRect(selectionRect, nodeRect);

        if (isHit) {
          selectedIds.add(nodeId);
        }
      });

      return graph.nodes.map((node) => node.id).filter((nodeId) => selectedIds.has(nodeId));
    },
    [graph.nodes]
  );

  const commitSelectionDrag = useCallback(() => {
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag?.active) {
      selectionDragRef.current = null;
      setSelectionMode(SelectionMode.Full);
      return;
    }

    onEdgeSelect(null);
    const candidateNodeIds = getMarqueeSelectedNodeIds(selectionDrag);
    if (selectionDrag.additive) {
      onSelectNodeIds([...new Set([...selectionDrag.baseSelectedNodeIds, ...candidateNodeIds])]);
    } else {
      onSelectNodeIds(candidateNodeIds);
    }

    selectionDragRef.current = null;
    setSelectionMode(SelectionMode.Full);
  }, [getMarqueeSelectedNodeIds, onEdgeSelect, onSelectNodeIds]);

  const updateSelectionDragPoint = (point: ScreenPoint) => {
    const selectionDrag = selectionDragRef.current;
    if (!selectionDrag) {
      return;
    }

    selectionDrag.currentX = point.x;
    selectionDrag.currentY = point.y;
  };

  return (
    <div
      className="graph-canvas"
      ref={containerRef}
      onMouseDownCapture={(event) => {
        const target = event.target;
        if (
          event.button !== 0 ||
          !(target instanceof Element) ||
          !target.closest(".react-flow__pane")
        ) {
          return;
        }

        selectionDragRef.current = {
          active: false,
          additive: event.metaKey || event.ctrlKey,
          baseSelectedNodeIds: selectedNodeIds,
          currentX: event.clientX,
          currentY: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
        };
      }}
      onMouseMoveCapture={(event) => {
        updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
        const selectionDrag = selectionDragRef.current;
        if (!selectionDrag) {
          return;
        }

        const distanceX = Math.abs(event.clientX - selectionDrag.startX);
        const distanceY = Math.abs(event.clientY - selectionDrag.startY);
        if (distanceX < 4 && distanceY < 4) {
          return;
        }

        setSelectionMode(
          event.clientX >= selectionDrag.startX ? SelectionMode.Full : SelectionMode.Partial
        );
      }}
      onMouseUpCapture={(event) => {
        updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
        const selectionDrag = selectionDragRef.current;
        if (!selectionDrag) {
          return;
        }

        if (!selectionDrag.active) {
          selectionDragRef.current = null;
          setSelectionMode(SelectionMode.Full);
        }
      }}
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
        panOnDrag={[1]}
        selectionMode={selectionMode}
        selectionOnDrag
        onAuxClick={handleCanvasAuxClick}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        onEdgeClick={handleEdgeClick}
        onMoveEnd={(_, nextViewport) => onViewportChange?.(nextViewport)}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeClick={handleNodeClick}
        onNodeDragStart={(_, node) => {
          const currentNodes = nodesRef.current;
          if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
            selectedNodeIds.forEach((selectedNodeId) => {
              const selectedNode = currentNodes.find(
                (currentNode) => currentNode.id === selectedNodeId
              );
              if (selectedNode) {
                nodeDragStartPositions.current[selectedNodeId] = { ...selectedNode.position };
              }
            });
          } else {
            nodeDragStartPositions.current[node.id] = { ...node.position };
          }
          nodeDragStartTimeRef.current[node.id] = Date.now();
        }}
        onNodeDragStop={(_, node) => {
          const from = nodeDragStartPositions.current[node.id] ?? node.position;
          const startTime = nodeDragStartTimeRef.current[node.id];
          const dx = Math.abs(node.position.x - from.x);
          const dy = Math.abs(node.position.y - from.y);
          const distanceMoved = Math.sqrt(dx * dx + dy * dy);
          const timeElapsed = startTime ? Date.now() - startTime : 0;

          if (distanceMoved > DRAG_DISTANCE_THRESHOLD && timeElapsed > DRAG_TIME_THRESHOLD) {
            hasJustDraggedRef.current = true;
          }
          if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
            const currentNodes = nodesRef.current;
            const moves = selectedNodeIds
              .map((selectedNodeId) => {
                const currentNode = currentNodes.find(
                  (canvasNode) => canvasNode.id === selectedNodeId
                );
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
              .filter(
                (
                  move
                ): move is {
                  nodeId: string;
                  from: { x: number; y: number };
                  to: { x: number; y: number };
                } => move !== null
              );

            onNodesDragEnd?.(moves);
            selectedNodeIds.forEach((selectedNodeId) => {
              delete nodeDragStartPositions.current[selectedNodeId];
            });
          } else {
            onNodeDragEnd?.(node.id, from, { ...node.position });
            delete nodeDragStartPositions.current[node.id];
          }
          delete nodeDragStartPositions.current[node.id];
          delete nodeDragStartTimeRef.current[node.id];
        }}
        onNodesChange={handleNodesChange}
        onSelectionStart={() => {
          if (selectionDragRef.current) {
            selectionDragRef.current.active = true;
            if (!selectionDragRef.current.additive) {
              onEdgeSelect(null);
              onSelectNodeIds([]);
            }
          }
        }}
        onSelectionEnd={(event) => {
          updateSelectionDragPoint({ x: event.clientX, y: event.clientY });
          commitSelectionDrag();
        }}
        onPaneClick={() => {
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
        <Background color="var(--color-graph-grid)" gap={20} size={2} />
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
