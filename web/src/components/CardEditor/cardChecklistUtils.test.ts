/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  appendChecklistTask,
  clearCompletedChecklistTasks,
  extractChecklistTasks,
  setAllChecklistTasksChecked,
  setChecklistTaskChecked,
  sortChecklistTasks,
} from "./cardChecklistUtils";

const checklistHtml = `
  <p>Intro</p>
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="true">
      <label><input type="checkbox" checked="checked"></label>
      <div><p>Done task</p></div>
    </li>
    <li data-type="taskItem" data-checked="false">
      <label><input type="checkbox"></label>
      <div><p>Open task</p></div>
    </li>
  </ul>
`;

describe("cardChecklistUtils", () => {
  it("extracts checklist tasks from card HTML", () => {
    expect(extractChecklistTasks(checklistHtml)).toEqual([
      { checked: true, index: 0, text: "Done task" },
      { checked: false, index: 1, text: "Open task" },
    ]);
  });

  it("adds and toggles checklist tasks", () => {
    const withTask = appendChecklistTask("<p>Body</p>", "New task");
    expect(withTask).toContain('data-type="taskList"');
    expect(withTask).toContain("New task");

    const checked = setChecklistTaskChecked(withTask ?? "", 0, true);
    expect(checked).toContain('data-checked="true"');
    expect(checked).toContain('checked="checked"');
  });

  it("updates all task states and clears completed tasks", () => {
    const unchecked = setAllChecklistTasksChecked(checklistHtml, false);
    expect(unchecked).not.toContain('checked="checked"');
    expect(extractChecklistTasks(unchecked ?? "").every((task) => !task.checked)).toBe(true);

    const cleared = clearCompletedChecklistTasks(checklistHtml);
    expect(cleared).not.toContain("Done task");
    expect(cleared).toContain("Open task");
  });

  it("sorts incomplete tasks before completed tasks", () => {
    const sorted = sortChecklistTasks(checklistHtml);
    const tasks = extractChecklistTasks(sorted ?? "");

    expect(tasks.map((task) => task.text)).toEqual(["Open task", "Done task"]);
  });
});
