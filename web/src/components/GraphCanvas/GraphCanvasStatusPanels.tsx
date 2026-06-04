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
  const fileName = currentFileName ? currentFileName : isZh ? '未打开文件' : 'No file opened';
  const dirtyText = dirty ? (isZh ? '未保存' : 'Unsaved') : isZh ? '已同步' : 'Synced';

  return (
    <Panel
      position="bottom-right"
      className="graph-canvas-panel graph-canvas-panel--status graph-canvas-panel--executive-status"
      role="status"
    >
      <span className="graph-canvas-panel__status-kicker">{isZh ? '文件状态' : 'File status'}</span>
      <span className="graph-canvas-panel__status-text">
        {fileName}
        {fileStatus ? ` — ${fileStatus}` : ''}
      </span>
      <span className={`graph-canvas-panel__status-pill${dirty ? ' is-dirty' : ''}`}>
        {dirtyText}
      </span>
    </Panel>
  );
}
