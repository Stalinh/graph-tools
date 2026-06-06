/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { renderHook } from '@testing-library/react';
import { type RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Node, ReactFlowInstance } from '@xyflow/react';
import { useGraphCanvasDragAutoPan } from './useGraphCanvasDragAutoPan';

function rect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    bottom: 500,
    height: 500,
    left: 0,
    right: 500,
    top: 0,
    width: 500,
    x: 0,
    y: 0,
    toJSON: () => {},
    ...overrides,
  } as DOMRect;
}

describe('useGraphCanvasDragAutoPan', () => {
  it('notifies interaction drag with the dragged selection ids', () => {
    const container = document.createElement('div');
    container.getBoundingClientRect = vi.fn(() => rect());
    const reactFlowInstance = {
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewport: vi.fn(),
    } as unknown as ReactFlowInstance;
    const onInteractionDrag = vi.fn();

    const { result } = renderHook(() =>
      useGraphCanvasDragAutoPan({
        containerRef: { current: container } as RefObject<HTMLDivElement>,
        onInteractionDrag,
        reactFlowInstanceRef: { current: reactFlowInstance } as RefObject<ReactFlowInstance>,
        selectedNodeIds: ['#1', '#2'],
        showAlignmentGuidesForNodeIds: vi.fn(),
      })
    );

    result.current.handleNodeDrag(
      { clientX: 250, clientY: 250 } as never,
      {
        id: '#1',
      } as Node
    );

    expect(onInteractionDrag).toHaveBeenCalledWith(['#1', '#2']);
  });
});
