import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../types';
import { DEFAULT_GROUP_SIZE } from './graphLayout';
import { createNodeDraft, deleteNodeDraft, deleteNodesDraft } from './graphNodeCommands';

const CREATED_AT = '2026-01-01T00:00:00.000Z';

function groupNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'group',
    title,
    tags: [],
  };
}

function cardNode(id: string, title = id, parentId?: string): GraphNode {
  return {
    id,
    type: 'card',
    title,
    parentId,
    tags: parentId ? ['Group'] : [],
    contentHtml: '<p></p>',
  };
}

function graph(nodes: GraphNode[]): GraphData {
  return { nodes, edges: [] };
}

describe('graphNodeCommands', () => {
  it('creates a card inside a containing group with relative position and inherited tag', () => {
    const draft = createNodeDraft({
      createdAt: CREATED_AT,
      defaultCardTitle: 'Untitled card',
      defaultGroupTitle: 'Untitled group',
      graph: graph([groupNode('#group', 'Group')]),
      id: '#1',
      position: { x: 120, y: 140 },
      positions: {
        '#group': { x: 100, y: 100 },
      },
      sizes: {
        '#group': DEFAULT_GROUP_SIZE,
      },
      type: 'card',
    });

    expect(draft.node).toMatchObject({
      id: '#1',
      type: 'card',
      title: 'Untitled card',
      parentId: '#group',
      tags: ['Group'],
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(draft.position).toEqual({ x: 20, y: 40 });
    expect(draft.positions['#1']).toEqual({ x: 20, y: 40 });
  });

  it('creates a group snapped to grid and assigns the default group size', () => {
    const draft = createNodeDraft({
      createdAt: CREATED_AT,
      defaultCardTitle: 'Untitled card',
      defaultGroupTitle: 'Untitled group',
      graph: graph([]),
      id: '#1',
      position: { x: 13, y: 27 },
      positions: {},
      sizes: {},
      type: 'group',
    });

    expect(draft.node).toMatchObject({
      id: '#1',
      type: 'group',
      title: 'Untitled group',
      tags: [],
    });
    expect(draft.position).toEqual({ x: 20, y: 20 });
    expect(draft.size).toEqual(DEFAULT_GROUP_SIZE);
  });

  it('deletes a card and removes edges, references, positions, and sizes', () => {
    const source = {
      ...cardNode('#1', 'One'),
      references: [{ id: '#2', title: 'Two' }],
    };
    const target = cardNode('#2', 'Two');
    const draft = deleteNodeDraft(
      '#2',
      {
        nodes: [source, target],
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
      {
        '#1': { x: 0, y: 0 },
        '#2': { x: 50, y: 60 },
      },
      {
        '#2': { width: 120, height: 80 },
      }
    );

    expect(draft?.graph.nodes).toEqual([{ ...source, references: [] }]);
    expect(draft?.graph.edges).toEqual([]);
    expect(draft?.positions).toEqual({ '#1': { x: 0, y: 0 } });
    expect(draft?.sizes).toEqual({});
    expect(Object.keys(draft ?? {}).sort()).toEqual(['graph', 'positions', 'sizes']);
  });

  it('deletes a group by detaching children before removal', () => {
    const group = groupNode('#group', 'Group');
    const child = cardNode('#child', 'Child', '#group');
    const positions = {
      '#group': { x: 100, y: 200 },
      '#child': { x: 10, y: 20 },
    };
    const sizes = {
      '#group': DEFAULT_GROUP_SIZE,
      '#child': { width: 120, height: 80 },
    };
    const sourceGraph = graph([group, child]);
    const draft = deleteNodeDraft('#group', sourceGraph, positions, sizes);
    const detachedChild = draft?.graph.nodes.find((node) => node.id === '#child');

    expect(detachedChild?.parentId).toBeUndefined();
    expect(detachedChild?.tags).toEqual([]);
    expect(draft?.positions['#child']).toEqual({ x: 110, y: 220 });
    expect(Object.keys(draft ?? {}).sort()).toEqual(['graph', 'positions', 'sizes']);
  });

  it('returns null for empty or non-matching batch deletes', () => {
    expect(deleteNodesDraft([], graph([cardNode('#1')]), {}, {})).toBeNull();
    expect(deleteNodesDraft(['#missing'], graph([cardNode('#1')]), {}, {})).toBeNull();
  });

  it('deletes multiple nodes and returns removed ids for cache cleanup', () => {
    const first = {
      ...cardNode('#1', 'One'),
      references: [{ id: '#2', title: 'Two' }],
    };
    const second = cardNode('#2', 'Two');
    const third = cardNode('#3', 'Three');
    const draft = deleteNodesDraft(
      ['#2', '#3'],
      {
        nodes: [first, second, third],
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
      {
        '#1': { x: 0, y: 0 },
        '#2': { x: 20, y: 30 },
        '#3': { x: 40, y: 50 },
      },
      {
        '#2': { width: 120, height: 80 },
        '#3': { width: 130, height: 90 },
      }
    );

    expect(draft?.graph.nodes).toEqual([{ ...first, references: [] }]);
    expect(draft?.positions).toEqual({ '#1': { x: 0, y: 0 } });
    expect(draft?.sizes).toEqual({});
    expect(draft?.removedNodeIds).toEqual([second.id, third.id]);
  });

  it('detaches children in batch when deleting a group', () => {
    const sourceGraph = graph([
      groupNode('#group', 'Group'),
      cardNode('#child', 'Child', '#group'),
    ]);
    const positions = {
      '#group': { x: 100, y: 200 },
      '#child': { x: 10, y: 20 },
    };
    const sizes = {
      '#group': DEFAULT_GROUP_SIZE,
      '#child': { width: 120, height: 80 },
    };
    const draft = deleteNodesDraft(['#group'], sourceGraph, positions, sizes);

    expect(draft?.graph.nodes[0].id).toBe('#child');
    expect(draft?.graph.nodes[0].parentId).toBeUndefined();
    expect(draft?.positions).toEqual({ '#child': { x: 110, y: 220 } });
    expect(draft?.removedNodeIds).toEqual(['#group']);
    expect(Object.keys(draft ?? {}).sort()).toEqual([
      'graph',
      'positions',
      'removedNodeIds',
      'sizes',
    ]);
  });
});
