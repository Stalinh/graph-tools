import { PROJECT_COLUMNS } from "./projectConfig";
import type { ProjectLine, ProjectRecord, ProjectSubLine, ProjectSubLineStatus } from "./projectTypes";

const DEFAULT_PROJECT_SUB_LINE_STATUS: ProjectSubLineStatus = "未处理";
const PROJECT_SUB_LINE_STATUSES: ProjectSubLineStatus[] = ["未处理", "设计中", "待评审", "已下单"];

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
    contractNo: values.contractNo ?? "",
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
    progressRatio: normalizeProjectProgress(values.progressRatio ?? "0"),
    status: normalizeProjectSubLineStatus(values.status),
  };
}

export function createInitialProjectRecords() {
  return [];
}

export function isProjectLine(value: unknown): value is ProjectLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<ProjectLine>;
  const requiredColumns = PROJECT_COLUMNS.filter(({ field }) => field !== "progress");
  return (
    typeof record.id === "string" &&
    requiredColumns.every(({ field }) => typeof record[field] === "string") &&
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

export function normalizeProjectName(projectName: string) {
  return projectName.trim();
}

export function normalizeProjectProgress(progress: string | undefined) {
  const numericProgress = Number.parseFloat(progress ?? "");
  if (!Number.isFinite(numericProgress)) {
    return "0";
  }

  const clampedProgress = Math.min(100, Math.max(0, Math.round(numericProgress)));
  return String(clampedProgress);
}

export function normalizeProjectSubLineStatus(status: unknown): ProjectSubLineStatus {
  return PROJECT_SUB_LINE_STATUSES.includes(status as ProjectSubLineStatus)
    ? (status as ProjectSubLineStatus)
    : DEFAULT_PROJECT_SUB_LINE_STATUS;
}

export function sanitizeProjectLine(record: ProjectLine): ProjectLine | null {
  const projectName = normalizeProjectName(record.projectName);
  if (!projectName) {
    return null;
  }

  return {
    ...record,
    projectName,
    progress: normalizeProjectProgress(record.progress),
  };
}

export function sanitizeProjectRecord(record: ProjectRecord): ProjectRecord | null {
  const sanitizedRecord = sanitizeProjectLine(record);
  if (!sanitizedRecord) {
    return null;
  }

  return {
    ...sanitizedRecord,
    subLines: Array.isArray(record.subLines)
      ? record.subLines.flatMap((subLine) => {
          const sanitizedSubLine = sanitizeProjectSubLine(subLine);
          return sanitizedSubLine ? [sanitizedSubLine] : [];
        })
      : [],
  };
}

export function sanitizeProjectSubLine(value: unknown): ProjectSubLine | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<ProjectSubLine> & Partial<ProjectLine>;
  if (typeof record.id !== "string") {
    return null;
  }

  return {
    id: record.id,
    progressRatio: normalizeProjectProgress(record.progressRatio ?? record.progress),
    status: normalizeProjectSubLineStatus(record.status),
  };
}

export function sanitizeProjectRecords(records: ProjectRecord[]) {
  const knownProjectNames = new Set<string>();
  const sanitizedRecords: ProjectRecord[] = [];

  for (const record of records) {
    const sanitizedRecord = sanitizeProjectRecord(record);
    if (!sanitizedRecord) {
      continue;
    }

    const projectName = normalizeProjectName(sanitizedRecord.projectName);
    if (knownProjectNames.has(projectName)) {
      continue;
    }

    knownProjectNames.add(projectName);
    sanitizedRecords.push({
      ...sanitizedRecord,
    });
  }

  return sanitizedRecords;
}
