import type { EdgeStyle } from '../types';

export const DEFAULT_EDGE_STYLE: EdgeStyle = 'note-dash';
export const EDGE_STYLES = ['solid', 'sketch', 'note-dash'] as const satisfies readonly EdgeStyle[];

const EDGE_STYLE_SET = new Set<string>(EDGE_STYLES);

export function isEdgeStyle(value: unknown): value is EdgeStyle {
  return typeof value === 'string' && EDGE_STYLE_SET.has(value);
}

export function normalizeEdgeStyle(value: unknown): EdgeStyle {
  return isEdgeStyle(value) ? value : DEFAULT_EDGE_STYLE;
}
