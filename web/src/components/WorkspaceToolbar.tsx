import { FilePlus, FolderOpen, RotateCcw, RotateCw, Save, SaveAll, Search, X } from "lucide-react";
import type { RefObject } from "react";
import { useI18n } from "../i18n";
import type { GraphNode, WorkspaceNodeFilter } from "../types";
import { FilterChips } from "./FilterChips";
import { SearchResultsDropdown } from "./SearchResultsDropdown";

interface WorkspaceToolbarProps {
  nodeCount: number;
  edgeCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  availableTags: string[];
  selectedTags: string[];
  selectedColors: string[];
  hasAnyFilter: boolean;
  onToggleTag: (tag: string) => void;
  onToggleColor: (color: string) => void;
  onClearFilters: () => void;
  nodeFilter: WorkspaceNodeFilter;
  onNodeFilterChange: (filter: WorkspaceNodeFilter) => void;
  showResults: boolean;
  matchingNodes: GraphNode[];
  onResultNavigate: (nodeId: string) => void;
}

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

function isMacPlatform() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as NavigatorWithUserAgentData;
  const platform = nav.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  return /Mac|iPod|iPhone|iPad/i.test(platform);
}

export function WorkspaceToolbar({
  nodeCount,
  edgeCount,
  searchQuery,
  onSearchChange,
  searchInputRef,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  availableTags,
  selectedTags,
  selectedColors,
  hasAnyFilter,
  onToggleTag,
  onToggleColor,
  onClearFilters,
  nodeFilter,
  onNodeFilterChange,
  showResults,
  matchingNodes,
  onResultNavigate,
}: WorkspaceToolbarProps) {
  const { isZh } = useI18n();
  const isMac = isMacPlatform();
  const searchPlaceholder = `${isZh ? "搜索节点" : "Search nodes"}... (${isMac ? "⌘K" : "Ctrl+K"})`;

  return (
    <div className="workspace-toolbar">
      <div className="workspace-toolbar__meta">
        <p className="workspace-toolbar__counts">
          {isZh
            ? `${nodeCount} 个节点 · ${edgeCount} 条连线`
            : `${nodeCount} nodes · ${edgeCount} edges`}
        </p>
      </div>
      <div className="toolbar-divider" />
      <FilterChips
        availableTags={availableTags}
        selectedTags={selectedTags}
        selectedColors={selectedColors}
        nodeFilter={nodeFilter}
        hasAnyFilter={hasAnyFilter}
        onToggleTag={onToggleTag}
        onToggleColor={onToggleColor}
        onNodeFilterChange={onNodeFilterChange}
        onClearFilters={onClearFilters}
      />
      <div className="toolbar-divider" />
      <div className="workspace-toolbar__search">
        <Search size={14} className="workspace-toolbar__search-icon" />
        <input
          ref={searchInputRef}
          className="workspace-toolbar__search-input"
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery ? (
          <button
            className="workspace-toolbar__search-clear"
            type="button"
            aria-label={isZh ? "清除搜索" : "Clear search"}
            onClick={() => {
              onSearchChange("");
              searchInputRef.current?.focus();
            }}
          >
            <X size={14} />
          </button>
        ) : null}
        {showResults ? (
          <SearchResultsDropdown
            matchingNodes={matchingNodes}
            searchQuery={searchQuery}
            onNavigate={onResultNavigate}
          />
        ) : null}
      </div>
      <div className="toolbar-divider" />
      <div className="workspace-toolbar__actions" aria-label={isZh ? "文件操作" : "File actions"}>
        <button
          className="toolbar-button workspace-toolbar__icon-button"
          type="button"
          aria-label={isZh ? "新建空白画布" : "Create new canvas"}
          title={isZh ? "新建空白画布" : "Create new canvas"}
          onClick={() => onNew()}
        >
          <FilePlus size={14} />
        </button>
        <button
          className="toolbar-button workspace-toolbar__icon-button"
          type="button"
          aria-label={isZh ? "打开 Graph 文件" : "Open .graph file"}
          title={isZh ? "打开 Graph 文件" : "Open .graph file"}
          onClick={() => void onOpen()}
        >
          <FolderOpen size={14} />
        </button>
        <button
          className="toolbar-button workspace-toolbar__icon-button"
          type="button"
          aria-label={isZh ? "保存到当前文件" : "Save to current file"}
          title={isZh ? "保存到当前文件" : "Save to current file"}
          onClick={() => void onSave()}
        >
          <Save size={14} />
        </button>
        <button
          className="toolbar-button workspace-toolbar__icon-button"
          type="button"
          aria-label={isZh ? "另存为新文件" : "Save as new file"}
          title={isZh ? "另存为新文件" : "Save as new file"}
          onClick={() => void onSaveAs()}
        >
          <SaveAll size={14} />
        </button>
      </div>
      <div className="toolbar-divider" />
      <div
        className="workspace-toolbar__actions"
        aria-label={isZh ? "历史操作" : "History actions"}
      >
        <button
          className="toolbar-button workspace-toolbar__icon-button"
          type="button"
          aria-label={isZh ? "撤销" : "Undo"}
          title={isZh ? "撤销" : "Undo"}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <RotateCcw size={14} />
        </button>
        <button
          className="toolbar-button workspace-toolbar__icon-button"
          type="button"
          aria-label={isZh ? "重做" : "Redo"}
          title={isZh ? "重做" : "Redo"}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <RotateCw size={14} />
        </button>
      </div>
    </div>
  );
}
