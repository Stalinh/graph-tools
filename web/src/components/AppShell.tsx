import { Moon, PanelLeftClose, PanelLeftOpen, Sun, type LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { LOCALE_STORAGE_KEY, useI18n } from '../i18n';

export interface AppShellNavItem<PageId extends string = string> {
  page: PageId;
  labelZh: string;
  labelEn: string;
  icon: LucideIcon;
}

interface AppShellProps {
  children: ReactNode;
  currentPage: string;
  navItems: AppShellNavItem[];
  onNavigate: (page: string) => void;
}

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'local-kg-theme';

function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function AppShell({ children, currentPage, navItems, onNavigate }: AppShellProps) {
  const { isZh, locale, setLocale } = useI18n();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const themeToggleLabel =
    theme === 'dark'
      ? isZh
        ? '切换到浅色主题'
        : 'Switch to light theme'
      : isZh
        ? '切换到深色主题'
        : 'Switch to dark theme';

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const updatedTheme = currentTheme === 'dark' ? 'light' : 'dark';

      try {
        localStorage.setItem(THEME_STORAGE_KEY, updatedTheme);
      } catch {
        // Keep the in-memory choice if storage is unavailable.
      }

      return updatedTheme;
    });
  };

  const navAriaLabel = isZh ? '主导航' : 'Primary navigation';
  const collapseLabel = isZh ? '收起导航' : 'Collapse navigation';
  const expandLabel = isZh ? '展开导航' : 'Expand navigation';
  const themeLabel = isZh ? '界面主题' : 'Theme';
  const themeHint = isZh ? '切换深色和浅色模式' : 'Switch dark and light mode';
  const themeSwitchText =
    theme === 'dark' ? (isZh ? '浅色模式' : 'Light mode') : isZh ? '深色模式' : 'Dark mode';
  const languageLabel = isZh ? '界面语言' : 'Interface language';
  const languageHint = isZh ? '统一切换全部界面文案' : 'Switch all interface copy';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className={`app-shell ${isNavCollapsed ? 'is-nav-collapsed' : ''}`} data-theme={theme}>
      <aside className="sidebar" aria-label={navAriaLabel}>
        <div className="sidebar__header">
          <div className="sidebar__title-group">
            <span className="sidebar__eyebrow">{isZh ? '工作区' : 'Workspace'}</span>
            <span className="sidebar__title">
              <span className="sidebar__title-text">{isZh ? '本地图谱' : 'Local KG'}</span>
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const label = isZh ? item.labelZh : item.labelEn;
            const isActive = currentPage === item.page;

            return (
              <button
                key={item.page}
                className={`nav-button ${isActive ? 'is-active' : ''}`}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.page)}
              >
                <Icon size={18} />
                <span className="nav-button__label">{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__theme">
            <div className="sidebar__footer-copy">
              <span className="sidebar__footer-label">{themeLabel}</span>
              <span className="sidebar__footer-hint">{themeHint}</span>
            </div>
            <button
              className="theme-switch"
              type="button"
              aria-label={themeToggleLabel}
              aria-pressed={theme === 'dark'}
              title={themeToggleLabel}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="theme-switch__text">{themeSwitchText}</span>
            </button>
          </div>
          <div className="sidebar__footer-copy">
            <span className="sidebar__footer-label">{languageLabel}</span>
            <span className="sidebar__footer-hint">{languageHint}</span>
          </div>
          <div className="locale-switch" role="group" aria-label={languageLabel}>
            <button
              type="button"
              className={`locale-switch__button${locale === 'zh-CN' ? ' is-active' : ''}`}
              aria-pressed={locale === 'zh-CN'}
              onClick={() => {
                setLocale('zh-CN');
                try {
                  localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN');
                } catch {
                  // Keep the in-memory locale if storage is unavailable.
                }
              }}
            >
              中文
            </button>
            <button
              type="button"
              className={`locale-switch__button${locale === 'en-US' ? ' is-active' : ''}`}
              aria-pressed={locale === 'en-US'}
              onClick={() => {
                setLocale('en-US');
                try {
                  localStorage.setItem(LOCALE_STORAGE_KEY, 'en-US');
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
      <main className="workspace">{children}</main>
    </div>
  );
}
