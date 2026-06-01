import type { CanvasPosition, CanvasViewport, GraphData, GraphNode, NodeSize } from "../types";
import { DEFAULT_GROUP_SIZE, GRAPH_GRID_SIZE, snapPositionToGrid } from "./graphLayout";

const GROUP_COLLISION_TOLERANCE = 0.5;

export function areViewportsEqual(left: CanvasViewport | null, right: CanvasViewport) {
  return left !== null && left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

export function detachChildrenFromGroup(
  groupId: string,
  groupTitle: string,
  graph: GraphData,
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  const groupPosition = positions[groupId] ?? { x: 0, y: 0 };
  const updatedAt = new Date().toISOString();
  const nextGraph = {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.parentId !== groupId) {
        return node;
      }

      const nodeWithoutParent = { ...node };
      delete nodeWithoutParent.parentId;
      return {
        ...nodeWithoutParent,
        tags: groupTitle ? node.tags.filter((tag) => tag !== groupTitle) : node.tags,
        updatedAt,
      };
    }),
  };

  const nextPositions = { ...positions };
  graph.nodes.forEach((node) => {
    if (node.parentId !== groupId) {
      return;
    }

    const childPosition = positions[node.id] ?? { x: 0, y: 0 };
    nextPositions[node.id] = {
      x: childPosition.x + groupPosition.x,
      y: childPosition.y + groupPosition.y,
    };
  });
  delete nextPositions[groupId];

  const nextSizes = { ...sizes };
  delete nextSizes[groupId];

  return {
    graph: nextGraph,
    positions: nextPositions,
    sizes: nextSizes,
  };
}

export function adjustGroupSizeAndPosition(
  _groupId: string,
  _currentNodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  // Group auto-sizing is intentionally disabled. Keep this wrapper so creation,
  // deletion, drag, and resize flows can share one extension point if the feature
  // is reintroduced without changing those call sites again.
  return { positions, sizes };
}

export function resolveGroupMoveTargets(
  moves: { nodeId: string; from: CanvasPosition; to: CanvasPosition }[],
  currentNodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  const groupMoves = moves.filter((move) =>
    currentNodes.some((node) => node.id === move.nodeId && node.type === "group")
  );
  const movingGroupIds = new Set(groupMoves.map((move) => move.nodeId));
  const nextPositions: Record<string, CanvasPosition> = { ...positions };

  groupMoves.forEach((move) => {
    nextPositions[move.nodeId] = snapPositionToGrid(move.to);
  });

  let didChange = true;
  while (didChange) {
    didChange = false;

    for (const move of groupMoves) {
      const candidatePosition = nextPositions[move.nodeId] ?? move.to;
      const size = sizes[move.nodeId] ?? DEFAULT_GROUP_SIZE;
      const resolvedPosition = resolveGroupMoveTarget(
        move.nodeId,
        move.from,
        candidatePosition,
        size,
        currentNodes,
        nextPositions,
        sizes,
        movingGroupIds
      );

      if (
        (resolvedPosition.x !== candidatePosition.x ||
          resolvedPosition.y !== candidatePosition.y) &&
        (candidatePosition.x !== move.from.x || candidatePosition.y !== move.from.y)
      ) {
        nextPositions[move.nodeId] = resolvedPosition;
        didChange = true;
      }
    }
  }

  return nextPositions;
}

