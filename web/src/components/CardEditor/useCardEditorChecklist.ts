import { useCallback, useMemo } from "react";
import {
  appendChecklistTask,
  clearCompletedChecklistTasks,
  extractChecklistTasks,
  setAllChecklistTasksChecked,
  setChecklistTaskChecked,
  sortChecklistTasks,
} from "./cardChecklistUtils";

interface UseCardEditorChecklistOptions {
  contentHtml?: string;
  onContentCommit?: (contentHtml: string) => void;
  supportsChecklist: boolean;
}

export function useCardEditorChecklist({
  contentHtml = "",
  onContentCommit,
  supportsChecklist,
}: UseCardEditorChecklistOptions) {
  const tasks = useMemo(
    () => (supportsChecklist ? extractChecklistTasks(contentHtml) : []),
    [contentHtml, supportsChecklist]
  );
  const totalCount = tasks.length;
  const completedCount = tasks.filter((task) => task.checked).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const commitChecklistUpdate = useCallback(
    (nextHtml: string | null) => {
      if (nextHtml !== null) {
        onContentCommit?.(nextHtml);
      }
    },
    [onContentCommit]
  );

  const handleToggleTask = useCallback(
    (indexToToggle: number, checked: boolean) => {
      if (!onContentCommit) return;
      commitChecklistUpdate(setChecklistTaskChecked(contentHtml, indexToToggle, checked));
    },
    [commitChecklistUpdate, contentHtml, onContentCommit]
  );

  const handleAddTask = useCallback(
    (text: string) => {
      if (!onContentCommit) return;
      commitChecklistUpdate(appendChecklistTask(contentHtml, text));
    },
    [commitChecklistUpdate, contentHtml, onContentCommit]
  );

  const handleToggleAllTasks = useCallback(
    (checked: boolean) => {
      if (!onContentCommit) return;
      commitChecklistUpdate(setAllChecklistTasksChecked(contentHtml, checked));
    },
    [commitChecklistUpdate, contentHtml, onContentCommit]
  );

  const handleClearCompletedTasks = useCallback(() => {
    if (!onContentCommit) return;
    commitChecklistUpdate(clearCompletedChecklistTasks(contentHtml));
  }, [commitChecklistUpdate, contentHtml, onContentCommit]);

  const handleSortTasks = useCallback(() => {
    if (!onContentCommit) return;
    commitChecklistUpdate(sortChecklistTasks(contentHtml));
  }, [commitChecklistUpdate, contentHtml, onContentCommit]);

  return {
    completedCount,
    handleAddTask,
    handleClearCompletedTasks,
    handleSortTasks,
    handleToggleAllTasks,
    handleToggleTask,
    percentage,
    tasks,
    totalCount,
  };
}
