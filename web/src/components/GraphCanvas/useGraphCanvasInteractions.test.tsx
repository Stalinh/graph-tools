/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import type { Node, ReactFlowInstance } from '@xyflow/react';
import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphData } from '../../types';
import { useGraphCanvasInteractions } from './useGraphCanvasInteractions';

type ProfilingWindow = Window & {
  __GRAPH_CANVAS_PROFILE_NODES_CHANGE__?: boolean;
};

function graph(): GraphData {
  return {
    nodes: [{ id: 'card-1', type: 'card', title: 'Card 1', tags: [] }],
    edges: [],
  };
}

function flowNode(id: string, x: number, y: number): Node {
  return {
    id,
    position: { x, y },
    data: {},
  };
}

interface RenderInteractionsOptions {
  nodesRef?: { current: Node[] };
  setNodes?: (nodes: Node[]) => void;
}

function renderInteractions({
  nodesRef = { current: [flowNode('card-1', 10, 20)] },
  setNodes = vi.fn(),
}: RenderInteractionsOptions = {}) {
  return renderHook(() =>
    useGraphCanvasInteractions({
      clearAlignmentGuides: vi.fn(),
      containerRef: { current: document.createElement('div') } as RefObject<HTMLDivElement>,
      graph: graph(),
      handleCitationNodeClick: vi.fn(() => false),
      handleNodeMouseDownRef: { current: null },
      hasJustDraggedRef: { current: false },
      nodeSizes: {},
      nodesRef,
      pendingCitation: false,
      reactFlowInstanceRef: { current: null } as RefObject<ReactFlowInstance>,
      selectedNodeIds: [],
      selectionDragRef: { current: null },
      setNodes,
      onCloseContextMenu: vi.fn(),
      onEdgeSelect: vi.fn(),
      onSelectNodeIds: vi.fn(),
    })
  );
}

describe('useGraphCanvasInteractions', () => {
  afterEach(() => {
    delete (window as ProfilingWindow).__GRAPH_CANVAS_PROFILE_NODES_CHANGE__;
    vi.restoreAllMocks();
  });

  it('logs nodes change timings when profiling is enabled', () => {
    (window as ProfilingWindow).__GRAPH_CANVAS_PROFILE_NODES_CHANGE__ = true;
    let frameCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const { result } = renderInteractions();

    act(() => {
      result.current.handleNodesChange([
        {
          id: 'card-1',
          type: 'position',
          position: { x: 30, y: 40 },
        },
      ]);
    });

    expect(debug).not.toHaveBeenCalled();

    act(() => {
      frameCallback?.(0);
    });

    expect(debug).toHaveBeenCalledWith(
      '[GraphCanvas] nodes change',
      expect.objectContaining({
        applyNodeChangesMs: expect.any(Number),
        changeTypes: ['position'],
        changes: 1,
        deferred: true,
        nodes: 1,
        normalizeGroupCollisionChangesMs: expect.any(Number),
        setNodesMs: expect.any(Number),
        totalMs: expect.any(Number),
      })
    );
  });

  it('coalesces position changes into one nodes update per animation frame', () => {
    let frameCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const nodesRef = { current: [flowNode('card-1', 10, 20)] };
    const setNodes = vi.fn();
    const { result } = renderInteractions({ nodesRef, setNodes });

    act(() => {
      result.current.handleNodesChange([
        {
          id: 'card-1',
          type: 'position',
          position: { x: 30, y: 40 },
        },
      ]);
      result.current.handleNodesChange([
        {
          id: 'card-1',
          type: 'position',
          position: { x: 50, y: 60 },
        },
      ]);
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(nodesRef.current[0].position).toEqual({ x: 50, y: 60 });

    act(() => {
      frameCallback?.(0);
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(setNodes.mock.calls[0][0][0].position).toEqual({ x: 50, y: 60 });
  });

  it('applies non-position changes immediately after cancelling pending position frame', () => {
    let frameCallback: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frameCallback = callback;
        return 1;
      });
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const nodesRef = { current: [flowNode('card-1', 10, 20)] };
    const setNodes = vi.fn();
    const { result } = renderInteractions({ nodesRef, setNodes });

    act(() => {
      result.current.handleNodesChange([
        {
          id: 'card-1',
          type: 'position',
          position: { x: 30, y: 40 },
        },
      ]);
      result.current.handleNodesChange([
        {
          id: 'card-1',
          type: 'select',
          selected: true,
        },
      ]);
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(setNodes.mock.calls[0][0][0].position).toEqual({ x: 30, y: 40 });
    expect(setNodes.mock.calls[0][0][0].selected).toBe(true);

    act(() => {
      frameCallback?.(0);
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
  });
});
