import { Layers, Lock, LockOpen, Maximize2, Trash2 } from "lucide-react";
import {
  getColorLabel,
  getDefaultCardTitle,
  getDefaultGroupTitle,
  getDefaultImageTitle,
  getNodeTypeLabel,
  useI18n,
} from "../i18n";
import { SUPPORTED_NODE_COLORS } from "../lib/nodeColors";
import type { GraphNode } from "../types";

interface MultiSelectInspectorProps {
  nodes: GraphNode[];
  onBatchDelete?: () => void;
  onBatchColorChange?: (color: string) => void;
  onBatchLockChange?: (locked: boolean) => void;
  onMatchGroupSizes?: () => void;
}

export function MultiSelectInspector({
  nodes,
  onBatchDelete,
  onBatchColorChange,
  onBatchLockChange,
  onMatchGroupSizes,
}: MultiSelectInspectorProps) {
  const { isZh, locale } = useI18n();

  const cardsCount = nodes.filter((n) => n.type === "card").length;
  const imagesCount = nodes.filter((n) => n.type === "image").length;
  const groupsCount = nodes.filter((n) => n.type === "group").length;
  const summaryParts = [
    groupsCount > 0
      ? isZh
        ? `${groupsCount} 个分组`
        : `${groupsCount} group${groupsCount > 1 ? "s" : ""}`
      : "",
    cardsCount > 0
      ? isZh
        ? `${cardsCount} 张卡片`
        : `${cardsCount} card${cardsCount > 1 ? "s" : ""}`
      : "",
    imagesCount > 0
      ? isZh
        ? `${imagesCount} 张图片`
        : `${imagesCount} image${imagesCount > 1 ? "s" : ""}`
      : "",
  ].filter(Boolean);

  const previewNodes = nodes.slice(0, 3);
  const remainingCount = nodes.length - 3;

  // Determine if a single color is active across all nodes
  const firstColor = nodes[0]?.color ?? "";
  const allHaveSameColor = nodes.every((n) => (n.color ?? "") === firstColor);
  const activeColor = allHaveSameColor ? firstColor : null;

  // Determine locking states
  const allLocked = nodes.every((n) => n.locked);
  const allUnlocked = nodes.every((n) => !n.locked);

  return (
    <div className="inspector__body">
      <div className="editor-panel">
        {/* Selection Card Summary */}
        <div className="selection-summary-card">
          <div className="selection-summary-card__header">
            <div className="selection-summary-card__icon" aria-hidden="true">
              <Layers size={18} />
            </div>
            <div className="selection-summary-card__title-group">
              <h2 className="selection-summary-card__title">
                {isZh
                  ? `已选 ${nodes.length} 个节点`
                  : `${nodes.length} selected node${nodes.length === 1 ? "" : "s"}`}
              </h2>
              <span className="selection-summary-card__subtitle">
                {summaryParts.join(" • ")}
              </span>
            </div>
          </div>

          <ul className="selection-summary-card__list">
            {previewNodes.map((n) => (
              <li key={n.id} className="selection-summary-card__item">
                <span
                  className="selection-summary-card__item-color"
                  style={{
                    background: n.color ? `var(--color-card-${n.color})` : "var(--color-card-0)",
                    border: "1px solid var(--color-border-strong)",
                  }}
                  aria-hidden="true"
                />
                <span className="selection-summary-card__item-title">
                  {n.title ||
                    (n.type === "group"
                      ? getDefaultGroupTitle(locale)
                      : n.type === "image"
                        ? getDefaultImageTitle(locale)
                        : getDefaultCardTitle(locale))}
                </span>
                <span className="selection-summary-card__item-type">
                  {getNodeTypeLabel(n.type, locale)}
                </span>
              </li>
            ))}
            {remainingCount > 0 && (
              <li className="selection-summary-card__more">
                {isZh
                  ? `还有 ${remainingCount} 个节点`
                  : `+ ${remainingCount} more node${remainingCount > 1 ? "s" : ""}`}
              </li>
            )}
          </ul>
        </div>

        {/* Color Palette section */}
        <section className="field-section">
          <h3 className="field-label">{isZh ? "颜色" : "Color"}</h3>
          <div
            className="color-palette"
            role="radiogroup"
            aria-label={isZh ? "批量颜色" : "Batch color"}
          >
            <button
              type="button"
              role="radio"
              aria-checked={activeColor === ""}
              className={`color-swatch color-swatch--default${activeColor === "" ? " is-active" : ""}`}
              title={getColorLabel("", locale)}
              aria-label={getColorLabel("", locale)}
              onClick={() => onBatchColorChange?.("")}
            />
            {SUPPORTED_NODE_COLORS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={activeColor === key}
                className={`color-swatch color-swatch--${key}${activeColor === key ? " is-active" : ""}`}
                title={getColorLabel(key, locale)}
                aria-label={getColorLabel(key, locale)}
                onClick={() => onBatchColorChange?.(key)}
              />
            ))}
          </div>
        </section>

        {groupsCount >= 2 ? (
          <section className="field-section">
            <h3 className="field-label">{isZh ? "分组尺寸" : "Group size"}</h3>
            <div className="property-segmented-control property-segmented-control--single">
              <button
                type="button"
                className="property-segmented-control__button"
                onClick={onMatchGroupSizes}
                disabled={!onMatchGroupSizes}
              >
                <Maximize2 aria-hidden="true" size={15} style={{ marginBottom: "2px" }} />
                <span>{isZh ? "尺寸匹配" : "Match size"}</span>
              </button>
            </div>
          </section>
        ) : null}

        {/* Lock status control section */}
        <section className="field-section">
          <h3 className="field-label">{isZh ? "锁定状态" : "Lock status"}</h3>
          <div
            className="property-segmented-control"
            role="group"
            aria-label={isZh ? "批量锁定状态" : "Batch lock status"}
          >
            <button
              type="button"
              className={`property-segmented-control__button${allLocked ? " is-active" : ""}`}
              onClick={() => onBatchLockChange?.(true)}
              aria-pressed={allLocked}
            >
              <Lock aria-hidden="true" size={15} style={{ marginBottom: "2px" }} />
              <span>{isZh ? "锁定" : "Lock"}</span>
            </button>
            <button
              type="button"
              className={`property-segmented-control__button${allUnlocked ? " is-active" : ""}`}
              onClick={() => onBatchLockChange?.(false)}
              aria-pressed={allUnlocked}
            >
              <LockOpen aria-hidden="true" size={15} style={{ marginBottom: "2px" }} />
              <span>{isZh ? "解锁" : "Unlock"}</span>
            </button>
          </div>
        </section>

        {/* Batch delete danger action */}
        <section
          className="field-section danger-zone-section"
          style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "14px",
            marginTop: "6px",
          }}
        >
          <button
            type="button"
            className="danger-button"
            onClick={onBatchDelete}
            aria-label={isZh ? "删除选中节点" : "Delete selected nodes"}
          >
            <Trash2
              aria-hidden="true"
              size={15}
              style={{ marginRight: "6px", display: "inline", verticalAlign: "middle" }}
            />
            <span style={{ verticalAlign: "middle" }}>
              {isZh ? "删除选中节点" : "Delete selected nodes"}
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}
