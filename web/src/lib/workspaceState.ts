import type { EdgeDirection, GraphData, GraphEdge, GraphNode, WorkspaceState } from "../types";

import { sanitizeReferenceGraph, sanitizeReferences } from "./graphConstraints";
import { constrainGroupNodeSize, snapPositionToGrid } from "./graphLayout";
import { normalizeEdgeColor, normalizeNodeColor } from "./nodeColors";

export type RemoveMeta = {
  removedNode: GraphNode;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  removedEdges: GraphEdge[];
  affectedRefs: { ownerId: string; refId: string }[];
};

export type RemoveManyMeta = {
  nodeId: string;
  meta: RemoveMeta;
};

export type CanvasCommand =
  | {
      type: "move";
      nodeId: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      graphBefore?: GraphData;
      graphAfter?: GraphData;
    }
  | {
      type: "move-many";
      moves: { nodeId: string; from: { x: number; y: number }; to: { x: number; y: number } }[];
      graphBefore?: GraphData;
      graphAfter?: GraphData;
    }
  | {
      type: "add";
      nodeId: string;
      nodeData: GraphNode;
      position: { x: number; y: number };
      size?: { width: number; height: number };
    }
  | {
      type: "remove";
      nodeId: string;
      meta: RemoveMeta;
      graphBefore?: GraphData;
      graphAfter?: GraphData;
      positionsBefore?: Record<string, { x: number; y: number }>;
      positionsAfter?: Record<string, { x: number; y: number }>;
      sizesBefore?: Record<string, { width: number; height: number }>;
      sizesAfter?: Record<string, { width: number; height: number }>;
    }
  | {
      type: "remove-many";
      removals: RemoveManyMeta[];
      graphBefore?: GraphData;
      graphAfter?: GraphData;
      positionsBefore?: Record<string, { x: number; y: number }>;
      positionsAfter?: Record<string, { x: number; y: number }>;
      sizesBefore?: Record<string, { width: number; height: number }>;
      sizesAfter?: Record<string, { width: number; height: number }>;
    }
  | { type: "link"; sourceId: string; targetId: string; direction: EdgeDirection }
  | { type: "unlink"; sourceId: string; targetId: string; direction?: EdgeDirection }
  | { type: "replace-graph"; before: GraphData; after: GraphData }
  | {
      type: "resize";
      nodeId: string;
      before: { width: number; height: number } | undefined;
      after: { width: number; height: number };
    }
  | {
      type: "resize-many";
      resizes: {
        nodeId: string;
        before: { width: number; height: number } | undefined;
        after: { width: number; height: number };
      }[];
    };

export const EMPTY_GRAPH: GraphData = { nodes: [], edges: [] };

