/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { resolveDefaultPageFileHandle } from './lib/defaultFileHandles';

const saveMocks = vi.hoisted(() => ({
  saveGraphPage: vi.fn(),
  saveProjectPage: vi.fn(),
}));

vi.mock('./lib/defaultFileHandles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/defaultFileHandles')>();
  return {
    ...actual,
    resolveDefaultPageFileHandle: vi.fn(),
  };
});

vi.mock('./components/KnowledgeBase', async () => {
  const React = await import('react');
  return {
    KnowledgeBase: ({
      onDirtyChange,
      onSaveCurrentPageChange,
    }: {
      onDirtyChange?: (dirty: boolean) => void;
      onSaveCurrentPageChange?: (saveCurrentPage: (() => Promise<boolean>) | null) => void;
    }) => {
      React.useEffect(() => {
        onSaveCurrentPageChange?.(saveMocks.saveGraphPage);
        return () => onSaveCurrentPageChange?.(null);
      }, [onSaveCurrentPageChange]);

      return (
        <section aria-label="mock graph page">
          <button type="button" onClick={() => onDirtyChange?.(true)}>
            mark graph dirty
          </button>
          Graph Page
        </section>
      );
    },
  };
});

vi.mock('./modules/project', async () => {
  const React = await import('react');
  return {
    ProjectSheetPage: ({
      defaultProjectFileHandle,
      onDirtyChange,
      onSaveCurrentPageChange,
    }: {
      defaultProjectFileHandle?: { handle: FileSystemFileHandle; id: number } | null;
      onDirtyChange?: (dirty: boolean) => void;
      onSaveCurrentPageChange?: (saveCurrentPage: (() => Promise<boolean>) | null) => void;
    }) => {
      React.useEffect(() => {
        onSaveCurrentPageChange?.(saveMocks.saveProjectPage);
        return () => onSaveCurrentPageChange?.(null);
      }, [onSaveCurrentPageChange]);

      return (
        <section aria-label="mock project page">
          <button type="button" onClick={() => onDirtyChange?.(true)}>
            mark project dirty
          </button>
          Project Page
          {defaultProjectFileHandle ? <span>{defaultProjectFileHandle.handle.name}</span> : null}
        </section>
      );
    },
  };
});

describe('App navigation defaults', () => {
  beforeEach(() => {
    window.location.hash = '';
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    saveMocks.saveGraphPage.mockResolvedValue(true);
    saveMocks.saveProjectPage.mockResolvedValue(true);
    vi.mocked(resolveDefaultPageFileHandle).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('autosaves dirty content before navigating without prompting', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'mark graph dirty' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '项目管理' }));
    });

    expect(saveMocks.saveGraphPage).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(resolveDefaultPageFileHandle).toHaveBeenCalledWith('project', { allowPicker: true });
    expect(await screen.findByLabelText('mock project page')).toBeTruthy();
  });

  it('keeps the current page when autosave fails before navigation', async () => {
    saveMocks.saveGraphPage.mockResolvedValue(false);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'mark graph dirty' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '项目管理' }));
    });

    expect(saveMocks.saveGraphPage).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      '自动保存失败，已留在当前页面。请先手动保存后再切换。'
    );
    expect(screen.getByLabelText('mock graph page')).toBeTruthy();
    expect(screen.queryByLabelText('mock project page')).toBeNull();
    expect(resolveDefaultPageFileHandle).not.toHaveBeenCalled();
  });

  it('prepares the target default file handle before navigating', async () => {
    const handle = { name: 'project-management.project' } as FileSystemFileHandle;
    vi.mocked(resolveDefaultPageFileHandle).mockResolvedValue(handle);
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '项目管理' }));
    });

    expect(resolveDefaultPageFileHandle).toHaveBeenCalledWith('project', { allowPicker: true });
    expect(await screen.findByLabelText('mock project page')).toBeTruthy();
    expect(screen.getByText('project-management.project')).toBeTruthy();
  });
});
