import type { CanvasPosition, NodeSize } from '../types';

export const GRAPH_GRID_SIZE = 20;

export const DEFAULT_GROUP_SIZE: NodeSize = {
  width: GRAPH_GRID_SIZE * 23,
  height: GRAPH_GRID_SIZE * 18,
};

function snapSizeToGrid(value: number) {
  if (!Number.isFinite(value)) {
    return GRAPH_GRID_SIZE;
  }
  return Math.max(GRAPH_GRID_SIZE, Math.round(value / GRAPH_GRID_SIZE) * GRAPH_GRID_SIZE);
}

function snapCoordinateToGrid(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value / GRAPH_GRID_SIZE) * GRAPH_GRID_SIZE;
}

export function constrainGroupNodeSize(size: NodeSize): NodeSize {
  return {
    width: snapSizeToGrid(size.width),
    height: snapSizeToGrid(size.height),
  };
}

export function snapPositionToGrid(position: CanvasPosition): CanvasPosition {
  return {
    x: snapCoordinateToGrid(position.x),
    y: snapCoordinateToGrid(position.y),
  };
}
