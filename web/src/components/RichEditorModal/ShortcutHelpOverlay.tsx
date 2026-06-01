import { FileText, X } from "lucide-react";
import { getShortcutDescription } from "./richEditorConfig";
import type { ShortcutItem } from "./richEditorTypes";

interface ShortcutHelpOverlayProps {
  filteredShortcuts: ShortcutItem[];
  helpSearch: string;
  isZh: boolean;
  shortcutCategories: Record<string, string>;
  onClose: () => void;
  onHelpSearchChange: (value: string) => void;
}

export function ShortcutHelpOverlay({
  filteredShortcuts,
  helpSearch,
  isZh,
  shortcutCategories,
  onClose,
  onHelpSearchChange,
}: ShortcutHelpOverlayProps) {
  return (
    <div className="editor-help-overlay" onClick={onClose}>
      <div className="editor-help-panel" onClick={(event) => event.stopPropagation()}>
        <div className="editor-help-header">
          <div className="editor-help-title">
            <FileText size={16} />
            <span>{isZh ? "键盘快捷键与编辑指令" : "Keyboard shortcuts and editor commands"}</span>
          </div>
          <button
            type="button"
            className="toolbar-button modal-close"
            onClick={onClose}
            aria-label={isZh ? "关闭快捷键帮助" : "Close shortcuts help"}
            style={{ border: "none", background: "transparent", margin: 0, padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="editor-help-search-container">
          <input
            type="text"
            className="editor-help-search-input"
            placeholder={isZh ? "搜索快捷键或编辑指令..." : "Search shortcuts or editor commands..."}
            value={helpSearch}
            onChange={(event) => onHelpSearchChange(event.target.value)}
            autoFocus
          />
        </div>

        <div className="editor-help-content">
          {Object.entries(shortcutCategories).map(([catKey, catName]) => {
            const catItems = filteredShortcuts.filter((item) => item.category === catKey);
            if (catItems.length === 0) return null;

            return (
              <div key={catKey} className="editor-help-section">
                <div className="editor-help-section-title">{catName}</div>
                <div className="editor-help-list">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`editor-help-item ${helpSearch ? "is-highlighted" : ""}`}
                    >
                      <span className="editor-help-item-desc">
                        {getShortcutDescription(item.id, isZh)}
                      </span>
                      <div className="editor-help-item-keys">
                        {item.keys.map((key, keyIdx) => (
                          <span
                            key={keyIdx}
                            style={{ display: "inline-flex", alignItems: "center" }}
                          >
                            {keyIdx > 0 && (
                              <span
                                style={{
                                  margin: "0 4px",
                                  fontSize: "11px",
                                  color: "var(--color-muted)",
                                }}
                              >
                                +
                              </span>
                            )}
                            <kbd className="editor-kbd">{key}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredShortcuts.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--color-muted)",
                padding: "20px 0",
                fontSize: "13px",
              }}
            >
              {isZh ? "没有找到匹配的快捷键或指令" : "No matching shortcuts or commands found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
