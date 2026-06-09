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

interface ResolveDefaultPageFileHandleOptions {
  allowPicker?: boolean;
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isExpectedDefaultFileName(kind: DefaultPageFileKind, fileName: string) {
  return fileName.toLowerCase() === DEFAULT_PAGE_FILE_CONFIG[kind].expectedFileName.toLowerCase();
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
    const handle = await runDefaultFileHandleTransaction<FileSystemFileHandle>(
      'readonly',
      (store) => store.get(kind)
    );
    return handle ?? null;
  },
  async save(kind, handle) {
    await runDefaultFileHandleTransaction('readwrite', (store) => store.put(handle, kind));
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

export async function resolveDefaultPageFileHandle(
  kind: DefaultPageFileKind,
  {
    allowPicker = true,
    showOpenFilePicker = window.showOpenFilePicker.bind(window),
    store = indexedDbDefaultPageFileHandleStore,
  }: ResolveDefaultPageFileHandleOptions = {}
) {
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
