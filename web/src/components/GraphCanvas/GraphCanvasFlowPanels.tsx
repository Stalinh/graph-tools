import { Background } from '@xyflow/react';
import { GRAPH_GRID_SIZE } from '../../lib/graphLayout';
import type { CanvasViewport } from '../../types';
import { GlobalPreviewController } from './GlobalPreviewController';
import { GraphScaleIndicator } from './GraphScaleIndicator';
import { GraphCanvasFileStatusPanel } from './GraphCanvasStatusPanels';
import { GraphCanvasPendingCitationPanel } from './GraphCanvasOverlays';

interface GraphCanvasFlowPanelsProps {
  currentFileName: string | null;
  dirty: boolean;
  fileStatus: string | null;
  globalPreviewRequestId: number;
  nodeCount: number;
  pendingCitationMessage: string | null;
  onGlobalPreviewEnd: () => void;
  onGlobalPreviewStart: () => void;
  onGlobalPreviewViewportChange: (viewport: CanvasViewport) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function GraphCanvasFlowPanels({
  currentFileName,
  dirty,
  fileStatus,
  globalPreviewRequestId,
  nodeCount,
  pendingCitationMessage,
  onGlobalPreviewEnd,
  onGlobalPreviewStart,
  onGlobalPreviewViewportChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: GraphCanvasFlowPanelsProps) {
  return (
    <>
      <GlobalPreviewController
        nodeCount={nodeCount}
        requestId={globalPreviewRequestId}
        onPreviewEnd={onGlobalPreviewEnd}
        onPreviewStart={onGlobalPreviewStart}
        onPreviewViewportChange={onGlobalPreviewViewportChange}
      />
      <Background color="var(--color-graph-grid)" gap={GRAPH_GRID_SIZE} size={2} />
      <GraphScaleIndicator onZoomIn={onZoomIn} onZoomOut={onZoomOut} onZoomReset={onZoomReset} />
      <GraphCanvasFileStatusPanel
        currentFileName={currentFileName}
        dirty={dirty}
        fileStatus={fileStatus}
      />
      {pendingCitationMessage ? (
        <GraphCanvasPendingCitationPanel message={pendingCitationMessage} />
      ) : null}
    </>
  );
}
