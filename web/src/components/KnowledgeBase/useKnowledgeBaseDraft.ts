import { useCallback, useEffect, useRef, useState } from 'react';
import type { GraphState } from '../../hooks/useGraphState';
import { loadWorkspaceDraft, saveWorkspaceDraft } from '../../lib/workspaceDraftStorage';
import { migrateWorkspaceIds } from '../../lib/workspaceState';
import type { WorkspaceState } from '../../types';

const DRAFT_SAVE_DEBOUNCE_MS = 500;

interface UseKnowledgeBaseDraftOptions {
  nodes: GraphState['nodes'];
  persistence: GraphState['persistence'];
  selection: GraphState['selection'];
  status: GraphState['status'];
}

export function useKnowledgeBaseDraft({
  nodes,
  persistence,
  selection,
  status,
}: UseKnowledgeBaseDraftOptions) {
  const didRestoreDraftRef = useRef(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftStateRef = useRef<WorkspaceState | null>(null);
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);

  const flushDraftSave = useCallback(
    (updateFailureState = true) => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }

      if (!latestDraftStateRef.current) {
        return;
      }

      const saved = saveWorkspaceDraft(latestDraftStateRef.current);
      if (updateFailureState) {
        setDraftSaveFailed(!saved);
      }
    },
    [setDraftSaveFailed]
  );

  useEffect(() => {
    if (didRestoreDraftRef.current) {
      return;
    }

    didRestoreDraftRef.current = true;
    const draft = loadWorkspaceDraft();
    if (!draft) {
      status.setStatus('ready');
      return;
    }

    persistence.applyWorkspaceState(migrateWorkspaceIds(draft));
    status.setStatus('ready');
    status.setErrorMessage(null);
  }, [persistence, status]);

  useEffect(() => {
    if (!didRestoreDraftRef.current || status.status !== 'ready') {
      return;
    }

    latestDraftStateRef.current = persistence.createWorkspaceState();
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
    }

    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      flushDraftSave();
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }, [
    flushDraftSave,
    persistence.createWorkspaceState,
    nodes.graph,
    nodes.nodePositions,
    nodes.nodeSizes,
    nodes.viewport,
    selection.selectedNodeId,
    status.status,
  ]);

  useEffect(() => {
    return () => flushDraftSave(false);
  }, [flushDraftSave]);

  useEffect(() => {
    const handlePageHide = () => flushDraftSave(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDraftSave(false);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushDraftSave]);

  return {
    draftSaveFailed,
  };
}
