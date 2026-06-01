import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Palette,
  Quote,
  Terminal,
} from "lucide-react";
import { getDefaultCardTitle } from "../../i18n";
import type { ShortcutItem, SlashCommandItem } from "./richEditorTypes";

export const DEFAULT_CARD_TITLES = new Set([
  getDefaultCardTitle("zh-CN"),
  getDefaultCardTitle("en-US"),
]);

export function getTextColors(isZh: boolean) {
  return [
    { label: isZh ? "默认" : "Default", value: "" },
    { label: isZh ? "红色" : "Red", value: "#c0392b" },
    { label: isZh ? "橙色" : "Orange", value: "#d35400" },
    { label: isZh ? "黄色" : "Yellow", value: "#7d6608" },
    { label: isZh ? "绿色" : "Green", value: "#1e8449" },
    { label: isZh ? "蓝色" : "Blue", value: "#2471a3" },
    { label: isZh ? "紫色" : "Purple", value: "#7d3c98" },
  ];
}

export function getHighlightColors(isZh: boolean) {
  return [
    { label: isZh ? "无" : "None", value: "" },
    { label: isZh ? "黄色" : "Yellow", value: "#fef08a" },
    { label: isZh ? "绿色" : "Green", value: "#bbf7d0" },
    { label: isZh ? "蓝色" : "Blue", value: "#bfdbfe" },
    { label: isZh ? "紫色" : "Purple", value: "#e9d5ff" },
    { label: isZh ? "橙色" : "Orange", value: "#fed7aa" },
    { label: isZh ? "红色" : "Red", value: "#fecaca" },
  ];
}

export function getSlashCommands(isZh: boolean): SlashCommandItem[] {
  return [
    {
      id: "todo",
      title: isZh ? "待办清单" : "Checklist",
      subtitle: isZh ? "创建任务或待办列表" : "Create a checklist",
      keywords: ["todo", "task", "checklist", "daiban", "renwu"],
      icon: ListTodo,
      action: (chain) => chain.toggleTaskList(),
    },
    {
      id: "bullet-list",
      title: isZh ? "无序列表" : "Bulleted list",
      subtitle: isZh ? "创建无序项目列表" : "Create an unordered list",
      keywords: ["bullet", "list", "wuxu", "liebiao"],
      icon: List,
      action: (chain) => chain.toggleBulletList(),
    },
    {
      id: "ordered-list",
      title: isZh ? "有序列表" : "Numbered list",
      subtitle: isZh ? "创建带序号的项目列表" : "Create an ordered list",
      keywords: ["ordered", "list", "youxu", "liebiao"],
      icon: ListOrdered,
      action: (chain) => chain.toggleOrderedList(),
    },
    {
      id: "heading-1",
      title: isZh ? "标题 1" : "Heading 1",
      subtitle: isZh ? "主标题级字号" : "Primary heading size",
      keywords: ["h1", "heading", "1", "biaoti", "da"],
      icon: Heading1,
      action: (chain) => chain.toggleHeading({ level: 1 }),
    },
    {
      id: "heading-2",
      title: isZh ? "标题 2" : "Heading 2",
      subtitle: isZh ? "副标题级字号" : "Secondary heading size",
      keywords: ["h2", "heading", "2", "biaoti", "zhong"],
      icon: Heading2,
      action: (chain) => chain.toggleHeading({ level: 2 }),
    },
    {
      id: "heading-3",
      title: isZh ? "标题 3" : "Heading 3",
      subtitle: isZh ? "小标题级字号" : "Compact heading size",
      keywords: ["h3", "heading", "3", "biaoti", "xiao"],
      icon: Heading3,
      action: (chain) => chain.toggleHeading({ level: 3 }),
    },
    {
      id: "blockquote",
      title: isZh ? "段落引用" : "Quote block",
      subtitle: isZh ? "插入灰底引用边框" : "Insert a quoted block",
      keywords: ["quote", "blockquote", "yinyong"],
      icon: Quote,
      action: (chain) => chain.toggleBlockquote(),
    },
    {
      id: "codeblock",
      title: isZh ? "代码块" : "Code block",
      subtitle: isZh ? "插入多行代码区块" : "Insert a multi-line code block",
      keywords: ["codeblock", "code", "block", "daima", "kuai"],
      icon: Terminal,
      action: (chain) => chain.toggleCodeBlock(),
    },
    {
      id: "divider",
      title: isZh ? "分割线" : "Divider",
      subtitle: isZh ? "插入水平分割虚线" : "Insert a horizontal divider",
      keywords: ["divider", "hr", "line", "fengexian"],
      icon: Minus,
      action: (chain) => chain.setHorizontalRule(),
    },
    {
      id: "code-inline",
      title: isZh ? "行内代码" : "Inline code",
      subtitle: isZh ? "突出显示文字背景" : "Highlight inline code text",
      keywords: ["code", "inline", "hangnei", "daima"],
      icon: Code,
      action: (chain) => chain.toggleCode(),
    },
    {
      id: "color-red",
      title: isZh ? "红色文字" : "Red text",
      subtitle: isZh ? "改变选中文字颜色为红色" : "Set selection color to red",
      keywords: ["red", "color", "hongse", "ziti", "yanse"],
      icon: Palette,
      action: (chain) => chain.setColor("#c0392b"),
    },
    {
      id: "color-blue",
      title: isZh ? "蓝色文字" : "Blue text",
      subtitle: isZh ? "改变选中文字颜色为蓝色" : "Set selection color to blue",
      keywords: ["blue", "color", "lanse", "ziti", "yanse"],
      icon: Palette,
      action: (chain) => chain.setColor("#2471a3"),
    },
    {
      id: "color-green",
      title: isZh ? "绿色文字" : "Green text",
      subtitle: isZh ? "改变选中文字颜色为绿色" : "Set selection color to green",
      keywords: ["green", "color", "lvse", "ziti", "yanse"],
      icon: Palette,
      action: (chain) => chain.setColor("#1e8449"),
    },
    {
      id: "highlight-yellow",
      title: isZh ? "黄色高亮" : "Yellow highlight",
      subtitle: isZh ? "黄色背景标记选中文本" : "Mark the selection with a yellow background",
      keywords: ["highlight", "yellow", "huangse", "gaoliang"],
      icon: Highlighter,
      action: (chain) => chain.toggleHighlight({ color: "#fef08a" }),
    },
    {
      id: "highlight-green",
      title: isZh ? "绿色高亮" : "Green highlight",
      subtitle: isZh ? "绿色背景标记选中文本" : "Mark the selection with a green background",
      keywords: ["highlight", "green", "lvse", "gaoliang"],
      icon: Highlighter,
      action: (chain) => chain.toggleHighlight({ color: "#bbf7d0" }),
    },
  ];
}

