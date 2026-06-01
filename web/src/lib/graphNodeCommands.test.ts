import { describe, expect, it } from "vitest";
import type { GraphData, GraphNode } from "../types";
import { DEFAULT_GROUP_SIZE } from "./graphLayout";
import { createNodeDraft, deleteNodeDraft } from "./graphNodeCommands";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

function groupNode(id: string, title = id): GraphNode {
  return {
    id,
    type: "group",
    title,
    tags: [],
  };
}

function cardNode(id: string, title = id, parentId?: string): GraphNode {
  return {
    id,
    type: "card",
    title,
    parentId,
    tags: parentId ? ["Group"] : [],
    contentHtml: "<p></p>",
  };
}

function graph(nodes: GraphNode[]): GraphData {
  return { nodes, edges: [] };
}

describe("graphNodeCommands", () => {
  it("creates a card inside a containing group with relative position and inherited tag", () => {
    const draft = createNodeDraft({
      createdAt: CREATED_AT,
      defaultCardTitle: "Untitled card",
      defaultGroupTitle: "Untitled group",
      graph: graph([groupNode("#group", "Group")]),
      id: "#1",
      position: { x: 120, y: 140 },
      positions: {
        "#group": { x: 100, y: 100 },
      },
      sizes: {
        "#group": DEFAULT_GROUP_SIZE,
      },
      type: "card",
    });

    expect(draft.node).toMatchObject({
      id: "#1",
      type: "card",
      title: "Untitled card",
      parentId: "#group",
      tags: ["Group"],
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(draft.position).toEqual({ x: 20, y: 40 });
    expect(draft.positions["#1"]).toEqual({ x: 20, y: 40 });
  });

  it("creates a group snapped to grid and assigns the default group size", () => {
    const draft = createNodeDraft({
      createdAt: CREATED_AT,
      defaultCardTitle: "Untitled card",
      defaultGroupTitle: "Untitled group",
      graph: graph([]),
      id: "#1",
      position: { x: 13, y: 27 },
      positions: {},
      sizes: {},
      type: "group",
    });

    expect(draft.node).toMatchObject({
      id: "#1",
      type: "group",
      title: "Untitled group",
      tags: [],
    });
    expect(draft.position).toEqual({ x: 20, y: 20 });
    expect(draft.size).toEqual(DEFAULT_GROUP_SIZE);
  });

  it("deletes a card and returns restore metadata for edges and references", () => {
    const source = {
      ...cardNode("#1", "One"),
      references: [{ id: "#2", title: "Two" }],
    };
    const target = cardNode("#2", "Two");
    const draft = deleteNodeDraft(
      "#2",
      {
        nodes: [source, target],
        edges: [
          {
            id: "edge-#1-#2",
            sourceId: "#1",
            targetId: "#2",
            type: "citation",
            weight: 1,
          },
        ],
      },
      {
        "#1": { x: 0, y: 0 },
        "#2": { x: 50, y: 60 },
      },
      {
        "#2": { width: 120, height: 80 },
      }
    );

    expect(draft?.graph.nodes).toEqual([{ ...source, references: [] }]);
    expect(draft?.graph.edges).toEqual([]);
    expect(draft?.positions).toEqual({ "#1": { x: 0, y: 0 } });
    expect(draft?.sizes).toEqual({});
    expect(draft?.meta).toEqual({
      removedNode: target,
      position: { x: 50, y: 60 },
      size: { width: 120, height: 80 },
      removedEdges: [
        {
          id: "edge-#1-#2",
          sourceId: "#1",
          targetId: "#2",
          type: "citation",
          weight: 1,
        },
      ],
      affectedRefs: [{ ownerId: "#1", refId: "#2" }],
    });
    expect(draft?.graphBefore).toBeUndefined();
  });

  it("deletes a group by detaching children and keeping snapshot data for undo", () => {
    const group = groupNode("#group", "Group");
    const child = cardNode("#child", "Child", "#group");
    const positions = {
      "#group": { x: 100, y: 200 },
      "#child": { x: 10, y: 20 },
    };
    const sizes = {
      "#group": DEFAULT_GROUP_SIZE,
      "#child": { width: 120, height: 80 },
    };
    const sourceGraph = graph([group, child]);
    const draft = deleteNodeDraft("#group", sourceGraph, positions, sizes);
    const detachedChild = draft?.graph.nodes.find((node) => node.id === "#child");

    expect(detachedChild?.parentId).toBeUndefined();
    expect(detachedChild?.tags).toEqual([]);
    expect(draft?.positions["#child"]).toEqual({ x: 110, y: 220 });
    expect(draft?.graphBefore).toBe(sourceGraph);
    expect(draft?.positionsBefore).toBe(positions);
    expect(draft?.sizesBefore).toBe(sizes);
    expect(draft?.graphAfter).toBe(draft?.graph);
  });
});
