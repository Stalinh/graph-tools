import { PROJECT_COLUMNS, PROJECT_DEFAULT_SUB_LINE_TASK_NAMES } from './projectConfig';
import type {
  ProjectLine,
  ProjectRecord,
  ProjectSubLine,
  ProjectSubLineStatus,
} from './projectTypes';

const DEFAULT_PROJECT_SUB_LINE_STATUS: ProjectSubLineStatus = '未处理';
const PROJECT_SUB_LINE_STATUSES: ProjectSubLineStatus[] = [
  '未处理',
  '待处理',
  '等待中',
  '已提资/已完成',
];
const LEGACY_PROJECT_SUB_LINE_STATUS_MAP: Record<string, ProjectSubLineStatus> = {
  设计中: '待处理',
  待评审: '等待中',
  已处理: '已提资/已完成',
  已提资: '已提资/已完成',
  已下单: '已提资/已完成',
};
const OPTIONAL_PROJECT_LINE_FIELDS = new Set(['detailDesign', 'lineNo', 'progress']);
const PROJECT_SUB_LINE_ORDER_BY_TASK_NAME = new Map(
  PROJECT_DEFAULT_SUB_LINE_TASK_NAMES.map((taskName, index) => [taskName, index])
);

export interface ProjectRecordsSanitizeReport {
  records: ProjectRecord[];
  invalidRecordCount: number;
  invalidSubLineCount: number;
  duplicateProjectNameCount: number;
}

export interface ProjectDefaultSubLinesResult {
  records: ProjectRecord[];
  addedSubLineCount: number;
  reorderedSubLineRecordCount: number;
}

