import type { Dispatch, SetStateAction } from "react";
import type { CanvasPosition, GraphData, NodeSize } from "../../types";
import type { CanvasCommand } from "../canvasHistoryTypes";

export interface UpdateGraphNodeOptions {
  pushToHistory?: boolean;
}

export type ApplyGraphUpdate = (
  mutate: (currentGraph: GraphData) => GraphData,
  options?: UpdateGraphNodeOptions
) => boolean;

export interface CurrentRef<T> {
  current: T;
}

export interface GraphNodeActionContext {
  graphRef: CurrentRef<GraphData>;
  nodePositionsRef: CurrentRef<Record<string, CanvasPosition>>;
  nodeSizesRef: CurrentRef<Record<string, NodeSize>>;
  setGraph: Dispatch<SetStateAction<GraphData>>;
  setNodePositions: Dispatch<SetStateAction<Record<string, CanvasPosition>>>;
  setNodeSizes: Dispatch<SetStateAction<Record<string, NodeSize>>>;
  setDirty: (dirty: boolean) => void;
  pushCommand: (cmd: CanvasCommand) => void;
}
