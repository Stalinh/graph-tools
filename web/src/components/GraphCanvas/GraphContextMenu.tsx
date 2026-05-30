import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Link2, Lock, LockOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useI18n } from "../../i18n";
import type {
  CanvasPosition,
  EdgeDirection,
  EntityType,
  GraphContextMenuState,
  GraphData,
} from "../../types";

interface GraphContextMenuProps {
  contextMenu: GraphContextMenuState;
  graph: GraphData;
  selectedNodeId: string | null;
  onClose: () => void;
  onStartCitation: (direction: EdgeDirection) => void;
  onCreateNode: (type: EntityType, position: CanvasPosition) => void;
  onDeleteNode: (nodeId: string) => void;
  onEditNode: (nodeId: string) => void;
  onToggleNodeLock: (nodeId: string, locked: boolean) => void;
}

export function GraphContextMenu({
  contextMenu,
  graph,
  selectedNodeId,
  onClose,
  onStartCitation,
  onCreateNode,
  onDeleteNode,
  onEditNode,
  onToggleNodeLock,
}: GraphContextMenuProps) {
  const { isZh } = useI18n();
  const targetNodeId = contextMenu.nodeId ?? selectedNodeId;
  const targetNode = targetNodeId
    ? graph.nodes.find((node) => node.id === targetNodeId)
    : undefined;
  const canStartCitation = graph.nodes.length >= 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: contextMenu.x, y: contextMenu.y });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const parent = containerRef.current.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const margin = 8;
        let newX = contextMenu.x;
        let newY = contextMenu.y;

        if (newX + rect.width > parentRect.width - margin) {
          newX = Math.max(margin, parentRect.width - rect.width - margin);
        }
        if (newY + rect.height > parentRect.height - margin) {
          newY = Math.max(margin, parentRect.height - rect.height - margin);
        }
        setAdjustedPosition({ x: newX, y: newY });
      }
    }
  }, [contextMenu.x, contextMenu.y]);

  useEffect(() => {
    if (containerRef.current) {
      const buttons = containerRef.current.querySelectorAll("button:not([disabled])");
      if (buttons.length > 0) {
        (buttons[0] as HTMLButtonElement).focus();
      }
    }
  }, []);

  useEffect(() => {
    function handleMouseDownOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDownOutside);
    return () => {
      document.removeEventListener("mousedown", handleMouseDownOutside);
    };
  }, [onClose]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!containerRef.current) return;
      const buttons = Array.from(
        containerRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
      );
      if (buttons.length === 0) return;

      const activeElement = document.activeElement as HTMLButtonElement;
      const currentIndex = buttons.indexOf(activeElement);

      let nextIndex = 0;
      if (event.key === "ArrowDown") {
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
      } else if (event.key === "ArrowUp") {
        nextIndex =
          currentIndex === -1
            ? buttons.length - 1
            : (currentIndex - 1 + buttons.length) % buttons.length;
      }
      buttons[nextIndex].focus();
    }
  }

  function createNode(type: EntityType) {
    onCreateNode(type, contextMenu.flowPosition);
    onClose();
  }

  function deleteNode() {
    if (!targetNodeId) {
      return;
    }

    onDeleteNode(targetNodeId);
    onClose();
  }

  function createCitation(direction: EdgeDirection) {
    onStartCitation(direction);
    onClose();
  }

  function toggleNodeLock() {
    if (!targetNode) {
      return;
    }

    onToggleNodeLock(targetNode.id, !targetNode.locked);
    onClose();
  }

  return (
    <div
      ref={containerRef}
      className="graph-context-menu"
      role="menu"
      aria-label={isZh ? "画布操作" : "Canvas actions"}
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      onKeyDown={handleKeyDown}
    >
      <button type="button" role="menuitem" onClick={() => createNode("card")}>
        <Plus aria-hidden="true" size={15} />
        <span>{isZh ? "新增卡片" : "Add card"}</span>
      </button>
      <button type="button" role="menuitem" onClick={() => createNode("image")}>
        <ImageIcon aria-hidden="true" size={15} />
        <span>{isZh ? "插入图片" : "Insert image"}</span>
      </button>
      <button type="button" role="menuitem" onClick={() => createNode("group")}>
        <Plus aria-hidden="true" size={15} />
        <span>{isZh ? "新增分组区域" : "Add group area"}</span>
      </button>
      <div className="graph-context-menu__separator" role="separator" />
      <button
        type="button"
        role="menuitem"
        disabled={!canStartCitation}
        onClick={() => createCitation("unidirectional")}
      >
        <Link2 aria-hidden="true" size={15} />
        <span>{isZh ? "单向引用 →" : "One-way link →"}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canStartCitation}
        onClick={() => createCitation("bidirectional")}
      >
        <Link2 aria-hidden="true" size={15} />
        <span>{isZh ? "双向引用 —" : "Two-way link —"}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!targetNodeId}
        onClick={() => {
          if (!targetNodeId) {
            return;
          }

          onEditNode(targetNodeId);
          onClose();
        }}
      >
        <Pencil aria-hidden="true" size={15} />
        <span>{isZh ? "编辑" : "Edit"}</span>
      </button>
      <button type="button" role="menuitem" disabled={!targetNode} onClick={toggleNodeLock}>
        {targetNode?.locked ? (
          <LockOpen aria-hidden="true" size={15} />
        ) : (
          <Lock aria-hidden="true" size={15} />
        )}
        <span>
          {targetNode?.locked
            ? isZh
              ? "解锁节点"
              : "Unlock node"
            : isZh
              ? "锁定节点"
              : "Lock node"}
        </span>
      </button>
      <button type="button" role="menuitem" disabled={!targetNodeId} onClick={deleteNode}>
        <Trash2 aria-hidden="true" size={15} />
        <span>{isZh ? "删除选中节点" : "Delete selected node"}</span>
      </button>
      <button type="button" role="menuitem" onClick={onClose}>
        <X aria-hidden="true" size={15} />
        <span>{isZh ? "关闭菜单" : "Close menu"}</span>
      </button>
    </div>
  );
}
