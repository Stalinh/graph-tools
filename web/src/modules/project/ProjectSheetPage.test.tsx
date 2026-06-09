/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectSheetPage } from './ProjectSheetPage';
import { createProjectRecord } from './projectModel';

const handleOpenDefaultProjectFile = vi.fn().mockResolvedValue(undefined);

vi.mock('../../i18n', () => ({
  useI18n: () => ({ isZh: true }),
}));

vi.mock('./useProjectSheetState', () => ({
  useProjectSheetState: () => ({
    addProjectRecord: vi.fn(),
    commitProjectField: vi.fn(),
    currentFileName: null,
    dirty: false,
    enterEditMode: vi.fn(),
    enterReadMode: vi.fn(),
    expandedProjectIds: new Set(),
    fileStatus: null,
    handleNewProjectFile: vi.fn(),
    handleOpenDefaultProjectFile,
    handleOpenProjectFile: vi.fn(),
    handleSaveProjectFile: vi.fn(),
    handleSaveProjectFileAs: vi.fn(),
    isEditMode: false,
    records: [createProjectRecord({ projectName: 'P1' })],
    removeRecord: vi.fn(),
    toggleProjectExpanded: vi.fn(),
    updateProjectField: vi.fn(),
    updateSubLineField: vi.fn(),
  }),
}));

describe('ProjectSheetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a provided default project handle once and marks it handled', () => {
    const onHandled = vi.fn();
    const handle = { name: 'project-management.project' } as FileSystemFileHandle;

    const { rerender } = render(
      <ProjectSheetPage
        defaultProjectFileHandle={null}
        onDefaultProjectFileHandleHandled={onHandled}
      />
    );

    expect(handleOpenDefaultProjectFile).not.toHaveBeenCalled();

    rerender(
      <ProjectSheetPage
        defaultProjectFileHandle={{ id: 8, handle }}
        onDefaultProjectFileHandleHandled={onHandled}
      />
    );

    expect(onHandled).toHaveBeenCalledWith(8);
    expect(handleOpenDefaultProjectFile).toHaveBeenCalledWith(handle);
  });
});
