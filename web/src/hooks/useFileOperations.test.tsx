/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspacePackage, WorkspaceFileManager } from "../lib/fileSystem";
import type { WorkspaceState } from "../types";
import { useFileOperations } from "./useFileOperations";

function workspace(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    version: 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    graph: {
      nodes: [],
      edges: [],
    },
    nodePositions: {},
    viewport: null,
    selectedNodeId: null,
    ...overrides,
  };
}

function createFileManagerMock(initialFileName: string | null = null) {
  let currentFileName = initialFileName;
  const manager = {
    getCurrentFileName: vi.fn(() => currentFileName),
    reset: vi.fn(() => {
      currentFileName = null;
    }),
    openWorkspaceFile: vi.fn<() => Promise<WorkspacePackage | null>>(),
    openDroppedWorkspaceFile: vi.fn<(file: File) => Promise<WorkspacePackage>>(),
    saveWorkspaceFile: vi.fn<(pkg: WorkspacePackage) => Promise<boolean>>(),
    saveWorkspaceFileAs: vi.fn<(pkg: WorkspacePackage) => Promise<string | null>>(
      async () => {
        currentFileName = "saved.graph";
        return currentFileName;
      }
    ),
  };

  return manager as unknown as WorkspaceFileManager & typeof manager;
}

function useFileOperationsHarness({
  fileManager,
  initialDirty = false,
  initialImages = new Map<string, Blob>(),
  initialWorkspace = workspace(),
}: {
  fileManager: WorkspaceFileManager;
  initialDirty?: boolean;
  initialImages?: Map<string, Blob>;
  initialWorkspace?: WorkspaceState;
}) {
  const [state, setState] = useState(initialWorkspace);
  const [images, setImages] = useState(initialImages);
  const [dirty, setDirty] = useState(initialDirty);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clearHistory = vi.fn();
  const resetToEmpty = vi.fn(() => setState(workspace()));

  const files = useFileOperations({
    locale: "zh-CN",
    createWorkspaceState: () => state,
    applyWorkspaceState: setState,
    resetToEmpty,
    clearHistory,
    setStatus,
    setErrorMessage,
    getImages: () => images,
    setImages,
    dirty,
    setDirty,
    fileManager,
  });

  return {
    clearHistory,
    dirty,
    errorMessage,
    files,
    images,
    resetToEmpty,
    state,
    status,
  };
}

describe("useFileOperations", () => {
  it("opens a workspace package and applies state, images, status, and current file name", async () => {
    const openedState = workspace({
      graph: {
        nodes: [{ id: "#1", type: "card", title: "Opened", tags: [] }],
        edges: [],
      },
      nodePositions: {
        "#1": { x: 10, y: 20 },
      },
      viewport: { x: 500, y: 300, zoom: 0.25 },
      selectedNodeId: "#1",
    });
    const openedImages = new Map([["images/a.png", new Blob(["image"])]]);
    const fileManager = createFileManagerMock("opened.graph");
    fileManager.openWorkspaceFile.mockResolvedValue({
      state: openedState,
      images: openedImages,
    });
    const { result } = renderHook(() =>
      useFileOperationsHarness({ fileManager, initialDirty: false })
    );

    await act(async () => {
      await result.current.files.handleOpen();
    });

    expect(result.current.state.graph.nodes[0].title).toBe("Opened");
    expect(result.current.state.viewport).toBeNull();
    expect(result.current.images).toBe(openedImages);
    expect(result.current.files.currentFileName).toBe("opened.graph");
    expect(result.current.files.globalPreviewRequestId).toBe(1);
    expect(result.current.files.fileStatus).toBe("文件已打开。");
    expect(result.current.status).toBe("ready");
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.dirty).toBe(false);
  });

  it("queues a dropped workspace while dirty and opens it after discard", async () => {
    const droppedState = workspace({
      graph: {
        nodes: [{ id: "#1", type: "card", title: "Dropped", tags: [] }],
        edges: [],
      },
      nodePositions: {
        "#1": { x: 0, y: 0 },
      },
    });
    const fileManager = createFileManagerMock();
    fileManager.openDroppedWorkspaceFile.mockResolvedValue({
      state: droppedState,
      images: new Map(),
    });
    const { result } = renderHook(() =>
      useFileOperationsHarness({ fileManager, initialDirty: true })
    );
    const file = new File(["placeholder"], "dropped.graph");

    await act(async () => {
      await result.current.files.handleDroppedWorkspaceFile(file);
    });

    expect(result.current.files.pendingAction).toBe("open-dropped");
    expect(fileManager.openDroppedWorkspaceFile).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.files.discardPendingAction();
    });

    expect(fileManager.openDroppedWorkspaceFile).toHaveBeenCalledWith(file);
    expect(result.current.state.graph.nodes[0].title).toBe("Dropped");
    expect(result.current.state.viewport).toBeNull();
    expect(result.current.files.currentFileName).toBe("dropped.graph");
    expect(result.current.files.globalPreviewRequestId).toBe(1);
    expect(result.current.files.fileStatus).toBe("拖入的文件已打开，保存时将另存为。");
    expect(result.current.files.pendingAction).toBeNull();
    expect(result.current.dirty).toBe(false);
  });

  it("blocks save when an image node is missing its Blob asset", async () => {
    const fileManager = createFileManagerMock();
    const missingImageState = workspace({
      graph: {
        nodes: [
          {
            id: "#1",
            type: "image",
            title: "Image",
            tags: [],
            imagePath: "images/missing.png",
          },
        ],
        edges: [],
      },
      nodePositions: {
        "#1": { x: 0, y: 0 },
      },
    });
    const { result } = renderHook(() =>
      useFileOperationsHarness({
        fileManager,
        initialWorkspace: missingImageState,
      })
    );
    let saved = true;

    await act(async () => {
      saved = await result.current.files.handleSaveAs();
    });

    expect(saved).toBe(false);
    expect(fileManager.saveWorkspaceFileAs).not.toHaveBeenCalled();
    expect(result.current.files.fileStatus).toBe("保存失败：工作区中有图片资源缺失。");
    expect(result.current.errorMessage).toBe("保存失败：工作区中有图片资源缺失。");
  });
});
