export const SUPPORTED_NODE_COLORS = ['amber', 'rose', 'green', 'blue', 'purple', 'teal'] as const;
export const DEFAULT_SUPPORTED_NODE_COLOR = SUPPORTED_NODE_COLORS[0];

const SUPPORTED_NODE_COLOR_SET = new Set<string>(SUPPORTED_NODE_COLORS);

export function normalizeNodeColor(color: string | undefined): string {
  return color && SUPPORTED_NODE_COLOR_SET.has(color) ? color : '';
}

export function normalizeEdgeColor(color: string | undefined): string {
  return color && SUPPORTED_NODE_COLOR_SET.has(color) ? color : DEFAULT_SUPPORTED_NODE_COLOR;
}

export function getNodeColorCssVar(color: string | undefined, fallbackToDefault = false): string {
  const normalized = fallbackToDefault ? normalizeEdgeColor(color) : normalizeNodeColor(color);
  return normalized ? `var(--color-card-${normalized})` : 'transparent';
}
