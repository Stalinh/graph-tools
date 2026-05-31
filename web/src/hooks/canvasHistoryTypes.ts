import type {
  CanvasPosition,
  EdgeDirection,
  GraphData,
  GraphEdge,
  GraphNode,
  NodeSize,
} from "../types";

export type RemoveMeta = {
  removedNode: GraphNode;
  position: CanvasPosition;
  size?: NodeSize;
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
      from: CanvasPosition;
      to: CanvasPosition;
      graphBefore?: GraphData;
      graphAfter?: GraphData;
    }
  | {
      type: "move-many";
      moves: { nodeId: string; from: CanvasPosition; to: CanvasPosition }[];
      graphBefore?: GraphData;
      graphAfter?: GraphData;
    }
  | {
      type: "add";
      nodeId: string;
      nodeData: GraphNode;
      position: CanvasPosition;
      size?: NodeSize;
    }
  | {
      type: "remove";
      nodeId: string;
      meta: RemoveMeta;
      graphBefore?: GraphData;
      graphAfter?: GraphData;
      positionsBefore?: Record<string, CanvasPosition>;
      positionsAfter?: Record<string, CanvasPosition>;
      sizesBefore?: Record<string, NodeSize>;
      sizesAfter?: Record<string, NodeSize>;
    }
  | {
      type: "remove-many";
      removals: RemoveManyMeta[];
      graphBefore?: GraphData;
      graphAfter?: GraphData;
      positionsBefore?: Record<string, CanvasPosition>;
      positionsAfter?: Record<string, CanvasPosition>;
      sizesBefore?: Record<string, NodeSize>;
      sizesAfter?: Record<string, NodeSize>;
    }
  | { type: "link"; sourceId: string; targetId: string; direction: EdgeDirection }
  | { type: "unlink"; sourceId: string; targetId: string; direction?: EdgeDirection }
  | { type: "replace-graph"; before: GraphData; after: GraphData }
  | { type: "resize"; nodeId: string; before: NodeSize | undefined; after: NodeSize }
  | {
      type: "resize-many";
      resizes: { nodeId: string; before: NodeSize | undefined; after: NodeSize }[];
    };
