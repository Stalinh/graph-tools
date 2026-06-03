/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphEdge, GraphNode } from '../types';
import { EdgeEditor } from './EdgeEditor';

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'card',
    title,
    tags: [],
  };
}

function edge(style: GraphEdge['style']): GraphEdge {
  return {
    id: 'edge-#1-#2',
    sourceId: '#1',
    targetId: '#2',
    type: 'citation',
    weight: 1,
    style,
  };
}

describe('EdgeEditor', () => {
  it('offers solid, sketch, and note dash edge styles', () => {
    const onStyleChange = vi.fn();
    const view = render(
      <EdgeEditor
        edge={edge('solid')}
        sourceNode={cardNode('#1', 'One')}
        targetNode={cardNode('#2', 'Two')}
        onColorChange={() => {}}
        onDirectionChange={() => {}}
        onStyleChange={onStyleChange}
      />
    );
    const editor = within(view.container);

    const solidButton = editor.getByRole('button', { name: '切换为实线' });
    const sketchButton = editor.getByRole('button', { name: '切换为草图' });
    const noteDashButton = editor.getByRole('button', { name: '切换为笔记虚线' });

    expect(solidButton.getAttribute('aria-pressed')).toBe('true');
    expect(editor.getByTestId('edge-style-preview-solid')).toBeTruthy();
    expect(editor.getByTestId('edge-style-preview-sketch')).toBeTruthy();
    expect(editor.getByTestId('edge-style-preview-note-dash')).toBeTruthy();

    fireEvent.click(solidButton);
    fireEvent.click(sketchButton);
    fireEvent.click(noteDashButton);

    expect(onStyleChange.mock.calls.map(([, style]) => style)).toEqual([
      'solid',
      'sketch',
      'note-dash',
    ]);
  });

  it('shows legacy undefined edge style as note dash', () => {
    const view = render(
      <EdgeEditor
        edge={edge(undefined)}
        sourceNode={cardNode('#1', 'One')}
        targetNode={cardNode('#2', 'Two')}
        onColorChange={() => {}}
        onDirectionChange={() => {}}
        onStyleChange={() => {}}
      />
    );
    const editor = within(view.container);

    expect(
      editor.getByRole('button', { name: '切换为笔记虚线' }).getAttribute('aria-pressed')
    ).toBe('true');
  });
});