export function extractIdNumber(id: string): number | null {
  const match = /^#(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

export function generateNextId(nodes: GraphNode[]): string {
  let maxId = 0;
  for (const node of nodes) {
    const num = extractIdNumber(node.id);
    if (num !== null && num > maxId) {
      maxId = num;
    }
  }
  return `#${maxId + 1}`;
}

export function normalizeWorkspaceState(workspace: WorkspaceState): WorkspaceState {
  const sanitizedGraph = sanitizeReferenceGraph(workspace.graph);
  const nodeIds = new Set(sanitizedGraph.nodes.map((node) => node.id));
  const groupIds = new Set(
    sanitizedGraph.nodes.filter((node) => node.type === "group").map((node) => node.id)
  );

  const nodePositions: Record<string, { x: number; y: number }> = {};
  for (const [id, pos] of Object.entries(workspace.nodePositions)) {
    if (nodeIds.has(id)) {
      nodePositions[id] = groupIds.has(id) ? snapPositionToGrid(pos) : pos;
    }
  }

  let nodeSizes: Record<string, { width: number; height: number }> | undefined;
  if (workspace.nodeSizes) {
    nodeSizes = {};
    for (const [id, size] of Object.entries(workspace.nodeSizes)) {
      if (nodeIds.has(id)) {
        nodeSizes[id] = groupIds.has(id) ? constrainGroupNodeSize(size) : size;
      }
    }
  }

  const referenceableNodeIds = new Set(
    sanitizedGraph.nodes.filter((node) => node.type !== "group").map((node) => node.id)
  );

  const normalizedNodes = sanitizedGraph.nodes.map((node) => {
    const currentNode = removeDeprecatedNodeFields(node);
    const sanitizedNode = {
      ...currentNode,
      references: sanitizeReferences(currentNode.references, referenceableNodeIds),
    };
    if (!currentNode.parentId) {
      return sanitizedNode;
    }
    if (currentNode.type === "group" || !groupIds.has(currentNode.parentId)) {
      const nodeWithoutParent = { ...sanitizedNode };
      delete nodeWithoutParent.parentId;
      return nodeWithoutParent;
    }
    return sanitizedNode;
  });

  const normalizedEdges = sanitizedGraph.edges.map((edge) => ({
    ...edge,
    color: normalizeEdgeColor(edge.color),
  }));

  return {
    ...workspace,
    graph: {
      ...workspace.graph,
      nodes: normalizedNodes,
      edges: normalizedEdges,
    },
    nodePositions,
    nodeSizes,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function migrateWorkspaceIds(workspace: WorkspaceState): WorkspaceState {
  const normalizedWorkspace = normalizeWorkspaceState(workspace);
  const hasOldIds = normalizedWorkspace.graph.nodes.some((node) => !node.id.startsWith("#"));
  if (!hasOldIds) {
    return normalizedWorkspace;
  }

  const nodesWithDates = normalizedWorkspace.graph.nodes.map((node) => ({
    ...node,
    createdAt: node.createdAt || new Date().toISOString(),
    updatedAt: node.updatedAt || new Date().toISOString(),
  }));

  const sortedNodes = [...nodesWithDates].sort((a, b) => {
    const dateComparison = a.createdAt.localeCompare(b.createdAt);
    return dateComparison !== 0 ? dateComparison : a.id.localeCompare(b.id);
  });

  const idMapping = new Map<string, string>();
  sortedNodes.forEach((node, index) => {
    idMapping.set(node.id, `#${index + 1}`);
  });

  const inlineReferencePattern = new RegExp(
    `\\[(${[...idMapping.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join("|")})\\]`,
    "g"
  );

  const migratedNodes = nodesWithDates.map((node) => {
    let contentHtml = node.contentHtml;
    if (contentHtml) {
      contentHtml = contentHtml.replace(inlineReferencePattern, (match, oldId: string) => {
        const newId = idMapping.get(oldId);
        return newId ? `[${newId}]` : match;
      });
    }
    return {
      ...node,
      id: idMapping.get(node.id)!,
      parentId: node.parentId ? (idMapping.get(node.parentId) ?? node.parentId) : undefined,
      contentHtml,
      references: node.references?.map((reference) => ({
        ...reference,
        id: idMapping.get(reference.id) ?? reference.id,
      })),
    };
  });

  const migratedEdges = normalizedWorkspace.graph.edges.map((edge) => {
    const sourceId = idMapping.get(edge.sourceId) ?? edge.sourceId;
    const targetId = idMapping.get(edge.targetId) ?? edge.targetId;
    return {
      ...edge,
      id: `edge-${sourceId}-${targetId}`,
      sourceId,
      targetId,
    };
  });

  const migratedPositions: Record<string, { x: number; y: number }> = {};
  for (const [oldId, pos] of Object.entries(normalizedWorkspace.nodePositions)) {
    const newId = idMapping.get(oldId);
    if (newId) {
      migratedPositions[newId] = pos;
    }
  }

  let migratedSizes: Record<string, { width: number; height: number }> | undefined;
  if (normalizedWorkspace.nodeSizes) {
    migratedSizes = {};
    for (const [oldId, size] of Object.entries(normalizedWorkspace.nodeSizes)) {
      const newId = idMapping.get(oldId);
      if (newId) {
        migratedSizes[newId] = size;
      }
    }
  }

  const migratedSelectedId = normalizedWorkspace.selectedNodeId
    ? (idMapping.get(normalizedWorkspace.selectedNodeId) ?? null)
    : null;

  return {
    ...normalizedWorkspace,
    graph: {
      nodes: migratedNodes,
      edges: migratedEdges,
    },
    nodePositions: migratedPositions,
    nodeSizes: migratedSizes,
    selectedNodeId: migratedSelectedId,
  };
}

function removeDeprecatedNodeFields(node: GraphNode): GraphNode {
  const currentNode: GraphNode & { remark?: unknown } = { ...node };
  delete currentNode.remark;
  if (currentNode.color !== undefined) {
    currentNode.color = normalizeNodeColor(currentNode.color);
  }
  return currentNode;
}
