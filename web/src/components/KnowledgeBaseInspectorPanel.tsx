import { Inspector } from './Inspector';
import type { KnowledgeBaseInspectorPanelProps } from './KnowledgeBase.types';

export function KnowledgeBaseInspectorPanel({
  edges,
  isCollapsed,
  nodes,
  selection,
  onCollapseToggle,
  onFocusNode,
}: KnowledgeBaseInspectorPanelProps) {
  return (
    <Inspector
      allNodes={nodes.graph.nodes}
      autoFocusContent={
        selection.pendingInspectorContentFocusNodeId !== null &&
        selection.pendingInspectorContentFocusNodeId === selection.selectedNodeId
      }
      allEdges={nodes.graph.edges}
      edge={selection.selectedEdge}
      isCollapsed={isCollapsed}
      node={selection.selectedNode}
      selectedNodes={selection.selectedNodes}
      onCollapseToggle={onCollapseToggle}
      onBatchColorChange={(color) => nodes.updateGraphNodesColor(selection.selectedNodeIds, color)}
      onBatchDelete={() => nodes.deleteNodes(selection.selectedNodeIds)}
      onBatchLockChange={(locked) =>
        nodes.updateGraphNodesLocked(selection.selectedNodeIds, locked)
      }
      onMatchGroupSizes={() => nodes.matchGroupNodeSizes(selection.selectedNodeIds)}
      onColorChange={nodes.updateGraphNodeColor}
      onCreateCitation={edges.createCitation}
      onAutoFocusContentHandled={() => selection.setPendingInspectorContentFocusNodeId(null)}
      onDeleteCitation={edges.deleteCitation}
      onDeleteEdge={(edge) => {
        edges.deleteCitation(edge.sourceId, edge.targetId);
        selection.setSelectedEdgeId(null);
      }}
      onEdgeColorChange={edges.updateEdgeColor}
      onEdgeDirectionChange={edges.updateEdgeDirection}
      onEdgeStyleChange={edges.updateEdgeStyle}
      onReorderReferences={edges.reorderReferences}
      onSelectNode={(nodeId) => {
        selection.setSelectedNodeId(nodeId);
        selection.setSelectedEdgeId(null);
        onFocusNode(nodeId);
      }}
      onCommitNode={nodes.commitGraphNode}
      sourceNode={selection.selectedEdgeSourceNode}
      targetNode={selection.selectedEdgeTargetNode}
    />
  );
}
