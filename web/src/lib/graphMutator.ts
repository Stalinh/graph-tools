import type { EdgeDirection, EdgeStyle, GraphData, GraphEdge, GraphNode } from "../types";

import { normalizeEdgeColor, normalizeNodeColor } from "./nodeColors";

function makeEdgeId(sourceId: string, targetId: string) {
  return `edge-${sourceId}-${targetId}`;
}

export function addNode(graph: GraphData, node: GraphNode): GraphData {
  return {
    ...graph,
    nodes: [...graph.nodes, node],
  };
}

export function removeNode(
  graph: GraphData,
  nodeId: string
): {
  graph: GraphData;
  removedNode: GraphNode | null;
  removedEdges: GraphEdge[];
  affectedRefs: { ownerId: string; refId: string }[];
} {
  const nodeToRemove = graph.nodes.find((n) => n.id === nodeId);
  if (!nodeToRemove) {
    return {
      graph,
      removedNode: null,
      removedEdges: [],
      affectedRefs: [],
    };
  }

  const removedEdges = graph.edges.filter((e) => e.sourceId === nodeId || e.targetId === nodeId);

  const affectedRefs: { ownerId: string; refId: string }[] = [];
  graph.nodes.forEach((n) => {
    (n.references ?? []).forEach((r) => {
      if (r.id === nodeId) {
        affectedRefs.push({ ownerId: n.id, refId: nodeId });
      }
    });
  });

  const nextNodes = graph.nodes.filter((node) => node.id !== nodeId);
  const nextEdges = graph.edges.filter(
    (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId
  );

  const finalNodes = nextNodes.map((node) => {
    const refs = node.references ?? [];
    if (!refs.some((r) => r.id === nodeId)) return node;
    return { ...node, references: refs.filter((r) => r.id !== nodeId) };
  });

  return {
    graph: { nodes: finalNodes, edges: nextEdges },
    removedNode: nodeToRemove,
    removedEdges,
    affectedRefs,
  };
}

export function restoreNode(
  graph: GraphData,
  node: GraphNode,
  removedEdges: GraphEdge[],
  affectedRefs: { ownerId: string; refId: string }[]
): GraphData {
  const restoredNodes = [...graph.nodes, node];
  const affectedOwners = new Set(affectedRefs.map((a) => a.ownerId));

  const finalNodes = restoredNodes.map((n) => {
    if (!affectedOwners.has(n.id)) return n;
    const refs = n.references ?? [];
    if (refs.some((r) => r.id === node.id)) return n;
    return {
      ...n,
      references: [...refs, { id: node.id, title: node.title }],
    };
  });

  return {
    nodes: finalNodes,
    edges: [...graph.edges, ...removedEdges],
  };
}

export function addCitation(
  graph: GraphData,
  sourceId: string,
  targetId: string,
  direction: EdgeDirection = "unidirectional"
): GraphData {
  const sourceNode = graph.nodes.find((node) => node.id === sourceId);
  const targetNode = graph.nodes.find((node) => node.id === targetId);

  if (!sourceNode || !targetNode) {
    return graph;
  }

  const citationExists = graph.edges.some(
    (edge) => edge.sourceId === sourceId && edge.targetId === targetId
  );
  if (citationExists) {
    return graph;
  }

  const reference = {
    id: targetNode.id,
    title: targetNode.title,
  };
  const reverseReference = {
    id: sourceNode.id,
    title: sourceNode.title,
  };

  const nextNodes = graph.nodes.map((node) => {
    if (node.id === sourceId) {
      const refs = node.references ?? [];
      if (refs.some((r) => r.id === targetId)) return node;
      return { ...node, references: [...refs, reference] };
    }
    if (direction === "bidirectional" && node.id === targetId) {
      const refs = node.references ?? [];
      if (refs.some((r) => r.id === sourceId)) return node;
      return { ...node, references: [...refs, reverseReference] };
    }
    return node;
  });

  const edgeId = makeEdgeId(sourceId, targetId);
  const nextEdges = [
    ...graph.edges,
    {
      id: edgeId,
      sourceId,
      targetId,
      type: "citation" as const,
      weight: 1,
      direction,
      style: "note-dash" as const,
    },
  ];

  return {
    nodes: nextNodes,
    edges: nextEdges,
  };
}

export function removeCitation(graph: GraphData, sourceId: string, targetId: string): GraphData {
  const edge = graph.edges.find((e) => e.sourceId === sourceId && e.targetId === targetId);
  const isBidirectional = edge?.direction === "bidirectional";

  const nextEdges = graph.edges.filter(
    (e) => !(e.sourceId === sourceId && e.targetId === targetId)
  );

  return {
    nodes: graph.nodes.map((node) => {
      if (node.id === sourceId) {
        return {
          ...node,
          references: (node.references ?? []).filter((r) => r.id !== targetId),
        };
      }
      if (isBidirectional && node.id === targetId) {
        return {
          ...node,
          references: (node.references ?? []).filter((r) => r.id !== sourceId),
        };
      }
      return node;
    }),
    edges: nextEdges,
  };
}

export function updateNodeColor(graph: GraphData, nodeId: string, color: string): GraphData {
  const nextColor = normalizeNodeColor(color);
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, color: nextColor } : node)),
  };
}

