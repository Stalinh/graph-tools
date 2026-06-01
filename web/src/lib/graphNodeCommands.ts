import type { CanvasPosition, GraphData, GraphEdge, GraphNode, NodeSize } from "../types";
import { DEFAULT_GROUP_SIZE, snapPositionToGrid } from "./graphLayout";
import {
  adjustGroupSizeAndPosition,
  detachChildrenFromGroup,
  findAvailableGroupPosition,
} from "./groupNodeLayout";
import { addNode, removeNode } from "./graphMutator";

interface CreateNodeDraftOptions {
  createdAt: string;
  defaultCardTitle: string;
  defaultGroupTitle: string;
  graph: GraphData;
  id: string;
  imagePath?: string;
  parentId?: string;
  position: CanvasPosition;
  sizes: Record<string, NodeSize>;
  type: GraphNode["type"];
  positions: Record<string, CanvasPosition>;
}

interface RemoveNodeMeta {
  removedNode: GraphNode;
  position: CanvasPosition;
  size?: NodeSize;
  removedEdges: GraphEdge[];
  affectedRefs: { ownerId: string; refId: string }[];
}

export function createNodeDraft({
  createdAt,
  defaultCardTitle,
  defaultGroupTitle,
  graph,
  id,
  imagePath,
  parentId,
  position,
  positions,
  sizes,
  type,
}: CreateNodeDraftOptions) {
  let resolvedParentId = parentId;
  let resolvedPosition = { ...position };

  if (!resolvedParentId && type !== "group") {
    resolvedParentId = findContainingGroupId(position, graph.nodes, positions, sizes);
  }

  if (type === "group") {
    resolvedPosition = snapPositionToGrid(resolvedPosition);
    resolvedPosition = findAvailableGroupPosition(id, resolvedPosition, graph.nodes, positions, sizes);
  } else if (resolvedParentId) {
    const parentPosition = positions[resolvedParentId] ?? { x: 0, y: 0 };
    resolvedPosition = {
      x: position.x - parentPosition.x,
      y: position.y - parentPosition.y,
    };
  }

  const parentGroup = resolvedParentId
    ? graph.nodes.find((node) => node.id === resolvedParentId)
    : undefined;
  const initialTags = parentGroup && parentGroup.title ? [parentGroup.title] : [];
  const node = createNodeData({
    createdAt,
    defaultCardTitle,
    defaultGroupTitle,
    id,
    imagePath,
    initialTags,
    parentId: resolvedParentId,
    type,
  });
  const nextGraph = addNode(graph, node);
  let nextPositions = {
    ...positions,
    [id]: resolvedPosition,
  };
  let nextSizes = { ...sizes };

  if (type === "group") {
    nextSizes[id] = DEFAULT_GROUP_SIZE;
  } else if (resolvedParentId) {
    const adjusted = adjustGroupSizeAndPosition(
      resolvedParentId,
      nextGraph.nodes,
      nextPositions,
      nextSizes
    );
    nextPositions = adjusted.positions;
    nextSizes = adjusted.sizes;
  }

  return {
    graph: nextGraph,
    node,
    position: resolvedPosition,
    positions: nextPositions,
    size: nextSizes[id],
    sizes: nextSizes,
  };
}

export function deleteNodeDraft(
  nodeId: string,
  graph: GraphData,
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  const nodeToDelete = graph.nodes.find((node) => node.id === nodeId);
  let graphBeforeRemoval = graph;
  let positionsBeforeRemoval = positions;
  let sizesBeforeRemoval = sizes;

  if (nodeToDelete?.type === "group") {
    const detached = detachChildrenFromGroup(
      nodeId,
      nodeToDelete.title,
      graphBeforeRemoval,
      positionsBeforeRemoval,
      sizesBeforeRemoval
    );
    graphBeforeRemoval = detached.graph;
    positionsBeforeRemoval = detached.positions;
    sizesBeforeRemoval = detached.sizes;
  }

  const {
    graph: nextGraph,
    removedNode,
    removedEdges,
    affectedRefs,
  } = removeNode(graphBeforeRemoval, nodeId);
  if (!removedNode) {
    return null;
  }

  let nextPositions = { ...positionsBeforeRemoval };
  delete nextPositions[nodeId];
  let nextSizes = { ...sizesBeforeRemoval };
  delete nextSizes[nodeId];

  const parentId = removedNode.parentId;
  if (parentId) {
    const adjusted = adjustGroupSizeAndPosition(parentId, nextGraph.nodes, nextPositions, nextSizes);
    nextPositions = adjusted.positions;
    nextSizes = adjusted.sizes;
  }

  const meta: RemoveNodeMeta = {
    removedNode,
    position: positions[nodeId] ?? { x: 0, y: 0 },
    size: sizes[nodeId],
    removedEdges,
    affectedRefs,
  };
  const usedSnapshotCommand = nodeToDelete?.type === "group";

  return {
    graph: nextGraph,
    graphAfter: usedSnapshotCommand ? nextGraph : undefined,
    graphBefore: usedSnapshotCommand ? graph : undefined,
    meta,
    positions: nextPositions,
    positionsAfter: usedSnapshotCommand ? nextPositions : undefined,
    positionsBefore: usedSnapshotCommand ? positions : undefined,
    sizes: nextSizes,
    sizesAfter: usedSnapshotCommand ? nextSizes : undefined,
    sizesBefore: usedSnapshotCommand ? sizes : undefined,
  };
}

function findContainingGroupId(
  position: CanvasPosition,
  nodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  for (const node of nodes) {
    if (node.type !== "group") {
      continue;
    }

    const groupPosition = positions[node.id] ?? { x: 0, y: 0 };
    const groupSize = sizes[node.id] ?? DEFAULT_GROUP_SIZE;
    if (
      position.x >= groupPosition.x &&
      position.x <= groupPosition.x + groupSize.width &&
      position.y >= groupPosition.y &&
      position.y <= groupPosition.y + groupSize.height
    ) {
      return node.id;
    }
  }

  return undefined;
}

function createNodeData({
  createdAt,
  defaultCardTitle,
  defaultGroupTitle,
  id,
  imagePath,
  initialTags,
  parentId,
  type,
}: {
  createdAt: string;
  defaultCardTitle: string;
  defaultGroupTitle: string;
  id: string;
  imagePath?: string;
  initialTags: string[];
  parentId?: string;
  type: GraphNode["type"];
}): GraphNode {
  if (type === "image") {
    return {
      id,
      type: "image",
      title: "",
      parentId,
      locked: false,
      opacity: 1,
      tags: initialTags,
      color: "",
      createdAt,
      updatedAt: createdAt,
      imagePath,
    };
  }

  if (type === "group") {
    return {
      id,
      type: "group",
      title: defaultGroupTitle,
      locked: false,
      opacity: 1,
      tags: [],
      color: "",
      createdAt,
      updatedAt: createdAt,
    };
  }

  return {
    id,
    type: "card",
    title: defaultCardTitle,
    parentId,
    locked: false,
    opacity: 1,
    tags: initialTags,
    color: "",
    createdAt,
    updatedAt: createdAt,
    contentHtml: "<p></p>",
    customFields: [],
  };
}
