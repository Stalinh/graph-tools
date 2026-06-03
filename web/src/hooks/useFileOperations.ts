import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceState } from '../types';
import {
  fileManager as defaultFileManager,
  type WorkspacePackage,
  type WorkspaceFileManager,
} from '../lib/fileSystem';
import type { Locale } from '../i18n';
import { migrateWorkspaceIds } from '../lib/workspaceState';

const UNSUPPORTED_WORKSPACE_FILE_ERROR = 'Unsupported workspace file type.';

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : '';
}

function getOpenWorkspaceErrorMessage(error: unknown, locale: Locale) {
  const isZh = locale === 'zh-CN';
  const message = messageOf(error);

  if (message === UNSUPPORTED_WORKSPACE_FILE_ERROR) {
    return isZh
      ? '仅支持 .graph 工作区文件，请重新选择文件。'
      : 'Only .graph workspace files are supported. Please choose another file.';
  }

  if (
    message === 'Workspace archive is too large.' ||
    message === 'Workspace archive expands to too much data.' ||
    message.startsWith('Workspace archive entry is too large:')
  ) {
    return isZh
      ? '工作区文件过大，无法安全打开。'
      : 'The workspace file is too large to open safely.';
  }

  if (message.startsWith('Invalid workspace archive entry:')) {
    return isZh
      ? '工作区文件包含不安全的归档路径，请重新选择文件。'
      : 'The workspace file contains an unsafe archive path. Please choose another file.';
  }

  if (
    message === 'Invalid .graph workspace: missing or invalid workspace.json' ||
    message === 'File is not a valid workspace state.' ||
    message.toLowerCase().includes('invalid')
  ) {
    return isZh
      ? '工作区文件已损坏或不是有效的 .graph 文件。'
      : 'The workspace file is damaged or is not a valid .graph file.';
  }

  return isZh ? '打开文件失败，请重新选择文件。' : 'Failed to open the file. Please try again.';
}

function getSaveWorkspaceErrorMessage(error: unknown, locale: Locale) {
  const isZh = locale === 'zh-CN';
  const message = messageOf(error);

  if (message.startsWith('Missing image asset:')) {
    return isZh
      ? '保存失败：工作区中有图片资源缺失。'
      : 'Save failed: an image asset is missing from the workspace.';
  }

  return isZh ? '保存失败，请重试。' : 'Save failed. Please try again.';
}

function findMissingImagePath(state: WorkspaceState, images: Map<string, Blob>) {
  return state.graph.nodes.find(
    (node) => node.type === 'image' && node.imagePath && !images.has(node.imagePath)
  )?.imagePath;
}

type PendingAction = 'new' | 'open' | 'open-dropped' | null;

interface UseFileOperationsOptions {
  locale?: Locale;
  createWorkspaceState: () => WorkspaceState;
  applyWorkspaceState: (state: WorkspaceState) => void;
  resetToEmpty: () => void;
  clearHistory: () => void;
  setStatus: (status: 'loading' | 'ready' | 'error') => void;
  setErrorMessage: (msg: string | null) => void;
  getImages: () => Map<string, Blob>;
  setImages: (images: Map<string, Blob>) => void;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  fileManager?: WorkspaceFileManager;
}

