import { describe, expect, it } from "vitest";
import type { GraphNode } from "../../types";
import {
  findContainingGroup,
  getAbsoluteNodePosition,
  getNodeCenter,
  getRelativeNodePosition,
  updateNodeParentMetadata,
} from "./graphNodeLayoutUtils";

const UPDATED_AT = "2026-01-01T00:00:00.000Z";

function groupNode(id: string, title = id): GraphNode {
  return {
    id,
    type: "group",
    title,
    tags: [],
  };
}

function cardNode(id: string, parentId?: string): GraphNode {
  return {
    id,
    type: "card",
    title: id,
    parentId,
    tags: [],
  };
}

describe("graphNodeLayoutUtils", () => {
  it("converts node positions between relative and absolute coordinates", () => {
    const child = cardNode("#child", "#group");
    const positions = {
      "#group": { x: 100, y: 200 },
    };

    expect(getAbsoluteNodePosition(child, { x: 10, y: 15 }, positions)).toEqual({
      x: 110,
      y: 215,
    });
    expect(getRelativeNodePosition({ x: 110, y: 215 }, "#group", positions)).toEqual({
      x: 10,
      y: 15,
    });
    expect(getAbsoluteNodePosition(cardNode("#solo"), { x: 3, y: 4 }, positions)).toEqual({
      x: 3,
      y: 4,
    });
  });

  it("finds the containing group from a node center point", () => {
    const group = groupNode("#group", "Group");
    const node = cardNode("#node");
    const nodes = [group, node, cardNode("#other")];
    const positions = {
      "#group": { x: 50, y: 50 },
      "#node": { x: 0, y: 0 },
    };
    const sizes = {
      "#group": { width: 100, height: 80 },
      "#node": { width: 20, height: 10 },
    };

    const center = getNodeCenter({ x: 60, y: 65 }, sizes["#node"]);

    expect(
      findContainingGroup({
        nodeId: "#node",
        center,
        nodes,
        positions,
        sizes,
      })?.id
    ).toBe("#group");
    expect(
      findContainingGroup({
        nodeId: "#group",
        center,
        nodes,
        positions,
        sizes,
      })
    ).toBeUndefined();
    expect(
      findContainingGroup({
        nodeId: "#node",
        center: { x: 10, y: 10 },
        nodes,
        positions,
        sizes,
      })
    ).toBeUndefined();
  });

  it("updates parent metadata and keeps group tags in sync", () => {
    const oldGroup = groupNode("#old", "Old");
    const newGroup = groupNode("#new", "New");
    const node = {
      ...cardNode("#node", "#old"),
      tags: ["Old", "Keep"],
    };

    const moved = updateNodeParentMetadata({
      node,
      nodes: [oldGroup, newGroup, node],
      oldParentId: "#old",
      newParentGroup: newGroup,
      updatedAt: UPDATED_AT,
    });

    expect(moved).toMatchObject({
      parentId: "#new",
      tags: ["Keep", "New"],
      updatedAt: UPDATED_AT,
    });

    const detached = updateNodeParentMetadata({
      node: moved,
      nodes: [oldGroup, newGroup, moved],
      oldParentId: "#new",
      newParentGroup: undefined,
      updatedAt: UPDATED_AT,
    });

    expect(detached).toMatchObject({
      parentId: undefined,
      tags: ["Keep"],
      updatedAt: UPDATED_AT,
    });
  });
});
