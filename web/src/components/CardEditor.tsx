import { useEffect, useRef, useState } from 'react';

import { getColorLabel, getNodeTypeLabel, useI18n } from '../i18n';
import { SUPPORTED_NODE_COLORS } from '../lib/nodeColors';
import type { BacklinkItem, GraphNode } from '../types';
import { CardEditorChecklistSection } from './CardEditor/CardEditorChecklistSection';
import { useCardEditorChecklist } from './CardEditor/useCardEditorChecklist';
import { ReferencesPanel } from './ReferencesPanel';

interface CardEditorProps {
  node: GraphNode;
  allNodes: GraphNode[];
  backlinks?: BacklinkItem[];
  autoFocusContent?: boolean;
  onReferenceSelect?: (nodeId: string) => void;
  onAutoFocusContentHandled?: () => void;
  onContentCommit?: (contentHtml: string) => void;
  onTitleCommit?: (title: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onColorChange?: (color: string) => void;
  onDeleteCitation?: (targetId: string) => void;
  onReorderReferences?: (newOrder: string[]) => void;
  onCreateCitation?: (targetId: string) => void;
}

export function CardEditor({
  node,
  allNodes,
  backlinks = [],
  autoFocusContent = false,
  onReferenceSelect,
  onAutoFocusContentHandled,
  onContentCommit,
  onTitleCommit,
  onTagsChange,
  onColorChange,
  onDeleteCitation,
  onReorderReferences,
  onCreateCitation,
}: CardEditorProps) {
  const { isZh, locale } = useI18n();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(node.title);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  const supportsChecklist = node.type === 'card';
  const checklist = useCardEditorChecklist({
    contentHtml: node.contentHtml,
    onContentCommit,
    supportsChecklist,
  });

  useEffect(() => {
    setDraftTitle(node.title);
    setIsEditingTitle(false);
  }, [node.id]);

  useEffect(() => {
    if (tagInputRef.current) {
      tagInputRef.current.value = '';
    }
  }, [node.id]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!autoFocusContent) {
      return;
    }

    tagInputRef.current?.focus();
    onAutoFocusContentHandled?.();
  }, [autoFocusContent, onAutoFocusContentHandled, node.id]);

  return (
    <div className="editor-panel">
      <section className="field-section field-section--properties">
        <h3 className="field-label">{isZh ? '属性' : 'Properties'}</h3>
        <dl className="properties-list">
          <div className="property">
            <dt>{isZh ? '标题' : 'Title'}</dt>
            <dd>
              {isEditingTitle ? (
                <textarea
                  ref={titleInputRef}
                  className="image-editor__title-input property-input property-input--center card-editor__title-input"
                  aria-label={isZh ? '卡片标题' : 'Card title'}
                  rows={3}
                  value={draftTitle}
                  onBlur={() => {
                    if (draftTitle !== node.title) {
                      onTitleCommit?.(draftTitle);
                    }
                    setIsEditingTitle(false);
                  }}
                  onChange={(event) => {
                    setDraftTitle(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setDraftTitle(node.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  placeholder={isZh ? '未命名卡片' : 'Untitled card'}
                />
              ) : (
                <button
                  type="button"
                  className="property-value-button property-value-button--center"
                  aria-label={isZh ? '编辑卡片标题' : 'Edit card title'}
                  onClick={() => setIsEditingTitle(true)}
                >
                  {node.title}
                </button>
              )}
            </dd>
          </div>
          <div className="property">
            <dt>ID</dt>
            <dd>{node.id}</dd>
          </div>
          <div className="property">
            <dt>{isZh ? '类型' : 'Type'}</dt>
            <dd>{getNodeTypeLabel(node.type, locale)}</dd>
          </div>
        </dl>
      </section>

      <section className="field-section field-section--color">
        <h3 className="field-label">{isZh ? '颜色' : 'Color'}</h3>
        <div
          className="color-palette"
          role="radiogroup"
          aria-label={isZh ? '卡片颜色' : 'Card color'}
        >
          <button
            type="button"
            role="radio"
            aria-checked={(node.color || '') === ''}
            className={`color-swatch color-swatch--default${(node.color || '') === '' ? ' is-active' : ''}`}
            title={getColorLabel('', locale)}
            aria-label={getColorLabel('', locale)}
            onClick={() => onColorChange?.('')}
          />
          {SUPPORTED_NODE_COLORS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={(node.color || '') === key}
              className={`color-swatch color-swatch--${key}${(node.color || '') === key ? ' is-active' : ''}`}
              title={getColorLabel(key, locale)}
              aria-label={getColorLabel(key, locale)}
              onClick={() => onColorChange?.(key)}
            />
          ))}
        </div>
      </section>

      <section className="field-section field-section--tags">
        <h3 className="field-label">{isZh ? '标签' : 'Tags'}</h3>
        <div className="tags-editor">
          {node.tags.map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
              <button
                type="button"
                className="tag-pill__remove"
                aria-label={isZh ? `删除标签 "${tag}"` : `Remove tag "${tag}"`}
                onClick={() => {
                  const next = node.tags.filter((t) => t !== tag);
                  onTagsChange?.(next);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            className="tag-input"
            type="text"
            placeholder={isZh ? '输入标签后回车' : 'Type a tag and press Enter'}
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const input = tagInputRef.current;
                if (!input) return;
                const trimmed = input.value.trim();
                if (!trimmed) return;
                if (!node.tags.includes(trimmed)) {
                  onTagsChange?.([...node.tags, trimmed]);
                }
                input.value = '';
              }
              if (e.key === 'Backspace' && !tagInputRef.current?.value && node.tags.length > 0) {
                onTagsChange?.(node.tags.slice(0, -1));
              }
            }}
          />
        </div>
      </section>

      {supportsChecklist ? (
        <CardEditorChecklistSection
          completedCount={checklist.completedCount}
          isZh={isZh}
          nodeId={node.id}
          percentage={checklist.percentage}
          tasks={checklist.tasks}
          totalCount={checklist.totalCount}
          onAddTask={checklist.handleAddTask}
          onClearCompletedTasks={checklist.handleClearCompletedTasks}
          onSortTasks={checklist.handleSortTasks}
          onToggleAllTasks={checklist.handleToggleAllTasks}
          onToggleTask={checklist.handleToggleTask}
        />
      ) : null}

      {node.customFields && node.customFields.length > 0 && (
        <section className="field-section field-section--custom-fields">
          <h3 className="field-label">{isZh ? '自定义字段' : 'Custom fields'}</h3>
          <dl className="custom-fields-list">
            {node.customFields.map((field) => (
              <div key={field.id} className="custom-field">
                <dt>{field.field}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {node.type !== 'group' ? (
        <ReferencesPanel
          node={node}
          allNodes={allNodes}
          backlinks={backlinks}
          onReferenceSelect={onReferenceSelect}
          onCreateCitation={onCreateCitation}
          onDeleteCitation={onDeleteCitation}
          onReorderReferences={onReorderReferences}
        />
      ) : null}
    </div>
  );
}
