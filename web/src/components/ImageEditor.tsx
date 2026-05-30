import { useEffect, useState } from "react";
import { getColorLabel, useI18n } from "../i18n";
import { SUPPORTED_NODE_COLORS } from "../lib/nodeColors";
import type { BacklinkItem, GraphNode } from "../types";
import { ReferencesPanel } from "./ReferencesPanel";

interface ImageEditorProps {
  node: GraphNode;
  allNodes: GraphNode[];
  backlinks?: BacklinkItem[];
  onTitleCommit?: (title: string) => void;
  onColorChange?: (color: string) => void;
  onReferenceSelect?: (nodeId: string) => void;
  onCreateCitation?: (targetId: string) => void;
  onDeleteCitation?: (targetId: string) => void;
  onReorderReferences?: (newOrder: string[]) => void;
}

export function ImageEditor({
  node,
  allNodes,
  backlinks = [],
  onTitleCommit,
  onColorChange,
  onReferenceSelect,
  onCreateCitation,
  onDeleteCitation,
  onReorderReferences,
}: ImageEditorProps) {
  const { isZh, locale } = useI18n();
  const [draftTitle, setDraftTitle] = useState(node.title);

  useEffect(() => {
    setDraftTitle(node.title);
  }, [node.id, node.title]);

  return (
    <div className="editor-panel">
      <section className="field-section">
        <h3 className="field-label">{isZh ? "属性" : "Properties"}</h3>
        <dl className="properties-list">
          <div className="property">
            <dt>ID</dt>
            <dd>{node.id}</dd>
          </div>
          <div className="property">
            <dt>{isZh ? "类型" : "Type"}</dt>
            <dd>{isZh ? "图片" : "Image"}</dd>
          </div>
        </dl>
      </section>

      <section className="field-section">
        <h3 className="field-label">{isZh ? "标题" : "Title"}</h3>
        <input
          type="text"
          className="image-editor__title-input"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={() => {
            if (draftTitle !== node.title) {
              onTitleCommit?.(draftTitle);
            }
          }}
          placeholder={isZh ? "填写图片说明..." : "Image description..."}
        />
      </section>

      <section className="field-section">
        <h3 className="field-label">{isZh ? "颜色" : "Color"}</h3>
        <div
          className="color-palette"
          role="radiogroup"
          aria-label={isZh ? "图片颜色" : "Image color"}
        >
          <button
            type="button"
            role="radio"
            aria-checked={(node.color || "") === ""}
            className={`color-swatch color-swatch--default${(node.color || "") === "" ? " is-active" : ""}`}
            title={getColorLabel("", locale)}
            aria-label={getColorLabel("", locale)}
            onClick={() => onColorChange?.("")}
          />
          {SUPPORTED_NODE_COLORS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={(node.color || "") === key}
              className={`color-swatch color-swatch--${key}${(node.color || "") === key ? " is-active" : ""}`}
              title={getColorLabel(key, locale)}
              aria-label={getColorLabel(key, locale)}
              onClick={() => onColorChange?.(key)}
            />
          ))}
        </div>
      </section>

      <ReferencesPanel
        node={node}
        allNodes={allNodes}
        backlinks={backlinks}
        onReferenceSelect={onReferenceSelect}
        onCreateCitation={onCreateCitation}
        onDeleteCitation={onDeleteCitation}
        onReorderReferences={onReorderReferences}
      />
    </div>
  );
}
