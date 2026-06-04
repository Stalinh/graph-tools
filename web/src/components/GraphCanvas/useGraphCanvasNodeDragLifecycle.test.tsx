/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import type { Node } from '@xyflow/react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGraphCanvasNodeDragLifecycle } from './useGraphCanvasNodeDragLifecycle';

function flowNode(id: string, x: number, y: number): Node {
  return {
    id,
    position: { x, y },
    data: {},
  };
}

describe('useGraphCanvasNodeDragLifecycle', () => {
  it('reports multi-node drag moves from cached start positions to current positions', () => {
    const nodesRef = {
      current: [flowNode('#1', 10, 20), flowNode('#2', 30, 40), flowNode('#3', 50, 60)],
    };
    const onNodesDragEnd = vi.fn();

    const { result } = renderHook(() =>
      useGraphCanvasNodeDragLifecycle({
        clearAlignmentGuides: vi.fn(),
        nodesRef,
        onNodesDragEnd,
        selectedNodeIds: ['#1', '#2'],
        stopDragAutoPan: vi.fn(),
      })
    );

    act(() => {
      result.current.handleNodeDragStart(null, nodesRef.current[0]);
    });

    nodesRef.current = [flowNode('#1', 100, 120), flowNode('#2', 130, 140), flowNode('#3', 50, 60)];

    act(() => {
      result.current.handleNodeDragStop(null, nodesRef.current[0]);
    });

    expect(onNodesDragEnd).toHaveBeenCalledWith([
      { nodeId: '#1', from: { x: 10, y: 20 }, to: { x: 100, y: 120 } },
      { nodeId: '#2', from: { x: 30, y: 40 }, to: { x: 130, y: 140 } },
    ]);
  });
});
