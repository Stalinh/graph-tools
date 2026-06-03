// charset: utf-8
/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHashRoute, onHashRouteChange, setHashRoute } from './hashRouter';

describe('hashRouter', () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = originalHash;
    vi.restoreAllMocks();
  });

  it('should return default route when hash is empty', () => {
    expect(getHashRoute()).toBe('knowledge-base');
  });

  it('should return page name when hash is set', () => {
    window.location.hash = 'project';
    expect(getHashRoute()).toBe('project');
  });

  it('should set window.location.hash when calling setHashRoute', () => {
    setHashRoute('project-page');
    expect(window.location.hash).toBe('#project-page');
    expect(getHashRoute()).toBe('project-page');
  });

  it('should trigger handler and clean up listener with onHashRouteChange', () => {
    const handler = vi.fn();
    const cleanup = onHashRouteChange(handler);

    // Simulate hashchange event
    window.location.hash = 'knowledge-base';
    const event = new HashChangeEvent('hashchange');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledWith('knowledge-base');

    // Clean up
    cleanup();
    handler.mockClear();

    // Trigger hashchange again, handler shouldn't be called
    window.location.hash = 'another-page';
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
