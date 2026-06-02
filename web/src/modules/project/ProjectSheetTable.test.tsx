/**
 * @vitest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createProjectRecord, createProjectSubLine } from "./projectModel";
import { ProjectSheetTable } from "./ProjectSheetTable";

function renderTable(records = [createProjectRecord({ projectName: "P1" })]) {
  return render(
    <ProjectSheetTable
      expandedProjectIds={new Set(records.map((r) => r.id))}
      isEditMode={false}
      isZh
      records={records}
      onAddSubLineRecord={vi.fn()}
      onCommitProjectField={vi.fn()}
      onRemoveRecord={vi.fn()}
      onRemoveSubLine={vi.fn()}
      onToggleProjectExpanded={vi.fn()}
      onUpdateProjectField={vi.fn()}
      onUpdateSubLineField={vi.fn()}
    />
  );
}

describe("ProjectSheetTable workload ratio column", () => {
  it("renders the workload ratio column header", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: "工作量占比" })).toBeTruthy();
  });

  it("renders the ratio for sublines with a registered task name", () => {
    const record = createProjectRecord({
      projectName: "P2",
      subLines: [createProjectSubLine({ taskName: "主机设备" })],
    });
    renderTable([record]);
    const subRow = screen.getByTitle("主机设备").closest("tr");
    expect(subRow).toBeTruthy();
    expect(within(subRow!).getByText("11%")).toBeTruthy();
  });

  it("renders 'error' for sublines with an unregistered task name", () => {
    const record = createProjectRecord({
      projectName: "P3",
      subLines: [createProjectSubLine({ taskName: "未注册任务" })],
    });
    renderTable([record]);
    const subRow = screen.getByTitle("未注册任务").closest("tr");
    expect(subRow).toBeTruthy();
    const cell = within(subRow!).getByText("error");
    expect(cell.className).toContain("project-sheet__subline-workload-ratio-cell--missing");
  });
});
