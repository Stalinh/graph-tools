import { Panel } from '@xyflow/react';
import { useI18n } from '../../i18n';

interface GraphCanvasFileStatusProps {
  currentFileName: string | null;
  dirty: boolean;
  fileStatus: string | null;
}

export function GraphCanvasFileStatusPanel({
  currentFileName,
  dirty,
  fileStatus,
}: GraphCanvasFileStatusProps) {
  const { isZh } = useI18n();
  return (
    <Panel
      position="bottom-right"
      className="graph-canvas-panel graph-canvas-panel--status"
      role="status"
    >
      <span className="graph-canvas-panel__status-text">
        {currentFileName ? currentFileName : isZh ? '未打开文件' : 'No file opened'}
        {dirty ? (isZh ? ' · 未保存' : ' · Unsaved') : ''}
        {fileStatus ? ` — ${fileStatus}` : ''}
      </span>
    </Panel>
  );
}
