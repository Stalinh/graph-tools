import { Check, ChevronDown, FileText, Image, Lock, Tag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getColorLabel, useI18n } from "../i18n";
import { SUPPORTED_NODE_COLORS } from "../lib/nodeColors";
import type { WorkspaceNodeFilter } from "../types";

const FILTER_COLOR_KEYS = ["", ...SUPPORTED_NODE_COLORS];

interface FilterChipsProps {
  availableTags: string[];
  selectedTags: string[];
  selectedColors: string[];
  nodeFilter: WorkspaceNodeFilter;
  hasAnyFilter: boolean;
  onToggleTag: (tag: string) => void;
  onToggleColor: (color: string) => void;
  onNodeFilterChange: (filter: WorkspaceNodeFilter) => void;
  onClearFilters: () => void;
}

export function FilterChips({
  availableTags,
  selectedTags,
  selectedColors,
  nodeFilter,
  hasAnyFilter,
  onToggleTag,
  onToggleColor,
  onNodeFilterChange,
  onClearFilters,
}: FilterChipsProps) {
  const { isZh, locale } = useI18n();
  const selectedTagSet = new Set(selectedTags);
  const selectedColorSet = new Set(selectedColors);
  const [activeDropdown, setActiveDropdown] = useState<"type" | "tag" | "color" | null>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const typeDropdownOpen = activeDropdown === "type";
  const tagDropdownOpen = activeDropdown === "tag";
  const colorDropdownOpen = activeDropdown === "color";

  const typeOptions: { key: WorkspaceNodeFilter; label: string; icon: typeof FileText }[] = [
    { key: "all", label: isZh ? "全部" : "All", icon: FileText },
    { key: "card", label: isZh ? "卡片" : "Cards", icon: FileText },
    { key: "image", label: isZh ? "图片" : "Images", icon: Image },
    { key: "locked", label: isZh ? "已锁定" : "Locked", icon: Lock },
  ];

  const selectedTypeLabel =
    typeOptions.find((t) => t.key === nodeFilter)?.label ?? (isZh ? "全部" : "All");

  const colorButtonLabel =
    selectedColors.length > 0
      ? `${isZh ? "颜色" : "Colors"} (${selectedColors.length})`
      : isZh
        ? "颜色"
        : "Colors";

  const tagButtonLabel =
    selectedTags.length > 0
      ? `${isZh ? "标签" : "Tags"} (${selectedTags.length})`
      : isZh
        ? "标签"
        : "Tags";

  const selectedColorKey = selectedColors[0] ?? "";

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    const isOutsideType = !typeDropdownRef.current?.contains(target);
    const isOutsideTag = !tagDropdownRef.current?.contains(target);
    const isOutsideColor = !colorDropdownRef.current?.contains(target);

    if (isOutsideType && isOutsideTag && isOutsideColor) {
      setActiveDropdown(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleTypeSelect = (key: WorkspaceNodeFilter) => {
    onNodeFilterChange(key);
    setActiveDropdown(null);
  };

  return (
    <div className="filter-chips">
      <div className="filter-chip--dropdown" ref={typeDropdownRef}>
        <button
          type="button"
          className={`filter-chip filter-chip--type${nodeFilter !== "all" ? " is-active" : ""}`}
          title={`${isZh ? "类型" : "Type"}: ${selectedTypeLabel}`}
          onClick={() => {
            setActiveDropdown((prev) => (prev === "type" ? null : "type"));
          }}
        >
          {selectedTypeLabel}
          <ChevronDown size={10} className="filter-chip__chevron" />
        </button>

        {typeDropdownOpen ? (
          <div className="filter-dropdown">
            {typeOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`filter-dropdown__item${nodeFilter === key ? " is-active" : ""}`}
                onClick={() => handleTypeSelect(key)}
              >
                <Icon size={14} className="filter-dropdown__icon" />
                <span className="filter-dropdown__label">{label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="filter-chip--dropdown" ref={tagDropdownRef}>
        <button
          type="button"
          className={`filter-chip filter-chip--tag${selectedTags.length > 0 ? " is-active" : ""}`}
          title={
            selectedTags.length > 0
              ? `${isZh ? "已选标签" : "Selected tags"}: ${selectedTags.join(", ")}`
              : isZh
                ? "按标签筛选"
                : "Filter by tag"
          }
          onClick={() => {
            setActiveDropdown((prev) => (prev === "tag" ? null : "tag"));
          }}
        >
          <Tag size={12} />
          {tagButtonLabel}
          <ChevronDown size={10} className="filter-chip__chevron" />
        </button>

        {tagDropdownOpen ? (
          <div className="filter-dropdown">
            {availableTags.length === 0 ? (
              <div className="filter-dropdown__empty">{isZh ? "暂无标签" : "No tags yet"}</div>
            ) : (
              availableTags.map((tag) => {
                const isSelected = selectedTagSet.has(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`filter-dropdown__item filter-dropdown__item--check${isSelected ? " is-active" : ""}`}
                    onClick={() => onToggleTag(tag)}
                  >
                    <span className={`filter-dropdown__check${isSelected ? " is-checked" : ""}`}>
                      {isSelected ? <Check size={12} /> : null}
                    </span>
                    <span className="filter-dropdown__label">{tag}</span>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      <div className="filter-chip--dropdown" ref={colorDropdownRef}>
        <button
          type="button"
          className={`filter-chip filter-chip--color${selectedColors.length > 0 ? " is-active" : ""}`}
          title={
            selectedColors.length > 0
              ? `${isZh ? "已选颜色" : "Selected colors"}: ${selectedColors
                  .map((value) => getColorLabel(value, locale))
                  .join(", ")}`
              : isZh
                ? "按颜色筛选"
                : "Filter by color"
          }
          onClick={() => {
            setActiveDropdown((prev) => (prev === "color" ? null : "color"));
          }}
        >
          <span className={`filter-chip__dot color-swatch--${selectedColorKey || "default"}`} />
          {colorButtonLabel}
          <ChevronDown size={10} className="filter-chip__chevron" />
        </button>

        {colorDropdownOpen ? (
          <div className="filter-dropdown">
            {FILTER_COLOR_KEYS.map((key) => {
              const isSelected = selectedColorSet.has(key);
              const label = getColorLabel(key, locale);
              return (
                <button
                  key={key}
                  type="button"
                  className={`filter-dropdown__item filter-dropdown__item--check${isSelected ? " is-active" : ""}`}
                  onClick={() => onToggleColor(key)}
                >
                  <span className={`filter-dropdown__check${isSelected ? " is-checked" : ""}`}>
                    {isSelected ? <Check size={12} /> : null}
                  </span>
                  <span className={`filter-dropdown__dot color-swatch--${key || "default"}`} />
                  <span className="filter-dropdown__label">{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {hasAnyFilter || nodeFilter !== "all" ? (
        <button
          type="button"
          className="filter-chip filter-chip--clear"
          aria-label={isZh ? "清除筛选" : "Clear filters"}
          title={isZh ? "清除所有筛选" : "Clear all filters"}
          onClick={() => {
            onClearFilters();
            onNodeFilterChange("all");
          }}
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}
