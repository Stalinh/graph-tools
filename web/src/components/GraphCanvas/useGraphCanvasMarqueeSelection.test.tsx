/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphNode } from '../../types';
import { useGraphCanvasMarqueeSelection } from './useGraphCanvasMarqueeSelection';

function cardNode(id: string): GraphNode {
  return {
    id,
    type: 'card',
    title: id,
    tags: [],
  };
}

function createContainer() {
  const container = document.createElement('div');
  const pane = document.createElement('div');
  pane.className = 'react-flow__pane';
  container.appendChild(pane);

  const createNodeElement = (
    nodeId: string,
    rect: { left: number; right: number; top: number; bottom: number }
  ) => {
    const element = document.createElement('div');
    element.className = 'react-flow__node';
    element.setAttribute('data-id', nodeId);
    element.getBoundingClientRect = () => ({
      ...rect,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    });
    container.appendChild(element);
    return element;
  };

  return { container, pane, createNodeElement };
}

describe('useGraphCanvasMarqueeSelection', () => {
  it('keeps existing selection at selection start and replaces on selection end', () => {
    const { container, pane, createNodeElement } = createContainer();
    createNodeElement('node-1', { left: 10, right: 60, top: 10, bottom: 60 });
    createNodeElement('node-2', { left: 80, right: 130, top: 10, bottom: 60 });

    const onEdgeSelect = vi.fn();
    const onSelectNodeIds = vi.fn();
    const { result } = renderHook(() =>
      useGraphCanvasMarqueeSelection({
        containerRef: { current: container },
        graphNodes: [cardNode('node-1'), cardNode('node-2')],
        selectedNodeIds: ['node-1'],
        onEdgeSelect,
        onSelectNodeIds,
      })
    );

    act(() => {
      result.current.handleMouseDownCapture({
        button: 0,
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
        metaKey: false,
        target: pane,
      } as never);
      result.current.handleSelectionStart();
    });

    expect(onSelectNodeIds).not.toHaveBeenCalledWith([]);

    act(() => {
      result.current.handleMouseMoveCapture({
        clientX: 140,
        clientY: 80,
      } as never);
      result.current.handleSelectionEnd({
        clientX: 140,
        clientY: 80,
      } as never);
    });

    expect(onEdgeSelect).toHaveBeenCalledWith(null);
    expect(onSelectNodeIds).toHaveBeenLastCalledWith(['node-1', 'node-2']);
  });

  it('uses cached node rects for selection end hit-testing', () => {
    const { container, pane, createNodeElement } = createContainer();
    const node = createNodeElement('node-1', { left: 10, right: 60, top: 10, bottom: 60 });

    const onEdgeSelect = vi.fn();
    const onSelectNodeIds = vi.fn();
    const { result } = renderHook(() =>
      useGraphCanvasMarqueeSelection({
        containerRef: { current: container },
        graphNodes: [cardNode('node-1')],
        selectedNodeIds: [],
        onEdgeSelect,
        onSelectNodeIds,
      })
    );

    act(() => {
      result.current.handleMouseDownCapture({
        button: 0,
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
        metaKey: false,
        target: pane,
      } as never);
    });

    const rectSpy = vi.spyOn(node, 'getBoundingClientRect');

    act(() => {
      result.current.handleSelectionStart();
    });

    const callsAfterStart = rectSpy.mock.calls.length;

    act(() => {
      result.current.handleMouseMoveCapture({
        clientX: 80,
        clientY: 80,
      } as never);
      result.current.handleSelectionEnd({
        clientX: 80,
        clientY: 80,
      } as never);
    });

    expect(rectSpy.mock.calls.length).toBe(callsAfterStart);
    expect(onSelectNodeIds).toHaveBeenLastCalledWith(['node-1']);
  });
});
