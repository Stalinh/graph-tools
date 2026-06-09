import { describe, expect, it } from 'vitest';

interface FileSystemModule {
  existsSync: (path: URL) => boolean;
  readFileSync: (path: URL, encoding: 'utf8') => string;
}

function cssBlock(styles: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`, 'u'));
  return match?.groups?.body ?? '';
}

function cssBlockAtLineStart(styles: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(
    new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`, 'u')
  );
  return match?.groups?.body ?? '';
}

function normalizeCssForAssertion(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
}

function expectCssToContain(styles: string, expected: string) {
  expect(normalizeCssForAssertion(styles)).toContain(normalizeCssForAssertion(expected));
}

const stylePaths = [
  './styles/base.css',
  './styles/sidebar.css',
  './styles/workspace.css',
  './styles/motion.css',
  './styles/graph-canvas.css',
  './styles/inspector.css',
  './styles/editor-controls.css',
  './styles/references.css',
  './styles/search-filters.css',
  './styles/rich-editor.css',
  './styles/group-node.css',
];

describe('styles entrypoint', () => {
  it('keeps global styles split into ordered domain files', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { existsSync, readFileSync } = (await import('node:fs')) as FileSystemModule;
    const stylesEntry = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
    const lines = stylesEntry.split(/\r?\n/).filter(Boolean);

    expect(lines[0]).toBe('@charset "UTF-8";');
    expect(lines.slice(1)).toEqual(stylePaths.map((stylePath) => `@import '${stylePath}';`));

    for (const stylePath of stylePaths) {
      const styleUrl = new URL(stylePath, import.meta.url);
      expect(existsSync(styleUrl)).toBe(true);
      expect(readFileSync(styleUrl, 'utf8').trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps executive workbench canvas in the flexible grid row', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { readFileSync } = (await import('node:fs')) as FileSystemModule;
    const motionStyles = readFileSync(new URL('./styles/motion.css', import.meta.url), 'utf8');

    expect(motionStyles).toContain('.graph-zone--executive');
    expect(motionStyles).toContain('grid-template-rows: auto auto minmax(0, 1fr);');
  });

  it('defines executive workbench design tokens', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { readFileSync } = (await import('node:fs')) as FileSystemModule;
    const baseStyles = readFileSync(new URL('./styles/base.css', import.meta.url), 'utf8');

    expect(baseStyles).toContain('--color-executive-navy: #071b3a;');
    expect(baseStyles).toContain('--color-executive-teal: #00a3a1;');
    expect(baseStyles).toContain('--color-executive-red: #c1121f;');
    expect(baseStyles).toContain('--shadow-workbench-panel:');
    expect(baseStyles).toContain('--shadow-workbench-node:');
  });

  it('keeps graph canvas executive chrome aligned to the workbench plan', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { readFileSync } = (await import('node:fs')) as FileSystemModule;
    const graphCanvasStyles = readFileSync(
      new URL('./styles/graph-canvas.css', import.meta.url),
      'utf8'
    );
    const filterStyles = readFileSync(
      new URL('./styles/search-filters.css', import.meta.url),
      'utf8'
    );

    const statusPanel = cssBlock(graphCanvasStyles, '.graph-canvas-panel--executive-status');
    expect(statusPanel).toContain('display: grid;');
    expect(statusPanel).toContain('grid-template-columns: minmax(0, 1fr) auto;');
    expect(statusPanel).toContain('max-width: min(360px, 100%);');
    expect(statusPanel).toContain('gap: 3px 8px;');
    expect(statusPanel).toContain('padding: 8px 10px;');
    expect(statusPanel).not.toContain('100vw');

    const statusKicker = cssBlock(graphCanvasStyles, '.graph-canvas-panel__status-kicker');
    expect(statusKicker).toContain('grid-column: 1 / -1;');
    expect(statusKicker).toContain('font-weight: 850;');

    const statusPill = cssBlock(graphCanvasStyles, '.graph-canvas-panel__status-pill');
    expect(statusPill).toContain(
      'border: 1px solid color-mix(in srgb, var(--color-executive-teal) 30%, transparent);'
    );
    expect(statusPill).toContain('border-radius: 999px;');
    expect(statusPill).toContain('padding: 2px 7px;');
    expect(statusPill).toContain('color: var(--color-executive-teal);');
    expect(statusPill).toContain('font-weight: 850;');
    expect(statusPill).toContain('line-height: 1.2;');

    const dirtyPill = cssBlock(graphCanvasStyles, '.graph-canvas-panel__status-pill.is-dirty');
    expect(dirtyPill).toContain(
      'border-color: color-mix(in srgb, var(--color-executive-amber) 44%, transparent);'
    );
    expect(dirtyPill).toContain('color: var(--color-executive-amber);');

    const selectedNode = cssBlock(graphCanvasStyles, '.graph-node.is-selected');
    expect(selectedNode).toContain('outline-offset: -2px;');
    expect(selectedNode).toContain(
      'background: var(--color-node-bg-selected, var(--color-node-bg));'
    );
    expect(selectedNode).toContain(
      '0 0 0 2px color-mix(in srgb, var(--color-primary) 18%, transparent)'
    );

    const graphNode = cssBlock(graphCanvasStyles, '.graph-node');
    expect(graphNode).toContain(
      'background: color-mix(in srgb, var(--color-workbench-panel) 96%, var(--color-workbench-bg) 4%);'
    );
    expect(graphNode).toContain('box-shadow: 0 10px 22px rgba(15, 36, 63, 0.08);');

    const graphNodeHover = cssBlock(graphCanvasStyles, '.graph-node:hover');
    expect(graphNodeHover).toContain('translate: 0 -0.5px;');
    expect(graphNodeHover).toContain('scale: 1;');

    const searchMatch = cssBlock(graphCanvasStyles, '.graph-node.is-search-match');
    expectCssToContain(
      searchMatch,
      'border-color: color-mix(in srgb, var(--color-executive-teal) 32%, var(--color-workbench-line) 68%);'
    );
    expect(searchMatch).toContain(
      'background: color-mix(in srgb, var(--color-executive-teal) 4%, var(--color-workbench-panel) 96%);'
    );
    expect(searchMatch).toContain(
      '0 0 0 1px color-mix(in srgb, var(--color-executive-teal) 14%, transparent)'
    );

    const edgeConnected = cssBlock(graphCanvasStyles, '.graph-node.is-edge-connected');
    expectCssToContain(
      edgeConnected,
      'border-color: color-mix(in srgb, var(--color-primary) 36%, var(--color-workbench-line) 64%);'
    );
    expect(edgeConnected).toContain(
      '0 0 0 1px color-mix(in srgb, var(--color-primary) 16%, transparent)'
    );

    const lockedNode = cssBlock(graphCanvasStyles, '.graph-node.is-locked');
    expectCssToContain(
      lockedNode,
      'border-color: color-mix(in srgb, var(--color-workbench-muted) 42%, var(--color-workbench-line) 58%);'
    );
    expect(lockedNode).toContain(
      '0 0 0 1px color-mix(in srgb, var(--color-workbench-muted) 10%, transparent)'
    );
    expect(lockedNode).toContain('background: color-mix(');
    expect(lockedNode).toContain('var(--color-workbench-panel-muted) 52%,');
    expect(lockedNode).toContain('var(--color-workbench-panel) 48%');

    const labelBar = cssBlock(graphCanvasStyles, '.graph-node__label::before');
    expect(labelBar).toContain('opacity: 0.78;');

    expectCssToContain(
      graphCanvasStyles,
      '--graph-node-color-bar: color-mix(in srgb, var(--color-card-amber) 72%, var(--color-workbench-ink) 28%);'
    );
    expectCssToContain(
      graphCanvasStyles,
      '--graph-node-color-bar: color-mix(in srgb, var(--color-card-purple) 58%, var(--color-workbench-ink) 42%);'
    );

    const nodeType = cssBlock(graphCanvasStyles, '.graph-node__type');
    expect(nodeType).toContain(
      'color: color-mix(in srgb, var(--color-workbench-muted) 88%, var(--color-workbench-ink) 12%);'
    );
    expect(nodeType).toContain('font-size: 10px;');
    expect(nodeType).toContain('font-weight: 850;');

    const nodeTitle = cssBlockAtLineStart(graphCanvasStyles, '.graph-node__label strong');
    expect(nodeTitle).toContain('font-size: 14px;');
    expect(nodeTitle).toContain('font-weight: 780;');
    expect(nodeTitle).toContain('line-height: 1.28;');
    expect(nodeTitle).toContain('letter-spacing: 0;');

    const nodeContent = cssBlockAtLineStart(graphCanvasStyles, '.graph-node__content');
    expect(nodeContent).toContain('gap: 5px;');
    expect(nodeContent).toContain(
      'color: color-mix(in srgb, var(--color-text) 90%, var(--color-workbench-ink) 10%);'
    );
    expect(nodeContent).toContain('font-size: 11px;');
    expect(nodeContent).toContain('line-height: 1.45;');

    const nodeContentStrong = cssBlockAtLineStart(graphCanvasStyles, '.graph-node__content strong');
    expect(nodeContentStrong).toContain('font-weight: 760;');

    const nodeMeta = cssBlockAtLineStart(graphCanvasStyles, '.graph-node__label small');
    expect(nodeMeta).toContain(
      'color: color-mix(in srgb, var(--color-workbench-muted) 92%, var(--color-workbench-ink) 8%);'
    );
    expect(nodeMeta).toContain('font-size: 10px;');

    const imageTitle = cssBlockAtLineStart(graphCanvasStyles, '.graph-node__image-title');
    expect(imageTitle).toContain('font-size: 13px;');
    expect(imageTitle).toContain('font-weight: 760;');
    expect(imageTitle).toContain('line-height: 1.3;');

    const tagPill = cssBlock(filterStyles, '.graph-node__tag-pill');
    expect(tagPill).toContain(
      'border: 1px solid color-mix(in srgb, var(--color-workbench-line) 88%, transparent);'
    );
    expect(tagPill).toContain('border-radius: 999px;');
    expect(tagPill).toContain('background: color-mix(');
    expect(tagPill).toContain('var(--color-workbench-panel-muted) 74%,');
    expect(tagPill).toContain('var(--color-workbench-panel) 26%');
    expect(tagPill).toContain('font-size: 10px;');
    expect(tagPill).toContain('font-weight: 700;');

    const titleInput = cssBlock(graphCanvasStyles, '.graph-node__title-input');
    expect(titleInput).toContain(
      'background: color-mix(in srgb, var(--color-workbench-panel) 94%, var(--color-workbench-bg) 6%);'
    );
    expect(titleInput).toContain(
      'box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent);'
    );

    const alignmentGuide = cssBlock(graphCanvasStyles, '.alignment-guide');
    expect(alignmentGuide).toContain('--alignment-guide-thickness: 1px;');
    expect(alignmentGuide).toContain(
      '--alignment-guide-color: color-mix(in srgb, var(--color-executive-teal) 58%, white 18%);'
    );
    expect(alignmentGuide).toContain(
      'filter: drop-shadow(0 0 0.75px color-mix(in srgb, var(--color-executive-teal) 22%, transparent));'
    );
    expect(alignmentGuide).toContain('opacity: 0.92;');

    const verticalGuide = cssBlock(graphCanvasStyles, '.alignment-guide--vertical');
    expect(verticalGuide).toContain('width: var(--alignment-guide-thickness);');
    expect(verticalGuide).toContain('background-image: linear-gradient(');
    expect(verticalGuide).toContain('transparent 10px,');
    expect(verticalGuide).toContain('var(--alignment-guide-color) calc(100% - 10px),');

    const horizontalGuide = cssBlock(graphCanvasStyles, '.alignment-guide--horizontal');
    expect(horizontalGuide).toContain('height: var(--alignment-guide-thickness);');
    expect(horizontalGuide).toContain('background-image: linear-gradient(');
    expect(horizontalGuide).toContain('transparent 10px,');
    expect(horizontalGuide).toContain('var(--alignment-guide-color) calc(100% - 10px),');
  });

  it('scopes sidebar icon button colors to the rail', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { readFileSync } = (await import('node:fs')) as FileSystemModule;
    const sidebarStyles = readFileSync(new URL('./styles/sidebar.css', import.meta.url), 'utf8');

    expect(sidebarStyles).toContain('.sidebar .icon-button');
    expect(sidebarStyles).not.toMatch(
      /^\.icon-button,\s*\n\.nav-button\s*\{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.78\);/mu
    );
  });

  it('keeps sidebar footer controls integrated with the dark rail', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { readFileSync } = (await import('node:fs')) as FileSystemModule;
    const sidebarStyles = readFileSync(new URL('./styles/sidebar.css', import.meta.url), 'utf8');

    const footer = cssBlockAtLineStart(sidebarStyles, '.sidebar__footer');
    expect(footer).toContain('background: rgba(255, 255, 255, 0.07);');
    expect(footer).toContain('border: 1px solid rgba(255, 255, 255, 0.14);');
    expect(footer).not.toContain('var(--color-surface)');
    expect(footer).not.toContain('var(--color-surface-muted)');

    const footerLabel = cssBlock(sidebarStyles, '.sidebar__footer-label');
    expect(footerLabel).toContain('color: rgba(255, 255, 255, 0.92);');

    const footerHint = cssBlock(sidebarStyles, '.sidebar__footer-hint');
    expect(footerHint).toContain('color: rgba(255, 255, 255, 0.58);');
  });

  it('keeps inspector controls aligned with the executive workbench style', async () => {
    // @ts-expect-error Vitest runs this structural test in Node, while app types stay browser-only.
    const { readFileSync } = (await import('node:fs')) as FileSystemModule;
    const workspaceStyles = readFileSync(
      new URL('./styles/workspace.css', import.meta.url),
      'utf8'
    );
    const inspectorStyles = readFileSync(
      new URL('./styles/inspector.css', import.meta.url),
      'utf8'
    );
    const referenceStyles = readFileSync(
      new URL('./styles/references.css', import.meta.url),
      'utf8'
    );

    expect(inspectorStyles).toContain('.field-input,');
    expect(inspectorStyles).toContain('.field-textarea,');
    expect(inspectorStyles).toContain('.field-select {');
    expect(inspectorStyles).toContain(
      'background: color-mix(in srgb, var(--color-workbench-panel) 92%, var(--color-workbench-bg) 8%);'
    );
    expect(inspectorStyles).toContain(
      'border: 1px solid color-mix(in srgb, var(--color-workbench-line) 88%, transparent);'
    );
    expect(inspectorStyles).toContain('font-size: 12px;');
    expect(inspectorStyles).toContain('.field-input:focus,');
    expect(inspectorStyles).toContain('.field-textarea:focus,');
    expect(inspectorStyles).toContain('.field-select:focus {');
    expect(inspectorStyles).toContain(
      'box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent);'
    );

    const colorSwatch = cssBlock(referenceStyles, '.color-swatch');
    expect(colorSwatch).toContain(
      'border: 1px solid color-mix(in srgb, var(--color-workbench-line) 82%, transparent);'
    );
    expect(colorSwatch).toContain('box-shadow: 0 4px 10px rgba(15, 36, 63, 0.04);');

    const colorPalette = cssBlock(referenceStyles, '.color-palette');
    expect(colorPalette).toContain('display: grid;');
    expect(colorPalette).toContain('grid-template-columns: repeat(7, 24px);');
    expect(colorPalette).not.toContain('flex-wrap: wrap;');

    const knowledgeBase = cssBlock(workspaceStyles, '.knowledge-base');
    expect(knowledgeBase).toContain(
      'grid-template-columns: minmax(0, 1fr) clamp(280px, 20vw, 288px);'
    );
  });
});
