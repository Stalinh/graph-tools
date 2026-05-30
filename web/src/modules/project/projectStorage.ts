import { createInitialProjectRecords, isProjectRecord, sanitizeProjectRecords } from "./projectModel";
import type { ProjectRecord } from "./projectTypes";

const PROJECT_MANAGEMENT_DRAFT_STORAGE_KEY = "project-management-draft-records";
const LEGACY_PROJECT_MANAGEMENT_STORAGE_KEY = "project-management-records";
const LEGACY_PROJECT_REGISTER_STORAGE_KEY = "project-register-records";
const LEGACY_PROJECT_SHEET_STORAGE_KEY = "local-kg-project-sheet-records";

export function loadProjectDraftRecords() {
  try {
    const rawValue =
      localStorage.getItem(PROJECT_MANAGEMENT_DRAFT_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_PROJECT_MANAGEMENT_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_PROJECT_REGISTER_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_PROJECT_SHEET_STORAGE_KEY);
    if (!rawValue) {
      return createInitialProjectRecords();
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (Array.isArray(parsedValue)) {
      return sanitizeProjectRecords(parsedValue.filter(isProjectRecord));
    }
  } catch {
    // Fall back to a blank project list if local storage is unavailable or invalid.
  }

  return createInitialProjectRecords();
}

export function saveProjectDraftRecords(records: ProjectRecord[]) {
  try {
    localStorage.setItem(
      PROJECT_MANAGEMENT_DRAFT_STORAGE_KEY,
      JSON.stringify(sanitizeProjectRecords(records))
    );
    localStorage.removeItem(LEGACY_PROJECT_MANAGEMENT_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROJECT_REGISTER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROJECT_SHEET_STORAGE_KEY);
  } catch {
    // Keep the current session state if storage is unavailable.
  }
}
