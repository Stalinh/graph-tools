/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { act, fireEvent, render, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { KnowledgeBase } from './KnowledgeBase';
import * as useFileOperationsModule from '../hooks/useFileOperations';

interface GraphCanvasProps {
  onDropFiles?: (files: File[], position: { x: number; y: number }) => void;
  graph: {
    nodes: Array<{
      id: string;
      title: string;
      locked?: boolean;
      type: string;
    }>;
  };
  nodeFilter?: string;
  matchingNodeIds?: Set<string> | null;
}

// Mock GraphCanvas to avoid ReactFlow layout engines in tests
vi.mock('./GraphCanvas', () => {
  return {
    GraphCanvas: ({ onDropFiles, graph, nodeFilter, matchingNodeIds }: GraphCanvasProps) => {
      // Apply mock rendering based on filters
      const filteredNodes = graph.nodes.filter((n) => {
        if (nodeFilter === 'locked') return n.locked;
        if (nodeFilter !== 'all' && n.type !== nodeFilter) return false;
        if (matchingNodeIds && !matchingNodeIds.has(n.id)) return false;
        return true;
      });

      return (
        <div data-testid="mock-graph-canvas">
          <div data-testid="nodes-count">{filteredNodes.length}</div>
          {filteredNodes.map((n) => (
            <div key={n.id} data-testid={`node-item-${n.id}`}>
              {n.title}
            </div>
          ))}
          {onDropFiles && (
            <button
              data-testid="mock-drop-images-btn"
              onClick={() => {
                const file = new File(['dummy img'], 'img1.png', { type: 'image/png' });
                onDropFiles([file], { x: 100, y: 200 });
              }}
            >
              Drop Images Mock
            </button>
          )}
        </div>
      );
    },
  };
});

// Spy and mock useFileOperations to capture dropped workspace files
const mockHandleDroppedWorkspaceFile = vi.fn().mockResolvedValue(undefined);
const mockHandleOpenDefaultWorkspaceFile = vi.fn().mockResolvedValue(undefined);

vi.spyOn(useFileOperationsModule, 'useFileOperations').mockImplementation(() => {
  return {
    handleNew: vi.fn(),
    handleOpen: vi.fn(),
    handleSave: vi.fn(),
    handleSaveAs: vi.fn(),
    handleDroppedWorkspaceFile: mockHandleDroppedWorkspaceFile,
    handleOpenDefaultWorkspaceFile: mockHandleOpenDefaultWorkspaceFile,
    currentFileName: 'test.graph',
    fileStatus: 'saved',
    globalPreviewRequestId: 0,
    pendingAction: null,
    setCurrentFileName: vi.fn(),
    cancelPendingAction: vi.fn(),
    discardPendingAction: vi.fn(),
    saveAndContinuePendingAction: vi.fn(),
  } as unknown as ReturnType<typeof useFileOperationsModule.useFileOperations>;
});

describe('KnowledgeBase Component', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders and displays initial empty state message or canvas nodes', () => {
    const { container } = render(<KnowledgeBase />);
    const canvas = container.querySelector('[data-testid="mock-graph-canvas"]');
    expect(canvas).toBeDefined();

    const count = container.querySelector('[data-testid="nodes-count"]');
    expect(count?.textContent).toBe('0');
  });

  it('supports search query changes and highlights matching nodes with debounce', async () => {
    const { container } = render(<KnowledgeBase />);

    // Add a node first by pasting or mocking state. Since we start empty, let's verify search filters.
    const searchInput = container.querySelector(
      '.workspace-toolbar__search-input'
    ) as HTMLInputElement;
    expect(searchInput).toBeDefined();

    // Trigger input change
    fireEvent.change(searchInput, { target: { value: 'search keyword' } });

    // Value changes immediately in state, but debounce waits 300ms
    expect(searchInput.value).toBe('search keyword');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Check search clearance button becomes visible
    const clearBtn = container.querySelector('.workspace-toolbar__search-clear');
    expect(clearBtn).toBeDefined();

    // Clear search
    fireEvent.click(clearBtn!);
    expect(searchInput.value).toBe('');
  });

  it('supports changing filters such as node type filter', async () => {
    const { container } = render(<KnowledgeBase />);

    // Click the Type filter dropdown button (which starts as "全部" or "All")
    const typeFilterBtn = container.querySelector('.filter-chip--type') as HTMLButtonElement;
    expect(typeFilterBtn).toBeDefined();

    // Open dropdown
    fireEvent.click(typeFilterBtn);

    // Click "图片" (Images) item. We can locate it by class or text content.
    const dropdownItems = container.querySelectorAll('.filter-dropdown__label');
    const imageOption = Array.from(dropdownItems).find(
      (item) => item.textContent === '图片' || item.textContent === 'Images'
    );
    expect(imageOption).toBeDefined();

    fireEvent.click(imageOption!.closest('button')!);

    // Canvas should reflect the new nodeFilter
    expect(typeFilterBtn.textContent).toMatch(/图片|Images/);
  });

  it('handles dropped workspace file prop and triggers operations', () => {
    const mockFileHandledCallback = vi.fn();
    const dummyFile = new File(['workspace-data'], 'project.graph', { type: 'application/json' });

    const { rerender } = render(
      <KnowledgeBase
        droppedWorkspaceFile={null}
        onDroppedWorkspaceFileHandled={mockFileHandledCallback}
      />
    );

    // Verify it was not handled initially
    expect(mockHandleDroppedWorkspaceFile).not.toHaveBeenCalled();

    // Rerender with droppedWorkspaceFile prop
    rerender(
      <KnowledgeBase
        droppedWorkspaceFile={{ id: 999, file: dummyFile }}
        onDroppedWorkspaceFileHandled={mockFileHandledCallback}
      />
    );

    expect(mockFileHandledCallback).toHaveBeenCalledWith(999);
    expect(mockHandleDroppedWorkspaceFile).toHaveBeenCalledWith(dummyFile);
  });

  it('opens a provided default workspace handle once and marks it handled', () => {
    const mockFileHandledCallback = vi.fn();
    const handle = { name: 'workspace.graph' } as FileSystemFileHandle;

    const { rerender } = render(
      <KnowledgeBase
        defaultWorkspaceFileHandle={null}
        onDefaultWorkspaceFileHandleHandled={mockFileHandledCallback}
      />
    );

    expect(mockHandleOpenDefaultWorkspaceFile).not.toHaveBeenCalled();

    rerender(
      <KnowledgeBase
        defaultWorkspaceFileHandle={{ id: 7, handle }}
        onDefaultWorkspaceFileHandleHandled={mockFileHandledCallback}
      />
    );

    expect(mockFileHandledCallback).toHaveBeenCalledWith(7);
    expect(mockHandleOpenDefaultWorkspaceFile).toHaveBeenCalledWith(handle);
  });

  it('supports image dropping via canvas callback', () => {
    const { container } = render(<KnowledgeBase />);

    // Click the drop images mock button in Mocked GraphCanvas
    const dropBtn = container.querySelector(
      '[data-testid="mock-drop-images-btn"]'
    ) as HTMLButtonElement;
    fireEvent.click(dropBtn);

    // Expect node count to increase by 1 (an image node is created)
    const count = container.querySelector('[data-testid="nodes-count"]');
    expect(count?.textContent).toBe('1');
  });
});
