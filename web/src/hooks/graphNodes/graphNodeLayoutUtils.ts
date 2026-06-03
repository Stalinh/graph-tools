import { DEFAULT_GROUP_SIZE } from '../../lib/graphLayout';
import type { CanvasPosition, GraphNode, NodeSize } from '../../types';

interface FindContainingGroupOptions {
  nodeId: string;
  center: CanvasPosition;
  nodes: GraphNode[];
  positions: Record<string, CanvasPosition>;
  sizes: Record<string, NodeSize>;
}

interface UpdateNodeParentMetadataOptions {
  node: GraphNode;
  nodes: GraphNode[];
  oldParentId: string | undefined;
  newParentGroup: GraphNode | undefined;
  updatedAt: string;
}

export function getAbsoluteNodePosition(
  node: GraphNode,
  position: CanvasPosition,
  positions: Record<string, CanvasPosition>
) {
  if (!node.parentId) {
    return { ...position };
  }

  const parentPosition = positions[node.parentId] ?? { x: 0, y: 0 };
  return {
    x: position.x + parentPosition.x,
    y: position.y + parentPosition.y,
  };
}

export function getRelativeNodePosition(
  position: CanvasPosition,
  parentId: string | undefined,
  positions: Record<string, CanvasPosition>
) {
  if (!parentId) {
    return position;
  }

  return {
    x: position.x - (positions[parentId]?.x ?? 0),
    y: position.y - (positions[parentId]?.y ?? 0),
  };
}

export function getNodeCenter(position: CanvasPosition, size: NodeSize) {
  return {
    x: position.x + size.width / 2,
    y: position.y + size.height / 2,
  };
}

export function findContainingGroup({
  nodeId,
  center,
  nodes,
  positions,
  sizes,
}: FindContainingGroupOptions) {
  return nodes.find((node) => {
    if (node.id === nodeId || node.type !== 'group') {
      return false;
    }

    const position = positions[node.id] ?? { x: 0, y: 0 };
    const size = sizes[node.id] ?? DEFAULT_GROUP_SIZE;
    return (
      center.x >= position.x &&
      center.x <= position.x + size.width &&
      center.y >= position.y &&
      center.y <= position.y + size.height
    );
  });
}

export function updateNodeParentMetadata({
  node,
  nodes,
  oldParentId,
  newParentGroup,
  updatedAt,
}: UpdateNodeParentMetadataOptions) {
  let nextTags = [...node.tags];

  if (oldParentId) {
    const oldGroup = nodes.find((groupNode) => groupNode.id === oldParentId);
    if (oldGroup?.title) {
      nextTags = nextTags.filter((tag) => tag !== oldGroup.title);
    }
  }

  if (newParentGroup?.title && !nextTags.includes(newParentGroup.title)) {
    nextTags.push(newParentGroup.title);
  }

  return {
    ...node,
    parentId: newParentGroup?.id,
    tags: nextTags,
    updatedAt,
  };
}
