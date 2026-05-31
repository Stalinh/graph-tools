import type { Node } from "@xyflow/react";
import type { CSSProperties, MouseEvent } from "react";
import { isReferenceableNode } from "../../lib/graphConstraints";
import { DEFAULT_GROUP_SIZE, constrainGroupNodeSize } from "../../lib/graphLayout";
import { nodeMatchesSearch } from "../../lib/searchUtils";
import type { EntityType, GraphNode } from "../../types";

interface GraphFlowNodeData extends Record<string, unknown> {
  childCount: number;
  imageBlob?: Blob;
  isQuickEditing: boolean;
  isSelected: boolean;
  isCitationSelectionActive: boolean;
  node: GraphNode;
  onNodeMouseDown?: (event: MouseEvent, nodeId: string) => void;
  onNodeResizeEnd?: (nodeId: string, size: { width: number; height: number }) => void;
  onQuickAddChild?: (parentId: string) => void;
  onQuickEditSubmit: (
    nodeId: string,
    title: string,
    options?: { focusInspectorContent?: boolean }
  ) => void;
  onReferenceSelect: (nodeId: string | null) => void;
  searchQuery?: string;
}

type GraphFlowNode = Node<GraphFlowNodeData>;

const SHOULD_USE_TEST_NODE_SIZE_FALLBACK =
  typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

export function createGraphNodes(
  graphNodes: GraphNode[],
  selectedNodeIds: string[],
  onSelectNode: (nodeId: string | null) => void,
  quickEditingNodeId: string | null,
  onQuickEditSubmit: (
    nodeId: string,
    title: string,
    options?: { focusInspectorContent?: boolean }
  ) => void,
  previousNodes: Node[] = [],
  savedNodePositions: Record<string, { x: number; y: number }> = {},
  savedNodeSizes: Record<string, { width: number; height: number }> = {},
  searchQuery = "",
  connectedNodeIds: Set<string> = new Set(),
  images: Map<string, Blob> = new Map(),
  nodeFilter: EntityType | "locked" | "all" = "all",
  selectedEdgeActive = false,
  citationSelectionActive = false,
  onNodeMouseDown?: (event: MouseEvent, nodeId: string) => void,
  matchingNodeIds: Set<string> | null = null,
  onQuickAddChild?: (parentId: string) => void,
  onNodeResizeEnd?: (nodeId: string, size: { width: number; height: number }) => void
) {
  const selectedNodeIdSet = new Set(selectedNodeIds);

  const childCounts = new Map<string, number>();
  graphNodes.forEach((n) => {
    if (n.parentId) {
      childCounts.set(n.parentId, (childCounts.get(n.parentId) ?? 0) + 1);
    }
  });

  const sortedGraphNodes = [...graphNodes].sort((a, b) => {
    if (a.type === "group" && b.type !== "group") return -1;
    if (a.type !== "group" && b.type === "group") return 1;
    return 0;
  });

  return sortedGraphNodes.map((node, index) => {
    const previousNode = previousNodes.find(({ id }) => id === node.id);
    const position =
      savedNodePositions[node.id] ??
      previousNode?.position ??
      getNodePosition(index, sortedGraphNodes.length);
    const fallbackSize = SHOULD_USE_TEST_NODE_SIZE_FALLBACK ? estimateNodeSize(node) : null;
    const savedSize = savedNodeSizes[node.id];
    const size =
      node.type === "group" && savedSize
        ? constrainGroupNodeSize(savedSize)
        : savedSize || fallbackSize;
    const rfNodeType =
      node.type === "image" ? "imageNode" : node.type === "group" ? "groupNode" : "cardNode";
    const isVisibleByFilter =
      nodeFilter === "all"
        ? true
        : nodeFilter === "locked"
          ? Boolean(node.locked)
          : node.type === nodeFilter;

    const isMatch = !matchingNodeIds || matchingNodeIds.has(node.id);
    const isConnected = connectedNodeIds.has(node.id);
    const filterOpacity = isVisibleByFilter ? 1 : 0.14;
    const searchOpacity = isMatch ? 1 : 0.3;
    const edgeSelectionOpacity = selectedEdgeActive ? (isConnected ? 1 : 0.14) : 1;
    const citationSelectionOpacity =
      citationSelectionActive && !isReferenceableNode(node) ? 0.3 : 1;
    const nodeOpacity =
      (node.opacity ?? 1) *
      searchOpacity *
      filterOpacity *
      edgeSelectionOpacity *
      citationSelectionOpacity;
    const isSelected = selectedNodeIdSet.has(node.id);
    const isReferenceDisabled = citationSelectionActive && !isReferenceableNode(node);
    const classNames = [
      "graph-node",
      `graph-node--${node.type}`,
      node.locked ? "is-locked" : "",
      isSelected ? "is-selected" : "",
      isReferenceDisabled ? "is-citation-disabled" : "",
      isConnected ? "is-edge-connected" : "",
      !isVisibleByFilter ? "is-filter-dimmed" : "",
      matchingNodeIds ? (isMatch ? "is-search-match" : "is-search-dimmed") : "",
    ]
      .filter(Boolean)
      .join(" ");

    const nextNode = {
      id: node.id,
      parentId: node.parentId,
      type: rfNodeType,
      selected: isSelected,
      selectable: !isReferenceDisabled,
      draggable: !node.locked,
      style: {
        opacity: nodeOpacity,
        ...(size
          ? {
              width: size.width,
              height: size.height,
            }
          : {}),
      } as CSSProperties,
      ...(size
        ? {
            initialWidth: size.width,
            initialHeight: size.height,
          }
        : {}),
      position,
      data: {
        isSelected,
        isCitationSelectionActive: citationSelectionActive,
        isQuickEditing: quickEditingNodeId === node.id,
        node,
        onReferenceSelect: onSelectNode,
        onQuickEditSubmit,
        imageBlob: node.imagePath ? images.get(node.imagePath) : undefined,
        onNodeMouseDown,
        searchQuery: searchQuery || undefined,
        childCount: childCounts.get(node.id) ?? 0,
        onQuickAddChild,
        onNodeResizeEnd,
      },
      className: classNames,
    };

    if (previousNode) {
      const previousData = previousNode.data as Partial<GraphFlowNodeData>;
      const styleChanged =
        previousNode.style?.opacity !== nextNode.style.opacity ||
        previousNode.style?.width !== nextNode.style.width ||
        previousNode.style?.height !== nextNode.style.height;
      const positionChanged =
        previousNode.position?.x !== nextNode.position.x ||
        previousNode.position?.y !== nextNode.position.y;
      const dataChanged =
        previousData.isSelected !== nextNode.data.isSelected ||
        previousData.isCitationSelectionActive !== nextNode.data.isCitationSelectionActive ||
        previousData.isQuickEditing !== nextNode.data.isQuickEditing ||
        previousData.node !== nextNode.data.node ||
        previousData.imageBlob !== nextNode.data.imageBlob ||
        previousData.onReferenceSelect !== nextNode.data.onReferenceSelect ||
        previousData.onQuickEditSubmit !== nextNode.data.onQuickEditSubmit ||
        previousData.onNodeMouseDown !== nextNode.data.onNodeMouseDown ||
        previousData.searchQuery !== nextNode.data.searchQuery ||
        previousData.childCount !== nextNode.data.childCount ||
        previousData.onQuickAddChild !== nextNode.data.onQuickAddChild ||
        previousData.onNodeResizeEnd !== nextNode.data.onNodeResizeEnd;
      const otherChanged =
        previousNode.selected !== nextNode.selected ||
        previousNode.selectable !== nextNode.selectable ||
        previousNode.draggable !== nextNode.draggable ||
        previousNode.className !== nextNode.className ||
        previousNode.type !== nextNode.type;

      if (!styleChanged && !positionChanged && !dataChanged && !otherChanged) {
        return previousNode;
      }
    }

    return nextNode;
  });
}

