import { useMemo, useRef } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useI18n } from "../i18n";
import type { BacklinkItem, EdgeDirection, EdgeStyle, GraphEdge, GraphNode } from "../types";
import { CardEditor } from "./CardEditor";
import { EdgeEditor } from "./EdgeEditor";
import { ImageEditor } from "./ImageEditor";
import { MultiSelectInspector } from "./MultiSelectInspector";

interface InspectorProps {
  node: GraphNode | null;
  selectedNodes?: GraphNode[];
  autoFocusContent?: boolean;
  isCollapsed?: boolean;
  edge?: GraphEdge | null;
  sourceNode?: GraphNode | null;
  targetNode?: GraphNode | null;
  backlinks?: BacklinkItem[];
  allEdges?: GraphEdge[];
  allNodes?: GraphNode[];
  onCollapseToggle?: () => void;
  onAutoFocusContentHandled?: () => void;
  onSelectNode?: (nodeId: string) => void;
  onEdgeDirectionChange?: (edgeId: string, direction: EdgeDirection) => void;
  onEdgeStyleChange?: (edgeId: string, style: EdgeStyle) => void;
  onEdgeColorChange?: (edgeId: string, color: string) => void;
  onDeleteEdge?: (edge: GraphEdge) => void;
  onColorChange?: (nodeId: string, color: string) => void;
  onDeleteCitation?: (sourceId: string, targetId: string) => void;
  onReorderReferences?: (sourceId: string, newOrder: string[]) => void;
  onCreateCitation?: (sourceId: string, targetId: string) => void;
  onCommitNode?: (node: GraphNode) => void;
  onBatchDelete?: () => void;
  onBatchColorChange?: (color: string) => void;
  onBatchLockChange?: (locked: boolean) => void;
}

