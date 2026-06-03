import { useMemo, useState } from 'react';
import { projectFileManager } from './projectFileSystem';
import { sortProjectRecords } from './projectModel';
import { loadProjectDraftState } from './projectStorage';
import type { ProjectRecord } from './projectTypes';
import { useProjectDraft } from './useProjectDraft';
import { useProjectFileOps } from './useProjectFileOps';
import { useProjectRecordOps } from './useProjectRecordOps';

export interface DroppedProjectFile {
  file: File;
  id: number;
}

interface UseProjectSheetStateOptions {
  droppedProjectFile?: DroppedProjectFile | null;
  isZh: boolean;
  onDroppedProjectFileHandled?: (id: number) => void;
}

function getInitialFileStatus(
  initialDraftState: ReturnType<typeof loadProjectDraftState>,
  isZh: boolean
) {
  if (initialDraftState.hasInvalidDraftData) {
    return isZh
      ? '本地草稿包含无法恢复的数据，已保留可恢复部分。'
      : 'The local draft contains data that could not be restored. Recoverable records were kept.';
  }
  if (initialDraftState.restoredDraft) {
    return isZh ? '已恢复本地草稿。' : 'Local draft restored.';
  }
  return null;
}

export function useProjectSheetState({
  droppedProjectFile = null,
  isZh,
  onDroppedProjectFileHandled,
}: UseProjectSheetStateOptions) {
  const [initialDraftState] = useState(loadProjectDraftState);
  const [records, setRecords] = useState<ProjectRecord[]>(() =>
    sortProjectRecords(initialDraftState.records)
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [currentFileName, setCurrentFileName] = useState<string | null>(
    projectFileManager.getCurrentFileName()
  );
  const [fileStatus, setFileStatus] = useState<string | null>(() =>
    getInitialFileStatus(initialDraftState, isZh)
  );
  const [dirty, setDirty] = useState(initialDraftState.restoredDraft);
  const recordCount = records.length;
  const subLineCount = useMemo(
    () => records.reduce((total, record) => total + record.subLines.length, 0),
    [records]
  );

  useProjectDraft({
    dirty,
    records,
    skipInitialDraftSave: initialDraftState.hasInvalidDraftData,
  });

  const fileOps = useProjectFileOps({
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
  });
  const recordOps = useProjectRecordOps({
    isZh,
    records,
    setDirty,
    setExpandedProjectIds,
    setIsEditMode,
    setRecords,
  });

  return {
    ...recordOps,
    ...fileOps,
    currentFileName,
    dirty,
    expandedProjectIds,
    fileStatus,
    isEditMode,
    recordCount,
    records,
    subLineCount,
  };
}
