/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../types';
import { useWorkspaceStore } from './useWorkspaceStore';
import { useGraphNodes } from './useGraphNodes';

const testNode = (
  id: string,
  type: GraphNode['type'] = 'card',
  title = `Node ${id}`
): GraphNode => ({
  id,
  type,
  title,
  tags: [],
});

function useGraphNodesHarness(initialGraph?: GraphData) {
  const workspaceStore = useWorkspaceStore(initialGraph ? { graph: initialGraph } : undefined);
  const nodes = useGraphNodes({
    locale: 'zh-CN',
    workspace: workspaceStore.workspace,
    workspaceRef: workspaceStore.workspaceRef,
    dispatchWorkspaceTransaction: workspaceStore.dispatchWorkspaceTransaction,
  });

  return {
    workspaceStore,
    nodes,
  };
}

describe('useGraphNodes', () => {
  it('creates card nodes with default titles and sets selection with history push', () => {
    const { result } = renderHook(() => useGraphNodesHarness());

    act(() => {
      result.current.nodes.createNode('card', { x: 100, y: 200 });
    });

    const graph = result.current.workspaceStore.workspace.graph;
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].type).toBe('card');
    expect(graph.nodes[0].title).toBe('未命名卡片');

    // Check positions
    expect(result.current.workspaceStore.workspace.nodePositions[graph.nodes[0].id]).toEqual({
      x: 100,
      y: 200,
    });

    // Check selection
    expect(result.current.workspaceStore.workspace.selection.selectedNodeIds).toEqual([
      graph.nodes[0].id,
    ]);
    expect(result.current.workspaceStore.workspace.selection.quickEditingNodeId).toBe(
      graph.nodes[0].id
    );

    // Check history (withHistory was used)
    expect(result.current.workspaceStore.workspace.history.undoStack).toHaveLength(1);
    expect(result.current.workspaceStore.workspace.history.undoStack[0].type).toBe(
      'workspace-patch'
    );
  });

  it('deletes card node, updates selection, and pushes command to history', () => {
    const initialGraph: GraphData = {
      nodes: [testNode('node-1')],
      edges: [],
    };
    const { result } = renderHook(() => useGraphNodesHarness(initialGraph));

    // Select the node first
    act(() => {
      result.current.workspaceStore.setSelectedNodeId('node-1');
    });
    expect(result.current.workspaceStore.workspace.selection.selectedNodeIds).toEqual(['node-1']);

    // Delete node
    act(() => {
      result.current.nodes.deleteNode('node-1');
    });

    expect(result.current.workspaceStore.workspace.graph.nodes).toHaveLength(0);
    expect(result.current.workspaceStore.workspace.selection.selectedNodeIds).toEqual([]);
    expect(result.current.workspaceStore.workspace.history.undoStack).toHaveLength(1);
  });

  it('batch deletes multiple card nodes and clears selection', () => {
    const initialGraph: GraphData = {
      nodes: [testNode('node-1'), testNode('node-2'), testNode('node-3')],
      edges: [],
    };
    const { result } = renderHook(() => useGraphNodesHarness(initialGraph));

    act(() => {
      result.current.workspaceStore.setSelectedNodeIds(['node-1', 'node-2']);
      result.current.workspaceStore.setEditingNodeId('node-1');
    });

    act(() => {
      result.current.nodes.deleteNodes(['node-1', 'node-2']);
    });

    expect(result.current.workspaceStore.workspace.graph.nodes).toHaveLength(1);
    expect(result.current.workspaceStore.workspace.graph.nodes[0].id).toBe('node-3');
    expect(result.current.workspaceStore.workspace.selection.selectedNodeIds).toEqual([]);
    expect(result.current.workspaceStore.workspace.selection.editingNodeId).toBeNull();
    expect(result.current.workspaceStore.workspace.history.undoStack).toHaveLength(1);
  });

  it('updates node fields without pushing to history by default', () => {
    const initialGraph: GraphData = {
      nodes: [testNode('node-1')],
      edges: [],
    };
    const { result } = renderHook(() => useGraphNodesHarness(initialGraph));

    act(() => {
      const originalNode = result.current.workspaceStore.workspace.graph.nodes[0];
      result.current.nodes.updateGraphNode({ ...originalNode, title: 'Updated Title' });
    });

    expect(result.current.workspaceStore.workspace.graph.nodes[0].title).toBe('Updated Title');
    // updateGraphNode does not push history by default
    expect(result.current.workspaceStore.workspace.history.undoStack).toHaveLength(0);
  });

  it('commits node updates and pushes to history', () => {
    const initialGraph: GraphData = {
      nodes: [testNode('node-1')],
      edges: [],
    };
    const { result } = renderHook(() => useGraphNodesHarness(initialGraph));

    act(() => {
      const originalNode = result.current.workspaceStore.workspace.graph.nodes[0];
      result.current.nodes.commitGraphNode({ ...originalNode, title: 'Committed Title' });
    });

    expect(result.current.workspaceStore.workspace.graph.nodes[0].title).toBe('Committed Title');
    // commitGraphNode pushes history
    expect(result.current.workspaceStore.workspace.history.undoStack).toHaveLength(1);
  });
});
