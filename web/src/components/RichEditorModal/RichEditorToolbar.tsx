import type { Editor } from "@tiptap/core";
import {
  Bold,
  Code,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo,
  Strikethrough,
  Terminal,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";

interface RichEditorColorOption {
  label: string;
  value: string;
}

interface RichEditorToolbarProps {
  checkedTasks: number;
  editor: Editor | null;
  highlightColors: RichEditorColorOption[];
  isZh: boolean;
  textColors: RichEditorColorOption[];
  onClearCompletedTasks: () => void;
  onSetAllTasksChecked: (checked: boolean) => void;
  onSetHighlight: (color: string) => void;
  onSetTextColor: (color: string) => void;
  onSortTasks: () => void;
  onToggleBold: () => void;
  onToggleBulletList: () => void;
  onToggleItalic: () => void;
  onToggleOrderedList: () => void;
  onToggleStrike: () => void;
  onToggleUnderline: () => void;
}

export function RichEditorToolbar({
  checkedTasks,
  editor,
  highlightColors,
  isZh,
  textColors,
  onClearCompletedTasks,
  onSetAllTasksChecked,
  onSetHighlight,
  onSetTextColor,
  onSortTasks,
  onToggleBold,
  onToggleBulletList,
  onToggleItalic,
  onToggleOrderedList,
  onToggleStrike,
  onToggleUnderline,
}: RichEditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar__section">
        <div className="editor-toolbar__section-content">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => editor?.chain().focus().undo().run()}
            title={isZh ? "撤销 (Ctrl+Z)" : "Undo (Ctrl+Z)"}
            disabled={!editor || !editor.can().undo()}
          >
            <Undo size={15} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => editor?.chain().focus().redo().run()}
            title={isZh ? "重做 (Ctrl+Shift+Z)" : "Redo (Ctrl+Shift+Z)"}
            disabled={!editor || !editor.can().redo()}
          >
            <Redo size={15} />
          </button>
        </div>
        <div className="editor-toolbar__section-label">{isZh ? "历史" : "History"}</div>
      </div>

      <div className="editor-toolbar__section">
        <div className="editor-toolbar__section-content">
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("paragraph") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().setParagraph().run()}
            title={isZh ? "正文 (Ctrl+Alt+0)" : "Paragraph (Ctrl+Alt+0)"}
            disabled={!editor}
          >
            <Pilcrow size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${
              editor?.isActive("heading", { level: 1 }) ? "is-active" : ""
            }`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            title={isZh ? "标题 1 (Ctrl+Alt+1)" : "Heading 1 (Ctrl+Alt+1)"}
            disabled={!editor}
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${
              editor?.isActive("heading", { level: 2 }) ? "is-active" : ""
            }`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            title={isZh ? "标题 2 (Ctrl+Alt+2)" : "Heading 2 (Ctrl+Alt+2)"}
            disabled={!editor}
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${
              editor?.isActive("heading", { level: 3 }) ? "is-active" : ""
            }`}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            title={isZh ? "标题 3 (Ctrl+Alt+3)" : "Heading 3 (Ctrl+Alt+3)"}
            disabled={!editor}
          >
            <Heading3 size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("blockquote") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title={isZh ? "引用段落 (Ctrl+Shift+B)" : "Quote block (Ctrl+Shift+B)"}
            disabled={!editor}
          >
            <Quote size={15} />
          </button>
        </div>
        <div className="editor-toolbar__section-label">{isZh ? "排版格式" : "Typography"}</div>
      </div>

      <div className="editor-toolbar__section">
        <div className="editor-toolbar__section-content">
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("bold") ? "is-active" : ""}`}
            onClick={onToggleBold}
            title={isZh ? "加粗 (Ctrl+B)" : "Bold (Ctrl+B)"}
            disabled={!editor}
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("italic") ? "is-active" : ""}`}
            onClick={onToggleItalic}
            title={isZh ? "斜体 (Ctrl+I)" : "Italic (Ctrl+I)"}
            disabled={!editor}
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("underline") ? "is-active" : ""}`}
            onClick={onToggleUnderline}
            title={isZh ? "下划线 (Ctrl+U)" : "Underline (Ctrl+U)"}
            disabled={!editor}
          >
            <UnderlineIcon size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("strike") ? "is-active" : ""}`}
            onClick={onToggleStrike}
            title={isZh ? "删除线" : "Strikethrough"}
            disabled={!editor}
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("code") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleCode().run()}
            title={isZh ? "行内代码 (Ctrl+E)" : "Inline code (Ctrl+E)"}
            disabled={!editor}
          >
            <Code size={15} />
          </button>

          <div className="editor-toolbar__separator" />

          <div className="editor-toolbar__dropdown">
            <button
              type="button"
              className="toolbar-button"
              title={isZh ? "文本颜色" : "Text color"}
              disabled={!editor}
            >
              <Palette size={15} />
            </button>
            <div className="editor-toolbar__dropdown-menu">
              {textColors.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  className="editor-toolbar__color-option"
                  onClick={() => onSetTextColor(value)}
                >
                  <span
                    className="editor-toolbar__color-swatch"
                    style={
                      value
                        ? { backgroundColor: value }
                        : { border: "1px dashed var(--color-border-strong)" }
                    }
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="editor-toolbar__dropdown">
            <button
              type="button"
              className="toolbar-button"
              title={isZh ? "背景高亮" : "Highlight color"}
              disabled={!editor}
            >
              <Highlighter size={15} />
            </button>
            <div className="editor-toolbar__dropdown-menu">
              {highlightColors.map(({ label, value }) => (
                <button
                  key={value ?? "none"}
                  type="button"
                  className="editor-toolbar__color-option"
                  onClick={() => onSetHighlight(value)}
                >
                  <span
                    className="editor-toolbar__color-swatch"
                    style={
                      value
                        ? { backgroundColor: value }
                        : { border: "1px dashed var(--color-border-strong)" }
                    }
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="editor-toolbar__separator" />

          <button
            type="button"
            className="toolbar-button"
            onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            title={isZh ? "清除格式" : "Clear formatting"}
            disabled={!editor}
          >
            <Eraser size={15} />
          </button>
        </div>
        <div className="editor-toolbar__section-label">{isZh ? "字符样式" : "Text styles"}</div>
      </div>

      <div className="editor-toolbar__section">
        <div className="editor-toolbar__section-content">
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("bulletList") ? "is-active" : ""}`}
            onClick={onToggleBulletList}
            title={isZh ? "无序列表 (Ctrl+Shift+8)" : "Bulleted list (Ctrl+Shift+8)"}
            disabled={!editor}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("orderedList") ? "is-active" : ""}`}
            onClick={onToggleOrderedList}
            title={isZh ? "有序列表 (Ctrl+Shift+9)" : "Numbered list (Ctrl+Shift+9)"}
            disabled={!editor}
          >
            <ListOrdered size={15} />
          </button>

          <div className="editor-toolbar__dropdown">
            <button
              type="button"
              className={`toolbar-button ${editor?.isActive("taskList") ? "is-active" : ""}`}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              title={
                isZh
                  ? "任务列表 (待办清单) - 输入 [] 自动创建"
                  : "Checklist - type [] to create automatically"
              }
              disabled={!editor}
            >
              <ListTodo size={15} />
            </button>
            <div className="editor-toolbar__dropdown-menu" style={{ minWidth: "150px" }}>
              <button
                type="button"
                className="editor-toolbar__color-option"
                onClick={() => {
                  if (editor) {
                    const isChecked = editor.isActive("taskItem", { checked: true });
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("taskItem", { checked: !isChecked })
                      .run();
                  }
                }}
                disabled={!editor || !editor.isActive("taskItem")}
              >
                <span>{isZh ? "勾选 / 取消当前任务" : "Toggle current task"}</span>
              </button>
              <button
                type="button"
                className="editor-toolbar__color-option"
                onClick={() => onSetAllTasksChecked(true)}
                disabled={!editor}
              >
                <span>{isZh ? "全部标记为已完成" : "Mark all complete"}</span>
              </button>
              <button
                type="button"
                className="editor-toolbar__color-option"
                onClick={() => onSetAllTasksChecked(false)}
                disabled={!editor}
              >
                <span>{isZh ? "全部标记为未完成" : "Mark all incomplete"}</span>
              </button>
              <button
                type="button"
                className="editor-toolbar__color-option"
                onClick={onSortTasks}
                disabled={!editor}
              >
                <span>{isZh ? "整理待办 (未完成在前)" : "Sort tasks (incomplete first)"}</span>
              </button>
              <button
                type="button"
                className="editor-toolbar__color-option"
                style={{ color: "#ef4444" }}
                onClick={onClearCompletedTasks}
                disabled={!editor || checkedTasks === 0}
              >
                <span>{isZh ? "清除已完成待办" : "Clear completed tasks"}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`toolbar-button ${editor?.isActive("codeBlock") ? "is-active" : ""}`}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title={isZh ? "插入代码块 (Ctrl+Alt+C)" : "Insert code block (Ctrl+Alt+C)"}
            disabled={!editor}
          >
            <Terminal size={15} />
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title={isZh ? "插入分割线" : "Insert divider"}
            disabled={!editor}
          >
            <Minus size={15} />
          </button>
        </div>
        <div className="editor-toolbar__section-label">{isZh ? "段落结构" : "Structure"}</div>
      </div>
    </div>
  );
}
