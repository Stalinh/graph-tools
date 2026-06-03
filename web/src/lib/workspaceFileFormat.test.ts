import { describe, expect, it } from 'vitest';
import type { GraphNode, WorkspaceState } from '../types';
import { EDGE_STYLES } from './edgeStyles';
import {
  getWorkspaceImagePaths,
  isCanonicalWorkspaceFileName,
  isWorkspaceImagePath,
  parseWorkspaceStateJson,
  serializeWorkspaceState,
} from './workspaceFileFormat';

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'card',
    title,
    tags: [],
  };
}

function workspace(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    graph: {
      nodes: [cardNode('#1', 'Alpha'), cardNode('#2', 'Beta')],
      edges: [
        {
          id: 'edge-#1-#2',
          sourceId: '#1',
          targetId: '#2',
          type: 'citation',
          weight: 1,
        },
      ],
    },
    nodePositions: {
      '#1': { x: 10, y: 20 },
      '#2': { x: 30, y: 40 },
    },
    nodeSizes: {
      '#1': { width: 180, height: 120 },
    },
    viewport: { x: 100, y: 200, zoom: 0.75 },
    selectedNodeId: '#1',
    ...overrides,
  };
}

describe('workspaceFileFormat', () => {
  it('round-trips a valid workspace state', () => {
    const state = workspace();

    expect(parseWorkspaceStateJson(serializeWorkspaceState(state))).toEqual(state);
  });

  it('rejects duplicate node ids', () => {
    const state = workspace({
      graph: {
        nodes: [cardNode('#1', 'Alpha'), cardNode('#1', 'Duplicate')],
        edges: [],
      },
      nodePositions: {
        '#1': { x: 0, y: 0 },
      },
      selectedNodeId: '#1',
    });

    expect(parseWorkspaceStateJson(JSON.stringify(state))).toBeNull();
  });

  it('rejects duplicate edge ids', () => {
    const state = workspace({
      graph: {
        nodes: [cardNode('#1'), cardNode('#2'), cardNode('#3')],
        edges: [
          {
            id: 'edge-duplicate',
            sourceId: '#1',
            targetId: '#2',
            type: 'citation',
            weight: 1,
          },
          {
            id: 'edge-duplicate',
            sourceId: '#2',
            targetId: '#3',
            type: 'citation',
            weight: 1,
          },
        ],
      },
      nodePositions: {
        '#1': { x: 0, y: 0 },
        '#2': { x: 10, y: 10 },
        '#3': { x: 20, y: 20 },
      },
    });

    expect(parseWorkspaceStateJson(JSON.stringify(state))).toBeNull();
  });

  it('accepts every edge style and legacy edges without style', () => {
    const state = workspace({
      graph: {
        nodes: [cardNode('#1', 'Alpha'), cardNode('#2', 'Beta')],
        edges: [
          ...EDGE_STYLES.map((style) => ({
            id: `edge-${style}`,
            sourceId: '#1',
            targetId: '#2',
            type: 'citation' as const,
            weight: 1,
            style,
          })),
          {
            id: 'edge-legacy',
            sourceId: '#2',
            targetId: '#1',
            type: 'citation' as const,
            weight: 1,
          },
        ],
      },
    });

    expect(
      parseWorkspaceStateJson(JSON.stringify(state))?.graph.edges.map((edge) => edge.style)
    ).toEqual([...EDGE_STYLES, undefined]);

    const invalidState = workspace();
    invalidState.graph.edges[0] = {
      ...invalidState.graph.edges[0],
      style: 'dotted' as never,
    };

    expect(parseWorkspaceStateJson(JSON.stringify(invalidState))).toBeNull();
  });

  it('rejects dangling selected nodes, edges, and references', () => {
    const selectedMissing = workspace({ selectedNodeId: '#missing' });
    const edgeMissing = workspace({
      graph: {
        nodes: [cardNode('#1'), cardNode('#2')],
        edges: [
          {
            id: 'edge-#1-missing',
            sourceId: '#1',
            targetId: '#missing',
            type: 'citation',
            weight: 1,
          },
        ],
      },
    });
    const referenceMissing = workspace({
      graph: {
        nodes: [{ ...cardNode('#1'), references: [{ id: '#missing', title: 'Missing' }] }],
        edges: [],
      },
    });

    expect(parseWorkspaceStateJson(JSON.stringify(selectedMissing))).toBeNull();
    expect(parseWorkspaceStateJson(JSON.stringify(edgeMissing))).toBeNull();
    expect(parseWorkspaceStateJson(JSON.stringify(referenceMissing))).toBeNull();
  });

  it('accepts canonical graph names and safe one-level image paths only', () => {
    expect(isCanonicalWorkspaceFileName('workspace.graph')).toBe(true);
    expect(isCanonicalWorkspaceFileName('WORKSPACE.GRAPH')).toBe(true);
    expect(isCanonicalWorkspaceFileName('workspace.graph.zip')).toBe(false);

    expect(isWorkspaceImagePath('images/photo.png')).toBe(true);
    expect(isWorkspaceImagePath('images/nested/photo.png')).toBe(false);
    expect(isWorkspaceImagePath('images/../photo.png')).toBe(false);
    expect(isWorkspaceImagePath('images\\photo.png')).toBe(false);
  });

  it('returns sorted unique image asset paths referenced by image nodes', () => {
    const state = workspace({
      graph: {
        nodes: [
          { id: '#1', type: 'image', title: 'B', tags: [], imagePath: 'images/b.png' },
          { id: '#2', type: 'image', title: 'A', tags: [], imagePath: 'images/a.png' },
          { id: '#3', type: 'image', title: 'Again', tags: [], imagePath: 'images/a.png' },
          cardNode('#4'),
        ],
        edges: [],
      },
    });

    expect(getWorkspaceImagePaths(state)).toEqual(['images/a.png', 'images/b.png']);
  });
});
