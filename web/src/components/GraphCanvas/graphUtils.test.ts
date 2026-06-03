import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { GraphNode } from '../../types';
import { createGraphNodes, type CreateGraphNodesOptions } from './graphUtils';

const onSelectNode = () => undefined;
const onQuickEditSubmit = () => undefined;
const onNodeMouseDown = () => undefined;
const onQuickAddChild = () => undefined;
const onNodeResize = () => undefined;
const onNodeResizeEnd = () => undefined;

class CountingNodeMap extends Map<string, Node> {
  getCount = 0;

  get(key: string) {
    this.getCount += 1;
    return super.get(key);
  }
}

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'card',
    title,
    tags: [],
  };
}

function createSavedPositions(graphNodes: GraphNode[]) {
  return Object.fromEntries(
    graphNodes.map((node, index) => [node.id, { x: index * 20, y: index * 30 }])
  );
}

function createSavedSizes(graphNodes: GraphNode[]) {
  return Object.fromEntries(graphNodes.map((node) => [node.id, { width: 120, height: 80 }]));
}

function createCanvasNodes({
  connectedNodeIds = new Set<string>(),
  graphNodes,
  matchingNodeIds = null,
  nodeFilter = 'all',
  previousNodesById = new Map<string, Node>(),
  savedNodePositions = createSavedPositions(graphNodes),
  savedNodeSizes = createSavedSizes(graphNodes),
  searchQuery = '',
  selectedEdgeActive = false,
  selectedNodeIds = [],
}: {
  connectedNodeIds?: Set<string>;
  graphNodes: GraphNode[];
  matchingNodeIds?: Set<string> | null;
  nodeFilter?: CreateGraphNodesOptions['nodeFilter'];
  previousNodesById?: ReadonlyMap<string, Node>;
  savedNodePositions?: Record<string, { x: number; y: number }>;
  savedNodeSizes?: Record<string, { width: number; height: number }>;
  searchQuery?: string;
  selectedEdgeActive?: boolean;
  selectedNodeIds?: string[];
}) {
  return createGraphNodes({
    graphNodes,
    selectedNodeIds,
    onSelectNode,
    quickEditingNodeId: null,
    onQuickEditSubmit,
    previousNodesById,
    savedNodePositions,
    savedNodeSizes,
    searchQuery,
    connectedNodeIds,
    images: new Map(),
    nodeFilter,
    selectedEdgeActive,
    citationSelectionActive: false,
    onNodeMouseDown,
    matchingNodeIds,
    onQuickAddChild,
    onNodeResize,
    onNodeResizeEnd,
  });
}

describe('createGraphNodes', () => {
  it('looks up previous nodes once per graph node by id', () => {
    const graphNodes = Array.from({ length: 120 }, (_, index) => cardNode(`#${index + 1}`));
    const savedNodePositions = createSavedPositions(graphNodes);
    const savedNodeSizes = createSavedSizes(graphNodes);
    const previousNodes = createCanvasNodes({
      graphNodes,
      savedNodePositions,
      savedNodeSizes,
    });
    const previousNodesById = new CountingNodeMap(previousNodes.map((node) => [node.id, node]));

    const nextNodes = createCanvasNodes({
      graphNodes,
      previousNodesById,
      savedNodePositions,
      savedNodeSizes,
    });

    expect(previousNodesById.getCount).toBe(graphNodes.length);
    expect(nextNodes).toHaveLength(graphNodes.length);
    nextNodes.forEach((node, index) => {
      expect(node).toBe(previousNodes[index]);
    });
  });

  it('keeps stable node data when only a position changes', () => {
    const graphNodes = [cardNode('#1'), cardNode('#2')];
    const savedNodePositions = createSavedPositions(graphNodes);
    const savedNodeSizes = createSavedSizes(graphNodes);
    const previousNodes = createCanvasNodes({
      graphNodes,
      savedNodePositions,
      savedNodeSizes,
    });
    const previousNodesById = new Map(previousNodes.map((node) => [node.id, node]));
    const nextPositions = {
      ...savedNodePositions,
      '#1': { x: savedNodePositions['#1'].x + 40, y: savedNodePositions['#1'].y + 20 },
    };

    const nextNodes = createCanvasNodes({
      graphNodes,
      previousNodesById,
      savedNodePositions: nextPositions,
      savedNodeSizes,
    });

    expect(nextNodes[0]).not.toBe(previousNodes[0]);
    expect(nextNodes[0].data).toBe(previousNodes[0].data);
    expect(nextNodes[0].style).toBe(previousNodes[0].style);
    expect(nextNodes[1]).toBe(previousNodes[1]);
  });

  it('reuses nodes that stay dimmed while the search query changes', () => {
    const graphNodes = [cardNode('#1', 'Match'), cardNode('#2', 'Other')];
    const savedNodePositions = createSavedPositions(graphNodes);
    const savedNodeSizes = createSavedSizes(graphNodes);
    const matchingNodeIds = new Set(['#1']);
    const previousNodes = createCanvasNodes({
      graphNodes,
      matchingNodeIds,
      savedNodePositions,
      savedNodeSizes,
      searchQuery: 'match',
    });
    const previousNodesById = new Map(previousNodes.map((node) => [node.id, node]));

    const nextNodes = createCanvasNodes({
      graphNodes,
      matchingNodeIds,
      previousNodesById,
      savedNodePositions,
      savedNodeSizes,
      searchQuery: 'matched',
    });

    expect(nextNodes[0]).not.toBe(previousNodes[0]);
    expect(nextNodes[1]).toBe(previousNodes[1]);
    expect(nextNodes[1].data.searchQuery).toBeUndefined();
  });
});
