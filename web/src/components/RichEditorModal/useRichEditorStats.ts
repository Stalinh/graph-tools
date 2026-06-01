import type { Editor } from "@tiptap/core";
import { useMemo } from "react";

export interface RichEditorStats {
  characters: number;
  checkedTasks: number;
  totalTasks: number;
  words: number;
}

type RichEditorStatsSource = Pick<Editor, "getText" | "state">;

export function getRichEditorStats(editor: RichEditorStatsSource | null): RichEditorStats {
  if (!editor) {
    return {
      characters: 0,
      checkedTasks: 0,
      totalTasks: 0,
      words: 0,
    };
  }

  const text = editor.getText().trim();
  let totalTasks = 0;
  let checkedTasks = 0;

  editor.state.doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      totalTasks++;
      if (node.attrs.checked) {
        checkedTasks++;
      }
    }
  });

  return {
    characters: text.length,
    checkedTasks,
    totalTasks,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
  };
}

export function useRichEditorStats(editor: Editor | null, editorUpdateTrigger: number) {
  return useMemo(() => getRichEditorStats(editor), [editor, editorUpdateTrigger]);
}
