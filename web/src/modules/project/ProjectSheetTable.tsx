import { ChevronDown, ChevronRight, Trash2, Copy, Check, Download } from 'lucide-react';
import { Fragment, useState } from 'react';
import {
  PROJECT_COLUMNS,
  PROJECT_LEVEL_OPTIONS,
  PROJECT_SUB_LINE_STATUS_OPTIONS,
  getSubLineWorkloadRatio,
} from './projectConfig';
import { normalizeProjectProgress, normalizeProjectSubLineStatus } from './projectModel';
import { ProjectInlineSelect } from './ProjectInlineSelect';
import type {
  ProjectLine,
  ProjectRecord,
  ProjectRecordField,
  ProjectSubLineField,
  ProjectSubLineStatus,
} from './projectTypes';

interface ProjectSheetTableProps {
  expandedProjectIds: Set<string>;
  isEditMode: boolean;
  isZh: boolean;
  records: ProjectRecord[];
  onCommitProjectField: (recordId: string, field: ProjectRecordField) => void;
  onRemoveRecord: (recordId: string) => void;
  onToggleProjectExpanded: (recordId: string) => void;
  onUpdateProjectField: (recordId: string, field: ProjectRecordField, value: string) => void;
  onUpdateSubLineField: (
    parentId: string,
    subLineId: string,
    field: ProjectSubLineField,
    value: string
  ) => void;
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

function renderProjectCell(record: ProjectLine, field: ProjectRecordField, isZh: boolean) {
  if (field !== 'progress') {
    return getFieldValue(record, field);
  }

  return renderProgressBar(record.progress, isZh ? '项目进度' : 'Project progress');
}

function getSubLineStatusClassName(status: ProjectSubLineStatus) {
  const classNameByStatus: Record<ProjectSubLineStatus, string> = {
    未处理: 'project-subline__status--unprocessed',
    待处理: 'project-subline__status--todo',
    等待中: 'project-subline__status--waiting',
    '已提资/已完成': 'project-subline__status--done',
  };

  return `project-subline__status ${classNameByStatus[status]}`;
}

function getSubLineStatusToneClassName(status: string) {
  const classNameByStatus: Record<ProjectSubLineStatus, string> = {
    未处理: 'project-sheet__custom-select-tone--unprocessed',
    待处理: 'project-sheet__custom-select-tone--todo',
    等待中: 'project-sheet__custom-select-tone--waiting',
    '已提资/已完成': 'project-sheet__custom-select-tone--done',
  };

  return classNameByStatus[normalizeProjectSubLineStatus(status)];
}

function renderSubLineWorkloadRatioCell(taskName: string, isZh: boolean, key?: string) {
  const ratio = getSubLineWorkloadRatio(taskName);
  const isMissing = ratio === null;
  const displayValue = isMissing ? (isZh ? '未配置' : 'Not Configured') : `${ratio}%`;
  return (
    <td
      key={key}
      className={
        'project-sheet__subline-progress-cell' +
        (isMissing ? ' project-sheet__subline-progress-cell--missing' : '')
      }
      title={
        isMissing
          ? isZh
            ? '该子行未配置工作量占比'
            : 'Workload ratio not configured for this subline'
          : isZh
            ? `工作量占比 ${displayValue}`
            : `Workload ratio ${displayValue}`
      }
    >
      {displayValue}
    </td>
  );
}

export function ProjectSheetTable({
  expandedProjectIds,
  isEditMode,
  isZh,
  records,
  onCommitProjectField,
  onRemoveRecord,
  onToggleProjectExpanded,
  onUpdateProjectField,
  onUpdateSubLineField,
}: ProjectSheetTableProps) {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; open: boolean }>({
    x: 0,
    y: 0,
    open: false,
  });
  const [copiedRecordId, setCopiedRecordId] = useState<string | null>(null);
  const [downloadedRecordId, setDownloadedRecordId] = useState<string | null>(null);

