import {
  WORKSPACE_FILE_DESCRIPTION,
  WORKSPACE_GRAPH_FILE_NAME,
  WORKSPACE_OPEN_ACCEPT,
} from './workspaceFileFormat';
import {
  PROJECT_FILE_DESCRIPTION,
  PROJECT_FILE_NAME,
  PROJECT_OPEN_ACCEPT,
} from '../modules/project/projectFileFormat';

export type DefaultPageFileKind = 'workspace' | 'project';

export interface DefaultPageFileConfig {
  accept: Record<string, string[]>;
  description: string;
  expectedFileName: string;
}

export interface DefaultPageFileHandleStore {
  load: (kind: DefaultPageFileKind) => Promise<FileSystemFileHandle | null>;
  save: (kind: DefaultPageFileKind, handle: FileSystemFileHandle) => Promise<void>;
  remove: (kind: DefaultPageFileKind) => Promise<void>;
}

type StoredDefaultPageFileHandleRecord = FileSystemFileHandle | NativeSerializedFileHandle;

function isNativeSerializedFileHandle(
  record: StoredDefaultPageFileHandleRecord | null
): record is NativeSerializedFileHandle {
  return Boolean(
    record &&
    typeof record === 'object' &&
    'provider' in record &&
    record.provider === 'native-file-system'
  );
}

interface ResolveDefaultPageFileHandleOptions {
  allowPicker?: boolean;
  nativeFileSystem?: NativeFileSystemAdapter;
  showOpenFilePicker?: Window['showOpenFilePicker'];
  store?: DefaultPageFileHandleStore;
}

const DEFAULT_FILE_HANDLE_DB_NAME = 'local-kg-default-file-handles';
const DEFAULT_FILE_HANDLE_STORE_NAME = 'handles';

const DEFAULT_PAGE_FILE_CONFIG: Record<DefaultPageFileKind, DefaultPageFileConfig> = {
  workspace: {
    accept: WORKSPACE_OPEN_ACCEPT,
    description: WORKSPACE_FILE_DESCRIPTION,
    expectedFileName: WORKSPACE_GRAPH_FILE_NAME,
  },
  project: {
    accept: PROJECT_OPEN_ACCEPT,
    description: PROJECT_FILE_DESCRIPTION,
    expectedFileName: PROJECT_FILE_NAME,
  },
};

export class DefaultFileNameMismatchError extends Error {
  constructor(
    readonly expectedFileName: string,
    readonly actualFileName: string
  ) {
    super(`Expected ${expectedFileName}, received ${actualFileName}.`);
  }
}

export function serializeDefaultFileHandleRecord(
  handle: FileSystemFileHandle,
  nativeFileSystem: NativeFileSystemAdapter | undefined = window.__nativeFileSystem
): StoredDefaultPageFileHandleRecord {
  if (nativeFileSystem?.isNativeFileHandle(handle)) {
    return nativeFileSystem.serializeFileHandle(handle) ?? handle;
  }

  return handle;
}

export function restoreDefaultFileHandleRecord(
  record: StoredDefaultPageFileHandleRecord | null,
  nativeFileSystem: NativeFileSystemAdapter | undefined = window.__nativeFileSystem
): FileSystemFileHandle | null {
  if (!record) {
    return null;
  }

  if (isNativeSerializedFileHandle(record)) {
    return nativeFileSystem?.restoreFileHandle(record) ?? null;
  }

  return record;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isExpectedDefaultFileName(kind: DefaultPageFileKind, fileName: string) {
  return fileName.toLowerCase() === DEFAULT_PAGE_FILE_CONFIG[kind].expectedFileName.toLowerCase();
}

function getNativeFileSystemAdapter() {
  return typeof window === 'undefined' ? undefined : window.__nativeFileSystem;
}

function getShowOpenFilePicker() {
  if (typeof window === 'undefined') {
    throw new Error('showOpenFilePicker is unavailable in this environment.');
  }

  return window.showOpenFilePicker.bind(window);
}

function openDefaultFileHandleDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEFAULT_FILE_HANDLE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(DEFAULT_FILE_HANDLE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error('Failed to open default file handle database.', {
          cause: request.error,
        })
      );
  });
}

