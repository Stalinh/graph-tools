import { useEffect, useMemo, useRef, useState } from "react";
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
  ProjectSubLineField,
} from "./projectTypes";

export interface DroppedProjectFile {
  file: File;
  id: number;
}

interface UseProjectSheetStateOptions {
  droppedProjectFile?: DroppedProjectFile | null;
  isZh: boolean;
  onDroppedProjectFileHandled?: (id: number) => void;
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

export function useProjectSheetState({
  droppedProjectFile = null,
  isZh,
  onDroppedProjectFileHandled,
}: UseProjectSheetStateOptions) {
  const [initialDraftState] = useState(loadProjectDraftState);
  const skipInitialDraftSaveRef = useRef(initialDraftState.hasInvalidDraftData);
  const handledDroppedProjectFileIdRef = useRef<number | null>(null);
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

  const applyOpenedProjectRecords = (
    openedRecords: ProjectRecord[],
    fileName: string | null,
    openedFromDrop = false
  ) => {
    const openedRecordsWithDefaultSubLines = ensureProjectRecordsDefaultSubLines(openedRecords);
    setExpandedProjectIds(new Set());
    replaceRecords(
      openedRecordsWithDefaultSubLines.records,
      openedRecordsWithDefaultSubLines.addedSubLineCount > 0
    );
    setCurrentFileName(fileName);
    clearProjectDraftRecords();
    setFileStatus(
      openedRecordsWithDefaultSubLines.addedSubLineCount > 0
        ? isZh
          ? `项目文件已打开，并自动补齐 ${openedRecordsWithDefaultSubLines.addedSubLineCount} 条子行。`
          : `Project file opened and ${openedRecordsWithDefaultSubLines.addedSubLineCount} sublines were added.`
        : openedFromDrop
          ? isZh
            ? "拖入的项目文件已打开，保存时将另存为。"
            : "Dropped project file opened. Saving will use Save As."
          : isZh
            ? "项目文件已打开。"
            : "Project file opened."
    );
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
      return false;
    }

    try {
      setFileStatus(isZh ? "正在打开..." : "Opening...");
      const openedRecords = await projectFileManager.openProjectFile();
      if (!openedRecords) {
        setFileStatus(null);
        return false;
      }

      applyOpenedProjectRecords(openedRecords, projectFileManager.getCurrentFileName());
      return true;
    } catch (error) {
      setFileStatus(getOpenErrorMessage(error));
      return false;
    }
  };

  const handleDroppedProjectFile = async (file: File) => {
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    try {
      setFileStatus(isZh ? "正在打开..." : "Opening...");
      const openedRecords = await projectFileManager.openDroppedProjectFile(file);
      applyOpenedProjectRecords(openedRecords, file.name, true);
    } catch (error) {
      setFileStatus(getOpenErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!droppedProjectFile) {
      return;
    }
    if (handledDroppedProjectFileIdRef.current === droppedProjectFile.id) {
      return;
    }

    handledDroppedProjectFileIdRef.current = droppedProjectFile.id;
    onDroppedProjectFileHandled?.(droppedProjectFile.id);
    void handleDroppedProjectFile(droppedProjectFile.file);
  }, [droppedProjectFile, onDroppedProjectFileHandled]);

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

  const enterEditMode = () => setIsEditMode(true);

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
          return {
            ...record,
            projectName: getUniqueProjectName(record.projectName, recordId, currentRecords),
          };
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

  return {
    addProjectRecord,
    addSubLineRecord,
    commitProjectField,
    currentFileName,
    dirty,
    enterEditMode,
    enterReadMode,
    expandedProjectIds,
    fileStatus,
    handleNewProjectFile,
    handleOpenProjectFile,
    handleSaveProjectFile,
    handleSaveProjectFileAs,
    isEditMode,
    recordCount,
    records,
    removeRecord,
    removeSubLine,
    subLineCount,
    toggleProjectExpanded,
    updateProjectField,
    updateSubLineField,
  };
}
