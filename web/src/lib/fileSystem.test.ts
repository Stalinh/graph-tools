/**
 * @vitest-environment jsdom
 */
import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceState } from '../types';
import { WorkspaceFileManager } from './fileSystem';
import { serializeWorkspaceState, WORKSPACE_JSON_ENTRY } from './workspaceFileFormat';

function workspace(): WorkspaceState {
  return {
    version: 1,
    savedAt: '2026-01-01T00:00:00.000Z',
    graph: {
      nodes: [{ id: '#1', type: 'card', title: 'Desktop Graph', tags: [] }],
      edges: [],
    },
    nodePositions: {
      '#1': { x: 12, y: 34 },
    },
    viewport: null,
    selectedNodeId: '#1',
  };
}

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

describe('WorkspaceFileManager', () => {
  it('opens a workspace from a provided file handle and keeps it as current file', async () => {
    const state = workspace();
    const file = new File(
      [
        zipSync({
          [WORKSPACE_JSON_ENTRY]: strToU8(serializeWorkspaceState(state)),
        }),
      ],
      'workspace.graph'
    );
    const handle = createFileHandle(file);
    const manager = new WorkspaceFileManager();

    const opened = await manager.openWorkspaceFileFromHandle(handle);

    expect(opened.state.graph.nodes[0].title).toBe('Desktop Graph');
    expect(opened.images.size).toBe(0);
    expect(manager.getCurrentFileName()).toBe('workspace.graph');
  });
});
