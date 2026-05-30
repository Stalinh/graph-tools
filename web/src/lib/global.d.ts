interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemFileHandle {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface FileSystemHandle {
  readonly kind: "file" | "directory";
  readonly name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface OpenFilePickerOptions {
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  startIn?:
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos"
    | FileSystemHandle;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
  startIn?:
    | "desktop"
    | "documents"
    | "downloads"
    | "music"
    | "pictures"
    | "videos"
    | FileSystemHandle;
}

interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
