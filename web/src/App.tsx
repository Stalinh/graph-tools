import { Suspense, lazy, useState } from "react";
import { AppShell } from "./components/AppShell";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { getStoredLocale, I18nProvider, type Locale } from "./i18n";

interface AppShellThemeProps {
  theme: "light" | "dark";
  themeToggleLabel: string;
  onToggleTheme: () => void;
}

const SketchTestPage = lazy(async () => {
  const { SketchTestPage } = await import("./components/SketchTestPage");
  return { default: SketchTestPage };
});

type Page = "knowledge-base" | "sketch-test";

function PageContent({
  page,
  theme,
  themeToggleLabel,
  onToggleTheme,
}: {
  page: Page;
} & AppShellThemeProps) {
  switch (page) {
    case "sketch-test":
      return <SketchTestPage />;
    default:
      return (
        <KnowledgeBase
          theme={theme}
          themeToggleLabel={themeToggleLabel}
          onToggleTheme={onToggleTheme}
        />
      );
  }
}

function AppLoadingFallback({ locale }: { locale: Locale }) {
  return (
    <div className="app-loading-fallback" role="status">
      {locale === "zh-CN" ? "正在加载..." : "Loading..."}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("knowledge-base");
  const [locale, setLocale] = useState<Locale>(getStoredLocale);

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <AppShell currentPage={page} onNavigate={setPage}>
        {({ theme, themeToggleLabel, onToggleTheme }: AppShellThemeProps) => (
          <Suspense fallback={<AppLoadingFallback locale={locale} />}>
            <PageContent
              page={page}
              theme={theme}
              themeToggleLabel={themeToggleLabel}
              onToggleTheme={onToggleTheme}
            />
          </Suspense>
        )}
      </AppShell>
    </I18nProvider>
  );
}
