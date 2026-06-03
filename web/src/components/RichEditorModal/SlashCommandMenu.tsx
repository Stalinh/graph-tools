import type { Editor } from '@tiptap/core';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SlashCommandItem, SlashMenuState } from './richEditorTypes';

interface SlashCommandMenuProps {
  editorRef: MutableRefObject<Editor | null>;
  filteredCommands: SlashCommandItem[];
  setSlashMenu: Dispatch<SetStateAction<SlashMenuState>>;
  slashMenu: SlashMenuState;
}

export function SlashCommandMenu({
  editorRef,
  filteredCommands,
  setSlashMenu,
  slashMenu,
}: SlashCommandMenuProps) {
  if (!slashMenu.isOpen || filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      className="editor-slash-menu"
      style={{
        position: 'fixed',
        top: `${slashMenu.coords.top}px`,
        left: `${slashMenu.coords.left}px`,
        zIndex: 'var(--z-modal-popover)',
      }}
    >
      {filteredCommands.map((cmd, index) => {
        const Icon = cmd.icon;
        const isActive = index === slashMenu.activeIndex;
        return (
          <button
            key={cmd.id}
            type="button"
            className={`editor-slash-menu__item ${isActive ? 'is-active' : ''}`}
            onClick={() => {
              const start = slashMenu.pos - slashMenu.query.length - 1;
              const ed = editorRef.current;
              if (ed) {
                const end = slashMenu.pos;
                const chain = ed.chain().focus().deleteRange({ from: start, to: end });
                cmd.action(chain).run();
              }
              setSlashMenu((prev) => ({ ...prev, isOpen: false }));
            }}
            onMouseEnter={() => setSlashMenu((prev) => ({ ...prev, activeIndex: index }))}
          >
            <div className="editor-slash-menu__icon-wrapper">
              <Icon size={16} />
            </div>
            <div className="editor-slash-menu__details">
              <div className="editor-slash-menu__title">{cmd.title}</div>
              <div className="editor-slash-menu__subtitle">{cmd.subtitle}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
