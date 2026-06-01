import {
  Eye,
  FilePlus,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  SaveAll,
} from "lucide-react";

interface ProjectSheetHeaderProps {
  isEditMode: boolean;
  isZh: boolean;
  recordCount: number;
  subLineCount: number;
  onAddProjectRecord: () => void;
  onEnterEditMode: () => void;
  onEnterReadMode: () => void;
  onNewProjectFile: () => void;
  onOpenProjectFile: () => void;
  onSaveProjectFile: () => void;
  onSaveProjectFileAs: () => void;
}

export function ProjectSheetHeader({
  isEditMode,
  isZh,
  recordCount,
  subLineCount,
  onAddProjectRecord,
  onEnterEditMode,
  onEnterReadMode,
  onNewProjectFile,
  onOpenProjectFile,
  onSaveProjectFile,
  onSaveProjectFileAs,
}: ProjectSheetHeaderProps) {
  return (
    <header className="project-sheet-page__header">
      <div className="project-sheet-page__title-group">
        <h1>{isZh ? "项目管理" : "Project Management"}</h1>
        <p>
          {isZh
            ? "按合同与项目维度维护项目管理信息。"
            : "Manage project records by contract and project."}
        </p>
      </div>
      <div className="project-sheet-page__header-actions">
        <div className="project-mode-toggle" aria-label={isZh ? "编辑模式切换" : "Edit mode toggle"}>
          <button
            className={`project-mode-toggle__button ${!isEditMode ? "is-active" : ""}`}
            type="button"
            aria-pressed={!isEditMode}
            onClick={onEnterReadMode}
          >
            <Eye size={15} />
            <span>{isZh ? "阅读" : "Read"}</span>
          </button>
          <button
            className={`project-mode-toggle__button ${isEditMode ? "is-active" : ""}`}
            type="button"
            aria-pressed={isEditMode}
            onClick={onEnterEditMode}
          >
            <Pencil size={15} />
            <span>{isZh ? "编辑" : "Edit"}</span>
          </button>
        </div>
        <div className="project-file-actions" aria-label={isZh ? "项目文件操作" : "Project file actions"}>
          <button
            className="project-file-action-button"
            type="button"
            aria-label={isZh ? "新建项目文件" : "New .project file"}
            title={isZh ? "新建项目文件" : "New .project file"}
            onClick={onNewProjectFile}
          >
            <FilePlus size={15} />
            <span>{isZh ? "新建" : "New"}</span>
          </button>
          <button
            className="project-file-action-button"
            type="button"
            aria-label={isZh ? "打开 Project 文件" : "Open .project file"}
            title={isZh ? "打开 Project 文件" : "Open .project file"}
            onClick={onOpenProjectFile}
          >
            <FolderOpen size={15} />
            <span>{isZh ? "打开" : "Open"}</span>
          </button>
          <button
            className="project-file-action-button"
            type="button"
            aria-label={isZh ? "保存到当前项目文件" : "Save current .project file"}
            title={isZh ? "保存到当前项目文件" : "Save current .project file"}
            onClick={onSaveProjectFile}
          >
            <Save size={15} />
            <span>{isZh ? "保存" : "Save"}</span>
          </button>
          <button
            className="project-file-action-button"
            type="button"
            aria-label={isZh ? "另存为项目文件" : "Save as .project file"}
            title={isZh ? "另存为项目文件" : "Save as .project file"}
            onClick={onSaveProjectFileAs}
          >
            <SaveAll size={15} />
            <span>{isZh ? "另存" : "Save as"}</span>
          </button>
        </div>
        <div className="project-sheet-page__summary" aria-label={isZh ? "项目统计" : "Project summary"}>
          <span>
            {isZh ? "项目数" : "Projects"} <strong>{recordCount}</strong>
          </span>
          <span>
            {isZh ? "子行" : "Sublines"} <strong>{subLineCount}</strong>
          </span>
        </div>
        <button
          className="project-sheet-page__add-button"
          type="button"
          disabled={!isEditMode}
          onClick={onAddProjectRecord}
        >
          <Plus size={16} />
          <span>{isZh ? "新增项目" : "New project"}</span>
        </button>
      </div>
    </header>
  );
}