export function Inspector({
  node,
  selectedNodes = [],
  autoFocusContent = false,
  isCollapsed = false,
  edge,
  sourceNode,
  targetNode,
  backlinks: backlinksProp,
  allEdges = [],
  allNodes = [],
  onCollapseToggle,
  onAutoFocusContentHandled,
  onSelectNode,
  onEdgeDirectionChange,
  onEdgeStyleChange,
  onEdgeColorChange,
  onDeleteEdge,
  onColorChange,
  onDeleteCitation,
  onReorderReferences,
  onCreateCitation,
  onCommitNode,
  onBatchDelete,
  onBatchColorChange,
  onBatchLockChange,
}: InspectorProps) {
  const { isZh } = useI18n();
  const collapseLabel = isZh ? "收起检查器" : "Collapse inspector";
  const expandLabel = isZh ? "展开检查器" : "Expand inspector";

  const nodeRef = useRef(node);
  nodeRef.current = node;

  const propsRef = useRef({
    onColorChange,
    onCreateCitation,
    onDeleteCitation,
    onReorderReferences,
    onCommitNode,
  });
  propsRef.current = {
    onColorChange,
    onCreateCitation,
    onDeleteCitation,
    onReorderReferences,
    onCommitNode,
  };

  const nodeId = node?.id;

  const backlinks = useMemo<BacklinkItem[]>(() => {
    if (backlinksProp !== undefined) {
      return backlinksProp;
    }
    if (!nodeId || !allNodes || !allEdges) return [];
    const nodesById = new Map(allNodes.map((n) => [n.id, n]));
    return allEdges
      .filter((edge) => edge.targetId === nodeId)
      .map((edge) => {
        const sourceNode = nodesById.get(edge.sourceId);
        return { id: edge.sourceId, title: sourceNode?.title ?? edge.sourceId };
      });
  }, [backlinksProp, allNodes, allEdges, nodeId]);

  const memoizedCallbacks = useMemo(() => {
    return {
      onColorChange: (color: string) => {
        if (nodeId) {
          propsRef.current.onColorChange?.(nodeId, color);
        }
      },
      onCreateCitation: (targetId: string) => {
        if (nodeId) {
          propsRef.current.onCreateCitation?.(nodeId, targetId);
        }
      },
      onDeleteCitation: (targetId: string) => {
        if (nodeId) {
          propsRef.current.onDeleteCitation?.(nodeId, targetId);
        }
      },
      onReorderReferences: (newOrder: string[]) => {
        if (nodeId) {
          propsRef.current.onReorderReferences?.(nodeId, newOrder);
        }
      },

      onContentCommit: (contentHtml: string) => {
        const currentNode = nodeRef.current;
        if (currentNode) {
          propsRef.current.onCommitNode?.({ ...currentNode, contentHtml });
        }
      },
      onTitleCommit: (title: string) => {
        const currentNode = nodeRef.current;
        if (currentNode) {
          propsRef.current.onCommitNode?.({ ...currentNode, title });
        }
      },
      onTagsChange: (tags: string[]) => {
        const currentNode = nodeRef.current;
        if (currentNode) {
          propsRef.current.onCommitNode?.({ ...currentNode, tags });
        }
      },
    };
  }, [nodeId]);

  return (
    <aside
      className={`inspector ${isCollapsed ? "is-collapsed" : ""}`}
      aria-label={isZh ? "检查器" : "Inspector"}
    >
      <div className="inspector__header">
        <span className="inspector__title">{isZh ? "检查器" : "Inspector"}</span>
        <div className="inspector__actions">
          {onCollapseToggle ? (
            <button
              className="icon-button"
              type="button"
              aria-label={isCollapsed ? expandLabel : collapseLabel}
              title={isCollapsed ? expandLabel : collapseLabel}
              onClick={onCollapseToggle}
            >
              {isCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
            </button>
          ) : null}
        </div>
      </div>
      {isCollapsed ? null : (
        <div className="inspector__content">
          {edge ? (
            <div className="inspector__body">
              <EdgeEditor
                edge={edge}
                sourceNode={sourceNode ?? undefined}
                targetNode={targetNode ?? undefined}
                onDelete={onDeleteEdge}
                onColorChange={onEdgeColorChange ?? (() => {})}
                onDirectionChange={onEdgeDirectionChange ?? (() => {})}
                onStyleChange={onEdgeStyleChange ?? (() => {})}
              />
            </div>
          ) : selectedNodes.length > 1 ? (
            <MultiSelectInspector
              nodes={selectedNodes}
              onBatchColorChange={onBatchColorChange}
              onBatchDelete={onBatchDelete}
              onBatchLockChange={onBatchLockChange}
            />
          ) : node === null ? (
            <GraphLegend isZh={isZh} />
          ) : node.type === "image" ? (
            <div className="inspector__body">
              <ImageEditor
                allNodes={allNodes}
                backlinks={backlinks}
                node={node}
                onColorChange={memoizedCallbacks.onColorChange}
                onCreateCitation={memoizedCallbacks.onCreateCitation}
                onDeleteCitation={memoizedCallbacks.onDeleteCitation}
                onReferenceSelect={onSelectNode}
                onReorderReferences={memoizedCallbacks.onReorderReferences}
                onTitleCommit={memoizedCallbacks.onTitleCommit}
              />
            </div>
          ) : (
            <div className="inspector__body">
              <CardEditor
                allNodes={allNodes}
                autoFocusContent={autoFocusContent}
                backlinks={backlinks}
                node={node}
                onAutoFocusContentHandled={onAutoFocusContentHandled}
                onContentCommit={memoizedCallbacks.onContentCommit}
                onTitleCommit={memoizedCallbacks.onTitleCommit}
                onTagsChange={memoizedCallbacks.onTagsChange}
                onColorChange={memoizedCallbacks.onColorChange}
                onCreateCitation={memoizedCallbacks.onCreateCitation}
                onDeleteCitation={memoizedCallbacks.onDeleteCitation}
                onReferenceSelect={onSelectNode}
                onReorderReferences={memoizedCallbacks.onReorderReferences}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function GraphLegend({ isZh }: { isZh: boolean }) {
  return (
    <div className="inspector__body graph-legend" aria-label={isZh ? "图例" : "Graph legend"}>
      <section className="legend-section" aria-labelledby="legend-nodes">
        <h2 id="legend-nodes">{isZh ? "节点类型" : "Node types"}</h2>
        <div className="legend-list">
          <div className="legend-item">
            <span className="legend-node legend-node--card" aria-hidden="true" />
            <div>
              <strong>{isZh ? "卡片" : "Card"}</strong>
              <p>
                {isZh
                  ? "知识卡片，用来保存观点、摘录和整理后的内容。"
                  : "Knowledge cards for ideas, excerpts, and refined notes."}
              </p>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-node legend-node--image" aria-hidden="true" />
            <div>
              <strong>{isZh ? "图片" : "Image"}</strong>
              <p>
                {isZh
                  ? "图片资料，支持拖拽或粘贴插入。"
                  : "Image references that support drag-and-drop or paste."}
              </p>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-node legend-node--locked" aria-hidden="true" />
            <div>
              <strong>{isZh ? "已锁定" : "Locked"}</strong>
              <p>
                {isZh
                  ? "虚线边框和锁标记表示该节点已锁定，不能拖动。"
                  : "Dashed borders and a lock badge mean the node cannot be dragged."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="legend-section" aria-labelledby="legend-edges">
        <h2 id="legend-edges">{isZh ? "连线样式" : "Edge styles"}</h2>
        <div className="legend-list">
          <div className="legend-item">
            <span className="legend-edge legend-edge--citation" aria-hidden="true" />
            <div>
              <strong>{isZh ? "单向引用" : "One-way link"}</strong>
              <p>
                {isZh
                  ? "开放箭头表示先选节点指向后选节点。"
                  : "An open arrow means the first selected node points to the second."}
              </p>
            </div>
          </div>
          <div className="legend-item">
            <span className="legend-edge legend-edge--bidirectional" aria-hidden="true" />
            <div>
              <strong>{isZh ? "双向引用" : "Two-way link"}</strong>
              <p>
                {isZh
                  ? "无箭头连线表示两个节点互相关联。"
                  : "A line without arrowheads means the two nodes reference each other."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="legend-section" aria-labelledby="legend-selection">
        <h2 id="legend-selection">{isZh ? "选中状态" : "Selection"}</h2>
        <div className="legend-item">
          <span className="legend-node legend-node--selected" aria-hidden="true" />
          <div>
            <strong>{isZh ? "当前选中" : "Selected"}</strong>
            <p>
              {isZh
                ? "高亮边框表示当前右侧正在查看或编辑的节点。"
                : "A highlighted border marks the node currently being viewed or edited."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
