import { useEffect, type RefObject } from "react";

interface UseKeyboardShortcutsOptions {
  undo: () => void;
  redo: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setSearchQuery: (query: string) => void;
  onDeleteSelection: () => void;
}

export function useKeyboardShortcuts({
  undo,
  redo,
  searchInputRef,
  setSearchQuery,
  onDeleteSelection,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingTarget =
        activeElement !== null &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.getAttribute("contenteditable") === "true");

      const hasDialog = document.querySelector('[role="dialog"]') !== null;

      if (!isTypingTarget && !hasDialog && (e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
      if (
        !isTypingTarget &&
        !hasDialog &&
        (e.metaKey || e.ctrlKey) &&
        e.key === "z" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        undo();
      }
      if (
        !isTypingTarget &&
        !hasDialog &&
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key === "z"
      ) {
        e.preventDefault();
        redo();
      }
      if (!isTypingTarget && !hasDialog && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        onDeleteSelection();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, searchInputRef, setSearchQuery, onDeleteSelection]);
}
