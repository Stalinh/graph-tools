import { sanitizeProjectRecords, sanitizeProjectRecordsWithReport } from "./projectModel";
import type { ProjectRecord } from "./projectTypes";

export const PROJECT_FILE_EXTENSION = ".project";
export const PROJECT_FILE_NAME = "project-management.project";
export const PROJECT_FILE_DESCRIPTION = "Project Management File";
export const PROJECT_FILE_MODULE = "project-management";
export const PROJECT_FILE_SCHEMA_VERSION = 8;
const SUPPORTED_PROJECT_FILE_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8];
export const PROJECT_OPEN_ACCEPT = {
  "application/json": [PROJECT_FILE_EXTENSION],
};
export const PROJECT_SAVE_ACCEPT = PROJECT_OPEN_ACCEPT;

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isProjectFileName(fileName: string) {
  return getFileExtension(fileName) === PROJECT_FILE_EXTENSION;
}

export function parseProjectFileJson(json: string) {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(json);
  } catch (error) {
    throw new Error("Invalid .project file: malformed JSON.", { cause: error });
  }

  if (!isObject(parsedValue)) {
    throw new Error("Invalid .project file: expected an object.");
  }

  if (
    parsedValue.module !== PROJECT_FILE_MODULE ||
    typeof parsedValue.schemaVersion !== "number" ||
    !SUPPORTED_PROJECT_FILE_SCHEMA_VERSIONS.includes(parsedValue.schemaVersion) ||
    !Array.isArray(parsedValue.projects)
  ) {
    throw new Error("Invalid .project file: missing or invalid project data.");
  }

  const sanitizedProjects = sanitizeProjectRecordsWithReport(parsedValue.projects);
  if (
    sanitizedProjects.invalidRecordCount > 0 ||
    sanitizedProjects.invalidSubLineCount > 0 ||
    sanitizedProjects.duplicateProjectNameCount > 0
  ) {
    throw new Error("Invalid .project file: invalid project records.");
  }

  return sanitizedProjects.records;
}

export function serializeProjectFile(records: ProjectRecord[]) {
  return `${JSON.stringify(
    {
      schemaVersion: PROJECT_FILE_SCHEMA_VERSION,
      module: PROJECT_FILE_MODULE,
      updatedAt: new Date().toISOString(),
      projects: sanitizeProjectRecords(records),
    },
    null,
    2
  )}\n`;
}