export function resolveGroupMoveTarget(
  groupId: string,
  from: CanvasPosition,
  to: CanvasPosition,
  size: NodeSize,
  currentNodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>,
  ignoredGroupIds = new Set<string>()
) {
  const staticGroups = currentNodes.filter(
    (node) => node.type === "group" && node.id !== groupId && !ignoredGroupIds.has(node.id)
  );
  const fromRect = toRect(from, size);
  const targetRect = toRect(to, size);

  let nextX = to.x;
  if (nextX !== from.x) {
    const movingRight = nextX > from.x;

    staticGroups.forEach((node) => {
      const otherPosition = positions[node.id] ?? { x: 0, y: 0 };
      const otherSize = sizes[node.id] ?? DEFAULT_GROUP_SIZE;
      const otherRect = toRect(otherPosition, otherSize);

      if (
        !rangesOverlapDuringMove(
          fromRect.top,
          fromRect.bottom,
          targetRect.top,
          targetRect.bottom,
          otherRect.top,
          otherRect.bottom
        )
      ) {
        return;
      }

      if (movingRight && fromRect.right <= otherRect.left && nextX + size.width > otherRect.left) {
        nextX = Math.min(nextX, otherRect.left - size.width);
      } else if (!movingRight && fromRect.left >= otherRect.right && nextX < otherRect.right) {
        nextX = Math.max(nextX, otherRect.right);
      }
    });
  }

  let nextY = to.y;
  if (nextY !== from.y) {
    const movingDown = nextY > from.y;
    const xResolvedRect = toRect({ x: nextX, y: from.y }, size);

    staticGroups.forEach((node) => {
      const otherPosition = positions[node.id] ?? { x: 0, y: 0 };
      const otherSize = sizes[node.id] ?? DEFAULT_GROUP_SIZE;
      const otherRect = toRect(otherPosition, otherSize);

      if (
        !rangesOverlapDuringMove(
          fromRect.left,
          fromRect.right,
          xResolvedRect.left,
          xResolvedRect.right,
          otherRect.left,
          otherRect.right
        )
      ) {
        return;
      }

      if (movingDown && xResolvedRect.bottom <= otherRect.top && nextY + size.height > otherRect.top) {
        nextY = Math.min(nextY, otherRect.top - size.height);
      } else if (!movingDown && xResolvedRect.top >= otherRect.bottom && nextY < otherRect.bottom) {
        nextY = Math.max(nextY, otherRect.bottom);
      }
    });
  }

  const resolvedPosition = { x: nextX, y: nextY };
  const resolvedRect = toRect(resolvedPosition, size);
  const isStillBlocked = staticGroups.some((node) => {
    const otherPosition = positions[node.id] ?? { x: 0, y: 0 };
    const otherSize = sizes[node.id] ?? DEFAULT_GROUP_SIZE;
    return doRectsOverlap(resolvedRect, toRect(otherPosition, otherSize));
  });

  return isStillBlocked ? from : resolvedPosition;
}

export function findAvailableGroupPosition(
  groupId: string,
  preferredPosition: CanvasPosition,
  currentNodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  if (
    !isGroupPlacementBlocked(
      groupId,
      preferredPosition,
      DEFAULT_GROUP_SIZE,
      currentNodes,
      positions,
      sizes
    )
  ) {
    return preferredPosition;
  }

  const step = GRAPH_GRID_SIZE * 2;
  const maxRadius = 12;

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.abs(offsetX) !== radius && Math.abs(offsetY) !== radius) {
          continue;
        }

        const candidate = {
          x: preferredPosition.x + offsetX * step,
          y: preferredPosition.y + offsetY * step,
        };

        if (
          !isGroupPlacementBlocked(
            groupId,
            candidate,
            DEFAULT_GROUP_SIZE,
            currentNodes,
            positions,
            sizes
          )
        ) {
          return candidate;
        }
      }
    }
  }

  return preferredPosition;
}

export function isGroupPlacementBlocked(
  groupId: string,
  position: CanvasPosition,
  size: NodeSize,
  currentNodes: GraphNode[],
  positions: Record<string, CanvasPosition>,
  sizes: Record<string, NodeSize>
) {
  const nextRect = toRect(position, size);

  return currentNodes.some((node) => {
    if (node.id === groupId || node.type !== "group") {
      return false;
    }

    const otherPosition = positions[node.id] ?? { x: 0, y: 0 };
    const otherSize = sizes[node.id] ?? DEFAULT_GROUP_SIZE;
    return doRectsOverlap(nextRect, toRect(otherPosition, otherSize));
  });
}

function toRect(position: CanvasPosition, size: NodeSize) {
  return {
    left: position.x,
    right: position.x + size.width,
    top: position.y,
    bottom: position.y + size.height,
  };
}

function doRectsOverlap(left: ReturnType<typeof toRect>, right: ReturnType<typeof toRect>) {
  return (
    left.left < right.right - GROUP_COLLISION_TOLERANCE &&
    left.right > right.left + GROUP_COLLISION_TOLERANCE &&
    left.top < right.bottom - GROUP_COLLISION_TOLERANCE &&
    left.bottom > right.top + GROUP_COLLISION_TOLERANCE
  );
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB - GROUP_COLLISION_TOLERANCE && endA > startB + GROUP_COLLISION_TOLERANCE;
}

function rangesOverlapDuringMove(
  fromStart: number,
  fromEnd: number,
  toStart: number,
  toEnd: number,
  obstacleStart: number,
  obstacleEnd: number
) {
  return rangesOverlap(
    Math.min(fromStart, toStart),
    Math.max(fromEnd, toEnd),
    obstacleStart,
    obstacleEnd
  );
}
