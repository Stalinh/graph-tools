import { useI18n } from '../../i18n';
import './ProjectSheetPage.css';
import { ProjectSheetHeader } from './ProjectSheetHeader';
import { ProjectSheetTable } from './ProjectSheetTable';
import { useProjectSheetState, type DroppedProjectFile } from './useProjectSheetState';

interface ProjectSheetPageProps {
  droppedProjectFile?: DroppedProjectFile | null;
  onDroppedProjectFileHandled?: (id: number) => void;
}

export function ProjectSheetPage({
  droppedProjectFile = null,
  onDroppedProjectFileHandled,
}: ProjectSheetPageProps) {
  const { isZh } = useI18n();
  const projectSheet = useProjectSheetState({
    droppedProjectFile,
    isZh,
    onDroppedProjectFileHandled,
  });

  return (
    <section
      className="project-sheet-page"
      aria-label={isZh ? '项目管理表格' : 'Project management table'}
    >
      <ProjectSheetHeader
        isEditMode={projectSheet.isEditMode}
        isZh={isZh}
        recordCount={projectSheet.recordCount}
        subLineCount={projectSheet.subLineCount}
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
      <ProjectSheetTable
        expandedProjectIds={projectSheet.expandedProjectIds}
        isEditMode={projectSheet.isEditMode}
        isZh={isZh}
        records={projectSheet.records}
        onCommitProjectField={projectSheet.commitProjectField}
        onRemoveRecord={projectSheet.removeRecord}
        onToggleProjectExpanded={projectSheet.toggleProjectExpanded}
        onUpdateProjectField={projectSheet.updateProjectField}
        onUpdateSubLineField={projectSheet.updateSubLineField}
      />
    </section>
  );
}
