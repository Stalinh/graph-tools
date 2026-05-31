import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FilePlus,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  SaveAll,
  Trash2,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import "./ProjectSheetPage.css";
import { PROJECT_COLUMNS, PROJECT_LEVEL_OPTIONS, PROJECT_SUB_LINE_STATUS_OPTIONS } from "./projectConfig";
import { projectFileManager } from "./projectFileSystem";
import {
  createDefaultProjectSubLines,
  createProjectRecord,
  createProjectSubLine,
  ensureProjectRecordsDefaultSubLines,
  normalizeProjectLineNo,
  normalizeProjectName,
  normalizeProjectProgress,
  normalizeProjectSubLineTaskName,
  normalizeProjectSubLineStatus,
  sanitizeProjectRecords,
} from "./projectModel";
import {
  clearProjectDraftRecords,
  loadProjectDraftState,
  saveProjectDraftRecords,
} from "./projectStorage";
import type {
  ProjectLine,
  ProjectRecord,
  ProjectRecordField,
  ProjectSubLine,
  ProjectSubLineStatus,
} from "./projectTypes";

const PROJECT_SUB_LINE_TRAILING_COL_SPAN = PROJECT_COLUMNS.length - 5;
type ProjectSubLineField = keyof Omit<ProjectSubLine, "id">;

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

function createSavedProjectLine(record: ProjectLine, projectName: string): ProjectLine {
  return {
    id: record.id,
    lineNo: normalizeProjectLineNo(record.lineNo),
    contractNo: record.contractNo,
    detailDesign: record.detailDesign,
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
    lineNo: normalizeProjectLineNo(record.lineNo),
    taskName: normalizeProjectSubLineTaskName(record.taskName),
    status: normalizeProjectSubLineStatus(record.status),
    detailDesign: record.detailDesign,
  };
}

function getSubLineStatusClassName(status: ProjectSubLineStatus) {
  const classNameByStatus: Record<ProjectSubLineStatus, string> = {
    未处理: "project-subline__status--unprocessed",
    待处理: "project-subline__status--todo",
    等待中: "project-subline__status--waiting",
    "已提资/已完成": "project-subline__status--done",
  };

  return `project-subline__status ${classNameByStatus[status]}`;
}

function getSubLineStatusToneClassName(status: string) {
  const classNameByStatus: Record<ProjectSubLineStatus, string> = {
    未处理: "project-sheet__custom-select-tone--unprocessed",
    待处理: "project-sheet__custom-select-tone--todo",
    等待中: "project-sheet__custom-select-tone--waiting",
    "已提资/已完成": "project-sheet__custom-select-tone--done",
  };

  return classNameByStatus[normalizeProjectSubLineStatus(status)];
}

interface ProjectInlineSelectOption {
  value: string;
  label: string;
}

interface ProjectInlineSelectProps {
  ariaLabel: string;
  className?: string;
  getOptionToneClassName?: (value: string) => string;
  onChange: (value: string) => void;
  options: ProjectInlineSelectOption[];
  value: string;
}

