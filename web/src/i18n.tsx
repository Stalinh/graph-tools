import { createContext, useContext } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type Locale = "zh-CN" | "en-US";

export const LOCALE_STORAGE_KEY = "local-kg-locale";

interface I18nContextValue {
  isZh: boolean;
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh-CN",
  setLocale: () => {
    // no-op fallback for isolated renders in tests
  },
  isZh: true,
});

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "en-US" ? "en-US" : "zh-CN";
  } catch {
    return "zh-CN";
  }
}

export function I18nProvider({
  children,
  locale,
  setLocale,
}: {
  children: ReactNode;
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
}) {
  return (
    <I18nContext.Provider value={{ locale, setLocale, isZh: locale === "zh-CN" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function getColorLabel(color: string, locale: Locale) {
  const isZh = locale === "zh-CN";
  const labels: Record<string, string> = {
    "": isZh ? "默认" : "Default",
    amber: isZh ? "琥珀" : "Amber",
    rose: isZh ? "玫瑰" : "Rose",
    green: isZh ? "绿色" : "Green",
    blue: isZh ? "蓝色" : "Blue",
    purple: isZh ? "紫色" : "Purple",
    teal: isZh ? "青色" : "Teal",
  };

  return labels[color] ?? color;
}

export function getNodeTypeLabel(type: "card" | "image" | "group", locale: Locale) {
  const isZh = locale === "zh-CN";
  if (type === "image") {
    return isZh ? "图片" : "Image";
  }
  if (type === "group") {
    return isZh ? "分组" : "Group";
  }
  return isZh ? "卡片" : "Card";
}

export function getDefaultCardTitle(locale: Locale) {
  return locale === "zh-CN" ? "未命名卡片" : "Untitled card";
}

export function getDefaultImageTitle(locale: Locale) {
  return locale === "zh-CN" ? "未命名图片" : "Untitled image";
}

export function getDefaultGroupTitle(locale: Locale) {
  return locale === "zh-CN" ? "未命名分组" : "Untitled group";
}
