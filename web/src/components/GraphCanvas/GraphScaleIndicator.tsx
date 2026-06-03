import { Panel, useViewport } from '@xyflow/react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useI18n } from '../../i18n';

interface GraphScaleIndicatorProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
}

export function GraphScaleIndicator({
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: GraphScaleIndicatorProps) {
  const { isZh } = useI18n();
  const { zoom } = useViewport();
  const scale = Math.round(zoom * 100);

  return (
    <Panel
      aria-label={isZh ? '画布缩放' : 'Graph scale'}
      className="graph-scale-indicator"
      data-testid="graph-scale-indicator"
      position="top-right"
    >
      <button
        type="button"
        className="graph-scale-indicator__button"
        aria-label={isZh ? '缩小' : 'Zoom out'}
        title={isZh ? '缩小' : 'Zoom out'}
        onClick={onZoomOut}
      >
        <ZoomOut size={14} />
      </button>
      <button
        type="button"
        className="graph-scale-indicator__readout"
        aria-label={isZh ? '重置视图缩放' : 'Reset zoom'}
        title={isZh ? '重置视图缩放' : 'Reset zoom'}
        onClick={onZoomReset}
      >
        {scale}%
      </button>
      <button
        type="button"
        className="graph-scale-indicator__button"
        aria-label={isZh ? '放大' : 'Zoom in'}
        title={isZh ? '放大' : 'Zoom in'}
        onClick={onZoomIn}
      >
        <ZoomIn size={14} />
      </button>
    </Panel>
  );
}
