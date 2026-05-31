import {
  PROJECT_FILE_DESCRIPTION,
  PROJECT_FILE_NAME,
  PROJECT_OPEN_ACCEPT,
  PROJECT_SAVE_ACCEPT,
  isProjectFileName,
  parseProjectFileJson,
  serializeProjectFile,
} from "./projectFileFormat";
import type { ProjectRecord } from "./projectTypes";

const MAX_PROJECT_FILE_BYTES = 10 * 1024 * 1024;

function toWritableBytes(text: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(text);
  const copy: Uint8Array<ArrayBuffer> = new Uint8Array(encoded.byteLength);
  copy.set(encoded);
  return copy;
}

async function readFileAsUtf8(file: File) {
  const buffer = await file.arrayBuffer();
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export class ProjectFileManager {
  private currentFileHandle: FileSystemFileHandle | null = null;

  getCurrentFileName(): string | null {
    return this.currentFileHandle?.name ?? null;
  }

  reset(): void {
    this.currentFileHandle = null;
  }

  async openProjectFile(): Promise<ProjectRecord[] | null> {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: PROJECT_FILE_DESCRIPTION,
            accept: PROJECT_OPEN_ACCEPT,
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      if (!isProjectFileName(file.name)) {
        throw new Error("Unsupported project file type.");
      }

      if (file.size > MAX_PROJECT_FILE_BYTES) {
        throw new Error("Project file is too large.");
      }

      const records = parseProjectFileJson(await readFileAsUtf8(file));
      this.currentFileHandle = fileHandle;
      return records;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  async saveProjectFile(records: ProjectRecord[]): Promise<boolean> {
    if (!this.currentFileHandle) {
      return false;
    }

    if (!isProjectFileName(this.currentFileHandle.name)) {
      throw new Error("Unsupported project file type.");
    }

    await this.writeProject(this.currentFileHandle, records);
    return true;
  }

  async saveProjectFileAs(records: ProjectRecord[]): Promise<string | null> {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: PROJECT_FILE_NAME,
        types: [
          {
            description: PROJECT_FILE_DESCRIPTION,
            accept: PROJECT_SAVE_ACCEPT,
          },
        ],
      });

      await this.writeProject(fileHandle, records);
      this.currentFileHandle = fileHandle;
      return fileHandle.name;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      throw error;
    }
  }

  private async writeProject(handle: FileSystemFileHandle, records: ProjectRecord[]) {
    const writable = await handle.createWritable();
    await writable.write(toWritableBytes(serializeProjectFile(records)));
    await writable.close();
  }
}

export const projectFileManager = new ProjectFileManager();