function createProjectId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `project-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createProjectLine(values: Partial<Omit<ProjectLine, 'id'>> = {}): ProjectLine {
  return {
    id: createProjectId(),
    lineNo: values.lineNo ?? '',
    contractNo: values.contractNo ?? '',
    detailDesign: values.detailDesign ?? '',
    projectNo: values.projectNo ?? '',
    projectName: values.projectName ?? '',
    contractAmount: values.contractAmount ?? '',
    projectLevel: values.projectLevel ?? '',
    progress: normalizeProjectProgress(values.progress ?? '0'),
    schemeDesign: values.schemeDesign ?? '',
    projectManager: values.projectManager ?? '',
  };
}

export function createProjectRecord(
  values: Partial<Omit<ProjectLine, 'id'>> & { subLines?: ProjectSubLine[] } = {}
): ProjectRecord {
  return {
    ...createProjectLine(values),
    subLines: orderProjectSubLines(values.subLines ?? []),
  };
}

export function createProjectSubLine(
  values: Partial<Omit<ProjectSubLine, 'id'>> = {}
): ProjectSubLine {
  return {
    id: createProjectId(),
    lineNo: values.lineNo ?? '',
    taskName: values.taskName ?? '',
    status: normalizeProjectSubLineStatus(values.status),
    detailDesign: values.detailDesign ?? '',
  };
}

export function createDefaultProjectSubLines() {
  return PROJECT_DEFAULT_SUB_LINE_TASK_NAMES.map((taskName) => createProjectSubLine({ taskName }));
}

export function orderProjectSubLines(subLines: readonly ProjectSubLine[]) {
  return subLines
    .map((subLine, index) => ({ subLine, index }))
    .sort((a, b) => {
      const aOrder = PROJECT_SUB_LINE_ORDER_BY_TASK_NAME.get(
        normalizeProjectSubLineTaskName(a.subLine.taskName)
      );
      const bOrder = PROJECT_SUB_LINE_ORDER_BY_TASK_NAME.get(
        normalizeProjectSubLineTaskName(b.subLine.taskName)
      );

      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }

      if (aOrder !== undefined) {
        return -1;
      }

      if (bOrder !== undefined) {
        return 1;
      }

      return a.index - b.index;
    })
    .map(({ subLine }) => subLine);
}

function hasProjectSubLineOrderChanged(
  currentSubLines: readonly ProjectSubLine[],
  nextSubLines: readonly ProjectSubLine[]
) {
  return (
    currentSubLines.length === nextSubLines.length &&
    currentSubLines.some((subLine, index) => subLine.id !== nextSubLines[index]?.id)
  );
}

export function createInitialProjectRecords() {
  return [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getStringProperty(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

export function isProjectLine(value: unknown): value is ProjectLine {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<ProjectLine>;
  const requiredColumns = PROJECT_COLUMNS.filter(
    ({ field }) => !OPTIONAL_PROJECT_LINE_FIELDS.has(field)
  );
  return (
    typeof record.id === 'string' &&
    requiredColumns.every(({ field }) => typeof record[field] === 'string') &&
    (record.lineNo === undefined || typeof record.lineNo === 'string') &&
    (record.detailDesign === undefined || typeof record.detailDesign === 'string') &&
    (record.progress === undefined || typeof record.progress === 'string')
  );
}

export function isProjectRecord(value: unknown): value is ProjectRecord {
  if (!isProjectLine(value)) {
    return false;
  }

  const record = value as Partial<ProjectRecord>;
  return record.subLines === undefined || Array.isArray(record.subLines);
}

export function normalizeProjectName(projectName: unknown) {
  return typeof projectName === 'string' ? projectName.trim() : '';
}

export function normalizeProjectLineNo(lineNo: unknown) {
  return typeof lineNo === 'string' ? lineNo.trim() : '';
}

export function compareProjectLineNos(a: string, b: string): number {
  const aClean = a.trim();
  const bClean = b.trim();

  // Put empty line numbers at the end
  if (!aClean && !bClean) return 0;
  if (!aClean) return 1;
  if (!bClean) return -1;

  // Extract Year (first 4 characters)
  const yearStrA = aClean.slice(0, 4);
  const yearStrB = bClean.slice(0, 4);
  const yearA = parseInt(yearStrA, 10);
  const yearB = parseInt(yearStrB, 10);

  const isYearANum = !isNaN(yearA);
  const isYearBNum = !isNaN(yearB);

  if (isYearANum && isYearBNum) {
    if (yearA !== yearB) {
      return yearA - yearB;
    }
  } else if (isYearANum) {
    return -1;
  } else if (isYearBNum) {
    return 1;
  } else {
    const yearComp = yearStrA.localeCompare(yearStrB);
    if (yearComp !== 0) return yearComp;
  }

  // Extract Code (remaining characters)
  const codeStrA = aClean.slice(4);
  const codeStrB = bClean.slice(4);
  const codeA = parseInt(codeStrA, 10);
  const codeB = parseInt(codeStrB, 10);

  const isCodeANum = !isNaN(codeA);
  const isCodeBNum = !isNaN(codeB);

  if (isCodeANum && isCodeBNum) {
    if (codeA !== codeB) {
      return codeA - codeB;
    }
  } else if (isCodeANum) {
    return -1;
  } else if (isCodeBNum) {
    return 1;
  } else {
    return codeStrA.localeCompare(codeStrB);
  }

  return 0;
}

export function sortProjectRecords(records: ProjectRecord[]): ProjectRecord[] {
  return [...records].sort((a, b) => compareProjectLineNos(a.lineNo, b.lineNo));
}

export function normalizeProjectProgress(progress: unknown) {
  const numericProgress =
    typeof progress === 'string' || typeof progress === 'number'
      ? Number.parseFloat(String(progress))
      : Number.NaN;
  if (!Number.isFinite(numericProgress)) {
    return '0';
  }

  const clampedProgress = Math.min(100, Math.max(0, Math.round(numericProgress)));
  return String(clampedProgress);
}

export function normalizeProjectSubLineTaskName(taskName: unknown) {
  return typeof taskName === 'string' ? taskName.trim() : '';
}

export function normalizeProjectSubLineStatus(status: unknown): ProjectSubLineStatus {
  if (PROJECT_SUB_LINE_STATUSES.includes(status as ProjectSubLineStatus)) {
    return status as ProjectSubLineStatus;
  }

  if (typeof status === 'string' && status in LEGACY_PROJECT_SUB_LINE_STATUS_MAP) {
    return LEGACY_PROJECT_SUB_LINE_STATUS_MAP[status];
  }

  return DEFAULT_PROJECT_SUB_LINE_STATUS;
}

export function sanitizeProjectLine(record: unknown): ProjectLine | null {
  if (!isObject(record) || typeof record.id !== 'string') {
    return null;
  }

  const projectName = normalizeProjectName(record.projectName);
  if (!projectName) {
    return null;
  }

  return {
    id: record.id,
    lineNo: normalizeProjectLineNo(record.lineNo),
    contractNo: getStringProperty(record, 'contractNo'),
    detailDesign: getStringProperty(record, 'detailDesign'),
    projectNo: getStringProperty(record, 'projectNo'),
    projectName,
    contractAmount: getStringProperty(record, 'contractAmount'),
    projectLevel: getStringProperty(record, 'projectLevel'),
    progress: normalizeProjectProgress(record.progress),
    schemeDesign: getStringProperty(record, 'schemeDesign'),
    projectManager: getStringProperty(record, 'projectManager'),
  };
}

export function sanitizeProjectRecord(record: unknown): ProjectRecord | null {
  if (!isObject(record)) {
    return null;
  }

  const sanitizedRecord = sanitizeProjectLine(record);
  if (!sanitizedRecord) {
    return null;
  }

  const subLines = Array.isArray(record.subLines) ? record.subLines : [];

  return {
    ...sanitizedRecord,
    subLines: orderProjectSubLines(
      subLines.flatMap((subLine) => {
        const sanitizedSubLine = sanitizeProjectSubLine(subLine);
        return sanitizedSubLine ? [sanitizedSubLine] : [];
      })
    ),
  };
}

export function sanitizeProjectSubLine(value: unknown): ProjectSubLine | null {
  if (!isObject(value)) {
    return null;
  }

  const record = value as Partial<ProjectSubLine> & Partial<ProjectLine>;
  if (typeof record.id !== 'string') {
    return null;
  }

  const hasTaskNameField = 'taskName' in record;
  const taskName = normalizeProjectSubLineTaskName(record.taskName ?? record.projectName);
  if (hasTaskNameField && !taskName) {
    return null;
  }

  return {
    id: record.id,
    lineNo: normalizeProjectLineNo(record.lineNo),
    taskName: taskName || '未命名任务',
    status: normalizeProjectSubLineStatus(record.status),
    detailDesign: getStringProperty(value, 'detailDesign'),
  };
}

function getInvalidSubLineCount(record: unknown, sanitizedRecord: ProjectRecord) {
  if (!isObject(record) || !('subLines' in record)) {
    return 0;
  }

  if (!Array.isArray(record.subLines)) {
    return 1;
  }

  return Math.max(0, record.subLines.length - sanitizedRecord.subLines.length);
}

export function sanitizeProjectRecordsWithReport(
  records: readonly unknown[]
): ProjectRecordsSanitizeReport {
  const knownProjectNames = new Set<string>();
  const sanitizedRecords: ProjectRecord[] = [];
  let invalidRecordCount = 0;
  let invalidSubLineCount = 0;
  let duplicateProjectNameCount = 0;

  for (const record of records) {
    const sanitizedRecord = sanitizeProjectRecord(record);
    if (!sanitizedRecord) {
      invalidRecordCount += 1;
      continue;
    }
    invalidSubLineCount += getInvalidSubLineCount(record, sanitizedRecord);

    const projectName = normalizeProjectName(sanitizedRecord.projectName);
    if (knownProjectNames.has(projectName)) {
      duplicateProjectNameCount += 1;
      continue;
    }

    knownProjectNames.add(projectName);
    sanitizedRecords.push({
      ...sanitizedRecord,
    });
  }

  return {
    records: sanitizedRecords,
    invalidRecordCount,
    invalidSubLineCount,
    duplicateProjectNameCount,
  };
}

export function sanitizeProjectRecords(records: readonly unknown[]) {
  return sanitizeProjectRecordsWithReport(records).records;
}

export function ensureProjectDefaultSubLines(record: ProjectRecord): ProjectDefaultSubLinesResult {
  const knownTaskNames = new Set(
    record.subLines.map((subLine) => normalizeProjectSubLineTaskName(subLine.taskName))
  );
  const missingSubLines = PROJECT_DEFAULT_SUB_LINE_TASK_NAMES.filter(
    (taskName) => !knownTaskNames.has(taskName)
  ).map((taskName) => createProjectSubLine({ taskName }));
  const nextSubLines = orderProjectSubLines([...record.subLines, ...missingSubLines]);

  return {
    records: [
      {
        ...record,
        subLines: nextSubLines,
      },
    ],
    addedSubLineCount: missingSubLines.length,
    reorderedSubLineRecordCount:
      missingSubLines.length === 0 && hasProjectSubLineOrderChanged(record.subLines, nextSubLines)
        ? 1
        : 0,
  };
}

export function ensureProjectRecordsDefaultSubLines(
  records: readonly ProjectRecord[]
): ProjectDefaultSubLinesResult {
  const nextRecords: ProjectRecord[] = [];
  let addedSubLineCount = 0;
  let reorderedSubLineRecordCount = 0;

  records.forEach((record) => {
    const result = ensureProjectDefaultSubLines(record);
    nextRecords.push(...result.records);
    addedSubLineCount += result.addedSubLineCount;
    reorderedSubLineRecordCount += result.reorderedSubLineRecordCount;
  });

  return {
    records: nextRecords,
    addedSubLineCount,
    reorderedSubLineRecordCount,
  };
}
