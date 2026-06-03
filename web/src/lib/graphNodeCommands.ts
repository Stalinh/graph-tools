import type { CanvasPosition, GraphData, GraphNode, NodeSize } from '../types';
import { DEFAULT_GROUP_SIZE, snapPositionToGrid } from './graphLayout';
import {
  adjustGroupSizeAndPosition,
  detachChildrenFromGroup,
  findAvailableGroupPosition,
} from './groupNodeLayout';
import { addNode, buildNodeIndex, removeNode } from './graphMutator';

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
  type: GraphNode['type'];
  positions: Record<string, CanvasPosition>;
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

  if (!resolvedParentId && type !== 'group') {
    resolvedParentId = findContainingGroupId(position, graph.nodes, positions, sizes);
  }

  if (type === 'group') {
    resolvedPosition = snapPositionToGrid(resolvedPosition);
    resolvedPosition = findAvailableGroupPosition(
      id,
      resolvedPosition,
      graph.nodes,
      positions,
      sizes
    );
  } else if (resolvedParentId) {
    const parentPosition = positions[resolvedParentId] ?? { x: 0, y: 0 };
    resolvedPosition = {
      x: position.x - parentPosition.x,
      y: position.y - parentPosition.y,
    };
  }

  const nodeIndex = buildNodeIndex(graph.nodes);
  const parentGroup = resolvedParentId ? nodeIndex.get(resolvedParentId) : undefined;
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

  if (type === 'group') {
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
  const nodeIndex = buildNodeIndex(graph.nodes);
  const nodeToDelete = nodeIndex.get(nodeId);
  let removalGraph = graph;
  let removalPositions = positions;
  let removalSizes = sizes;

  if (nodeToDelete?.type === 'group') {
    const detached = detachChildrenFromGroup(
      nodeId,
      nodeToDelete.title,
      removalGraph,
      removalPositions,
      removalSizes
    );
    removalGraph = detached.graph;
    removalPositions = detached.positions;
    removalSizes = detached.sizes;
  }

  const { graph: nextGraph, removedNode } = removeNode(removalGraph, nodeId);
  if (!removedNode) {
    return null;
  }

  let nextPositions = { ...removalPositions };
  delete nextPositions[nodeId];
  let nextSizes = { ...removalSizes };
  delete nextSizes[nodeId];

  const parentId = removedNode.parentId;
  if (parentId) {
    const adjusted = adjustGroupSizeAndPosition(
      parentId,
      nextGraph.nodes,
      nextPositions,
      nextSizes
    );
    nextPositions = adjusted.positions;
    nextSizes = adjusted.sizes;
  }

  return {
    graph: nextGraph,
    positions: nextPositions,
    sizes: nextSizes,
  };
}

export function deleteNodesDraft(
  nodeIds: string[],
  graph: GraphData,
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  const uniqueNodeIds = [...new Set(nodeIds)];
  if (uniqueNodeIds.length === 0) {
    return null;
  }

  const nodeIndex = buildNodeIndex(graph.nodes);
  const removedNodeIds: string[] = [];
  let currentGraph = graph;
  let currentPositions = positions;
  let currentSizes = sizes;

  uniqueNodeIds.forEach((nodeId) => {
    const nodeToDelete = nodeIndex.get(nodeId);
    let removalGraph = currentGraph;
    let removalPositions = currentPositions;
    let removalSizes = currentSizes;

    if (nodeToDelete?.type === 'group') {
      const detached = detachChildrenFromGroup(
        nodeId,
        nodeToDelete.title,
        removalGraph,
        removalPositions,
        removalSizes
      );
      removalGraph = detached.graph;
      removalPositions = detached.positions;
      removalSizes = detached.sizes;
    }

    const { graph: nextGraph, removedNode } = removeNode(removalGraph, nodeId);
    if (!removedNode || removedNode.id !== nodeId) {
      return;
    }

    const nextPositions = { ...removalPositions };
    delete nextPositions[nodeId];
    const nextSizes = { ...removalSizes };
    delete nextSizes[nodeId];

    currentGraph = nextGraph;
    currentPositions = nextPositions;
    currentSizes = nextSizes;
    removedNodeIds.push(nodeId);
  });

  if (removedNodeIds.length === 0) {
    return null;
  }

  const affectedParents = new Set<string>();
  removedNodeIds.forEach((nodeId) => {
    const removedNode = nodeIndex.get(nodeId);
    if (removedNode?.parentId) {
      affectedParents.add(removedNode.parentId);
    }
  });

  if (affectedParents.size > 0) {
    let nextPositions = { ...currentPositions };
    let nextSizes = { ...currentSizes };
    affectedParents.forEach((parentId) => {
      const adjusted = adjustGroupSizeAndPosition(
        parentId,
        currentGraph.nodes,
        nextPositions,
        nextSizes
      );
      nextPositions = adjusted.positions;
      nextSizes = adjusted.sizes;
    });
    currentPositions = nextPositions;
    currentSizes = nextSizes;
  }

  return {
    graph: currentGraph,
    removedNodeIds,
    positions: currentPositions,
    sizes: currentSizes,
  };
}

function findContainingGroupId(
  position: CanvasPosition,
  nodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  for (const node of nodes) {
    if (node.type !== 'group') {
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
  type: GraphNode['type'];
}): GraphNode {
  if (type === 'image') {
    return {
      id,
      type: 'image',
      title: '',
      parentId,
      locked: false,
      opacity: 1,
      tags: initialTags,
      color: '',
      createdAt,
      updatedAt: createdAt,
      imagePath,
    };
  }

  if (type === 'group') {
    return {
      id,
      type: 'group',
      title: defaultGroupTitle,
      locked: false,
      opacity: 1,
      tags: [],
      color: '',
      createdAt,
      updatedAt: createdAt,
    };
  }

  return {
    id,
    type: 'card',
    title: defaultCardTitle,
    parentId,
    locked: false,
    opacity: 1,
    tags: initialTags,
    color: '',
    createdAt,
    updatedAt: createdAt,
    contentHtml: '<p></p>',
    customFields: [],
  };
}
