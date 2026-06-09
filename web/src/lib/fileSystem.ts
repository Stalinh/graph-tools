import { unzip, zip, type Unzipped } from 'fflate';
import type { WorkspaceState } from '../types';
import {
  WORKSPACE_FILE_DESCRIPTION,
  WORKSPACE_GRAPH_FILE_NAME,
  WORKSPACE_JSON_ENTRY,
  WORKSPACE_OPEN_ACCEPT,
  WORKSPACE_SAVE_ACCEPT,
  getWorkspaceImagePaths,
  isCanonicalWorkspaceFileName,
  isWorkspaceArchiveFileName,
  isWorkspaceImagePath,
  parseWorkspaceStateJson,
  serializeWorkspaceState,
} from './workspaceFileFormat';

const MAX_WORKSPACE_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_WORKSPACE_UNZIPPED_BYTES = 100 * 1024 * 1024;
const MAX_WORKSPACE_ENTRY_BYTES = 50 * 1024 * 1024;

function isAllowedWorkspaceEntry(path: string) {
  return path === WORKSPACE_JSON_ENTRY || isWorkspaceImagePath(path);
}

export interface WorkspacePackage {
  state: WorkspaceState;
  images: Map<string, Blob>;
}

export interface SaveResult {
  success: boolean;
  error?: string; // 用户可读的错误描述
  errorDetail?: Error; // 原始错误对象（用于日志）
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return readBlobAsArrayBuffer(file);
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new Error('Failed to read workspace file data.', { cause: reader.error }));
    reader.readAsArrayBuffer(blob);
  });
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function unzipWorkspaceArchive(data: Uint8Array): Promise<Unzipped> {
  let totalUnzippedBytes = 0;
  let validationError: Error | null = null;

  return new Promise((resolve, reject) => {
    unzip(
      data,
      {
        filter: (entry) => {
          if (validationError) {
            return false;
          }

          try {
            if (!isAllowedWorkspaceEntry(entry.name)) {
              throw new Error(`Invalid workspace archive entry: ${entry.name}`);
            }
            if (entry.originalSize > MAX_WORKSPACE_ENTRY_BYTES) {
              throw new Error(`Workspace archive entry is too large: ${entry.name}`);
            }
            totalUnzippedBytes += entry.originalSize;
            if (totalUnzippedBytes > MAX_WORKSPACE_UNZIPPED_BYTES) {
              throw new Error('Workspace archive expands to too much data.');
            }
            return true;
          } catch (error) {
            validationError = toError(error);
            return false;
          }
        },
      },
      (error, unzipped) => {
        if (validationError) {
          reject(validationError);
          return;
        }
        if (error) {
          reject(new Error(error.message, { cause: error }));
          return;
        }
        resolve(unzipped);
      }
    );
  });
}

function zipWorkspaceFiles(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, zipped) => {
      if (error) {
        reject(new Error(error.message, { cause: error }));
        return;
      }
      resolve(zipped);
    });
  });
}

function toWritableBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy: Uint8Array<ArrayBuffer> = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy;
}

async function writeBytesToFile(handle: FileSystemFileHandle, data: Uint8Array<ArrayBuffer>) {
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    try {
      await writable.abort(error);
    } catch {
      // Preserve the original write failure if cleanup also fails.
    }
    throw error;
  }
}

export class WorkspaceFileManager {
  private currentFileHandle: FileSystemFileHandle | null = null;

  getCurrentFileName(): string | null {
    return this.currentFileHandle?.name ?? null;
  }

  reset(): void {
    this.currentFileHandle = null;
  }

