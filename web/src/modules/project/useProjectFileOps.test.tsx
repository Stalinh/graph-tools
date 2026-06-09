/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectFileManager } from './projectFileSystem';
import { createProjectRecord } from './projectModel';
import { useProjectFileOps } from './useProjectFileOps';
import type { ProjectRecord } from './projectTypes';

function renderProjectFileOps({
  dirty = false,
  records = [],
}: {
  dirty?: boolean;
  records?: ProjectRecord[];
} = {}) {
  return renderHook(() =>
    useProjectFileOps({
      currentFileName: null,
      dirty,
      droppedProjectFile: null,
      isZh: true,
      records,
      setCurrentFileName: vi.fn(),
      setDirty: vi.fn(),
      setExpandedProjectIds: vi.fn(),
      setFileStatus: vi.fn(),
      setRecords: vi.fn(),
    })
  );
}

describe('useProjectFileOps', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a default project file handle and applies it as the current file', async () => {
    const openedRecords = [createProjectRecord({ projectName: 'Default Desktop Project' })];
    const fileHandle = { name: 'project-management.project' } as FileSystemFileHandle;
    const openProjectFileFromHandle = vi
      .spyOn(projectFileManager, 'openProjectFileFromHandle')
      .mockResolvedValue(openedRecords);
    vi.spyOn(projectFileManager, 'getCurrentFileName').mockReturnValue(
      'project-management.project'
    );
    const setCurrentFileName = vi.fn();
    const setDirty = vi.fn();
    const setExpandedProjectIds = vi.fn();
    const setFileStatus = vi.fn();
    const setRecords = vi.fn();

    const { result } = renderHook(() =>
      useProjectFileOps({
        currentFileName: null,
        dirty: false,
        droppedProjectFile: null,
        isZh: true,
        records: [],
        setCurrentFileName,
        setDirty,
        setExpandedProjectIds,
        setFileStatus,
        setRecords,
      })
    );

    await act(async () => {
      await result.current.handleOpenDefaultProjectFile(fileHandle);
    });

    expect(openProjectFileFromHandle).toHaveBeenCalledWith(fileHandle);
    expect(setCurrentFileName).toHaveBeenCalledWith('project-management.project');
    expect(setExpandedProjectIds).toHaveBeenCalledWith(new Set());
    expect(setFileStatus).toHaveBeenLastCalledWith(expect.stringContaining('项目文件已打开'));
    expect(setDirty).toHaveBeenCalled();
    expect(setRecords).toHaveBeenCalledWith(expect.any(Array));
  });

  it('does not open a default project handle while the sheet is dirty', async () => {
    const openProjectFileFromHandle = vi
      .spyOn(projectFileManager, 'openProjectFileFromHandle')
      .mockResolvedValue([]);
    const { result } = renderProjectFileOps({ dirty: true });

    await act(async () => {
      await result.current.handleOpenDefaultProjectFile({
        name: 'project-management.project',
      } as FileSystemFileHandle);
    });

    expect(openProjectFileFromHandle).not.toHaveBeenCalled();
  });
});
