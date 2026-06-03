export interface SidebarTaskItem {
  checked: boolean;
  depth: number;
  index: number;
  path: string;
  text: string;
}

const TASK_LIST_SELECTOR = 'ul[data-type="taskList"]';
const TASK_ITEM_SELECTOR = 'li[data-type="taskItem"]';

function createContentDocument(html: string) {
  const parser = new DOMParser();
  return parser.parseFromString(html || '<p></p>', 'text/html');
}

function syncTaskCheckbox(item: Element, checked: boolean) {
  item.setAttribute('data-checked', checked ? 'true' : 'false');
  const checkbox = getOwnTaskCheckbox(item);
  if (!checkbox) {
    return;
  }

  if (checked) {
    checkbox.setAttribute('checked', 'checked');
  } else {
    checkbox.removeAttribute('checked');
  }
}

function getOwnTaskCheckbox(item: Element) {
  for (const child of Array.from(item.children)) {
    if (child instanceof HTMLInputElement && child.type === 'checkbox') {
      return child;
    }

    if (child instanceof HTMLLabelElement) {
      const checkbox = child.querySelector('input[type="checkbox"]');
      if (checkbox instanceof HTMLInputElement) {
        return checkbox;
      }
    }
  }

  return null;
}

function getDirectTaskItems(list: Element) {
  return Array.from(list.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.matches(TASK_ITEM_SELECTOR)
  );
}

function getRootTaskLists(doc: Document) {
  return Array.from(doc.querySelectorAll(TASK_LIST_SELECTOR)).filter(
    (list): list is HTMLElement => list instanceof HTMLElement && !list.closest(TASK_ITEM_SELECTOR)
  );
}

function getDirectNestedTaskLists(item: Element) {
  return Array.from(item.querySelectorAll(TASK_LIST_SELECTOR)).filter(
    (list): list is HTMLElement =>
      list instanceof HTMLElement && list.closest(TASK_ITEM_SELECTOR) === item
  );
}

