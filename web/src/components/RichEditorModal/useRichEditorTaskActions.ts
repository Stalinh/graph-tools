import type { Editor } from "@tiptap/core";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useCallback } from "react";

export function useRichEditorTaskActions(editor: Editor | null) {
  const setAllTasksChecked = useCallback(
    (checked: boolean) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          let hasChanges = false;
          tr.doc.descendants((node, pos) => {
            if (node.type.name === "taskItem" && !!node.attrs.checked !== checked) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked });
              hasChanges = true;
            }
          });
          return hasChanges;
        })
        .run();
    },
    [editor]
  );

  const clearCompletedTasks = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        let hasChanges = false;
        const tasksToDelete: { from: number; to: number }[] = [];
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "taskItem" && node.attrs.checked) {
            tasksToDelete.push({ from: pos, to: pos + node.nodeSize });
          }
        });

        for (let i = tasksToDelete.length - 1; i >= 0; i--) {
          const { from, to } = tasksToDelete[i];
          tr.delete(from, to);
          hasChanges = true;
        }
        return hasChanges;
      })
      .run();
  }, [editor]);

  const sortTasks = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        let hasChanges = false;
        tr.doc.descendants((node, pos) => {
          if (node.type.name !== "taskList") {
            return;
          }

          const children: ProseMirrorNode[] = [];
          node.forEach((child) => {
            children.push(child);
          });

          const checkedStates = children.map((child) => !!child.attrs.checked);
          let isSorted = true;
          for (let i = 0; i < checkedStates.length - 1; i++) {
            if (checkedStates[i] && !checkedStates[i + 1]) {
              isSorted = false;
              break;
            }
          }

          if (!isSorted) {
            const sortedChildren = [...children].sort((a, b) => {
              const aChecked = !!a.attrs.checked;
              const bChecked = !!b.attrs.checked;
              if (aChecked === bChecked) return 0;
              return aChecked ? 1 : -1;
            });

            const start = pos + 1;
            const end = pos + node.nodeSize - 1;
            const sortedFragment = Fragment.from(sortedChildren);
            tr.replaceWith(start, end, sortedFragment);
            hasChanges = true;
          }
        });
        return hasChanges;
      })
      .run();
  }, [editor]);

  return {
    clearCompletedTasks,
    setAllTasksChecked,
    sortTasks,
  };
}
