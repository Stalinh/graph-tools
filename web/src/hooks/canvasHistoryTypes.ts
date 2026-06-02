import type {
  CanvasPosition,
  CanvasViewport,
  GraphData,
  NodeSize,
} from "../types";

export const MAX_HISTORY = 20;

export type CanvasHistorySelectionState = {
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  editingNodeId: string | null;
  quickEditingNodeId: string | null;
  pendingInspectorContentFocusNodeId: string | null;
};

export type CanvasHistoryWorkspaceState = {
  graph: GraphData;
  nodePositions: Record<string, CanvasPosition>;
  nodeSizes: Record<string, NodeSize>;
  viewport: CanvasViewport | null;
  selection: CanvasHistorySelectionState;
};

export type CanvasCommand = {
  type: "workspace-patch";
  before: CanvasHistoryWorkspaceState;
  after: CanvasHistoryWorkspaceState;
};
