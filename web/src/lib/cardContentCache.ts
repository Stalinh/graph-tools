import type { ReactNode } from "react";
import type { Locale } from "../i18n";

interface CacheEntry {
  contentHtml: string;
  locale: Locale;
  referencesKey: string;
  elements: ReactNode;
}

const MAX_CONTENT_CACHE_ENTRIES = 200;
const contentCache = new Map<string, CacheEntry>();

export function getContentCacheEntry(nodeId: string) {
  return contentCache.get(nodeId);
}

export function rememberContentCacheEntry(nodeId: string, entry: CacheEntry) {
  contentCache.delete(nodeId);
  contentCache.set(nodeId, entry);

  while (contentCache.size > MAX_CONTENT_CACHE_ENTRIES) {
    const oldestKey = contentCache.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    contentCache.delete(oldestKey);
  }
}

export function clearContentCache() {
  contentCache.clear();
}

export function deleteContentCacheEntry(nodeId: string) {
  contentCache.delete(nodeId);
}
