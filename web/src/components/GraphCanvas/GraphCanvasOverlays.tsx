import type {
  CanvasPosition,
  EdgeDirection,
  EntityType,
  GraphContextMenuState,
  GraphData,
} from '../../types';
import { GraphContextMenu } from './GraphContextMenu';
import type { AlignmentGuide, ScreenRect } from './canvasInteractionUtils';

interface GraphCanvasAlignmentGuidesProps {
  alignmentGuides: AlignmentGuide[];
}

interface GraphCanvasPendingCitationPanelProps {
  message: string;
}

interface GraphCanvasMarqueeSelectionOverlayProps {
  selectionRect: ScreenRect | null;
}

interface GraphCanvasContextMenuOverlayProps {
  contextMenu: GraphContextMenuState | null;
  graph: GraphData;
  selectedNodeId: string | null;
  onClose: () => void;
  onCreateNode: (type: EntityType, position: CanvasPosition) => void;
  onDeleteNode: (nodeId: string) => void;
  onEditNode: (nodeId: string) => void;
  onStartCitation: (direction: EdgeDirection) => void;
  onToggleNodeLock: (nodeId: string, locked: boolean) => void;
}

export function GraphCanvasAlignmentGuides({ alignmentGuides }: GraphCanvasAlignmentGuidesProps) {
  if (alignmentGuides.length === 0) {
    return null;
  }

  return (
    <div aria-hidden="true" className="alignment-guides">
      {alignmentGuides.map((guide) => (
        <span
          key={guide.id}
          className={`alignment-guide alignment-guide--${guide.orientation}`}
          style={
            guide.orientation === 'vertical'
              ? {
                  height: guide.end - guide.start,
                  left: guide.offset,
                  top: guide.start,
                }
              : {
                  left: guide.start,
                  top: guide.offset,
                  width: guide.end - guide.start,
                }
          }
        />
      ))}
    </div>
  );
}

export function GraphCanvasPendingCitationPanel({ message }: GraphCanvasPendingCitationPanelProps) {
  return (
    <div
      className="react-flow__panel graph-canvas-panel graph-canvas-panel--citation-pending top center"
      role="status"
    >
      {message}
    </div>
  );
}

export function GraphCanvasMarqueeSelectionOverlay({
  selectionRect,
}: GraphCanvasMarqueeSelectionOverlayProps) {
  if (!selectionRect) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="graph-canvas-marquee"
      style={{
        left: selectionRect.left,
        top: selectionRect.top,
        width: selectionRect.right - selectionRect.left,
        height: selectionRect.bottom - selectionRect.top,
      }}
    />
  );
}

export function GraphCanvasContextMenuOverlay({
  contextMenu,
  graph,
  selectedNodeId,
  onClose,
  onCreateNode,
  onDeleteNode,
  onEditNode,
  onStartCitation,
  onToggleNodeLock,
}: GraphCanvasContextMenuOverlayProps) {
  if (!contextMenu) {
    return null;
  }

  return (
    <GraphContextMenu
      contextMenu={contextMenu}
      graph={graph}
      selectedNodeId={selectedNodeId}
      onClose={onClose}
      onStartCitation={onStartCitation}
      onCreateNode={onCreateNode}
      onDeleteNode={onDeleteNode}
      onEditNode={onEditNode}
      onToggleNodeLock={onToggleNodeLock}
    />
  );
}
