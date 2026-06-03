import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { PROJECT_COLUMNS, PROJECT_LEVEL_OPTIONS } from './projectConfig';
import { normalizeProjectProgress } from './projectModel';
import { ProjectInlineSelect } from './ProjectInlineSelect';
import { ProjectTableRowActions } from './ProjectTableRowActions';
import type { ProjectColumn, ProjectLine, ProjectRecord, ProjectRecordField } from './projectTypes';

interface ProjectMainRowProps {
  copied: boolean;
  downloaded: boolean;
  isEditMode: boolean;
  isExpanded: boolean;
  isZh: boolean;
  record: ProjectRecord;
  visibleColumns: ProjectColumn[];
  onCommitProjectField: (recordId: string, field: ProjectRecordField) => void;
  onCopy: () => void;
  onDownload: () => void;
  onRemoveRecord: (recordId: string) => void;
  onToggleProjectExpanded: (recordId: string) => void;
  onUpdateProjectField: (recordId: string, field: ProjectRecordField, value: string) => void;
}

function getFieldValue(record: ProjectLine, field: ProjectRecordField) {
  return record[field];
}

function renderProgressBar(progressValue: string, ariaLabel: string) {
  const progress = normalizeProjectProgress(progressValue);

  return (
    <div
      className="project-progress"
      aria-label={`${ariaLabel} ${progress}%`}
      title={`${progress}%`}
    >
      <div className="project-progress__bar" aria-hidden="true">
        <div className="project-progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="project-progress__value">{progress}%</span>
    </div>
  );
}

function renderProjectLevelBadge(projectLevel: string, isZh: boolean) {
  const displayValue = projectLevel || (isZh ? '未定' : 'Unset');

  return (
    <span
      className={`project-level-badge ${projectLevel ? '' : 'project-level-badge--empty'}`}
      title={displayValue}
    >
      {displayValue}
    </span>
  );
}

function renderProjectCell(record: ProjectLine, field: ProjectRecordField, isZh: boolean) {
  if (field === 'progress') {
    return renderProgressBar(record.progress, isZh ? '项目进度' : 'Project progress');
  }

  if (field === 'projectLevel') {
    return renderProjectLevelBadge(record.projectLevel, isZh);
  }

  return getFieldValue(record, field);
}

export function ProjectMainRow({
  copied,
  downloaded,
  isEditMode,
  isExpanded,
  isZh,
  record,
  visibleColumns,
  onCommitProjectField,
  onCopy,
  onDownload,
  onRemoveRecord,
  onToggleProjectExpanded,
  onUpdateProjectField,
}: ProjectMainRowProps) {
  const hasSubLines = record.subLines.length > 0;

  const renderProjectEditCell = (field: ProjectRecordField) => {
    const column = PROJECT_COLUMNS.find((currentColumn) => currentColumn.field === field);
    const label = column ? (isZh ? column.labelZh : column.labelEn) : isZh ? '编号' : 'No.';
    const value = getFieldValue(record, field);

    if (field === 'projectLevel') {
      return (
        <ProjectInlineSelect
          className="project-sheet__custom-select--level"
          ariaLabel={label}
          value={value}
          options={[
            { value: '', label: isZh ? '未定' : 'Unset' },
            ...PROJECT_LEVEL_OPTIONS.map((option) => ({ value: option, label: option })),
          ]}
          onChange={(nextValue) => onUpdateProjectField(record.id, field, nextValue)}
        />
      );
    }

    if (field === 'progress') {
      return renderProgressBar(record.progress, isZh ? '项目进度' : 'Project progress');
    }

    return (
      <input
        className="project-sheet__inline-input"
        inputMode={column?.inputMode ?? 'text'}
        aria-label={label}
        value={value}
        onBlur={() => onCommitProjectField(record.id, field)}
        onChange={(event) => onUpdateProjectField(record.id, field, event.target.value)}
      />
    );
  };

  return (
    <tr className="project-sheet__main-row">
      <td>
        <ProjectTableRowActions
          copied={copied}
          downloaded={downloaded}
          isZh={isZh}
          onCopy={onCopy}
          onDownload={onDownload}
        />
      </td>
      <th
        className={`project-sheet__tree-header ${
          hasSubLines ? 'project-sheet__tree-header--toggleable' : ''
        }`}
        scope="row"
      >
        {isEditMode ? (
          <div className="project-sheet__tree-cell project-sheet__tree-cell--edit">
            {hasSubLines ? (
              <button
                className="project-sheet__tree-toggle"
                type="button"
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded
                    ? isZh
                      ? '折叠子行'
                      : 'Collapse sublines'
                    : isZh
                      ? '展开子行'
                      : 'Expand sublines'
                }
                title={
                  isExpanded
                    ? isZh
                      ? '折叠子行'
                      : 'Collapse sublines'
                    : isZh
                      ? '展开子行'
                      : 'Expand sublines'
                }
                onClick={() => onToggleProjectExpanded(record.id)}
              >
                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            ) : (
              <span className="project-sheet__tree-spacer" aria-hidden="true" />
            )}
            <input
              className="project-sheet__inline-input project-sheet__tree-index-input"
              aria-label={isZh ? '编号' : 'No.'}
              value={record.lineNo}
              onBlur={() => onCommitProjectField(record.id, 'lineNo')}
              onChange={(event) => onUpdateProjectField(record.id, 'lineNo', event.target.value)}
            />
          </div>
        ) : hasSubLines ? (
          <button
            className="project-sheet__tree-cell project-sheet__tree-cell--toggle-button"
            type="button"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? isZh
                  ? '折叠子行'
                  : 'Collapse sublines'
                : isZh
                  ? '展开子行'
                  : 'Expand sublines'
            }
            title={
              isExpanded
                ? isZh
                  ? '折叠子行'
                  : 'Collapse sublines'
                : isZh
                  ? '展开子行'
                  : 'Expand sublines'
            }
            onClick={() => onToggleProjectExpanded(record.id)}
          >
            <span className="project-sheet__tree-toggle" aria-hidden="true">
              {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
            <span className="project-sheet__tree-index" title={record.lineNo}>
              {record.lineNo}
            </span>
          </button>
        ) : (
          <div className="project-sheet__tree-cell">
            <span className="project-sheet__tree-spacer" aria-hidden="true" />
            <span className="project-sheet__tree-index" title={record.lineNo}>
              {record.lineNo}
            </span>
          </div>
        )}
      </th>
      {visibleColumns.map((column) => (
        <td
          key={column.field}
          className={`project-sheet__cell project-sheet__cell--${column.field}`}
        >
          {isEditMode
            ? renderProjectEditCell(column.field)
            : renderProjectCell(record, column.field, isZh)}
        </td>
      ))}
      <td>
        <div className="project-sheet__row-actions">
          {isEditMode ? (
            <button
              className="project-sheet__row-action project-sheet__row-action--danger"
              type="button"
              aria-label={isZh ? '删除项目' : 'Delete project'}
              title={isZh ? '删除项目' : 'Delete project'}
              onClick={() => onRemoveRecord(record.id)}
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
