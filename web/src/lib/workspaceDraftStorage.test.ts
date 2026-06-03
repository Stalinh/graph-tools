/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { WorkspaceState } from '../types';
import { loadWorkspaceDraft, saveWorkspaceDraft } from './workspaceDraftStorage';

const mockState: WorkspaceState = {
  version: 1,
  savedAt: '2026-06-03T19:00:00.000Z',
  graph: {
    nodes: [{ id: 'node-1', type: 'card', title: 'Test Node', tags: [] }],
    edges: [],
  },
  nodePositions: {
    'node-1': { x: 50, y: 50 },
  },
  nodeSizes: {
    'node-1': { width: 100, height: 100 },
  },
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: 'node-1',
};

describe('workspaceDraftStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveWorkspaceDraft', () => {
    it('successfully saves state and returns true', () => {
      const result = saveWorkspaceDraft(mockState);
      expect(result).toBe(true);

      const raw = localStorage.getItem('local-kg-workspace-draft');
      expect(raw).toBeDefined();
      expect(JSON.parse(raw!)).toMatchObject({
        version: 1,
        selectedNodeId: 'node-1',
      });
    });

    it('returns false and warns to console when localStorage throws (quota exceeded)', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = saveWorkspaceDraft(mockState);
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('loadWorkspaceDraft', () => {
    it('returns null when draft does not exist', () => {
      const result = loadWorkspaceDraft();
      expect(result).toBeNull();
    });

    it('successfully loads draft when valid state exists', () => {
      saveWorkspaceDraft(mockState);
      const loaded = loadWorkspaceDraft();
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(1);
      expect(loaded!.selectedNodeId).toBe('node-1');
      expect(loaded!.graph.nodes[0].title).toBe('Test Node');
    });

    it('returns null and clears localStorage when raw value is not valid JSON', () => {
      localStorage.setItem('local-kg-workspace-draft', '{invalid json');
      const loaded = loadWorkspaceDraft();
      expect(loaded).toBeNull();
      // key should be removed
      expect(localStorage.getItem('local-kg-workspace-draft')).toBeNull();
    });

    it('returns null and clears localStorage when json parse schema validation fails', () => {
      // Missing required properties like graph/version to trigger parser returning null
      localStorage.setItem('local-kg-workspace-draft', JSON.stringify({ selection: 'none' }));
      const loaded = loadWorkspaceDraft();
      expect(loaded).toBeNull();
      expect(localStorage.getItem('local-kg-workspace-draft')).toBeNull();
    });
  });
});
