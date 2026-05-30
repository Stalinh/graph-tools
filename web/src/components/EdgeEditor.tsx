import type { CSSProperties } from "react";
import { getColorLabel, useI18n } from "../i18n";
import {
  DEFAULT_SUPPORTED_NODE_COLOR,
  SUPPORTED_NODE_COLORS,
  getNodeColorCssVar,
} from "../lib/nodeColors";
import type { EdgeDirection, EdgeStyle, GraphEdge, GraphNode } from "../types";

interface EdgeEditorProps {
  edge: GraphEdge;
  sourceNode: GraphNode | undefined;
  targetNode: GraphNode | undefined;
  onDirectionChange: (edgeId: string, direction: EdgeDirection) => void;
  onColorChange: (edgeId: string, color: string) => void;
  onStyleChange: (edgeId: string, style: EdgeStyle) => void;
  onDelete?: (edge: GraphEdge) => void;
}

export function EdgeEditor({
  edge,
  sourceNode,
  targetNode,
  onColorChange,
  onDirectionChange,
  onStyleChange,
  onDelete,
}: EdgeEditorProps) {
  const { isZh, locale } = useI18n();
  const edgeStyleOptions: Array<{ ariaLabel: string; label: string; value: EdgeStyle }> = [
    {
      ariaLabel: isZh ? "切换为草图" : "Switch to sketch style",
      label: isZh ? "草图" : "Sketch",
      value: "sketch",
    },
    {
      ariaLabel: isZh ? "切换为笔记虚线" : "Switch to note dash style",
      label: isZh ? "笔记虚线" : "Note dash",
      value: "note-dash",
    },
  ];
  const edgeColorOptions = SUPPORTED_NODE_COLORS.map((value) => ({
    ariaLabel: isZh
      ? `切换为${getColorLabel(value, locale)}连线`
      : `Switch to ${getColorLabel(value, locale).toLowerCase()} edge color`,
    label: getColorLabel(value, locale),
    value,
    swatch: getNodeColorCssVar(value, true),
  }));
  const direction: EdgeDirection = edge.direction ?? "unidirectional";
  const style: EdgeStyle = edge.style === "sketch" ? "sketch" : "note-dash";
  const color = edge.color ?? DEFAULT_SUPPORTED_NODE_COLOR;

  function toggleDirection() {
    const next: EdgeDirection = direction === "unidirectional" ? "bidirectional" : "unidirectional";
    onDirectionChange(edge.id, next);
  }
  const directionLabel =
    direction === "unidirectional"
      ? isZh
        ? "单向引用 →"
        : "One-way link →"
      : isZh
        ? "双向引用 —"
        : "Two-way link —";

  return (
    <div className="editor-panel">
      <section className="field-section">
        <h3 className="field-label">{isZh ? "属性" : "Properties"}</h3>
        <dl className="properties-list">
          <div className="property">
            <dt>{isZh ? "方向" : "Direction"}</dt>
            <dd
              className="property--clickable"
              role="button"
              tabIndex={0}
              aria-label={
                isZh
                  ? `切换连线方向，当前为${directionLabel}`
                  : `Toggle direction, current: ${directionLabel}`
              }
              onClick={toggleDirection}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleDirection();
                }
              }}
            >
              {directionLabel}
            </dd>
          </div>
          <div className="property">
            <dt>{isZh ? "源节点" : "Source"}</dt>
            <dd>{sourceNode?.title ?? edge.sourceId}</dd>
          </div>
          <div className="property">
            <dt>{isZh ? "目标节点" : "Target"}</dt>
            <dd>{targetNode?.title ?? edge.targetId}</dd>
          </div>
        </dl>
      </section>

      <section className="field-section">
        <h3 className="field-label">{isZh ? "外观" : "Appearance"}</h3>
        <div
          className="property-segmented-control"
          role="group"
          aria-label={isZh ? "连线样式" : "Edge style"}
        >
          {edgeStyleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`property-segmented-control__button${style === option.value ? " is-active" : ""}`}
              aria-label={option.ariaLabel}
              aria-pressed={style === option.value}
              onClick={() => onStyleChange(edge.id, option.value)}
            >
              <span
                className={`edge-style-preview edge-style-preview--${option.value}`}
                data-testid={`edge-style-preview-${option.value}`}
                aria-hidden="true"
                style={{ color: getNodeColorCssVar(color, true) }}
              >
                <span className="edge-style-preview__line" />
                {option.value === "sketch" ? (
                  <span className="edge-style-preview__line edge-style-preview__line--secondary" />
                ) : null}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <div
          className="edge-color-picker"
          role="group"
          aria-label={isZh ? "连线颜色" : "Edge color"}
        >
          {edgeColorOptions.map((option) => {
            const isActive = color === option.value;
            return (
              <button
                key={option.label}
                type="button"
                className={`edge-color-swatch${isActive ? " is-active" : ""}`}
                aria-label={option.ariaLabel}
                aria-pressed={isActive}
                title={option.label}
                data-testid={`edge-color-swatch-${option.label}`}
                onClick={() => onColorChange(edge.id, option.value)}
              >
                <span
                  className="edge-color-swatch__dot"
                  style={{ "--edge-swatch-color": option.swatch } as CSSProperties}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>

      {onDelete ? (
        <section className="field-section">
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(edge)}
            aria-label={
              isZh
                ? `删除引线 ${sourceNode?.title ?? edge.sourceId} 到 ${targetNode?.title ?? edge.targetId}`
                : `Delete link from ${sourceNode?.title ?? edge.sourceId} to ${targetNode?.title ?? edge.targetId}`
            }
          >
            {isZh ? "删除引线" : "Delete link"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
