import { FileText, Image } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { NodeSearchResult, SearchMatch } from '../lib/searchUtils';

interface SearchResultsDropdownProps {
  matchingResults: NodeSearchResult[];
  searchQuery: string;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

export function SearchResultsDropdown({
  matchingResults,
  searchQuery,
  onClose,
  onNavigate,
}: SearchResultsDropdownProps) {
  const { isZh } = useI18n();
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightIndex(0);
  }, [matchingResults]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-result-index="${highlightIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const dropdown = listRef.current;
      if (!isSearchResultsKeyboardTarget(event, dropdown)) {
        return;
      }

      if (event.key === 'ArrowDown') {
        if (matchingResults.length === 0) return;
        event.preventDefault();
        setHighlightIndex((prev) => (prev < matchingResults.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        if (matchingResults.length === 0) return;
        event.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : matchingResults.length - 1));
      } else if (event.key === 'Enter') {
        if (!matchingResults[highlightIndex]) return;
        event.preventDefault();
        onNavigate(matchingResults[highlightIndex].node.id);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [matchingResults, highlightIndex, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!searchQuery.trim()) return null;

  return (
    <div className="search-results-dropdown" ref={listRef}>
      <div className="search-results-dropdown__header">
        {isZh
          ? `找到 ${matchingResults.length} 个匹配结果`
          : `${matchingResults.length} matching result${matchingResults.length === 1 ? '' : 's'}`}
      </div>
      {matchingResults.length === 0 ? (
        <div className="search-results-dropdown__empty">
          {isZh ? '没有找到匹配的节点' : 'No matching nodes found'}
        </div>
      ) : (
        <div className="search-results-dropdown__list">
          {matchingResults.map(({ node, matches }, index) => {
            const titleMatch = matches.find((m) => m.field === 'title');
            const contentMatch = matches.find((m) => m.field === 'content');
            const previewMatch = contentMatch ?? titleMatch;
            const preview = previewMatch?.preview ?? '';

            return (
              <button
                key={node.id}
                type="button"
                className={`search-result${index === highlightIndex ? ' is-highlighted' : ''}`}
                data-result-index={index}
                onClick={() => onNavigate(node.id)}
                onFocus={() => setHighlightIndex(index)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <span className="search-result__type-icon">
                  {node.type === 'image' ? <Image size={14} /> : <FileText size={14} />}
                </span>
                <span className="search-result__body">
                  <span
                    className="search-result__title"
                    dangerouslySetInnerHTML={{
                      __html: highlightTitleText(node.title, titleMatch),
                    }}
                  />
                  {preview ? (
                    <span
                      className="search-result__preview"
                      dangerouslySetInnerHTML={{
                        __html: highlightPreviewText(preview, previewMatch),
                      }}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="search-results-dropdown__footer">
        <kbd>↑↓</kbd> {isZh ? '导航' : 'Navigate'} <kbd>Enter</kbd> {isZh ? '跳转' : 'Open'}{' '}
        <kbd>Esc</kbd> {isZh ? '关闭' : 'Close'}
      </div>
    </div>
  );
}

function getSearchInput(dropdown: HTMLDivElement): HTMLInputElement | null {
  return (
    dropdown
      .closest('.workspace-toolbar__search')
      ?.querySelector<HTMLInputElement>('.workspace-toolbar__search-input') ?? null
  );
}

function getEventTargetNode(event: KeyboardEvent): Node | null {
  return event.target instanceof Node ? event.target : null;
}

function getActiveElement(dropdown: HTMLDivElement): Element | null {
  const activeElement = dropdown.ownerDocument.activeElement;
  return activeElement instanceof Element ? activeElement : null;
}

function isDropdownKeyboardTarget(event: KeyboardEvent, dropdown: HTMLDivElement): boolean {
  const targetNode = getEventTargetNode(event);
  const activeElement = getActiveElement(dropdown);

  return Boolean(
    (targetNode && dropdown.contains(targetNode)) ||
    (activeElement && dropdown.contains(activeElement))
  );
}

function isSearchResultsKeyboardTarget(
  event: KeyboardEvent,
  dropdown: HTMLDivElement | null
): boolean {
  if (!dropdown) return false;

  const searchInput = getSearchInput(dropdown);
  const targetNode = getEventTargetNode(event);
  const activeElement = getActiveElement(dropdown);

  return Boolean(
    (searchInput && (targetNode === searchInput || activeElement === searchInput)) ||
    isDropdownKeyboardTarget(event, dropdown)
  );
}

function highlightTitleText(text: string, match: SearchMatch | undefined): string {
  return highlightRanges(text, match?.indices ?? []);
}

function highlightPreviewText(text: string, match: SearchMatch | undefined): string {
  return highlightRanges(text, match?.previewIndices ?? []);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightRanges(text: string, indices: [number, number][]): string {
  if (indices.length === 0) return escapeHtml(text);

  let result = '';
  let cursor = 0;

  for (const [start, end] of indices) {
    if (start < cursor || start >= text.length) continue;

    result += escapeHtml(text.slice(cursor, start));
    result += `<mark>${escapeHtml(text.slice(start, Math.min(end + 1, text.length)))}</mark>`;
    cursor = Math.min(end + 1, text.length);
  }

  result += escapeHtml(text.slice(cursor));
  return result;
}
