import type { Node, NodeChange } from '@xyflow/react';
import {
  DEFAULT_GROUP_SIZE,
  constrainGroupNodeSize,
  snapPositionToGrid,
} from '../../lib/graphLayout';
import type { CanvasPosition, GraphNode, NodeSize } from '../../types';

const ALIGNMENT_GUIDE_THRESHOLD = 5;
const GROUP_COLLISION_TOLERANCE = 0.5;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface AlignmentGuide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  offset: number;
  start: number;
  end: number;
}

interface AlignmentAnchor {
  coordinate: number;
  key: 'center' | 'end' | 'start';
}

interface AlignmentGuideCandidate extends AlignmentGuide {
  anchorKey: AlignmentAnchor['key'];
  distance: number;
}

export function getScreenRect(start: ScreenPoint, end: ScreenPoint): ScreenRect {
  return {
    bottom: Math.max(start.y, end.y),
    left: Math.min(start.x, end.x),
    right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y),
  };
}

export function containsRect(container: ScreenRect, target: ScreenRect) {
  return (
    target.left >= container.left &&
    target.right <= container.right &&
    target.top >= container.top &&
    target.bottom <= container.bottom
  );
}

export function intersectsRect(a: ScreenRect, b: ScreenRect) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function getAutoPanDelta(
  pointer: number,
  min: number,
  max: number,
  threshold: number,
  step: number
) {
  if (pointer <= min + threshold) {
    return -step;
  }
  if (pointer >= max - threshold) {
    return step;
  }
  return 0;
}

function getElementScreenRect(element: Element): ScreenRect {
  const rect = element.getBoundingClientRect();
  return {
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    top: rect.top,
  };
}

export function combineScreenRects(elements: HTMLElement[]): ScreenRect {
  return elements.reduce<ScreenRect>(
    (combined, element) => {
      const rect = getElementScreenRect(element);
      return {
        top: Math.min(combined.top, rect.top),
        right: Math.max(combined.right, rect.right),
        bottom: Math.max(combined.bottom, rect.bottom),
        left: Math.min(combined.left, rect.left),
      };
    },
    {
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
    }
  );
}

