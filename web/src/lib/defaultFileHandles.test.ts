import { describe, expect, it, vi } from 'vitest';
import {
  DefaultFileNameMismatchError,
  getDefaultPageFileConfig,
  resolveDefaultPageFileHandle,
  restoreDefaultFileHandleRecord,
  serializeDefaultFileHandleRecord,
  type DefaultPageFileHandleStore,
} from './defaultFileHandles';

function createFileHandle(
  name: string,
  queryPermission: PermissionState = 'granted',
  requestPermission: PermissionState = queryPermission
) {
  return {
    kind: 'file',
    name,
    getFile: vi.fn(),
    createWritable: vi.fn(),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(async () => queryPermission),
    requestPermission: vi.fn(async () => requestPermission),
  } as unknown as FileSystemFileHandle;
}

function createMemoryStore(initialHandle: FileSystemFileHandle | null = null) {
  let handle = initialHandle;
  const store: DefaultPageFileHandleStore = {
    load: vi.fn(async () => handle),
    save: vi.fn(async (_kind, nextHandle) => {
      handle = nextHandle;
    }),
    remove: vi.fn(async () => {
      handle = null;
    }),
  };
  return store;
}

describe('default file handles', () => {
  it('uses fixed file names for graph and project pages', () => {
    expect(getDefaultPageFileConfig('workspace').expectedFileName).toBe('workspace.graph');
    expect(getDefaultPageFileConfig('project').expectedFileName).toBe('project-management.project');
  });

  it('reuses a stored default handle when read permission is granted', async () => {
    const handle = createFileHandle('workspace.graph', 'granted');
    const store = createMemoryStore(handle);
    const showOpenFilePicker = vi.fn();

    const resolved = await resolveDefaultPageFileHandle('workspace', {
      store,
      showOpenFilePicker,
    });

    expect(resolved).toBe(handle);
    expect(handle.queryPermission).toHaveBeenCalledWith({ mode: 'read' });
    expect(handle.requestPermission).not.toHaveBeenCalled();
    expect(showOpenFilePicker).not.toHaveBeenCalled();
  });

  it('asks for permission on a stored prompt-state handle before reuse', async () => {
    const handle = createFileHandle('project-management.project', 'prompt', 'granted');
    const store = createMemoryStore(handle);

    const resolved = await resolveDefaultPageFileHandle('project', {
      store,
      showOpenFilePicker: vi.fn(),
    });

    expect(resolved).toBe(handle);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'read' });
  });

  it('uses the native desktop fixed-path handle before opening the picker', async () => {
    const handle = createFileHandle('workspace.graph', 'granted');
    const store = createMemoryStore();
    const showOpenFilePicker = vi.fn();
    const nativeFileSystem: NativeFileSystemAdapter = {
      findDefaultFileHandle: vi.fn(async (fileName) =>
        fileName === 'workspace.graph' ? handle : null
      ),
      isNativeFileHandle(_candidate): _candidate is FileSystemFileHandle {
        return false;
      },
      restoreFileHandle: vi.fn(),
      serializeFileHandle: vi.fn(),
    };

    const resolved = await resolveDefaultPageFileHandle('workspace', {
      store,
      showOpenFilePicker,
      nativeFileSystem,
    });

    expect(resolved).toBe(handle);
    expect(nativeFileSystem.findDefaultFileHandle).toHaveBeenCalledWith('workspace.graph');
    expect(showOpenFilePicker).not.toHaveBeenCalled();
    expect(store.save).toHaveBeenCalledWith('workspace', handle);
  });

  it('picks from the desktop and stores the selected handle when no stored handle exists', async () => {
    const handle = createFileHandle('workspace.graph', 'granted');
    const store = createMemoryStore();
    const showOpenFilePicker = vi.fn(async () => [handle]);

    const resolved = await resolveDefaultPageFileHandle('workspace', {
      store,
      showOpenFilePicker,
    });

    expect(resolved).toBe(handle);
    expect(showOpenFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        multiple: false,
        startIn: 'desktop',
      })
    );
    expect(store.save).toHaveBeenCalledWith('workspace', handle);
  });

  it('rejects a picked file with the wrong fixed file name', async () => {
    const store = createMemoryStore();
    const showOpenFilePicker = vi.fn(async () => [createFileHandle('other.graph', 'granted')]);

    await expect(
      resolveDefaultPageFileHandle('workspace', {
        store,
        showOpenFilePicker,
      })
    ).rejects.toBeInstanceOf(DefaultFileNameMismatchError);
    expect(store.save).not.toHaveBeenCalled();
  });

  it('returns null when choosing a default file is cancelled', async () => {
    const store = createMemoryStore();
    const showOpenFilePicker = vi.fn(async () => {
      throw new DOMException('Cancelled', 'AbortError');
    });

    await expect(
      resolveDefaultPageFileHandle('project', {
        store,
        showOpenFilePicker,
      })
    ).resolves.toBeNull();
  });

  it('serializes native desktop handles into IndexedDB-safe records', () => {
    const handle = createFileHandle('workspace.graph', 'granted') as FileSystemFileHandle;
    const nativeFileSystem: NativeFileSystemAdapter = {
      findDefaultFileHandle: vi.fn(),
      isNativeFileHandle(candidate): candidate is FileSystemFileHandle {
        return candidate === handle;
      },
      restoreFileHandle: vi.fn(),
      serializeFileHandle: vi.fn(() => ({
        provider: 'native-file-system' as const,
        kind: 'file' as const,
        id: 'native-workspace-handle',
        name: 'workspace.graph',
        bookmark: 'bookmark-token',
      })),
    };

    expect(serializeDefaultFileHandleRecord(handle, nativeFileSystem)).toEqual({
      provider: 'native-file-system',
      kind: 'file',
      id: 'native-workspace-handle',
      name: 'workspace.graph',
      bookmark: 'bookmark-token',
    });
    expect(nativeFileSystem.serializeFileHandle).toHaveBeenCalledWith(handle);
  });

  it('restores native desktop handles from serialized records', () => {
    const restoredHandle = createFileHandle('project-management.project', 'granted');
    const nativeFileSystem: NativeFileSystemAdapter = {
      findDefaultFileHandle: vi.fn(),
      isNativeFileHandle(_candidate): _candidate is FileSystemFileHandle {
        return false;
      },
      restoreFileHandle: vi.fn(() => restoredHandle),
      serializeFileHandle: vi.fn(),
    };

    expect(
      restoreDefaultFileHandleRecord(
        {
          provider: 'native-file-system',
          kind: 'file',
          id: 'native-project-handle',
          name: 'project-management.project',
          bookmark: 'bookmark-token',
        },
        nativeFileSystem
      )
    ).toBe(restoredHandle);
    expect(nativeFileSystem.restoreFileHandle).toHaveBeenCalledWith({
      provider: 'native-file-system',
      kind: 'file',
      id: 'native-project-handle',
      name: 'project-management.project',
      bookmark: 'bookmark-token',
    });
  });
});
