import ColorExtension from "@tiptap/extension-color";
import HighlightExtension from "@tiptap/extension-highlight";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  Strikethrough,
  Underline as UnderlineIcon,
  X,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Terminal,
  Minus,
  ListTodo,
  Undo,
  Redo,
  FileText,
  Pilcrow,
  Eraser,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDefaultCardTitle, useI18n } from "../i18n";

interface RichEditorModalProps {
  node: RichEditorNode;
  onSave: (node: RichEditorNode) => void;
  onClose: () => void;
}

interface RichEditorNode {
  id: string;
  type: "card" | "image" | "group";
  title: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  contentHtml?: string;
  references?: Array<{ id: string; title: string }>;
  customFields?: Array<{ id: string; value: string; field: string }>;
  locked?: boolean;
  opacity?: number;
  color?: string;
  parentId?: string;
  imagePath?: string;
}

const DEFAULT_CARD_TITLES = new Set([getDefaultCardTitle("zh-CN"), getDefaultCardTitle("en-US")]);

interface SlashCommandItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: LucideIcon;
  action: (chain: ChainedCommands) => ChainedCommands;
}

function getTextColors(isZh: boolean) {
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

function getHighlightColors(isZh: boolean) {
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

function getSlashCommands(isZh: boolean): SlashCommandItem[] {
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

interface ShortcutItem {
  id: string;
  category: "general" | "formatting" | "checklist" | "slash";
  description: string;
  keys: string[];
  keywords: string[];
}

function getShortcutCategories(isZh: boolean): Record<string, string> {
  return {
    general: isZh ? "常用操作" : "General",
    formatting: isZh ? "富文本排版" : "Formatting",
    checklist: isZh ? "待办清单" : "Checklist",
    slash: isZh ? "斜杠指令" : "Slash commands",
  };
}

const SHORTCUT_ITEMS: ShortcutItem[] = [
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

function getShortcutDescription(id: string, isZh: boolean) {
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
    "todo-create": { zh: "自动创建待办列表", en: "Create a checklist automatically" },
    "todo-toggle-enter": { zh: "勾选 / 取消当前行待办", en: "Toggle the current checklist item" },
    "todo-toggle-mod": {
      zh: "勾选 / 取消当前行待办 (替代)",
      en: "Toggle the current checklist item (alternate)",
    },
    indent: { zh: "增加列表缩进", en: "Indent the current list item" },
    outdent: { zh: "减少列表缩进", en: "Outdent the current list item" },
    "slash-open": { zh: "唤起 Notion 式命令菜单", en: "Open the slash command menu" },
    "slash-nav": { zh: "上下选择菜单项", en: "Move through slash menu items" },
    "slash-confirm": { zh: "确认执行菜单项命令", en: "Run the selected slash command" },
    "slash-close": { zh: "关闭命令菜单", en: "Close the slash command menu" },
  };

  const label = labels[id];
  return label ? (isZh ? label.zh : label.en) : id;
}

export function RichEditorModal({ node, onSave, onClose }: RichEditorModalProps) {
  const { isZh } = useI18n();
  const textColors = useMemo(() => getTextColors(isZh), [isZh]);
  const highlightColors = useMemo(() => getHighlightColors(isZh), [isZh]);
  const slashCommands = useMemo(() => getSlashCommands(isZh), [isZh]);
  const shortcutCategories = useMemo(() => getShortcutCategories(isZh), [isZh]);
  const [title, setTitle] = useState(node.title);
  const [initialFocusTarget, setInitialFocusTarget] = useState<"title" | "body" | null>(null);
  const [editorUpdateTrigger, setEditorUpdateTrigger] = useState(0);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const editorRef = useRef<Editor | null>(null);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState("");

  const isHelpOpenRef = useRef(false);
  useEffect(() => {
    isHelpOpenRef.current = isHelpOpen;
  }, [isHelpOpen]);

  const [slashMenu, setSlashMenu] = useState({
    isOpen: false,
    pos: 0,
    coords: { top: 0, left: 0 },
    query: "",
    activeIndex: 0,
  });

  const slashMenuRef = useRef({
    isOpen: false,
    activeIndex: 0,
    filteredCommands: [] as typeof slashCommands,
    query: "",
    pos: 0,
  });
  const slashMenuCheckTimerRef = useRef<number | null>(null);

  const filteredCommands = useMemo(() => {
    if (!slashMenu.isOpen) return [];
    const q = slashMenu.query.toLowerCase();
    return slashCommands.filter((cmd) => {
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q)) ||
        cmd.subtitle.toLowerCase().includes(q)
      );
    });
  }, [slashCommands, slashMenu.isOpen, slashMenu.query]);

  const filteredShortcuts = useMemo(() => {
    const q = helpSearch.trim().toLowerCase();
    if (!q) return SHORTCUT_ITEMS;
    return SHORTCUT_ITEMS.filter((item) => {
      const localizedDescription = getShortcutDescription(item.id, isZh).toLowerCase();
      return (
        localizedDescription.includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q)) ||
        shortcutCategories[item.category].toLowerCase().includes(q)
      );
    });
  }, [helpSearch, isZh, shortcutCategories]);

  // Keep ref synchronized
  useEffect(() => {
    slashMenuRef.current = {
      isOpen: slashMenu.isOpen,
      activeIndex: slashMenu.activeIndex,
      filteredCommands,
      query: slashMenu.query,
      pos: slashMenu.pos,
    };
  }, [slashMenu, filteredCommands]);

  const checkSlashMenu = useCallback((editorInstance: Editor) => {
    if (!editorInstance) return;
    const { state } = editorInstance;
    const { selection } = state;
    const { $from } = selection;

    // Only show slash commands in paragraph blocks and when selection is empty
    if (!selection.empty || $from.parent.type.name !== "paragraph") {
      setSlashMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      return;
    }

    const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset);
    // Regex matching a slash at the start of block or after a space, followed by alphanumeric query
    const match = /(?:^|\s)\/(\w*)$/.exec(textBeforeCursor);

    if (match) {
      const query = match[1];
      const coords = editorInstance.view.coordsAtPos(selection.from);
      if (coords) {
        setSlashMenu((prev) => {
          const q = query.toLowerCase();
          const itemsCount = slashCommands.filter((cmd) => {
            if (!q) return true;
            return (
              cmd.title.toLowerCase().includes(q) ||
              cmd.keywords.some((kw) => kw.includes(q)) ||
              cmd.subtitle.toLowerCase().includes(q)
            );
          }).length;

          // Estimate menu height: min(280, itemsCount * 48 + 8)
          const menuHeight = Math.min(280, itemsCount * 48 + 8);
          const viewportHeight = window.innerHeight;
          let top = coords.bottom + 4;
          if (top + menuHeight > viewportHeight) {
            top = Math.max(10, coords.top - menuHeight - 4);
          }

          const nextIndex = prev.isOpen
            ? Math.min(prev.activeIndex, Math.max(0, itemsCount - 1))
            : 0;

          return {
            isOpen: true,
            pos: selection.from,
            coords: { top, left: coords.left },
            query,
            activeIndex: nextIndex,
          };
        });
      }
    } else {
      setSlashMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    }
  }, []);

  const scheduleSlashMenuCheck = useCallback(
    (editorInstance: Editor) => {
      if (slashMenuCheckTimerRef.current !== null) {
        window.clearTimeout(slashMenuCheckTimerRef.current);
      }

      slashMenuCheckTimerRef.current = window.setTimeout(() => {
        slashMenuCheckTimerRef.current = null;
        checkSlashMenu(editorInstance);
      }, 0);
    },
    [checkSlashMenu]
  );

  useEffect(() => {
    return () => {
      if (slashMenuCheckTimerRef.current !== null) {
        window.clearTimeout(slashMenuCheckTimerRef.current);
      }
    };
  }, []);

  const handleKeyDownCapture = useCallback((event: React.KeyboardEvent) => {
    if (slashMenuRef.current.isOpen) {
      const { activeIndex, filteredCommands, pos, query } = slashMenuRef.current;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex =
          filteredCommands.length > 0 ? (activeIndex + 1) % filteredCommands.length : 0;
        setSlashMenu((prev) => ({ ...prev, activeIndex: nextIndex }));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const nextIndex =
          filteredCommands.length > 0
            ? (activeIndex - 1 + filteredCommands.length) % filteredCommands.length
            : 0;
        setSlashMenu((prev) => ({ ...prev, activeIndex: nextIndex }));
      } else if (event.key === "Enter" || event.key === "Tab") {
        const activeCmd = filteredCommands[activeIndex];
        if (activeCmd) {
          event.preventDefault();
          event.stopPropagation();
          const start = pos - query.length - 1;
          const ed = editorRef.current;
          if (ed) {
            const end = pos;
            const chain = ed.chain().focus().deleteRange({ from: start, to: end });
            activeCmd.action(chain).run();
          }
          setSlashMenu((prev) => ({ ...prev, isOpen: false }));
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSlashMenu((prev) => ({ ...prev, isOpen: false }));
      }
    }
  }, []);

  // We use refs to expose the save function inside useEditor callbacks
  // to avoid closure stale-state issues.
  const saveRef = useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      TextStyle.configure(),
      ColorExtension.configure(),
      HighlightExtension.configure({
        multicolor: true,
      }),
      PlaceholderExtension.configure({
        placeholder: isZh ? "开始输入内容..." : "Start writing...",
      }),
      TaskList.configure(),
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: node.contentHtml ?? "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      setEditorUpdateTrigger((prev) => prev + 1);
      scheduleSlashMenuCheck(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      scheduleSlashMenuCheck(ed);
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === "Escape" && isHelpOpenRef.current) {
          event.preventDefault();
          event.stopPropagation();
          setIsHelpOpen(false);
          setHelpSearch("");
          return true;
        }

        const isHelpShortcut = event.key === "/" && (event.metaKey || event.ctrlKey);
        if (isHelpShortcut) {
          event.preventDefault();
          event.stopPropagation();
          setIsHelpOpen((prev) => !prev);
          setHelpSearch("");
          return true;
        }

        if (event.key === "Tab") {
          event.preventDefault();
          titleInputRef.current?.focus();
          return true;
        }

        // Save shortcuts: Ctrl+S / Cmd+S or Ctrl+Enter / Cmd+Enter
        const isSaveShortcut =
          (event.key === "s" && (event.metaKey || event.ctrlKey)) ||
          (event.key === "Enter" && (event.metaKey || event.ctrlKey));

        if (isSaveShortcut) {
          event.preventDefault();
          event.stopPropagation();
          saveRef.current();
          return true;
        }

        // Toggle task checklist shortcut: Alt+Enter or Ctrl+D / Cmd+D when selection is inside a taskItem
        const isToggleTaskShortcut =
          (event.key === "Enter" && event.altKey) ||
          (event.key === "d" && (event.metaKey || event.ctrlKey));

        if (isToggleTaskShortcut && _view.state.schema.nodes.taskItem) {
          const { state } = _view;
          const { $from } = state.selection;
          let depth = $from.depth;
          let isInTaskItem = false;
          while (depth > 0) {
            if ($from.node(depth).type.name === "taskItem") {
              isInTaskItem = true;
              break;
            }
            depth--;
          }

          if (isInTaskItem) {
            event.preventDefault();
            const ed = editorRef.current;
            if (ed) {
              const isChecked = ed.isActive("taskItem", { checked: true });
              ed.chain().focus().updateAttributes("taskItem", { checked: !isChecked }).run();
            }
            return true;
          }
        }

        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const focusBodyEditor = useCallback(() => {
    if (!editor) {
      return;
    }

    editor.commands.focus(editor.isEmpty ? "start" : "end");
  }, [editor]);

  const shouldFocusTitle = useMemo(() => {
    const trimmedTitle = node.title.trim();
    return trimmedTitle.length === 0 || DEFAULT_CARD_TITLES.has(trimmedTitle);
  }, [node.title]);

  useEffect(() => {
    setTitle(node.title);
    editor?.commands.setContent(node.contentHtml ?? "<p></p>");
  }, [node.id, node.title, node.contentHtml, editor]);

  const titleRef = useCallback(
    (el: HTMLInputElement | null) => {
      titleInputRef.current = el;
      if (el && shouldFocusTitle) {
        el.focus();
        el.select();
        setInitialFocusTarget("title");
      }
    },
    [shouldFocusTitle]
  );

  useEffect(() => {
    if (editor && !shouldFocusTitle) {
      editor.commands.focus(editor.isEmpty ? "start" : "end");
      setInitialFocusTarget("body");
    }
  }, [editor, shouldFocusTitle]);

  useEffect(() => {
    if (initialFocusTarget) {
      const timer = setTimeout(() => {
        setInitialFocusTarget(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [initialFocusTarget]);

  const hasUnsavedChanges = useCallback(() => {
    if (!editor) return false;
    const currentHtml = editor.getHTML();
    const originalHtml = node.contentHtml ?? "";
    return title !== node.title || normalizeHtml(currentHtml) !== normalizeHtml(originalHtml);
  }, [editor, node.title, node.contentHtml, title, editorUpdateTrigger]);

  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges()) {
      const confirmClose = window.confirm(
        isZh
          ? "你有未保存的更改，确定要关闭吗？"
          : "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmClose) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    onSave({ ...node, title, contentHtml: html });
    onClose();
  }, [editor, node, title, onSave, onClose]);

  // Keep saveRef current
  useEffect(() => {
    saveRef.current = handleSave;
  }, [handleSave]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isHelpOpen) {
          event.preventDefault();
          event.stopPropagation();
          setIsHelpOpen(false);
          setHelpSearch("");
          return;
        }
        handleCloseAttempt();
        return;
      }

      const isHelpShortcut = event.key === "/" && (event.metaKey || event.ctrlKey);
      if (isHelpShortcut) {
        event.preventDefault();
        event.stopPropagation();
        setIsHelpOpen((prev) => !prev);
        setHelpSearch("");
        return;
      }

      // Save shortcuts: Ctrl+S / Cmd+S or Ctrl+Enter / Cmd+Enter
      const isSaveShortcut =
        (event.key === "s" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "Enter" && (event.metaKey || event.ctrlKey));

      if (isSaveShortcut) {
        event.preventDefault();
        handleSave();
      }
    },
    [handleCloseAttempt, handleSave, isHelpOpen]
  );

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseAttempt();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        focusBodyEditor();
        return;
      }

      // Save shortcuts
      const isSaveShortcut =
        (event.key === "s" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "Enter" && (event.metaKey || event.ctrlKey));

      if (isSaveShortcut) {
        event.preventDefault();
        handleSave();
      }
    },
    [focusBodyEditor, handleCloseAttempt, handleSave]
  );

  const handleBodyMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(".ProseMirror")) {
        return;
      }

      event.preventDefault();
      focusBodyEditor();
    },
    [focusBodyEditor]
  );

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
  };

  const toggleStrike = () => {
    editor?.chain().focus().toggleStrike().run();
  };

  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  function setTextColor(color: string) {
    if (color) {
      editor?.chain().focus().setColor(color).run();
    } else {
      editor?.chain().focus().unsetColor().run();
    }
  }

  function setHighlight(color: string) {
    if (color) {
      editor?.chain().focus().toggleHighlight({ color }).run();
    } else {
      editor?.chain().focus().unsetHighlight().run();
    }
  }

  // Batch update all task item check states
  const setAllTasksChecked = useCallback(
    (checked: boolean) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          let hasChanges = false;
          tr.doc.descendants((node, pos) => {
            if (node.type.name === "taskItem" && !!node.attrs.checked !== checked) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked });
              hasChanges = true;
            }
          });
          return hasChanges;
        })
        .run();
    },
    [editor]
  );

  const clearCompletedTasks = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        let hasChanges = false;
        const tasksToDelete: { from: number; to: number }[] = [];
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "taskItem" && node.attrs.checked) {
            tasksToDelete.push({ from: pos, to: pos + node.nodeSize });
          }
        });

        for (let i = tasksToDelete.length - 1; i >= 0; i--) {
          const { from, to } = tasksToDelete[i];
          tr.delete(from, to);
          hasChanges = true;
        }
        return hasChanges;
      })
      .run();
  }, [editor]);

  const sortTasks = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        let hasChanges = false;
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "taskList") {
            const children: ProseMirrorNode[] = [];
            node.forEach((child) => {
              children.push(child);
            });

            const checkedStates = children.map((c) => !!c.attrs.checked);
            let isSorted = true;
            for (let i = 0; i < checkedStates.length - 1; i++) {
              if (checkedStates[i] && !checkedStates[i + 1]) {
                isSorted = false;
                break;
              }
            }

            if (!isSorted) {
              const sortedChildren = [...children].sort((a, b) => {
                const aChecked = !!a.attrs.checked;
                const bChecked = !!b.attrs.checked;
                if (aChecked === bChecked) return 0;
                return aChecked ? 1 : -1;
              });

              const start = pos + 1;
              const end = pos + node.nodeSize - 1;
              const sortedFragment = Fragment.from(sortedChildren);
              tr.replaceWith(start, end, sortedFragment);
              hasChanges = true;
            }
          }
        });
        return hasChanges;
      })
      .run();
  }, [editor]);

  // Get statistics
  const getTextStats = () => {
    if (!editor) return { characters: 0, words: 0 };
    const text = editor.getText().trim();
    const characters = text.length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return { characters, words };
  };

  // Get task statistics
  const getTaskStats = () => {
    if (!editor) return { total: 0, checked: 0 };
    let total = 0;
    let checked = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "taskItem") {
        total++;
        if (node.attrs.checked) {
          checked++;
        }
      }
    });
    return { total, checked };
  };

  const { characters, words } = getTextStats();
  const { total: totalTasks, checked: checkedTasks } = getTaskStats();

  return (
    <div className="modal-overlay" onClick={handleCloseAttempt} onKeyDown={handleKeyDown}>
      <div
        className="modal-panel modal-panel--rich-editor"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={isZh ? "编辑卡片内容" : "Edit card content"}
      >
        <div className="modal-header">
          <FileText
            size={18}
            className="modal-header-icon"
            style={{ color: "var(--color-control-icon)" }}
          />
          <input
            id={`modal-title-${node.id}`}
            className="title-input modal-title-input"
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder={isZh ? "卡片标题" : "Card title"}
            data-initial-focus={initialFocusTarget === "title" ? "true" : undefined}
          />
          <div className="modal-meta">
            <span>{isZh ? `卡片 ID: ${node.id}` : `Card ID: ${node.id}`}</span>
          </div>
          <button
            type="button"
            className="toolbar-button modal-close"
            onClick={handleCloseAttempt}
            aria-label={isZh ? "关闭" : "Close"}
            style={{ border: "none", background: "transparent" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="editor-toolbar">
          {/* History Group */}
          <div className="editor-toolbar__section">
            <div className="editor-toolbar__section-content">
              <button
                type="button"
                className="toolbar-button"
                onClick={() => editor?.chain().focus().undo().run()}
                title={isZh ? "撤销 (Ctrl+Z)" : "Undo (Ctrl+Z)"}
                disabled={!editor || !editor.can().undo()}
              >
                <Undo size={15} />
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={() => editor?.chain().focus().redo().run()}
                title={isZh ? "重做 (Ctrl+Shift+Z)" : "Redo (Ctrl+Shift+Z)"}
                disabled={!editor || !editor.can().redo()}
              >
                <Redo size={15} />
              </button>
            </div>
            <div className="editor-toolbar__section-label">{isZh ? "历史" : "History"}</div>
          </div>

          {/* Typography Section */}
          <div className="editor-toolbar__section">
            <div className="editor-toolbar__section-content">
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("paragraph") ? "is-active" : ""}`}
                onClick={() => editor?.chain().focus().setParagraph().run()}
                title={isZh ? "正文 (Ctrl+Alt+0)" : "Paragraph (Ctrl+Alt+0)"}
                disabled={!editor}
              >
                <Pilcrow size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${
                  editor?.isActive("heading", { level: 1 }) ? "is-active" : ""
                }`}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                title={isZh ? "标题 1 (Ctrl+Alt+1)" : "Heading 1 (Ctrl+Alt+1)"}
                disabled={!editor}
              >
                <Heading1 size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${
                  editor?.isActive("heading", { level: 2 }) ? "is-active" : ""
                }`}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                title={isZh ? "标题 2 (Ctrl+Alt+2)" : "Heading 2 (Ctrl+Alt+2)"}
                disabled={!editor}
              >
                <Heading2 size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${
                  editor?.isActive("heading", { level: 3 }) ? "is-active" : ""
                }`}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                title={isZh ? "标题 3 (Ctrl+Alt+3)" : "Heading 3 (Ctrl+Alt+3)"}
                disabled={!editor}
              >
                <Heading3 size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("blockquote") ? "is-active" : ""}`}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                title={isZh ? "引用段落 (Ctrl+Shift+B)" : "Quote block (Ctrl+Shift+B)"}
                disabled={!editor}
              >
                <Quote size={15} />
              </button>
            </div>
            <div className="editor-toolbar__section-label">{isZh ? "排版格式" : "Typography"}</div>
          </div>

          {/* Character Styles Section */}
          <div className="editor-toolbar__section">
            <div className="editor-toolbar__section-content">
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("bold") ? "is-active" : ""}`}
                onClick={toggleBold}
                title={isZh ? "加粗 (Ctrl+B)" : "Bold (Ctrl+B)"}
                disabled={!editor}
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("italic") ? "is-active" : ""}`}
                onClick={toggleItalic}
                title={isZh ? "斜体 (Ctrl+I)" : "Italic (Ctrl+I)"}
                disabled={!editor}
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("underline") ? "is-active" : ""}`}
                onClick={toggleUnderline}
                title={isZh ? "下划线 (Ctrl+U)" : "Underline (Ctrl+U)"}
                disabled={!editor}
              >
                <UnderlineIcon size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("strike") ? "is-active" : ""}`}
                onClick={toggleStrike}
                title={isZh ? "删除线" : "Strikethrough"}
                disabled={!editor}
              >
                <Strikethrough size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("code") ? "is-active" : ""}`}
                onClick={() => editor?.chain().focus().toggleCode().run()}
                title={isZh ? "行内代码 (Ctrl+E)" : "Inline code (Ctrl+E)"}
                disabled={!editor}
              >
                <Code size={15} />
              </button>

              <div className="editor-toolbar__separator" />

              <div className="editor-toolbar__dropdown">
                <button
                  type="button"
                  className="toolbar-button"
                  title={isZh ? "文本颜色" : "Text color"}
                  disabled={!editor}
                >
                  <Palette size={15} />
                </button>
                <div className="editor-toolbar__dropdown-menu">
                  {textColors.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      className="editor-toolbar__color-option"
                      onClick={() => setTextColor(value)}
                    >
                      <span
                        className="editor-toolbar__color-swatch"
                        style={
                          value
                            ? { backgroundColor: value }
                            : { border: "1px dashed var(--color-border-strong)" }
                        }
                      />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="editor-toolbar__dropdown">
                <button
                  type="button"
                  className="toolbar-button"
                  title={isZh ? "背景高亮" : "Highlight color"}
                  disabled={!editor}
                >
                  <Highlighter size={15} />
                </button>
                <div className="editor-toolbar__dropdown-menu">
                  {highlightColors.map(({ label, value }) => (
                    <button
                      key={value ?? "none"}
                      type="button"
                      className="editor-toolbar__color-option"
                      onClick={() => setHighlight(value)}
                    >
                      <span
                        className="editor-toolbar__color-swatch"
                        style={
                          value
                            ? { backgroundColor: value }
                            : { border: "1px dashed var(--color-border-strong)" }
                        }
                      />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="editor-toolbar__separator" />

              <button
                type="button"
                className="toolbar-button"
                onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                title={isZh ? "清除格式" : "Clear formatting"}
                disabled={!editor}
              >
                <Eraser size={15} />
              </button>
            </div>
            <div className="editor-toolbar__section-label">{isZh ? "字符样式" : "Text styles"}</div>
          </div>

          {/* Outline / Structure Section */}
          <div className="editor-toolbar__section">
            <div className="editor-toolbar__section-content">
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("bulletList") ? "is-active" : ""}`}
                onClick={toggleBulletList}
                title={isZh ? "无序列表 (Ctrl+Shift+8)" : "Bulleted list (Ctrl+Shift+8)"}
                disabled={!editor}
              >
                <List size={15} />
              </button>
              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("orderedList") ? "is-active" : ""}`}
                onClick={toggleOrderedList}
                title={isZh ? "有序列表 (Ctrl+Shift+9)" : "Numbered list (Ctrl+Shift+9)"}
                disabled={!editor}
              >
                <ListOrdered size={15} />
              </button>

              {/* Task list dropdown with advanced todo operations */}
              <div className="editor-toolbar__dropdown">
                <button
                  type="button"
                  className={`toolbar-button ${editor?.isActive("taskList") ? "is-active" : ""}`}
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                  title={
                    isZh
                      ? "任务列表 (待办清单) - 输入 [] 自动创建"
                      : "Checklist - type [] to create automatically"
                  }
                  disabled={!editor}
                >
                  <ListTodo size={15} />
                </button>
                <div className="editor-toolbar__dropdown-menu" style={{ minWidth: "150px" }}>
                  <button
                    type="button"
                    className="editor-toolbar__color-option"
                    onClick={() => {
                      if (editor) {
                        const isChecked = editor.isActive("taskItem", { checked: true });
                        editor
                          .chain()
                          .focus()
                          .updateAttributes("taskItem", { checked: !isChecked })
                          .run();
                      }
                    }}
                    disabled={!editor || !editor.isActive("taskItem")}
                  >
                    <span>{isZh ? "勾选 / 取消当前任务" : "Toggle current task"}</span>
                  </button>
                  <button
                    type="button"
                    className="editor-toolbar__color-option"
                    onClick={() => setAllTasksChecked(true)}
                    disabled={!editor}
                  >
                    <span>{isZh ? "全部标记为已完成" : "Mark all complete"}</span>
                  </button>
                  <button
                    type="button"
                    className="editor-toolbar__color-option"
                    onClick={() => setAllTasksChecked(false)}
                    disabled={!editor}
                  >
                    <span>{isZh ? "全部标记为未完成" : "Mark all incomplete"}</span>
                  </button>
                  <button
                    type="button"
                    className="editor-toolbar__color-option"
                    onClick={sortTasks}
                    disabled={!editor}
                  >
                    <span>{isZh ? "整理待办 (未完成在前)" : "Sort tasks (incomplete first)"}</span>
                  </button>
                  <button
                    type="button"
                    className="editor-toolbar__color-option"
                    style={{ color: "#ef4444" }}
                    onClick={clearCompletedTasks}
                    disabled={!editor || checkedTasks === 0}
                  >
                    <span>{isZh ? "清除已完成待办" : "Clear completed tasks"}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                className={`toolbar-button ${editor?.isActive("codeBlock") ? "is-active" : ""}`}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                title={isZh ? "插入代码块 (Ctrl+Alt+C)" : "Insert code block (Ctrl+Alt+C)"}
                disabled={!editor}
              >
                <Terminal size={15} />
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                title={isZh ? "插入分割线" : "Insert divider"}
                disabled={!editor}
              >
                <Minus size={15} />
              </button>
            </div>
            <div className="editor-toolbar__section-label">{isZh ? "段落结构" : "Structure"}</div>
          </div>
        </div>

        <div
          className="rich-editor"
          data-initial-focus={initialFocusTarget === "body" ? "true" : undefined}
          onMouseDown={handleBodyMouseDown}
          onKeyDownCapture={handleKeyDownCapture}
        >
          <div className="rich-editor__paper">
            <EditorContent className="rich-editor__content" editor={editor} />
          </div>
        </div>

        <div className="editor-status-bar">
          <div className="editor-status-bar__stats">
            <span>{isZh ? `字数: ${words}` : `Words: ${words}`}</span>
            <span>{isZh ? `字符数: ${characters}` : `Characters: ${characters}`}</span>
            {totalTasks > 0 && (
              <span
                className="editor-status-bar__task-stats"
                style={{ color: "var(--color-accent)", fontWeight: "600" }}
              >
                {isZh ? "待办进度" : "Checklist progress"}: {checkedTasks}/{totalTasks} (
                {Math.round((checkedTasks / totalTasks) * 100)}%)
              </span>
            )}
          </div>
          <div className="editor-status-bar__shortcuts">
            <span>
              {isZh ? "快捷键: ⌘S 保存 | Esc 取消 | " : "Shortcuts: ⌘S Save | Esc Cancel | "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsHelpOpen(true);
                setHelpSearch("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-accent)",
                cursor: "pointer",
                padding: "0 2px",
                fontSize: "inherit",
                fontWeight: "600",
                textDecoration: "underline",
                outline: "none",
              }}
              title={
                isZh ? "查看所有快捷键和编辑指令 (⌘/)" : "View all shortcuts and commands (⌘/)"
              }
            >
              {isZh ? "快捷键说明 (⌘/)" : "Shortcut guide (⌘/)"}
            </button>
          </div>
          <div
            className={`editor-status-bar__save-state ${hasUnsavedChanges() ? "is-dirty" : "is-clean"}`}
          >
            <span>
              {hasUnsavedChanges()
                ? isZh
                  ? "● 未保存"
                  : "● Unsaved"
                : isZh
                  ? "✓ 已保存"
                  : "✓ Saved"}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="toolbar-button" onClick={handleCloseAttempt}>
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--primary"
            onClick={handleSave}
            disabled={!editor}
          >
            {isZh ? "保存" : "Save"}
          </button>
        </div>

        {slashMenu.isOpen && filteredCommands.length > 0 && (
          <div
            className="editor-slash-menu"
            style={{
              position: "fixed",
              top: `${slashMenu.coords.top}px`,
              left: `${slashMenu.coords.left}px`,
              zIndex: "var(--z-modal-popover)",
            }}
          >
            {filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isActive = index === slashMenu.activeIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  className={`editor-slash-menu__item ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    const start = slashMenu.pos - slashMenu.query.length - 1;
                    const ed = editorRef.current;
                    if (ed) {
                      const end = slashMenu.pos;
                      const chain = ed.chain().focus().deleteRange({ from: start, to: end });
                      cmd.action(chain).run();
                    }
                    setSlashMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  onMouseEnter={() => setSlashMenu((prev) => ({ ...prev, activeIndex: index }))}
                >
                  <div className="editor-slash-menu__icon-wrapper">
                    <Icon size={16} />
                  </div>
                  <div className="editor-slash-menu__details">
                    <div className="editor-slash-menu__title">{cmd.title}</div>
                    <div className="editor-slash-menu__subtitle">{cmd.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isHelpOpen && (
          <div
            className="editor-help-overlay"
            onClick={() => {
              setIsHelpOpen(false);
              setHelpSearch("");
            }}
          >
            <div className="editor-help-panel" onClick={(e) => e.stopPropagation()}>
              <div className="editor-help-header">
                <div className="editor-help-title">
                  <FileText size={16} />
                  <span>
                    {isZh ? "键盘快捷键与编辑指令" : "Keyboard shortcuts and editor commands"}
                  </span>
                </div>
                <button
                  type="button"
                  className="toolbar-button modal-close"
                  onClick={() => {
                    setIsHelpOpen(false);
                    setHelpSearch("");
                  }}
                  aria-label={isZh ? "关闭快捷键帮助" : "Close shortcuts help"}
                  style={{ border: "none", background: "transparent", margin: 0, padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="editor-help-search-container">
                <input
                  type="text"
                  className="editor-help-search-input"
                  placeholder={
                    isZh ? "搜索快捷键或编辑指令..." : "Search shortcuts or editor commands..."
                  }
                  value={helpSearch}
                  onChange={(e) => setHelpSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="editor-help-content">
                {Object.entries(shortcutCategories).map(([catKey, catName]) => {
                  const catItems = filteredShortcuts.filter((item) => item.category === catKey);
                  if (catItems.length === 0) return null;

                  return (
                    <div key={catKey} className="editor-help-section">
                      <div className="editor-help-section-title">{catName}</div>
                      <div className="editor-help-list">
                        {catItems.map((item) => (
                          <div
                            key={item.id}
                            className={`editor-help-item ${helpSearch ? "is-highlighted" : ""}`}
                          >
                            <span className="editor-help-item-desc">
                              {getShortcutDescription(item.id, isZh)}
                            </span>
                            <div className="editor-help-item-keys">
                              {item.keys.map((key, keyIdx) => (
                                <span
                                  key={keyIdx}
                                  style={{ display: "inline-flex", alignItems: "center" }}
                                >
                                  {keyIdx > 0 && (
                                    <span
                                      style={{
                                        margin: "0 4px",
                                        fontSize: "11px",
                                        color: "var(--color-muted)",
                                      }}
                                    >
                                      +
                                    </span>
                                  )}
                                  <kbd className="editor-kbd">{key}</kbd>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredShortcuts.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--color-muted)",
                      padding: "20px 0",
                      fontSize: "13px",
                    }}
                  >
                    {isZh
                      ? "没有找到匹配的快捷键或指令"
                      : "No matching shortcuts or commands found"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeHtml(html: string): string {
  if (!html) return "";
  let clean = html.trim();
  if (clean === "<p></p>" || clean === "<p><br></p>" || clean === "<p>&nbsp;</p>") {
    return "";
  }
  clean = clean.replace(/<br\s*\/?>/gi, "<br>");
  clean = clean.replace(/&nbsp;/g, " ");
  clean = clean.replace(/\s+/g, " ");
  return clean;
}
