/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../types';
import { useWorkspaceStore, createInitialWorkspaceStoreState } from './useWorkspaceStore';
import type { CanvasCommand } from './canvasHistoryTypes';

const testNode = (id: string): GraphNode => ({
  id,
  type: 'card',
  title: `Node ${id}`,
  tags: [],
});

const mockCommand = (index: number): CanvasCommand => ({
  type: 'workspace-patch',
  before: {
    graph: { nodes: [], edges: [] },
    nodePositions: {},
    nodeSizes: {},
    viewport: null,
    selection: {
      selectedNodeIds: [],
      selectedEdgeId: null,
      editingNodeId: null,
      quickEditingNodeId: null,
      pendingInspectorContentFocusNodeId: null,
    },
  },
  after: {
    graph: { nodes: [testNode(`${index}`)], edges: [] },
    nodePositions: {},
    nodeSizes: {},
    viewport: null,
    selection: {
      selectedNodeIds: [`${index}`],
      selectedEdgeId: null,
      editingNodeId: null,
      quickEditingNodeId: null,
      pendingInspectorContentFocusNodeId: null,
    },
  },
});

describe('useWorkspaceStore', () => {
  it('should initialize with initial state overrides or defaults', () => {
    const defaultState = createInitialWorkspaceStoreState();
    expect(defaultState.graph.nodes).toEqual([]);
    expect(defaultState.status.dirty).toBe(false);

    const customState = createInitialWorkspaceStoreState({
      status: { dirty: true, status: 'ready', errorMessage: null },
    });
    expect(customState.status.dirty).toBe(true);
    expect(customState.status.status).toBe('ready');
  });

  it('should apply transaction atomically via dispatchWorkspaceTransaction', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.dispatchWorkspaceTransaction({
        graph: { nodes: [testNode('node-1')], edges: [] },
        status: { dirty: true },
      });
    });

    expect(result.current.workspace.graph.nodes).toHaveLength(1);
    expect(result.current.workspace.graph.nodes[0].id).toBe('node-1');
    expect(result.current.workspace.status.dirty).toBe(true);
  });

  it('should apply transaction via functional input and merge nested states', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.dispatchWorkspaceTransaction((current) => {
        return {
          graph: { nodes: [testNode('node-1')], edges: [] },
          status: { ...current.status, dirty: true },
        };
      });
    });

    expect(result.current.workspace.graph.nodes).toHaveLength(1);
    expect(result.current.workspace.status.dirty).toBe(true);
  });

  it('should sanitize selection when nodes or edges are removed', () => {
    const initialGraph: GraphData = {
      nodes: [testNode('node-1'), testNode('node-2')],
      edges: [
        { id: 'edge-1-2', sourceId: 'node-1', targetId: 'node-2', type: 'citation', weight: 1 },
      ],
    };

    const { result } = renderHook(() =>
      useWorkspaceStore({
        graph: initialGraph,
        selection: {
          selectedNodeIds: ['node-1'],
          selectedEdgeId: 'edge-1-2',
          editingNodeId: 'node-1',
          quickEditingNodeId: 'node-1',
          pendingInspectorContentFocusNodeId: 'node-1',
          contextMenu: null,
        },
      })
    );

    // Initial check
    expect(result.current.workspace.selection.selectedNodeIds).toEqual(['node-1']);
    expect(result.current.workspace.selection.selectedEdgeId).toBe('edge-1-2');

    // Dispatch a transaction removing node-1 and edge-1-2
    act(() => {
      result.current.dispatchWorkspaceTransaction({
        graph: {
          nodes: [testNode('node-2')],
          edges: [],
        },
      });
    });

    // Sanitization results
    expect(result.current.workspace.selection.selectedNodeIds).toEqual([]);
    expect(result.current.workspace.selection.selectedEdgeId).toBeNull();
    expect(result.current.workspace.selection.editingNodeId).toBeNull();
    expect(result.current.workspace.selection.quickEditingNodeId).toBeNull();
    expect(result.current.workspace.selection.pendingInspectorContentFocusNodeId).toBeNull();
  });

  it('should trim undo stack at MAX_HISTORY', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    // Push 25 commands to history (MAX_HISTORY is 20)
    act(() => {
      for (let i = 1; i <= 25; i++) {
        result.current.dispatchWorkspaceTransaction({
          history: {
            type: 'push',
            command: mockCommand(i),
          },
        });
      }
    });

    // Undo stack should have maximum 20 items, with earliest ones dropped
    expect(result.current.workspace.history.undoStack).toHaveLength(20);
    // The earliest remaining command should be index 6
    expect(result.current.workspace.history.undoStack[0].after.graph.nodes[0].id).toBe('6');
    // The latest remaining command should be index 25
    expect(result.current.workspace.history.undoStack[19].after.graph.nodes[0].id).toBe('25');
  });

  it('should handle clear and replace history actions', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.dispatchWorkspaceTransaction({
        history: {
          type: 'push',
          command: mockCommand(1),
        },
      });
    });
    expect(result.current.workspace.history.undoStack).toHaveLength(1);

    // Clear history
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.workspace.history.undoStack).toHaveLength(0);
    expect(result.current.workspace.history.redoStack).toHaveLength(0);

    // Replace history
    act(() => {
      result.current.dispatchWorkspaceTransaction({
        history: {
          type: 'replace',
          undoStack: [mockCommand(2)],
          redoStack: [mockCommand(3)],
        },
      });
    });
    expect(result.current.workspace.history.undoStack).toHaveLength(1);
    expect(result.current.workspace.history.redoStack).toHaveLength(1);
    expect(result.current.workspace.history.undoStack[0].after.graph.nodes[0].id).toBe('2');
  });

  it('should support explicit setter states (dirty, status, context menu, etc.)', () => {
    const initialGraph: GraphData = {
      nodes: [
        testNode('node-5'),
        testNode('node-6'),
        testNode('node-7'),
        testNode('node-8'),
        testNode('node-9'),
        testNode('node-10'),
      ],
      edges: [
        { id: 'edge-1', sourceId: 'node-5', targetId: 'node-6', type: 'citation', weight: 1 },
      ],
    };
    const { result } = renderHook(() => useWorkspaceStore({ graph: initialGraph }));

    act(() => {
      result.current.setDirty(true);
    });
    expect(result.current.workspace.status.dirty).toBe(true);

    act(() => {
      result.current.setStatus('ready');
    });
    expect(result.current.workspace.status.status).toBe('ready');

    act(() => {
      result.current.setErrorMessage('Some Error');
    });
    expect(result.current.workspace.status.errorMessage).toBe('Some Error');

    act(() => {
      result.current.setSelectedNodeId('node-5');
    });
    expect(result.current.workspace.selection.selectedNodeIds).toEqual(['node-5']);

    act(() => {
      result.current.setSelectedNodeIds(['node-6', 'node-7']);
    });
    expect(result.current.workspace.selection.selectedNodeIds).toEqual(['node-6', 'node-7']);

    act(() => {
      result.current.setSelectedEdgeId('edge-1');
    });
    expect(result.current.workspace.selection.selectedEdgeId).toBe('edge-1');

    act(() => {
      result.current.setContextMenu({ x: 10, y: 20, type: 'canvas' });
    });
    expect(result.current.workspace.selection.contextMenu).toEqual({
      x: 10,
      y: 20,
      type: 'canvas',
    });

    act(() => {
      result.current.setEditingNodeId('node-8');
    });
    expect(result.current.workspace.selection.editingNodeId).toBe('node-8');

    act(() => {
      result.current.setQuickEditingNodeId('node-9');
    });
    expect(result.current.workspace.selection.quickEditingNodeId).toBe('node-9');

    act(() => {
      result.current.setPendingInspectorContentFocusNodeId('node-10');
    });
    expect(result.current.workspace.selection.pendingInspectorContentFocusNodeId).toBe('node-10');
  });
});
