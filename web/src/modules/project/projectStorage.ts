import {
  createInitialProjectRecords,
  sanitizeProjectRecords,
  sanitizeProjectRecordsWithReport,
} from "./projectModel";
import type { ProjectRecord } from "./projectTypes";

const PROJECT_MANAGEMENT_DRAFT_STORAGE_KEY = "project-management-draft-records";
const LEGACY_PROJECT_MANAGEMENT_STORAGE_KEY = "project-management-records";
const LEGACY_PROJECT_REGISTER_STORAGE_KEY = "project-register-records";
const LEGACY_PROJECT_SHEET_STORAGE_KEY = "local-kg-project-sheet-records";

interface ProjectDraftState {
  records: ProjectRecord[];
  restoredDraft: boolean;
  hasInvalidDraftData: boolean;
}

const PROJECT_STORAGE_KEYS = [
  PROJECT_MANAGEMENT_DRAFT_STORAGE_KEY,
  LEGACY_PROJECT_MANAGEMENT_STORAGE_KEY,
  LEGACY_PROJECT_REGISTER_STORAGE_KEY,
  LEGACY_PROJECT_SHEET_STORAGE_KEY,
];

export function loadProjectDraftState(): ProjectDraftState {
  try {
    const rawValue = PROJECT_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(
      (value): value is string => value !== null
    );
    if (!rawValue) {
      return {
        records: createInitialProjectRecords(),
        restoredDraft: false,
        hasInvalidDraftData: false,
      };
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    if (Array.isArray(parsedValue)) {
      const sanitizedDraft = sanitizeProjectRecordsWithReport(parsedValue);
      return {
        records: sanitizedDraft.records,
        restoredDraft: true,
        hasInvalidDraftData:
          sanitizedDraft.invalidRecordCount > 0 ||
          sanitizedDraft.invalidSubLineCount > 0 ||
          sanitizedDraft.duplicateProjectNameCount > 0,
      };
    }
  } catch {
    // Fall back to a blank project list if local storage is unavailable or invalid.
  }

  return {
    records: createInitialProjectRecords(),
    restoredDraft: false,
    hasInvalidDraftData: true,
  };
}

export function loadProjectDraftRecords() {
  return loadProjectDraftState().records;
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

export function clearProjectDraftRecords() {
  try {
    PROJECT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures.
  }
}
