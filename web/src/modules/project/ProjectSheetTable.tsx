import type { MouseEvent } from 'react';
import { Fragment, useState } from 'react';
import { PROJECT_COLUMNS } from './projectConfig';
import { ProjectColumnMenu } from './ProjectColumnMenu';
import { ProjectMainRow } from './ProjectMainRow';
import { ProjectSubLineRow } from './ProjectSubLineRow';
import type { ProjectRecord, ProjectRecordField, ProjectSubLineField } from './projectTypes';

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

  const handleHeaderContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      open: true,
    });
  };

  return (
    <div
      className="project-sheet"
      role="region"
      aria-label={isZh ? '项目管理表' : 'Project management table'}
    >
      {contextMenu.open && (
        <ProjectColumnMenu
          hiddenColumns={hiddenColumns}
          isZh={isZh}
          position={contextMenu}
          onClose={() => setContextMenu({ x: 0, y: 0, open: false })}
          onToggleColumnVisibility={toggleColumnVisibility}
        />
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
            const isExpanded = expandedProjectIds.has(record.id);
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
                <ProjectMainRow
                  copied={copiedRecordId === record.id}
                  downloaded={downloadedRecordId === record.id}
                  isEditMode={isEditMode}
                  isExpanded={isExpanded}
                  isZh={isZh}
                  record={record}
                  visibleColumns={visibleColumns}
                  onCommitProjectField={onCommitProjectField}
                  onCopy={() => handleCopy(record.id)}
                  onDownload={() => handleDownload(record.id)}
                  onRemoveRecord={onRemoveRecord}
                  onToggleProjectExpanded={onToggleProjectExpanded}
                  onUpdateProjectField={onUpdateProjectField}
                />
                {isExpanded
                  ? record.subLines.map((subLine, subLineIndex) => (
                      <ProjectSubLineRow
                        key={subLine.id}
                        isEditMode={isEditMode}
                        isLast={subLineIndex === record.subLines.length - 1}
                        isZh={isZh}
                        parentId={record.id}
                        subLine={subLine}
                        subLineLabel={subLineLabels[subLineIndex]}
                        visibleColumns={visibleColumns}
                        onUpdateSubLineField={onUpdateSubLineField}
                      />
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
