import { useEffect, useMemo, useRef, useState } from "react";
import { ListTodo, Plus } from "lucide-react";

import { getColorLabel, getNodeTypeLabel, useI18n } from "../i18n";
import { SUPPORTED_NODE_COLORS } from "../lib/nodeColors";
import type { BacklinkItem, GraphNode } from "../types";
import { ReferencesPanel } from "./ReferencesPanel";

interface CardEditorProps {
  node: GraphNode;
  allNodes: GraphNode[];
  backlinks?: BacklinkItem[];
  autoFocusContent?: boolean;
  onReferenceSelect?: (nodeId: string) => void;
  onAutoFocusContentHandled?: () => void;
  onContentCommit?: (contentHtml: string) => void;
  onTitleCommit?: (title: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onColorChange?: (color: string) => void;
  onDeleteCitation?: (targetId: string) => void;
  onReorderReferences?: (newOrder: string[]) => void;
  onCreateCitation?: (targetId: string) => void;
}

export function CardEditor({
  node,
  allNodes,
  backlinks = [],
  autoFocusContent = false,
  onReferenceSelect,
  onAutoFocusContentHandled,
  onContentCommit,
  onTitleCommit,
  onTagsChange,
  onColorChange,
  onDeleteCitation,
  onReorderReferences,
  onCreateCitation,
}: CardEditorProps) {
  const { isZh, locale } = useI18n();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(node.title);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  interface SidebarTaskItem {
    index: number;
    text: string;
    checked: boolean;
  }

  // Parse tasks from node.contentHtml
  const extractTasks = (html: string): SidebarTaskItem[] => {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll('li[data-type="taskItem"]');
    return Array.from(items).map((item, index) => {
      const checked = item.getAttribute("data-checked") === "true";
      const textDiv = item.querySelector("div") || item;
      const text = textDiv.textContent?.trim() || "";
      return { index, text, checked };
    });
  };

  const supportsChecklist = node.type === "card";
  const tasks = useMemo(
    () => (supportsChecklist ? extractTasks(node.contentHtml ?? "") : []),
    [node.contentHtml, supportsChecklist]
  );
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.checked).length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggleTask = (indexToToggle: number, checked: boolean) => {
    if (!onContentCommit) return;
    const html = node.contentHtml ?? "<p></p>";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll('li[data-type="taskItem"]');
    const item = items[indexToToggle];
    if (item) {
      item.setAttribute("data-checked", checked ? "true" : "false");
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox) {
        if (checked) {
          checkbox.setAttribute("checked", "checked");
        } else {
          checkbox.removeAttribute("checked");
        }
      }
      onContentCommit(doc.body.innerHTML);
    }
  };

  const handleAddTask = (text: string) => {
    if (!onContentCommit || !text.trim()) return;
    const html = node.contentHtml ?? "<p></p>";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    let taskList = doc.querySelector('ul[data-type="taskList"]');
    if (!taskList) {
      taskList = doc.createElement("ul");
      taskList.setAttribute("data-type", "taskList");
      doc.body.appendChild(taskList);
    }

    const li = doc.createElement("li");
    li.setAttribute("data-type", "taskItem");
    li.setAttribute("data-checked", "false");

    const label = doc.createElement("label");
    const input = doc.createElement("input");
    input.setAttribute("type", "checkbox");
    label.appendChild(input);
    li.appendChild(label);

    const div = doc.createElement("div");
    const p = doc.createElement("p");
    p.textContent = text.trim();
    div.appendChild(p);
    li.appendChild(div);

    taskList.appendChild(li);
    onContentCommit(doc.body.innerHTML);
  };

  const handleToggleAllTasks = (checked: boolean) => {
    if (!onContentCommit) return;
    const html = node.contentHtml ?? "<p></p>";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll('li[data-type="taskItem"]');
    if (items.length === 0) return;

    items.forEach((item) => {
      item.setAttribute("data-checked", checked ? "true" : "false");
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox) {
        if (checked) {
          checkbox.setAttribute("checked", "checked");
        } else {
          checkbox.removeAttribute("checked");
        }
      }
    });
    onContentCommit(doc.body.innerHTML);
  };

  const handleClearCompletedTasks = () => {
    if (!onContentCommit) return;
    const html = node.contentHtml ?? "<p></p>";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const items = doc.querySelectorAll('li[data-type="taskItem"]');
    let hasChanges = false;

    items.forEach((item) => {
      const checked = item.getAttribute("data-checked") === "true";
      if (checked) {
        const parent = item.parentElement;
        item.remove();
        hasChanges = true;
        if (
          parent &&
          parent.getAttribute("data-type") === "taskList" &&
          parent.children.length === 0
        ) {
          parent.remove();
        }
      }
    });

    if (hasChanges) {
      onContentCommit(doc.body.innerHTML);
    }
  };

  const handleSortTasks = () => {
    if (!onContentCommit) return;
    const html = node.contentHtml ?? "<p></p>";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const lists = doc.querySelectorAll('ul[data-type="taskList"]');
    let hasChanges = false;

    lists.forEach((list) => {
      const items = Array.from(list.querySelectorAll(':scope > li[data-type="taskItem"]'));
      if (items.length <= 1) return;

      const checkedStates = items.map((item) => item.getAttribute("data-checked") === "true");
      let isSorted = true;
      for (let i = 0; i < checkedStates.length - 1; i++) {
        if (checkedStates[i] && !checkedStates[i + 1]) {
          isSorted = false;
          break;
        }
      }

      if (!isSorted) {
        const sorted = [...items].sort((a, b) => {
          const aChecked = a.getAttribute("data-checked") === "true";
          const bChecked = b.getAttribute("data-checked") === "true";
          if (aChecked === bChecked) return 0;
          return aChecked ? 1 : -1;
        });

        list.innerHTML = "";
        sorted.forEach((item) => list.appendChild(item));
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onContentCommit(doc.body.innerHTML);
    }
  };

  useEffect(() => {
    setDraftTitle(node.title);
    setIsEditingTitle(false);
  }, [node.id]);

  useEffect(() => {
    if (tagInputRef.current) {
      tagInputRef.current.value = "";
    }
  }, [node.id]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!autoFocusContent) {
      return;
    }

    tagInputRef.current?.focus();
    onAutoFocusContentHandled?.();
  }, [autoFocusContent, onAutoFocusContentHandled, node.id]);

  return (
    <div className="editor-panel">
      <section className="field-section">
        <h3 className="field-label">{isZh ? "属性" : "Properties"}</h3>
        <dl className="properties-list">
          <div className="property">
            <dt>{isZh ? "标题" : "Title"}</dt>
            <dd>
              {isEditingTitle ? (
                <textarea
                  ref={titleInputRef}
                  className="image-editor__title-input property-input property-input--center card-editor__title-input"
                  aria-label={isZh ? "卡片标题" : "Card title"}
                  rows={3}
                  value={draftTitle}
                  onBlur={() => {
                    if (draftTitle !== node.title) {
                      onTitleCommit?.(draftTitle);
                    }
                    setIsEditingTitle(false);
                  }}
                  onChange={(event) => {
                    setDraftTitle(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setDraftTitle(node.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  placeholder={isZh ? "未命名卡片" : "Untitled card"}
                />
              ) : (
                <button
                  type="button"
                  className="property-value-button property-value-button--center"
                  aria-label={isZh ? "编辑卡片标题" : "Edit card title"}
                  onClick={() => setIsEditingTitle(true)}
                >
                  {node.title}
                </button>
              )}
            </dd>
          </div>
          <div className="property">
            <dt>ID</dt>
            <dd>{node.id}</dd>
          </div>
          <div className="property">
            <dt>{isZh ? "类型" : "Type"}</dt>
            <dd>{getNodeTypeLabel(node.type, locale)}</dd>
          </div>
        </dl>
      </section>

      <section className="field-section">
        <h3 className="field-label">{isZh ? "颜色" : "Color"}</h3>
        <div
          className="color-palette"
          role="radiogroup"
          aria-label={isZh ? "卡片颜色" : "Card color"}
        >
          <button
            type="button"
            role="radio"
            aria-checked={(node.color || "") === ""}
            className={`color-swatch color-swatch--default${(node.color || "") === "" ? " is-active" : ""}`}
            title={getColorLabel("", locale)}
            aria-label={getColorLabel("", locale)}
            onClick={() => onColorChange?.("")}
          />
          {SUPPORTED_NODE_COLORS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={(node.color || "") === key}
              className={`color-swatch color-swatch--${key}${(node.color || "") === key ? " is-active" : ""}`}
              title={getColorLabel(key, locale)}
              aria-label={getColorLabel(key, locale)}
              onClick={() => onColorChange?.(key)}
            />
          ))}
        </div>
      </section>

      <section className="field-section">
        <h3 className="field-label">{isZh ? "标签" : "Tags"}</h3>
        <div className="tags-editor">
          {node.tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
              <button
                type="button"
                className="tag-pill__remove"
                aria-label={isZh ? `删除标签 "${tag}"` : `Remove tag "${tag}"`}
                onClick={() => {
                  const next = node.tags.filter((t) => t !== tag);
                  onTagsChange?.(next);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            className="tag-input"
            type="text"
            placeholder={isZh ? "输入标签后回车" : "Type a tag and press Enter"}
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const input = tagInputRef.current;
                if (!input) return;
                const trimmed = input.value.trim();
                if (!trimmed) return;
                if (!node.tags.includes(trimmed)) {
                  onTagsChange?.([...node.tags, trimmed]);
                }
                input.value = "";
              }
              if (e.key === "Backspace" && !tagInputRef.current?.value && node.tags.length > 0) {
                onTagsChange?.(node.tags.slice(0, -1));
              }
            }}
          />
        </div>
      </section>

      {supportsChecklist ? (
        <section className="field-section card-editor__todo-section">
          <h3 className="field-label card-editor__todo-label">
            <ListTodo
              size={14}
              className="card-editor__todo-icon"
              style={{ marginRight: "6px", display: "inline", verticalAlign: "middle" }}
            />
            {isZh ? "待办清单" : "Checklist"}
          </h3>

          {totalCount > 0 && (
            <div className="todo-progress">
              <div className="todo-progress__label">
                <span>{isZh ? "完成度" : "Progress"}</span>
                <span>
                  {completedCount}/{totalCount} ({percentage}%)
                </span>
              </div>
              <div className="todo-progress__track">
                <div className="todo-progress__fill" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          )}

          {totalCount > 0 && (
            <div className="todo-batch-actions">
              <button
                type="button"
                onClick={() => handleToggleAllTasks(true)}
                title={isZh ? "全部标记已完成" : "Mark all complete"}
              >
                {isZh ? "全部勾选" : "Check all"}
              </button>
              <span className="todo-batch-actions__divider">|</span>
              <button
                type="button"
                onClick={() => handleToggleAllTasks(false)}
                title={isZh ? "全部标记未完成" : "Mark all incomplete"}
              >
                {isZh ? "全部取消" : "Uncheck all"}
              </button>
              <span className="todo-batch-actions__divider">|</span>
              <button
                type="button"
                onClick={handleSortTasks}
                title={isZh ? "未完成置顶" : "Sort incomplete first"}
              >
                {isZh ? "整理待办" : "Sort tasks"}
              </button>
              <span className="todo-batch-actions__divider">|</span>
              <button
                type="button"
                className="todo-batch-actions__clear"
                onClick={handleClearCompletedTasks}
                title={isZh ? "清除所有已完成任务" : "Clear completed tasks"}
              >
                {isZh ? "清除已完成" : "Clear completed"}
              </button>
            </div>
          )}

          {totalCount > 0 ? (
            <div className="sidebar-todo-list">
              {tasks.map((task) => (
                <div
                  key={task.index}
                  className={`sidebar-todo-item ${task.checked ? "is-checked" : ""}`}
                >
                  <input
                    type="checkbox"
                    id={`sidebar-todo-chk-${node.id}-${task.index}`}
                    checked={task.checked}
                    onChange={(e) => handleToggleTask(task.index, e.target.checked)}
                  />
                  <label
                    htmlFor={`sidebar-todo-chk-${node.id}-${task.index}`}
                    className="sidebar-todo-item__text"
                  >
                    {task.text}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="sidebar-todo-empty">
              {isZh
                ? "暂无待办事项，在下方输入以开始。"
                : "No tasks yet. Add one below to get started."}
            </div>
          )}

          <form
            className="sidebar-todo-add"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input");
              if (input && input.value.trim()) {
                handleAddTask(input.value.trim());
                input.value = "";
              }
            }}
          >
            <input
              type="text"
              className="sidebar-todo-add__input"
              placeholder={isZh ? "添加新待办..." : "Add a new task..."}
            />
            <button
              type="submit"
              className="sidebar-todo-add__btn"
              aria-label={isZh ? "添加待办" : "Add task"}
            >
              <Plus size={14} />
            </button>
          </form>
        </section>
      ) : null}

      {node.customFields && node.customFields.length > 0 && (
        <section className="field-section">
          <h3 className="field-label">{isZh ? "自定义字段" : "Custom fields"}</h3>
          <dl className="custom-fields-list">
            {node.customFields.map((field) => (
              <div key={field.id} className="custom-field">
                <dt>{field.field}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <ReferencesPanel
        node={node}
        allNodes={allNodes}
        backlinks={backlinks}
        onReferenceSelect={onReferenceSelect}
        onCreateCitation={onCreateCitation}
        onDeleteCitation={onDeleteCitation}
        onReorderReferences={onReorderReferences}
      />
    </div>
  );
}