  async openWorkspaceFile(): Promise<WorkspacePackage | null> {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: WORKSPACE_FILE_DESCRIPTION,
            accept: WORKSPACE_OPEN_ACCEPT,
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const pkg = await this.readWorkspaceFile(file);

      this.currentFileHandle = fileHandle;
      return pkg;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  async openDroppedWorkspaceFile(file: File): Promise<WorkspacePackage> {
    const pkg = await this.readWorkspaceFile(file);
    this.currentFileHandle = null;
    return pkg;
  }

  async openWorkspaceFileFromHandle(fileHandle: FileSystemFileHandle): Promise<WorkspacePackage> {
    const file = await fileHandle.getFile();
    const pkg = await this.readWorkspaceFile(file);
    this.currentFileHandle = fileHandle;
    return pkg;
  }

  async saveWorkspaceFile(pkg: WorkspacePackage): Promise<SaveResult> {
    if (!this.currentFileHandle) {
      return { success: false, error: 'No active workspace file.' };
    }

    try {
      if (!isCanonicalWorkspaceFileName(this.currentFileHandle.name)) {
        return { success: false, error: 'Invalid workspace file name.' };
      }
      await this.writeGraph(this.currentFileHandle, pkg);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'cancelled'
          : error instanceof Error
            ? error.message
            : '未知错误';
      return {
        success: false,
        error: message,
        errorDetail: error instanceof Error ? error : undefined,
      };
    }
  }

  async saveWorkspaceFileAs(pkg: WorkspacePackage): Promise<string | null> {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: WORKSPACE_GRAPH_FILE_NAME,
        types: [
          {
            description: WORKSPACE_FILE_DESCRIPTION,
            accept: WORKSPACE_SAVE_ACCEPT,
          },
        ],
      });

      await this.writeGraph(fileHandle, pkg);

      this.currentFileHandle = fileHandle;
      return fileHandle.name;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  private async writeGraph(handle: FileSystemFileHandle, pkg: WorkspacePackage) {
    const files: Record<string, Uint8Array> = {};
    files[WORKSPACE_JSON_ENTRY] = new TextEncoder().encode(serializeWorkspaceState(pkg.state));

    for (const path of getWorkspaceImagePaths(pkg.state)) {
      const blob = pkg.images.get(path);
      if (!blob) {
        throw new Error(`Missing image asset: ${path}`);
      }
      const buffer = await readBlobAsArrayBuffer(blob);
      files[path] = new Uint8Array(buffer);
    }

    const zipped = toWritableBytes(await zipWorkspaceFiles(files));
    await writeBytesToFile(handle, zipped);
  }

  private async readWorkspaceFile(file: File): Promise<WorkspacePackage> {
    if (!isWorkspaceArchiveFileName(file.name)) {
      throw new Error('Unsupported workspace file type.');
    }

    if (file.size > MAX_WORKSPACE_ARCHIVE_BYTES) {
      throw new Error('Workspace archive is too large.');
    }

    const buffer = await readFileAsArrayBuffer(file);
    const unzipped = await unzipWorkspaceArchive(new Uint8Array(buffer));
    const archivedImages = new Map<string, Blob>();
    let state: WorkspaceState | null = null;

    let actualUnzippedBytes = 0;
    for (const [path, data] of Object.entries(unzipped)) {
      if (data.byteLength > MAX_WORKSPACE_ENTRY_BYTES) {
        throw new Error(`Workspace archive entry is too large: ${path}`);
      }
      actualUnzippedBytes += data.byteLength;
      if (actualUnzippedBytes > MAX_WORKSPACE_UNZIPPED_BYTES) {
        throw new Error('Workspace archive expands to too much data.');
      }

      if (path === WORKSPACE_JSON_ENTRY) {
        state = parseWorkspaceStateJson(new TextDecoder().decode(data));
      } else if (isWorkspaceImagePath(path)) {
        const blob = new Blob([data]);
        archivedImages.set(path, blob);
      }
    }

    if (!state) {
      throw new Error('Invalid .graph workspace: missing or invalid workspace.json');
    }

    const images = new Map<string, Blob>();
    for (const path of getWorkspaceImagePaths(state)) {
      const blob = archivedImages.get(path);
      if (blob) {
        images.set(path, blob);
      }
    }

    return { state, images };
  }
}

export const fileManager = new WorkspaceFileManager();
