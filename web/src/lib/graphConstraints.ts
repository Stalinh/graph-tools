import type { GraphData, GraphNode, ReferenceItem } from "../types";

export function isReferenceableNode(node: Pick<GraphNode, "type">) {
  return node.type !== "group";
}

export function sanitizeReferences(
  references: ReferenceItem[] | undefined,
  referenceableNodeIds: Set<string>
) {
  if (!references || references.length === 0) {
    return undefined;
  }

  const nextReferences = references.filter((reference) => referenceableNodeIds.has(reference.id));
  return nextReferences.length > 0 ? nextReferences : undefined;
}

export function sanitizeReferenceGraph(graph: GraphData): GraphData {
  const referenceableNodeIds = new Set(
    graph.nodes.filter(isReferenceableNode).map((node) => node.id)
  );

  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      references: sanitizeReferences(node.references, referenceableNodeIds),
    })),
    edges: graph.edges.filter(
      (edge) =>
        referenceableNodeIds.has(edge.sourceId) && referenceableNodeIds.has(edge.targetId)
    ),
  };
}
