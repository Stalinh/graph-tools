import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { Lock, Plus } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getDefaultGroupTitle, useI18n } from "../../i18n";
import { GRAPH_GRID_SIZE, constrainGroupNodeSize } from "../../lib/graphLayout";
import type { GraphNode } from "../../types";

interface GroupNodeData {
  [key: string]: unknown;
  isQuickEditing: boolean;
  isSelected: boolean;
  node: GraphNode;
  searchQuery?: string;
  onQuickEditSubmit: (
    nodeId: string,
    title: string,
    options?: { focusInspectorContent?: boolean }
  ) => void;
  onNodeMouseDown?: (event: MouseEvent, nodeId: string) => void;
  childCount?: number;
  onQuickAddChild?: (parentId: string) => void;
  onNodeResize?: (nodeId: string) => void;
  onNodeResizeEnd?: (nodeId: string, size: { width: number; height: number }) => void;
}

export function GroupNode({ data, selected }: NodeProps<Node<GroupNodeData>>) {
  const { isZh, locale } = useI18n();
  const {
    isQuickEditing,
    node,
    onQuickEditSubmit,
    childCount = 0,
    onQuickAddChild,
    onNodeResize,
    onNodeResizeEnd,
  } = data;
  const [draftTitle, setDraftTitle] = useState(node.title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const hasCommittedRef = useRef(false);

  useEffect(() => {
    setDraftTitle(node.title);
    hasCommittedRef.current = false;
  }, [node.id, node.title, isQuickEditing]);

  useEffect(() => {
    if (!isQuickEditing) {
      return;
    }
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isQuickEditing]);

  const commitQuickEdit = (options?: { focusInspectorContent?: boolean }) => {
    if (hasCommittedRef.current || !isQuickEditing) {
      return;
    }
    hasCommittedRef.current = true;
    onQuickEditSubmit(node.id, draftTitle, options);
  };

  return (
    <div
      className={`group-node-container ${node.color ? `group-node--${node.color}` : ""}`}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {!node.locked && selected && (
        <NodeResizer
          lineClassName="group-node__resize-line"
          handleClassName="group-node__resize-handle"
          minWidth={GRAPH_GRID_SIZE}
          minHeight={GRAPH_GRID_SIZE}
          onResize={() => onNodeResize?.(node.id)}
          onResizeEnd={(event, params) => {
            onNodeResizeEnd?.(
              node.id,
              constrainGroupNodeSize({ width: params.width, height: params.height })
            );
          }}
        />
      )}

      {/* Header bar */}
      <div
        className="group-node__header drag-handle"
        onMouseDown={(event) => data.onNodeMouseDown?.(event, node.id)}
      >
        <div className="group-node__header-left">
          <div className="group-node__accent-bar" />
          {node.locked && <Lock size={12} className="group-node__lock-icon" />}
          {isQuickEditing ? (
            <input
              ref={titleInputRef}
              type="text"
              className="group-node__title-input"
              value={draftTitle}
              onBlur={() => commitQuickEdit()}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  commitQuickEdit({ focusInspectorContent: true });
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  commitQuickEdit();
                }
              }}
            />
          ) : (
            <span className="group-node__title">{node.title || getDefaultGroupTitle(locale)}</span>
          )}
          <span className="group-node__badge">
            {isZh ? `${childCount} 张卡片` : `${childCount} card${childCount === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="group-node__header-right">
          {!node.locked && onQuickAddChild && (
            <button
              type="button"
              className="group-node__add-btn"
              title={isZh ? "添加卡片到此分组" : "Add card to this group"}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddChild(node.id);
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body background container */}
      <div className="group-node__body" />
    </div>
  );
}
