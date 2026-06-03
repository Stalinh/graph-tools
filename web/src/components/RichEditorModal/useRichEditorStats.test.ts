import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { getRichEditorStats } from './useRichEditorStats';

type StatsEditor = Pick<Editor, 'getText' | 'state'>;
type DescendantsVisitor = (
  node: ProseMirrorNode,
  pos: number,
  parent: ProseMirrorNode | null,
  index: number
) => boolean | void;

function createStatsEditor(
  text: string,
  nodes: { checked?: boolean; type: string }[]
): StatsEditor {
  return {
    getText: () => text,
    state: {
      doc: {
        descendants: (visitor: DescendantsVisitor) => {
          nodes.forEach((node) => {
            visitor(
              {
                attrs: { checked: node.checked },
                type: { name: node.type },
              } as unknown as ProseMirrorNode,
              0,
              null,
              0
            );
          });
        },
      },
    },
  } as unknown as StatsEditor;
}

describe('getRichEditorStats', () => {
  it('counts trimmed text, words, and task completion', () => {
    const editor = createStatsEditor('  alpha beta   gamma  ', [
      { type: 'paragraph' },
      { checked: false, type: 'taskItem' },
      { checked: true, type: 'taskItem' },
    ]);

    expect(getRichEditorStats(editor)).toEqual({
      characters: 18,
      checkedTasks: 1,
      totalTasks: 2,
      words: 3,
    });
  });

  it('counts words correctly for mixed English and Chinese text', () => {
    const editor = createStatsEditor('Hello 世界!', []);
    expect(getRichEditorStats(editor)).toEqual({
      characters: 9,
      checkedTasks: 0,
      totalTasks: 0,
      words: 3, // "Hello" (1) + "世" (1) + "界" (1)
    });
  });

  it('returns empty stats without an editor', () => {
    expect(getRichEditorStats(null)).toEqual({
      characters: 0,
      checkedTasks: 0,
      totalTasks: 0,
      words: 0,
    });
  });
});
