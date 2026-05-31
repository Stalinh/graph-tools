import type { CanvasPosition, CanvasViewport, GraphData, NodeSize, WorkspaceState } from "../types";
import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CanvasCommand } from "./canvasHistoryTypes";
import {
  clearContentCache,
  deleteContentCacheEntry,
} from "../lib/cardContentCache";
import { addCitation, addNode, removeCitation, removeNode, restoreNode } from "../lib/graphMutator";
import { normalizeWorkspaceState } from "../lib/workspaceState";

interface UseGraphPersistenceOptions {
  graph: GraphData;
  nodePositions: Record<string, CanvasPosition>;
  nodeSizes: Record<string, { width: number; height: number }>;
  viewport: CanvasViewport | null;
  selectedNodeId: string | null;
  setDirty: Dispatch<SetStateAction<boolean>>;
  setGraph: Dispatch<SetStateAction<GraphData>>;
  setNodePositions: Dispatch<SetStateAction<Record<string, CanvasPosition>>>;
  setNodeSizes: Dispatch<SetStateAction<Record<string, NodeSize>>>;
  setViewport: Dispatch<SetStateAction<CanvasViewport | null>>;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  setSelectedNodeIds: Dispatch<SetStateAction<string[]>>;
  setSelectedEdgeId: Dispatch<SetStateAction<string | null>>;
  setEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setQuickEditingNodeId: Dispatch<SetStateAction<string | null>>;
  setPendingInspectorContentFocusNodeId: Dispatch<SetStateAction<string | null>>;
  pushUndo: (cmd: CanvasCommand) => void;
  popUndo: () => CanvasCommand | null;
  pushRedo: (cmd: CanvasCommand) => void;
  popRedo: () => CanvasCommand | null;
  clearHistory: () => void;
}

