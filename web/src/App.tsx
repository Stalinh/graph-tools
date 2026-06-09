import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { KnowledgeBase } from './components/KnowledgeBase';
import { getStoredLocale, I18nProvider, type Locale } from './i18n';
import { PROJECT_NAV_ITEM, PROJECT_PAGE_ID } from './modules/project/projectModule';
import { getHashRoute, onHashRouteChange, setHashRoute } from './lib/hashRouter';
import {
  DefaultFileNameMismatchError,
  resolveDefaultPageFileHandle,
  type DefaultPageFileKind,
} from './lib/defaultFileHandles';

const ProjectSheetPage = lazy(async () => {
  const { ProjectSheetPage } = await import('./modules/project');
  return { default: ProjectSheetPage };
});

const KNOWLEDGE_BASE_PAGE_ID = 'knowledge-base';

const APP_NAV_ITEMS = [
  {
    page: KNOWLEDGE_BASE_PAGE_ID,
    labelZh: '知识图谱',
    labelEn: 'Knowledge Graph',
    icon: BookOpen,
  },
  PROJECT_NAV_ITEM,
];

type Page = (typeof APP_NAV_ITEMS)[number]['page'];

interface DroppedFilePayload {
  file: File;
  id: number;
}

interface PendingDroppedFile extends DroppedFilePayload {
  kind: 'project' | 'workspace';
}

interface PendingDefaultFileHandle {
  handle: FileSystemFileHandle;
  id: number;
  kind: 'project' | 'workspace';
}

type SaveCurrentPage = () => Promise<boolean>;

interface PageContentProps {
  pendingDefaultFileHandle: PendingDefaultFileHandle | null;
  page: Page;
  pendingDroppedFile: PendingDroppedFile | null;
  onDefaultFileHandleHandled: (id: number) => void;
  onDroppedFileHandled: (id: number) => void;
  onPageDirtyChange: (page: Page, dirty: boolean) => void;
  onPageSaveChange: (page: Page, saveCurrentPage: SaveCurrentPage | null) => void;
}

interface AppLoadingFallbackProps {
  locale: Locale;
}

function getDroppedFileKind(file: File): PendingDroppedFile['kind'] | null {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.graph')) {
    return 'workspace';
  }
  if (lowerName.endsWith('.project')) {
    return 'project';
  }
  return null;
}

function getFirstSupportedDroppedFile(files: File[]): PendingDroppedFile | null {
  for (const file of files) {
    const kind = getDroppedFileKind(file);
    if (kind) {
      return {
        file,
        kind,
        id: Date.now(),
      };
    }
  }
  return null;
}

function PageContent({
  pendingDefaultFileHandle,
  page,
  pendingDroppedFile,
  onDefaultFileHandleHandled,
  onDroppedFileHandled,
  onPageDirtyChange,
  onPageSaveChange,
}: PageContentProps) {
  const handleProjectSaveChange = useCallback(
    (saveCurrentPage: SaveCurrentPage | null) => onPageSaveChange(PROJECT_PAGE_ID, saveCurrentPage),
    [onPageSaveChange]
  );
  const handleWorkspaceSaveChange = useCallback(
    (saveCurrentPage: SaveCurrentPage | null) =>
      onPageSaveChange(KNOWLEDGE_BASE_PAGE_ID, saveCurrentPage),
    [onPageSaveChange]
  );

  switch (page) {
    case PROJECT_PAGE_ID:
      return (
        <ProjectSheetPage
          defaultProjectFileHandle={
            pendingDefaultFileHandle?.kind === 'project' ? pendingDefaultFileHandle : null
          }
          droppedProjectFile={pendingDroppedFile?.kind === 'project' ? pendingDroppedFile : null}
          onDefaultProjectFileHandleHandled={onDefaultFileHandleHandled}
          onDroppedProjectFileHandled={onDroppedFileHandled}
          onDirtyChange={(dirty) => onPageDirtyChange(PROJECT_PAGE_ID, dirty)}
          onSaveCurrentPageChange={handleProjectSaveChange}
        />
      );
    default:
      return (
        <KnowledgeBase
          defaultWorkspaceFileHandle={
            pendingDefaultFileHandle?.kind === 'workspace' ? pendingDefaultFileHandle : null
          }
          droppedWorkspaceFile={
            pendingDroppedFile?.kind === 'workspace' ? pendingDroppedFile : null
          }
          onDefaultWorkspaceFileHandleHandled={onDefaultFileHandleHandled}
          onDroppedWorkspaceFileHandled={onDroppedFileHandled}
          onDirtyChange={(dirty) => onPageDirtyChange(KNOWLEDGE_BASE_PAGE_ID, dirty)}
          onSaveCurrentPageChange={handleWorkspaceSaveChange}
        />
      );
  }
}

function AppLoadingFallback({ locale }: AppLoadingFallbackProps) {
  return (
    <div className="app-loading-fallback" role="status">
      {locale === 'zh-CN' ? '正在加载...' : 'Loading...'}
    </div>
  );
}

