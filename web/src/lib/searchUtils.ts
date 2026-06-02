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
  previewIndices: [number, number][];
}

export interface NodeSearchResult {
  node: GraphNode;
  matches: SearchMatch[];
}

interface FuseRecord {
  text: string;
}

type SearchThreshold = 0.3 | 0.4;
type SearchThresholdKey = `${SearchThreshold}`;

interface SearchTextIndex {
  text: string;
  lowerText: string;
  pinyinVariants: string[];
  fuses: Partial<Record<SearchThresholdKey, Fuse<FuseRecord>>>;
}

interface NodeSearchIndex {
  title: SearchTextIndex;
  tags: SearchTextIndex[];
  content: SearchTextIndex | null;
}

interface NodeSearchIndexCacheEntry {
  signature: string;
  index: NodeSearchIndex;
}

interface SearchTextResult {
  indices: [number, number][];
  preview: string;
  previewIndices: [number, number][];
}

const MAX_NODE_SEARCH_INDEXES = 1000;
const nodeSearchIndexCache = new Map<string, NodeSearchIndexCacheEntry>();

function getPinyinVariants(text: string): string[] {
  if (!text) return [];

  try {
    const full = pinyin(text, { toneType: "none", type: "array" });
    const initials = pinyin(text, { pattern: "first", toneType: "none", type: "array" });
    return Array.from(
      new Set([full.join(""), initials.join("")]
        .map((variant) => variant.toLowerCase())
        .filter(Boolean))
    );
  } catch {
    return [];
  }
}

const fuseOptions = {
  includeMatches: true,
  distance: 100,
  minMatchCharLength: 1,
  findAllMatches: true,
  ignoreLocation: true,
  keys: ["text"],
};

function createSearchTextIndex(text: string, pinyinSourceText = text): SearchTextIndex {
  return {
    text,
    lowerText: text.toLowerCase(),
    pinyinVariants: getPinyinVariants(pinyinSourceText),
    fuses: {},
  };
}

function getNodeSearchSignature(node: GraphNode) {
  return JSON.stringify([node.title, node.tags, node.contentHtml ?? ""]);
}

function rememberNodeSearchIndex(
  nodeId: string,
  signature: string,
  index: NodeSearchIndex
): NodeSearchIndex {
  nodeSearchIndexCache.delete(nodeId);
  nodeSearchIndexCache.set(nodeId, { signature, index });

  while (nodeSearchIndexCache.size > MAX_NODE_SEARCH_INDEXES) {
    const oldestKey = nodeSearchIndexCache.keys().next().value;
    if (oldestKey === undefined) break;
    nodeSearchIndexCache.delete(oldestKey);
  }

  return index;
}

function getNodeSearchIndex(node: GraphNode): NodeSearchIndex {
  const signature = getNodeSearchSignature(node);
  const cached = nodeSearchIndexCache.get(node.id);

  if (cached && cached.signature === signature) {
    return rememberNodeSearchIndex(node.id, signature, cached.index);
  }

  const plainText = node.contentHtml ? getPlainTextContent(node.contentHtml) : "";
  const index: NodeSearchIndex = {
    title: createSearchTextIndex(node.title),
    tags: node.tags.map((tag) => createSearchTextIndex(tag)),
    content: plainText ? createSearchTextIndex(plainText, plainText.slice(0, 200)) : null,
  };

  return rememberNodeSearchIndex(node.id, signature, index);
}

function findLiteralIndices(lowerText: string, lowerQuery: string): [number, number][] {
  const indices: [number, number][] = [];
  if (!lowerText || !lowerQuery) return indices;

  let pos = 0;
  while (pos <= lowerText.length - lowerQuery.length) {
    const found = lowerText.indexOf(lowerQuery, pos);
    if (found === -1) break;
    indices.push([found, found + lowerQuery.length - 1]);
    pos = found + 1;
  }

  return indices;
}

function normalizeIndices(indices: [number, number][]): [number, number][] {
  const sorted = indices
    .filter(([start, end]) => start >= 0 && end >= start)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const normalized: [number, number][] = [];

  for (const [start, end] of sorted) {
    const previous = normalized[normalized.length - 1];
    if (previous && start <= previous[1] + 1) {
      previous[1] = Math.max(previous[1], end);
    } else {
      normalized.push([start, end]);
    }
  }

  return normalized;
}

