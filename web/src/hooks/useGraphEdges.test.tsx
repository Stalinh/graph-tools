/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../types';
import { useGraphEdges } from './useGraphEdges';
import { useWorkspaceStore } from './useWorkspaceStore';

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'card',
    title,
    tags: [],
  };
}

function graph(edgeStyle?: GraphData['edges'][number]['style']): GraphData {
  return {
    nodes: [cardNode('#1', 'One'), cardNode('#2', 'Two')],
    edges: [
      {
        id: 'edge-#1-#2',
        sourceId: '#1',
        targetId: '#2',
        type: 'citation',
        weight: 1,
        style: edgeStyle,
      },
    ],
  };
}

function useGraphEdgesHarness(initialGraph: GraphData) {
  const workspaceStore = useWorkspaceStore({ graph: initialGraph });
  const edges = useGraphEdges({
    workspaceRef: workspaceStore.workspaceRef,
    dispatchWorkspaceTransaction: workspaceStore.dispatchWorkspaceTransaction,
  });

  return {
    commands: workspaceStore.workspace.history.undoStack,
    dirty: workspaceStore.workspace.status.dirty,
    edges,
    graph: workspaceStore.workspace.graph,
  };
}

describe('useGraphEdges', () => {
  it('updates solid edges to note dash instead of treating them as already default', () => {
    const { result } = renderHook(() => useGraphEdgesHarness(graph('solid')));

    act(() => {
      result.current.edges.updateEdgeStyle('edge-#1-#2', 'note-dash');
    });

    expect(result.current.graph.edges[0].style).toBe('note-dash');
    expect(result.current.dirty).toBe(true);
    expect(result.current.commands).toHaveLength(1);
    expect(result.current.commands[0]).toMatchObject({ type: 'workspace-patch' });
  });

  it('treats legacy undefined edge style as note dash', () => {
    const { result } = renderHook(() => useGraphEdgesHarness(graph()));

    act(() => {
      result.current.edges.updateEdgeStyle('edge-#1-#2', 'note-dash');
    });

    expect(result.current.graph.edges[0].style).toBeUndefined();
    expect(result.current.dirty).toBe(false);
    expect(result.current.commands).toEqual([]);
  });
});
