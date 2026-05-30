import { BookOpen, PanelLeftClose, PanelLeftOpen, Pencil } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { LOCALE_STORAGE_KEY, useI18n } from "../i18n";

interface AppShellProps {
  children: (themeProps: {
    theme: Theme;
    themeToggleLabel: string;
    onToggleTheme: () => void;
  }) => ReactNode;
  currentPage: "knowledge-base" | "sketch-test";
  onNavigate: (page: "knowledge-base" | "sketch-test") => void;
}

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "local-kg-theme";

function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function AppShell({ children, currentPage, onNavigate }: AppShellProps) {
  const { isZh, locale, setLocale } = useI18n();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const themeToggleLabel =
    theme === "dark"
      ? isZh
        ? "切换到浅色主题"
        : "Switch to light theme"
      : isZh
        ? "切换到深色主题"
        : "Switch to dark theme";

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const updatedTheme = currentTheme === "dark" ? "light" : "dark";

      try {
        localStorage.setItem(THEME_STORAGE_KEY, updatedTheme);
      } catch {
        // Keep the in-memory choice if storage is unavailable.
      }

      return updatedTheme;
    });
  };

  const navAriaLabel = isZh ? "主导航" : "Primary navigation";
  const collapseLabel = isZh ? "收起导航" : "Collapse navigation";
  const expandLabel = isZh ? "展开导航" : "Expand navigation";
  const graphLabel = isZh ? "知识图谱" : "Knowledge Graph";
  const sketchLabel = isZh ? "草图实验" : "Sketch Lab";
  const languageLabel = isZh ? "界面语言" : "Interface language";
  const languageHint = isZh ? "统一切换全部界面文案" : "Switch all interface copy";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className={`app-shell ${isNavCollapsed ? "is-nav-collapsed" : ""}`} data-theme={theme}>
      <aside className="sidebar" aria-label={navAriaLabel}>
        <div className="sidebar__header">
          <div className="sidebar__title-group">
            <span className="sidebar__eyebrow">{isZh ? "工作区" : "Workspace"}</span>
            <span className="sidebar__title">
              <span className="sidebar__title-text">{isZh ? "本地图谱" : "Local KG"}</span>
            </span>
          </div>
          <div className="sidebar__actions">
            <button
              className="icon-button"
              type="button"
              aria-label={isNavCollapsed ? expandLabel : collapseLabel}
              title={isNavCollapsed ? expandLabel : collapseLabel}
              onClick={() => setIsNavCollapsed((current) => !current)}
            >
              {isNavCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
        <nav className="sidebar__nav">
          <button
            className={`nav-button ${currentPage === "knowledge-base" ? "is-active" : ""}`}
            type="button"
            aria-current={currentPage === "knowledge-base" ? "page" : undefined}
            onClick={() => onNavigate("knowledge-base")}
          >
            <BookOpen size={18} />
            <span className="nav-button__label">{graphLabel}</span>
          </button>
          <button
            className={`nav-button ${currentPage === "sketch-test" ? "is-active" : ""}`}
            type="button"
            aria-current={currentPage === "sketch-test" ? "page" : undefined}
            onClick={() => onNavigate("sketch-test")}
          >
            <Pencil size={18} />
            <span className="nav-button__label">{sketchLabel}</span>
          </button>
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__footer-copy">
            <span className="sidebar__footer-label">{languageLabel}</span>
            <span className="sidebar__footer-hint">{languageHint}</span>
          </div>
          <div className="locale-switch" role="group" aria-label={languageLabel}>
            <button
              type="button"
              className={`locale-switch__button${locale === "zh-CN" ? " is-active" : ""}`}
              aria-pressed={locale === "zh-CN"}
              onClick={() => {
                setLocale("zh-CN");
                try {
                  localStorage.setItem(LOCALE_STORAGE_KEY, "zh-CN");
                } catch {
                  // Keep the in-memory locale if storage is unavailable.
                }
              }}
            >
              中文
            </button>
            <button
              type="button"
              className={`locale-switch__button${locale === "en-US" ? " is-active" : ""}`}
              aria-pressed={locale === "en-US"}
              onClick={() => {
                setLocale("en-US");
                try {
                  localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
                } catch {
                  // Keep the in-memory locale if storage is unavailable.
                }
              }}
            >
              EN
            </button>
          </div>
        </div>
      </aside>
      <main className="workspace">
        {children({
          theme,
          themeToggleLabel,
          onToggleTheme: toggleTheme,
        })}
      </main>
    </div>
  );
}
