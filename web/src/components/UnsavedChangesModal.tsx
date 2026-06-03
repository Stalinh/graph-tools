import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n';

interface UnsavedChangesModalProps {
  actionLabel: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesModal({
  actionLabel,
  onCancel,
  onDiscard,
  onSave,
}: UnsavedChangesModalProps) {
  const { isZh } = useI18n();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="modal-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        className="modal-panel confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={isZh ? '未保存更改确认' : 'Unsaved changes confirmation'}
        tabIndex={-1}
      >
        <div className="confirm-dialog__header">
          <div className="confirm-dialog__text">
            <h2 className="confirm-dialog__title">{isZh ? '未保存的更改' : 'Unsaved changes'}</h2>
            <p className="confirm-dialog__description">
              {isZh
                ? `当前画布还有未保存内容。是否先保存，再继续${actionLabel}？`
                : `There are unsaved changes on this canvas. Save before ${actionLabel}?`}
            </p>
          </div>
        </div>
        <div className="confirm-dialog__actions">
          <button type="button" className="toolbar-button" onClick={onCancel}>
            {isZh ? '取消' : 'Cancel'}
          </button>
          <button type="button" className="toolbar-button" onClick={onDiscard}>
            {isZh ? '不保存' : "Don't save"}
          </button>
          <button type="button" className="toolbar-button toolbar-button--primary" onClick={onSave}>
            {isZh ? '保存并继续' : 'Save and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