function ProjectInlineSelect({
  ariaLabel,
  className = "",
  getOptionToneClassName,
  onChange,
  options,
  value,
}: ProjectInlineSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || value || "—";
  const selectedToneClassName = getOptionToneClassName?.(value) ?? "";

  return (
    <div
      className={`project-sheet__custom-select ${open ? "is-open" : ""} ${className}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        className={`project-sheet__custom-select-button ${selectedToneClassName}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        {selectedToneClassName ? (
          <span
            className={`project-sheet__custom-select-indicator ${selectedToneClassName}`}
            aria-hidden="true"
          />
        ) : null}
        <span className="project-sheet__custom-select-value">{selectedLabel}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div className="project-sheet__custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const optionToneClassName = getOptionToneClassName?.(option.value) ?? "";
            const selected = option.value === value;

            return (
              <button
                className={`project-sheet__custom-select-option ${optionToneClassName} ${
                  selected ? "is-selected" : ""
                }`}
                key={option.value || "__empty"}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {optionToneClassName ? (
                  <span
                    className={`project-sheet__custom-select-indicator ${optionToneClassName}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span aria-hidden="true" />
                )}
                <span>{option.label}</span>
                {selected ? <Check size={13} aria-hidden="true" /> : <span aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectSheetPage() {
  const { isZh } = useI18n();
  const [initialDraftState] = useState(loadProjectDraftState);
  const skipInitialDraftSaveRef = useRef(initialDraftState.hasInvalidDraftData);
  const [records, setRecords] = useState<ProjectRecord[]>(initialDraftState.records);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [currentFileName, setCurrentFileName] = useState<string | null>(
    projectFileManager.getCurrentFileName()
  );
  const [fileStatus, setFileStatus] = useState<string | null>(() => {
    if (initialDraftState.hasInvalidDraftData) {
      return isZh
        ? "本地草稿包含无法恢复的数据，已保留可恢复部分。"
        : "The local draft contains data that could not be restored. Recoverable records were kept.";
    }
    if (initialDraftState.restoredDraft) {
      return isZh ? "已恢复本地草稿。" : "Local draft restored.";
    }
    return null;
  });
  const [dirty, setDirty] = useState(initialDraftState.restoredDraft);
  const recordCount = records.length;
  const subLineCount = useMemo(
    () => records.reduce((total, record) => total + record.subLines.length, 0),
    [records]
  );

  useEffect(() => {
    if (skipInitialDraftSaveRef.current) {
      skipInitialDraftSaveRef.current = false;
      return;
    }

    if (dirty) {
      saveProjectDraftRecords(records);
    }
  }, [dirty, records]);

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
    setExpandedProjectIds(new Set());
    replaceRecords([], false);
    clearProjectDraftRecords();
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

      const openedRecordsWithDefaultSubLines = ensureProjectRecordsDefaultSubLines(openedRecords);
      setExpandedProjectIds(new Set());
      replaceRecords(
        openedRecordsWithDefaultSubLines.records,
        openedRecordsWithDefaultSubLines.addedSubLineCount > 0
      );
      setCurrentFileName(projectFileManager.getCurrentFileName());
      clearProjectDraftRecords();
      setFileStatus(
        openedRecordsWithDefaultSubLines.addedSubLineCount > 0
          ? isZh
            ? `项目文件已打开，并自动补齐 ${openedRecordsWithDefaultSubLines.addedSubLineCount} 条子行。`
            : `Project file opened and ${openedRecordsWithDefaultSubLines.addedSubLineCount} sublines were added.`
          : isZh
            ? "项目文件已打开。"
            : "Project file opened."
      );
    } catch (error) {
      setFileStatus(getOpenErrorMessage(error));
    }
  };

  const getUniqueProjectName = (
    projectName: string,
    recordId: string,
    sourceRecords: ProjectRecord[] = records
  ) => {
    const fallbackProjectName = isZh ? "未命名项目" : "Untitled Project";
    const baseName = normalizeProjectName(projectName) || fallbackProjectName;
    const knownProjectNames = new Set(
      sourceRecords
        .filter((record) => record.id !== recordId)
        .map((record) => normalizeProjectName(record.projectName))
        .filter(Boolean)
    );
    let candidate = baseName;
    let suffix = 2;

    while (knownProjectNames.has(candidate)) {
      candidate = `${baseName} ${suffix}`;
      suffix += 1;
    }

    return candidate;
  };

  const normalizeRecordsForPersistence = (sourceRecords: ProjectRecord[]) => {
    const usedProjectNames = new Set<string>();
    const fallbackProjectName = isZh ? "未命名项目" : "Untitled Project";

    return sanitizeProjectRecords(
      sourceRecords.map((record) => {
        const baseName = normalizeProjectName(record.projectName) || fallbackProjectName;
        let projectName = baseName;
        let suffix = 2;

        while (usedProjectNames.has(projectName)) {
          projectName = `${baseName} ${suffix}`;
          suffix += 1;
        }

        usedProjectNames.add(projectName);

        return {
          ...createSavedProjectLine(record, projectName),
          subLines: record.subLines
            .map(createSavedProjectSubLine)
            .filter((subLine) => normalizeProjectSubLineTaskName(subLine.taskName)),
        };
      })
    );
  };

  const handleSaveProjectFileAs = async () => {
    const recordsToSave = normalizeRecordsForPersistence(records);
    setRecords(recordsToSave);

    try {
      setFileStatus(isZh ? "正在保存..." : "Saving...");
      const fileName = await projectFileManager.saveProjectFileAs(recordsToSave);
      if (!fileName) {
        setFileStatus(null);
        return false;
      }

      setCurrentFileName(fileName);
      setDirty(false);
      clearProjectDraftRecords();
      setFileStatus(isZh ? "项目文件已保存。" : "Project file saved.");
      return true;
    } catch {
      setFileStatus(getSaveErrorMessage());
      return false;
    }
  };

  const handleSaveProjectFile = async () => {
    const recordsToSave = normalizeRecordsForPersistence(records);
    setRecords(recordsToSave);

    if (!currentFileName) {
      return await handleSaveProjectFileAs();
    }

    try {
      setFileStatus(isZh ? "正在保存..." : "Saving...");
      const saved = await projectFileManager.saveProjectFile(recordsToSave);
      if (!saved) {
        return await handleSaveProjectFileAs();
      }

      setDirty(false);
      clearProjectDraftRecords();
      setFileStatus(isZh ? "项目文件已保存。" : "Project file saved.");
      return true;
    } catch {
      setFileStatus(getSaveErrorMessage());
      return false;
    }
  };

  const enterReadMode = () => {
    setRecords((currentRecords) => normalizeRecordsForPersistence(currentRecords));
    setIsEditMode(false);
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

  const addProjectRecord = () => {
    if (!isEditMode) {
      return;
    }

    const projectName = getUniqueProjectName(isZh ? "新项目" : "New Project", "");
    const nextRecord = createProjectRecord({
      projectName,
      subLines: createDefaultProjectSubLines(),
    });

    setRecords((currentRecords) => [...currentRecords, nextRecord]);
    setExpandedProjectIds((currentIds) => new Set(currentIds).add(nextRecord.id));
    setDirty(true);
  };

  const addSubLineRecord = (parentId: string) => {
    if (!isEditMode) {
      return;
    }

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== parentId) {
          return record;
        }

        const baseTaskName = isZh ? "新任务" : "New Task";
        const knownTaskNames = new Set(
          record.subLines.map((subLine) => normalizeProjectSubLineTaskName(subLine.taskName))
        );
        let taskName = baseTaskName;
        let suffix = 2;

        while (knownTaskNames.has(taskName)) {
          taskName = `${baseTaskName} ${suffix}`;
          suffix += 1;
        }

        return {
          ...record,
          subLines: [...record.subLines, createProjectSubLine({ taskName })],
        };
      })
    );
    setExpandedProjectIds((currentIds) => new Set(currentIds).add(parentId));
    setDirty(true);
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
      currentRecords.map((record) =>
        record.id === parentId
          ? { ...record, subLines: record.subLines.filter((subLine) => subLine.id !== subLineId) }
          : record
      )
    );
    setDirty(true);
  };

  const updateProjectField = (recordId: string, field: ProjectRecordField, value: string) => {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === recordId
          ? {
              ...record,
              [field]: value,
            }
          : record
      )
    );
    setDirty(true);
  };

  const commitProjectField = (recordId: string, field: ProjectRecordField) => {
    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== recordId) {
          return record;
        }

        if (field === "projectName") {
          return { ...record, projectName: getUniqueProjectName(record.projectName, recordId, currentRecords) };
        }

        if (field === "lineNo") {
          return { ...record, lineNo: normalizeProjectLineNo(record.lineNo) };
        }

        if (field === "progress") {
          return { ...record, progress: normalizeProjectProgress(record.progress) };
        }

        return record;
      })
    );
  };

  const updateSubLineField = (
    parentId: string,
    subLineId: string,
    field: ProjectSubLineField,
    value: string
  ) => {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === parentId
          ? {
              ...record,
              subLines: record.subLines.map((subLine) =>
                subLine.id === subLineId
                  ? {
                      ...subLine,
                      [field]: value,
                    }
                  : subLine
              ),
            }
          : record
      )
    );
    setDirty(true);
  };

  const commitSubLineField = (parentId: string, subLineId: string, field: ProjectSubLineField) => {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === parentId
          ? {
              ...record,
              subLines: record.subLines.map((subLine) => {
                if (subLine.id !== subLineId) {
                  return subLine;
                }

                if (field === "taskName") {
                  return {
                    ...subLine,
                    taskName:
                      normalizeProjectSubLineTaskName(subLine.taskName) ||
                      (isZh ? "未命名任务" : "Untitled Task"),
                  };
                }

                if (field === "lineNo") {
                  return { ...subLine, lineNo: normalizeProjectLineNo(subLine.lineNo) };
                }

                if (field === "status") {
                  return { ...subLine, status: normalizeProjectSubLineStatus(subLine.status) };
                }

                return subLine;
              }),
            }
          : record
      )
    );
  };

  const renderProjectEditCell = (record: ProjectRecord, field: ProjectRecordField) => {
    const column = PROJECT_COLUMNS.find((currentColumn) => currentColumn.field === field);
    const label = column ? (isZh ? column.labelZh : column.labelEn) : isZh ? "编号" : "No.";
    const value = getFieldValue(record, field);

    if (field === "projectLevel") {
      return (
        <ProjectInlineSelect
          ariaLabel={label}
          value={value}
          options={[
            { value: "", label: isZh ? "未定" : "Unset" },
            ...PROJECT_LEVEL_OPTIONS.map((option) => ({ value: option, label: option })),
          ]}
          onChange={(nextValue) => updateProjectField(record.id, field, nextValue)}
        />
      );
    }

    if (field === "progress") {
      return (
        <div className="project-sheet__inline-progress-control">
          <input
            className="project-sheet__inline-input"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            type="number"
            aria-label={label}
            value={value}
            onBlur={() => commitProjectField(record.id, field)}
            onChange={(event) => updateProjectField(record.id, field, event.target.value)}
          />
          <span aria-hidden="true">%</span>
        </div>
      );
    }

    return (
      <input
        className="project-sheet__inline-input"
        inputMode={column?.inputMode ?? "text"}
        aria-label={label}
        value={value}
        onBlur={() => commitProjectField(record.id, field)}
        onChange={(event) => updateProjectField(record.id, field, event.target.value)}
      />
    );
  };

  return (
    <section className="project-sheet-page" aria-label={isZh ? "项目管理表格" : "Project management table"}>
      <header className="project-sheet-page__header">
        <div className="project-sheet-page__title-group">
          <h1>{isZh ? "项目管理" : "Project Management"}</h1>
          <p>{isZh ? "按合同与项目维度维护项目管理信息。" : "Manage project records by contract and project."}</p>
        </div>
        <div className="project-sheet-page__header-actions">
          <div className="project-mode-toggle" aria-label={isZh ? "编辑模式切换" : "Edit mode toggle"}>
            <button
              className={`project-mode-toggle__button ${!isEditMode ? "is-active" : ""}`}
              type="button"
              aria-pressed={!isEditMode}
              onClick={enterReadMode}
            >
              <Eye size={15} />
              <span>{isZh ? "阅读" : "Read"}</span>
            </button>
            <button
              className={`project-mode-toggle__button ${isEditMode ? "is-active" : ""}`}
              type="button"
              aria-pressed={isEditMode}
              onClick={() => setIsEditMode(true)}
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
          <button
            className="project-sheet-page__add-button"
            type="button"
            disabled={!isEditMode}
            onClick={addProjectRecord}
          >
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
              <th scope="col">{isZh ? "编号" : "No."}</th>
              {PROJECT_COLUMNS.map((column) => (
                <th key={column.field} scope="col">
                  {isZh ? column.labelZh : column.labelEn}
                </th>
              ))}
              <th scope="col">{isZh ? "操作" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const hasSubLines = record.subLines.length > 0;
              const isExpanded = expandedProjectIds.has(record.id);

              return (
                <Fragment key={record.id}>
                  <tr>
                    <th
                      className={`project-sheet__tree-header ${
                        hasSubLines ? "project-sheet__tree-header--toggleable" : ""
                      }`}
                      scope="row"
                    >
                      {isEditMode ? (
                        <div className="project-sheet__tree-cell project-sheet__tree-cell--edit">
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
                          <span className="project-sheet__tree-index" title={record.lineNo}>
                            {record.lineNo}
                          </span>
                        </div>
                      ) : hasSubLines ? (
                        <button
                          className="project-sheet__tree-cell project-sheet__tree-cell--toggle-button"
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
                          <span className="project-sheet__tree-toggle" aria-hidden="true">
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </span>
                          <span className="project-sheet__tree-index" title={record.lineNo}>
                            {record.lineNo}
                          </span>
                        </button>
                      ) : (
                        <div className="project-sheet__tree-cell">
                          <span className="project-sheet__tree-spacer" aria-hidden="true" />
                          <span className="project-sheet__tree-index" title={record.lineNo}>
                            {record.lineNo}
                          </span>
                        </div>
                      )}
                    </th>
                    {PROJECT_COLUMNS.map((column) => (
                      <td key={column.field}>
                        {isEditMode
                          ? renderProjectEditCell(record, column.field)
                          : renderProjectCell(record, column.field, isZh)}
                      </td>
                    ))}
                    <td>
                      <div className="project-sheet__row-actions">
                        {isEditMode ? (
                          <>
                            <button
                              className="project-sheet__row-action"
                              type="button"
                              aria-label={isZh ? "新增子行" : "New subline"}
                              title={isZh ? "新增子行" : "New subline"}
                              onClick={() => addSubLineRecord(record.id)}
                            >
                              <Plus size={15} />
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
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {isExpanded
                    ? record.subLines.map((subLine, subLineIndex) => (
                        <tr
                          className={`project-sheet__sub-row ${
                            subLineIndex === record.subLines.length - 1 ? "project-sheet__sub-row--last" : ""
                          }`}
                          key={subLine.id}
                        >
                          <th scope="row">
                            <div className="project-sheet__tree-cell project-sheet__tree-cell--sub">
                              <span className="project-sheet__tree-spacer" aria-hidden="true" />
                              <span className="project-sheet__tree-index" title={subLine.lineNo}>
                                {subLine.lineNo}
                              </span>
                            </div>
                          </th>
                          <td className="project-sheet__subline-task-cell">
                            <span className="project-subline__task" title={subLine.taskName}>
                              {subLine.taskName}
                            </span>
                          </td>
                          <td className="project-sheet__subline-status-cell">
                            {isEditMode ? (
                              <ProjectInlineSelect
                                className="project-sheet__custom-select--status"
                                ariaLabel={isZh ? "子行状态" : "Subline status"}
                                value={subLine.status}
                                getOptionToneClassName={getSubLineStatusToneClassName}
                                options={PROJECT_SUB_LINE_STATUS_OPTIONS.map((status) => ({
                                  value: status,
                                  label: status,
                                }))}
                                onChange={(nextValue) =>
                                  updateSubLineField(record.id, subLine.id, "status", nextValue)
                                }
                              />
                            ) : (
                              <span className={getSubLineStatusClassName(subLine.status)}>
                                {subLine.status}
                              </span>
                            )}
                          </td>
                          <td className="project-sheet__subline-empty-cell" aria-hidden="true" />
                          <td className="project-sheet__subline-empty-cell" aria-hidden="true" />
                          <td className="project-sheet__subline-detail-design-cell">
                            {isEditMode ? (
                              <input
                                className="project-sheet__inline-input"
                                aria-label={isZh ? "细化设计" : "Detail design"}
                                value={subLine.detailDesign}
                                onChange={(event) =>
                                  updateSubLineField(record.id, subLine.id, "detailDesign", event.target.value)
                                }
                              />
                            ) : (
                              <span className="project-subline__detail-design" title={subLine.detailDesign}>
                                {subLine.detailDesign}
                              </span>
                            )}
                          </td>
                          <td
                            className="project-sheet__subline-empty-cell"
                            colSpan={PROJECT_SUB_LINE_TRAILING_COL_SPAN}
                            aria-hidden="true"
                          />
                          <td>
                            <div className="project-sheet__row-actions">
                              {isEditMode ? (
                                <button
                                  className="project-sheet__row-action project-sheet__row-action--danger"
                                  type="button"
                                  aria-label={isZh ? "删除子行" : "Delete subline"}
                                  title={isZh ? "删除子行" : "Delete subline"}
                                  onClick={() => removeSubLine(record.id, subLine.id)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              ) : null}
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

    </section>
  );
}
