interface RichEditorStatusBarProps {
  characters: number;
  checkedTasks: number;
  hasUnsavedChanges: boolean;
  isZh: boolean;
  totalTasks: number;
  words: number;
  onOpenHelp: () => void;
}

export function RichEditorStatusBar({
  characters,
  checkedTasks,
  hasUnsavedChanges,
  isZh,
  totalTasks,
  words,
  onOpenHelp,
}: RichEditorStatusBarProps) {
  return (
    <div className="editor-status-bar">
      <div className="editor-status-bar__stats">
        <span>{isZh ? `字数: ${words}` : `Words: ${words}`}</span>
        <span>{isZh ? `字符数: ${characters}` : `Characters: ${characters}`}</span>
        {totalTasks > 0 && (
          <span
            className="editor-status-bar__task-stats"
            style={{ color: "var(--color-accent)", fontWeight: "600" }}
          >
            {isZh ? "待办进度" : "Checklist progress"}: {checkedTasks}/{totalTasks} (
            {Math.round((checkedTasks / totalTasks) * 100)}%)
          </span>
        )}
      </div>
      <div className="editor-status-bar__shortcuts">
        <span>
          {isZh ? "快捷键: ⌘S 保存 | Esc 取消 | " : "Shortcuts: ⌘S Save | Esc Cancel | "}
        </span>
        <button
          type="button"
          onClick={onOpenHelp}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-accent)",
            cursor: "pointer",
            padding: "0 2px",
            fontSize: "inherit",
            fontWeight: "600",
            textDecoration: "underline",
            outline: "none",
          }}
          title={isZh ? "查看所有快捷键和编辑指令 (⌘/)" : "View all shortcuts and commands (⌘/)"}
        >
          {isZh ? "快捷键说明 (⌘/)" : "Shortcut guide (⌘/)"}
        </button>
      </div>
      <div className={`editor-status-bar__save-state ${hasUnsavedChanges ? "is-dirty" : "is-clean"}`}>
        <span>
          {hasUnsavedChanges
            ? isZh
              ? "● 未保存"
              : "● Unsaved"
            : isZh
              ? "✓ 已保存"
              : "✓ Saved"}
        </span>
      </div>
    </div>
  );
}
