import type { Editor } from '@tiptap/core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { getSlashCommands } from './richEditorConfig';
import type { SlashCommandItem, SlashMenuState } from './richEditorTypes';

interface UseRichEditorSlashMenuOptions {
  editorRef: RefObject<Editor | null>;
  isZh: boolean;
}

export function useRichEditorSlashMenu({ editorRef, isZh }: UseRichEditorSlashMenuOptions) {
  const slashCommands = useMemo(() => getSlashCommands(isZh), [isZh]);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    isOpen: false,
    pos: 0,
    coords: { top: 0, left: 0 },
    query: '',
    activeIndex: 0,
  });

  const slashMenuRef = useRef({
    isOpen: false,
    activeIndex: 0,
    filteredCommands: [] as SlashCommandItem[],
    query: '',
    pos: 0,
  });
  const slashMenuCheckTimerRef = useRef<number | null>(null);

  const filteredCommands = useMemo(() => {
    if (!slashMenu.isOpen) return [];
    const q = slashMenu.query.toLowerCase();
    return slashCommands.filter((cmd) => {
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q)) ||
        cmd.subtitle.toLowerCase().includes(q)
      );
    });
  }, [slashCommands, slashMenu.isOpen, slashMenu.query]);

  useEffect(() => {
    slashMenuRef.current = {
      isOpen: slashMenu.isOpen,
      activeIndex: slashMenu.activeIndex,
      filteredCommands,
      query: slashMenu.query,
      pos: slashMenu.pos,
    };
  }, [slashMenu, filteredCommands]);

  const checkSlashMenu = useCallback(
    (editorInstance: Editor) => {
      const { state } = editorInstance;
      const { selection } = state;
      const { $from } = selection;

      if (!selection.empty || $from.parent.type.name !== 'paragraph') {
        setSlashMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        return;
      }

      const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset);
      const match = /(?:^|\s)\/(\w*)$/.exec(textBeforeCursor);

      if (match) {
        const query = match[1];
        const coords = editorInstance.view.coordsAtPos(selection.from);
        if (coords) {
          setSlashMenu((prev) => {
            const q = query.toLowerCase();
            const itemsCount = slashCommands.filter((cmd) => {
              if (!q) return true;
              return (
                cmd.title.toLowerCase().includes(q) ||
                cmd.keywords.some((kw) => kw.includes(q)) ||
                cmd.subtitle.toLowerCase().includes(q)
              );
            }).length;

            const menuHeight = Math.min(280, itemsCount * 48 + 8);
            const viewportHeight = window.innerHeight;
            let top = coords.bottom + 4;
            if (top + menuHeight > viewportHeight) {
              top = Math.max(10, coords.top - menuHeight - 4);
            }

            const nextIndex = prev.isOpen
              ? Math.min(prev.activeIndex, Math.max(0, itemsCount - 1))
              : 0;

            return {
              isOpen: true,
              pos: selection.from,
              coords: { top, left: coords.left },
              query,
              activeIndex: nextIndex,
            };
          });
        }
      } else {
        setSlashMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
    },
    [slashCommands]
  );

  const scheduleSlashMenuCheck = useCallback(
    (editorInstance: Editor) => {
      if (slashMenuCheckTimerRef.current !== null) {
        window.clearTimeout(slashMenuCheckTimerRef.current);
      }

      slashMenuCheckTimerRef.current = window.setTimeout(() => {
        slashMenuCheckTimerRef.current = null;
        checkSlashMenu(editorInstance);
      }, 0);
    },
    [checkSlashMenu]
  );

  useEffect(() => {
    return () => {
      if (slashMenuCheckTimerRef.current !== null) {
        window.clearTimeout(slashMenuCheckTimerRef.current);
      }
    };
  }, []);

  const handleKeyDownCapture = useCallback(
    (event: KeyboardEvent) => {
      if (!slashMenuRef.current.isOpen) {
        return;
      }

      const { activeIndex, filteredCommands: currentCommands, pos, query } = slashMenuRef.current;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex =
          currentCommands.length > 0 ? (activeIndex + 1) % currentCommands.length : 0;
        setSlashMenu((prev) => ({ ...prev, activeIndex: nextIndex }));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex =
          currentCommands.length > 0
            ? (activeIndex - 1 + currentCommands.length) % currentCommands.length
            : 0;
        setSlashMenu((prev) => ({ ...prev, activeIndex: nextIndex }));
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        const activeCmd = currentCommands[activeIndex];
        if (activeCmd) {
          event.preventDefault();
          event.stopPropagation();
          const start = pos - query.length - 1;
          const editor = editorRef.current;
          if (editor) {
            const end = pos;
            const chain = editor.chain().focus().deleteRange({ from: start, to: end });
            activeCmd.action(chain).run();
          }
          setSlashMenu((prev) => ({ ...prev, isOpen: false }));
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setSlashMenu((prev) => ({ ...prev, isOpen: false }));
      }
    },
    [editorRef]
  );

  return {
    filteredCommands,
    handleKeyDownCapture,
    scheduleSlashMenuCheck,
    setSlashMenu,
    slashMenu,
  };
}
