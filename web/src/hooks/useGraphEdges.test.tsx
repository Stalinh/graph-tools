/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import type { GraphData, GraphNode } from "../types";
import { useGraphEdges } from "./useGraphEdges";

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: "card",
    title,
    tags: [],
  };
}

function graph(edgeStyle?: GraphData["edges"][number]["style"]): GraphData {
  return {
    nodes: [cardNode("#1", "One"), cardNode("#2", "Two")],
    edges: [
      {
        id: "edge-#1-#2",
        sourceId: "#1",
        targetId: "#2",
        type: "citation",
        weight: 1,
        style: edgeStyle,
      },
    ],
  };
}

function useGraphEdgesHarness(initialGraph: GraphData) {
  const [currentGraph, setGraph] = useState(initialGraph);
  const [dirty, setDirty] = useState(false);
  const [, setSelectedNodeId] = useState<string | null>(null);
  const commandsRef = useRef<unknown[]>([]);
  const edges = useGraphEdges({
    graph: currentGraph,
    setGraph,
    pushCommand: (command) => {
      commandsRef.current.push(command);
    },
    setDirty,
    setSelectedNodeId,
  });

  return { commands: commandsRef.current, dirty, edges, graph: currentGraph };
}

describe("useGraphEdges", () => {
  it("updates solid edges to note dash instead of treating them as already default", () => {
    const { result } = renderHook(() => useGraphEdgesHarness(graph("solid")));

    act(() => {
      result.current.edges.updateEdgeStyle("edge-#1-#2", "note-dash");
    });

    expect(result.current.graph.edges[0].style).toBe("note-dash");
    expect(result.current.dirty).toBe(true);
    expect(result.current.commands).toHaveLength(1);
  });

  it("treats legacy undefined edge style as note dash", () => {
    const { result } = renderHook(() => useGraphEdgesHarness(graph()));

    act(() => {
      result.current.edges.updateEdgeStyle("edge-#1-#2", "note-dash");
    });

    expect(result.current.graph.edges[0].style).toBeUndefined();
    expect(result.current.dirty).toBe(false);
    expect(result.current.commands).toEqual([]);
  });
});
