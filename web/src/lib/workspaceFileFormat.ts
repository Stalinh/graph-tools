import type { GraphData, GraphEdge, GraphNode, WorkspaceState } from '../types';

export const WORKSPACE_STATE_VERSION = 1;
export const WORKSPACE_GRAPH_EXTENSION = '.graph';
export const WORKSPACE_GRAPH_FILE_NAME = 'workspace.graph';
export const WORKSPACE_JSON_ENTRY = 'workspace.json';
export const WORKSPACE_IMAGE_DIRECTORY = 'images/';
export const WORKSPACE_FILE_DESCRIPTION = 'Local Knowledge Graph';

export const WORKSPACE_OPEN_ACCEPT: Record<string, string[]> = {
  'application/octet-stream': [WORKSPACE_GRAPH_EXTENSION],
};

export const WORKSPACE_SAVE_ACCEPT: Record<string, string[]> = {
  'application/octet-stream': [WORKSPACE_GRAPH_EXTENSION],
};

export function isWorkspaceArchiveFileName(fileName: string) {
  return isCanonicalWorkspaceFileName(fileName);
}

export function isCanonicalWorkspaceFileName(fileName: string) {
  return getFileExtension(fileName) === 'graph';
}

export function getWorkspaceImagePaths(state: WorkspaceState) {
  const paths = new Set<string>();
  for (const node of state.graph.nodes) {
    if (node.type === 'image' && node.imagePath) {
      paths.add(node.imagePath);
    }
  }
  return [...paths].sort();
}

export function serializeWorkspaceState(state: WorkspaceState) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export function parseWorkspaceStateJson(text: string): WorkspaceState | null {
  try {
    const data: unknown = JSON.parse(text);
    return isWorkspaceState(data) ? data : null;
  } catch {
    return null;
  }
}

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!isRecord(value)) {
    return false;
  }

  const graph = value.graph;
  const nodePositions = value.nodePositions;
  const nodeSizes = value.nodeSizes;
  const viewport = value.viewport;
  const selectedNodeId = value.selectedNodeId;

  if (
    value.version !== WORKSPACE_STATE_VERSION ||
    typeof value.savedAt !== 'string' ||
    !isGraphData(graph) ||
    !isPointRecord(nodePositions) ||
    !(nodeSizes === undefined || isSizeRecord(nodeSizes)) ||
    !(viewport === null || isViewport(viewport)) ||
    !(selectedNodeId === null || typeof selectedNodeId === 'string')
  ) {
    return false;
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));

  return (
    nodeIds.size === graph.nodes.length &&
    edgeIds.size === graph.edges.length &&
    (selectedNodeId === null || nodeIds.has(selectedNodeId)) &&
    graph.edges.every((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)) &&
    graph.nodes.every((node) =>
      (node.references ?? []).every((reference) => nodeIds.has(reference.id))
    )
  );
}

function getFileExtension(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
  const dotIndex = baseName.lastIndexOf('.');
  return dotIndex >= 0 ? baseName.slice(dotIndex + 1).toLowerCase() : '';
}

function isGraphData(value: unknown): value is GraphData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.nodes) &&
    value.nodes.every(isGraphNode) &&
    Array.isArray(value.edges) &&
    value.edges.every(isGraphEdge)
  );
}

function isGraphNode(value: unknown): value is GraphNode {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    (value.type === 'card' || value.type === 'image' || value.type === 'group') &&
    (value.parentId === undefined || typeof value.parentId === 'string') &&
    typeof value.title === 'string' &&
    (value.locked === undefined || typeof value.locked === 'boolean') &&
    (value.opacity === undefined ||
      (isFiniteNumber(value.opacity) && value.opacity >= 0 && value.opacity <= 1)) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    (value.color === undefined || typeof value.color === 'string') &&
    (value.createdAt === undefined || typeof value.createdAt === 'string') &&
    (value.updatedAt === undefined || typeof value.updatedAt === 'string') &&
    (value.contentHtml === undefined || typeof value.contentHtml === 'string') &&
    (value.imagePath === undefined ||
      (value.type === 'image' && isWorkspaceImagePath(value.imagePath))) &&
    (value.references === undefined ||
      (Array.isArray(value.references) && value.references.every(isReferenceItem))) &&
    (value.customFields === undefined ||
      (Array.isArray(value.customFields) && value.customFields.every(isCustomField)))
  );
}

export function isWorkspaceImagePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(WORKSPACE_IMAGE_DIRECTORY) &&
    !value.includes('\\') &&
    !value.includes('..') &&
    /^images\/[^/]+$/.test(value)
  );
}

function isReferenceItem(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string';
}

function isCustomField(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.field === 'string' &&
    typeof value.value === 'string'
  );
}

function isGraphEdge(value: unknown): value is GraphEdge {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.sourceId === 'string' &&
    typeof value.targetId === 'string' &&
    value.type === 'citation' &&
    (value.label === undefined || typeof value.label === 'string') &&
    isFiniteNumber(value.weight) &&
    (value.color === undefined || typeof value.color === 'string') &&
    (value.style === undefined ||
      value.style === 'solid' ||
      value.style === 'sketch' ||
      value.style === 'note-dash') &&
    (value.direction === undefined ||
      value.direction === 'unidirectional' ||
      value.direction === 'bidirectional')
  );
}

function isPointRecord(value: unknown) {
  return isRecord(value) && Object.values(value).every(isPoint);
}

function isSizeRecord(value: unknown) {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (size) => isRecord(size) && isFiniteNumber(size.width) && isFiniteNumber(size.height)
    )
  );
}

function isViewport(value: unknown): value is { x: number; y: number; zoom: number } {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.zoom)
  );
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
