// charset: utf-8
import { useEffect, useRef } from 'react';

export interface DroppedWorkspaceFile {
  file: File;
  id: number;
}

export interface DefaultWorkspaceFileHandle {
  handle: FileSystemFileHandle;
  id: number;
}

interface UseIncomingWorkspaceFileOptions {
  defaultWorkspaceFileHandle: DefaultWorkspaceFileHandle | null;
  droppedWorkspaceFile: DroppedWorkspaceFile | null;
  handleDroppedWorkspaceFile: (file: File) => void | Promise<unknown>;
  handleOpenDefaultWorkspaceFile: (handle: FileSystemFileHandle) => void | Promise<unknown>;
  onDefaultWorkspaceFileHandleHandled?: (id: number) => void;
  onDroppedWorkspaceFileHandled?: (id: number) => void;
}

export function useIncomingWorkspaceFile({
  defaultWorkspaceFileHandle,
  droppedWorkspaceFile,
  handleDroppedWorkspaceFile,
  handleOpenDefaultWorkspaceFile,
  onDefaultWorkspaceFileHandleHandled,
  onDroppedWorkspaceFileHandled,
}: UseIncomingWorkspaceFileOptions) {
  const handledDroppedWorkspaceFileIdRef = useRef<number | null>(null);
  const handledDefaultWorkspaceFileIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!defaultWorkspaceFileHandle) {
      return;
    }
    if (handledDefaultWorkspaceFileIdRef.current === defaultWorkspaceFileHandle.id) {
      return;
    }

    handledDefaultWorkspaceFileIdRef.current = defaultWorkspaceFileHandle.id;
    onDefaultWorkspaceFileHandleHandled?.(defaultWorkspaceFileHandle.id);
    void handleOpenDefaultWorkspaceFile(defaultWorkspaceFileHandle.handle);
  }, [
    defaultWorkspaceFileHandle,
    handleOpenDefaultWorkspaceFile,
    onDefaultWorkspaceFileHandleHandled,
  ]);

  useEffect(() => {
    if (!droppedWorkspaceFile) {
      return;
    }
    if (handledDroppedWorkspaceFileIdRef.current === droppedWorkspaceFile.id) {
      return;
    }

    handledDroppedWorkspaceFileIdRef.current = droppedWorkspaceFile.id;
    onDroppedWorkspaceFileHandled?.(droppedWorkspaceFile.id);
    void handleDroppedWorkspaceFile(droppedWorkspaceFile.file);
  }, [droppedWorkspaceFile, handleDroppedWorkspaceFile, onDroppedWorkspaceFileHandled]);
}
