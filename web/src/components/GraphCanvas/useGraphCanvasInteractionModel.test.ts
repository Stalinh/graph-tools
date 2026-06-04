import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../../types';
import { createGraphCanvasInteractionModel } from './useGraphCanvasInteractionModel';

function cardNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    type: 'card',
    title: id,
    tags: [],
    ...overrides,
  };
}

function groupNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    type: 'group',
    title: id,
    tags: [],
    ...overrides,
  };
}

function graph(nodes: GraphNode[]): GraphData {
  return {
    nodes,
    edges: [
      {
        id: 'edge-1',
        sourceId: '#1',
        targetId: '#2',
        type: 'citation',
        weight: 1,
      },
    ],
  };
}

describe('createGraphCanvasInteractionModel', () => {
  it('creates lookup sets for selection and selected-edge connected nodes', () => {
    const model = createGraphCanvasInteractionModel({
      graph: graph([cardNode('#1'), cardNode('#2'), cardNode('#3')]),
      matchingNodeIds: null,
      nodeFilter: 'all',
      pendingCitation: false,
      selectedEdgeId: 'edge-1',
      selectedNodeIds: ['#3'],
    });

    expect(model.selectedNodeIdSet.has('#3')).toBe(true);
    expect(model.connectedNodeIds.has('#1')).toBe(true);
    expect(model.connectedNodeIds.has('#2')).toBe(true);
    expect(model.connectedNodeIds.has('#3')).toBe(false);
    expect(model.selectedEdgeActive).toBe(true);
  });

  it('marks nodes visible by filter and keeps locked filter independent from type filters', () => {
    const model = createGraphCanvasInteractionModel({
      graph: graph([cardNode('#1', { locked: true }), groupNode('#2'), cardNode('#3')]),
      matchingNodeIds: null,
      nodeFilter: 'locked',
      pendingCitation: false,
      selectedEdgeId: null,
      selectedNodeIds: [],
    });

    expect(model.visibleNodeIds.has('#1')).toBe(true);
    expect(model.visibleNodeIds.has('#2')).toBe(false);
    expect(model.visibleNodeIds.has('#3')).toBe(false);
  });

  it('marks non-referenceable nodes disabled during citation selection', () => {
    const model = createGraphCanvasInteractionModel({
      graph: graph([cardNode('#1'), groupNode('#2')]),
      matchingNodeIds: null,
      nodeFilter: 'all',
      pendingCitation: true,
      selectedEdgeId: null,
      selectedNodeIds: [],
    });

    expect(model.citationSelectionActive).toBe(true);
    expect(model.citationDisabledNodeIds.has('#1')).toBe(false);
    expect(model.citationDisabledNodeIds.has('#2')).toBe(true);
  });
});