export function getEdgeVisualStyle({
  edgeId,
  selectedEdgeId,
  hasSelectedEdge,
  isDimmedBySearch,
  isDimmedByFilter,
}: {
  edgeId: string;
  selectedEdgeId: string | null;
  hasSelectedEdge: boolean;
  isDimmedBySearch: boolean;
  isDimmedByFilter: boolean;
}) {
  const isSelected = selectedEdgeId === edgeId;
  const shouldHide = hasSelectedEdge ? !isSelected : isDimmedBySearch || isDimmedByFilter;

  return {
    isSelected,
    opacity: shouldHide ? 0.08 : 1,
    strokeWidth: isSelected ? 3 : 1.8,
  };
}

export function matchesSearch(node: GraphNode, query: string): boolean {
  return nodeMatchesSearch(node, query);
}

export function shouldDimEdgeByFilter(
  edge: { sourceId: string; targetId: string },
  visibleNodeIds: Set<string>
) {
  return !visibleNodeIds.has(edge.sourceId) && !visibleNodeIds.has(edge.targetId);
}

export function getNodePositions(nodes: GraphFlowNode[]) {
  return Object.fromEntries(nodes.map((node) => [node.id, node.position]));
}

export function estimateNodeSize(node: GraphNode) {
  if (node.type === "group") {
    return DEFAULT_GROUP_SIZE;
  }
  const title = node.title.trim();
  const content = getPlainTextContent(node.contentHtml);
  const tags = node.tags.slice(0, 3).join(", ");
  const snippets = [title, content, tags].filter(Boolean);
  const longestSnippetLength = Math.max(...snippets.map((snippet) => snippet.length), 12);
  const width = clamp(Math.round(longestSnippetLength * 6.6) + 36, 140, 400);
  const approxCharsPerLine = Math.max(Math.floor((width - 20) / 6.6), 10);
  const lineCount = snippets.reduce(
    (count, snippet) => count + Math.max(Math.ceil(snippet.length / approxCharsPerLine), 1),
    1
  );

  return {
    width,
    height: Math.max(68, 34 + lineCount * 18),
  };
}

const globalDOMParser = typeof window !== "undefined" ? new DOMParser() : null;

export function getPlainTextContent(contentHtml: string | undefined) {
  if (!contentHtml) {
    return "";
  }

  if (!globalDOMParser) {
    return contentHtml
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const document = globalDOMParser.parseFromString(contentHtml, "text/html");
  return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getNodePosition(index: number, total: number) {
  const radius = total > 6 ? 260 : 190;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;

  return {
    x: Math.round(Math.cos(angle) * radius + 320),
    y: Math.round(Math.sin(angle) * radius + 240),
  };
}
