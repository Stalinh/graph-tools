import { PROJECT_COLUMNS, PROJECT_DEFAULT_SUB_LINE_TASK_NAMES } from "./projectConfig";
import type { ProjectLine, ProjectRecord, ProjectSubLine, ProjectSubLineStatus } from "./projectTypes";

const DEFAULT_PROJECT_SUB_LINE_STATUS: ProjectSubLineStatus = "未处理";
const PROJECT_SUB_LINE_STATUSES: ProjectSubLineStatus[] = [
  "未处理",
  "设计中",
  "待评审",
  "已提资",
  "已下单",
];
const OPTIONAL_PROJECT_LINE_FIELDS = new Set(["detailDesign", "lineNo", "progress"]);

export interface ProjectRecordsSanitizeReport {
  records: ProjectRecord[];
  invalidRecordCount: number;
  invalidSubLineCount: number;
  duplicateProjectNameCount: number;
}

export interface ProjectDefaultSubLinesResult {
  records: ProjectRecord[];
  addedSubLineCount: number;
}

function createProjectId() {
  return (
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `project-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function createProjectLine(values: Partial<Omit<ProjectLine, "id">> = {}): ProjectLine {
  return {
    id: createProjectId(),
    lineNo: values.lineNo ?? "",
    contractNo: values.contractNo ?? "",
    detailDesign: values.detailDesign ?? "",
    projectNo: values.projectNo ?? "",
    projectName: values.projectName ?? "",
    contractAmount: values.contractAmount ?? "",
    projectLevel: values.projectLevel ?? "",
    progress: normalizeProjectProgress(values.progress ?? "0"),
    schemeDesign: values.schemeDesign ?? "",
    projectManager: values.projectManager ?? "",
  };
}

export function createProjectRecord(
  values: Partial<Omit<ProjectLine, "id">> & { subLines?: ProjectSubLine[] } = {}
): ProjectRecord {
  return {
    ...createProjectLine(values),
    subLines: values.subLines ?? [],
  };
}

export function createProjectSubLine(values: Partial<Omit<ProjectSubLine, "id">> = {}): ProjectSubLine {
  return {
    id: createProjectId(),
    lineNo: values.lineNo ?? "",
    taskName: values.taskName ?? "",
    progressRatio: normalizeProjectProgress(values.progressRatio ?? "0"),
    status: normalizeProjectSubLineStatus(values.status),
    detailDesign: values.detailDesign ?? "",
  };
}

export function createDefaultProjectSubLines() {
  return PROJECT_DEFAULT_SUB_LINE_TASK_NAMES.map((taskName) => createProjectSubLine({ taskName }));
}

export function createInitialProjectRecords() {
  return [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getStringProperty(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function isProjectLine(value: unknown): value is ProjectLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<ProjectLine>;
  const requiredColumns = PROJECT_COLUMNS.filter(({ field }) => !OPTIONAL_PROJECT_LINE_FIELDS.has(field));
  return (
    typeof record.id === "string" &&
    requiredColumns.every(({ field }) => typeof record[field] === "string") &&
    (record.lineNo === undefined || typeof record.lineNo === "string") &&
    (record.detailDesign === undefined || typeof record.detailDesign === "string") &&
    (record.progress === undefined || typeof record.progress === "string")
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
  return typeof projectName === "string" ? projectName.trim() : "";
}

export function normalizeProjectLineNo(lineNo: unknown) {
  return typeof lineNo === "string" ? lineNo.trim() : "";
}

export function normalizeProjectProgress(progress: unknown) {
  const numericProgress =
    typeof progress === "string" || typeof progress === "number"
      ? Number.parseFloat(String(progress))
      : Number.NaN;
  if (!Number.isFinite(numericProgress)) {
    return "0";
  }

  const clampedProgress = Math.min(100, Math.max(0, Math.round(numericProgress)));
  return String(clampedProgress);
}

export function normalizeProjectSubLineTaskName(taskName: unknown) {
  return typeof taskName === "string" ? taskName.trim() : "";
}

export function normalizeProjectSubLineStatus(status: unknown): ProjectSubLineStatus {
  return PROJECT_SUB_LINE_STATUSES.includes(status as ProjectSubLineStatus)
    ? (status as ProjectSubLineStatus)
    : DEFAULT_PROJECT_SUB_LINE_STATUS;
}

export function sanitizeProjectLine(record: unknown): ProjectLine | null {
  if (!isObject(record) || typeof record.id !== "string") {
    return null;
  }

  const projectName = normalizeProjectName(record.projectName);
  if (!projectName) {
    return null;
  }

  return {
    id: record.id,
    lineNo: normalizeProjectLineNo(record.lineNo),
    contractNo: getStringProperty(record, "contractNo"),
    detailDesign: getStringProperty(record, "detailDesign"),
    projectNo: getStringProperty(record, "projectNo"),
    projectName,
    contractAmount: getStringProperty(record, "contractAmount"),
    projectLevel: getStringProperty(record, "projectLevel"),
    progress: normalizeProjectProgress(record.progress),
    schemeDesign: getStringProperty(record, "schemeDesign"),
    projectManager: getStringProperty(record, "projectManager"),
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
    subLines: subLines.flatMap((subLine) => {
      const sanitizedSubLine = sanitizeProjectSubLine(subLine);
      return sanitizedSubLine ? [sanitizedSubLine] : [];
    }),
  };
}

export function sanitizeProjectSubLine(value: unknown): ProjectSubLine | null {
  if (!isObject(value)) {
    return null;
  }

  const record = value as Partial<ProjectSubLine> & Partial<ProjectLine>;
  if (typeof record.id !== "string") {
    return null;
  }

  const hasTaskNameField = "taskName" in record;
  const taskName = normalizeProjectSubLineTaskName(record.taskName ?? record.projectName);
  if (hasTaskNameField && !taskName) {
    return null;
  }

  return {
    id: record.id,
    lineNo: normalizeProjectLineNo(record.lineNo),
    taskName: taskName || "未命名任务",
    progressRatio: normalizeProjectProgress(record.progressRatio ?? record.progress),
    status: normalizeProjectSubLineStatus(record.status),
    detailDesign: getStringProperty(value, "detailDesign"),
  };
}

function getInvalidSubLineCount(record: unknown, sanitizedRecord: ProjectRecord) {
  if (!isObject(record) || !("subLines" in record)) {
    return 0;
  }

  if (!Array.isArray(record.subLines)) {
    return 1;
  }

  return Math.max(0, record.subLines.length - sanitizedRecord.subLines.length);
}

export function sanitizeProjectRecordsWithReport(records: readonly unknown[]): ProjectRecordsSanitizeReport {
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

  return {
    records:
      missingSubLines.length > 0
        ? [
            {
              ...record,
              subLines: [...record.subLines, ...missingSubLines],
            },
          ]
        : [record],
    addedSubLineCount: missingSubLines.length,
  };
}

export function ensureProjectRecordsDefaultSubLines(
  records: readonly ProjectRecord[]
): ProjectDefaultSubLinesResult {
  const nextRecords: ProjectRecord[] = [];
  let addedSubLineCount = 0;

  records.forEach((record) => {
    const result = ensureProjectDefaultSubLines(record);
    nextRecords.push(...result.records);
    addedSubLineCount += result.addedSubLineCount;
  });

  return {
    records: nextRecords,
    addedSubLineCount,
  };
}
