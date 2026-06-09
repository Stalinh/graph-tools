/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  useIncomingWorkspaceFile,
  type DefaultWorkspaceFileHandle,
  type DroppedWorkspaceFile,
} from './useIncomingWorkspaceFile';

describe('useIncomingWorkspaceFile', () => {
  it('opens a new default workspace handle once and marks it handled', () => {
    const handleOpenDefaultWorkspaceFile = vi.fn();
    const onDefaultWorkspaceFileHandleHandled = vi.fn();
    const handle = { name: 'workspace.graph' } as FileSystemFileHandle;

    const { rerender } = renderHook(
      (defaultWorkspaceFileHandle: { id: number; handle: FileSystemFileHandle } | null) =>
        useIncomingWorkspaceFile({
          defaultWorkspaceFileHandle,
          droppedWorkspaceFile: null,
          handleDroppedWorkspaceFile: vi.fn(),
          handleOpenDefaultWorkspaceFile,
          onDefaultWorkspaceFileHandleHandled,
        }),
      { initialProps: null as DefaultWorkspaceFileHandle | null }
    );

    rerender({ id: 7, handle });
    rerender({ id: 7, handle });

    expect(onDefaultWorkspaceFileHandleHandled).toHaveBeenCalledTimes(1);
    expect(onDefaultWorkspaceFileHandleHandled).toHaveBeenCalledWith(7);
    expect(handleOpenDefaultWorkspaceFile).toHaveBeenCalledTimes(1);
    expect(handleOpenDefaultWorkspaceFile).toHaveBeenCalledWith(handle);
  });

  it('opens a dropped workspace file once and marks it handled', () => {
    const handleDroppedWorkspaceFile = vi.fn();
    const onDroppedWorkspaceFileHandled = vi.fn();
    const file = new File(['workspace-data'], 'project.graph', { type: 'application/json' });

    const { rerender } = renderHook(
      (droppedWorkspaceFile: { id: number; file: File } | null) =>
        useIncomingWorkspaceFile({
          defaultWorkspaceFileHandle: null,
          droppedWorkspaceFile,
          handleDroppedWorkspaceFile,
          handleOpenDefaultWorkspaceFile: vi.fn(),
          onDroppedWorkspaceFileHandled,
        }),
      { initialProps: null as DroppedWorkspaceFile | null }
    );

    rerender({ id: 999, file });
    rerender({ id: 999, file });

    expect(onDroppedWorkspaceFileHandled).toHaveBeenCalledTimes(1);
    expect(onDroppedWorkspaceFileHandled).toHaveBeenCalledWith(999);
    expect(handleDroppedWorkspaceFile).toHaveBeenCalledTimes(1);
    expect(handleDroppedWorkspaceFile).toHaveBeenCalledWith(file);
  });
});