function getTaskItemText(item: Element) {
  const body = Array.from(item.children).find(
    (child) => child instanceof HTMLElement && child.tagName.toLowerCase() === 'div'
  );
  const textSource = (body || item).cloneNode(true);
  if (!(textSource instanceof HTMLElement)) {
    return '';
  }

  textSource.querySelectorAll(TASK_LIST_SELECTOR).forEach((list) => list.remove());
  textSource.querySelectorAll('label, input').forEach((control) => control.remove());
  return textSource.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function createTaskPath(pathSegments: number[]) {
  return pathSegments.join('.');
}

function parseTaskPath(path: string) {
  const segments = path.split('.').map((segment) => Number(segment));
  if (
    segments.length < 2 ||
    segments.some((segment) => !Number.isInteger(segment) || segment < 0)
  ) {
    return null;
  }

  return segments;
}

function collectChecklistTaskItems(
  list: Element,
  listPath: number[],
  depth: number,
  tasks: Array<{ depth: number; item: HTMLElement; path: string }>
) {
  getDirectTaskItems(list).forEach((item, itemIndex) => {
    const itemPath = [...listPath, itemIndex];
    tasks.push({
      depth,
      item,
      path: createTaskPath(itemPath),
    });

    getDirectNestedTaskLists(item).forEach((nestedList) => {
      collectChecklistTaskItems(nestedList, itemPath, depth + 1, tasks);
    });
  });
}

function getChecklistTaskItems(doc: Document) {
  const tasks: Array<{ depth: number; item: HTMLElement; path: string }> = [];
  getRootTaskLists(doc).forEach((list, listIndex) => {
    collectChecklistTaskItems(list, [listIndex], 0, tasks);
  });
  return tasks;
}

function findTaskItemByPath(doc: Document, path: string) {
  const segments = parseTaskPath(path);
  if (!segments) {
    return null;
  }

  let list = getRootTaskLists(doc)[segments[0]];
  if (!list) {
    return null;
  }

  let item: HTMLElement | undefined;
  for (let segmentIndex = 1; segmentIndex < segments.length; segmentIndex += 1) {
    item = getDirectTaskItems(list)[segments[segmentIndex]];
    if (!item) {
      return null;
    }

    if (segmentIndex < segments.length - 1) {
      list = getDirectNestedTaskLists(item)[0];
      if (!list) {
        return null;
      }
    }
  }

  return item || null;
}

function findTaskItem(doc: Document, taskLocator: number | string) {
  if (typeof taskLocator === 'string') {
    return findTaskItemByPath(doc, taskLocator);
  }

  const item = doc.querySelectorAll(TASK_ITEM_SELECTOR)[taskLocator];
  return item instanceof HTMLElement ? item : null;
}

function pruneEmptyTaskLists(doc: Document) {
  Array.from(doc.querySelectorAll(TASK_LIST_SELECTOR))
    .reverse()
    .forEach((list) => {
      if (getDirectTaskItems(list).length === 0) {
        list.remove();
      }
    });
}

function promoteNestedTasksBeforeItem(item: HTMLElement) {
  const parent = item.parentElement;
  if (!parent) {
    return;
  }

  getDirectNestedTaskLists(item).forEach((nestedList) => {
    getDirectTaskItems(nestedList).forEach((nestedItem) => {
      parent.insertBefore(nestedItem, item);
    });
  });
}

export function extractChecklistTasks(html: string): SidebarTaskItem[] {
  if (!html) return [];
  const doc = createContentDocument(html);
  return getChecklistTaskItems(doc).map(({ depth, item, path }, index) => {
    const checked = item.getAttribute('data-checked') === 'true';
    const text = getTaskItemText(item);
    return { checked, depth, index, path, text };
  });
}

export function setChecklistTaskChecked(
  html: string,
  taskLocator: number | string,
  checked: boolean
) {
  const doc = createContentDocument(html);
  const item = findTaskItem(doc, taskLocator);
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
  let taskList = getRootTaskLists(doc)[0];
  if (!taskList) {
    taskList = doc.createElement('ul');
    taskList.setAttribute('data-type', 'taskList');
    doc.body.appendChild(taskList);
  }

  const item = doc.createElement('li');
  item.setAttribute('data-type', 'taskItem');
  item.setAttribute('data-checked', 'false');

  const label = doc.createElement('label');
  const input = doc.createElement('input');
  input.setAttribute('type', 'checkbox');
  label.appendChild(input);
  item.appendChild(label);

  const body = doc.createElement('div');
  const paragraph = doc.createElement('p');
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
  const items = Array.from(doc.querySelectorAll(TASK_ITEM_SELECTOR)).filter(
    (item): item is HTMLElement => item instanceof HTMLElement
  );
  let hasChanges = false;

  items.reverse().forEach((item) => {
    const checked = item.getAttribute('data-checked') === 'true';
    if (!checked) {
      return;
    }

    promoteNestedTasksBeforeItem(item);
    item.remove();
    hasChanges = true;
  });

  if (hasChanges) {
    pruneEmptyTaskLists(doc);
  }

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

    const checkedStates = items.map((item) => item.getAttribute('data-checked') === 'true');
    const isSorted = checkedStates.every(
      (checked, index) => index === checkedStates.length - 1 || !checked || checkedStates[index + 1]
    );
    if (isSorted) {
      return;
    }

    const sorted = [...items].sort((a, b) => {
      const aChecked = a.getAttribute('data-checked') === 'true';
      const bChecked = b.getAttribute('data-checked') === 'true';
      if (aChecked === bChecked) return 0;
      return aChecked ? 1 : -1;
    });

    list.innerHTML = '';
    sorted.forEach((item) => list.appendChild(item));
    hasChanges = true;
  });

  return hasChanges ? doc.body.innerHTML : null;
}
