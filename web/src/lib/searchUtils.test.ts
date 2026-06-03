/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphNode } from '../types';
import { clearSearchIndexCache, getMatchingNodeResults, smartMatches } from './searchUtils';

function cardNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: '#1',
    type: 'card',
    title: 'Alpha',
    tags: [],
    contentHtml: '<p>Find this needle</p>',
    ...overrides,
  };
}

afterEach(() => {
  clearSearchIndexCache();
  vi.restoreAllMocks();
});

describe('searchUtils', () => {
  it('reuses the node search index for repeated searches', () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const node = cardNode();

    expect(smartMatches(node, 'needle').some((match) => match.field === 'content')).toBe(true);
    expect(smartMatches(node, 'needle').some((match) => match.field === 'content')).toBe(true);

    expect(parseSpy).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the node search index when searchable content changes', () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const node = cardNode({ contentHtml: '<p>Old content</p>' });

    expect(smartMatches(node, 'old').some((match) => match.field === 'content')).toBe(true);
    expect(
      smartMatches({ ...node, contentHtml: '<p>New content</p>' }, 'new').some(
        (match) => match.field === 'content'
      )
    ).toBe(true);

    expect(parseSpy).toHaveBeenCalledTimes(2);
  });

  it('returns matching nodes with their upstream match results', () => {
    const node = cardNode({ tags: ['work'], contentHtml: '<p>Project content</p>' });
    const results = getMatchingNodeResults([node], 'project', {
      selectedTags: ['work'],
      selectedColors: [],
    });

    expect(results).toHaveLength(1);
    expect(results[0].node).toBe(node);
    expect(results[0].matches.some((match) => match.field === 'content')).toBe(true);
  });
});
