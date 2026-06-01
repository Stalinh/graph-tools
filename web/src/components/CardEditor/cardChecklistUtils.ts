export interface SidebarTaskItem {
  checked: boolean;
  index: number;
  text: string;
}

const TASK_LIST_SELECTOR = 'ul[data-type="taskList"]';
const TASK_ITEM_SELECTOR = 'li[data-type="taskItem"]';

function createContentDocument(html: string) {
  const parser = new DOMParser();
  return parser.parseFromString(html || "<p></p>", "text/html");
}

function syncTaskCheckbox(item: Element, checked: boolean) {
  item.setAttribute("data-checked", checked ? "true" : "false");
  const checkbox = item.querySelector('input[type="checkbox"]');
  if (!checkbox) {
    return;
  }

  if (checked) {
    checkbox.setAttribute("checked", "checked");
  } else {
    checkbox.removeAttribute("checked");
  }
}

function getDirectTaskItems(list: Element) {
  return Array.from(list.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.matches(TASK_ITEM_SELECTOR)
  );
}

export function extractChecklistTasks(html: string): SidebarTaskItem[] {
  if (!html) return [];
  const doc = createContentDocument(html);
  const items = doc.querySelectorAll(TASK_ITEM_SELECTOR);
  return Array.from(items).map((item, index) => {
    const checked = item.getAttribute("data-checked") === "true";
    const textDiv = item.querySelector("div") || item;
    const text = textDiv.textContent?.trim() || "";
    return { index, text, checked };
  });
}

export function setChecklistTaskChecked(
  html: string,
  indexToToggle: number,
  checked: boolean
) {
  const doc = createContentDocument(html);
  const item = doc.querySelectorAll(TASK_ITEM_SELECTOR)[indexToToggle];
  if (!item) {
    return null;
  }

  syncTaskCheckbox(item, checked);
  return doc.body.innerHTML;
}

export function appendChecklistTask(html: string, text: string) {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return null;
  }

  const doc = createContentDocument(html);
  let taskList = doc.querySelector(TASK_LIST_SELECTOR);
  if (!taskList) {
    taskList = doc.createElement("ul");
    taskList.setAttribute("data-type", "taskList");
    doc.body.appendChild(taskList);
  }

  const item = doc.createElement("li");
  item.setAttribute("data-type", "taskItem");
  item.setAttribute("data-checked", "false");

  const label = doc.createElement("label");
  const input = doc.createElement("input");
  input.setAttribute("type", "checkbox");
  label.appendChild(input);
  item.appendChild(label);

  const body = doc.createElement("div");
  const paragraph = doc.createElement("p");
  paragraph.textContent = trimmedText;
  body.appendChild(paragraph);
  item.appendChild(body);

  taskList.appendChild(item);
  return doc.body.innerHTML;
}

export function setAllChecklistTasksChecked(html: string, checked: boolean) {
  const doc = createContentDocument(html);
  const items = doc.querySelectorAll(TASK_ITEM_SELECTOR);
  if (items.length === 0) {
    return null;
  }

  items.forEach((item) => syncTaskCheckbox(item, checked));
  return doc.body.innerHTML;
}

export function clearCompletedChecklistTasks(html: string) {
  const doc = createContentDocument(html);
  const items = doc.querySelectorAll(TASK_ITEM_SELECTOR);
  let hasChanges = false;

  items.forEach((item) => {
    const checked = item.getAttribute("data-checked") === "true";
    if (!checked) {
      return;
    }

    const parent = item.parentElement;
    item.remove();
    hasChanges = true;
    if (parent && parent.matches(TASK_LIST_SELECTOR) && parent.children.length === 0) {
      parent.remove();
    }
  });

  return hasChanges ? doc.body.innerHTML : null;
}

export function sortChecklistTasks(html: string) {
  const doc = createContentDocument(html);
  const lists = doc.querySelectorAll(TASK_LIST_SELECTOR);
  let hasChanges = false;

  lists.forEach((list) => {
    const items = getDirectTaskItems(list);
    if (items.length <= 1) {
      return;
    }

    const checkedStates = items.map((item) => item.getAttribute("data-checked") === "true");
    const isSorted = checkedStates.every(
      (checked, index) => index === checkedStates.length - 1 || !checked || checkedStates[index + 1]
    );
    if (isSorted) {
      return;
    }

    const sorted = [...items].sort((a, b) => {
      const aChecked = a.getAttribute("data-checked") === "true";
      const bChecked = b.getAttribute("data-checked") === "true";
      if (aChecked === bChecked) return 0;
      return aChecked ? 1 : -1;
    });

    list.innerHTML = "";
    sorted.forEach((item) => list.appendChild(item));
    hasChanges = true;
  });

  return hasChanges ? doc.body.innerHTML : null;
}
