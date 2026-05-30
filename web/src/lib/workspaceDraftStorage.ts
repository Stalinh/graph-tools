import type { WorkspaceState } from "../types";
import { parseWorkspaceStateJson, serializeWorkspaceState } from "./workspaceFileFormat";

const WORKSPACE_DRAFT_STORAGE_KEY = "local-kg-workspace-draft";

export function loadWorkspaceDraft(): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const state = parseWorkspaceStateJson(raw);
    if (!state) {
      localStorage.removeItem(WORKSPACE_DRAFT_STORAGE_KEY);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function saveWorkspaceDraft(state: WorkspaceState): boolean {
  try {
    localStorage.setItem(WORKSPACE_DRAFT_STORAGE_KEY, serializeWorkspaceState(state));
    return true;
  } catch (error) {
    console.warn("Failed to save workspace draft to localStorage.", error);
    return false;
  }
}