function createSearchTextResult(text: string, indices: [number, number][]): SearchTextResult | null {
  const normalizedIndices = normalizeIndices(indices);
  if (normalizedIndices.length === 0) return null;

  const firstIdx = normalizedIndices[0];
  const start = Math.max(0, firstIdx[0] - 30);
  const end = Math.min(text.length, firstIdx[1] + 31);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  const preview = prefix + text.slice(start, end) + suffix;
  const previewOffset = prefix.length - start;
  const previewIndices = normalizedIndices
    .map(([matchStart, matchEnd]): [number, number] => [
      Math.max(matchStart, start) + previewOffset,
      Math.min(matchEnd, end - 1) + previewOffset,
    ])
    .filter(([matchStart, matchEnd]) => matchStart <= matchEnd);

  return { indices: normalizedIndices, preview, previewIndices };
}

function searchIndexedText(
  index: SearchTextIndex,
  lowerQuery: string,
  tokenThreshold: SearchThreshold
): SearchTextResult | null {
  if (!index.text) return null;

  const indices = findLiteralIndices(index.lowerText, lowerQuery);
  if (indices.length > 0) {
    return createSearchTextResult(index.text, indices);
  }

  const result = getIndexedFuse(index, tokenThreshold).search(lowerQuery);
  if (result[0]?.matches) {
    const fuseIndices: [number, number][] = result[0].matches
      .filter((m) => m.indices)
      .flatMap((m) => m.indices as [number, number][]);
    return createSearchTextResult(index.text, fuseIndices);
  }

  return null;
}

function getIndexedFuse(index: SearchTextIndex, tokenThreshold: SearchThreshold) {
  const thresholdKey = String(tokenThreshold) as SearchThresholdKey;
  const cachedFuse = index.fuses[thresholdKey];
  if (cachedFuse) return cachedFuse;

  const fuse = new Fuse([{ text: index.text }], {
    ...fuseOptions,
    threshold: tokenThreshold,
  });
  index.fuses[thresholdKey] = fuse;
  return fuse;
}

function hasPinyinMatch(index: SearchTextIndex, lowerQuery: string) {
  return index.pinyinVariants.some((variant) => variant.includes(lowerQuery));
}

export function clearSearchIndexCache() {
  nodeSearchIndexCache.clear();
}

export function smartMatches(node: GraphNode, query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const index = getNodeSearchIndex(node);
  const lowerQuery = query.trim().toLowerCase();
  const results: SearchMatch[] = [];

  const titleResult = searchIndexedText(index.title, lowerQuery, 0.3);
  if (titleResult) {
    results.push({ field: "title", ...titleResult });
  }

  if (!titleResult && hasPinyinMatch(index.title, lowerQuery)) {
    results.push({ field: "title", indices: [], preview: index.title.text, previewIndices: [] });
  }

  for (const tag of index.tags) {
    const tagResult = searchIndexedText(tag, lowerQuery, 0.3);
    if (tagResult) {
      results.push({ field: "tag", ...tagResult });
      continue;
    }
    if (hasPinyinMatch(tag, lowerQuery)) {
      results.push({ field: "tag", indices: [], preview: tag.text, previewIndices: [] });
    }
  }

  if (index.content) {
    const contentResult = searchIndexedText(index.content, lowerQuery, 0.4);
    if (contentResult) {
      results.push({
        field: "content",
        ...contentResult,
      });
    } else if (hasPinyinMatch(index.content, lowerQuery)) {
      results.push({
        field: "content",
        indices: [],
        preview: index.content.text.slice(0, 60),
        previewIndices: [],
      });
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
  return getMatchingNodeResults(nodes, query, filters).map((result) => result.node);
}

export function getMatchingNodeResults(
  nodes: GraphNode[],
  query: string,
  filters: SearchFilters
): NodeSearchResult[] {
  const hasQuery = query.trim().length > 0;
  const results: NodeSearchResult[] = [];

  for (const node of nodes) {
    if (filters.selectedTags.length > 0) {
      const hasTag = filters.selectedTags.some((tag) => node.tags.includes(tag));
      if (!hasTag) continue;
    }
    if (filters.selectedColors.length > 0 && !filters.selectedColors.includes(node.color || "")) {
      continue;
    }

    const matches = hasQuery ? smartMatches(node, query) : [];
    if (hasQuery && matches.length === 0) {
      continue;
    }

    results.push({ node, matches });
  }

  return results;
}
