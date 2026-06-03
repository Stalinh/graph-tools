import { lazy, Suspense } from 'react';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import type { KnowledgeBaseModalsProps } from './KnowledgeBase.types';

const RichEditorModal = lazy(async () => {
  const module = await import('./RichEditorModal');
  return { default: module.RichEditorModal };
});

function getPendingActionLabel(
  pendingAction: KnowledgeBaseModalsProps['files']['pendingAction'],
  isZh: boolean
) {
  if (pendingAction === 'new') {
    return isZh ? '新建画布' : 'creating a new canvas';
  }
  if (pendingAction === 'open-dropped') {
    return isZh ? '打开拖入的文件' : 'opening the dropped file';
  }
  return isZh ? '打开其他文件' : 'opening another file';
}

export function KnowledgeBaseModals({
  editingNode,
  files,
  isZh,
  onCloseEditor,
  onSaveEditorNode,
}: KnowledgeBaseModalsProps) {
  return (
    <>
      {editingNode && editingNode.type === 'card' ? (
        <Suspense
          fallback={
            <div className="modal-loading-fallback" role="status">
              {isZh ? '正在加载编辑器...' : 'Loading editor...'}
            </div>
          }
        >
          <RichEditorModal node={editingNode} onClose={onCloseEditor} onSave={onSaveEditorNode} />
        </Suspense>
      ) : null}
      {files.pendingAction ? (
        <UnsavedChangesModal
          actionLabel={getPendingActionLabel(files.pendingAction, isZh)}
          onCancel={files.cancelPendingAction}
          onDiscard={() => {
            void files.discardPendingAction();
          }}
          onSave={() => {
            void files.saveAndContinuePendingAction();
          }}
        />
      ) : null}
    </>
  );
}
