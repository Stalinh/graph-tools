import {
  applyNodeChanges,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useRef,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type RefObject,
} from 'react';
import type { CanvasPosition, GraphData, NodeSize } from '../../types';
import { normalizeGroupCollisionChanges } from './canvasInteractionUtils';
import type { MarqueeSelectionDrag } from './useGraphCanvasMarqueeSelection';

const MIDDLE_BUTTON = 1;
const MIDDLE_DOUBLE_CLICK_DELAY = 400;
const MIDDLE_DOUBLE_CLICK_DISTANCE = 8;

declare global {
  interface Window {
    __GRAPH_CANVAS_PROFILE_NODES_CHANGE__?: boolean;
  }
}

interface UseGraphCanvasInteractionsOptions {
  clearAlignmentGuides: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  graph: GraphData;
  handleCitationNodeClick: (nodeId: string) => boolean;
  handleNodeMouseDownRef: MutableRefObject<
    ((event: ReactMouseEvent<Element>, nodeId: string) => void) | null
  >;
  hasJustDraggedRef: MutableRefObject<boolean>;
  nodeSizes: Record<string, NodeSize>;
  nodesRef: MutableRefObject<Node[]>;
  pendingCitation: boolean;
  reactFlowInstanceRef: RefObject<ReactFlowInstance | null>;
  selectedNodeIds: string[];
  selectionDragRef: MutableRefObject<MarqueeSelectionDrag | null>;
  setNodes: (nodes: Node[]) => void;
  onCloseContextMenu: () => void;
  onDropFiles?: (files: File[], position: CanvasPosition) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onSelectNodeIds: (nodeIds: string[]) => void;
}

interface NodesChangeProfile {
  applyEndedAt: number;
  changeTypes: string[];
  changes: number;
  nodes: number;
  normalizeEndedAt: number;
  profileStartedAt: number;
}

function isNodesChangeProfilingEnabled() {
  return typeof window !== 'undefined' && window.__GRAPH_CANVAS_PROFILE_NODES_CHANGE__ === true;
}

function getProfilingTimestamp() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function toProfilingMs(value: number) {
  return Number(value.toFixed(3));
}

function getChangeTypes(changes: NodeChange[]) {
  return Array.from(new Set(changes.map((change) => change.type)));
}

function isPositionChange(change: NodeChange) {
  return change.type === 'position';
}

function requestNodesChangeFrame(callback: FrameRequestCallback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }

  return globalThis.setTimeout(() => callback(getProfilingTimestamp()), 0);
}

function cancelNodesChangeFrame(frameId: number) {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(frameId);
    return;
  }

  globalThis.clearTimeout(frameId);
}

function logNodesChangeProfile(
  profile: NodesChangeProfile,
  setNodesStartedAt: number,
  setNodesEndedAt: number,
  deferred: boolean
) {
  console.debug('[GraphCanvas] nodes change', {
    changes: profile.changes,
    nodes: profile.nodes,
    changeTypes: profile.changeTypes,
    deferred,
    normalizeGroupCollisionChangesMs: toProfilingMs(
      profile.normalizeEndedAt - profile.profileStartedAt
    ),
    applyNodeChangesMs: toProfilingMs(profile.applyEndedAt - profile.normalizeEndedAt),
    setNodesMs: toProfilingMs(setNodesEndedAt - setNodesStartedAt),
    totalMs: toProfilingMs(setNodesEndedAt - profile.profileStartedAt),
  });
}

