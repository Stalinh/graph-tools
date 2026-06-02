import { FileText, Image } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { smartMatches } from "../lib/searchUtils";
import type { GraphNode } from "../types";

interface SearchResultsDropdownProps {
  matchingNodes: GraphNode[];
  searchQuery: string;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

export function SearchResultsDropdown({
  matchingNodes,
  searchQuery,
  onClose,
  onNavigate,
}: SearchResultsDropdownProps) {
  const { isZh } = useI18n();
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightIndex(0);
  }, [matchingNodes]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-result-index="${highlightIndex}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
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

      if (event.key === "ArrowDown") {
        if (matchingNodes.length === 0) return;
        event.preventDefault();
        setHighlightIndex((prev) => (prev < matchingNodes.length - 1 ? prev + 1 : 0));
      } else if (event.key === "ArrowUp") {
        if (matchingNodes.length === 0) return;
        event.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : matchingNodes.length - 1));
      } else if (event.key === "Enter") {
        if (!matchingNodes[highlightIndex]) return;
        event.preventDefault();
        onNavigate(matchingNodes[highlightIndex].id);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [matchingNodes, highlightIndex, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!searchQuery.trim()) return null;

  return (
    <div className="search-results-dropdown" ref={listRef}>
      <div className="search-results-dropdown__header">
        {isZh
          ? `找到 ${matchingNodes.length} 个匹配结果`
          : `${matchingNodes.length} matching result${matchingNodes.length === 1 ? "" : "s"}`}
      </div>
      {matchingNodes.length === 0 ? (
        <div className="search-results-dropdown__empty">
          {isZh ? "没有找到匹配的节点" : "No matching nodes found"}
        </div>
      ) : (
        <div className="search-results-dropdown__list">
          {matchingNodes.map((node, index) => {
            const matches = smartMatches(node, searchQuery);
            const titleMatch = matches.find((m) => m.field === "title");
            const contentMatch = matches.find((m) => m.field === "content");
            const preview = contentMatch?.preview ?? titleMatch?.preview ?? "";

            return (
              <button
                key={node.id}
                type="button"
                className={`search-result${index === highlightIndex ? " is-highlighted" : ""}`}
                data-result-index={index}
                onClick={() => onNavigate(node.id)}
                onFocus={() => setHighlightIndex(index)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <span className="search-result__type-icon">
                  {node.type === "image" ? <Image size={14} /> : <FileText size={14} />}
                </span>
                <span className="search-result__body">
                  <span
                    className="search-result__title"
                    dangerouslySetInnerHTML={{
                      __html: highlightTitleText(node.title, searchQuery),
                    }}
                  />
                  {preview ? (
                    <span
                      className="search-result__preview"
                      dangerouslySetInnerHTML={{
                        __html: highlightPreviewText(preview, searchQuery),
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
        <kbd>↑↓</kbd> {isZh ? "导航" : "Navigate"} <kbd>Enter</kbd> {isZh ? "跳转" : "Open"}{" "}
        <kbd>Esc</kbd> {isZh ? "关闭" : "Close"}
      </div>
    </div>
  );
}

function getSearchInput(dropdown: HTMLDivElement): HTMLInputElement | null {
  return (
    dropdown
      .closest(".workspace-toolbar__search")
      ?.querySelector<HTMLInputElement>(".workspace-toolbar__search-input") ?? null
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

function highlightTitleText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return escapeHtml(text);

  return (
    escapeHtml(text.slice(0, idx)) +
    `<mark>${escapeHtml(text.slice(idx, idx + query.length))}</mark>` +
    escapeHtml(text.slice(idx + query.length))
  );
}

function highlightPreviewText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  return highlightAllMatches(text, query);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightAllMatches(text: string, query: string): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return escapeHtml(text);

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();
  let result = "";
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, cursor);
    if (matchIndex === -1) {
      result += escapeHtml(text.slice(cursor));
      break;
    }

    result += escapeHtml(text.slice(cursor, matchIndex));
    result += `<mark>${escapeHtml(text.slice(matchIndex, matchIndex + trimmedQuery.length))}</mark>`;
    cursor = matchIndex + trimmedQuery.length;
  }

  return result;
}
