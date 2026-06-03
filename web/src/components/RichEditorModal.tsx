import ColorExtension from '@tiptap/extension-color';
import HighlightExtension from '@tiptap/extension-highlight';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import type { Editor } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { FileText, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useI18n } from '../i18n';
import { RichEditorStatusBar } from './RichEditorModal/RichEditorStatusBar';
import { RichEditorToolbar } from './RichEditorModal/RichEditorToolbar';
import { ShortcutHelpOverlay } from './RichEditorModal/ShortcutHelpOverlay';
import { SlashCommandMenu } from './RichEditorModal/SlashCommandMenu';
import {
  DEFAULT_CARD_TITLES,
  getHighlightColors,
  getTextColors,
} from './RichEditorModal/richEditorConfig';
import type { RichEditorModalProps } from './RichEditorModal/richEditorTypes';
import { useRichEditorShortcutHelp } from './RichEditorModal/useRichEditorShortcutHelp';
import { useRichEditorSlashMenu } from './RichEditorModal/useRichEditorSlashMenu';
import { useRichEditorStats } from './RichEditorModal/useRichEditorStats';
import { useRichEditorTaskActions } from './RichEditorModal/useRichEditorTaskActions';

export function RichEditorModal({ node, onSave, onClose }: RichEditorModalProps) {
  const { isZh } = useI18n();
  const textColors = useMemo(() => getTextColors(isZh), [isZh]);
  const highlightColors = useMemo(() => getHighlightColors(isZh), [isZh]);
  const [title, setTitle] = useState(node.title);
  const [initialFocusTarget, setInitialFocusTarget] = useState<'title' | 'body' | null>(null);
  const [editorUpdateTrigger, setEditorUpdateTrigger] = useState(0);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const {
    closeHelp,
    filteredShortcuts,
    helpSearch,
    isHelpOpen,
    isHelpOpenRef,
    openHelp,
    setHelpSearch,
    shortcutCategories,
    toggleHelp,
  } = useRichEditorShortcutHelp(isZh);
  const {
    filteredCommands,
    handleKeyDownCapture,
    scheduleSlashMenuCheck,
    setSlashMenu,
    slashMenu,
  } = useRichEditorSlashMenu({
    editorRef,
    isZh,
  });

  // We use refs to expose the save function inside useEditor callbacks
  // to avoid closure stale-state issues.
  const saveRef = useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      TextStyle.configure(),
      ColorExtension.configure(),
      HighlightExtension.configure({
        multicolor: true,
      }),
      PlaceholderExtension.configure({
        placeholder: isZh ? '开始输入内容...' : 'Start writing...',
      }),
      TaskList.configure(),
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: node.contentHtml ?? '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      setEditorUpdateTrigger((prev) => prev + 1);
      scheduleSlashMenuCheck(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      scheduleSlashMenuCheck(ed);
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape' && isHelpOpenRef.current) {
          event.preventDefault();
          event.stopPropagation();
          closeHelp();
          return true;
        }

        const isHelpShortcut = event.key === '/' && (event.metaKey || event.ctrlKey);
        if (isHelpShortcut) {
          event.preventDefault();
          event.stopPropagation();
          toggleHelp();
          return true;
        }

        if (event.key === 'Tab') {
          event.preventDefault();
          titleInputRef.current?.focus();
          return true;
        }

        // Save shortcuts: Ctrl+S / Cmd+S or Ctrl+Enter / Cmd+Enter
        const isSaveShortcut =
          (event.key === 's' && (event.metaKey || event.ctrlKey)) ||
          (event.key === 'Enter' && (event.metaKey || event.ctrlKey));

        if (isSaveShortcut) {
          event.preventDefault();
          event.stopPropagation();
          saveRef.current();
          return true;
        }

        // Toggle task checklist shortcut: Alt+Enter or Ctrl+D / Cmd+D when selection is inside a taskItem
        const isToggleTaskShortcut =
          (event.key === 'Enter' && event.altKey) ||
          (event.key === 'd' && (event.metaKey || event.ctrlKey));

        if (isToggleTaskShortcut && _view.state.schema.nodes.taskItem) {
          const { state } = _view;
          const { $from } = state.selection;
          let depth = $from.depth;
          let isInTaskItem = false;
          while (depth > 0) {
            if ($from.node(depth).type.name === 'taskItem') {
              isInTaskItem = true;
              break;
            }
            depth--;
          }

          if (isInTaskItem) {
            event.preventDefault();
            const ed = editorRef.current;
            if (ed) {
              const isChecked = ed.isActive('taskItem', { checked: true });
              ed.chain().focus().updateAttributes('taskItem', { checked: !isChecked }).run();
            }
            return true;
          }
        }

        return false;
      },
    },
  });
  const { clearCompletedTasks, setAllTasksChecked, sortTasks } = useRichEditorTaskActions(editor);
  const { characters, checkedTasks, totalTasks, words } = useRichEditorStats(
    editor,
    editorUpdateTrigger
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const focusBodyEditor = useCallback(() => {
    if (!editor) {
      return;
    }

    editor.commands.focus(editor.isEmpty ? 'start' : 'end');
  }, [editor]);

  const shouldFocusTitle = useMemo(() => {
    const trimmedTitle = node.title.trim();
    return trimmedTitle.length === 0 || DEFAULT_CARD_TITLES.has(trimmedTitle);
  }, [node.title]);

  useEffect(() => {
    setTitle(node.title);
    editor?.commands.setContent(node.contentHtml ?? '<p></p>');
  }, [node.id, node.title, node.contentHtml, editor]);

  const titleRef = useCallback(
    (el: HTMLInputElement | null) => {
      titleInputRef.current = el;
      if (el && shouldFocusTitle) {
        el.focus();
        el.select();
        setInitialFocusTarget('title');
      }
    },
    [shouldFocusTitle]
  );

  useEffect(() => {
    if (editor && !shouldFocusTitle) {
      editor.commands.focus(editor.isEmpty ? 'start' : 'end');
      setInitialFocusTarget('body');
    }
  }, [editor, shouldFocusTitle]);

  useEffect(() => {
    if (initialFocusTarget) {
      const timer = setTimeout(() => {
        setInitialFocusTarget(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [initialFocusTarget]);

  const hasUnsavedChanges = useCallback(() => {
    if (!editor) return false;
    const currentHtml = editor.getHTML();
    const originalHtml = node.contentHtml ?? '';
    return title !== node.title || normalizeHtml(currentHtml) !== normalizeHtml(originalHtml);
  }, [editor, node.title, node.contentHtml, title, editorUpdateTrigger]);

  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges()) {
      const confirmClose = window.confirm(
        isZh
          ? '你有未保存的更改，确定要关闭吗？'
          : 'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    onSave({ ...node, title, contentHtml: html });
    onClose();
  }, [editor, node, title, onSave, onClose]);

  // Keep saveRef current
  useEffect(() => {
    saveRef.current = handleSave;
  }, [handleSave]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isHelpOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeHelp();
          return;
        }
        handleCloseAttempt();
        return;
      }

      const isHelpShortcut = event.key === '/' && (event.metaKey || event.ctrlKey);
      if (isHelpShortcut) {
        event.preventDefault();
        event.stopPropagation();
        toggleHelp();
        return;
      }

      // Save shortcuts: Ctrl+S / Cmd+S or Ctrl+Enter / Cmd+Enter
      const isSaveShortcut =
        (event.key === 's' && (event.metaKey || event.ctrlKey)) ||
        (event.key === 'Enter' && (event.metaKey || event.ctrlKey));

      if (isSaveShortcut) {
        event.preventDefault();
        handleSave();
      }
    },
    [closeHelp, handleCloseAttempt, handleSave, isHelpOpen, toggleHelp]
  );

  const handleTitleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseAttempt();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        focusBodyEditor();
        return;
      }

      // Save shortcuts
      const isSaveShortcut =
        (event.key === 's' && (event.metaKey || event.ctrlKey)) ||
        (event.key === 'Enter' && (event.metaKey || event.ctrlKey));

      if (isSaveShortcut) {
        event.preventDefault();
        handleSave();
      }
    },
    [focusBodyEditor, handleCloseAttempt, handleSave]
  );

  const handleBodyMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('.ProseMirror')) {
        return;
      }

      event.preventDefault();
      focusBodyEditor();
    },
    [focusBodyEditor]
  );

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
  };

  const toggleStrike = () => {
    editor?.chain().focus().toggleStrike().run();
  };

  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  function setTextColor(color: string) {
    if (color) {
      editor?.chain().focus().setColor(color).run();
    } else {
      editor?.chain().focus().unsetColor().run();
    }
  }

  function setHighlight(color: string) {
    if (color) {
      editor?.chain().focus().toggleHighlight({ color }).run();
    } else {
      editor?.chain().focus().unsetHighlight().run();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleCloseAttempt} onKeyDown={handleKeyDown}>
      <div
        className="modal-panel modal-panel--rich-editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={isZh ? '编辑卡片内容' : 'Edit card content'}
      >
        <div className="modal-header">
          <FileText
            size={18}
            className="modal-header-icon"
            style={{ color: 'var(--color-control-icon)' }}
          />
          <input
            id={`modal-title-${node.id}`}
            className="title-input modal-title-input"
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder={isZh ? '卡片标题' : 'Card title'}
            data-initial-focus={initialFocusTarget === 'title' ? 'true' : undefined}
          />
          <div className="modal-meta">
            <span>{isZh ? `卡片 ID: ${node.id}` : `Card ID: ${node.id}`}</span>
          </div>
          <button
            type="button"
            className="toolbar-button modal-close"
            onClick={handleCloseAttempt}
            aria-label={isZh ? '关闭' : 'Close'}
            style={{ border: 'none', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        <RichEditorToolbar
          checkedTasks={checkedTasks}
          editor={editor}
          highlightColors={highlightColors}
          isZh={isZh}
          textColors={textColors}
          onClearCompletedTasks={clearCompletedTasks}
          onSetAllTasksChecked={setAllTasksChecked}
          onSetHighlight={setHighlight}
          onSetTextColor={setTextColor}
          onSortTasks={sortTasks}
          onToggleBold={toggleBold}
          onToggleBulletList={toggleBulletList}
          onToggleItalic={toggleItalic}
          onToggleOrderedList={toggleOrderedList}
          onToggleStrike={toggleStrike}
          onToggleUnderline={toggleUnderline}
        />

        <div
          className="rich-editor"
          data-initial-focus={initialFocusTarget === 'body' ? 'true' : undefined}
          onMouseDown={handleBodyMouseDown}
          onKeyDownCapture={handleKeyDownCapture}
        >
          <div className="rich-editor__paper">
            <EditorContent className="rich-editor__content" editor={editor} />
          </div>
        </div>

        <RichEditorStatusBar
          characters={characters}
          checkedTasks={checkedTasks}
          hasUnsavedChanges={hasUnsavedChanges()}
          isZh={isZh}
          totalTasks={totalTasks}
          words={words}
          onOpenHelp={openHelp}
        />

        <div className="modal-footer">
          <button type="button" className="toolbar-button" onClick={handleCloseAttempt}>
            {isZh ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--primary"
            onClick={handleSave}
            disabled={!editor}
          >
            {isZh ? '保存' : 'Save'}
          </button>
        </div>

        <SlashCommandMenu
          editorRef={editorRef}
          filteredCommands={filteredCommands}
          setSlashMenu={setSlashMenu}
          slashMenu={slashMenu}
        />

        {isHelpOpen ? (
          <ShortcutHelpOverlay
            filteredShortcuts={filteredShortcuts}
            helpSearch={helpSearch}
            isZh={isZh}
            shortcutCategories={shortcutCategories}
            onClose={closeHelp}
            onHelpSearchChange={setHelpSearch}
          />
        ) : null}
      </div>
    </div>
  );
}

function normalizeHtml(html: string): string {
  if (!html) return '';
  let clean = html.trim();
  if (clean === '<p></p>' || clean === '<p><br></p>' || clean === '<p>&nbsp;</p>') {
    return '';
  }
  clean = clean.replace(/<br\s*\/?>/gi, '<br>');
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/\s+/g, ' ');
  return clean;
}
