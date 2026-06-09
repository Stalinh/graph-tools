import { describe, expect, it, vi } from 'vitest';
import {
  DefaultFileNameMismatchError,
  getDefaultPageFileConfig,
  resolveDefaultPageFileHandle,
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
});
