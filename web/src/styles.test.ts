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
      '0 0 0 3px color-mix(in srgb, var(--color-primary) 24%, transparent)'
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
});