async function runDefaultFileHandleTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  const database = await openDefaultFileHandleDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DEFAULT_FILE_HANDLE_STORE_NAME, mode);
    const store = transaction.objectStore(DEFAULT_FILE_HANDLE_STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () =>
      reject(
        new Error('Failed to access default file handle database.', {
          cause: request.error,
        })
      );
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(
        new Error('Failed to complete default file handle transaction.', {
          cause: transaction.error,
        })
      );
    };
  });
}

export const indexedDbDefaultPageFileHandleStore: DefaultPageFileHandleStore = {
  async load(kind) {
    const record = await runDefaultFileHandleTransaction<StoredDefaultPageFileHandleRecord>(
      'readonly',
      (store) => store.get(kind)
    );
    return restoreDefaultFileHandleRecord(record ?? null);
  },
  async save(kind, handle) {
    const record = serializeDefaultFileHandleRecord(handle);
    await runDefaultFileHandleTransaction('readwrite', (store) => store.put(record, kind));
  },
  async remove(kind) {
    await runDefaultFileHandleTransaction('readwrite', (store) => store.delete(kind));
  },
};

export function getDefaultPageFileConfig(kind: DefaultPageFileKind): DefaultPageFileConfig {
  return DEFAULT_PAGE_FILE_CONFIG[kind];
}

async function ensureReadPermission(handle: FileSystemFileHandle) {
  if ((await handle.queryPermission({ mode: 'read' })) === 'granted') {
    return true;
  }

  return (await handle.requestPermission({ mode: 'read' })) === 'granted';
}

async function pickDefaultPageFileHandle(
  kind: DefaultPageFileKind,
  showOpenFilePicker: Window['showOpenFilePicker']
) {
  const config = getDefaultPageFileConfig(kind);
  try {
    const [handle] = await showOpenFilePicker({
      multiple: false,
      startIn: 'desktop',
      types: [
        {
          description: config.description,
          accept: config.accept,
        },
      ],
    });
    return handle ?? null;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    throw error;
  }
}

async function resolveNativeDefaultFileHandle(
  kind: DefaultPageFileKind,
  nativeFileSystem: NativeFileSystemAdapter | undefined
) {
  if (!nativeFileSystem) {
    return null;
  }

  const { expectedFileName } = getDefaultPageFileConfig(kind);
  const handle = await nativeFileSystem.findDefaultFileHandle(expectedFileName);
  if (!handle) {
    return null;
  }

  return isExpectedDefaultFileName(kind, handle.name) ? handle : null;
}

export async function resolveDefaultPageFileHandle(
  kind: DefaultPageFileKind,
  {
    allowPicker = true,
    nativeFileSystem = getNativeFileSystemAdapter(),
    showOpenFilePicker = getShowOpenFilePicker(),
    store = indexedDbDefaultPageFileHandleStore,
  }: ResolveDefaultPageFileHandleOptions = {}
) {
  const nativeDefaultHandle = await resolveNativeDefaultFileHandle(kind, nativeFileSystem);
  if (nativeDefaultHandle) {
    await store.save(kind, nativeDefaultHandle);
    return nativeDefaultHandle;
  }

  const storedHandle = await store.load(kind);
  if (storedHandle) {
    if (isExpectedDefaultFileName(kind, storedHandle.name)) {
      if (await ensureReadPermission(storedHandle)) {
        return storedHandle;
      }
    } else {
      await store.remove(kind);
    }
  }

  if (!allowPicker) {
    return null;
  }

  const pickedHandle = await pickDefaultPageFileHandle(kind, showOpenFilePicker);
  if (!pickedHandle) {
    return null;
  }

  const { expectedFileName } = getDefaultPageFileConfig(kind);
  if (!isExpectedDefaultFileName(kind, pickedHandle.name)) {
    throw new DefaultFileNameMismatchError(expectedFileName, pickedHandle.name);
  }

  await store.save(kind, pickedHandle);
  return pickedHandle;
}
