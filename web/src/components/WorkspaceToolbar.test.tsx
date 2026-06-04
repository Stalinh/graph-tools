/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createRef, type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceToolbar } from './WorkspaceToolbar';

type WorkspaceToolbarTestProps = ComponentProps<typeof WorkspaceToolbar>;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderToolbar(overrides: Partial<WorkspaceToolbarTestProps> = {}) {
  const searchInputRef = createRef<HTMLInputElement>();
  const props: WorkspaceToolbarTestProps = {
    nodeCount: 3,
    edgeCount: 2,
    searchQuery: '',
    onSearchChange: vi.fn(),
    searchInputRef,
    onNew: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    availableTags: ['alpha'],
    selectedTags: [],
    selectedColors: [],
    hasAnyFilter: false,
    onToggleTag: vi.fn(),
    onToggleColor: vi.fn(),
    onClearFilters: vi.fn(),
    nodeFilter: 'all',
    onNodeFilterChange: vi.fn(),
    showResults: false,
    matchingResults: [],
    onResultNavigate: vi.fn(),
    ...overrides,
  };

  const view = render(<WorkspaceToolbar {...props} />);

  return {
    ...view,
    props,
    searchInputRef,
  };
}

describe('WorkspaceToolbar', () => {
  it('renders status, filter, and command groups with graph counts', () => {
    const { container } = renderToolbar();

    expect(container.querySelector('.workspace-toolbar__status-group')).not.toBeNull();
    expect(container.querySelector('.workspace-toolbar__filter-group')).not.toBeNull();
    expect(container.querySelector('.workspace-toolbar__command-group')).not.toBeNull();
    expect(container.textContent).toMatch(/3 个节点|3 nodes/);
    expect(container.textContent).toMatch(/2 条连线|2 edges/);
  });

  it('keeps file and history actions accessible with disabled state from props', () => {
    const { getByRole } = renderToolbar();
    const undoButton = getByRole('button', { name: /撤销|Undo/ }) as HTMLButtonElement;
    const redoButton = getByRole('button', { name: /重做|Redo/ }) as HTMLButtonElement;

    expect(getByRole('button', { name: /新建空白画布|Create new canvas/ })).toBeDefined();
    expect(undoButton.disabled).toBe(false);
    expect(redoButton.disabled).toBe(true);
  });

  it('calls search handlers on input change and clear while preserving the input ref focus', () => {
    const onSearchChange = vi.fn();
    const { getByPlaceholderText, getByRole, searchInputRef } = renderToolbar({
      searchQuery: 'alpha',
      onSearchChange,
    });
    const searchInput = getByPlaceholderText(/搜索节点|Search nodes/) as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: 'beta' } });
    expect(onSearchChange).toHaveBeenCalledWith('beta');
    expect(searchInputRef.current).toBe(searchInput);

    const clearButton = getByRole('button', { name: /清除搜索|Clear search/ });
    fireEvent.click(clearButton);

    expect(onSearchChange).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(searchInput);
  });
});
