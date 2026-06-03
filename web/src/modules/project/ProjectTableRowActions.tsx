import { Check, Copy, Download } from 'lucide-react';

interface ProjectTableRowActionsProps {
  copied: boolean;
  downloaded: boolean;
  isZh: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

export function ProjectTableRowActions({
  copied,
  downloaded,
  isZh,
  onCopy,
  onDownload,
}: ProjectTableRowActionsProps) {
  return (
    <div className="project-sheet__row-actions" style={{ gap: '4px' }}>
      <button
        className={`project-sheet__row-action project-sheet__copy-button ${
          copied ? 'is-copied' : ''
        }`}
        type="button"
        aria-label={isZh ? '复制项目' : 'Copy project'}
        title={isZh ? '复制项目' : 'Copy project'}
        onClick={onCopy}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button
        className={`project-sheet__row-action project-sheet__download-button ${
          downloaded ? 'is-downloaded' : ''
        }`}
        type="button"
        aria-label={isZh ? '下载项目' : 'Download project'}
        title={isZh ? '下载项目' : 'Download project'}
        onClick={onDownload}
      >
        {downloaded ? <Check size={16} /> : <Download size={16} />}
      </button>
    </div>
  );
}
