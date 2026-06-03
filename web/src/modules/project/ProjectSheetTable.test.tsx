/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createProjectRecord, createProjectSubLine } from './projectModel';
import { ProjectSheetTable } from './ProjectSheetTable';

function renderTable(records = [createProjectRecord({ projectName: 'P1' })], isEditMode = false) {
  return render(
    <ProjectSheetTable
      expandedProjectIds={new Set(records.map((r) => r.id))}
      isEditMode={isEditMode}
      isZh
      records={records}
      onCommitProjectField={vi.fn()}
      onRemoveRecord={vi.fn()}
      onToggleProjectExpanded={vi.fn()}
      onUpdateProjectField={vi.fn()}
      onUpdateSubLineField={vi.fn()}
    />
  );
}

describe('ProjectSheetTable workload ratio column', () => {
  it('does not render a standalone workload ratio column header', () => {
    renderTable();
    expect(screen.queryByRole('columnheader', { name: '工作量占比' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: '进度' })).toBeTruthy();
  });

  it('renders the ratio for sublines with a registered task name', () => {
    const record = createProjectRecord({
      projectName: 'P2',
      subLines: [createProjectSubLine({ taskName: '主机设备' })],
    });
    renderTable([record]);
    const subRow = screen.getByTitle('1.主机设备').closest('tr');
    expect(subRow).toBeTruthy();
    expect(within(subRow!).getByText('11%')).toBeTruthy();
  });

  it('does not render a workload ratio value for the main row', () => {
    const record = createProjectRecord({
      lineNo: '1',
      projectName: 'P2',
      subLines: [createProjectSubLine({ taskName: '主机设备' })],
    });
    renderTable([record]);
    const projectRow = screen.getByTitle('1').closest('tr');
    expect(projectRow).toBeTruthy();
    expect(within(projectRow!).queryByText('—')).toBeNull();
    expect(within(projectRow!).queryByText('11%')).toBeNull();
  });

  it("renders 'error' for sublines with an unregistered task name", () => {
    const record = createProjectRecord({
      projectName: 'P3',
      subLines: [createProjectSubLine({ taskName: '未注册任务' })],
    });
    renderTable([record]);
    const subRow = screen.getByTitle('1.未注册任务').closest('tr');
    expect(subRow).toBeTruthy();
    const cell = within(subRow!).getByText('error');
    expect(cell.className).toContain('project-sheet__subline-progress-cell--missing');
  });

  it('does not expose subline add or delete actions in edit mode', () => {
    const record = createProjectRecord({
      projectName: 'P4',
      subLines: [createProjectSubLine({ taskName: '主机设备' })],
    });

    renderTable([record], true);

    expect(screen.queryByRole('button', { name: '新增子行' })).toBeNull();
    expect(screen.queryByRole('button', { name: '删除子行' })).toBeNull();
    expect(screen.getByRole('button', { name: '删除项目' })).toBeTruthy();
  });
});