  const handleCopy = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (record) {
      const textToCopy = `${record.lineNo} ${record.projectName}`;
      void navigator.clipboard.writeText(textToCopy);
    }
    setCopiedRecordId(recordId);
    setTimeout(() => {
      setCopiedRecordId((current) => (current === recordId ? null : current));
    }, 3000);
  };

  const handleDownload = (recordId: string) => {
    setDownloadedRecordId(recordId);
    setTimeout(() => {
      setDownloadedRecordId((current) => (current === recordId ? null : current));
    }, 3000);
  };

  const visibleColumns = PROJECT_COLUMNS.filter((col) => !hiddenColumns.has(col.field));

  const visibleColumnsWidth = visibleColumns.reduce((sum, col) => {
    const w = parseInt(col.width, 10);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);
  const totalTableWidth = 112 + 80 + 136 + visibleColumnsWidth;

  const toggleColumnVisibility = (field: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        if (field === 'projectName') return prev;
        const visibleCount = PROJECT_COLUMNS.length - next.size;
        if (visibleCount <= 1) return prev;
        next.add(field);
      }
      return next;
    });
  };

  const handleHeaderContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      open: true,
    });
  };

  const renderProjectEditCell = (record: ProjectRecord, field: ProjectRecordField) => {
    const column = PROJECT_COLUMNS.find((currentColumn) => currentColumn.field === field);
    const label = column ? (isZh ? column.labelZh : column.labelEn) : isZh ? '编号' : 'No.';
    const value = getFieldValue(record, field);

    if (field === 'projectLevel') {
      return (
        <ProjectInlineSelect
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
    <div
      className="project-sheet"
      role="region"
      aria-label={isZh ? '项目管理表' : 'Project management table'}
    >
      {contextMenu.open && (
        <>
          <div
            className="project-sheet__context-menu-backdrop"
            onClick={() => setContextMenu({ x: 0, y: 0, open: false })}
          />
          <div
            className="project-sheet__context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            role="menu"
          >
            <div className="project-sheet__context-menu-header">
              {isZh ? '显示/隐藏列' : 'Show/Hide Columns'}
            </div>
            {PROJECT_COLUMNS.map((column) => {
              const isVisible = !hiddenColumns.has(column.field);
              const isProjectName = column.field === 'projectName';
              return (
                <button
                  key={column.field}
                  className="project-sheet__context-menu-item"
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isVisible}
                  disabled={isProjectName}
                  onClick={() => toggleColumnVisibility(column.field)}
                >
                  <input type="checkbox" checked={isVisible} disabled={isProjectName} readOnly />
                  <span>{isZh ? column.labelZh : column.labelEn}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <table style={{ width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
        <colgroup>
          <col className="project-sheet__copy-col" style={{ width: '80px' }} />
          <col className="project-sheet__index-col" style={{ width: '112px' }} />
          {visibleColumns.map((column) => (
            <col key={column.field} style={{ width: column.width }} />
          ))}
          <col className="project-sheet__actions-col" style={{ width: '136px' }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">{isZh ? '操作' : 'Actions'}</th>
            <th scope="col">{isZh ? '编号' : 'No.'}</th>
            {visibleColumns.map((column) => (
              <th
                key={column.field}
                scope="col"
                style={{ cursor: 'context-menu' }}
                title={isZh ? '右击管理显示列' : 'Right-click to manage columns'}
                onContextMenu={handleHeaderContextMenu}
              >
                {isZh ? column.labelZh : column.labelEn}
              </th>
            ))}
            <th scope="col">{isZh ? '删除' : 'Delete'}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const hasSubLines = record.subLines.length > 0;
            const isExpanded = expandedProjectIds.has(record.id);

            // Compute display labels for sublines (专项 items get 12-1, 12-2, etc.)
            const subLineLabels = (() => {
              const firstZxIdx = record.subLines.findIndex((sl) => sl.taskName.startsWith('专项-'));
              if (firstZxIdx < 0) {
                return record.subLines.map((_, i) => String(i + 1));
              }
              const zxBase = firstZxIdx + 1;
              let zxCnt = 0;
              return record.subLines.map((sl, i) => {
                if (sl.taskName.startsWith('专项-')) {
                  zxCnt++;
                  return `${zxBase}-${zxCnt}`;
                }
                return String(i + 1);
              });
            })();

            return (
              <Fragment key={record.id}>
                <tr className="project-sheet__main-row">
                  <td>
                    <div className="project-sheet__row-actions" style={{ gap: '4px' }}>
                      <button
                        className={`project-sheet__row-action project-sheet__copy-button ${
                          copiedRecordId === record.id ? 'is-copied' : ''
                        }`}
                        type="button"
                        aria-label={isZh ? '复制项目' : 'Copy project'}
                        title={isZh ? '复制项目' : 'Copy project'}
                        onClick={() => handleCopy(record.id)}
                      >
                        {copiedRecordId === record.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        className={`project-sheet__row-action project-sheet__download-button ${
                          downloadedRecordId === record.id ? 'is-downloaded' : ''
                        }`}
                        type="button"
                        aria-label={isZh ? '下载项目' : 'Download project'}
                        title={isZh ? '下载项目' : 'Download project'}
                        onClick={() => handleDownload(record.id)}
                      >
                        {downloadedRecordId === record.id ? (
                          <Check size={16} />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                    </div>
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
                          onChange={(event) =>
                            onUpdateProjectField(record.id, 'lineNo', event.target.value)
                          }
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
                    <td key={column.field}>
                      {isEditMode
                        ? renderProjectEditCell(record, column.field)
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
                {isExpanded
                  ? record.subLines.map((subLine, subLineIndex) => (
                      <tr
                        className={`project-sheet__sub-row ${
                          subLineIndex === record.subLines.length - 1
                            ? 'project-sheet__sub-row--last'
                            : ''
                        }`}
                        key={subLine.id}
                      >
                        <td className="project-sheet__subline-empty-cell" aria-hidden="true" />
                        <th scope="row">
                          <div className="project-sheet__tree-cell project-sheet__tree-cell--sub">
                            <span className="project-sheet__tree-spacer" aria-hidden="true" />
                            <span className="project-sheet__tree-index" title={subLine.lineNo}>
                              {subLine.lineNo}
                            </span>
                          </div>
                        </th>
                        {visibleColumns.map((column) => {
                          if (column.field === 'projectName') {
                            return (
                              <td key={column.field} className="project-sheet__subline-task-cell">
                                <span
                                  className="project-subline__task"
                                  title={`${subLineLabels[subLineIndex]}.${subLine.taskName}`}
                                >
                                  {`${subLineLabels[subLineIndex]}.${subLine.taskName}`}
                                </span>
                              </td>
                            );
                          }
                          if (column.field === 'contractAmount') {
                            return (
                              <td key={column.field} className="project-sheet__subline-status-cell">
                                {isEditMode ? (
                                  <ProjectInlineSelect
                                    className="project-sheet__custom-select--status"
                                    ariaLabel={isZh ? '子行状态' : 'Subline status'}
                                    value={subLine.status}
                                    getOptionToneClassName={getSubLineStatusToneClassName}
                                    options={PROJECT_SUB_LINE_STATUS_OPTIONS.map((status) => ({
                                      value: status,
                                      label: status,
                                    }))}
                                    onChange={(nextValue) =>
                                      onUpdateSubLineField(
                                        record.id,
                                        subLine.id,
                                        'status',
                                        nextValue
                                      )
                                    }
                                  />
                                ) : (
                                  <span className={getSubLineStatusClassName(subLine.status)}>
                                    {subLine.status}
                                  </span>
                                )}
                              </td>
                            );
                          }
                          if (column.field === 'progress') {
                            return renderSubLineWorkloadRatioCell(
                              subLine.taskName,
                              isZh,
                              column.field
                            );
                          }
                          if (column.field === 'detailDesign') {
                            return (
                              <td
                                key={column.field}
                                className="project-sheet__subline-detail-design-cell"
                              >
                                {isEditMode ? (
                                  <input
                                    className="project-sheet__inline-input"
                                    aria-label={isZh ? '细化设计' : 'Detail design'}
                                    value={subLine.detailDesign}
                                    onChange={(event) =>
                                      onUpdateSubLineField(
                                        record.id,
                                        subLine.id,
                                        'detailDesign',
                                        event.target.value
                                      )
                                    }
                                  />
                                ) : (
                                  <span
                                    className="project-subline__detail-design"
                                    title={subLine.detailDesign}
                                  >
                                    {subLine.detailDesign}
                                  </span>
                                )}
                              </td>
                            );
                          }
                          return (
                            <td
                              key={column.field}
                              className="project-sheet__subline-empty-cell"
                              aria-hidden="true"
                            />
                          );
                        })}
                        <td>
                          <div className="project-sheet__row-actions" />
                        </td>
                      </tr>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {records.length === 0 ? (
        <div className="project-sheet__empty" role="status">
          {isZh ? '暂无项目' : 'No projects yet'}
        </div>
      ) : null}
    </div>
  );
}