export function useFileOperations({
  locale = 'zh-CN',
  createWorkspaceState,
  applyWorkspaceState,
  resetToEmpty,
  clearHistory,
  setStatus,
  setErrorMessage,
  getImages,
  setImages,
  dirty,
  setDirty,
  fileManager = defaultFileManager,
}: UseFileOperationsOptions) {
  const [currentFileName, setCurrentFileName] = useState<string | null>(
    fileManager.getCurrentFileName()
  );
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pendingDroppedFile, setPendingDroppedFile] = useState<File | null>(null);
  const [globalPreviewRequestId, setGlobalPreviewRequestId] = useState(0);

  useEffect(() => {
    setCurrentFileName(fileManager.getCurrentFileName());
  }, [fileManager]);

  const executeNew = useCallback(() => {
    clearHistory();
    resetToEmpty();
    fileManager.reset();
    setImages(new Map());
    setCurrentFileName(null);
    setFileStatus(null);
    setStatus('ready');
    setErrorMessage(null);
    setDirty(false);
  }, [clearHistory, resetToEmpty, setStatus, setErrorMessage, setImages, setDirty, fileManager]);

  const applyWorkspacePackage = useCallback(
    (pkg: WorkspacePackage, fileName: string | null, openedFromDrop = false) => {
      const migratedState = migrateWorkspaceIds(pkg.state);
      applyWorkspaceState({ ...migratedState, viewport: null });
      setImages(pkg.images);
      clearHistory();
      setCurrentFileName(fileName);
      setStatus('ready');
      setFileStatus(
        openedFromDrop
          ? locale === 'zh-CN'
            ? '拖入的文件已打开，保存时将另存为。'
            : 'Dropped file opened. Saving will use Save As.'
          : locale === 'zh-CN'
            ? '文件已打开。'
            : 'File opened.'
      );
      setErrorMessage(null);
      setDirty(false);
      setGlobalPreviewRequestId((requestId) => requestId + 1);
    },
    [applyWorkspaceState, clearHistory, locale, setDirty, setErrorMessage, setImages, setStatus]
  );

  const executeOpen = useCallback(async () => {
    try {
      setStatus('loading');
      setFileStatus(null);
      setErrorMessage(null);

      const pkg = await fileManager.openWorkspaceFile();

      if (!pkg) {
        setStatus('ready');
        return;
      }

      applyWorkspacePackage(pkg, fileManager.getCurrentFileName());
    } catch (error) {
      const message = getOpenWorkspaceErrorMessage(error, locale);
      setStatus('ready');
      setErrorMessage(message);
      setFileStatus(message);
    }
  }, [applyWorkspacePackage, locale, setStatus, setErrorMessage, fileManager]);

  const executeOpenDroppedFile = useCallback(
    async (file: File) => {
      try {
        setStatus('loading');
        setFileStatus(null);
        setErrorMessage(null);

        const pkg = await fileManager.openDroppedWorkspaceFile(file);
        applyWorkspacePackage(pkg, file.name, true);
      } catch (error) {
        const message = getOpenWorkspaceErrorMessage(error, locale);
        setStatus('ready');
        setErrorMessage(message);
        setFileStatus(message);
      }
    },
    [applyWorkspacePackage, fileManager, locale, setErrorMessage, setStatus]
  );

  const handleSaveAs = useCallback(async () => {
    try {
      setFileStatus(locale === 'zh-CN' ? '正在保存...' : 'Saving...');
      setErrorMessage(null);

      const pkg: WorkspacePackage = {
        state: createWorkspaceState(),
        images: getImages(),
      };
      const missingImagePath = findMissingImagePath(pkg.state, pkg.images);
      if (missingImagePath) {
        const message = getSaveWorkspaceErrorMessage(
          new Error(`Missing image asset: ${missingImagePath}`),
          locale
        );
        setFileStatus(message);
        setErrorMessage(message);
        return false;
      }

      const fileName = await fileManager.saveWorkspaceFileAs(pkg);

      if (!fileName) {
        setFileStatus(null);
        return false;
      }

      setCurrentFileName(fileName);
      setFileStatus(locale === 'zh-CN' ? '已保存。' : 'Saved.');
      setErrorMessage(null);
      setDirty(false);
      return true;
    } catch (error) {
      const message = getSaveWorkspaceErrorMessage(error, locale);
      setFileStatus(message);
      setErrorMessage(message);
      return false;
    }
  }, [createWorkspaceState, getImages, locale, setDirty, setErrorMessage, fileManager]);

  const handleSave = useCallback(async () => {
    if (currentFileName) {
      try {
        setFileStatus(locale === 'zh-CN' ? '正在保存...' : 'Saving...');
        setErrorMessage(null);

        const pkg: WorkspacePackage = {
          state: createWorkspaceState(),
          images: getImages(),
        };
        const missingImagePath = findMissingImagePath(pkg.state, pkg.images);
        if (missingImagePath) {
          const message = getSaveWorkspaceErrorMessage(
            new Error(`Missing image asset: ${missingImagePath}`),
            locale
          );
          setFileStatus(message);
          setErrorMessage(message);
          return false;
        }

        const result = await fileManager.saveWorkspaceFile(pkg);

        if (result.success) {
          setFileStatus(locale === 'zh-CN' ? '已保存。' : 'Saved.');
          setErrorMessage(null);
          setDirty(false);
          return true;
        } else {
          if (result.error === 'cancelled') {
            setFileStatus(null);
            return false;
          }
          const isZh = locale === 'zh-CN';
          const message = isZh ? `保存失败：${result.error}` : `Save failed: ${result.error}`;
          setFileStatus(message);
          setErrorMessage(message);
          return false;
        }
      } catch (error) {
        const message = getSaveWorkspaceErrorMessage(error, locale);
        setFileStatus(message);
        setErrorMessage(message);
        return false;
      }
    } else {
      return await handleSaveAs();
    }
  }, [
    createWorkspaceState,
    currentFileName,
    getImages,
    handleSaveAs,
    locale,
    setDirty,
    setErrorMessage,
    fileManager,
  ]);

  const handleNew = useCallback(() => {
    if (dirty) {
      setPendingAction('new');
      return;
    }
    executeNew();
  }, [dirty, executeNew]);

  const handleOpen = useCallback(async () => {
    if (dirty) {
      setPendingAction('open');
      return;
    }
    await executeOpen();
  }, [dirty, executeOpen]);

  const handleDroppedWorkspaceFile = useCallback(
    async (file: File) => {
      if (dirty) {
        setPendingDroppedFile(file);
        setPendingAction('open-dropped');
        return;
      }
      await executeOpenDroppedFile(file);
    },
    [dirty, executeOpenDroppedFile]
  );

  const continuePendingAction = useCallback(async () => {
    if (pendingAction === 'new') {
      executeNew();
      setPendingAction(null);
      return;
    }

    if (pendingAction === 'open') {
      setPendingAction(null);
      await executeOpen();
      return;
    }

    if (pendingAction === 'open-dropped') {
      const file = pendingDroppedFile;
      setPendingAction(null);
      setPendingDroppedFile(null);
      if (file) {
        await executeOpenDroppedFile(file);
      }
    }
  }, [executeNew, executeOpen, executeOpenDroppedFile, pendingAction, pendingDroppedFile]);

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
    setPendingDroppedFile(null);
  }, []);

  const discardPendingAction = useCallback(async () => {
    await continuePendingAction();
  }, [continuePendingAction]);

  const saveAndContinuePendingAction = useCallback(async () => {
    const saved = await handleSave();
    if (!saved) {
      return;
    }
    await continuePendingAction();
  }, [continuePendingAction, handleSave]);

  return {
    currentFileName,
    fileStatus,
    globalPreviewRequestId,
    pendingAction,
    setCurrentFileName,
    handleNew,
    handleOpen,
    handleDroppedWorkspaceFile,
    handleSave,
    handleSaveAs,
    cancelPendingAction,
    discardPendingAction,
    saveAndContinuePendingAction,
  };
}
