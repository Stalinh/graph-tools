import type { ChainedCommands } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";

export interface RichEditorModalProps {
  node: RichEditorNode;
  onSave: (node: RichEditorNode) => void;
  onClose: () => void;
}

export interface RichEditorNode {
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

export interface SlashCommandItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: LucideIcon;
  action: (chain: ChainedCommands) => ChainedCommands;
}

export interface SlashMenuState {
  isOpen: boolean;
  pos: number;
  coords: { top: number; left: number };
  query: string;
  activeIndex: number;
}

export interface ShortcutItem {
  id: string;
  category: "general" | "formatting" | "checklist" | "slash";
  description: string;
  keys: string[];
  keywords: string[];
}
