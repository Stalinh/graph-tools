import type { Dispatch, SetStateAction } from 'react';
import {
  calculateProjectProgressFromSubLines,
  createDefaultProjectSubLines,
  createProjectRecord,
  normalizeProjectLineNo,
  normalizeProjectProgress,
  sortProjectRecords,
} from './projectModel';
import { getUniqueProjectName, normalizeRecordsForPersistence } from './projectPersistence';
import type { ProjectRecord, ProjectRecordField, ProjectSubLineField } from './projectTypes';

interface UseProjectRecordOpsOptions {
  isZh: boolean;
  records: ProjectRecord[];
  setDirty: (dirty: boolean) => void;
  setExpandedProjectIds: Dispatch<SetStateAction<Set<string>>>;
  setIsEditMode: (isEditMode: boolean) => void;
  setRecords: Dispatch<SetStateAction<ProjectRecord[]>>;
}

export function useProjectRecordOps({
  isZh,
  records,
  setDirty,
  setExpandedProjectIds,
  setIsEditMode,
  setRecords,
}: UseProjectRecordOpsOptions) {
  const enterEditMode = () => setIsEditMode(true);

  const enterReadMode = () => {
    setRecords((currentRecords) =>
      sortProjectRecords(normalizeRecordsForPersistence(currentRecords, isZh))
    );
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
    const projectName = getUniqueProjectName(isZh ? '新项目' : 'New Project', '', records, isZh);
    const nextRecord = createProjectRecord({
      projectName,
      subLines: createDefaultProjectSubLines(),
    });

    setRecords((currentRecords) => sortProjectRecords([...currentRecords, nextRecord]));
    setExpandedProjectIds((currentIds) => new Set(currentIds).add(nextRecord.id));
    setDirty(true);
  };

  const removeRecord = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    const projectName = record?.projectName || (isZh ? '未命名项目' : 'Untitled Project');
    const confirmMessage = isZh
      ? `确定要删除项目 "${projectName}" 吗？`
      : `Are you sure you want to delete the project "${projectName}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRecords((currentRecords) => currentRecords.filter((r) => r.id !== recordId));
    setExpandedProjectIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(recordId);
      return nextIds;
    });
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
    setRecords((currentRecords) => {
      const nextRecords = currentRecords.map((record) => {
        if (record.id !== recordId) {
          return record;
        }

        if (field === 'projectName') {
          return {
            ...record,
            projectName: getUniqueProjectName(record.projectName, recordId, currentRecords, isZh),
          };
        }

        if (field === 'lineNo') {
          return { ...record, lineNo: normalizeProjectLineNo(record.lineNo) };
        }

        if (field === 'progress') {
          return { ...record, progress: normalizeProjectProgress(record.progress) };
        }

        return record;
      });

      if (field === 'lineNo') {
        return sortProjectRecords(nextRecords);
      }
      return nextRecords;
    });
  };

  const updateSubLineField = (
    parentId: string,
    subLineId: string,
    field: ProjectSubLineField,
    value: string
  ) => {
    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== parentId) {
          return record;
        }

        const nextSubLines = record.subLines.map((subLine) =>
          subLine.id === subLineId
            ? {
                ...subLine,
                [field]: value,
              }
            : subLine
        );

        return {
          ...record,
          subLines: nextSubLines,
          progress: calculateProjectProgressFromSubLines(nextSubLines),
        };
      })
    );
    setDirty(true);
  };

  return {
    addProjectRecord,
    commitProjectField,
    enterEditMode,
    enterReadMode,
    removeRecord,
    toggleProjectExpanded,
    updateProjectField,
    updateSubLineField,
  };
}
