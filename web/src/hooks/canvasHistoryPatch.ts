import type { CanvasCommand, CanvasHistoryWorkspaceState } from './canvasHistoryTypes';

export function createWorkspacePatchCommand(
  before: CanvasHistoryWorkspaceState,
  after: CanvasHistoryWorkspaceState
): CanvasCommand {
  return {
    type: 'workspace-patch',
    before,
    after,
  };
}
