import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  SaveAll,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import "./ProjectSheetPage.css";
import { PROJECT_COLUMNS, PROJECT_LEVEL_OPTIONS, PROJECT_SUB_LINE_STATUS_OPTIONS } from "./projectConfig";
import { projectFileManager } from "./projectFileSystem";
import {
  createProjectRecord,
  createProjectSubLine,
  normalizeProjectName,
  normalizeProjectProgress,
  normalizeProjectSubLineStatus,
  sanitizeProjectRecords,
} from "./projectModel";
import { loadProjectDraftRecords, saveProjectDraftRecords } from "./projectStorage";
import type {
  ProjectLine,
  ProjectRecord,
  ProjectRecordField,
  ProjectSubLine,
  ProjectSubLineStatus,
} from "./projectTypes";

interface ProjectDetailBaseState {
  mode: "create" | "edit";
  error: string;
}

interface ProjectDetailProjectState extends ProjectDetailBaseState {
  lineType: "project";
  record: ProjectLine;
}

interface ProjectDetailSubLineState extends ProjectDetailBaseState {
  lineType: "subLine";
  parentId: string;
  record: ProjectSubLine;
}

type ProjectDetailState = ProjectDetailProjectState | ProjectDetailSubLineState;

function getFieldValue(record: ProjectLine, field: ProjectRecordField) {
  return record[field];
}

function renderProgressBar(progressValue: string, ariaLabel: string) {
  const progress = normalizeProjectProgress(progressValue);

  return (
    <div className="project-progress" aria-label={`${ariaLabel} ${progress}%`} title={`${progress}%`}>
      <div className="project-progress__bar" aria-hidden="true">
        <div className="project-progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="project-progress__value">{progress}%</span>
    </div>
  );
}

function renderProjectCell(record: ProjectLine, field: ProjectRecordField, isZh: boolean) {
  if (field !== "progress") {
    return getFieldValue(record, field);
  }

  return renderProgressBar(record.progress, isZh ? "项目进度" : "Project progress");
}

function getAllProjectNames(records: ProjectRecord[]) {
  return records.map((record) => ({
    id: record.id,
    projectName: normalizeProjectName(record.projectName),
  }));
}

function createSavedProjectLine(record: ProjectLine, projectName: string): ProjectLine {
  return {
    id: record.id,
    contractNo: record.contractNo,
    projectNo: record.projectNo,
    projectName,
    contractAmount: record.contractAmount,
    projectLevel: record.projectLevel,
    progress: normalizeProjectProgress(record.progress),
    schemeDesign: record.schemeDesign,
    projectManager: record.projectManager,
  };
}

function createSavedProjectSubLine(record: ProjectSubLine): ProjectSubLine {
  return {
    id: record.id,
    progressRatio: normalizeProjectProgress(record.progressRatio),
    status: normalizeProjectSubLineStatus(record.status),
  };
}

function getSubLineStatusClassName(status: ProjectSubLineStatus) {
  const classNameByStatus: Record<ProjectSubLineStatus, string> = {
    未处理: "project-subline__status--pending",
    设计中: "project-subline__status--designing",
    待评审: "project-subline__status--review",
    已下单: "project-subline__status--ordered",
  };

  return `project-subline__status ${classNameByStatus[status]}`;
}

