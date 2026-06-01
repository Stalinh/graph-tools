/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GraphNode, WorkspaceState } from "../types";
import { useCanvasHistory } from "./useCanvasHistory";
import { useGraphState } from "./useGraphState";

function cardNode(id: string, title = id): GraphNode {
  return {
    id,
    type: "card",
    title,
    tags: [],
    contentHtml: "<p></p>",
  };
}

function workspace(): WorkspaceState {
  return {
    version: 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    graph: {
      nodes: [cardNode("#1", "One")],
      edges: [],
    },
    nodePositions: {
      "#1": { x: 10, y: 20 },
    },
    nodeSizes: {
      "#1": { width: 180, height: 120 },
    },
    viewport: { x: 320, y: 240, zoom: 0.8 },
    selectedNodeId: "#1",
  };
}

function useGraphStateHarness() {
  const history = useCanvasHistory();
  const graphState = useGraphState({ ...history, locale: "zh-CN" });
  return { graphState, history };
}

describe("useGraphState", () => {
  it("applies workspace state and preserves viewport for the next saved state", () => {
    const { result } = renderHook(() => useGraphStateHarness());
    const state = workspace();

    act(() => {
      result.current.graphState.persistence.applyWorkspaceState(state);
    });

    expect(result.current.graphState.nodes.graph.nodes).toHaveLength(1);
    expect(result.current.graphState.nodes.graph.nodes[0]).toMatchObject({
      id: "#1",
      title: "One",
      type: "card",
      contentHtml: "<p></p>",
    });
    expect(result.current.graphState.nodes.graph.nodes[0].createdAt).toEqual(expect.any(String));
    expect(result.current.graphState.nodes.graph.nodes[0].updatedAt).toEqual(expect.any(String));
    expect(result.current.graphState.nodes.graph.edges).toEqual([]);
    expect(result.current.graphState.nodes.nodePositions).toEqual(state.nodePositions);
    expect(result.current.graphState.nodes.nodeSizes).toEqual(state.nodeSizes);
    expect(result.current.graphState.nodes.viewport).toEqual(state.viewport);
    expect(result.current.graphState.selection.selectedNodeId).toBe("#1");
    expect(result.current.graphState.status.dirty).toBe(false);
    expect(result.current.graphState.persistence.createWorkspaceState().viewport).toEqual(
      state.viewport
    );
  });

  it("undoes and redoes node creation through the composed history state", () => {
    const { result } = renderHook(() => useGraphStateHarness());

    act(() => {
      result.current.graphState.nodes.createNode("card", { x: 50, y: 60 });
    });

    expect(result.current.graphState.nodes.graph.nodes).toHaveLength(1);
    expect(result.current.history.undoStack).toHaveLength(1);
    expect(result.current.graphState.status.dirty).toBe(true);

    act(() => {
      result.current.graphState.persistence.undo();
    });

    expect(result.current.graphState.nodes.graph.nodes).toHaveLength(0);
    expect(result.current.history.undoStack).toHaveLength(0);
    expect(result.current.history.redoStack).toHaveLength(1);

    act(() => {
      result.current.graphState.persistence.redo();
    });

    expect(result.current.graphState.nodes.graph.nodes).toHaveLength(1);
    expect(result.current.graphState.nodes.nodePositions["#1"]).toEqual({ x: 50, y: 60 });
    expect(result.current.history.undoStack).toHaveLength(1);
    expect(result.current.history.redoStack).toHaveLength(0);
  });

  it("stores an automatic preview viewport without marking the workspace dirty", () => {
    const { result } = renderHook(() => useGraphStateHarness());
    const previewViewport = { x: 12, y: 34, zoom: 0.5 };

    act(() => {
      result.current.graphState.nodes.handleViewportChange(previewViewport, { markDirty: false });
    });

    expect(result.current.graphState.nodes.viewport).toEqual(previewViewport);
    expect(result.current.graphState.status.dirty).toBe(false);
  });
});
