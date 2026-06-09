import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../../i18n';
import './ProjectSheetPage.css';
import { ProjectExecutiveSummary } from './ProjectExecutiveSummary';
import { ProjectSheetHeader } from './ProjectSheetHeader';
import { ProjectSheetTable } from './ProjectSheetTable';
import { downloadProjectFpdsUploadTemplate } from './projectFpdsTemplate';
import { calculateProjectMetrics } from './projectMetrics';
import { useProjectSheetState, type DroppedProjectFile } from './useProjectSheetState';

interface ProjectSheetPageProps {
  defaultProjectFileHandle?: { handle: FileSystemFileHandle; id: number } | null;
  droppedProjectFile?: DroppedProjectFile | null;
  onDefaultProjectFileHandleHandled?: (id: number) => void;
  onDroppedProjectFileHandled?: (id: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveCurrentPageChange?: (saveCurrentPage: (() => Promise<boolean>) | null) => void;
}

export function ProjectSheetPage({
  defaultProjectFileHandle = null,
  droppedProjectFile = null,
  onDefaultProjectFileHandleHandled,
  onDroppedProjectFileHandled,
  onDirtyChange,
  onSaveCurrentPageChange,
}: ProjectSheetPageProps) {
  const { isZh } = useI18n();
  const handledDefaultProjectFileIdRef = useRef<number | null>(null);
  const projectSheet = useProjectSheetState({
    droppedProjectFile,
    isZh,
    onDroppedProjectFileHandled,
  });
  const { dirty, handleOpenDefaultProjectFile, handleSaveProjectFile } = projectSheet;
  const metrics = useMemo(
    () => calculateProjectMetrics(projectSheet.records),
    [projectSheet.records]
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onSaveCurrentPageChange?.(handleSaveProjectFile);
    return () => onSaveCurrentPageChange?.(null);
  }, [handleSaveProjectFile, onSaveCurrentPageChange]);

  useEffect(() => {
    if (!defaultProjectFileHandle) {
      return;
    }
    if (handledDefaultProjectFileIdRef.current === defaultProjectFileHandle.id) {
      return;
    }

    handledDefaultProjectFileIdRef.current = defaultProjectFileHandle.id;
    onDefaultProjectFileHandleHandled?.(defaultProjectFileHandle.id);
    void handleOpenDefaultProjectFile(defaultProjectFileHandle.handle);
  }, [defaultProjectFileHandle, handleOpenDefaultProjectFile, onDefaultProjectFileHandleHandled]);

  return (
    <section
      className="project-sheet-page"
      aria-label={isZh ? '项目管理表格' : 'Project management table'}
    >
      <ProjectSheetHeader
        isEditMode={projectSheet.isEditMode}
        isZh={isZh}
        onAddProjectRecord={projectSheet.addProjectRecord}
        onEnterEditMode={projectSheet.enterEditMode}
        onEnterReadMode={projectSheet.enterReadMode}
        onNewProjectFile={projectSheet.handleNewProjectFile}
        onOpenProjectFile={() => {
          void projectSheet.handleOpenProjectFile();
        }}
        onSaveProjectFile={() => {
          void projectSheet.handleSaveProjectFile();
        }}
        onSaveProjectFileAs={() => {
          void projectSheet.handleSaveProjectFileAs();
        }}
      />
      <div className="project-file-status" role="status">
        <span>
          {projectSheet.currentFileName ?? (isZh ? '未选择项目文件' : 'No project file selected')}
        </span>
        {projectSheet.dirty ? <strong>{isZh ? '未保存' : 'Unsaved'}</strong> : null}
        {projectSheet.fileStatus ? <em>{projectSheet.fileStatus}</em> : null}
      </div>
      <ProjectExecutiveSummary isZh={isZh} metrics={metrics} />
      <ProjectSheetTable
        expandedProjectIds={projectSheet.expandedProjectIds}
        isEditMode={projectSheet.isEditMode}
        isZh={isZh}
        records={projectSheet.records}
        onCommitProjectField={projectSheet.commitProjectField}
        onDownloadProject={downloadProjectFpdsUploadTemplate}
        onRemoveRecord={projectSheet.removeRecord}
        onToggleProjectExpanded={projectSheet.toggleProjectExpanded}
        onUpdateProjectField={projectSheet.updateProjectField}
        onUpdateSubLineField={projectSheet.updateSubLineField}
      />
    </section>
  );
}
