import type { Editor } from '@tiptap/core';
import { useMemo } from 'react';

export interface RichEditorStats {
  characters: number;
  checkedTasks: number;
  totalTasks: number;
  words: number;
}

type RichEditorStatsSource = Pick<Editor, 'getText' | 'state'>;

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
    if (node.type.name === 'taskItem') {
      totalTasks++;
      if (node.attrs.checked) {
        checkedTasks++;
      }
    }
  });

  let words = 0;
  if (text) {
    const cjkReg = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
    const cjkCount = (text.match(cjkReg) || []).length;
    const cleanText = text.replace(cjkReg, ' ');
    const latinCount = (cleanText.match(/[a-zA-Z0-9_À-ÿ]+/g) || []).length;
    words = cjkCount + latinCount;
  }

  return {
    characters: text.length,
    checkedTasks,
    totalTasks,
    words,
  };
}

export function useRichEditorStats(editor: Editor | null, editorUpdateTrigger: number) {
  return useMemo(() => getRichEditorStats(editor), [editor, editorUpdateTrigger]);
}