export function useGraphPersistence({
  graph,
  nodePositions,
  nodeSizes,
  viewport,
  selectedNodeId,
  setDirty,
  setGraph,
  setNodePositions,
  setNodeSizes,
  setViewport,
  setSelectedNodeId,
  setSelectedNodeIds,
  setSelectedEdgeId,
  setEditingNodeId,
  setQuickEditingNodeId,
  setPendingInspectorContentFocusNodeId,
  pushUndo,
  popUndo,
  pushRedo,
  popRedo,
  clearHistory,
}: UseGraphPersistenceOptions) {
  const graphRef = useRef(graph);
  const nodePositionsRef = useRef(nodePositions);
  const nodeSizesRef = useRef(nodeSizes);
  const viewportRef = useRef(viewport);
  const selectedNodeIdRef = useRef(selectedNodeId);

  graphRef.current = graph;
  nodePositionsRef.current = nodePositions;
  nodeSizesRef.current = nodeSizes;
  viewportRef.current = viewport;
  selectedNodeIdRef.current = selectedNodeId;

  const executeCommand = useCallback(
    (cmd: CanvasCommand) => {
      switch (cmd.type) {
        case "move":
          setNodePositions((prev) => ({ ...prev, [cmd.nodeId]: cmd.to }));
          if (cmd.graphAfter) {
            setGraph(cmd.graphAfter);
          }
          break;
        case "move-many":
          setNodePositions((prev) => {
            const nextPositions = { ...prev };
            cmd.moves.forEach((move) => {
              nextPositions[move.nodeId] = move.to;
            });
            return nextPositions;
          });
          if (cmd.graphAfter) {
            setGraph(cmd.graphAfter);
          }
          break;
        case "add":
          setGraph((prev) => addNode(prev, cmd.nodeData));
          setNodePositions((prev) => ({
            ...prev,
            [cmd.nodeId]: cmd.position,
          }));
          setNodeSizes((prev) => {
            if (!cmd.size) {
              return prev;
            }
            return { ...prev, [cmd.nodeId]: cmd.size };
          });
          setQuickEditingNodeId(
            cmd.nodeData.type === "card" || cmd.nodeData.type === "group" ? cmd.nodeId : null
          );
          setPendingInspectorContentFocusNodeId(null);
          break;
        case "remove":
          deleteContentCacheEntry(cmd.nodeId);
          if (cmd.graphAfter) {
            setGraph(cmd.graphAfter);
            if (cmd.positionsAfter) setNodePositions(cmd.positionsAfter);
            if (cmd.sizesAfter) setNodeSizes(cmd.sizesAfter);
            setSelectedNodeId((prev) => (prev === cmd.nodeId ? null : prev));
            setSelectedNodeIds((prev) => prev.filter((nodeId) => nodeId !== cmd.nodeId));
            setQuickEditingNodeId((prev) => (prev === cmd.nodeId ? null : prev));
            setPendingInspectorContentFocusNodeId((prev) => (prev === cmd.nodeId ? null : prev));
            break;
          }
          setGraph((prev) => {
            const { graph: nextGraph } = removeNode(prev, cmd.nodeId);
            return nextGraph;
          });
          setNodePositions((prev) => {
            const next = { ...prev };
            delete next[cmd.nodeId];
            return next;
          });
          setNodeSizes((prev) => {
            const next = { ...prev };
            delete next[cmd.nodeId];
            return next;
          });
          setSelectedNodeId((prev) => (prev === cmd.nodeId ? null : prev));
          setSelectedNodeIds((prev) => prev.filter((nodeId) => nodeId !== cmd.nodeId));
          setQuickEditingNodeId((prev) => (prev === cmd.nodeId ? null : prev));
          setPendingInspectorContentFocusNodeId((prev) => (prev === cmd.nodeId ? null : prev));
          break;
        case "remove-many":
          cmd.removals.forEach((removal) => deleteContentCacheEntry(removal.nodeId));
          if (cmd.graphAfter) {
            setGraph(cmd.graphAfter);
            if (cmd.positionsAfter) setNodePositions(cmd.positionsAfter);
            if (cmd.sizesAfter) setNodeSizes(cmd.sizesAfter);
            setSelectedNodeId((prev) =>
              prev && cmd.removals.some(({ nodeId }) => nodeId === prev) ? null : prev
            );
            setSelectedNodeIds((prev) =>
              prev.filter(
                (selectedNodeId) => !cmd.removals.some(({ nodeId }) => nodeId === selectedNodeId)
              )
            );
            setQuickEditingNodeId((prev) =>
              prev && cmd.removals.some(({ nodeId }) => nodeId === prev) ? null : prev
            );
            setPendingInspectorContentFocusNodeId((prev) =>
              prev && cmd.removals.some(({ nodeId }) => nodeId === prev) ? null : prev
            );
            break;
          }
          setGraph((prev) => {
            let nextGraph = prev;
            cmd.removals.forEach(({ nodeId }) => {
              nextGraph = removeNode(nextGraph, nodeId).graph;
            });
            return nextGraph;
          });
          setNodePositions((prev) => {
            const next = { ...prev };
            cmd.removals.forEach(({ nodeId }) => {
              delete next[nodeId];
            });
            return next;
          });
          setNodeSizes((prev) => {
            const next = { ...prev };
            cmd.removals.forEach(({ nodeId }) => {
              delete next[nodeId];
            });
            return next;
          });
          setSelectedNodeId((prev) =>
            prev && cmd.removals.some(({ nodeId }) => nodeId === prev) ? null : prev
          );
          setSelectedNodeIds((prev) =>
            prev.filter(
              (selectedNodeId) => !cmd.removals.some(({ nodeId }) => nodeId === selectedNodeId)
            )
          );
          setQuickEditingNodeId((prev) =>
            prev && cmd.removals.some(({ nodeId }) => nodeId === prev) ? null : prev
          );
          setPendingInspectorContentFocusNodeId((prev) =>
            prev && cmd.removals.some(({ nodeId }) => nodeId === prev) ? null : prev
          );
          break;
        case "link":
          setGraph((prev) => addCitation(prev, cmd.sourceId, cmd.targetId, cmd.direction));
          break;
        case "unlink":
          setGraph((prev) => removeCitation(prev, cmd.sourceId, cmd.targetId));
          break;
        case "replace-graph":
          setGraph(cmd.after);
          break;
        case "resize":
          setNodeSizes((prev) => ({ ...prev, [cmd.nodeId]: cmd.after }));
          break;
        case "resize-many":
          setNodeSizes((prev) => {
            const next = { ...prev };
            cmd.resizes.forEach((resize) => {
              next[resize.nodeId] = resize.after;
            });
            return next;
          });
          break;
      }
    },
    [
      setGraph,
      setNodePositions,
      setNodeSizes,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
    ]
  );

  const undoCommand = useCallback(
    (cmd: CanvasCommand) => {
      switch (cmd.type) {
        case "move":
          setNodePositions((prev) => ({ ...prev, [cmd.nodeId]: cmd.from }));
          if (cmd.graphBefore) {
            setGraph(cmd.graphBefore);
          }
          break;
        case "move-many":
          setNodePositions((prev) => {
            const nextPositions = { ...prev };
            cmd.moves.forEach((move) => {
              nextPositions[move.nodeId] = move.from;
            });
            return nextPositions;
          });
          if (cmd.graphBefore) {
            setGraph(cmd.graphBefore);
          }
          break;
        case "add":
          deleteContentCacheEntry(cmd.nodeId);
          setGraph((prev) => {
            const { graph: nextGraph } = removeNode(prev, cmd.nodeId);
            return nextGraph;
          });
          setNodePositions((prev) => {
            const next = { ...prev };
            delete next[cmd.nodeId];
            return next;
          });
          setNodeSizes((prev) => {
            const next = { ...prev };
            delete next[cmd.nodeId];
            return next;
          });
          setSelectedNodeId((prev) => (prev === cmd.nodeId ? null : prev));
          setSelectedNodeIds((prev) => prev.filter((nodeId) => nodeId !== cmd.nodeId));
          setQuickEditingNodeId((prev) => (prev === cmd.nodeId ? null : prev));
          setPendingInspectorContentFocusNodeId((prev) => (prev === cmd.nodeId ? null : prev));
          break;
        case "remove":
          if (cmd.graphBefore) {
            setGraph(cmd.graphBefore);
            if (cmd.positionsBefore) setNodePositions(cmd.positionsBefore);
            if (cmd.sizesBefore) setNodeSizes(cmd.sizesBefore);
            break;
          }
          setGraph((prev) =>
            restoreNode(prev, cmd.meta.removedNode, cmd.meta.removedEdges, cmd.meta.affectedRefs)
          );
          setNodePositions((prev) => ({ ...prev, [cmd.nodeId]: cmd.meta.position }));
          setNodeSizes((prev) => {
            if (!cmd.meta.size) {
              return prev;
            }
            return { ...prev, [cmd.nodeId]: cmd.meta.size };
          });
          break;
        case "remove-many":
          if (cmd.graphBefore) {
            setGraph(cmd.graphBefore);
            if (cmd.positionsBefore) setNodePositions(cmd.positionsBefore);
            if (cmd.sizesBefore) setNodeSizes(cmd.sizesBefore);
            break;
          }
          setGraph((prev) =>
            cmd.removals.reduceRight(
              (nextGraph, removal) =>
                restoreNode(
                  nextGraph,
                  removal.meta.removedNode,
                  removal.meta.removedEdges,
                  removal.meta.affectedRefs
                ),
              prev
            )
          );
          setNodePositions((prev) => {
            const next = { ...prev };
            cmd.removals.forEach((removal) => {
              next[removal.nodeId] = removal.meta.position;
            });
            return next;
          });
          setNodeSizes((prev) => {
            const next = { ...prev };
            cmd.removals.forEach((removal) => {
              if (removal.meta.size) {
                next[removal.nodeId] = removal.meta.size;
              }
            });
            return next;
          });
          break;
        case "link":
          setGraph((prev) => removeCitation(prev, cmd.sourceId, cmd.targetId));
          break;
        case "unlink":
          setGraph((prev) => addCitation(prev, cmd.sourceId, cmd.targetId, cmd.direction));
          break;
        case "replace-graph":
          setGraph(cmd.before);
          break;
        case "resize":
          setNodeSizes((prev) => {
            const next = { ...prev };
            if (cmd.before) {
              next[cmd.nodeId] = cmd.before;
            } else {
              delete next[cmd.nodeId];
            }
            return next;
          });
          break;
        case "resize-many":
          setNodeSizes((prev) => {
            const next = { ...prev };
            cmd.resizes.forEach((resize) => {
              if (resize.before) {
                next[resize.nodeId] = resize.before;
              } else {
                delete next[resize.nodeId];
              }
            });
            return next;
          });
          break;
      }
    },
    [
      setGraph,
      setNodePositions,
      setNodeSizes,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setSelectedNodeId,
      setSelectedNodeIds,
    ]
  );

  const undo = useCallback(() => {
    const cmd = popUndo();
    if (!cmd) return;
    pushRedo(cmd);
    setDirty(true);
    undoCommand(cmd);
  }, [popUndo, pushRedo, undoCommand, setDirty]);

  const redo = useCallback(() => {
    const cmd = popRedo();
    if (!cmd) return;
    pushUndo(cmd);
    setDirty(true);
    executeCommand(cmd);
  }, [popRedo, pushUndo, executeCommand, setDirty]);

  const createWorkspaceState = useCallback(
    (): WorkspaceState =>
      normalizeWorkspaceState({
        version: 1,
        savedAt: new Date().toISOString(),
        graph: graphRef.current,
        nodePositions: nodePositionsRef.current,
        nodeSizes: nodeSizesRef.current,
        viewport: viewportRef.current,
        selectedNodeId: selectedNodeIdRef.current,
      }),
    []
  );

  const applyWorkspaceState = useCallback(
    (state: WorkspaceState) => {
      const now = new Date().toISOString();
      const normalizedState = normalizeWorkspaceState(state);
      const normalizedGraph: GraphData = {
        ...normalizedState.graph,
        nodes: normalizedState.graph.nodes.map((node) => ({
          ...node,
          createdAt: node.createdAt ?? now,
          updatedAt: node.updatedAt ?? now,
        })),
      };
      setGraph(normalizedGraph);
      setNodePositions(normalizedState.nodePositions);
      setNodeSizes(normalizedState.nodeSizes ?? {});
      setViewport(null);
      setSelectedNodeId(normalizedState.selectedNodeId);
      setSelectedEdgeId(null);
      setEditingNodeId(null);
      setQuickEditingNodeId(null);
      setPendingInspectorContentFocusNodeId(null);
      setDirty(false);
      clearHistory();
      clearContentCache();
    },
    [
      setGraph,
      setNodePositions,
      setNodeSizes,
      setViewport,
      setSelectedNodeId,
      setSelectedEdgeId,
      setEditingNodeId,
      setPendingInspectorContentFocusNodeId,
      setQuickEditingNodeId,
      setDirty,
      clearHistory,
    ]
  );

  const resetToEmpty = useCallback(() => {
    setGraph({ nodes: [], edges: [] });
    setNodePositions({});
    setNodeSizes({});
    setViewport(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEditingNodeId(null);
    setQuickEditingNodeId(null);
    setPendingInspectorContentFocusNodeId(null);
    setDirty(false);
    clearHistory();
    clearContentCache();
  }, [
    setGraph,
    setNodePositions,
    setNodeSizes,
    setViewport,
    setSelectedNodeId,
    setSelectedEdgeId,
    setEditingNodeId,
    setPendingInspectorContentFocusNodeId,
    setQuickEditingNodeId,
    setDirty,
    clearHistory,
  ]);

  return {
    undo,
    redo,
    createWorkspaceState,
    applyWorkspaceState,
    resetToEmpty,
  };
}
