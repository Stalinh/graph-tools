import Fuse from "fuse.js";
import { pinyin } from "pinyin-pro";
import { getPlainTextContent } from "./cardContent";
import type { GraphNode } from "../types";

export interface SearchFilters {
  selectedTags: string[];
  selectedColors: string[];
}

export interface SearchMatch {
  field: "title" | "tag" | "content";
  indices: [number, number][];
  preview: string;
}

function getPinyinVariants(text: string): string[] {
  try {
    const full = pinyin(text, { toneType: "none", type: "array" });
    const initials = pinyin(text, { pattern: "first", toneType: "none", type: "array" });
    return [full.join(""), initials.join("")];
  } catch {
    return [];
  }
}

const fuseOptions = {
  includeMatches: true,
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 1,
  findAllMatches: true,
  ignoreLocation: true,
};

function searchText(
  text: string,
  query: string,
  tokenThreshold: number
): { match: boolean; indices: [number, number][]; preview: string } | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const indices: [number, number][] = [];

  let pos = 0;
  while (pos <= lowerText.length - lowerQuery.length) {
    const found = lowerText.indexOf(lowerQuery, pos);
    if (found === -1) break;
    indices.push([found, found + lowerQuery.length - 1]);
    pos = found + 1;
  }

  if (indices.length > 0) {
    const firstIdx = indices[0];
    const start = Math.max(0, firstIdx[0] - 30);
    const end = Math.min(text.length, firstIdx[1] + 31);
    let preview = text.slice(start, end);
    if (start > 0) preview = "..." + preview;
    if (end < text.length) preview = preview + "...";
    return { match: true, indices, preview };
  }

  const fuse = new Fuse([{ text }], {
    ...fuseOptions,
    keys: ["text"],
    threshold: tokenThreshold,
  });
  const result = fuse.search(lowerQuery);
  if (result.length > 0 && result[0].matches) {
    const fuseIndices: [number, number][] = result[0].matches
      .filter((m) => m.indices)
      .flatMap((m) => m.indices as [number, number][]);
    const firstIdx = fuseIndices[0];
    const start = Math.max(0, firstIdx[0] - 30);
    const end = Math.min(text.length, firstIdx[1] + 31);
    let preview = text.slice(start, end);
    if (start > 0) preview = "..." + preview;
    if (end < text.length) preview = preview + "...";
    return { match: true, indices: fuseIndices, preview };
  }

  return null;
}

export function smartMatches(node: GraphNode, query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const q = query.trim();
  const results: SearchMatch[] = [];

  const titleResult = searchText(node.title, q, 0.3);
  if (titleResult) {
    results.push({ field: "title", indices: titleResult.indices, preview: titleResult.preview });
  }

  if (!titleResult) {
    const pinyinVariants = getPinyinVariants(node.title);
    for (const variant of pinyinVariants) {
      if (variant.toLowerCase().includes(q.toLowerCase())) {
        results.push({ field: "title", indices: [], preview: node.title });
        break;
      }
    }
  }

  for (const tag of node.tags) {
    const tagResult = searchText(tag, q, 0.3);
    if (tagResult) {
      results.push({ field: "tag", indices: tagResult.indices, preview: tagResult.preview });
      continue;
    }
    const tagPinyin = getPinyinVariants(tag);
    for (const variant of tagPinyin) {
      if (variant.toLowerCase().includes(q.toLowerCase())) {
        results.push({ field: "tag", indices: [], preview: tag });
        break;
      }
    }
  }

  if (node.contentHtml) {
    const plainText = getPlainTextContent(node.contentHtml);
    const contentResult = searchText(plainText, q, 0.4);
    if (contentResult) {
      results.push({
        field: "content",
        indices: contentResult.indices,
        preview: contentResult.preview,
      });
    } else {
      const contentPinyin = getPinyinVariants(plainText.slice(0, 200));
      for (const variant of contentPinyin) {
        if (variant.toLowerCase().includes(q.toLowerCase())) {
          results.push({ field: "content", indices: [], preview: plainText.slice(0, 60) });
          break;
        }
      }
    }
  }

  return results;
}

export function nodeMatchesSearch(node: GraphNode, query: string): boolean {
  if (!query.trim()) return true;
  return smartMatches(node, query).length > 0;
}

export function getMatchingNodes(
  nodes: GraphNode[],
  query: string,
  filters: SearchFilters
): GraphNode[] {
  return nodes.filter((node) => {
    if (filters.selectedTags.length > 0) {
      const hasTag = filters.selectedTags.some((tag) => node.tags.includes(tag));
      if (!hasTag) return false;
    }
    if (filters.selectedColors.length > 0 && !filters.selectedColors.includes(node.color || "")) {
      return false;
    }
    if (query.trim()) {
      if (smartMatches(node, query).length === 0) return false;
    }
    return true;
  });
}
