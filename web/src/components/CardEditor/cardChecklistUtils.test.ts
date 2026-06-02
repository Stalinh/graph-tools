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

const nestedChecklistHtml = `
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="false">
      <label><input type="checkbox"></label>
      <div>
        <p>Parent task</p>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="true">
            <label><input type="checkbox" checked="checked"></label>
            <div><p>Nested done</p></div>
          </li>
          <li data-type="taskItem" data-checked="false">
            <label><input type="checkbox"></label>
            <div><p>Nested open</p></div>
          </li>
        </ul>
      </div>
    </li>
    <li data-type="taskItem" data-checked="false">
      <label><input type="checkbox"></label>
      <div><p>Sibling task</p></div>
    </li>
  </ul>
`;

const completedParentHtml = `
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="true">
      <label><input type="checkbox" checked="checked"></label>
      <div>
        <p>Completed parent</p>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false">
            <label><input type="checkbox"></label>
            <div><p>Surviving child</p></div>
          </li>
        </ul>
      </div>
    </li>
    <li data-type="taskItem" data-checked="false">
      <label><input type="checkbox"></label>
      <div><p>Open sibling</p></div>
    </li>
  </ul>
`;

describe("cardChecklistUtils", () => {
  it("extracts checklist tasks from card HTML", () => {
    expect(extractChecklistTasks(checklistHtml)).toEqual([
      { checked: true, depth: 0, index: 0, path: "0.0", text: "Done task" },
      { checked: false, depth: 0, index: 1, path: "0.1", text: "Open task" },
    ]);
  });

  it("extracts nested tasks with own text and stable paths", () => {
    expect(extractChecklistTasks(nestedChecklistHtml)).toEqual([
      { checked: false, depth: 0, index: 0, path: "0.0", text: "Parent task" },
      { checked: true, depth: 1, index: 1, path: "0.0.0", text: "Nested done" },
      { checked: false, depth: 1, index: 2, path: "0.0.1", text: "Nested open" },
      { checked: false, depth: 0, index: 3, path: "0.1", text: "Sibling task" },
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

  it("toggles nested tasks by path without changing their parent", () => {
    const checked = setChecklistTaskChecked(nestedChecklistHtml, "0.0.1", true);
    const tasks = extractChecklistTasks(checked ?? "");

    expect(tasks.map((task) => [task.text, task.checked])).toEqual([
      ["Parent task", false],
      ["Nested done", true],
      ["Nested open", true],
      ["Sibling task", false],
    ]);
  });

  it("updates all task states and clears completed tasks", () => {
    const unchecked = setAllChecklistTasksChecked(checklistHtml, false);
    expect(unchecked).not.toContain('checked="checked"');
    expect(extractChecklistTasks(unchecked ?? "").every((task) => !task.checked)).toBe(true);

    const cleared = clearCompletedChecklistTasks(checklistHtml);
    expect(cleared).not.toContain("Done task");
    expect(cleared).toContain("Open task");
  });

  it("clears completed nested tasks without dropping incomplete descendants", () => {
    const clearedNested = clearCompletedChecklistTasks(nestedChecklistHtml);
    expect(extractChecklistTasks(clearedNested ?? "").map((task) => [task.text, task.depth])).toEqual([
      ["Parent task", 0],
      ["Nested open", 1],
      ["Sibling task", 0],
    ]);

    const clearedParent = clearCompletedChecklistTasks(completedParentHtml);
    expect(extractChecklistTasks(clearedParent ?? "").map((task) => [task.text, task.depth])).toEqual([
      ["Surviving child", 0],
      ["Open sibling", 0],
    ]);
  });

  it("sorts incomplete tasks before completed tasks", () => {
    const sorted = sortChecklistTasks(checklistHtml);
    const tasks = extractChecklistTasks(sorted ?? "");

    expect(tasks.map((task) => task.text)).toEqual(["Open task", "Done task"]);
  });

  it("sorts nested task lists without moving tasks across levels", () => {
    const sorted = sortChecklistTasks(nestedChecklistHtml);
    const tasks = extractChecklistTasks(sorted ?? "");

    expect(tasks.map((task) => [task.text, task.depth])).toEqual([
      ["Parent task", 0],
      ["Nested open", 1],
      ["Nested done", 1],
      ["Sibling task", 0],
    ]);
  });
});
