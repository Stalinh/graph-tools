import { Suspense, lazy, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { getStoredLocale, I18nProvider, type Locale } from "./i18n";
import { PROJECT_NAV_ITEM, PROJECT_PAGE_ID } from "./modules/project/projectModule";

const ProjectSheetPage = lazy(async () => {
  const { ProjectSheetPage } = await import("./modules/project");
  return { default: ProjectSheetPage };
});

const KNOWLEDGE_BASE_PAGE_ID = "knowledge-base";

const APP_NAV_ITEMS = [
  {
    page: KNOWLEDGE_BASE_PAGE_ID,
    labelZh: "知识图谱",
    labelEn: "Knowledge Graph",
    icon: BookOpen,
  },
  PROJECT_NAV_ITEM,
];

type Page = (typeof APP_NAV_ITEMS)[number]["page"];

interface DroppedFilePayload {
  file: File;
  id: number;
}

interface PendingDroppedFile extends DroppedFilePayload {
  kind: "project" | "workspace";
}

interface PageContentProps {
  page: Page;
  pendingDroppedFile: PendingDroppedFile | null;
  onDroppedFileHandled: (id: number) => void;
}

interface AppLoadingFallbackProps {
  locale: Locale;
}

function getDroppedFileKind(file: File): PendingDroppedFile["kind"] | null {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".graph")) {
    return "workspace";
  }
  if (lowerName.endsWith(".project")) {
    return "project";
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

function PageContent({ page, pendingDroppedFile, onDroppedFileHandled }: PageContentProps) {
  switch (page) {
    case PROJECT_PAGE_ID:
      return (
        <ProjectSheetPage
          droppedProjectFile={
            pendingDroppedFile?.kind === "project" ? pendingDroppedFile : null
          }
          onDroppedProjectFileHandled={onDroppedFileHandled}
        />
      );
    default:
      return (
        <KnowledgeBase
          droppedWorkspaceFile={
            pendingDroppedFile?.kind === "workspace" ? pendingDroppedFile : null
          }
          onDroppedWorkspaceFileHandled={onDroppedFileHandled}
        />
      );
  }
}

function AppLoadingFallback({ locale }: AppLoadingFallbackProps) {
  return (
    <div className="app-loading-fallback" role="status">
      {locale === "zh-CN" ? "正在加载..." : "Loading..."}
    </div>
  );
}

export function App() {
  const [page, setPage] = useState<Page>("knowledge-base");
  const [locale, setLocale] = useState<Locale>(getStoredLocale);
  const [pendingDroppedFile, setPendingDroppedFile] = useState<PendingDroppedFile | null>(null);

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.items.length) {
        return;
      }
      if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (event: DragEvent) => {
      const droppedFile = getFirstSupportedDroppedFile(
        Array.from(event.dataTransfer?.files ?? [])
      );
      if (!droppedFile) {
        return;
      }

      event.preventDefault();
      setPendingDroppedFile(droppedFile);
      setPage(droppedFile.kind === "project" ? PROJECT_PAGE_ID : KNOWLEDGE_BASE_PAGE_ID);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <AppShell currentPage={page} navItems={APP_NAV_ITEMS} onNavigate={setPage}>
        <Suspense fallback={<AppLoadingFallback locale={locale} />}>
          <PageContent
            page={page}
            pendingDroppedFile={pendingDroppedFile}
            onDroppedFileHandled={(id) => {
              setPendingDroppedFile((currentFile) =>
                currentFile?.id === id ? null : currentFile
              );
            }}
          />
        </Suspense>
      </AppShell>
    </I18nProvider>
  );
}