export function useGraphCanvasInteractions({
  clearAlignmentGuides,
  containerRef,
  graph,
  handleCitationNodeClick,
  handleNodeMouseDownRef,
  hasJustDraggedRef,
  nodeSizes,
  nodesRef,
  pendingCitation,
  reactFlowInstanceRef,
  selectedNodeIds,
  selectionDragRef,
  setNodes,
  onCloseContextMenu,
  onDropFiles,
  onEdgeSelect,
  onSelectNodeIds,
}: UseGraphCanvasInteractionsOptions) {
  const lastMiddleClickRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const nodePressedRef = useRef<{ id: string; wasSelected: boolean } | null>(null);
  const pendingNodesChangeFrameRef = useRef<number | null>(null);
  const pendingNodesRef = useRef<Node[] | null>(null);
  const pendingProfileRef = useRef<NodesChangeProfile | null>(null);

  const cancelPendingNodesChangeFrame = useCallback(() => {
    if (pendingNodesChangeFrameRef.current !== null) {
      cancelNodesChangeFrame(pendingNodesChangeFrameRef.current);
      pendingNodesChangeFrameRef.current = null;
    }
    pendingNodesRef.current = null;
    pendingProfileRef.current = null;
  }, []);

  const commitPendingNodesChangeFrame = useCallback(() => {
    const pendingNodes = pendingNodesRef.current;
    if (!pendingNodes) {
      pendingNodesChangeFrameRef.current = null;
      pendingProfileRef.current = null;
      return;
    }

    const pendingProfile = pendingProfileRef.current;
    pendingNodesChangeFrameRef.current = null;
    pendingNodesRef.current = null;
    pendingProfileRef.current = null;

    const setNodesStartedAt = pendingProfile ? getProfilingTimestamp() : 0;
    setNodes(pendingNodes);
    if (pendingProfile) {
      logNodesChangeProfile(pendingProfile, setNodesStartedAt, getProfilingTimestamp(), true);
    }
  }, [setNodes]);

  useEffect(() => cancelPendingNodesChangeFrame, [cancelPendingNodesChangeFrame]);

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
      hasJustDraggedRef,
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

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const stableChanges = selectionDragRef.current
        ? changes.filter((change) => change.type !== 'select')
        : changes;
      if (stableChanges.length === 0) {
        return;
      }

      const shouldProfile = isNodesChangeProfilingEnabled();
      const profileStartedAt = shouldProfile ? getProfilingTimestamp() : 0;
      const normalizedChanges = normalizeGroupCollisionChanges(
        stableChanges,
        graph.nodes,
        nodesRef.current,
        nodeSizes
      );
      const normalizeEndedAt = shouldProfile ? getProfilingTimestamp() : 0;
      const nextNodes = applyNodeChanges(normalizedChanges, nodesRef.current);
      const applyEndedAt = shouldProfile ? getProfilingTimestamp() : 0;
      nodesRef.current = nextNodes;
      const profile = shouldProfile
        ? {
            applyEndedAt,
            changeTypes: getChangeTypes(stableChanges),
            changes: stableChanges.length,
            nodes: nextNodes.length,
            normalizeEndedAt,
            profileStartedAt,
          }
        : null;
      if (stableChanges.every(isPositionChange)) {
        pendingNodesRef.current = nextNodes;
        pendingProfileRef.current = profile;
        if (pendingNodesChangeFrameRef.current === null) {
          pendingNodesChangeFrameRef.current = requestNodesChangeFrame(() => {
            commitPendingNodesChangeFrame();
          });
        }
        return;
      }

      cancelPendingNodesChangeFrame();
      const setNodesStartedAt = shouldProfile ? getProfilingTimestamp() : 0;
      setNodes(nextNodes);
      if (profile) {
        const setNodesEndedAt = getProfilingTimestamp();
        logNodesChangeProfile(profile, setNodesStartedAt, setNodesEndedAt, false);
      }
    },
    [
      cancelPendingNodesChangeFrame,
      commitPendingNodesChangeFrame,
      graph.nodes,
      nodeSizes,
      nodesRef,
      selectionDragRef,
      setNodes,
    ]
  );

  const handleCanvasAuxClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target;

      if (
        event.button !== MIDDLE_BUTTON ||
        !(target instanceof Element) ||
        !target.closest('.react-flow__pane')
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
    },
    [reactFlowInstanceRef]
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;

      const instance = reactFlowInstanceRef.current;
      const container = containerRef.current;
      if (!instance || !container) return;

      const bounds = container.getBoundingClientRect();
      const clientX = Number.isFinite(event.clientX)
        ? event.clientX
        : bounds.left + bounds.width / 2;
      const clientY = Number.isFinite(event.clientY)
        ? event.clientY
        : bounds.top + bounds.height / 2;

      const position = instance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      onDropFiles?.(files, position);
    },
    [containerRef, onDropFiles, reactFlowInstanceRef]
  );

  const handlePaneClick = useCallback(() => {
    clearAlignmentGuides();
    onCloseContextMenu();
    onEdgeSelect(null);
    onSelectNodeIds([]);
  }, [clearAlignmentGuides, onCloseContextMenu, onEdgeSelect, onSelectNodeIds]);

  return {
    handleCanvasAuxClick,
    handleDrop,
    handleEdgeClick,
    handleNodeClick,
    handleNodesChange,
    handlePaneClick,
  };
}
