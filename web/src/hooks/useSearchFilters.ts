import { useCallback, useMemo, useState } from 'react';

export const FILTER_COLORS = [
  { key: '', label: 'Default' },
  { key: 'amber', label: 'Amber' },
  { key: 'rose', label: 'Rose' },
  { key: 'green', label: 'Green' },
  { key: 'blue', label: 'Blue' },
  { key: 'purple', label: 'Purple' },
  { key: 'orange', label: 'Orange' },
  { key: 'teal', label: 'Teal' },
  { key: 'pink', label: 'Pink' },
  { key: 'indigo', label: 'Indigo' },
  { key: 'lime', label: 'Lime' },
  { key: 'lavender', label: 'Lavender' },
  { key: 'brown', label: 'Brown' },
  { key: 'slate', label: 'Slate' },
] as const;

export interface SearchFilters {
  selectedTags: string[];
  selectedColors: string[];
}

export function useSearchFilters() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const toggleColor = useCallback((color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setSelectedColors([]);
  }, []);

  const hasAnyFilter = selectedTags.length > 0 || selectedColors.length > 0;

  const filters: SearchFilters = useMemo(
    () => ({ selectedTags, selectedColors }),
    [selectedTags, selectedColors]
  );

  return {
    selectedTags,
    selectedColors,
    toggleTag,
    toggleColor,
    clearFilters,
    hasAnyFilter,
    filters,
  };
}
