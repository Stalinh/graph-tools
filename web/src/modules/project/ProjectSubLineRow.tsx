import { getSubLineWorkloadRatio, PROJECT_SUB_LINE_STATUS_OPTIONS } from './projectConfig';
import { normalizeProjectSubLineStatus } from './projectModel';
import { ProjectInlineSelect } from './ProjectInlineSelect';
import type {
  ProjectColumn,
  ProjectSubLine,
  ProjectSubLineField,
  ProjectSubLineStatus,
} from './projectTypes';

interface ProjectSubLineRowProps {
  isEditMode: boolean;
  isLast: boolean;
  isZh: boolean;
  parentId: string;
  subLine: ProjectSubLine;
  subLineLabel: string;
  visibleColumns: ProjectColumn[];
  onUpdateSubLineField: (
    parentId: string,
    subLineId: string,
    field: ProjectSubLineField,
    value: string
  ) => void;
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
        'project-sheet__cell project-sheet__cell--progress project-sheet__subline-progress-cell' +
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

export function ProjectSubLineRow({
  isEditMode,
  isLast,
  isZh,
  parentId,
  subLine,
  subLineLabel,
  visibleColumns,
  onUpdateSubLineField,
}: ProjectSubLineRowProps) {
  return (
    <tr
      className={`project-sheet__sub-row ${isLast ? 'project-sheet__sub-row--last' : ''}`}
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
            <td
              key={column.field}
              className="project-sheet__cell project-sheet__cell--projectName project-sheet__subline-task-cell"
            >
              <span className="project-subline__task" title={`${subLineLabel}.${subLine.taskName}`}>
                {`${subLineLabel}.${subLine.taskName}`}
              </span>
            </td>
          );
        }

        if (column.field === 'contractAmount') {
          return (
            <td
              key={column.field}
              className="project-sheet__cell project-sheet__cell--contractAmount project-sheet__subline-status-cell"
            >
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
                    onUpdateSubLineField(parentId, subLine.id, 'status', nextValue)
                  }
                />
              ) : (
                <span className={getSubLineStatusClassName(subLine.status)}>{subLine.status}</span>
              )}
            </td>
          );
        }

        if (column.field === 'progress') {
          return renderSubLineWorkloadRatioCell(subLine.taskName, isZh, column.field);
        }

        if (column.field === 'detailDesign') {
          return (
            <td
              key={column.field}
              className="project-sheet__cell project-sheet__cell--detailDesign project-sheet__subline-detail-design-cell"
            >
              {isEditMode ? (
                <input
                  className="project-sheet__inline-input"
                  aria-label={isZh ? '细化设计' : 'Detail design'}
                  value={subLine.detailDesign}
                  onChange={(event) =>
                    onUpdateSubLineField(parentId, subLine.id, 'detailDesign', event.target.value)
                  }
                />
              ) : (
                <span className="project-subline__detail-design" title={subLine.detailDesign}>
                  {subLine.detailDesign}
                </span>
              )}
            </td>
          );
        }

        return (
          <td
            key={column.field}
            className={`project-sheet__cell project-sheet__cell--${column.field} project-sheet__subline-empty-cell`}
            aria-hidden="true"
          />
        );
      })}
      <td>
        <div className="project-sheet__row-actions" />
      </td>
    </tr>
  );
}
