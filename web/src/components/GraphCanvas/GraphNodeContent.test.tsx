/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearContentCache } from '../../lib/cardContentCache';
import type { GraphNode } from '../../types';
import { renderCardContent } from './GraphNodeContent';

function cardNode(contentHtml: string): GraphNode {
  return {
    id: '#1',
    type: 'card',
    title: 'One',
    tags: [],
    contentHtml,
    references: [{ id: '#2', title: 'Two' }],
  };
}

describe('GraphNodeContent', () => {
  beforeEach(() => {
    clearContentCache();
  });

  it('renders inline references as buttons and calls the reference selector', () => {
    const onReferenceSelect = vi.fn();
    const node = cardNode('<p>See [#2] and [#999]</p>');

    const view = render(<>{renderCardContent(node, onReferenceSelect, undefined, 'zh-CN')}</>);
    const referenceButton = view.getByRole('button', {
      name: '打开画布引用 #2: Two',
    });

    fireEvent.click(referenceButton);

    expect(onReferenceSelect).toHaveBeenCalledWith('#2');
    expect(view.container.textContent).toContain('[#999]');
  });

  it('sanitizes links, unsupported tags, and disallowed inline background colors', () => {
    const node = cardNode(
      [
        '<p>',
        '<a href="javascript:alert(1)">bad link</a>',
        '<script>alert("x")</script>',
        '<span style="background-color: #000000; color: red">Styled</span>',
        '<mark data-color="#fef08a">Marked</mark>',
        '</p>',
      ].join('')
    );

    const view = render(<>{renderCardContent(node, vi.fn(), undefined, 'zh-CN')}</>);
    const link = view.getByRole('link', { name: 'bad link' });
    const styled = Array.from(view.container.querySelectorAll('span')).find(
      (element) => element.textContent === 'Styled'
    );
    const mark = view.container.querySelector('mark');

    expect(link.getAttribute('href')).toBe('#');
    expect(view.container.querySelector('script')).toBeNull();
    expect(view.container.textContent).toContain('alert("x")');
    expect(styled?.getAttribute('style') ?? '').toContain('color: red');
    expect(styled?.getAttribute('style') ?? '').not.toContain('background');
    expect(mark?.getAttribute('style') ?? '').toContain('background-color');
  });

  it('highlights search matches without losing inline reference buttons', () => {
    const onReferenceSelect = vi.fn();
    const node = cardNode('<p>Hello [#2], hello again</p>');

    const view = render(<>{renderCardContent(node, onReferenceSelect, 'hello', 'en-US')}</>);

    expect(
      Array.from(view.container.querySelectorAll('mark')).map((mark) => mark.textContent)
    ).toEqual(['Hello', 'hello']);
    fireEvent.click(view.getByRole('button', { name: 'Open canvas reference #2: Two' }));
    expect(onReferenceSelect).toHaveBeenCalledWith('#2');
  });
});