export function updateNodeLocked(graph: GraphData, nodeId: string, locked: boolean): GraphData {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, locked } : node)),
  };
}

export function updateNodeOpacity(graph: GraphData, nodeId: string, opacity: number): GraphData {
  const nextOpacity = Math.min(Math.max(opacity, 0), 1);
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, opacity: nextOpacity } : node
    ),
  };
}

export function updateNodeFields(graph: GraphData, updatedNode: GraphNode): GraphData {
  const now = new Date().toISOString();
  const oldNode = graph.nodes.find((n) => n.id === updatedNode.id);

  if (oldNode && oldNode.type === "group" && oldNode.title !== updatedNode.title) {
    const oldTitle = oldNode.title;
    const newTitle = updatedNode.title;

    return {
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (node.id === updatedNode.id) {
          return { ...updatedNode, updatedAt: now };
        }
        if (node.parentId === updatedNode.id) {
          const nextTags = node.tags.filter((t) => t !== oldTitle);
          if (newTitle && !nextTags.includes(newTitle)) {
            nextTags.push(newTitle);
          }
          return { ...node, tags: nextTags, updatedAt: now };
        }
        return node;
      }),
    };
  }

  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === updatedNode.id ? { ...updatedNode, updatedAt: now } : node
    ),
  };
}

export function updateEdgeDirection(
  graph: GraphData,
  edgeId: string,
  direction: EdgeDirection
): GraphData {
  const edge = graph.edges.find((e) => e.id === edgeId);
  if (!edge) return graph;
  if (edge.direction === direction) return graph;

  const sourceNode = graph.nodes.find((n) => n.id === edge.sourceId);
  const targetNode = graph.nodes.find((n) => n.id === edge.targetId);

  const nextEdges = graph.edges.map((e) => (e.id === edgeId ? { ...e, direction } : e));

  const nextNodes = graph.nodes.map((node) => {
    if (direction === "bidirectional") {
      if (node.id === edge.sourceId && sourceNode && targetNode) {
        const refs = node.references ?? [];
        if (!refs.some((r) => r.id === targetNode.id)) {
          return { ...node, references: [...refs, { id: targetNode.id, title: targetNode.title }] };
        }
      }
      if (node.id === edge.targetId && sourceNode && targetNode) {
        const refs = node.references ?? [];
        if (!refs.some((r) => r.id === sourceNode.id)) {
          return { ...node, references: [...refs, { id: sourceNode.id, title: sourceNode.title }] };
        }
      }
    } else {
      if (node.id === edge.sourceId && sourceNode && targetNode) {
        const refs = node.references ?? [];
        if (!refs.some((r) => r.id === targetNode.id)) {
          return { ...node, references: [...refs, { id: targetNode.id, title: targetNode.title }] };
        }
      }
      if (node.id === edge.targetId) {
        return {
          ...node,
          references: (node.references ?? []).filter((r) => r.id !== edge.sourceId),
        };
      }
    }
    return node;
  });

  return {
    nodes: nextNodes,
    edges: nextEdges,
  };
}

export function updateEdgeStyle(graph: GraphData, edgeId: string, style: EdgeStyle): GraphData {
  return {
    ...graph,
    edges: graph.edges.map((edge) => (edge.id === edgeId ? { ...edge, style } : edge)),
  };
}

export function updateEdgeColor(
  graph: GraphData,
  edgeId: string,
  color: string | undefined
): GraphData {
  const nextColor = normalizeEdgeColor(color);
  return {
    ...graph,
    edges: graph.edges.map((edge) => {
      if (edge.id !== edgeId) return edge;
      return { ...edge, color: nextColor };
    }),
  };
}

export function reorderReferences(
  graph: GraphData,
  sourceId: string,
  newOrder: string[]
): GraphData {
  const sourceNode = graph.nodes.find((n) => n.id === sourceId);
  if (!sourceNode) {
    return graph;
  }

  const refsById = new Map((sourceNode.references ?? []).map((r) => [r.id, r]));
  const reordered = newOrder
    .map((id) => refsById.get(id))
    .filter((ref): ref is NonNullable<GraphNode["references"]>[number] => ref !== undefined);

  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === sourceId ? { ...node, references: reordered } : node
    ),
  };
}
