import { describe, expect, it } from 'vitest';
import type { GraphNode, WorkspaceState } from '../types';
import { generateNextId, migrateWorkspaceIds, normalizeWorkspaceState } from './workspaceState';

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'card',
    title,
    tags: [],
  };
}

function groupNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'group',
    title,
    tags: [],
  };
}

function workspace(nodes: GraphNode[]): WorkspaceState {
  return {
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    graph: {
      nodes,
      edges: [],
    },
    nodePositions: Object.fromEntries(
      nodes.map((node, index) => [node.id, { x: index * 11, y: index * 17 }])
    ),
    viewport: { x: 1, y: 2, zoom: 0.5 },
    selectedNodeId: null,
  };
}

describe('workspaceState', () => {
  it('generates the next numeric card id while ignoring legacy ids', () => {
    expect(generateNextId([cardNode('#1'), cardNode('legacy'), cardNode('#12')])).toBe('#13');
  });

  it('normalizes orphan references, dangling edges, invalid parents, colors, and group layout', () => {
    const state = workspace([
      {
        ...groupNode('#group', 'Group'),
        parentId: '#bad-parent',
      },
      {
        ...cardNode('#1', 'One'),
        parentId: '#group',
        color: 'not-supported',
        references: [
          { id: '#2', title: 'Two' },
          { id: '#group', title: 'Group' },
          { id: '#missing', title: 'Missing' },
        ],
      },
      {
        ...cardNode('#2', 'Two'),
        color: 'blue',
      },
    ]);
    state.graph.edges = [
      {
        id: 'edge-#1-#2',
        sourceId: '#1',
        targetId: '#2',
        type: 'citation',
        weight: 1,
        color: 'unknown',
      },
      {
        id: 'edge-#1-missing',
        sourceId: '#1',
        targetId: '#missing',
        type: 'citation',
        weight: 1,
      },
    ];
    state.nodePositions = {
      '#group': { x: 13, y: 27 },
      '#1': { x: 1, y: 2 },
      '#2': { x: 3, y: 4 },
      '#missing': { x: 5, y: 6 },
    };
    state.nodeSizes = {
      '#group': { width: 133, height: 287 },
      '#1': { width: 111, height: 77 },
      '#missing': { width: 10, height: 10 },
    };

    const normalized = normalizeWorkspaceState(state);
    const group = normalized.graph.nodes.find((node) => node.id === '#group');
    const first = normalized.graph.nodes.find((node) => node.id === '#1');

    expect(group?.parentId).toBeUndefined();
    expect(first?.parentId).toBe('#group');
    expect(first?.color).toBe('');
    expect(first?.references).toEqual([{ id: '#2', title: 'Two' }]);
    expect(normalized.graph.edges).toEqual([
      {
        id: 'edge-#1-#2',
        sourceId: '#1',
        targetId: '#2',
        type: 'citation',
        weight: 1,
        color: 'amber',
      },
    ]);
    expect(normalized.nodePositions).toEqual({
      '#group': { x: 20, y: 20 },
      '#1': { x: 1, y: 2 },
      '#2': { x: 3, y: 4 },
    });
    expect(normalized.nodeSizes).toEqual({
      '#group': { width: 140, height: 280 },
      '#1': { width: 111, height: 77 },
    });
    expect(normalized.viewport).toEqual({ x: 1, y: 2, zoom: 0.5 });
  });

  it('migrates legacy ids by creation order across content, references, edges, positions, sizes, and selection', () => {
    const state = workspace([
      {
        ...cardNode('old-b', 'B'),
        createdAt: '2026-01-02T00:00:00.000Z',
        contentHtml: '<p>See [old-a]</p>',
        references: [{ id: 'old-a', title: 'A' }],
      },
      {
        ...cardNode('old-a', 'A'),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    state.graph.edges = [
      {
        id: 'edge-old-b-old-a',
        sourceId: 'old-b',
        targetId: 'old-a',
        type: 'citation',
        weight: 1,
      },
    ];
    state.nodePositions = {
      'old-a': { x: 10, y: 20 },
      'old-b': { x: 30, y: 40 },
    };
    state.nodeSizes = {
      'old-b': { width: 200, height: 120 },
    };
    state.selectedNodeId = 'old-b';

    const migrated = migrateWorkspaceIds(state);

    expect(migrated.graph.nodes.map((node) => node.id)).toEqual(['#2', '#1']);
    expect(migrated.graph.nodes[0].contentHtml).toBe('<p>See [#1]</p>');
    expect(migrated.graph.nodes[0].references).toEqual([{ id: '#1', title: 'A' }]);
    expect(migrated.graph.edges).toEqual([
      {
        id: 'edge-#2-#1',
        sourceId: '#2',
        targetId: '#1',
        type: 'citation',
        weight: 1,
        color: 'amber',
      },
    ]);
    expect(migrated.nodePositions).toEqual({
      '#1': { x: 10, y: 20 },
      '#2': { x: 30, y: 40 },
    });
    expect(migrated.nodeSizes).toEqual({
      '#2': { width: 200, height: 120 },
    });
    expect(migrated.selectedNodeId).toBe('#2');
  });
});
