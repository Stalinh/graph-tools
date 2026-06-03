interface KnowledgeBaseMessagesProps {
  draftSaveFailed: boolean;
  errorMessage: string | null;
  isZh: boolean;
  missingImageAssetCount: number;
}

export function KnowledgeBaseMessages({
  draftSaveFailed,
  errorMessage,
  isZh,
  missingImageAssetCount,
}: KnowledgeBaseMessagesProps) {
  return (
    <>
      {draftSaveFailed ? (
        <div className="graph-message" role="alert">
          {isZh
            ? [
                '本地草稿保存失败。',
                '请使用“另存为”导出 .graph 文件，避免刷新后丢失未保存内容。',
              ].join('')
            : [
                'Saving the local draft failed. ',
                'Use Save As to export a .graph file so unsaved work is not lost on refresh.',
              ].join('')}
        </div>
      ) : null}
      {missingImageAssetCount > 0 ? (
        <div className="graph-message" role="alert">
          {isZh
            ? [
                `${missingImageAssetCount} 个图片资源缺失。`,
                '请打开原 .graph 文件或重新拖入图片后再保存。',
              ].join('')
            : `${missingImageAssetCount} image asset${
                missingImageAssetCount === 1 ? '' : 's'
              } missing. Open the original .graph file or drop the image again before saving.`}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="graph-message" role="alert">
          {errorMessage}
        </div>
      ) : null}
    </>
  );
}
