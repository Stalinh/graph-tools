import { describe, expect, it } from 'vitest';

interface FileSystemModule {
  existsSync: (path: URL) => boolean;
  readFileSync: (path: URL, encoding: 'utf8') => string;
}

const stylePaths = [
  './styles/base.css',
  './styles/sidebar.css',
  './styles/workspace.css',
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
});
