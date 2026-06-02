import type { GraphData } from "../../types";
import type {
  DispatchWorkspaceTransaction,
  WorkspaceStoreState,
} from "../useWorkspaceStore";

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
  workspaceRef: CurrentRef<WorkspaceStoreState>;
  dispatchWorkspaceTransaction: DispatchWorkspaceTransaction;
}
