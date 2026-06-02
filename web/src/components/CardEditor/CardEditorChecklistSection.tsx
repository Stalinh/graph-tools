import { ListTodo, Plus } from "lucide-react";
import type { SidebarTaskItem } from "./cardChecklistUtils";

interface CardEditorChecklistSectionProps {
  completedCount: number;
  isZh: boolean;
  nodeId: string;
  onAddTask: (text: string) => void;
  onClearCompletedTasks: () => void;
  onSortTasks: () => void;
  onToggleAllTasks: (checked: boolean) => void;
  onToggleTask: (taskPath: string, checked: boolean) => void;
  percentage: number;
  tasks: SidebarTaskItem[];
  totalCount: number;
}

export function CardEditorChecklistSection({
  completedCount,
  isZh,
  nodeId,
  onAddTask,
  onClearCompletedTasks,
  onSortTasks,
  onToggleAllTasks,
  onToggleTask,
  percentage,
  tasks,
  totalCount,
}: CardEditorChecklistSectionProps) {
  return (
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
            onClick={() => onToggleAllTasks(true)}
            title={isZh ? "全部标记已完成" : "Mark all complete"}
          >
            {isZh ? "全部勾选" : "Check all"}
          </button>
          <span className="todo-batch-actions__divider">|</span>
          <button
            type="button"
            onClick={() => onToggleAllTasks(false)}
            title={isZh ? "全部标记未完成" : "Mark all incomplete"}
          >
            {isZh ? "全部取消" : "Uncheck all"}
          </button>
          <span className="todo-batch-actions__divider">|</span>
          <button
            type="button"
            onClick={onSortTasks}
            title={isZh ? "未完成置顶" : "Sort incomplete first"}
          >
            {isZh ? "整理待办" : "Sort tasks"}
          </button>
          <span className="todo-batch-actions__divider">|</span>
          <button
            type="button"
            className="todo-batch-actions__clear"
            onClick={onClearCompletedTasks}
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
              key={task.path}
              className={`sidebar-todo-item ${task.checked ? "is-checked" : ""}`}
              data-task-path={task.path}
              style={{ paddingLeft: `${8 + task.depth * 14}px` }}
            >
              <input
                type="checkbox"
                id={`sidebar-todo-chk-${nodeId}-${task.path}`}
                checked={task.checked}
                onChange={(event) => onToggleTask(task.path, event.target.checked)}
              />
              <label
                htmlFor={`sidebar-todo-chk-${nodeId}-${task.path}`}
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
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = form.elements.namedItem("todoText");
          if (!(input instanceof HTMLInputElement) || !input.value.trim()) {
            return;
          }

          onAddTask(input.value.trim());
          input.value = "";
        }}
      >
        <input
          type="text"
          name="todoText"
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
  );
}