export function ProjectSheetPage() {
  const { isZh } = useI18n();
  const [records, setRecords] = useState<ProjectRecord[]>(loadProjectDraftRecords);
  const [detailState, setDetailState] = useState<ProjectDetailState | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [currentFileName, setCurrentFileName] = useState<string | null>(
    projectFileManager.getCurrentFileName()
  );
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const recordCount = records.length;
  const subLineCount = useMemo(
    () => records.reduce((total, record) => total + record.subLines.length, 0),
    [records]
  );
  const projectNameEntries = useMemo(() => getAllProjectNames(records), [records]);
  const projectNames = useMemo(
    () => new Set(projectNameEntries.map(({ projectName }) => projectName)),
    [projectNameEntries]
  );

  useEffect(() => {
    saveProjectDraftRecords(records);
  }, [records]);

  const getOpenErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";

    if (message === "Unsupported project file type.") {
      return isZh ? "仅支持 .project 项目文件。" : "Only .project files are supported.";
    }

    if (message === "Project file is too large.") {
      return isZh ? "项目文件过大，无法打开。" : "The project file is too large to open.";
    }

    if (message.toLowerCase().includes("invalid")) {
      return isZh ? "项目文件已损坏或格式不正确。" : "The project file is invalid or damaged.";
    }

    return isZh ? "打开项目文件失败。" : "Failed to open the project file.";
  };

  const getSaveErrorMessage = () => (isZh ? "保存项目文件失败。" : "Failed to save the project file.");

  const confirmDiscardUnsavedChanges = () =>
    !dirty ||
    window.confirm(
      isZh
        ? "当前项目文件有未保存修改，继续会丢失这些修改。是否继续？"
        : "The current project file has unsaved changes. Continue and discard them?"
    );

  const replaceRecords = (nextRecords: ProjectRecord[], shouldMarkDirty: boolean) => {
    setRecords(sanitizeProjectRecords(nextRecords));
    setDirty(shouldMarkDirty);
  };

  const handleNewProjectFile = () => {
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    projectFileManager.reset();
    setCurrentFileName(null);
    setFileStatus(isZh ? "已新建项目文件。" : "New project file created.");
    setDetailState(null);
    setExpandedProjectIds(new Set());
    replaceRecords([], false);
  };

  const handleOpenProjectFile = async () => {
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    try {
      setFileStatus(isZh ? "正在打开..." : "Opening...");
      const openedRecords = await projectFileManager.openProjectFile();
      if (!openedRecords) {
        setFileStatus(null);
        return;
      }

      setDetailState(null);
      setExpandedProjectIds(new Set());
      replaceRecords(openedRecords, false);
      setCurrentFileName(projectFileManager.getCurrentFileName());
      setFileStatus(isZh ? "项目文件已打开。" : "Project file opened.");
    } catch (error) {
      setFileStatus(getOpenErrorMessage(error));
    }
  };

  const handleSaveProjectFileAs = async () => {
    try {
      setFileStatus(isZh ? "正在保存..." : "Saving...");
      const fileName = await projectFileManager.saveProjectFileAs(records);
      if (!fileName) {
        setFileStatus(null);
        return false;
      }

      setCurrentFileName(fileName);
      setDirty(false);
      setFileStatus(isZh ? "项目文件已保存。" : "Project file saved.");
      return true;
    } catch {
      setFileStatus(getSaveErrorMessage());
      return false;
    }
  };

  const handleSaveProjectFile = async () => {
    if (!currentFileName) {
      return await handleSaveProjectFileAs();
    }

    try {
      setFileStatus(isZh ? "正在保存..." : "Saving...");
      const saved = await projectFileManager.saveProjectFile(records);
      if (!saved) {
        return await handleSaveProjectFileAs();
      }

      setDirty(false);
      setFileStatus(isZh ? "项目文件已保存。" : "Project file saved.");
      return true;
    } catch {
      setFileStatus(getSaveErrorMessage());
      return false;
    }
  };

  const openCreateDetail = () => {
    setDetailState({
      mode: "create",
      lineType: "project",
      record: createProjectRecord(),
      error: "",
    });
  };

  const openEditDetail = (record: ProjectRecord) => {
    setDetailState({
      mode: "edit",
      lineType: "project",
      record: { ...record },
      error: "",
    });
  };

  const openCreateSubLineDetail = (parentId: string) => {
    setDetailState({
      mode: "create",
      lineType: "subLine",
      parentId,
      record: createProjectSubLine(),
      error: "",
    });
  };

  const openEditSubLineDetail = (parentId: string, subLine: ProjectSubLine) => {
    setDetailState({
      mode: "edit",
      lineType: "subLine",
      parentId,
      record: { ...subLine },
      error: "",
    });
  };

  const closeDetail = () => {
    setDetailState(null);
  };

  const toggleProjectExpanded = (recordId: string) => {
    setExpandedProjectIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(recordId)) {
        nextIds.delete(recordId);
      } else {
        nextIds.add(recordId);
      }

      return nextIds;
    });
  };

  const updateDetailRecord = (field: ProjectRecordField, value: string) => {
    setDetailState((currentState) =>
      currentState?.lineType === "project"
        ? {
            ...currentState,
            error: "",
            record: {
              ...currentState.record,
              [field]: value,
            },
          }
        : currentState
    );
  };

  const updateSubLineDetailRecord = (field: keyof Omit<ProjectSubLine, "id">, value: string) => {
    setDetailState((currentState) =>
      currentState?.lineType === "subLine"
        ? {
            ...currentState,
            error: "",
            record: {
              ...currentState.record,
              [field]: value,
            },
          }
        : currentState
    );
  };

  const saveDetailRecord = () => {
    if (!detailState) {
      return;
    }

    if (detailState.lineType === "subLine") {
      const savedSubLine = createSavedProjectSubLine(detailState.record);

      setRecords((currentRecords) =>
        sanitizeProjectRecords(
          currentRecords.map((record) => {
            if (record.id !== detailState.parentId) {
              return record;
            }

            if (detailState.mode === "create") {
              return { ...record, subLines: [...record.subLines, savedSubLine] };
            }

            return {
              ...record,
              subLines: record.subLines.map((subLine) =>
                subLine.id === savedSubLine.id ? savedSubLine : subLine
              ),
            };
          })
        )
      );
      setExpandedProjectIds((currentIds) => new Set(currentIds).add(detailState.parentId));
      setDirty(true);
      setDetailState(null);
      return;
    }

    const projectName = normalizeProjectName(detailState.record.projectName);
    if (!projectName) {
      setDetailState((currentState) =>
        currentState
          ? {
              ...currentState,
              error: isZh ? "项目名称不能为空。" : "Project name is required.",
            }
          : currentState
      );
      return;
    }

    const isDuplicateProjectName = projectNameEntries.some(
      (entry) => entry.id !== detailState.record.id && entry.projectName === projectName
    );
    if (isDuplicateProjectName || (detailState.mode === "create" && projectNames.has(projectName))) {
      setDetailState((currentState) =>
        currentState
          ? {
              ...currentState,
              error: isZh ? "项目名称已存在，请使用唯一名称。" : "Project name already exists.",
            }
          : currentState
      );
      return;
    }

    const savedLine = createSavedProjectLine(detailState.record, projectName);

    setRecords((currentRecords) => {
      if (detailState.mode === "create") {
        return sanitizeProjectRecords([...currentRecords, { ...savedLine, subLines: [] }]);
      }

      return sanitizeProjectRecords(
        currentRecords.map((record) =>
          record.id === savedLine.id ? { ...record, ...savedLine } : record
        )
      );
    });
    setDirty(true);
    setDetailState(null);
  };

  const removeRecord = (recordId: string) => {
    setRecords((currentRecords) => currentRecords.filter((record) => record.id !== recordId));
    setExpandedProjectIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(recordId);
      return nextIds;
    });
    setDirty(true);
  };

  const removeSubLine = (parentId: string, subLineId: string) => {
    setRecords((currentRecords) =>
      sanitizeProjectRecords(
        currentRecords.map((record) =>
          record.id === parentId
            ? { ...record, subLines: record.subLines.filter((subLine) => subLine.id !== subLineId) }
            : record
        )
      )
    );
    setDirty(true);
  };

  const detailTitle = (() => {
    if (detailState?.lineType === "subLine") {
      return detailState.mode === "edit"
        ? isZh
          ? "编辑子行详情"
          : "Edit Subline"
        : isZh
          ? "新增子行详情"
          : "New Subline";
    }

    return detailState?.mode === "edit"
      ? isZh
        ? "编辑项目详情"
        : "Edit Project"
      : isZh
        ? "新增项目详情"
        : "New Project";
  })();

  return (
    <section className="project-sheet-page" aria-label={isZh ? "项目管理表格" : "Project management table"}>
      <header className="project-sheet-page__header">
        <div className="project-sheet-page__title-group">
          <h1>{isZh ? "项目管理" : "Project Management"}</h1>
          <p>{isZh ? "按合同与项目维度维护项目管理信息。" : "Manage project records by contract and project."}</p>
        </div>
        <div className="project-sheet-page__header-actions">
          <div className="project-file-actions" aria-label={isZh ? "项目文件操作" : "Project file actions"}>
            <button
              className="project-file-action-button"
              type="button"
              aria-label={isZh ? "新建项目文件" : "New .project file"}
              title={isZh ? "新建项目文件" : "New .project file"}
              onClick={handleNewProjectFile}
            >
              <FilePlus size={15} />
              <span>{isZh ? "新建" : "New"}</span>
            </button>
            <button
              className="project-file-action-button"
              type="button"
              aria-label={isZh ? "打开 Project 文件" : "Open .project file"}
              title={isZh ? "打开 Project 文件" : "Open .project file"}
              onClick={() => void handleOpenProjectFile()}
            >
              <FolderOpen size={15} />
              <span>{isZh ? "打开" : "Open"}</span>
            </button>
            <button
              className="project-file-action-button"
              type="button"
              aria-label={isZh ? "保存到当前项目文件" : "Save current .project file"}
              title={isZh ? "保存到当前项目文件" : "Save current .project file"}
              onClick={() => void handleSaveProjectFile()}
            >
              <Save size={15} />
              <span>{isZh ? "保存" : "Save"}</span>
            </button>
            <button
              className="project-file-action-button"
              type="button"
              aria-label={isZh ? "另存为项目文件" : "Save as .project file"}
              title={isZh ? "另存为项目文件" : "Save as .project file"}
              onClick={() => void handleSaveProjectFileAs()}
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
          <button className="project-sheet-page__add-button" type="button" onClick={openCreateDetail}>
            <Plus size={16} />
            <span>{isZh ? "新增项目" : "New project"}</span>
          </button>
        </div>
      </header>
      <div className="project-file-status" role="status">
        <span>{currentFileName ?? (isZh ? "未选择项目文件" : "No project file selected")}</span>
        {dirty ? <strong>{isZh ? "未保存" : "Unsaved"}</strong> : null}
        {fileStatus ? <em>{fileStatus}</em> : null}
      </div>

      <div className="project-sheet" role="region" aria-label={isZh ? "项目管理表" : "Project management table"}>
        <table>
          <colgroup>
            <col className="project-sheet__index-col" />
            {PROJECT_COLUMNS.map((column) => (
              <col key={column.field} style={{ width: column.width }} />
            ))}
            <col className="project-sheet__actions-col" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">#</th>
              {PROJECT_COLUMNS.map((column) => (
                <th key={column.field} scope="col">
                  {isZh ? column.labelZh : column.labelEn}
                </th>
              ))}
              <th scope="col">{isZh ? "操作" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, rowIndex) => {
              const hasSubLines = record.subLines.length > 0;
              const isExpanded = expandedProjectIds.has(record.id);

              return (
                <Fragment key={record.id}>
                  <tr>
                    <th scope="row">
                      <div className="project-sheet__tree-cell">
                        {hasSubLines ? (
                          <button
                            className="project-sheet__tree-toggle"
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? isZh
                                  ? "折叠子行"
                                  : "Collapse sublines"
                                : isZh
                                  ? "展开子行"
                                  : "Expand sublines"
                            }
                            title={
                              isExpanded
                                ? isZh
                                  ? "折叠子行"
                                  : "Collapse sublines"
                                : isZh
                                  ? "展开子行"
                                  : "Expand sublines"
                            }
                            onClick={() => toggleProjectExpanded(record.id)}
                          >
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        ) : (
                          <span className="project-sheet__tree-spacer" aria-hidden="true" />
                        )}
                        <span className="project-sheet__tree-index">{rowIndex + 1}</span>
                      </div>
                    </th>
                    {PROJECT_COLUMNS.map((column) => (
                      <td key={column.field}>{renderProjectCell(record, column.field, isZh)}</td>
                    ))}
                    <td>
                      <div className="project-sheet__row-actions">
                        <button
                          className="project-sheet__row-action"
                          type="button"
                          aria-label={isZh ? "新增子行" : "New subline"}
                          title={isZh ? "新增子行" : "New subline"}
                          onClick={() => openCreateSubLineDetail(record.id)}
                        >
                          <Plus size={15} />
                        </button>
                        <button
                          className="project-sheet__row-action"
                          type="button"
                          aria-label={isZh ? "编辑项目详情" : "Edit project details"}
                          title={isZh ? "编辑项目详情" : "Edit project details"}
                          onClick={() => openEditDetail(record)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="project-sheet__row-action project-sheet__row-action--danger"
                          type="button"
                          aria-label={isZh ? "删除项目" : "Delete project"}
                          title={isZh ? "删除项目" : "Delete project"}
                          onClick={() => removeRecord(record.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded
                    ? record.subLines.map((subLine, subLineIndex) => (
                        <tr className="project-sheet__sub-row" key={subLine.id}>
                          <th scope="row">
                            <div className="project-sheet__tree-cell project-sheet__tree-cell--sub">
                              <span className="project-sheet__tree-spacer" aria-hidden="true" />
                              <span className="project-sheet__tree-index">
                                {rowIndex + 1}.{subLineIndex + 1}
                              </span>
                            </div>
                          </th>
                          <td colSpan={PROJECT_COLUMNS.length}>
                            <div className="project-subline">
                              <span className="project-subline__label">
                                {isZh ? "进度占比" : "Progress share"}
                              </span>
                              <div className="project-subline__progress">
                                {renderProgressBar(
                                  subLine.progressRatio,
                                  isZh ? "子行进度占比" : "Subline progress share"
                                )}
                              </div>
                              <span className="project-subline__label">
                                {isZh ? "状态" : "Status"}
                              </span>
                              <span className={getSubLineStatusClassName(subLine.status)}>
                                {subLine.status}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="project-sheet__row-actions">
                              <button
                                className="project-sheet__row-action"
                                type="button"
                                aria-label={isZh ? "编辑子行详情" : "Edit subline details"}
                                title={isZh ? "编辑子行详情" : "Edit subline details"}
                                onClick={() => openEditSubLineDetail(record.id, subLine)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="project-sheet__row-action project-sheet__row-action--danger"
                                type="button"
                                aria-label={isZh ? "删除子行" : "Delete subline"}
                                title={isZh ? "删除子行" : "Delete subline"}
                                onClick={() => removeSubLine(record.id, subLine.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {records.length === 0 ? (
          <div className="project-sheet__empty" role="status">
            {isZh ? "暂无项目" : "No projects yet"}
          </div>
        ) : null}
      </div>

      {detailState ? (
        <div className="project-detail-overlay" role="presentation">
          <section
            className="project-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-detail-title"
          >
            <header className="project-detail-panel__header">
              <h2 id="project-detail-title">{detailTitle}</h2>
              <button
                className="project-detail-panel__icon-button"
                type="button"
                aria-label={isZh ? "关闭项目详情" : "Close project details"}
                title={isZh ? "关闭项目详情" : "Close project details"}
                onClick={closeDetail}
              >
                <X size={18} />
              </button>
            </header>
            <form
              className="project-detail-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveDetailRecord();
              }}
            >
              {detailState.lineType === "project" ? (
                <div className="project-detail-form__grid">
                  {PROJECT_COLUMNS.map((column) => {
                    const label = isZh ? column.labelZh : column.labelEn;
                    const value = getFieldValue(detailState.record, column.field);

                    return (
                      <label key={column.field} className="project-detail-form__field">
                        <span>
                          {label}
                          {column.field === "projectName" ? <strong aria-hidden="true">*</strong> : null}
                        </span>
                        {column.field === "projectLevel" ? (
                          <select
                            value={value}
                            onChange={(event) => updateDetailRecord(column.field, event.target.value)}
                          >
                            <option value="">{isZh ? "未定" : "Unset"}</option>
                            {PROJECT_LEVEL_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : column.field === "progress" ? (
                          <div className="project-detail-form__progress-control">
                            <input
                              inputMode="numeric"
                              min={0}
                              max={100}
                              step={1}
                              type="number"
                              value={value}
                              onChange={(event) => updateDetailRecord(column.field, event.target.value)}
                            />
                            <span aria-hidden="true">%</span>
                          </div>
                        ) : (
                          <input
                            inputMode={column.inputMode ?? "text"}
                            value={value}
                            onChange={(event) => updateDetailRecord(column.field, event.target.value)}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="project-detail-form__grid project-detail-form__grid--subline">
                  <label className="project-detail-form__field">
                    <span>{isZh ? "进度占比" : "Progress share"}</span>
                    <div className="project-detail-form__progress-control">
                      <input
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        type="number"
                        value={detailState.record.progressRatio}
                        onChange={(event) => updateSubLineDetailRecord("progressRatio", event.target.value)}
                      />
                      <span aria-hidden="true">%</span>
                    </div>
                  </label>
                  <label className="project-detail-form__field">
                    <span>{isZh ? "状态" : "Status"}</span>
                    <select
                      value={detailState.record.status}
                      onChange={(event) => updateSubLineDetailRecord("status", event.target.value)}
                    >
                      {PROJECT_SUB_LINE_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {detailState.error ? (
                <div className="project-detail-form__error" role="alert">
                  {detailState.error}
                </div>
              ) : null}
              <footer className="project-detail-form__actions">
                <button className="project-detail-form__secondary-button" type="button" onClick={closeDetail}>
                  {isZh ? "取消" : "Cancel"}
                </button>
                <button className="project-detail-form__primary-button" type="submit">
                  <Save size={16} />
                  <span>{isZh ? "保存" : "Save"}</span>
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
