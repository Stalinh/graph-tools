import {
  normalizeProjectLineNo,
  normalizeProjectName,
  normalizeProjectProgress,
  normalizeProjectSubLineStatus,
  normalizeProjectSubLineTaskName,
  sanitizeProjectRecords,
} from './projectModel';
import type { ProjectLine, ProjectRecord, ProjectSubLine } from './projectTypes';

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

export function getUniqueProjectName(
  projectName: string,
  recordId: string,
  sourceRecords: ProjectRecord[],
  isZh: boolean
) {
  const fallbackProjectName = isZh ? '未命名项目' : 'Untitled Project';
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
}

export function normalizeRecordsForPersistence(
  sourceRecords: ProjectRecord[],
  isZh: boolean
): ProjectRecord[] {
  const usedProjectNames = new Set<string>();
  const fallbackProjectName = isZh ? '未命名项目' : 'Untitled Project';

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
}
