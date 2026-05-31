import { Suspense, lazy, useState } from "react";
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

interface PageContentProps {
  page: Page;
}

interface AppLoadingFallbackProps {
  locale: Locale;
}

function PageContent({ page }: PageContentProps) {
  switch (page) {
    case PROJECT_PAGE_ID:
      return <ProjectSheetPage />;
    default:
      return (
        <KnowledgeBase />
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

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <AppShell currentPage={page} navItems={APP_NAV_ITEMS} onNavigate={setPage}>
        <Suspense fallback={<AppLoadingFallback locale={locale} />}>
          <PageContent page={page} />
        </Suspense>
      </AppShell>
    </I18nProvider>
  );
}
