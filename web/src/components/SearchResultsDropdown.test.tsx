/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NodeSearchResult } from '../lib/searchUtils';
import type { GraphNode } from '../types';
import { SearchResultsDropdown } from './SearchResultsDropdown';

const matchingNodes: GraphNode[] = [
  {
    id: '#1',
    type: 'card',
    title: 'Alpha',
    tags: [],
  },
  {
    id: '#2',
    type: 'card',
    title: 'Beta',
    tags: [],
  },
  {
    id: '#3',
    type: 'image',
    title: 'Gamma',
    tags: [],
  },
];

const matchingResults: NodeSearchResult[] = matchingNodes.map((node) => ({
  node,
  matches: [
    {
      field: 'title',
      indices: [[0, 0]],
      preview: node.title,
      previewIndices: [[0, 0]],
    },
  ],
}));

afterEach(() => {
  cleanup();
});

function renderDropdown(results = matchingResults, searchQuery = 'a') {
  const onClose = vi.fn();
  const onNavigate = vi.fn();
  const view = render(
    <div>
      <button type="button">Outside action</button>
      <div className="workspace-toolbar__search">
        <input className="workspace-toolbar__search-input" aria-label="Search nodes" />
        <SearchResultsDropdown
          matchingResults={results}
          searchQuery={searchQuery}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );

  return {
    ...view,
    onClose,
    onNavigate,
    outsideButton: view.getByRole('button', { name: 'Outside action' }),
    searchInput: view.getByLabelText('Search nodes'),
  };
}

function getResultButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('.search-result'));
}

function getHighlightedTitle(container: HTMLElement): string | null {
  return (
    container.querySelector<HTMLElement>('.search-result.is-highlighted .search-result__title')
      ?.textContent ?? null
  );
}

describe('SearchResultsDropdown', () => {
  it('renders executive search dropdown chrome classes', () => {
    const { container } = renderDropdown();

    expect(container.querySelector('.search-results-dropdown--executive')).not.toBeNull();
    expect(container.querySelector('.search-result__accent')).not.toBeNull();
  });

  it('does not navigate on Enter when focus is outside the search context', () => {
    const { onNavigate, outsideButton } = renderDropdown();

    outsideButton.focus();
    fireEvent.keyDown(outsideButton, { key: 'Enter' });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates the highlighted item on Enter when the search input has focus', () => {
    const { onNavigate, searchInput } = renderDropdown();

    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('#2');
  });

  it('changes highlight with arrow keys only inside the search input or dropdown context', () => {
    const { container, outsideButton, searchInput } = renderDropdown();

    expect(getHighlightedTitle(container)).toBe('Alpha');

    outsideButton.focus();
    fireEvent.keyDown(outsideButton, { key: 'ArrowDown' });
    expect(getHighlightedTitle(container)).toBe('Alpha');

    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(getHighlightedTitle(container)).toBe('Beta');

    outsideButton.focus();
    fireEvent.keyDown(outsideButton, { key: 'ArrowDown' });
    expect(getHighlightedTitle(container)).toBe('Beta');

    const [firstResult] = getResultButtons(container);
    firstResult.focus();
    fireEvent.focusIn(firstResult);
    expect(getHighlightedTitle(container)).toBe('Alpha');

    fireEvent.keyDown(firstResult, { key: 'ArrowUp' });
    expect(getHighlightedTitle(container)).toBe('Gamma');
  });

  it('closes search on Escape from the dropdown', () => {
    const { container, onClose, onNavigate } = renderDropdown();
    const [, secondResult] = getResultButtons(container);

    secondResult.focus();
    fireEvent.focusIn(secondResult);
    expect(document.activeElement).toBe(secondResult);

    fireEvent.keyDown(secondResult, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('renders previews from the provided match results', () => {
    const { container } = renderDropdown(
      [
        {
          node: matchingNodes[0],
          matches: [
            {
              field: 'content',
              indices: [],
              preview: 'Cached content preview',
              previewIndices: [],
            },
          ],
        },
      ],
      'zz'
    );

    expect(container.querySelector('.search-result__preview')?.textContent).toBe(
      'Cached content preview'
    );
  });
});