export function App() {
  const [page, setPage] = useState<Page>(() => getHashRoute() as Page);
  const [locale, setLocale] = useState<Locale>(getStoredLocale);
  const [pendingDefaultFileHandle, setPendingDefaultFileHandle] =
    useState<PendingDefaultFileHandle | null>(null);
  const [pendingDroppedFile, setPendingDroppedFile] = useState<PendingDroppedFile | null>(null);
  const pageRef = useRef(page);
  const pageDirtyRef = useRef<Record<string, boolean>>({});
  const pageSaveRef = useRef<Record<string, SaveCurrentPage | null>>({});
  const suppressNextHashChangeRef = useRef(false);

  const applyPage = useCallback((nextPage: Page) => {
    pageRef.current = nextPage;
    setPage(nextPage);
  }, []);

  const updatePageDirty = useCallback((targetPage: Page, dirty: boolean) => {
    pageDirtyRef.current = {
      ...pageDirtyRef.current,
      [targetPage]: dirty,
    };
  }, []);

  const updatePageSave = useCallback(
    (targetPage: Page, saveCurrentPage: SaveCurrentPage | null) => {
      pageSaveRef.current = {
        ...pageSaveRef.current,
        [targetPage]: saveCurrentPage,
      };
    },
    []
  );

  const saveCurrentPageBeforeLeave = useCallback(
    async (currentPage: Page) => {
      if (!pageDirtyRef.current[currentPage]) {
        return true;
      }

      const saveCurrentPage = pageSaveRef.current[currentPage];
      const saved = saveCurrentPage ? await saveCurrentPage() : false;
      if (saved) {
        updatePageDirty(currentPage, false);
        return true;
      }

      window.alert(
        locale === 'zh-CN'
          ? '自动保存失败，已留在当前页面。请先手动保存后再切换。'
          : 'Auto-save failed, so this page stayed open. Please save manually before switching.'
      );
      return false;
    },
    [locale, updatePageDirty]
  );

  const getDefaultFileKindForPage = useCallback((targetPage: Page): DefaultPageFileKind => {
    return targetPage === PROJECT_PAGE_ID ? 'project' : 'workspace';
  }, []);

  const prepareDefaultFileHandle = useCallback(
    async (targetPage: Page, allowPicker: boolean) => {
      try {
        const kind = getDefaultFileKindForPage(targetPage);
        const handle = await resolveDefaultPageFileHandle(kind, { allowPicker });
        return handle ? { handle, id: Date.now(), kind } : null;
      } catch (error) {
        if (error instanceof DefaultFileNameMismatchError) {
          window.alert(
            locale === 'zh-CN'
              ? `请选择 ${error.expectedFileName}。当前选择的是 ${error.actualFileName}。`
              : `Please choose ${error.expectedFileName}. You selected ${error.actualFileName}.`
          );
        } else {
          window.alert(
            locale === 'zh-CN' ? '自动打开默认文件失败。' : 'Failed to open default file.'
          );
        }
        return null;
      }
    },
    [getDefaultFileKindForPage, locale]
  );

  const navigateToPage = useCallback(
    async (
      targetPage: Page,
      options: { allowPicker: boolean; updateHash: boolean; revertHashOnCancel?: boolean }
    ) => {
      const currentPage = pageRef.current;
      if (targetPage === currentPage) {
        return;
      }

      if (!(await saveCurrentPageBeforeLeave(currentPage))) {
        if (options.revertHashOnCancel) {
          suppressNextHashChangeRef.current = true;
          setHashRoute(currentPage);
        }
        return;
      }

      updatePageDirty(currentPage, false);
      const defaultFileHandle = await prepareDefaultFileHandle(targetPage, options.allowPicker);
      setPendingDefaultFileHandle(defaultFileHandle);
      setPendingDroppedFile(null);
      applyPage(targetPage);

      if (options.updateHash) {
        setHashRoute(targetPage);
      }
    },
    [applyPage, prepareDefaultFileHandle, saveCurrentPageBeforeLeave, updatePageDirty]
  );

  useEffect(() => {
    return onHashRouteChange((newPage) => {
      if (suppressNextHashChangeRef.current) {
        suppressNextHashChangeRef.current = false;
        return;
      }

      void navigateToPage(newPage as Page, {
        allowPicker: false,
        updateHash: false,
        revertHashOnCancel: true,
      });
    });
  }, [navigateToPage]);

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.items.length) {
        return;
      }
      if (Array.from(event.dataTransfer.items).some((item) => item.kind === 'file')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (event: DragEvent) => {
      const droppedFile = getFirstSupportedDroppedFile(Array.from(event.dataTransfer?.files ?? []));
      if (!droppedFile) {
        return;
      }

      event.preventDefault();
      const targetPage = droppedFile.kind === 'project' ? PROJECT_PAGE_ID : KNOWLEDGE_BASE_PAGE_ID;
      if (targetPage !== pageRef.current && !(await saveCurrentPageBeforeLeave(pageRef.current))) {
        return;
      }

      updatePageDirty(pageRef.current, false);
      setPendingDroppedFile(droppedFile);
      setPendingDefaultFileHandle(null);
      applyPage(targetPage);
      setHashRoute(targetPage);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [applyPage, saveCurrentPageBeforeLeave, updatePageDirty]);

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <AppShell
        currentPage={page}
        navItems={APP_NAV_ITEMS}
        onNavigate={(targetPage) => {
          void navigateToPage(targetPage as Page, { allowPicker: true, updateHash: true });
        }}
      >
        <Suspense fallback={<AppLoadingFallback locale={locale} />}>
          <PageContent
            pendingDefaultFileHandle={pendingDefaultFileHandle}
            page={page}
            pendingDroppedFile={pendingDroppedFile}
            onDefaultFileHandleHandled={(id) => {
              setPendingDefaultFileHandle((currentFile) =>
                currentFile?.id === id ? null : currentFile
              );
            }}
            onDroppedFileHandled={(id) => {
              setPendingDroppedFile((currentFile) => (currentFile?.id === id ? null : currentFile));
            }}
            onPageDirtyChange={updatePageDirty}
            onPageSaveChange={updatePageSave}
          />
        </Suspense>
      </AppShell>
    </I18nProvider>
  );
}
