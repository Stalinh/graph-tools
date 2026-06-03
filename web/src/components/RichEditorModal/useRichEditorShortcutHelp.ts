import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHORTCUT_ITEMS, getShortcutCategories, getShortcutDescription } from './richEditorConfig';

export function useRichEditorShortcutHelp(isZh: boolean) {
  const shortcutCategories = useMemo(() => getShortcutCategories(isZh), [isZh]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const isHelpOpenRef = useRef(false);

  useEffect(() => {
    isHelpOpenRef.current = isHelpOpen;
  }, [isHelpOpen]);

  const filteredShortcuts = useMemo(() => {
    const q = helpSearch.trim().toLowerCase();
    if (!q) return SHORTCUT_ITEMS;
    return SHORTCUT_ITEMS.filter((item) => {
      const localizedDescription = getShortcutDescription(item.id, isZh).toLowerCase();
      return (
        localizedDescription.includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q)) ||
        shortcutCategories[item.category].toLowerCase().includes(q)
      );
    });
  }, [helpSearch, isZh, shortcutCategories]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
    setHelpSearch('');
  }, []);

  const openHelp = useCallback(() => {
    setIsHelpOpen(true);
    setHelpSearch('');
  }, []);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((current) => !current);
    setHelpSearch('');
  }, []);

  return {
    closeHelp,
    filteredShortcuts,
    helpSearch,
    isHelpOpen,
    isHelpOpenRef,
    openHelp,
    setHelpSearch,
    shortcutCategories,
    toggleHelp,
  };
}
