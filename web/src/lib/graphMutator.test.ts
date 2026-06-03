import { describe, expect, it } from 'vitest';
import type { GraphData, GraphNode } from '../types';
import { EDGE_STYLES } from './edgeStyles';
import {
  addCitation,
  removeCitation,
  removeNode,
  reorderReferences,
  restoreNode,
  updateEdgeDirection,
  updateEdgeStyle,
  updateNodeFields,
  updateNodeOpacity,
} from './graphMutator';

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

function graph(nodes: GraphNode[]): GraphData {
  return { nodes, edges: [] };
}

describe('graphMutator', () => {
  it('adds unidirectional and bidirectional citations while preventing duplicates and group citations', () => {
    const initial = graph([cardNode('#1', 'One'), cardNode('#2', 'Two'), groupNode('#group')]);

    const linked = addCitation(initial, '#1', '#2');
    expect(linked.edges).toHaveLength(1);
    expect(linked.edges[0].style).toBe('note-dash');
    expect(linked.nodes.find((node) => node.id === '#1')?.references).toEqual([
      { id: '#2', title: 'Two' },
    ]);
    expect(linked.nodes.find((node) => node.id === '#2')?.references).toBeUndefined();

    expect(addCitation(linked, '#2', '#1')).toBe(linked);
    expect(addCitation(linked, '#1', '#group')).toBe(linked);

    const bidirectional = addCitation(initial, '#1', '#2', 'bidirectional');
    expect(bidirectional.nodes.find((node) => node.id === '#1')?.references).toEqual([
      { id: '#2', title: 'Two' },
    ]);
    expect(bidirectional.nodes.find((node) => node.id === '#2')?.references).toEqual([
      { id: '#1', title: 'One' },
    ]);
  });

  it('updates edge style to every legal style', () => {
    const linked = addCitation(graph([cardNode('#1', 'One'), cardNode('#2', 'Two')]), '#1', '#2');
    let current = linked;

    for (const style of EDGE_STYLES) {
      current = updateEdgeStyle(current, 'edge-#1-#2', style);
      expect(current.edges[0].style).toBe(style);
    }
  });

  it('removes bidirectional citations from both sides', () => {
    const linked = addCitation(
      graph([cardNode('#1', 'One'), cardNode('#2', 'Two')]),
      '#1',
      '#2',
      'bidirectional'
    );

    const unlinked = removeCitation(linked, '#1', '#2');

    expect(unlinked.edges).toEqual([]);
    expect(unlinked.nodes.find((node) => node.id === '#1')?.references).toEqual([]);
    expect(unlinked.nodes.find((node) => node.id === '#2')?.references).toEqual([]);
  });

  it('removes and restores a node with edges and affected references', () => {
    const initial = addCitation(graph([cardNode('#1', 'One'), cardNode('#2', 'Two')]), '#1', '#2');
    const removed = removeNode(initial, '#2');

    expect(removed.removedNode?.id).toBe('#2');
    expect(removed.removedEdges).toHaveLength(1);
    expect(removed.affectedRefs).toEqual([{ ownerId: '#1', refId: '#2' }]);
    expect(removed.graph.nodes.map((node) => node.id)).toEqual(['#1']);
    expect(removed.graph.nodes[0].references).toEqual([]);
    expect(removed.graph.edges).toEqual([]);

    expect(
      restoreNode(removed.graph, removed.removedNode!, removed.removedEdges, removed.affectedRefs)
    ).toEqual(initial);
  });

  it('updates group titles on child tags', () => {
    const updated = updateNodeFields(
      graph([
        groupNode('#group', 'Old'),
        { ...cardNode('#1'), parentId: '#group', tags: ['Old', 'Keep'] },
      ]),
      { ...groupNode('#group', 'New'), tags: [] }
    );

    expect(updated.nodes.find((node) => node.id === '#1')?.tags).toEqual(['Keep', 'New']);
  });

  it('keeps references consistent when edge direction and order change', () => {
    const linked = addCitation(
      graph([cardNode('#1', 'One'), cardNode('#2', 'Two'), cardNode('#3', 'Three')]),
      '#1',
      '#2'
    );
    const withThirdReference = {
      ...linked,
      nodes: linked.nodes.map((node) =>
        node.id === '#1'
          ? { ...node, references: [...(node.references ?? []), { id: '#3', title: 'Three' }] }
          : node
      ),
    };

    const bidirectional = updateEdgeDirection(withThirdReference, 'edge-#1-#2', 'bidirectional');
    expect(bidirectional.nodes.find((node) => node.id === '#2')?.references).toEqual([
      { id: '#1', title: 'One' },
    ]);

    const reordered = reorderReferences(bidirectional, '#1', ['#3', '#2', '#missing']);
    expect(reordered.nodes.find((node) => node.id === '#1')?.references).toEqual([
      { id: '#3', title: 'Three' },
      { id: '#2', title: 'Two' },
    ]);
  });

  it('clamps opacity updates', () => {
    const initial = graph([cardNode('#1')]);

    expect(updateNodeOpacity(initial, '#1', 2).nodes[0].opacity).toBe(1);
    expect(updateNodeOpacity(initial, '#1', -1).nodes[0].opacity).toBe(0);
  });
});
