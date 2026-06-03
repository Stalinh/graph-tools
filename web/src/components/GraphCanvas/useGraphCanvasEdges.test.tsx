/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../../types';
import { useGraphCanvasEdges } from './useGraphCanvasEdges';

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'card',
    title,
    tags: [],
  };
}

function citationEdge(
  id: string,
  style: GraphData['edges'][number]['style']
): GraphData['edges'][number] {
  return {
    id,
    sourceId: '#1',
    targetId: '#2',
    type: 'citation',
    weight: 1,
    style,
  };
}

describe('useGraphCanvasEdges', () => {
  it('passes every edge style through to canvas data', () => {
    const graphNodes = [cardNode('#1', 'One'), cardNode('#2', 'Two')];
    const graphEdges: GraphData['edges'] = [
      citationEdge('edge-solid', 'solid'),
      citationEdge('edge-sketch', 'sketch'),
      citationEdge('edge-note-dash', 'note-dash'),
      citationEdge('edge-legacy', undefined),
    ];

    const { result } = renderHook(() =>
      useGraphCanvasEdges({
        connectedNodeIds: new Set<string>(),
        graphEdges,
        graphNodes,
        matchingNodeIds: null,
        nodeFilter: 'all',
        selectedEdgeId: null,
      })
    );

    expect(result.current.map((edge) => edge.data?.style)).toEqual([
      'solid',
      'sketch',
      'note-dash',
      'note-dash',
    ]);
  });
});
