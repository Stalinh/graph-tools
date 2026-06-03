import { PROJECT_COLUMNS } from './projectConfig';

interface ProjectColumnMenuProps {
  hiddenColumns: Set<string>;
  isZh: boolean;
  position: {
    x: number;
    y: number;
  };
  onClose: () => void;
  onToggleColumnVisibility: (field: string) => void;
}

export function ProjectColumnMenu({
  hiddenColumns,
  isZh,
  position,
  onClose,
  onToggleColumnVisibility,
}: ProjectColumnMenuProps) {
  return (
    <>
      <div className="project-sheet__context-menu-backdrop" onClick={onClose} />
      <div
        className="project-sheet__context-menu"
        style={{ top: position.y, left: position.x }}
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
              onClick={() => onToggleColumnVisibility(column.field)}
            >
              <input type="checkbox" checked={isVisible} disabled={isProjectName} readOnly />
              <span>{isZh ? column.labelZh : column.labelEn}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
