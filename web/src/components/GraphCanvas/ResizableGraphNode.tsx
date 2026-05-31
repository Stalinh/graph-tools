import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useI18n } from "../../i18n";
import type { GraphNode } from "../../types";
import { renderCardContent } from "./GraphNodeContent";

interface ResizableFlowNodeData {
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
  onReferenceSelect: (nodeId: string | null) => void;
  onNodeMouseDown?: (event: MouseEvent, nodeId: string) => void;
}

export function ResizableGraphNode({ data }: NodeProps<Node<ResizableFlowNodeData>>) {
  const { isZh, locale } = useI18n();
  const { isQuickEditing, node, onQuickEditSubmit, onReferenceSelect } = data;
  const searchQuery = data.searchQuery;
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

  const content = useMemo<ReactNode>(
    () => renderCardContent(node, onReferenceSelect, searchQuery, locale),
    [locale, node.id, node.contentHtml, node.references, onReferenceSelect, searchQuery]
  );

  const commitQuickEdit = (options?: { focusInspectorContent?: boolean }) => {
    if (hasCommittedRef.current || !isQuickEditing) {
      return;
    }

    hasCommittedRef.current = true;
    onQuickEditSubmit(node.id, draftTitle, options);
  };

  return (
    <>
      <Handle
        id="citation-target"
        className="graph-node__handle graph-node__handle--target nodrag nopan"
        position={Position.Left}
        type="target"
        isConnectableStart={false}
        title={isZh ? "拖拽引用连接到这里" : "Drop a citation link here"}
      />
      <Handle
        id="citation-source"
        className="graph-node__handle graph-node__handle--source nodrag nopan"
        position={Position.Right}
        type="source"
        isConnectableEnd={false}
        title={isZh ? "拖拽创建引用" : "Drag to create a citation link"}
      />
      <div
        className="graph-node__label"
        data-card-color={node.color || undefined}
        onMouseDown={(event) => data.onNodeMouseDown?.(event, node.id)}
      >
        {node.locked ? (
          <span
            className="graph-node__lock-badge"
            aria-label={isZh ? "已锁定节点" : "Locked node"}
            title={isZh ? "已锁定节点" : "Locked node"}
          >
            <Lock aria-hidden="true" size={12} />
          </span>
        ) : null}
        {isQuickEditing ? (
          <>
            <input
              ref={titleInputRef}
              type="text"
              className="graph-node__title-input"
              aria-label={isZh ? "快速编辑卡片标题" : "Quick card title"}
              value={draftTitle}
              onBlur={() => commitQuickEdit()}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  commitQuickEdit({ focusInspectorContent: true });
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  commitQuickEdit();
                }
              }}
            />
            <strong className="graph-node__title-ghost" aria-hidden="true">
              {draftTitle}
            </strong>
          </>
        ) : data.searchQuery &&
          node.title.toLowerCase().includes(data.searchQuery.toLowerCase()) ? (
          <strong
            dangerouslySetInnerHTML={{
              __html: highlightTitleHtml(node.title, data.searchQuery),
            }}
          />
        ) : (
          <strong>{node.title}</strong>
        )}
        {content ? <div className="graph-node__content">{content}</div> : null}
        {node.tags.length > 0 ? (
          <div className="graph-node__tags">
            {node.tags.map((tag) => (
              <span key={tag} className="graph-node__tag-pill">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightTitleHtml(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const lowerQuery = query.toLowerCase();
  let result = "";
  let remaining = text;
  while (remaining.length > 0) {
    const lowerRemaining = remaining.toLowerCase();
    const idx = lowerRemaining.indexOf(lowerQuery);
    if (idx === -1) {
      result += escapeHtml(remaining);
      break;
    }
    if (idx > 0) {
      result += escapeHtml(remaining.slice(0, idx));
    }
    result += `<mark class="search-highlight">${escapeHtml(remaining.slice(idx, idx + query.length))}</mark>`;
    remaining = remaining.slice(idx + query.length);
  }
  return result;
}
