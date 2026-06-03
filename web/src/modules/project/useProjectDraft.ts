import { useEffect, useRef } from 'react';
import { saveProjectDraftRecords } from './projectStorage';
import type { ProjectRecord } from './projectTypes';

interface UseProjectDraftOptions {
  dirty: boolean;
  records: ProjectRecord[];
  skipInitialDraftSave: boolean;
}

export function useProjectDraft({ dirty, records, skipInitialDraftSave }: UseProjectDraftOptions) {
  const skipInitialDraftSaveRef = useRef(skipInitialDraftSave);
  const latestRecordsRef = useRef(records);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    latestRecordsRef.current = records;
  }, [records]);

  useEffect(() => {
    if (skipInitialDraftSaveRef.current) {
      skipInitialDraftSaveRef.current = false;
      return;
    }

    if (!dirty) {
      return;
    }

    pendingSaveRef.current = true;
    const handler = setTimeout(() => {
      saveProjectDraftRecords(latestRecordsRef.current);
      pendingSaveRef.current = false;
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [dirty, records]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        saveProjectDraftRecords(latestRecordsRef.current);
      }
    };
  }, []);
}
