import { useEffect, useRef, useState } from 'react';

export function useGraphSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    searchInputRef,
  };
}