function clampGuideCoordinate(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getNodeElement(container: HTMLDivElement, nodeId: string) {
  return (
    Array.from(container.querySelectorAll<HTMLElement>('.react-flow__node[data-id]')).find(
      (element) => element.getAttribute('data-id') === nodeId
    ) ?? null
  );
}

function getAlignmentNodeType(
  draggedNodeIds: string[],
  nodeTypeById: ReadonlyMap<string, GraphNode['type']>
) {
  let alignmentType: GraphNode['type'] | null = null;

  for (const nodeId of draggedNodeIds) {
    const nodeType = nodeTypeById.get(nodeId);
    if (!nodeType) {
      return null;
    }
    if (alignmentType && alignmentType !== nodeType) {
      return null;
    }
    alignmentType = nodeType;
  }

  return alignmentType;
}

function selectAlignmentGuides(candidates: AlignmentGuideCandidate[]) {
  const bestByAnchorKey = new Map<AlignmentAnchor['key'], AlignmentGuideCandidate>();

  candidates.forEach((candidate) => {
    const previous = bestByAnchorKey.get(candidate.anchorKey);
    if (!previous || candidate.distance < previous.distance) {
      bestByAnchorKey.set(candidate.anchorKey, candidate);
    }
  });

  const selectedCandidates = [bestByAnchorKey.get('start'), bestByAnchorKey.get('end')].filter(
    (candidate): candidate is AlignmentGuideCandidate => candidate !== undefined
  );
  const centerCandidate = bestByAnchorKey.get('center');
  if (centerCandidate && selectedCandidates.length < 2) {
    selectedCandidates.push(centerCandidate);
  }

  return selectedCandidates
    .map(({ anchorKey: _anchorKey, distance: _distance, ...guide }) => guide)
    .filter((guide) => guide.end > guide.start);
}

export function createAlignmentGuides(
  container: HTMLDivElement,
  draggedNodeIds: string[],
  nodeTypeById: ReadonlyMap<string, GraphNode['type']>
): AlignmentGuide[] {
  const alignmentNodeType = getAlignmentNodeType(draggedNodeIds, nodeTypeById);
  if (!alignmentNodeType) {
    return [];
  }
  if (alignmentNodeType !== 'group') {
    return [];
  }

  const draggedIdSet = new Set(draggedNodeIds);
  const draggedElements = draggedNodeIds
    .map((nodeId) => getNodeElement(container, nodeId))
    .filter((element): element is HTMLElement => element !== null);

  if (draggedElements.length === 0) {
    return [];
  }

  const bounds = container.getBoundingClientRect();
  const draggedRect = combineScreenRects(draggedElements);
  const draggedVerticalAnchors: AlignmentAnchor[] = [
    { coordinate: draggedRect.left, key: 'start' },
    { coordinate: (draggedRect.left + draggedRect.right) / 2, key: 'center' },
    { coordinate: draggedRect.right, key: 'end' },
  ];
  const draggedHorizontalAnchors: AlignmentAnchor[] = [
    { coordinate: draggedRect.top, key: 'start' },
    { coordinate: (draggedRect.top + draggedRect.bottom) / 2, key: 'center' },
    { coordinate: draggedRect.bottom, key: 'end' },
  ];
  const verticalCandidates: AlignmentGuideCandidate[] = [];
  const horizontalCandidates: AlignmentGuideCandidate[] = [];

  for (const element of container.querySelectorAll<HTMLElement>('.react-flow__node[data-id]')) {
    const nodeId = element.getAttribute('data-id');
    if (!nodeId || draggedIdSet.has(nodeId) || nodeTypeById.get(nodeId) !== alignmentNodeType) {
      continue;
    }

    const otherRect = getElementScreenRect(element);
    if (otherRect.right <= otherRect.left || otherRect.bottom <= otherRect.top) {
      continue;
    }

    const otherVerticalAnchors: AlignmentAnchor[] = [
      { coordinate: otherRect.left, key: 'start' },
      { coordinate: (otherRect.left + otherRect.right) / 2, key: 'center' },
      { coordinate: otherRect.right, key: 'end' },
    ];
    const otherHorizontalAnchors: AlignmentAnchor[] = [
      { coordinate: otherRect.top, key: 'start' },
      { coordinate: (otherRect.top + otherRect.bottom) / 2, key: 'center' },
      { coordinate: otherRect.bottom, key: 'end' },
    ];

    for (const draggedAnchor of draggedVerticalAnchors) {
      for (const otherAnchor of otherVerticalAnchors) {
        const distance = Math.abs(draggedAnchor.coordinate - otherAnchor.coordinate);
        if (distance > ALIGNMENT_GUIDE_THRESHOLD) {
          continue;
        }

        verticalCandidates.push({
          anchorKey: draggedAnchor.key,
          distance,
          id: `v-${nodeId}-${draggedAnchor.key}-${otherAnchor.key}`,
          orientation: 'vertical',
          offset: clampGuideCoordinate(otherAnchor.coordinate - bounds.left, 0, bounds.width),
          start: clampGuideCoordinate(
            Math.min(draggedRect.top, otherRect.top) - bounds.top,
            0,
            bounds.height
          ),
          end: clampGuideCoordinate(
            Math.max(draggedRect.bottom, otherRect.bottom) - bounds.top,
            0,
            bounds.height
          ),
        });
      }
    }

    for (const draggedAnchor of draggedHorizontalAnchors) {
      for (const otherAnchor of otherHorizontalAnchors) {
        const distance = Math.abs(draggedAnchor.coordinate - otherAnchor.coordinate);
        if (distance > ALIGNMENT_GUIDE_THRESHOLD) {
          continue;
        }

        horizontalCandidates.push({
          anchorKey: draggedAnchor.key,
          distance,
          id: `h-${nodeId}-${draggedAnchor.key}-${otherAnchor.key}`,
          orientation: 'horizontal',
          offset: clampGuideCoordinate(otherAnchor.coordinate - bounds.top, 0, bounds.height),
          start: clampGuideCoordinate(
            Math.min(draggedRect.left, otherRect.left) - bounds.left,
            0,
            bounds.width
          ),
          end: clampGuideCoordinate(
            Math.max(draggedRect.right, otherRect.right) - bounds.left,
            0,
            bounds.width
          ),
        });
      }
    }
  }

  return [
    ...selectAlignmentGuides(verticalCandidates),
    ...selectAlignmentGuides(horizontalCandidates),
  ];
}

function getNodeRect(position: CanvasPosition, size: NodeSize) {
  return {
    left: position.x,
    right: position.x + size.width,
    top: position.y,
    bottom: position.y + size.height,
  };
}

function doRectsOverlap(
  left: ReturnType<typeof getNodeRect>,
  right: ReturnType<typeof getNodeRect>
) {
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

function resolveGroupDragPosition(
  nodeId: string,
  from: CanvasPosition,
  to: CanvasPosition,
  size: NodeSize,
  graphNodes: GraphNode[],
  currentCanvasNodes: Node[],
  nodeSizes: Record<string, NodeSize>,
  resolvedPositions: Map<string, CanvasPosition>,
  movingGroupIds: Set<string>
) {
  const staticGroups = graphNodes.filter(
    (node) => node.type === 'group' && node.id !== nodeId && !movingGroupIds.has(node.id)
  );
  const canvasNodeMap = new Map(currentCanvasNodes.map((node) => [node.id, node]));
  const currentRect = getNodeRect(from, size);
  const targetRect = getNodeRect(to, size);

  let nextX = to.x;
  if (nextX !== from.x) {
    const movingRight = nextX > from.x;

    staticGroups.forEach((otherNode) => {
      const otherCanvasNode = canvasNodeMap.get(otherNode.id);
      if (!otherCanvasNode) {
        return;
      }

      const otherPosition = resolvedPositions.get(otherNode.id) ?? otherCanvasNode.position;
      const otherSize = nodeSizes[otherNode.id] ?? {
        width:
          otherCanvasNode.measured?.width ??
          otherCanvasNode.width ??
          otherCanvasNode.initialWidth ??
          DEFAULT_GROUP_SIZE.width,
        height:
          otherCanvasNode.measured?.height ??
          otherCanvasNode.height ??
          otherCanvasNode.initialHeight ??
          DEFAULT_GROUP_SIZE.height,
      };
      const otherRect = getNodeRect(otherPosition, otherSize);

      if (
        !rangesOverlapDuringMove(
          currentRect.top,
          currentRect.bottom,
          targetRect.top,
          targetRect.bottom,
          otherRect.top,
          otherRect.bottom
        )
      ) {
        return;
      }

      if (
        movingRight &&
        currentRect.right <= otherRect.left &&
        nextX + size.width > otherRect.left
      ) {
        nextX = Math.min(nextX, otherRect.left - size.width);
      } else if (!movingRight && currentRect.left >= otherRect.right && nextX < otherRect.right) {
        nextX = Math.max(nextX, otherRect.right);
      }
    });
  }

  let nextY = to.y;
  if (nextY !== from.y) {
    const movingDown = nextY > from.y;
    const xResolvedRect = getNodeRect({ x: nextX, y: from.y }, size);

    staticGroups.forEach((otherNode) => {
      const otherCanvasNode = canvasNodeMap.get(otherNode.id);
      if (!otherCanvasNode) {
        return;
      }

      const otherPosition = resolvedPositions.get(otherNode.id) ?? otherCanvasNode.position;
      const otherSize = nodeSizes[otherNode.id] ?? {
        width:
          otherCanvasNode.measured?.width ??
          otherCanvasNode.width ??
          otherCanvasNode.initialWidth ??
          DEFAULT_GROUP_SIZE.width,
        height:
          otherCanvasNode.measured?.height ??
          otherCanvasNode.height ??
          otherCanvasNode.initialHeight ??
          DEFAULT_GROUP_SIZE.height,
      };
      const otherRect = getNodeRect(otherPosition, otherSize);

      if (
        !rangesOverlapDuringMove(
          currentRect.left,
          currentRect.right,
          xResolvedRect.left,
          xResolvedRect.right,
          otherRect.left,
          otherRect.right
        )
      ) {
        return;
      }

      if (
        movingDown &&
        xResolvedRect.bottom <= otherRect.top &&
        nextY + size.height > otherRect.top
      ) {
        nextY = Math.min(nextY, otherRect.top - size.height);
      } else if (!movingDown && xResolvedRect.top >= otherRect.bottom && nextY < otherRect.bottom) {
        nextY = Math.max(nextY, otherRect.bottom);
      }
    });
  }

  const resolvedPosition = { x: nextX, y: nextY };
  const resolvedRect = getNodeRect(resolvedPosition, size);
  const isStillBlocked = staticGroups.some((otherNode) => {
    const otherCanvasNode = canvasNodeMap.get(otherNode.id);
    if (!otherCanvasNode) {
      return false;
    }

    const otherPosition = resolvedPositions.get(otherNode.id) ?? otherCanvasNode.position;
    const otherSize = nodeSizes[otherNode.id] ?? {
      width:
        otherCanvasNode.measured?.width ??
        otherCanvasNode.width ??
        otherCanvasNode.initialWidth ??
        DEFAULT_GROUP_SIZE.width,
      height:
        otherCanvasNode.measured?.height ??
        otherCanvasNode.height ??
        otherCanvasNode.initialHeight ??
        DEFAULT_GROUP_SIZE.height,
    };

    return doRectsOverlap(resolvedRect, getNodeRect(otherPosition, otherSize));
  });

  return isStillBlocked ? from : resolvedPosition;
}

export function normalizeGroupCollisionChanges(
  changes: NodeChange[],
  graphNodes: GraphNode[],
  currentCanvasNodes: Node[],
  nodeSizes: Record<string, NodeSize>
) {
  const graphNodeMap = new Map(graphNodes.map((node) => [node.id, node]));
  const currentCanvasNodeMap = new Map(currentCanvasNodes.map((node) => [node.id, node]));
  const movingGroupIds = new Set(
    changes
      .flatMap((change) =>
        change.type === 'position' &&
        'id' in change &&
        typeof change.id === 'string' &&
        Boolean(change.position)
          ? [change.id]
          : []
      )
      .filter((id) => graphNodeMap.get(id)?.type === 'group')
  );
  const resolvedPositions = new Map<string, CanvasPosition>();

  return changes.map((change) => {
    if (change.type === 'dimensions' && graphNodeMap.get(change.id)?.type === 'group') {
      return {
        ...change,
        dimensions: change.dimensions
          ? constrainGroupNodeSize(change.dimensions)
          : change.dimensions,
      };
    }

    if (change.type !== 'position' || !change.position) {
      return change;
    }

    if (graphNodeMap.get(change.id)?.type !== 'group') {
      return change;
    }

    const currentCanvasNode = currentCanvasNodeMap.get(change.id);
    if (!currentCanvasNode) {
      return change;
    }

    const currentPosition = currentCanvasNode.position;
    const candidatePosition = snapPositionToGrid(change.position);
    const candidateSize = nodeSizes[change.id] ?? {
      width:
        currentCanvasNode.measured?.width ??
        currentCanvasNode.width ??
        currentCanvasNode.initialWidth ??
        DEFAULT_GROUP_SIZE.width,
      height:
        currentCanvasNode.measured?.height ??
        currentCanvasNode.height ??
        currentCanvasNode.initialHeight ??
        DEFAULT_GROUP_SIZE.height,
    };
    const resolvedPosition = resolveGroupDragPosition(
      change.id,
      currentPosition,
      candidatePosition,
      candidateSize,
      graphNodes,
      currentCanvasNodes,
      nodeSizes,
      resolvedPositions,
      movingGroupIds
    );

    resolvedPositions.set(change.id, resolvedPosition);
    return {
      ...change,
      position: resolvedPosition,
    };
  });
}
