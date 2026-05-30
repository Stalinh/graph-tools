import type { WorkspaceState as SharedWorkspaceState } from "@local-kg/shared";

export type {
  BacklinkItem,
  EdgeDirection,
  EdgeStyle,
  EdgeType,
  EntityType,
  GraphData,
  GraphEdge,
  GraphNode,
  ReferenceItem,
  ViewportState,
  WorkspaceState,
} from "@local-kg/shared";

export type CanvasPosition = SharedWorkspaceState["nodePositions"][string];
export type NodeSize = NonNullable<SharedWorkspaceState["nodeSizes"]>[string];
export type CanvasViewport = NonNullable<SharedWorkspaceState["viewport"]>;
export type WorkspaceNodeFilter = "all" | "card" | "image" | "locked";

export interface GraphContextMenuState {
  x: number;
  y: number;
  flowPosition: CanvasPosition;
  nodeId: string | null;
  selectedNodeIdAtOpen: string | null;
}
