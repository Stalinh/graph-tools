/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { serializeProjectFile } from './projectFileFormat';
import { ProjectFileManager } from './projectFileSystem';
import { createProjectRecord } from './projectModel';

function createFileHandle(file: File) {
  return {
    kind: 'file',
    name: file.name,
    getFile: vi.fn(async () => file),
    createWritable: vi.fn(),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
  } as unknown as FileSystemFileHandle;
}

describe('ProjectFileManager', () => {
  it('opens project records from a provided file handle and keeps it as current file', async () => {
    const records = [
      createProjectRecord({
        projectName: 'Desktop Project',
      }),
    ];
    const file = new File([serializeProjectFile(records)], 'project-management.project');
    const handle = createFileHandle(file);
    const manager = new ProjectFileManager();

    const opened = await manager.openProjectFileFromHandle(handle);

    expect(opened[0].projectName).toBe('Desktop Project');
    expect(manager.getCurrentFileName()).toBe('project-management.project');
  });
});
