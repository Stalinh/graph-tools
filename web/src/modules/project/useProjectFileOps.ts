import { useEffect, useRef } from 'react';
import { projectFileManager } from './projectFileSystem';
import {
  ensureProjectRecordsDefaultSubLines,
  sanitizeProjectRecords,
  sortProjectRecords,
} from './projectModel';
import { normalizeRecordsForPersistence } from './projectPersistence';
import { clearProjectDraftRecords } from './projectStorage';
import type { ProjectRecord } from './projectTypes';
import type { DroppedProjectFile } from './useProjectSheetState';

interface UseProjectFileOpsOptions {
  currentFileName: string | null;
  dirty: boolean;
  droppedProjectFile: DroppedProjectFile | null;
  isZh: boolean;
  records: ProjectRecord[];
  setCurrentFileName: (fileName: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setExpandedProjectIds: (projectIds: Set<string>) => void;
  setFileStatus: (status: string | null) => void;
  setRecords: (records: ProjectRecord[] | ((records: ProjectRecord[]) => ProjectRecord[])) => void;
  onDroppedProjectFileHandled?: (id: number) => void;
}

function getOpenErrorMessage(error: unknown, isZh: boolean) {
  const message = error instanceof Error ? error.message : '';

  if (message === 'Unsupported project file type.') {
    return isZh ? '仅支持 .project 项目文件。' : 'Only .project files are supported.';
  }

  if (message === 'Project file is too large.') {
    return isZh ? '项目文件过大，无法打开。' : 'The project file is too large to open.';
  }

  if (message.toLowerCase().includes('invalid')) {
    return isZh ? '项目文件已损坏或格式不正确。' : 'The project file is invalid or damaged.';
  }

  return isZh ? '打开项目文件失败。' : 'Failed to open the project file.';
}

function getSaveErrorMessage(isZh: boolean) {
  return isZh ? '保存项目文件失败。' : 'Failed to save the project file.';
}

export function useProjectFileOps({
  currentFileName,
  dirty,
  droppedProjectFile,
  isZh,
  records,
  setCurrentFileName,
  setDirty,
  setExpandedProjectIds,
  setFileStatus,
  setRecords,
  onDroppedProjectFileHandled,
}: UseProjectFileOpsOptions) {
  const handledDroppedProjectFileIdRef = useRef<number | null>(null);

  const confirmDiscardUnsavedChanges = () =>
    !dirty ||
    window.confirm(
      isZh
        ? '当前项目文件有未保存修改，继续会丢失这些修改。是否继续？'
        : 'The current project file has unsaved changes. Continue and discard them?'
    );

  const replaceRecords = (nextRecords: ProjectRecord[], shouldMarkDirty: boolean) => {
    setRecords(sortProjectRecords(sanitizeProjectRecords(nextRecords)));
    setDirty(shouldMarkDirty);
  };

  const applyOpenedProjectRecords = (
    openedRecords: ProjectRecord[],
    fileName: string | null,
    openedFromDrop = false
  ) => {
    const openedRecordsWithDefaultSubLines = ensureProjectRecordsDefaultSubLines(openedRecords);
    const hasAutomaticSubLineUpdates =
      openedRecordsWithDefaultSubLines.addedSubLineCount > 0 ||
      openedRecordsWithDefaultSubLines.reorderedSubLineRecordCount > 0;
    setExpandedProjectIds(new Set());
    replaceRecords(openedRecordsWithDefaultSubLines.records, hasAutomaticSubLineUpdates);
    setCurrentFileName(fileName);
    clearProjectDraftRecords();
    setFileStatus(
      openedRecordsWithDefaultSubLines.addedSubLineCount > 0
        ? isZh
          ? `项目文件已打开，并自动补齐 ${openedRecordsWithDefaultSubLines.addedSubLineCount} 条子行。`
          : `Project file opened and ${openedRecordsWithDefaultSubLines.addedSubLineCount} sublines were added.`
        : openedFromDrop
          ? isZh
            ? '拖入的项目文件已打开，保存时将另存为。'
            : 'Dropped project file opened. Saving will use Save As.'
          : openedRecordsWithDefaultSubLines.reorderedSubLineRecordCount > 0
            ? isZh
              ? `项目文件已打开，并自动固定 ${openedRecordsWithDefaultSubLines.reorderedSubLineRecordCount} 个项目的子行顺序。`
              : `Project file opened and subline order was fixed for ${openedRecordsWithDefaultSubLines.reorderedSubLineRecordCount} projects.`
            : isZh
              ? '项目文件已打开。'
              : 'Project file opened.'
    );
  };

  const handleNewProjectFile = () => {
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    projectFileManager.reset();
    setCurrentFileName(null);
    setFileStatus(isZh ? '已新建项目文件。' : 'New project file created.');
    setExpandedProjectIds(new Set());
    replaceRecords([], false);
    clearProjectDraftRecords();
  };

  const handleOpenProjectFile = async () => {
    if (!confirmDiscardUnsavedChanges()) {
      return false;
    }

    try {
      setFileStatus(isZh ? '正在打开...' : 'Opening...');
      const openedRecords = await projectFileManager.openProjectFile();
      if (!openedRecords) {
        setFileStatus(null);
        return false;
      }

      applyOpenedProjectRecords(openedRecords, projectFileManager.getCurrentFileName());
      return true;
    } catch (error) {
      setFileStatus(getOpenErrorMessage(error, isZh));
      return false;
    }
  };

  const handleDroppedProjectFile = async (file: File) => {
    if (!confirmDiscardUnsavedChanges()) {
      return;
    }

    try {
      setFileStatus(isZh ? '正在打开...' : 'Opening...');
      const openedRecords = await projectFileManager.openDroppedProjectFile(file);
      applyOpenedProjectRecords(openedRecords, file.name, true);
    } catch (error) {
      setFileStatus(getOpenErrorMessage(error, isZh));
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

  const handleSaveProjectFileAs = async () => {
    const recordsToSave = normalizeRecordsForPersistence(records, isZh);
    setRecords(recordsToSave);

    try {
      setFileStatus(isZh ? '正在保存...' : 'Saving...');
      const fileName = await projectFileManager.saveProjectFileAs(recordsToSave);
      if (!fileName) {
        setFileStatus(null);
        return false;
      }

      setCurrentFileName(fileName);
      setDirty(false);
      clearProjectDraftRecords();
      setFileStatus(isZh ? '项目文件已保存。' : 'Project file saved.');
      return true;
    } catch {
      setFileStatus(getSaveErrorMessage(isZh));
      return false;
    }
  };

  const handleSaveProjectFile = async () => {
    const recordsToSave = normalizeRecordsForPersistence(records, isZh);
    setRecords(recordsToSave);

    if (!currentFileName) {
      return await handleSaveProjectFileAs();
    }

    try {
      setFileStatus(isZh ? '正在保存...' : 'Saving...');
      const saved = await projectFileManager.saveProjectFile(recordsToSave);
      if (!saved) {
        return await handleSaveProjectFileAs();
      }

      setDirty(false);
      clearProjectDraftRecords();
      setFileStatus(isZh ? '项目文件已保存。' : 'Project file saved.');
      return true;
    } catch {
      setFileStatus(getSaveErrorMessage(isZh));
      return false;
    }
  };

  return {
    handleNewProjectFile,
    handleOpenProjectFile,
    handleSaveProjectFile,
    handleSaveProjectFileAs,
  };
}
