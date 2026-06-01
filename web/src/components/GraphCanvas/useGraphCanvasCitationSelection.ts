import { useCallback, useEffect, useState } from "react";
import { isReferenceableNode } from "../../lib/graphConstraints";
import { hasCitationBetweenNodes } from "../../lib/graphMutator";
import type { EdgeDirection, GraphData } from "../../types";

interface PendingCitation {
  direction: EdgeDirection;
  message: string;
  sourceId: string | null;
}

interface UseGraphCanvasCitationSelectionOptions {
  graphEdges: GraphData["edges"];
  graphNodes: GraphData["nodes"];
  isZh: boolean;
  onCreateCitation: (sourceId: string, targetId: string, direction: EdgeDirection) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onSelectNode: (nodeId: string | null) => void;
}

export function useGraphCanvasCitationSelection({
  graphEdges,
  graphNodes,
  isZh,
  onCreateCitation,
  onEdgeSelect,
  onSelectNode,
}: UseGraphCanvasCitationSelectionOptions) {
  const [pendingCitation, setPendingCitation] = useState<PendingCitation | null>(null);

  const clearCitationSelection = useCallback(() => {
    setPendingCitation(null);
  }, []);

  const startCitationSelection = useCallback(
    (direction: EdgeDirection) => {
      setPendingCitation({
        direction,
        sourceId: null,
        message: isZh
          ? "选择被引用内容：点击第 1 个节点，Esc 取消"
          : "Choose the cited content: click the first node, or press Esc to cancel",
      });
      onEdgeSelect(null);
      onSelectNode(null);
    },
    [isZh, onEdgeSelect, onSelectNode]
  );

  useEffect(() => {
    if (!pendingCitation) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingCitation(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingCitation]);

  const handleCitationNodeClick = useCallback(
    (nodeId: string) => {
      if (!pendingCitation) {
        return false;
      }

      const graphNode = graphNodes.find((graphNodeItem) => graphNodeItem.id === nodeId);
      if (!graphNode || !isReferenceableNode(graphNode)) {
        setPendingCitation({
          ...pendingCitation,
          message: isZh
            ? "分组节点不能参与引用，请选择卡片或图片节点"
            : "Group nodes cannot be linked. Choose a card or image node.",
        });
        return true;
      }
      if (!pendingCitation.sourceId) {
        setPendingCitation({
          ...pendingCitation,
          sourceId: nodeId,
          message: isZh
            ? "选择引用它的内容：点击第 2 个节点完成，Esc 取消"
            : "Choose the source content: click the second node to finish, or press Esc to cancel",
        });
        onSelectNode(nodeId);
        onEdgeSelect(null);
        return true;
      }

      if (nodeId === pendingCitation.sourceId) {
        setPendingCitation({
          ...pendingCitation,
          message: isZh
            ? "不能引用自身，请选择另一个节点"
            : "A node cannot link to itself. Choose another node.",
        });
        return true;
      }

      if (hasCitationBetweenNodes(graphEdges, pendingCitation.sourceId, nodeId)) {
        setPendingCitation({
          ...pendingCitation,
          message: isZh
            ? "引用已存在，请选择另一个节点"
            : "That link already exists. Choose another node.",
        });
        return true;
      }

      onCreateCitation(pendingCitation.sourceId, nodeId, pendingCitation.direction);
      onSelectNode(null);
      onEdgeSelect(`edge-${pendingCitation.sourceId}-${nodeId}`);
      setPendingCitation(null);
      return true;
    },
    [graphEdges, graphNodes, isZh, onCreateCitation, onEdgeSelect, onSelectNode, pendingCitation]
  );

  return {
    clearCitationSelection,
    handleCitationNodeClick,
    pendingCitation,
    startCitationSelection,
  };
}
