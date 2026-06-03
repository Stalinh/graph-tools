import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../types';
import { DEFAULT_GROUP_SIZE } from './graphLayout';
import {
  areViewportsEqual,
  detachChildrenFromGroup,
  findAvailableGroupPosition,
  isGroupPlacementBlocked,
  resolveGroupMoveTarget,
  resolveGroupMoveTargets,
} from './groupNodeLayout';

function groupNode(id: string, title = id): GraphNode {
  return {
    id,
    type: 'group',
    title,
    tags: [],
  };
}

function cardNode(id: string, parentId?: string): GraphNode {
  return {
    id,
    type: 'card',
    title: id,
    parentId,
    tags: parentId ? ['Group'] : [],
  };
}

describe('groupNodeLayout', () => {
  it('compares viewports without treating null as equal', () => {
    expect(areViewportsEqual(null, { x: 0, y: 0, zoom: 1 })).toBe(false);
    expect(areViewportsEqual({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 1 })).toBe(true);
    expect(areViewportsEqual({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 2 })).toBe(false);
  });

  it('detaches group children into absolute positions and removes the group tag', () => {
    const graph: GraphData = {
      nodes: [groupNode('#group', 'Group'), cardNode('#child', '#group'), cardNode('#other')],
      edges: [],
    };

    const result = detachChildrenFromGroup(
      '#group',
      'Group',
      graph,
      {
        '#group': { x: 100, y: 200 },
        '#child': { x: 10, y: 20 },
        '#other': { x: 1, y: 2 },
      },
      {
        '#group': DEFAULT_GROUP_SIZE,
        '#child': { width: 120, height: 80 },
      }
    );
    const detachedChild = result.graph.nodes.find((node) => node.id === '#child');

    expect(detachedChild?.parentId).toBeUndefined();
    expect(detachedChild?.tags).toEqual([]);
    expect(detachedChild?.updatedAt).toEqual(expect.any(String));
    expect(result.positions).toEqual({
      '#child': { x: 110, y: 220 },
      '#other': { x: 1, y: 2 },
    });
    expect(result.sizes).toEqual({
      '#child': { width: 120, height: 80 },
    });
  });

  it('detects blocked group placement and finds a nearby open grid position', () => {
    const nodes = [groupNode('#a'), groupNode('#b')];
    const positions = {
      '#a': { x: 0, y: 0 },
      '#b': { x: 0, y: 0 },
    };
    const sizes = {
      '#a': DEFAULT_GROUP_SIZE,
      '#b': DEFAULT_GROUP_SIZE,
    };

    expect(
      isGroupPlacementBlocked('#b', { x: 0, y: 0 }, DEFAULT_GROUP_SIZE, nodes, positions, sizes)
    ).toBe(true);
    expect(findAvailableGroupPosition('#b', { x: 0, y: 0 }, nodes, positions, sizes)).not.toEqual({
      x: 0,
      y: 0,
    });
  });

  it('resolves a moving group so it stops before colliding with a static group', () => {
    const nodes = [groupNode('#moving'), groupNode('#static')];
    const positions = {
      '#moving': { x: 0, y: 0 },
      '#static': { x: 200, y: 0 },
    };
    const sizes = {
      '#moving': { width: 100, height: 100 },
      '#static': { width: 100, height: 100 },
    };

    expect(
      resolveGroupMoveTarget(
        '#moving',
        { x: 0, y: 0 },
        { x: 250, y: 0 },
        sizes['#moving'],
        nodes,
        positions,
        sizes
      )
    ).toEqual({ x: 100, y: 0 });
  });

  it('resolves multiple moving groups while ignoring collisions between the moving set', () => {
    const nodes = [groupNode('#a'), groupNode('#b'), groupNode('#static')];
    const positions = {
      '#a': { x: 0, y: 0 },
      '#b': { x: 0, y: 120 },
      '#static': { x: 200, y: 0 },
    };
    const sizes = {
      '#a': { width: 100, height: 100 },
      '#b': { width: 100, height: 100 },
      '#static': { width: 100, height: 100 },
    };

    expect(
      resolveGroupMoveTargets(
        [
          { nodeId: '#a', from: { x: 0, y: 0 }, to: { x: 260, y: 0 } },
          { nodeId: '#b', from: { x: 0, y: 120 }, to: { x: 260, y: 120 } },
        ],
        nodes,
        positions,
        sizes
      )
    ).toEqual({
      '#a': { x: 100, y: 0 },
      '#b': { x: 260, y: 120 },
      '#static': { x: 200, y: 0 },
    });
  });
});
