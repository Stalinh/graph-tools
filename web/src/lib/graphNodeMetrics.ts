import type { GraphNode, NodeSize } from '../types';
import { getPlainTextContent } from './cardContent';
import { DEFAULT_GROUP_SIZE } from './graphLayout';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function estimateNodeSize(node: GraphNode): NodeSize {
  if (node.type === 'group') {
    return DEFAULT_GROUP_SIZE;
  }
  const title = node.title.trim();
  const content = getPlainTextContent(node.contentHtml);
  const tags = node.tags.slice(0, 3).join(', ');
  const snippets = [title, content, tags].filter(Boolean);
  const longestSnippetLength = Math.max(...snippets.map((snippet) => snippet.length), 12);
  const width = clamp(Math.round(longestSnippetLength * 6.6) + 36, 140, 400);
  const approxCharsPerLine = Math.max(Math.floor((width - 20) / 6.6), 10);
  const lineCount = snippets.reduce(
    (count, snippet) => count + Math.max(Math.ceil(snippet.length / approxCharsPerLine), 1),
    1
  );

  return {
    width,
    height: Math.max(68, 34 + lineCount * 18),
  };
}
