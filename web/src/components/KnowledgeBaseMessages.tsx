interface KnowledgeBaseMessagesProps {
  draftSaveFailed: boolean;
  errorMessage: string | null;
  isZh: boolean;
  missingImageAssetCount: number;
}

interface StatusItem {
  key: string;
  message: string;
  tone: 'warning' | 'danger';
}

export function KnowledgeBaseMessages({
  draftSaveFailed,
  errorMessage,
  isZh,
  missingImageAssetCount,
}: KnowledgeBaseMessagesProps) {
  const items: StatusItem[] = [];

  if (draftSaveFailed) {
    items.push({
      key: 'draft-save-failed',
      tone: 'warning',
      message: isZh
        ? ['本地草稿保存失败。', '请使用“另存为”导出 .graph 文件，避免刷新后丢失未保存内容。'].join(
            ''
          )
        : [
            'Saving the local draft failed. ',
            'Use Save As to export a .graph file so unsaved work is not lost on refresh.',
          ].join(''),
    });
  }

  if (missingImageAssetCount > 0) {
    items.push({
      key: 'missing-image-assets',
      tone: 'warning',
      message: isZh
        ? [
            `${missingImageAssetCount} 个图片资源缺失。`,
            '请打开原 .graph 文件或重新拖入图片后再保存。',
          ].join('')
        : `${missingImageAssetCount} image asset${
            missingImageAssetCount === 1 ? '' : 's'
          } missing. Open the original .graph file or drop the image again before saving.`,
    });
  }

  if (errorMessage) {
    items.push({
      key: 'error',
      tone: 'danger',
      message: errorMessage,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="knowledge-status-stack" data-workbench-motion="messages">
      {items.map((item) => (
        <div
          key={item.key}
          className={`knowledge-status-item knowledge-status-item--${item.tone}`}
          role="alert"
        >
          <span className="knowledge-status-item__bar" aria-hidden="true" />
          <span className="knowledge-status-item__message">{item.message}</span>
        </div>
      ))}
    </div>
  );
}
