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
        isInteractionActive: false,
        interactionNodeIds: new Set<string>(),
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

  it('marks edges as interaction-active during canvas interactions', () => {
    const graphNodes = [cardNode('#1', 'One'), cardNode('#2', 'Two')];
    const graphEdges: GraphData['edges'] = [citationEdge('edge-sketch', 'sketch')];

    const { result } = renderHook(() =>
      useGraphCanvasEdges({
        connectedNodeIds: new Set<string>(),
        graphEdges,
        graphNodes,
        isInteractionActive: true,
        interactionNodeIds: new Set<string>(),
        matchingNodeIds: null,
        nodeFilter: 'all',
        selectedEdgeId: null,
      })
    );

    expect(result.current[0].data?.isInteractionActive).toBe(true);
    expect(result.current[0].data?.isLightweightInteractionActive).toBe(false);
  });

  it('reuses edges whose visual state does not change when selection moves', () => {
    const graphNodes = [cardNode('#1', 'One'), cardNode('#2', 'Two'), cardNode('#3', 'Three')];
    const graphEdges: GraphData['edges'] = [
      {
        ...citationEdge('edge-1', 'solid'),
        sourceId: '#1',
        targetId: '#2',
      },
      {
        ...citationEdge('edge-2', 'solid'),
        sourceId: '#2',
        targetId: '#3',
      },
      {
        ...citationEdge('edge-3', 'solid'),
        sourceId: '#3',
        targetId: '#1',
      },
    ];

    const { result, rerender } = renderHook(
      (props: { selectedEdgeId: string | null }) =>
        useGraphCanvasEdges({
          connectedNodeIds:
            props.selectedEdgeId === 'edge-1'
              ? new Set(['#1', '#2'])
              : props.selectedEdgeId === 'edge-2'
                ? new Set(['#2', '#3'])
                : new Set<string>(),
          graphEdges,
          graphNodes,
          isInteractionActive: false,
          interactionNodeIds: new Set<string>(),
          matchingNodeIds: null,
          nodeFilter: 'all',
          selectedEdgeId: props.selectedEdgeId,
        }),
      { initialProps: { selectedEdgeId: 'edge-1' as string | null } }
    );

    const previousEdges = result.current;

    rerender({ selectedEdgeId: 'edge-2' });

    expect(result.current[0]).not.toBe(previousEdges[0]);
    expect(result.current[1]).not.toBe(previousEdges[1]);
    expect(result.current[2]).toBe(previousEdges[2]);
  });

  it('keeps structural edge fields stable when only interaction activity changes', () => {
    const graphNodes = [cardNode('#1', 'One'), cardNode('#2', 'Two')];
    const graphEdges: GraphData['edges'] = [citationEdge('edge-sketch', 'sketch')];

    const { result, rerender } = renderHook(
      (props: { active: boolean }) =>
        useGraphCanvasEdges({
          connectedNodeIds: new Set<string>(),
          graphEdges,
          graphNodes,
          isInteractionActive: props.active,
          interactionNodeIds: props.active ? new Set(['#1']) : new Set<string>(),
          matchingNodeIds: null,
          nodeFilter: 'all',
          selectedEdgeId: null,
        }),
      { initialProps: { active: false } }
    );

    const previousEdge = result.current[0];

    rerender({ active: true });

    expect(result.current[0]).not.toBe(previousEdge);
    expect(result.current[0].id).toBe(previousEdge.id);
    expect(result.current[0].source).toBe(previousEdge.source);
    expect(result.current[0].target).toBe(previousEdge.target);
    expect(result.current[0].type).toBe(previousEdge.type);
    expect(result.current[0].data?.style).toBe(previousEdge.data?.style);
  });

  it('only marks edges connected to dragged nodes as interaction-active', () => {
    const graphNodes = [cardNode('#1', 'One'), cardNode('#2', 'Two'), cardNode('#3', 'Three')];
    const graphEdges: GraphData['edges'] = [
      {
        ...citationEdge('edge-connected', 'sketch'),
        sourceId: '#1',
        targetId: '#2',
      },
      {
        ...citationEdge('edge-unrelated', 'sketch'),
        sourceId: '#2',
        targetId: '#3',
      },
    ];

    const { result, rerender } = renderHook(
      (props: { interactionNodeIds: Set<string> }) =>
        useGraphCanvasEdges({
          connectedNodeIds: new Set<string>(),
          graphEdges,
          graphNodes,
          isInteractionActive: props.interactionNodeIds.size > 0,
          interactionNodeIds: props.interactionNodeIds,
          matchingNodeIds: null,
          nodeFilter: 'all',
          selectedEdgeId: null,
        }),
      { initialProps: { interactionNodeIds: new Set<string>() } }
    );

    const previousEdges = result.current;

    rerender({ interactionNodeIds: new Set(['#1']) });

    expect(result.current[0].data?.isInteractionActive).toBe(true);
    expect(result.current[0].data?.isLightweightInteractionActive).toBe(true);
    expect(result.current[1].data?.isInteractionActive).toBe(false);
    expect(result.current[1].data?.isLightweightInteractionActive).toBe(false);
    expect(result.current[0]).not.toBe(previousEdges[0]);
    expect(result.current[1]).toBe(previousEdges[1]);
  });
});