export function getShortcutCategories(isZh: boolean): Record<string, string> {
  return {
    general: isZh ? "常用操作" : "General",
    formatting: isZh ? "富文本排版" : "Formatting",
    checklist: isZh ? "待办清单" : "Checklist",
    slash: isZh ? "斜杠指令" : "Slash commands",
  };
}

export const SHORTCUT_ITEMS: ShortcutItem[] = [
  {
    id: "save-changes",
    category: "general",
    description: "保存并关闭编辑器",
    keys: ["⌘ / Ctrl", "S"],
    keywords: ["save", "baocun", "guanbi", "close", "保存", "关闭"],
  },
  {
    id: "save-enter",
    category: "general",
    description: "保存并关闭编辑器 (替代)",
    keys: ["⌘ / Ctrl", "Enter"],
    keywords: ["save", "baocun", "enter", "保存", "回车"],
  },
  {
    id: "close-editor",
    category: "general",
    description: "取消并关闭编辑器",
    keys: ["Esc"],
    keywords: ["cancel", "close", "quxiao", "guanbi", "取消", "关闭", "esc"],
  },
  {
    id: "toggle-help",
    category: "general",
    description: "打开 / 关闭快捷键帮助",
    keys: ["⌘ / Ctrl", "/"],
    keywords: ["help", "shortcut", "bangzhu", "kuaijiejian", "帮助", "快捷键", "/"],
  },
  {
    id: "bold",
    category: "formatting",
    description: "加粗选中文本",
    keys: ["⌘ / Ctrl", "B"],
    keywords: ["bold", "jiacu", "加粗", "b"],
  },
  {
    id: "italic",
    category: "formatting",
    description: "斜体选中文本",
    keys: ["⌘ / Ctrl", "I"],
    keywords: ["italic", "xieti", "斜体", "i"],
  },
  {
    id: "underline",
    category: "formatting",
    description: "下划线选中文本",
    keys: ["⌘ / Ctrl", "U"],
    keywords: ["underline", "xiahuaxian", "下划线", "u"],
  },
  {
    id: "inline-code",
    category: "formatting",
    description: "行内代码样式",
    keys: ["⌘ / Ctrl", "E"],
    keywords: ["code", "inline", "hangnei", "daima", "代码", "e"],
  },
  {
    id: "undo",
    category: "formatting",
    description: "撤销操作",
    keys: ["⌘ / Ctrl", "Z"],
    keywords: ["undo", "chexiao", "撤销", "z"],
  },
  {
    id: "redo",
    category: "formatting",
    description: "重做操作",
    keys: ["⌘ / Ctrl", "Shift", "Z"],
    keywords: ["redo", "zhongzuo", "重做", "shift", "z"],
  },
  {
    id: "checklist-create",
    category: "checklist",
    description: "自动创建待办列表",
    keys: ["[", "]", "Space"],
    keywords: ["todo", "checklist", "daiban", "renwu", "待办", "任务", "[]"],
  },
  {
    id: "checklist-toggle",
    category: "checklist",
    description: "勾选 / 取消当前行待办",
    keys: ["Alt", "Enter"],
    keywords: ["toggle", "check", "uncheck", "alt", "enter", "勾选", "取消"],
  },
  {
    id: "checklist-toggle-cmd",
    category: "checklist",
    description: "勾选 / 取消当前行待办 (替代)",
    keys: ["⌘ / Ctrl", "D"],
    keywords: ["toggle", "check", "uncheck", "d", "cmd", "ctrl", "勾选", "取消"],
  },
  {
    id: "list-indent",
    category: "checklist",
    description: "增加列表缩进",
    keys: ["Tab"],
    keywords: ["indent", "suojin", "tab", "缩进", "右移"],
  },
  {
    id: "list-outdent",
    category: "checklist",
    description: "减少列表缩进",
    keys: ["Shift", "Tab"],
    keywords: ["outdent", "suojin", "shift", "tab", "缩进", "左移"],
  },
  {
    id: "slash-trigger",
    category: "slash",
    description: "唤起 Notion 式命令菜单",
    keys: ["/"],
    keywords: ["slash", "menu", "notion", "caidan", "mulu", "目录", "菜单", "/"],
  },
  {
    id: "slash-navigate",
    category: "slash",
    description: "上下选择菜单项",
    keys: ["↑", "↓"],
    keywords: ["navigate", "arrow", "up", "down", "上下", "方向键"],
  },
  {
    id: "slash-confirm",
    category: "slash",
    description: "确认执行菜单项命令",
    keys: ["Enter", "Tab"],
    keywords: ["confirm", "select", "enter", "tab", "确认", "选择", "回车"],
  },
  {
    id: "slash-close",
    category: "slash",
    description: "关闭命令菜单",
    keys: ["Esc"],
    keywords: ["close", "dismiss", "esc", "关闭", "取消", "esc"],
  },
];

export function getShortcutDescription(id: string, isZh: boolean) {
  const labels: Record<string, { zh: string; en: string }> = {
    "save-changes": { zh: "保存并关闭编辑器", en: "Save and close the editor" },
    "save-enter": { zh: "保存并关闭编辑器 (替代)", en: "Save and close the editor (alternate)" },
    "close-editor": { zh: "取消并关闭编辑器", en: "Cancel and close the editor" },
    "toggle-help": { zh: "打开 / 关闭快捷键帮助", en: "Open or close shortcut help" },
    bold: { zh: "加粗选中文本", en: "Bold selected text" },
    italic: { zh: "斜体选中文本", en: "Italicize selected text" },
    underline: { zh: "下划线选中文本", en: "Underline selected text" },
    "inline-code": { zh: "行内代码样式", en: "Apply inline code style" },
    undo: { zh: "撤销操作", en: "Undo the last action" },
    redo: { zh: "重做操作", en: "Redo the last action" },
    "checklist-create": { zh: "自动创建待办列表", en: "Create a checklist automatically" },
    "checklist-toggle": { zh: "勾选 / 取消当前行待办", en: "Toggle the current checklist item" },
    "checklist-toggle-cmd": {
      zh: "勾选 / 取消当前行待办 (替代)",
      en: "Toggle the current checklist item (alternate)",
    },
    "list-indent": { zh: "增加列表缩进", en: "Indent the current list item" },
    "list-outdent": { zh: "减少列表缩进", en: "Outdent the current list item" },
    "slash-trigger": { zh: "唤起 Notion 式命令菜单", en: "Open the slash command menu" },
    "slash-navigate": { zh: "上下选择菜单项", en: "Move through slash menu items" },
    "slash-confirm": { zh: "确认执行菜单项命令", en: "Run the selected slash command" },
    "slash-close": { zh: "关闭命令菜单", en: "Close the slash command menu" },
  };

  const label = labels[id];
  return label ? (isZh ? label.zh : label.en) : id;
}
